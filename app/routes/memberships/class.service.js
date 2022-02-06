// Functionality for all external communication
// ========
const authorizeNetKeys = require("../../utilities/data/authorizenet-keys.json");
const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;
const utils = require('../../utilities/utils.js');
const mysql = require('mysql2/promise');



//const Mailer = require('../../utilities/class.sendmail');


// ================================================================
/**
 * The Service class is used for all the external communications,
 * to things, like the firestore.
 */
// ================================================================
class Service {
  constructor() {
    // Authenticate to authorize.net with our keys
    this.merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    this.merchantAuthenticationType.setName(authorizeNetKeys.apiLoginID);
    this.merchantAuthenticationType.setTransactionKey(authorizeNetKeys.transactionKey);
    this.subscriptionAmount = 0;
    this.trialAmount = 0;
    this.intervalLength = 0;
  }



  // ================================================================
  /**
  * Create a subscription in the Authorize.net system
  */
  // ================================================================
  async createSubscription (cardInfo, callback) {

    // set the dollar amount of the subscription
    console.log('received cardInfo:');
    console.log(cardInfo);
    const subType = cardInfo.subType;
    switch (subType.toLowerCase()) {
      case 'asp':
        this.subscriptionAmount = 100;
        this.trialAmount = 100;
        this.intervalLength = 12;
        break;
      default:
        this.subscriptionAmount = 100;
        this.trialAmount = 100;
        this.intervalLength = 12;
    }


    var interval = new ApiContracts.PaymentScheduleType.Interval();
    interval.setLength(this.intervalLength);
    interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

    var paymentScheduleType = new ApiContracts.PaymentScheduleType();
    paymentScheduleType.setInterval(interval);
    paymentScheduleType.setStartDate(utils.getDate());
    paymentScheduleType.setTotalOccurrences(5);
    paymentScheduleType.setTrialOccurrences(0);

    var creditCard = new ApiContracts.CreditCardType();
    //creditCard.setExpirationDate('2038-12');
    creditCard.setExpirationDate(cardInfo.expirationDate);
    //creditCard.setCardNumber('4111111111111111');
    creditCard.setCardNumber(cardInfo.cardNumber);

    var payment = new ApiContracts.PaymentType();
    payment.setCreditCard(creditCard);

    var orderType = new ApiContracts.OrderType();
    orderType.setInvoiceNumber(utils.getRandomString('Inv:')); 
    orderType.setDescription(utils.getRandomString('Description'));

    var customer = new ApiContracts.CustomerType();
    customer.setType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
    // customer.setId(utils.getRandomString('Id'));
    customer.setEmail(cardInfo.email);
    //customer.setPhoneNumber(cardInfo.phone);
    //customer.setFaxNumber('1232122122');
    //customer.setTaxId('911011011');

    var nameAndAddressType = new ApiContracts.NameAndAddressType();
    nameAndAddressType.setFirstName(cardInfo.firstName);
    nameAndAddressType.setLastName(cardInfo.lastName);
    //nameAndAddressType.setCompany(utils.getRandomString('Company'));
    nameAndAddressType.setAddress(cardInfo.address);
    nameAndAddressType.setCity(cardInfo.city);
    nameAndAddressType.setState(cardInfo.state);
    nameAndAddressType.setZip(cardInfo.zip);
    nameAndAddressType.setCountry(cardInfo.country);

    var arbSubscription = new ApiContracts.ARBSubscriptionType();
    arbSubscription.setName(`${cardInfo.firstName} ${cardInfo.lastName}`);
    arbSubscription.setPaymentSchedule(paymentScheduleType);
    arbSubscription.setAmount(this.subscriptionAmount);
    arbSubscription.setTrialAmount(this.trialAmount);
    arbSubscription.setPayment(payment);
    arbSubscription.setOrder(orderType);
    arbSubscription.setCustomer(customer);
    arbSubscription.setBillTo(nameAndAddressType);
    //arbSubscription.setShipTo(nameAndAddressType);

    var createRequest = new ApiContracts.ARBCreateSubscriptionRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setSubscription(arbSubscription);

    console.log(JSON.stringify(createRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.ARBCreateSubscriptionController(createRequest.getJSON());


    // this will then call the callback after its done
    // not sure it is worth trying to convert their API's callbacks to promise.
    ctrl.execute(async function(){

      var apiResponse = ctrl.getResponse();

      var response = new ApiContracts.ARBCreateSubscriptionResponse(apiResponse);

      console.log(JSON.stringify(response, null, 2));

      if(response != null){
        if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
          const aspID = cardInfo.aspID;
          const subID = response.getSubscriptionId();

          const subStatus = 'active';

          const subType = cardInfo.subType;
          let subInterval = '';
          switch (subType.toLowerCase()) {
            case 'asp':
              subInterval = 12;
              break;
            default:
              subInterval = 12;
          }


          // get today's date
          const today = new Date();
          const dd = String(today.getDate()).padStart(2, '0');
          const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
          const yyyy = today.getFullYear();
          const creationDate = `${yyyy}-${mm}-${dd}`;

          const custProfileID = response.profile.customerProfileId;
          const custPaymentProfileID = response.profile.customerPaymentProfileId;
          const custAddressID = response.profile.customerAddressId;

          // becuase of the way things get passed to the router, I need to use
          // Service.writeIDsToDB instead of this.writeIDsToDB ...
          // it's weird, but I guess this particular function is getting referenced by
          // the router.  more info here:
          // https://stackoverflow.com/questions/45643005/why-is-this-undefined-in-this-class-method
          // expected values: (aspID, subID, subStatus, subInterval, creationDate, custProfileID, custPaymentProfileID, custAddressID)
          await Service.writeIDsToDB(aspID, subID, subStatus, subInterval, creationDate, custProfileID, custPaymentProfileID, custAddressID);

          // const custProfileID = response.get
          console.log('Subscription Id : ' + response.getSubscriptionId());
          console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
          console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());
          // console.log('raw response : ' + response.profile.customerProfileId);

        }
        else{
          console.log('Result Code: ' + response.getMessages().getResultCode());
          console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
          console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
        }
      }
      else{
        console.log('Null Response.');
      }



      callback(response);
    });

  }

