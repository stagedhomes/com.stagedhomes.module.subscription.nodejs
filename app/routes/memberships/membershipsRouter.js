const express = require("express");
const app = express();

const cors = require("cors");
const bodyParser = require("body-parser");

const membershipsRouter = express.Router();


const Service = require( './class.service');

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

membershipsRouter.route('/create_subscription')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(jsonBodyParser, async (req, res, next ) => {

    cardInfo = req.body;
    console.log(cardInfo);

    // check if SID exists before continuing
    const aspID = cardInfo.aspID;
    try {
      const sidCheck = await Service.checkUserSID(aspID);
      console.log('sidCheck');
      console.log(sidCheck);

      if (sidCheck === false) {
        await Service.createSubscription(cardInfo, (response) => {
          res.status(200).send(JSON.stringify({ 
            "response": response
          }));
          res.end();
        });
      } else {
        res.status(200).send(JSON.stringify({ 
          "response": {
            "messages" : {
              "resultCode" : "rejected",
              "message": [
                { "text": "User already has a subscription ID in the database." }
              ] 
            }
          }

        }));
        res.end();
      } // if sidCheck false or success
    } catch(err) {
      console.log('error occured trying to check user SID:');
      console.log(err);
      res.status(200).send(JSON.stringify({ 
        "response": "error",
        "description": `error occured: ${err}`
      }));
    }
  })
; // /create_subscription


membershipsRouter.route('/get_list_subscriptions')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(jsonBodyParser, async (req, res, next ) => {

    info = req.body;

    Service.getListSubscriptions(info, (response) => {
      res.status(200).send(JSON.stringify({ 
        "response": response
      }));
      res.end();
    });


  })
; // /get_list_subscriptions


membershipsRouter.route('/cancel_subscription')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(jsonBodyParser, async (req, res, next ) => {

    subscriptionId = req.body.subscriptionId;

    Service.cancelSubscription(subscriptionId, (response) => {
      res.status(200).send(JSON.stringify({ 
        "response": response
      }));
      res.end();
    });


  })
; // /cancel_subscription

membershipsRouter.route('/check_status_subscription/sid')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(jsonBodyParser, async (req, res, next ) => {

    subscriptionId = req.body.subscriptionId;

    Service.checkStatusSubscription(subscriptionId, (response) => {
      res.status(200).send(JSON.stringify({ 
        "response": response
      }));
      res.end();
    });


  })
; // /check_status_subscription/sid

membershipsRouter.route('/check_status_subscription/aspid')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(jsonBodyParser, async (req, res, next ) => {

    aspID = req.body.aspId;
    subscriptionId = await Service.checkUserSID(aspID);

    Service.checkStatusSubscription(subscriptionId, (response) => {
      res.status(200).send(JSON.stringify({ 
        "response": response
      }));
      res.end();
    });


  })
; // /check_status_subscription/aspid

membershipsRouter.route('/update_subscription')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(jsonBodyParser, async (req, res, next ) => {

    cardInfo = req.body;
    console.log(cardInfo);

    Service.updateSubscription(cardInfo, (response) => {
      res.status(200).send(JSON.stringify({ 
        "response": response
      }));
      res.end();
    });


  })
; // /update_subscription

membershipsRouter.route('/get_subscription/sid')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(jsonBodyParser, async (req, res, next ) => {

    subscriptionId = req.body.subscriptionId;

    Service.getSubscription(subscriptionId, (response) => {
      res.status(200).send(JSON.stringify({ 
        "response": response
      }));
      res.end();
    });


  })
; // /get_subscription

membershipsRouter.route('/get_subscription/aspid')
  .all((req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  })
  .post(jsonBodyParser, async (req, res, next ) => {

    aspID = req.body.aspId;
    subscriptionId = await Service.checkUserSID(aspID);

    Service.getSubscription(subscriptionId, (response) => {
      res.status(200).send(JSON.stringify({ 
        "response": response
      }));
      res.end();
    });


  })
; // /check_status_subscription/aspid

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
