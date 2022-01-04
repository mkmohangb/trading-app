require('dotenv').config()
fs = require('fs');
const express = require('express')
const cors = require("cors")
var KiteConnect = require('kiteconnect').KiteConnect;
var KiteTicker = require("kiteconnect").KiteTicker;

var ticker = new KiteTicker({
    api_key: process.env.API_KEY,
    access_token: ""
});

const app = express()
app.use(express.json())
app.use(cors())
var options = {
    "api_key": process.env.API_KEY,
    "debug": false
}

var requestToken = ""
var secret = process.env.API_SECRET
const instrumentsFilePath = "./instruments.json"
var obj = JSON.parse(fs.readFileSync(instrumentsFilePath))
const NIFTY_INSTRUMENT_TOKEN = 256265
var items = [NIFTY_INSTRUMENT_TOKEN];
var instruments = [{}]
var orderPlaced = false
var combinedPremium = 0
kc = new KiteConnect(options)
kc.setSessionExpiryHook(() => console.log("User logged out"))

function createKiteInstance(access_token) {
    var options = {
        "api_key": process.env.API_KEY,
        "access_token": access_token
    };
    kc = new KiteConnect(options);
}

function createTickerInstance(access_token) {
    ticker = new KiteTicker({
        api_key: process.env.API_KEY,
        access_token: access_token
    });
    ticker.connect()
    ticker.on('ticks', onTicks);
    ticker.on('connect', subscribe);
    ticker.on('disconnect', onDisconnect);
    ticker.on('error', onError);
    ticker.on('close', onClose);
    ticker.on('order_update', onTrade);
}

function getAtmInstruments(spot) {
    const name = "NIFTY"
    const rem = spot%100
    const quotient = Math.floor(spot/100)
    var strikes = [quotient * 100 + 50]
    if (rem <= 50) {
        strikes.push(quotient * 100)
    } else {
        strikes.push((quotient+1) * 100)
    }
    console.log(strikes)

    if (obj) {
        const instruments = obj.filter(instru => strikes.includes(instru.strike) && instru.name === name)
        instruments.sort((x,y)=>new Date(x.expiry) - new Date(y.expiry))
        console.log(instruments.slice(0,4).map(ins => ins.tradingsymbol))
        return instruments.slice(0,4)
    }
    return []
}

function regularOrderPlace(symbol, type) {
	kc.placeOrder("regular", {
			"exchange": "NFO",
			"tradingsymbol": symbol,
			"transaction_type": type,
			"quantity": 50,
			"product": "MIS",
			"order_type": "MARKET"
		}).then(function(resp) {
			console.log(resp);
            //setTimeout(buyorder, 5000)
		}).catch(function(err) {
			console.log(err);
		});
}

app.get("/setup", (request, response) => {
    createKiteInstance(process.env.ACCESS_TOKEN)
    createTickerInstance(process.env.ACCESS_TOKEN)
    kc.getProfile()
		.then(function(result) {
			console.log(result)
            fs.stat(instrumentsFilePath, (err, stats) => {
                if (err != null && err.code !== "ENOENT") {
                    console.log("error when fs stat: ", err.name, err.code);
                    response.json({name: result.user_name})
                } else {
                    const now = new Date()
                    if ((err != null && err.code === "ENOENT") ||
                        now > new Date(stats.birthtime) && now.getDate() !== new Date(stats.birthtime).getDate()) {
                        kc.getInstruments("NFO").then((content) =>
                        {
                            console.log(content.length);
                            fs.writeFileSync(instrumentsFilePath, JSON.stringify(content, null, 2))
                            response.json({name: result.user_name})
                        })
                        .catch(error => {
                            console.log("error getting instruments: ", error)
                            response.json({name: result.user_name})
                        })
                    } else {
                        response.json({name: result.user_name})
                    }
                }
            })
		}).catch(function(err) {
			console.log(err);
            response.json({name: "None"})
		});
})

app.get("/", (req, res) => {
    res.send("<h1>Hello from Node</h1>")
})
app.get("/login_url", (request, response) => {
    const url = kc.getLoginURL()
    response.send(`{"url": "${url}"}`)
})

app.post("/token", (request, response) => {
    const body = request.body
    if (!body.requestToken) {
        return response.status(400).json({error: "token missing" })
    }
    if (requestToken !== body.requestToken) {
        requestToken = body.requestToken
        kc.generateSession(requestToken, secret)
            .then(result => {
                console.log("session generation successful: ", result.access_token)
                createTickerInstance(result.access_token)
                response.status(200).end()
            })
            .catch(error => {
                console.log("Error generating session")
                response.status(500).end()
            })
    }
})

app.get("/spot", (request, response) => {
    const exchange = "NSE";
    const nifty = exchange + ":" + "NIFTY 50"
    const banknifty = exchange + ":" + "NIFTY BANK"

    kc.getLTP([nifty, banknifty])
     .then(result=>{
         console.log(result)
         console.log(`${nifty} => Rs.${result[nifty].last_price}`)
         console.log(`${banknifty} => Rs.${result[banknifty].last_price}`) 
         response.json({price: [result[nifty].last_price, result[banknifty].last_price]})
        })
    .catch(error=>{
        console.log(error.message)
        response.json({error:"unable retrieve quote"})
    })
})
function onTicks(ticks) {
    if (items.length == 1) {
        instruments = getAtmInstruments(ticks[0].last_price)
        const strikes = instruments.map(ins => Number(ins.instrument_token))
        items.push(...strikes)
        console.log(items)
        ticker.subscribe(items)
        ticker.setMode(ticker.modeFull, items)
    } else {
        const premiums = ticks.map(tick=>{
            if (tick.instrument_token == NIFTY_INSTRUMENT_TOKEN) {
                return {strike: "SPOT" , premium: tick.last_price}
            } else {
                const {strike, instrument_type, tradingsymbol} =
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
                console.log(key, skew,"%", combinedPremium, curPremium)
                if (skew < 10 && !orderPlaced) {
                    orderPlaced = true
                    combinedPremium = curPremium
                    console.log("Place order: ", value[1], combinedPremium)
                    //regularOrderPlace(value[1][0], "SELL")
                    //regularOrderPlace(value[1][1], "SELL")
                    const watch = instruments.filter(ins => value[1].includes(ins.tradingsymbol))
                                                .map(ins => Number(ins.instrument_token))
                    console.log(watch)
                    ticker.unsubscribe(items)
                    items = watch
                    subscribe()
                }
                if (orderPlaced) {
                    if (curPremium < combinedPremium - 1) {
                        console.log("Exiting the trade")
                        ticker.unsubscribe(items)
                        items = []
                    }
                }
            }
        }
    }
}

app.post("/place_order", (request, response) => {
    //order details like instrument, lotsize, skew%, csl %
    //persist the information
    //monitor the skew
    //trigger the trade
    //monitor the csl
    //exit or square off trade
})

function subscribe() {
	ticker.subscribe(items);
	ticker.setMode(ticker.modeFull, items);
}

function onDisconnect(error) {
	console.log("Closed connection on disconnect", error);
}

function onError(error) {
	console.log("Closed connection on error", error);
}

function onClose(reason) {
	console.log("Closed connection on close", reason);
}

function onTrade(order) {
    console.log("Order update", order);
}
const PORT = process.env.PORT
app.listen(PORT, () => console.log("server listening on port 3001"))
console.log("end of program");