  // ================================================================
  /**
  * Check if the user already has a subscription ID saved in db
  */
  // ================================================================
  async checkUserSID (uid) {
    // create the mysql connection
    const con = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // console.log(`connection creds: host: ${process.env.DB_HOST} user: ${process.env.DB_USER} pw: ${process.env.DB_PASSWORD} db: ${process.env.DB_NAME}`);

    let sql = `SELECT sub_id FROM authorizenet_subs WHERE aspid='${uid}';`;
    let success = false;
    
    // await con.query({sql: sql, rowsAsArray: true })
    //   .then((data1, data2) => {
    //     console.log('data1');
    //     console.log(data1);
    //     console.log('data2');
    //     console.log(data2);
    //   })
    //   .catch((err) => {
    //     console.log('error with the sql query...');
    //     console.log(err);
    //   });

    if (uid !== "") {
      try {
        // console.log(`about to try SQL: ${sql}`);
        const [resultRows, resultFields] = await con.query({sql: sql, rowsAsArray: true });
        if ( (resultRows[0][0] !== null) && (resultRows[0][0] !== '') ) {
          // sid exists
          console.log('sid exists: ' + resultRows[0][0].toString());
          return resultRows[0][0];
        } else {
          // sid empty
          console.log('sid empty');
          return false;
        }
      } catch (err) {
        console.log(`query failed due to error:`);
        console.log(err);
        return false;
      }
    }
  }

  // ================================================================
  /**
  * Write the different IDs to the user in the db
  */
  // ================================================================
  static async writeIDsToDB (aspID, subID, subStatus, subInterval, creationDate, custProfileID, custPaymentProfileID, custAddressID) {
    let success = false;

    // create the mysql connection
    const con = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    let sql = '';

    if (aspID !== "") {
      // console.log('aspID, is def not empty! lol');
      // console.log(aspID);
      // sql = `UPDATE asps SET sid='${subID}', customer_pid='${custProfileID}', customer_ppid='${custPaymentProfileID}', customer_aid='${custAddressID}' WHERE uid='${aspID}'`;
      sql = `INSERT INTO authorizenet_subs 
      (aspid, sub_id, sub_status, sub_interval, creation_date, customer_pid, customer_ppid, customer_aid)
      VALUES('${aspID}', '${subID}', '${subStatus}', '${subInterval}', '${creationDate}', '${custProfileID}', '${custPaymentProfileID}', '${custAddressID}')
      ON DUPLICATE KEY UPDATE    
      sub_id=VALUES(sub_id), sub_status=VALUES(sub_status), sub_interval=VALUES(sub_interval), creation_date=VALUES(creation_date), customer_pid=VALUES(customer_pid), customer_ppid=VALUES(customer_ppid), customer_aid=VALUES(customer_aid);`;
      
      // // write data to db
      const updateResult = await con.execute(sql);
      return updateResult;
      // console.log("sql insert result: ");
      // console.log(updateResult);
      // success = true;

    } // if
  }

