const fs = require("fs")

const INSTRUMENTS_FILE_PATH = "./instruments.json"
const TOKEN_PATH = "token.json"
var KiteConnect = require('kiteconnect').KiteConnect;
var options = {
    "api_key": process.env.API_KEY,
    "debug": false
}
var secret = process.env.API_SECRET
var kc = new KiteConnect(options)

function saveToken(access_token) {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({access_token}, null, 2))
}

function isTokenValid() {
    let valid = true
    try {
        const now = new Date()
        const stat = fs.statSync(TOKEN_PATH)
        const mtime = new Date(stat.mtime)
        if (now > mtime &&
            (now.getDate() !== mtime.getDate() ||
            (now.getHours() > 8 && mtime.getHours() < 8))) {
            valid = false
        }
    } catch(err) {
        console.log("error accessing token file: ", err.code)
        valid = false
    }
    return valid
}

function downloadInstrumentsFile(access_token) {
    var options = {
        "api_key": process.env.API_KEY,
        "access_token": access_token
    }
    console.log("Downloading instruments file...")
    new KiteConnect(options).getInstruments("NFO").then((content) =>
    {
        console.log("Instruments content length: ", content.length)
        fs.writeFileSync(INSTRUMENTS_FILE_PATH, JSON.stringify(content, null, 2))
    })
    .catch(error => {
        console.log("error getting Instruments: ", error)
    })
}


async function initKiteInstance(requestToken) {
    return new Promise((resolve, reject) => {
        if (!isTokenValid()) {
            kc.generateSession(requestToken, secret)
                .then(result => {
                    console.log("session generation successful: ", result.access_token)
                    saveToken(result.access_token)
                    kc.setAccessToken(result.access_token)
                    downloadInstrumentsFile(result.access_token)
                    resolve(true)
                })
                .catch(error => {
                    console.log("Error generating session: ", error)
                    reject(error)
                })
        } else {
            resolve(true)
        }
    })
}

function getKiteInstance() {
    if (!kc.access_token && fs.existsSync(TOKEN_PATH)) {
        kc.setAccessToken(JSON.parse(fs.readFileSync(TOKEN_PATH)).access_token)
    }
    console.log("access token is ", kc.access_token)
    return kc
}

function isKiteSessionValid() {
    return isTokenValid()
}

module.exports = {getKiteInstance, initKiteInstance, isKiteSessionValid}