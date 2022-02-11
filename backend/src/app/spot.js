const express = require('express')
const router = express.Router()
const broker = require('../broker')

router.get("/", (request, response) => {
    const exchange = "NSE";
    const nifty = exchange + ":" + "NIFTY 50"
    const banknifty = exchange + ":" + "NIFTY BANK"
    console.log("Get LTP")

    broker.getKiteInstance().getLTP([nifty, banknifty])
     .then(result=>{
         console.log(result)
         console.log(`${nifty} => Rs.${result[nifty].last_price}`)
         console.log(`${banknifty} => Rs.${result[banknifty].last_price}`) 
         response.json({price: [result[nifty].last_price, result[banknifty].last_price]})
        })
    .catch(error=>{
        console.log('error retrieving spot prices ', error.message)
        response.json({error:"unable retrieve quote"})
    })
})

module.exports = router