  // ================================================================
  /**
  * Get list of subscriptions in the Authorize.net system
  */
  // ================================================================
  getListSubscriptions (info, callback) {
    var refId = utils.getRandomInt();

    var sorting = new ApiContracts.ARBGetSubscriptionListSorting();
    sorting.setOrderDescending(true);
    sorting.setOrderBy(ApiContracts.ARBGetSubscriptionListOrderFieldEnum.CREATETIMESTAMPUTC);

    var paging = new ApiContracts.Paging();
    paging.setOffset(1);
    paging.setLimit(100);

    var listRequest = new ApiContracts.ARBGetSubscriptionListRequest();

    listRequest.setMerchantAuthentication(this.merchantAuthenticationType);

    listRequest.setRefId(refId);
    listRequest.setSearchType(ApiContracts.ARBGetSubscriptionListSearchTypeEnum.SUBSCRIPTIONACTIVE);
    listRequest.setSorting(sorting);
    listRequest.setPaging(paging);

    console.log(JSON.stringify(listRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.ARBGetSubscriptionListController(listRequest.getJSON());

    ctrl.execute(function(){
      var apiResponse = ctrl.getResponse();

      var response = new ApiContracts.ARBGetSubscriptionListResponse(apiResponse);

      console.log(JSON.stringify(response, null, 2));

      if(response != null){
        if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
          console.log('Total Results: ' + response.getTotalNumInResultSet());
          console.log('List of Subscription IDs: ');
          var subscriptions = response.getSubscriptionDetails().getSubscriptionDetail();
          for (var i=0;i<subscriptions.length;i++)
          {
            console.log(subscriptions[i].getId());
          }
          console.log('Message Code: ' + response.getMessages().getMessage()[0].getCode());
          console.log('Message Text: ' + response.getMessages().getMessage()[0].getText());
        }
        else{
          console.log('Result Code: ' + response.getMessages().getResultCode());
          console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
          console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
        }
      }
      else{
        console.log('Null Response.');
      }



      callback(response);
    });
  } // getListSubscriptions

  // ================================================================
  /**
  * Cancel a subscription in the Authorize.net system
  */
  // ================================================================
  cancelSubscription (subscriptionId, callback) {
    const cancelRequest = new ApiContracts.ARBCancelSubscriptionRequest();
    cancelRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    cancelRequest.setSubscriptionId(subscriptionId);

    console.log(JSON.stringify(cancelRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.ARBCancelSubscriptionController(cancelRequest.getJSON());

    ctrl.execute(function(){

      var apiResponse = ctrl.getResponse();

      var response = new ApiContracts.ARBCancelSubscriptionResponse(apiResponse);

      console.log(JSON.stringify(response, null, 2));

      if(response != null){
        if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
          console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
          console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());
        }
        else{
          console.log('Result Code: ' + response.getMessages().getResultCode());
          console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
          console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
        }
      }
      else{
        console.log('Null Response.');
      }

      callback(response);
    });
  } // cancelSubscription

  // ================================================================
  /**
  * Check the status of  a subscription in the Authorize.net system
  * Return: status: (active | expired | suspended | canceled | terminated)
  */
  // ================================================================
  checkStatusSubscription (subscriptionId, callback) {
    var getRequest = new ApiContracts.ARBGetSubscriptionStatusRequest();
    getRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    getRequest.setSubscriptionId(subscriptionId);

    console.log(JSON.stringify(getRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.ARBGetSubscriptionStatusController(getRequest.getJSON());

    ctrl.execute(function(){
      var apiResponse = ctrl.getResponse();

      var response = new ApiContracts.ARBGetSubscriptionStatusResponse(apiResponse);

      console.log(JSON.stringify(response, null, 2));

      if(response != null){
        if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
          console.log('Status : ' + response.getStatus());
          console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
          console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());
        }
        else{
          console.log('Result Code: ' + response.getMessages().getResultCode());
          console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
          console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
        }
      }
      else{
        console.log('Null Response.');
      }

      callback(response);
    });
  } // cancelSubscription

  // ================================================================
  /**
  * Update the user's credit card info
  * Return: some kind of response...
  */
  // ================================================================
  async updateSubscription (cardInfo, callback) {
    let subscriptionId = '';
    if (!cardInfo.subscriptionId) {
      subscriptionId = await this.checkUserSID(cardInfo.aspID);
    } else {
      subscriptionId = cardInfo.subscriptionId;
    }



    //var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    //merchantAuthenticationType.setName(constants.apiLoginKey);
    //merchantAuthenticationType.setTransactionKey(constants.transactionKey);

    var orderType = new ApiContracts.OrderType();
    orderType.setInvoiceNumber(utils.getRandomString('Inv:')); 
    orderType.setDescription(utils.getRandomString('Description'));

    var creditCard = new ApiContracts.CreditCardType();
    creditCard.setExpirationDate(cardInfo.expirationDate);
    creditCard.setCardNumber(cardInfo.cardNumber);

    var payment = new ApiContracts.PaymentType();
    payment.setCreditCard(creditCard);

    var nameAndAddressType = new ApiContracts.NameAndAddressType();
    nameAndAddressType.setFirstName(cardInfo.firstName);
    nameAndAddressType.setLastName(cardInfo.lastName);
    nameAndAddressType.setAddress(cardInfo.address);
    nameAndAddressType.setCity(cardInfo.city);
    nameAndAddressType.setState(cardInfo.state);
    nameAndAddressType.setZip(cardInfo.zip);
    nameAndAddressType.setCountry(cardInfo.country);
    var arbSubscriptionType = new ApiContracts.ARBSubscriptionType();
    arbSubscriptionType.setOrder(orderType);
    arbSubscriptionType.setBillTo(nameAndAddressType);
    arbSubscriptionType.setPayment(payment);

    var updateRequest = new ApiContracts.ARBUpdateSubscriptionRequest();
    updateRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    updateRequest.setSubscriptionId(subscriptionId);
    updateRequest.setSubscription(arbSubscriptionType);


    console.log(JSON.stringify(updateRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.ARBUpdateSubscriptionController(updateRequest.getJSON());

    ctrl.execute(function(){

      var apiResponse = ctrl.getResponse();

      var response = new ApiContracts.ARBUpdateSubscriptionResponse(apiResponse);

      console.log(JSON.stringify(response, null, 2));

      if(response != null){
        if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
          console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
          console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());
        }
        else{
          console.log('Result Code: ' + response.getMessages().getResultCode());
          console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
          console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
        }
      }
      else{
        console.log('Null Response.');
      }

      callback(response);
    });
  } // updateSubscription

  getSubscription (subscriptionId, callback) {

    var getRequest = new ApiContracts.ARBGetSubscriptionRequest();
    getRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    getRequest.setSubscriptionId(subscriptionId);

    console.log(JSON.stringify(getRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.ARBGetSubscriptionController(getRequest.getJSON());

    ctrl.execute(function(){
      var apiResponse = ctrl.getResponse();

      var response = new ApiContracts.ARBGetSubscriptionResponse(apiResponse);

      console.log(JSON.stringify(response, null, 2));

      if(response != null){
        if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
          console.log('Subscription Name : ' + response.getSubscription().getName());
          console.log('Message Code : ' + response.getMessages().getMessage()[0].getCode());
          console.log('Message Text : ' + response.getMessages().getMessage()[0].getText());
        }
        else{
          console.log('Result Code: ' + response.getMessages().getResultCode());
          console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
          console.log('Error message: ' + response.getMessages().getMessage()[0].getText());
        }
      }
      else{
        console.log('Null Response.');
      }


      callback(response);
    });
  } // /getSubscription


} // Service()

module.exports = new Service;
