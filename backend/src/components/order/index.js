const {v4: uuid} = require('uuid')
const broker = require('../../broker')

async function placeOrder(context) {
    const placeCommand = context.command
    console.log("placeOrder: ", placeCommand.data)
    // try {
    //     resp = await broker.getKiteInstance().placeOrder("regular", {
    //         "exchange": "NFO",
    //         "tradingsymbol": placeCommand.data.strike[0],
    //         "transaction_type": "SELL",
    //         "quantity": 50,
    //         "product": "MIS",
    //         "order_type": "MARKET"
    //     })
    //     console.log("order placed ", resp);
    //     resp = await broker.getKiteInstance().placeOrder("regular", {
    //         "exchange": "NFO",
    //         "tradingsymbol": placeCommand.data.strike[1],
    //         "transaction_type": "SELL",
    //         "quantity": 50,
    //         "product": "MIS",
    //         "order_type": "MARKET"
    //     })
    //     order = await broker.getKiteInstance().getOrderHistory(resp.data.order_id)
    // } catch(err) {
    //     console.log("catch error placing order ", err);
    // }
    return new Promise(resolve => resolve(placeCommand.data.strike))
        .then((resp) => {
            context.order_id = resp
            return context
    })
}

function writePlacedEvent(context) {
    const userId = "tastytrade"
    const streamName = `order-${userId}`
    const event = {
        id: uuid(),
        type: 'Placed',
        metadata: context.command.metadata,
        data: context.command.data
    }
    event.data.order_id = context.order_id
    return context.messageStore.write(streamName, event)
        .then(() => context)

}

function createPlaceOrderHandler({messageStore}) {
    return {
        Place: command => {
            const context = {
                messageStore: messageStore,
                command,
            }

            return Promise.resolve(context)
                .then(placeOrder)
                .then(writePlacedEvent)
                .catch(err => console.log("failed placing order: ",err))
        }
    }
}

function build({messageStore}) {

    const placeOrderHandler = createPlaceOrderHandler({messageStore})
    const placeOrderSubscription = messageStore.createSubscription({
        streamName: 'order:command',
        handlers: placeOrderHandler,
        subscriberId: 'component:order:command'
    })

    function start() {
        placeOrderSubscription.start()
    }

    function stop() {
        placeOrderSubscription.stop()
    }
    return {
        start,
        stop
    }
}

module.exports = build