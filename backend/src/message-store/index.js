
const createRead = require('./read')
const createWrite = require('./write')
const configureCreateSubscription = require('./subscribe')

function createMessageStore({db}) {

    const write = createWrite({db})
    const read = createRead({db})
    const createSubscription = configureCreateSubscription({
        read: read.read,
        readLastMessage: read.readLastMessage,
        write: write
    })

    return {
        read: read.read,
        write,
        createSubscription,
        readLastMessage: read.readLastMessage,
        stop: db.stop
    }
}

module.exports = createMessageStore