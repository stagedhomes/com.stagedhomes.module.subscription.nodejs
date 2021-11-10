// Functionality for all external communication
// ========
const authorizeNetKeys = require("../../utilities/data/authorizenet-keys.json");
const ApiContracts = require('authorizenet').APIContracts;
const ApiControllers = require('authorizenet').APIControllers;
const utils = require('../../utilities/utils.js');


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
  }



  // ================================================================
  /**
  * Create a subscription in the Authorize.net system
  */
  // ================================================================
  createSubscription = (cardInfo, callback) => {
    var interval = new ApiContracts.PaymentScheduleType.Interval();
    interval.setLength(1);
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
    customer.setId(utils.getRandomString('Id'));
    customer.setEmail(utils.getRandomInt()+'@test.anet.net');
    customer.setPhoneNumber('1232122122');
    customer.setFaxNumber('1232122122');
    customer.setTaxId('911011011');

    var nameAndAddressType = new ApiContracts.NameAndAddressType();
    nameAndAddressType.setFirstName(utils.getRandomString('FName'));
    nameAndAddressType.setLastName(utils.getRandomString('LName'));
    nameAndAddressType.setCompany(utils.getRandomString('Company'));
    nameAndAddressType.setAddress(utils.getRandomString('Address'));
    nameAndAddressType.setCity(utils.getRandomString('City'));
    nameAndAddressType.setState(utils.getRandomString('State'));
    nameAndAddressType.setZip('98004');
    nameAndAddressType.setCountry('USA');

    var arbSubscription = new ApiContracts.ARBSubscriptionType();
    arbSubscription.setName(utils.getRandomString('Name'));
    arbSubscription.setPaymentSchedule(paymentScheduleType);
    arbSubscription.setAmount(utils.getRandomAmount());
    arbSubscription.setTrialAmount(utils.getRandomAmount());
    arbSubscription.setPayment(payment);
    arbSubscription.setOrder(orderType);
    arbSubscription.setCustomer(customer);
    arbSubscription.setBillTo(nameAndAddressType);
    arbSubscription.setShipTo(nameAndAddressType);

    var createRequest = new ApiContracts.ARBCreateSubscriptionRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setSubscription(arbSubscription);

    console.log(JSON.stringify(createRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.ARBCreateSubscriptionController(createRequest.getJSON());


    // this will then call the callback after its done
    // not sure it is worth trying to convert their API's callbacks to promise.
    ctrl.execute(function(){

      var apiResponse = ctrl.getResponse();

      var response = new ApiContracts.ARBCreateSubscriptionResponse(apiResponse);

      console.log(JSON.stringify(response, null, 2));

      if(response != null){
        if(response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK){
          console.log('Subscription Id : ' + response.getSubscriptionId());
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

  }

  // ================================================================
  /**
  * Get list of subscriptions in the Authorize.net system
  */
  // ================================================================
  getListSubscriptions = (info, callback) => {
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
  cancelSubscription = (subscriptionId, callback) => {
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

} // Service()

module.exports = new Service;
