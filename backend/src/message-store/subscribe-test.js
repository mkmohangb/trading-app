const test = require('blue-tape')
const {v4: uuid} = require('uuid')

const createPostgresClient = require('../postgres-client') 
const createMessageStore = require('../message-store') 

const db = createPostgresClient({ 
    connectionString: "postgres://postgres@localhost:5433/message_store"
  })

const messageStore = createMessageStore({db})

test('Subscribe assumes starting point of 0 if no position saved', t => {
    const subscriberId = uuid()
    const category = `stream${uuid().replace(/-/g, '')}`
    const streamName = `${category}-123`

    let handledMessageCount = 0
    const handlers = {
        test: () => {
            handledMessageCount++
            return Promise.resolve(true)
        }
    }

    const subscription = messageStore.createSubscription({
        streamName: category,
        handlers,
        subscriberId
    })
    const testMessage = () => ({ id: uuid(), type: 'test', data: {} })
    return messageStore.write(streamName, testMessage())
    .then(() => messageStore.write(streamName, testMessage()))
    .then(() => messageStore.write(streamName, testMessage()))
    .then(() => subscription.loadPosition())
    .then(() => subscription.tick())
    .then(() => {
      t.equal(
        handledMessageCount,
        3,
        'Saw all 3 messages'
      )
    })
})

test.onFinish(() => {
    messageStore.stop()
})

