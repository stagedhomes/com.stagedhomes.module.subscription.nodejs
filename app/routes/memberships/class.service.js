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
  }



  // ================================================================
  /**
  * Create a subscription in the Authorize.net system
  */
  // ================================================================
  createSubscription = (callback) => {
    // Authenticate to authorize.net with our keys
    var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(authorizeNetKeys.apiLoginID);
    merchantAuthenticationType.setTransactionKey(authorizeNetKeys.transactionKey);

    var interval = new ApiContracts.PaymentScheduleType.Interval();
    interval.setLength(1);
    interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

    var paymentScheduleType = new ApiContracts.PaymentScheduleType();
    paymentScheduleType.setInterval(interval);
    paymentScheduleType.setStartDate(utils.getDate());
    paymentScheduleType.setTotalOccurrences(5);
    paymentScheduleType.setTrialOccurrences(0);

    var creditCard = new ApiContracts.CreditCardType();
    creditCard.setExpirationDate('2038-12');
    creditCard.setCardNumber('4111111111111111');

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
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setSubscription(arbSubscription);

    console.log(JSON.stringify(createRequest.getJSON(), null, 2));

    var ctrl = new ApiControllers.ARBCreateSubscriptionController(createRequest.getJSON());


    // this will then call the callback after its done
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

} // Service()

module.exports = new Service;
