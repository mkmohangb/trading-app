
const getStreamMessagesSql = 'SELECT * FROM get_stream_messages($1, $2, $3)'
const getLastMessageSql = 'SELECT * FROM get_last_stream_message($1)'
const getCategoryMessagesSql = 'SELECT * FROM get_category_messages($1, $2, $3)'

function deserializeMessage (rawMessage) {
    if (!rawMessage) {
        return null
    }
    return {
        id: rawMessage.id,
        streamName: rawMessage.streamName,
        type: rawMessage.type,
        position: parseInt(rawMessage.position, 10),
        globalPosition: parseInt(rawMessage.global_position, 10),
        data: rawMessage.data ? JSON.parse(rawMessage.data) : {},
        metadata: rawMessage.metadata ? JSON.parse(rawMessage.metadata) : {},
        time: rawMessage.time
    }
}

function createRead({db}) {
    function read(streamName, fromPosition=0, maxMessages=1000) {
        let query = null
        let values = []
        if (streamName.includes('-')) {
            query = getStreamMessagesSql
            values = [streamName, fromPosition, maxMessages]
        } else {
            query = getCategoryMessagesSql
            values = [streamName, fromPosition, maxMessages]
        }

        return db.query(query, values)
            .then(res => res.rows.map(deserializeMessage))
    }

    function readLastMessage(streamName) {
        return db.query(getLastMessageSql, [streamName])
            .then(res => deserializeMessage(res.rows[0]))
    }

    return {
        read,
        readLastMessage
    }
}

module.exports = createRead