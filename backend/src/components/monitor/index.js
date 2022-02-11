const {v4: uuid} = require('uuid')
const createTicker = require('./ticker')

function writeSkewEvent (context) {
    const command = context.command
  
    const resolvedEvent = {
      id: uuid(),
      type: 'Resolved',
      metadata: command.metadata,
      data: command.data
    }
    const userId = "tastytrade"
    const streamName = `skew-${userId}`
  
    return context.messageStore
      .write(streamName, resolvedEvent)
      .then(() => context)
}

function monitorSkew(context) {
    console.log("monitor skew")
    return new Promise((resolve, reject) => {
        const ticker = createTicker()
        const callback = ({skew, strike, premium}) => {
            console.log("Skew/premium is ", skew,"%", premium)
            context.command.data.strike = strike
            context.command.data.premium = premium
            resolve(context)
            ticker.unsubscribe(callback)
            ticker.close()
        }
        ticker.subscribe([context.command.data.instrument], callback, true, false)
    })
}

function createSkewMonitorHandler({messageStore}) {
    return {
        Monitor: command => {
            const context = {
                messageStore: messageStore,
                command,
            }
            console.log("In skew monitor handler")
            return Promise.resolve(context)
                .then(monitorSkew)
                .then(writeSkewEvent)
                .catch(err => console.log("Error monitoring skew: ", err))
        }
    }
}

function isCombinedStoplosshit(premium, curPremium, stoploss) {
    return (curPremium > premium * (1 + (stoploss/100.0)))
}

function monitorStopLoss(context) {
    console.log("monitor stoploss")
    return new Promise((resolve, reject) => {
        const ticker = createTicker()
        const callback = (curPremium) => {
            console.log("curPremium is ", curPremium)
            if (isCombinedStoplosshit(context.command.data.premium, curPremium,
                                      context.command.data.stoploss)) {
                console.log("SL HIT!!!")
                resolve(context)
                ticker.unsubscribe(callback)
            }
        }
        ticker.subscribe(context.command.data.strike, callback, false, true)
    })
}

function createStopLossMonitorHandler({messageStore}) {
    return {
        Monitor: command => {
            const context = {
                messageStore: messageStore,
                command,
            }
            console.log("In stoploss monitor handler")
            return Promise.resolve(context)
                .then(monitorStopLoss)
                //.then(writeStopLossEvent)
                .catch(err => console.log("Error monitoring stoploss: ", err))
        }
    }
}

function build({messageStore}) {

    const monitorSkewSubscription = messageStore.createSubscription({
        streamName:'skew:command',
        handlers: createSkewMonitorHandler({messageStore}),
        subscriberId:'component:skew:command'

    })

    const monitorStopLossSubscription = messageStore.createSubscription({
        streamName:'stoploss:command',
        handlers: createStopLossMonitorHandler({messageStore}),
        subscriberId:'component:stoploss:command'

    })
    
    function start() {
        monitorSkewSubscription.start()
        monitorStopLossSubscription.start()
    }

    function stop() {
        monitorSkewSubscription.stop()
        monitorStopLossSubscription.stop()
    }
    return {
        start,
        stop
    }

}

module.exports = build