const lcjs = require('@arction/lcjs')
const { AxisTickStrategies, emptyTick, FormattingFunctions, SolidLine, SolidFill, synchronizeAxisIntervals, lightningChart, Themes } = lcjs

const highlightIntensity = 0.2 // [0, 1]
const assetsUrl = document.head.baseURI + 'examples/assets/1300'
const exampleContainer = document.getElementById('chart') || document.body
const exampleBounds = exampleContainer.getBoundingClientRect()
const dataGridWidthFull = 800

let license = undefined
try {
    license = LCJS_LICENSE
} catch (e) {}

// NOTE: Using `Dashboard` is no longer recommended for new applications. Find latest recommendations here: https://lightningchart.com/js-charts/docs/basic-topics/grouping-charts/
const dashboard = lightningChart({
    license: license,
}).Dashboard({
    theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
    numberOfColumns: 2,
    numberOfRows: 4,
})

if (exampleBounds.width > 1200) {
    dashboard.setColumnWidth(0, dataGridWidthFull).setColumnWidth(1, exampleBounds.width - dataGridWidthFull)
}

/**
 * Calculate delta between open and close for given time range (1 hour, 1 day, etc.) from list of data points.
 */
const calcDataAtAGlance = (dataPoints, tStart, tEnd) => {
    const dataPointsOut = []
    const dataPointsLen = dataPoints.length
    for (let i = 0; i < dataPointsLen; i += 1) {
        const { date, rate } = dataPoints[i]
        if (date >= tStart && date <= tEnd) {
            dataPointsOut.push({ x: date, y: rate })
        }
    }
    let delta = 0
    if (dataPointsOut.length >= 1) {
        const rateOpen = dataPointsOut[0].y
        const rateClose = dataPointsOut[dataPointsOut.length - 1].y
        delta = (100 * rateClose) / rateOpen - 100
    }
    return { dataPoints: dataPointsOut, delta }
}

const setDrillDown = (() => {
    let activeDrillDown

    return (coinInfo, coinData) => {
        if (activeDrillDown) {
            if (activeDrillDown.info === coinInfo) {
                return
            }
            activeDrillDown.dispose()
        }

        const { name } = coinInfo

        const chartRate = dashboard
            .createChartXY({ columnIndex: 1, rowIndex: 0 })
            .setTitle(`${name} Rate $`)
            .setTitlePosition('series-left-top')
            .setTitleMargin(0)
            .forEachAxis((axis) => axis.setAnimationScroll(false))
        chartRate.getDefaultAxisX().setTickStrategy(AxisTickStrategies.Empty)
        const seriesRate = chartRate
            .addLineSeries({ dataPattern: { pattern: 'ProgressiveX' } })
            .setName(`${name} Rate $`)
            .add(coinData.map((p) => ({ x: p.date, y: p.rate })))
            .setCursorResultTableFormatter((builder, series, x, y, dataPoint) =>
                builder
                    .addRow(series.getName())
                    .addRow(timeAxis.formatValue(dataPoint.x))
                    .addRow(`$${series.axisY.formatValue(dataPoint.y)}`),
            )

        const chartVolume = dashboard
            .createChartXY({ columnIndex: 1, rowIndex: 1 })
            .setTitle(`${name} Volume $`)
            .setTitlePosition('series-left-top')
            .setTitleMargin(0)
            .forEachAxis((axis) => axis.setAnimationScroll(false))
        chartVolume.getDefaultAxisX().setTickStrategy(AxisTickStrategies.Empty)
        chartVolume
            .getDefaultAxisY()
            .setTickStrategy(AxisTickStrategies.Numeric, (ticks) => ticks.setFormattingFunction(FormattingFunctions.NumericUnits))
        const seriesVolume = chartVolume
            .addAreaSeries()
            .setName(`${name} Volume $`)
            .add(coinData.map((p) => ({ x: p.date, y: p.volume })))
            .setCursorResultTableFormatter((builder, series, x, high, low) =>
                builder
                    .addRow(series.getName())
                    .addRow(timeAxis.formatValue(x))
                    .addRow(`$${(high / 10 ** 9).toFixed(3)} B`),
            )

        const chartLiquidity = dashboard
            .createChartXY({ columnIndex: 1, rowIndex: 2 })
            .setTitle(`${name} Liquidity $`)
            .setTitlePosition('series-left-top')
            .setTitleMargin(0)
            .forEachAxis((axis) => axis.setAnimationScroll(false))
        chartLiquidity.getDefaultAxisX().setTickStrategy(AxisTickStrategies.Empty)
        chartLiquidity
            .getDefaultAxisY()
            .setTickStrategy(AxisTickStrategies.Numeric, (ticks) => ticks.setFormattingFunction(FormattingFunctions.NumericUnits))
        const seriesLiquidity = chartLiquidity
            .addLineSeries({ dataPattern: { pattern: 'ProgressiveX' } })
            .setName(`${name} Liquidity $`)
            .add(coinData.map((p) => ({ x: p.date, y: p.liquidity })))
            .setCursorResultTableFormatter((builder, series, x, y, dataPoint) =>
                builder
                    .addRow(series.getName())
                    .addRow(timeAxis.formatValue(dataPoint.x))
                    .addRow(`$${series.axisY.formatValue(dataPoint.y)}`),
            )

        const chartCap = dashboard
            .createChartXY({ columnIndex: 1, rowIndex: 3 })
            .setTitle(`${name} Market Cap $`)
            .setTitlePosition('series-left-top')
            .setTitleMargin(0)
            .forEachAxis((axis) => axis.setAnimationScroll(false))
        chartCap.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime, (ticks) => ticks.setGreatTickStyle(emptyTick))
        chartCap
            .getDefaultAxisY()
            .setTickStrategy(AxisTickStrategies.Numeric, (ticks) => ticks.setFormattingFunction(FormattingFunctions.NumericUnits))
        const seriesCap = chartCap
            .addLineSeries({ dataPattern: { pattern: 'ProgressiveX' } })
            .setName(`${name} Market Cap $`)
            .add(coinData.map((p) => ({ x: p.date, y: p.cap })))
            .setCursorResultTableFormatter((builder, series, x, y, dataPoint) =>
                builder
                    .addRow(series.getName())
                    .addRow(timeAxis.formatValue(dataPoint.x))
                    .addRow(`$${series.axisY.formatValue(dataPoint.y)}`),
            )

        const charts = [chartRate, chartVolume, chartLiquidity, chartCap]
        const seriesList = [seriesRate, seriesVolume, seriesLiquidity, seriesCap]

        const timeAxis = chartCap.getDefaultAxisX()
        const axesX = charts.map((chart) => chart.getDefaultAxisX())
        synchronizeAxisIntervals(...axesX)

        const axesY = charts.map((chart) => chart.getDefaultAxisY())
        axesY.forEach((axis) => axis.setThickness(60).setChartInteractionZoomByWheel(false).setChartInteractionPanByDrag(false))

        charts.forEach((chart) => chart.setAutoCursor((cursor) => cursor.setTickMarkerXVisible(false)))

        const dispose = () => {
            charts.forEach((chart) => chart.dispose())
        }

        activeDrillDown = { info: coinInfo, dispose }
    }
})()

