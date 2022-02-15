const express = require('express')
const {v4:uuid} = require('uuid')

function writeTradeCommand(context){
    const userId = "tastytrade"
    const stream = `strategy:command-${userId}`
    const command = {
        id: uuid(),
        type: 'Trade',
        metadata: {
            traceId: context.traceId
        },
        data: {
            instrument: context.attributes.instrument,
            product: context.attributes.product,
            exchange: context.attributes.exchange,
            transaction_type: context.attributes.transaction_type,
            quantity: context.attributes.quantity,
            order_type: context.attributes.order_type,
            skew: context.attributes.skew,
            stoploss: context.attributes.stoploss
        }
    }

    return context.messageStore.write(stream, command)
}

function createHandler({messageStore}) {

    function handleStrategy(request, response) {
        //order details like instrument, lotsize, skew%, csl %
        //persist the information
        console.log("received strategy")
        const body = request.body
        const attributes = {
            exchange: "NFO",
            instrument: body.instrument,
            product: body.product,
            transaction_type: "SELL",
            quantity: body.lots * 50,
            order_type: "MARKET",
            skew: body.skew,
            stoploss: body.sl

        }
        const traceId = request.context.traceId
        const context = {attributes, traceId, messageStore}
        writeTradeCommand(context)
        response.status(200).end()
    }
    return {
        handleStrategy
    }
}


function build ({messageStore}) {
    const router = express.Router()
    const handler = createHandler({messageStore})
    router.route('/')
        .post(handler.handleStrategy)
    
    return {router}

}

module.exports = build