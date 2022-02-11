const {v4: uuid} = require('uuid')

function writeMonitorCommand(context){
    const userId = "tastytrade"
    const stream = `skew:command-${userId}`
    const command = {
        id: uuid(),
        type: 'Monitor',
        metadata: context.command.metadata,
        data: context.command.data
    }

    return context.messageStore.write(stream, command)
}

function createStrategyCommandHandler({messageStore}) {
    return {
        Trade: command => {
            const context = {
                messageStore: messageStore,
                command
            }
            return Promise.resolve(context)
                .then(writeMonitorCommand)
                .catch(err => console.log("failed to start monitoring: ",err))
        }
    }
}

function writeOrderCommand(context){
    const userId = "tastytrade"
    const stream = `order:command-${userId}`
    const command = {
        id: uuid(),
        type: 'Place',
        metadata: context.event.metadata,
        data: context.event.data
    }

    return context.messageStore.write(stream, command)
}

function createSkewEventHandler({messageStore}) {
    return {
        Resolved: event => {
            const context = {
                messageStore: messageStore,
                event
            }
            return Promise.resolve(context)
                .then(writeOrderCommand)
                .catch(err => console.log("failed to place order: ", err))
        }
    }

}

function writeStopLossMonitorCommand(context){
    const userId = "tastytrade"
    const stream = `stoploss:command-${userId}`
    const command = {
        id: uuid(),
        type: 'Monitor',
        metadata: context.metadata,
        data: context.event.data
    }

    return context.messageStore.write(stream, command)
}

function createOrderEventHandler({messageStore}) {
    return {
        Placed: event => {
            const context = {
                messageStore: messageStore,
                event
            }
            return Promise.resolve(context)
                .then(writeStopLossMonitorCommand)
                .catch(err => console.log("failed to monitor stop loss: ", err))
        }
    }
}

function build({messageStore}) {

    const strategyCommandSubscription = messageStore.createSubscription({
        streamName: 'strategy:command',
        handlers: createStrategyCommandHandler({messageStore}),
        subscriberId: 'component:strategy:command'
    })

    const skewEventSubscription = messageStore.createSubscription({
        streamName:'skew',
        handlers: createSkewEventHandler({messageStore}),
        subscriberId: 'component:skew'
    })

    const orderEventSubscription = messageStore.createSubscription({
        streamName: 'order',
        handlers: createOrderEventHandler({messageStore}),
        subscriberId: 'component:order'
    })


    function start() {
        strategyCommandSubscription.start()
        skewEventSubscription.start()
        orderEventSubscription.start()
    }

    function stop() {
        strategyCommandSubscription.stop()
        skewEventSubscription.stop()
        orderEventSubscription.stop()
    }


    return {
        start,
        stop
    }
}

module.exports = build