// Functionality for all external communication
// ========
var authorizeNetKeys = require("../../utilities/data/authorizenet-keys.json");
const ApiContracts = require('authorizenet').APIContracts;

// Authenticate to authorize.net with our keys
var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
merchantAuthenticationType.setName(authorizeNetKeys.api_login_id);
merchantAuthenticationType.setTransactionKey(authorizeNetKeys.transaction_key);

const Mailer = require('../../utilities/class.sendmail');


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
  * Retrieve a JSON list of users who's isApproved field is false;
  *
  * @return          JSON list of users.
  */
  // ================================================================
  async chargeCreditCard(userCardInfo){
  } // chargeCreditCard()


} // Service()

module.exports = new Service;
