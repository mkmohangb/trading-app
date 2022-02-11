const {v4: uuid} = require('uuid')

function configureCreateSubscription({read, readLastMessage, write}) {
    return ({
        streamName,
        handlers,
        messagesPerTick = 100,
        subscriberId,
        positionUpdateInterval = 100,
        originStreamName = null,
        tickIntervalMs = 100
    }) => {

        const subscriberStreamName = `subscriberPosition-${subscriberId}`

        let currentPosition = 0
        let messagesSinceLastPositionWrite = 0
        let keepGoing = true

        function loadPosition() {
            return readLastMessage(subscriberStreamName)
                .then(message => 
                    currentPosition = message ? message.data.position : 0)
        }

        function category(streamName) {
            if (streamName === null) {
                return ''
            }
            return streamName.split('-')[0]
        }

        function filterOnOriginMatch(messages) {
            if (!originStreamName) {
                return messages
            }

            return messages.filter(message => {
                const originCategory =  message.metadata && category(message.metadata.originStreamName)
                return originStreamName === originCategory
            })
           
        }

        function getNextBatchOfMessages() {
            return read(streamName, currentPosition + 1, messagesPerTick)
                .then(filterOnOriginMatch)
        }

        Promise.each = async function(arr, fn) {
            for(const item of arr) await fn(item)
        }

        function logError(lastMessage, error) {
            console.error(
                'error processing:\n',
                `\t${subscriberId}\n`,
                `\t${lastMessage.id}\n`,
                `\t${error}\n`
            )
        }

        function handleMessage (message) {
            const handler = handlers[message.type] || handlers.$any
            return handler ? handler(message) : Promise.resolve(true)
        }

        function writePosition(position) {
            const positionEvent = {
                id: uuid(),
                type: 'Read',
                data: {position}
            }
            return write(subscriberStreamName, positionEvent)
        }

        function updateReadPosition(position) {
            currentPosition = position
            messagesSinceLastPositionWrite += 1

            if (messagesSinceLastPositionWrite === positionUpdateInterval) {
                messagesSinceLastPositionWrite = 0
                return writePosition(position)
            }
            return Promise.resolve(true)
        }

        function processBatch(messages) {
            return Promise.each(messages, message =>
                handleMessage(message)
                .then(() => updateReadPosition(message.globalPosition))
                .catch(err => {
                    logError(message, err)
                    throw err
                })
            ).then(() => messages.length)
        }
        
        function tick() {
            return getNextBatchOfMessages()
                .then(processBatch)
                .catch(err => {
                    console.error('Error processing batch', err)
                    stop()
                })
        }

        async function poll() {
            await loadPosition()

            while (keepGoing) {
                const messagesProcessed = await tick()

                if (messagesProcessed === 0) {
                    await new Promise(resolve => setTimeout(resolve, tickIntervalMs))
                }
            }
        }

        function start() {
            console.log(`Started ${subscriberId}`);
            return poll()
        }

        function stop() {
            console.log(`Stopped ${subscriberId}`)
            keepGoing = false
        }

        return {
            loadPosition,
            start,
            stop,
            tick,
            writePosition
        }

    }
}

module.exports = configureCreateSubscription