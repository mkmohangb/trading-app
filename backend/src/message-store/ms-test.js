const test = require('blue-tape')
const {v4: uuid} = require('uuid')

const createPostgresClient = require('../postgres-client') 
const createMessageStore = require('../message-store') 

const db = createPostgresClient({ 
  connectionString: "postgres://postgres@localhost:5433/message_store"
})
const messageStore = createMessageStore({db})

test('Writing a message without expected version', t => {
  const stream = `videos-${uuid()}`
  const videoUploaded = { id: uuid(), type: 'VideoUploaded', data: {} }
  const videoTranscoded = { id: uuid(), type: 'VideoTranscoded', data: {} }

  return messageStore.write(stream, videoUploaded)
    .then(() => messageStore.write(stream, videoTranscoded))
    .then(() =>
      messageStore.read(stream).then(written => {
        t.equal(written.length, 2, 'Wrote the messages')

        t.equal(written[0].type, videoUploaded.type, 'Correct type')
        t.equal(written[1].type, videoTranscoded.type, 'Correct type')

        t.equal(written[0].position, 0, 'Correct version')
        t.equal(written[1].position, 1, 'Correct version')
      })
    )
})

test.onFinish(() => {
  messageStore.stop()
})