setTimeout(async () => {
    const dataGrid = dashboard.createDataGrid({ columnIndex: 0, rowIndex: 0, rowSpan: 4 })

    const gridColHighlight = 0
    const gridColCoin = 1
    const gridColPrice = 3
    const gridColMarketCap = 4
    const gridColVolume = 5
    const gridColAllTimeHigh = 6
    const gridCol1h = 7
    const gridCol24h = 8
    const gridCol1w = 9

    const theme = dataGrid.getTheme()
    const fontHeader = theme.header2Font
    const fontSymbol = theme.header1Font
    const fontSymbolLong = theme.header3Font
    const textFillHeader = theme.chartTitleFillStyle
    const textFillGood = theme.examples.positiveTextFillStyle
    const textFillBad = theme.examples.negativeTextFillStyle
    const backgroundFillGood = theme.examples.positiveBackgroundFillStyle
    const backgroundFillBad = theme.examples.negativeBackgroundFillStyle
    const areaFillGood = theme.examples.positiveAreaFillStyle
    const areaFillBad = theme.examples.negativeAreaFillStyle
    const strokeGood = new SolidLine({ fillStyle: theme.examples.positiveFillStyle, thickness: 2 })
    const strokeBad = new SolidLine({ fillStyle: theme.examples.negativeFillStyle, thickness: 2 })
    const bgHighlightFill = new SolidFill({ color: theme.examples.highlightDataGridColor })
    const bgNormalFill = theme.examples.dataGridCellBackgroundFillStyle

    dataGrid
        .setTitle('Crypto Watch')
        .setCellsBorders({})
        .setCellsPaddings(0)
        .setCellContent(gridColHighlight, 0, ' ')
        .setCellContent(gridColCoin, 0, 2, 1, 'Coin')
        .setCellContent(gridColPrice, 0, 'Price')
        .setCellContent(gridCol1h, 0, '1h')
        .setCellContent(gridCol24h, 0, '24h')
        .setCellContent(gridCol1w, 0, '1 week')
        .setCellContent(gridColMarketCap, 0, 'Market Cap')
        .setCellContent(gridColVolume, 0, 'Volume')
        .setCellContent(gridColAllTimeHigh, 0, 'All-time High')
        .setColumnWidth(gridColHighlight, 6)
        .setColumnWidth(gridCol1h, 100)
        .setColumnWidth(gridCol24h, 100)
        .setColumnWidth(gridCol1w, 100)
        .setRowTextFont(0, fontHeader)
        .setRowBorders(0, { bottom: true })
        .setRowTextFillStyle(0, textFillHeader)

    const coinsInfo = await fetch(`${assetsUrl}/coins-list.json`).then((r) => r.json())
    const coinsData = new Array(coinsInfo.length).fill(0)

    const tNow = Date.UTC(2023, 9, 15, 24, 0, 0)

    for (let iCoin = 0; iCoin < coinsInfo.length; iCoin += 1) {
        const coinInfo = coinsInfo[iCoin]
        const { code, name, rate, cap, volume, allTimeHighUSD } = coinInfo

        const coinData = await fetch(`${assetsUrl}/${code}.json`).then((r) => r.json())
        coinsData[iCoin] = coinData
        const coinRowTop = 1 + iCoin * 2
        const coinRowBottom = coinRowTop + 1

        const coinIconUrl = `${assetsUrl}/${code}.png`
        const coinIconImage = new Image()
        coinIconImage.crossOrigin = '*'
        coinIconImage.src = coinIconUrl
        const icon = dataGrid.engine.addCustomIcon(coinIconImage, { height: 32 })

        const dataGlance1h = calcDataAtAGlance(coinData, tNow - 1 * 60 * 60 * 1000, tNow)
        const dataGlance24h = calcDataAtAGlance(coinData, tNow - 24 * 60 * 60 * 1000, tNow)
        const dataGlance1w = calcDataAtAGlance(coinData, tNow - 7 * 24 * 60 * 60 * 1000, tNow)

        dataGrid
            .setRowHeight(coinRowTop, 30)
            .setRowHeight(coinRowBottom, 30)
            // NOTE: First column just used for highlighting active row.
            .setCellContent(gridColHighlight, coinRowTop, 1, 2, ' ')
            .setCellContent(gridColCoin, coinRowTop, 1, 2, icon)
            .setCellPadding(gridColCoin, coinRowTop, { left: 5, right: 5 })
            .setCellPadding(gridColCoin, coinRowTop, { left: 5 })
            .setCellContent(gridColCoin + 1, coinRowTop, 1, 1, code)
            .setCellTextFont(gridColCoin + 1, coinRowTop, fontSymbol)
            .setCellTextFillStyle(gridColCoin + 1, coinRowTop, textFillHeader)
            .setCellContentAlignment(gridColCoin + 1, coinRowTop, 'left-bottom')
            .setCellContent(gridColCoin + 1, coinRowBottom, 1, 1, name)
            .setCellContentAlignment(gridColCoin + 1, coinRowBottom, 'left-top')
            .setCellTextFont(gridColCoin + 1, coinRowBottom, fontSymbolLong)
            .setCellTextFillStyle(gridColCoin + 1, coinRowBottom, textFillHeader)
            .setCellContent(gridColPrice, coinRowTop, 1, 2, `$${rate.toFixed(2)}`)
            .setCellContent(gridColMarketCap, coinRowTop, 1, 2, `$${(cap / 10 ** 9).toFixed(2)}B`)
            .setCellContent(gridColVolume, coinRowTop, 1, 2, `$${(volume / 10 ** 9).toFixed(2)}B`)
            .setCellContent(gridColAllTimeHigh, coinRowTop, 1, 2, `$${allTimeHighUSD.toFixed(2)}`)
            .setCellContent(gridCol1h, coinRowTop, `${dataGlance1h.delta >= 0 ? '+' : ''}${dataGlance1h.delta.toFixed(2)}%`)
            .setCellTextFillStyle(gridCol1h, coinRowTop, dataGlance1h.delta > 0 ? textFillGood : textFillBad)

            .setCellContent(gridCol1h, coinRowBottom, 'yo bro')
            .setCellContent(gridCol1h, coinRowBottom, {
                type: 'spark-area',
                data: dataGlance1h.dataPoints,
                strokeStyle: dataGlance1h.delta > 0 ? strokeGood : strokeBad,
                fillStyle: dataGlance1h.delta > 0 ? areaFillGood : areaFillBad,
            })
            .setCellBackgroundFillStyle(gridCol1h, coinRowTop, dataGlance1h.delta > 0 ? backgroundFillGood : backgroundFillBad)
            .setCellBackgroundFillStyle(gridCol1h, coinRowBottom, dataGlance1h.delta > 0 ? backgroundFillGood : backgroundFillBad)
            .setCellContent(gridCol24h, coinRowTop, `${dataGlance24h.delta >= 0 ? '+' : ''}${dataGlance24h.delta.toFixed(2)}%`)
            .setCellTextFillStyle(gridCol24h, coinRowTop, dataGlance24h.delta > 0 ? textFillGood : textFillBad)
            .setCellContent(gridCol24h, coinRowBottom, {
                type: 'spark-area',
                data: dataGlance24h.dataPoints,
                strokeStyle: dataGlance24h.delta > 0 ? strokeGood : strokeBad,
                fillStyle: dataGlance24h.delta > 0 ? areaFillGood : areaFillBad,
            })
            .setCellBackgroundFillStyle(gridCol24h, coinRowTop, dataGlance24h.delta > 0 ? backgroundFillGood : backgroundFillBad)
            .setCellBackgroundFillStyle(gridCol24h, coinRowBottom, dataGlance24h.delta > 0 ? backgroundFillGood : backgroundFillBad)
            .setCellContent(gridCol1w, coinRowTop, `${dataGlance1w.delta >= 0 ? '+' : ''}${dataGlance1w.delta.toFixed(2)}%`)
            .setCellTextFillStyle(gridCol1w, coinRowTop, dataGlance1w.delta > 0 ? textFillGood : textFillBad)
            .setCellContent(gridCol1w, coinRowBottom, {
                type: 'spark-area',
                data: dataGlance1w.dataPoints,
                strokeStyle: dataGlance1w.delta > 0 ? strokeGood : strokeBad,
                fillStyle: dataGlance1w.delta > 0 ? areaFillGood : areaFillBad,
            })
            .setCellBackgroundFillStyle(gridCol1w, coinRowTop, dataGlance1w.delta > 0 ? backgroundFillGood : backgroundFillBad)
            .setCellBackgroundFillStyle(gridCol1w, coinRowBottom, dataGlance1w.delta > 0 ? backgroundFillGood : backgroundFillBad)
            .setRowBorders(coinRowBottom, { bottom: true })
            .setColumnBorders(gridColAllTimeHigh, { right: true })
            .setColumnBorders(gridCol1h, { right: true })
            .setColumnBorders(gridCol24h, { right: true })
    }

    let selectedCoinIndex = 0
    dataGrid.onCellMouseEnter((cell, event) => {
        const iCoin = Math.floor((cell.row - 1) / 2)
        if (iCoin < 0) {
            return
        }
        dataGrid
            .setRowHighlight(1 + iCoin * 2, highlightIntensity)
            .setRowHighlight(1 + iCoin * 2 + 1, highlightIntensity)
            .setCellBackgroundFillStyle(gridColHighlight, 1 + iCoin * 2, bgHighlightFill)
    })
    dataGrid.onCellMouseLeave((cell, event) => {
        const iCoin = Math.floor((cell.row - 1) / 2)
        dataGrid
            .setRowHighlight(1 + iCoin * 2, selectedCoinIndex === iCoin ? highlightIntensity : 0)
            .setRowHighlight(1 + iCoin * 2 + 1, selectedCoinIndex === iCoin ? highlightIntensity : 0)
            .setCellBackgroundFillStyle(gridColHighlight, 1 + iCoin * 2, selectedCoinIndex === iCoin ? bgHighlightFill : bgNormalFill)
    })
    dataGrid.onCellMouseClick((cell, event) => {
        const iCoin = Math.floor((cell.row - 1) / 2)
        if (iCoin < 0) {
            return
        }
        dataGrid
            .setRowHighlight(1 + selectedCoinIndex * 2, false)
            .setRowHighlight(1 + selectedCoinIndex * 2 + 1, false)
            .setCellBackgroundFillStyle(gridColHighlight, 1 + selectedCoinIndex * 2, bgNormalFill)
        selectedCoinIndex = iCoin
        dataGrid
            .setRowHighlight(1 + iCoin * 2, highlightIntensity)
            .setRowHighlight(1 + iCoin * 2 + 1, highlightIntensity)
            .setCellBackgroundFillStyle(gridColHighlight, 1 + iCoin * 2, bgHighlightFill)
        setDrillDown(coinsInfo[iCoin], coinsData[iCoin])
    })

    dataGrid
        .setRowHighlight(1 + selectedCoinIndex * 2, highlightIntensity)
        .setRowHighlight(1 + selectedCoinIndex * 2 + 1, highlightIntensity)
        .setCellBackgroundFillStyle(gridColHighlight, 1 + selectedCoinIndex * 2, bgHighlightFill)
    setDrillDown(coinsInfo[selectedCoinIndex], coinsData[selectedCoinIndex])
}, 1000)
