const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');

const cors = require("cors");

const membershipsRouter = require('./app/routes/memberships/membershipsRouter');
const hostname = process.env.APP_HOSTNAME;
const port = process.env.APP_PORT;

const app = express();


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
      console.log(`${origin} allowed by CORS`);
      return callback(null, true);
    } else {
      console.log(`${origin} is not allowed by CORS`);
      return callback(new Error("Not allowed by CORS"));
    } // if
  } // origin: function()
}; // corsOptions

app.use(express.static('public'));

//app.use(bodyParser.json());

//app.options('/memberships', cors(corsOptions)); // enable pre-flight request
app.use('/memberships', membershipsRouter);
//app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(`<html><body><h1>This is an Express server</h1></body></html>`);
});

const server = http.createServer(app);

server.listen(port, hostname, () => {
  console.log(`Sever running at http://${hostname}:${port}`);
});
