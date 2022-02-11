const test = require('blue-tape')
const {v4: uuid} = require('uuid')


const createPostgresClient = require('../../postgres-client')
const createMessageStore = require('../../message-store')
const createOrderComponent = require('../order')

const db = createPostgresClient({
    connectionString: "postgres://postgres@localhost:5433/message_store"
  })

const messageStore = createMessageStore({db})
const orderComponent = createOrderComponent({messageStore})

test("post order command and monitor for placed event", t => {
    orderComponent.start()
    const streamName = 'order:command'
    const orderId = uuid()
    const placeOrder = { id: uuid(), type: 'Place', data: {symbol: "NIFTY 50", orderId:orderId} }
    messageStore.write(streamName, placeOrder)
        .then(()=> setTimeout(() => {
            messageStore.read(`order-${orderId}`).then(written => {
                //t.equal(written.length, 1, 'Wrote the messages')}
                t.assert(written.length > 0)
                orderComponent.stop()
                t.end()
            }
            )}, 2000))
})

test.onFinish(() => {
    messageStore.stop()
})