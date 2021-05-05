const request = require('request');
const cors = require('cors');
var querystring = require('querystring');
var express = require('express');
var app = express();
app.use(express.json());
app.use(cors());

_EXTERNAL_URL = 'https://wise.com/us/iban/checker';

var ibanBankName = "ibanBankName";

var CURRENT_BALANCE = process.env.BALANCE || 100000;

app.get('/api/v1/balance', function (req, res) {
    var responseObject ={code : Number,data : { amount:Number, balance:Number, bank: String, currency:String, logo:String },
                                   error: {status: String, message:String } };
    responseObject.code=200;
    responseObject.data.balance=CURRENT_BALANCE;
    res.send(responseObject);
});

app.get('/api/v1/bank/:iban', function (req, res) {
    var responseObject ={code : Number,data : { amount:Number, balance:Number, bank: String, currency:String, logo:String },
                                   error: {status: String, message:String } };
    request({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        uri: _EXTERNAL_URL,
        body: querystring.stringify({userInputIban: req.params.iban}),
        method: 'POST'
      }, function (err, response, body) {
        if (err) {
            return response.err;
        }
        if(body.includes('details-list__logo')){
            var logoDetails = body.substring(
            body.lastIndexOf("details-list__logo") + 'details-list__logo'.length+7, 
            body.lastIndexOf("<dl class=\"details-list\">"));
        if(logoDetails.split("\"").length>0){
            responseObject.data.logo = logoDetails.split("\"")[0];
        };
        }

        if(body.includes('Success! This is a correct IBAN - Wise')){
            responseObject.code = 200;
        }else{
            responseObject.code = 400;
            responseObject.error.status = "Bad Request";
            responseObject.error.message = "IBan is Invalid";
        }
        
        if(body.includes('ibanBankName')){
            responseObject.data.bank = body.substring(
            body.lastIndexOf("ibanBankName") + ibanBankName.length+4, 
            body.lastIndexOf("ibanCountryCode") - 14);
        }
        return res.status(200).send(responseObject);
      });
});


app.post('/api/v1/transfer/:iban', function (req, res) {
    var responseObject ={code : Number,data : { amount:Number, balance:Number, bank: String, currency:String, logo:String },
                                   error: {status: String, message:String } };
    request({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        uri: _EXTERNAL_URL,
        body: querystring.stringify({userInputIban: req.params.iban}),
        method: 'POST'
      }, function (err, response, body) {
        if (err) {
            return response.err;
        }
        
        if(body.includes('Success! This is a correct IBAN - Wise')){
            responseObject.code = 200;
            const remainingBalance=parseFloat(CURRENT_BALANCE)-parseFloat(req.body.amount);
            if(remainingBalance>0){
                process.env.BALANCE= remainingBalance;
                CURRENT_BALANCE = remainingBalance;
                console.log("balance after transfer",process.env.BALANCE);
                responseObject.data.balance = process.env.BALANCE;
            } else{
                responseObject.code = 402;
                responseObject.error.status = "Bad Request";
                responseObject.error.message = "Insufficient funds.";
            }
        }else{
            responseObject.code = 400;
            responseObject.error.status = "Bad Request";
            responseObject.error.message = "IBan is Invalid";
        }
        return res.status(200).send(responseObject);
      });
});


app.listen(2400);
console.log("service running on 2400 port....");