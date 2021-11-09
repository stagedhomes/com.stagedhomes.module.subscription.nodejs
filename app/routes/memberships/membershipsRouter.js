const express = require("express");
const app = express();

const cors = require("cors");
const bodyParser = require("body-parser");

const membershipsRouter = express.Router();


//const Service = require( './class.service');

const corsWhiteList = JSON.parse(process.env.CORS_WHITELIST);
if (process.env.APP_ENVIRONMENT === 'dev') {
  corsWhiteList.push(undefined);
}


const corsOptions = {
  origin: function (origin, callback) {
    //checking if !origin, is used in case we are testing this using
    //firebase serve --only functions.  Because then, origin is skipped
    //https://stackoverflow.com/questions/42589882/nodejs-cors-middleware-origin-undefined
    if (corsWhiteList.indexOf(origin) !== -1) {
      console.log(`${origin} passed CORS`);
      return callback(null, true);
    } else {
      console.log(`${origin} is not allowed by CORS`);
      return callback(new Error("Not allowed by CORS"));
    } // if
  } // origin: function()
}; // corsOptions

// parse application/json
const jsonBodyParser = bodyParser.json();

membershipsRouter.all('*', cors(corsOptions)); // enable pre-flight request

membershipsRouter.route('/payment')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(async (req, res, next ) => {

    const greetTxt = req.body.message;

    res.status(200).send(JSON.stringify({ "status": greetTxt }));
    res.end();

  })
; // /renew


membershipsRouter.route('/helloworld')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(jsonBodyParser, async (req, res, next ) => {

    const greetTxt = "hello world! " + req.body.message;

    res.status(200).send(JSON.stringify({ "status": greetTxt }));
    res.end();

  })
; // /helloworld



module.exports = membershipsRouter;
