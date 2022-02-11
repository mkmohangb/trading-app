const KiteTicker = require("kiteconnect").KiteTicker;
const fs = require("fs")
const TOKEN_PATH = 'token.json'
const tokens = { "NIFTY": 256265,
                 "BANKNIFTY": 260105
                }
const INSTRUMENTS_FILE_PATH = "./instruments.json"
var obj

function getToken(instrument_name) {
    if (obj === undefined) {
        obj = JSON.parse(fs.readFileSync(INSTRUMENTS_FILE_PATH))
    } 
    return obj.filter(instru => instru.tradingsymbol === instrument_name)[0]
}

function getAtmInstruments(name, spot) {
    const rem = spot%100
    const quotient = Math.floor(spot/100)
    var strikes = []
    var factor = name === "NIFTY" ? 1 : 2
    if (rem <= 50) {
        strikes = [quotient * 100, quotient * 100 + 50 * factor]
    } else {
        strikes = [(quotient + 1) * 100, (quotient + 1) * 100 - 50 * factor]
    }
    console.log(strikes)
    if (obj === undefined) {
        obj = JSON.parse(fs.readFileSync(INSTRUMENTS_FILE_PATH))
    }
    console.log("file length is ", obj.length, name)
    const instruments = obj.filter(instru => strikes.includes(instru.strike) && instru.name === name)
    instruments.sort((x,y)=>new Date(x.expiry) - new Date(y.expiry))
    console.log(instruments.slice(0,4).map(ins => ins.tradingsymbol))
    return instruments.slice(0,4)
}

function getStrikes(name, spot) {
    const path = './instruments.json'
    //const name = "NIFTY"
    const rem = spot%100
    const quotient = Math.floor(spot/100)
    var strike = (quotient + 1) * 100
    if (rem < 25) {
        strike = quotient * 100
    } else if (rem < 75) {
        strike = quotient * 100 + 50
    }

    if (fs.existsSync(path)) {
        var obj = JSON.parse(fs.readFileSync(path))
        //console.log(obj[0]);
        obj.sort((x,y)=>new Date(x.expiry) - new Date(y.expiry))
        //console.log(obj[0])
        const instruments = obj.filter(instru => instru.strike === strike && instru.name === name)
        console.log(instruments.slice(0,2).map(ins => ins.tradingsymbol))
        return (instruments.slice(0,2).map(ins => Number(ins.instrument_token)))
    }
    return []
}

function createTicker() {

    const items = []
    let cbk;
    const tickerInstance = getTickerInstance()
    var instrument_name = ""
    var instruments = [{}]
    var monitorskew = false
    var monitorsl = false

    function getTickerInstance() {
        const ticker = new KiteTicker({
            api_key: process.env.API_KEY,
            access_token: JSON.parse(fs.readFileSync(TOKEN_PATH)).access_token
        });
        console.log("object keys length ", Object.keys(ticker).length)
        ticker.connect()
        ticker.on('ticks', onTicks);
        ticker.on('connect', onConnect);
        ticker.on('disconnect', onDisconnect);
        ticker.on('error', onError);
        ticker.on('close', onClose);
        ticker.on('order_update', onTrade);
        return ticker
    }

    function onTicks(ticks) {
        console.log("Ticks: ", ticks.map(tick => tick.last_price))
        if (monitorsl) {
            if (ticks.length === 2) {
                cbk(ticks[0].last_price + ticks[1].last_price)
            }
            return
        }
        if (items.length == 1) {
            instruments = getAtmInstruments(instrument_name, ticks[0].last_price)
            const strikes = instruments.map(ins => Number(ins.instrument_token))
            items.push(...strikes)
            console.log('ticks, strikes, items is ', strikes, items)
            tickerInstance.subscribe(items)
            tickerInstance.setMode(tickerInstance.modeFull, items)
        } else {
            const premiums = ticks.map(tick=>{
                if (tick.instrument_token == tokens[instrument_name]) {
                    return {strike: "SPOT" , premium: tick.last_price}
                } else {
                    const {strike, tradingsymbol} =
                        instruments.filter(ins => Number(ins.instrument_token) === tick.instrument_token)[0];
                    return { strike : strike, premium: tick.last_price, symbol: tradingsymbol }
                }
            })
            const strikePremium = premiums.reduce((obj, item) => {
                if (item.strike !== "SPOT") {
                    if (!obj.hasOwnProperty(item.strike)) {
                        obj[item.strike] = [[],[]];
                    }
                    obj[item.strike][0].push(item.premium)
                    obj[item.strike][1].push(item.symbol)
                }
                return obj
    
            }, {})
            console.log(premiums.filter(premium => premium.strike == 'SPOT'), strikePremium)
            for (const [key, value] of Object.entries(strikePremium)) {
                if (value[0].length == 2) {
                    const skew = ((Math.abs(value[0][0]-value[0][1])/Math.min(...value[0])) * 100).toFixed(2)
                    const curPremium = value[0][0] + value[0][1]
                    console.log(key, skew,"%", curPremium)
                    if (monitorskew && skew < 10) {
                        cbk({skew, strike:value[1], premium: curPremium})
                    }
                }
            }
        }
    }

    function onConnect() {
        console.log("websocket connection established")
        tickerInstance.subscribe(items)
        tickerInstance.setMode(tickerInstance.modeFull, items);
    }

    function onDisconnect(error) {
        console.log("Closed connection on disconnect ", error.code);
    }

    function onError(error) {
        console.log("Closed connection on error", error);
    }

    function onClose(reason) {
        console.log("Closed connection on close ", reason.code);
    }

    function onTrade(order) {
        console.log("Order update", order);
    }
    
    function subscribe(instrument, cb, skew, sl){
        if (instrument.length === 1) {
            instrument_name = instrument[0]
            items.push(tokens[instrument])
        } else {
            items.push(...instrument.map(instru => Number(getToken(instru).instrument_token)))
        }
        //tickerInstance.subscribe(items)
        //tickerInstance.setMode(tickerInstance.modeFull, items)
        monitorskew = skew
        monitorsl = sl
        console.log("items is ", items)
        cbk = cb

    }
    function unsubscribe(cb) {
        tickerInstance.unsubscribe(items)
        items.splice(0, items.length)
        cbk = null
    }

    function close() {
        tickerInstance.disconnect()
    }

    return {
        subscribe,
        unsubscribe,
        close
    }

}

module.exports = createTicker