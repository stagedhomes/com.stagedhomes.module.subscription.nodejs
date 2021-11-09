// Functionality for all external communication
// ========
var stripeKeys = require("../../utilities/data/stripe-keys.json");
var serviceAccount = require("../../utilities/data/firebase-service-account-key.json");
var otherSecrets  = require("../../utilities/data/other-secrets.json");

const admin = require("firebase-admin");
const stripe = require('stripe')(stripeKeys.secret_key);

const Mailer = require('../../utilities/class.sendmail');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: otherSecrets.database_url
});


// ================================================================
/**
 * The Service class is used for all the external communications,
 * to things, like the firestore.
 */
// ================================================================
class Service {
  constructor() {
    this.db = admin.firestore();
    this.currentError = "gabe";
    this.bucket = admin.storage().bucket("iahsp-europe.appspot.com" );
  }

  getCurrentError() {
    return this.currentError;
  }

  async uploadFile(fileNameWithPath, fileName) {
    // Uploads a local file to the bucket
    console.log(`uploadFile: Will now attempt to send ${fileNameWithPath} to fire storage bucket.`);
    return await this.bucket.upload(fileNameWithPath, {
      // Support for HTTP requests made with `Accept-Encoding: gzip`
      gzip: true,
      // By setting the option `destination`, you can change the name of the
      // object you are uploading to a bucket.
      destination: fileName,
      public: true,
      metadata: {
        // Enable long-lived HTTP caching headers
        // Use only if the contents of the file will never change
        // (If the contents will change, use cacheControl: 'no-cache')
        cacheControl: 'public, max-age=31536000',
      },
    });
  }

  async updateFileField(theUID, fieldName, fileName) {
    const usersRef = this.db.collection('users');
    return await usersRef.doc(theUID).update({
      [fieldName] : fileName
    });
  }

  // ================================================================
    /**
    * Set User's isApproved field to true
    *
    * @param   theUID  the document ID that belongs to this user.
    * @return          true on successful update of db, false on error.
    */
  // ================================================================
  async setUserApproved(theUID){
    let status = null;
    //console.log(`UID to be updated is: ${theUID}`);
    const usersRef = this.db.collection('users');
    const currentData = await usersRef.doc(theUID).get();
    const currentUserEmail = currentData.data().email;

    const firstName = currentData.data().firstName;

    try {
      //NOTE!  using .set() will override everything
      //       using .update() will update only the fields provided,
      //       while the rest of the fields stay intact.
      status = await usersRef.doc(theUID).update({
        "isApproved" : true
      });
    } catch (err) {
      status = false;
      console.log(`Unable to update document: '${theUID}' because of error:  ${err}`);
    }

    if (status !== false) {
      // approval worked, so lets send email notification now...
      const strEmailSubject = `Your Membership Application has been approved`;
      const strEmailMessage = `
        Hello ${firstName},<br/>
        We would like to inform you that your Membership Application has been <b>approved</b>. In order to start benefiting from your membership, please complete your registration and make a payment <a href="https://members.iahspeurope.com/">here</a>.
        <br/>
        <br/>
        Best regards from your IAHSP Europe Team

      `;
      Mailer.fnSendMail("info@iahspeurope.com", "info@iahspeurope.com", currentUserEmail, "", "", strEmailSubject, strEmailMessage, true);
    }

    return status;
  } // setUserApproved()

  // ================================================================
    /**
    * Decline the User, and remove their data.
    *
    * @param   theUID  the document ID that belongs to this user.
    * @return          true on successful update of db, false on error.
    */
  // ================================================================
  async setUserDeclined(theUID, theReason, theNotes){
    const usersRef = this.db.collection('users');

    // lets first retrieve the users doc so we can get the milliToken from it.
    const currentData = await usersRef.doc(theUID).get();
    const currentToken = currentData.data().milliToken;
    const currentUserEmail = currentData.data().email;

    const firstName = currentData.data().firstName;

    let status = null;

    try {
      //NOTE!  using .set() will override everything
      //       using .update() will update only the fields provided,
      //       while the rest of the fields stay intact.
      status = await usersRef.doc(theUID).delete();
      console.log(`Document for: ${theUID} has been successully deleted.`);
    } catch (err) {
      status = false;
      console.log(`Unable to remove document: '${theUID}' because of error:  ${err}`);
    }

    status =  this.bucket.deleteFiles({
      prefix: `${currentToken}/`
    }, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log(`All the Firebase Storage files in /${currentToken}/ have been deleted.`);
      }
    });

    try {
      status = await admin.auth().deleteUser(theUID);
      console.log(`User: ${theUID} has been successully deleted.`);
    } catch(err) {
      status = false;
      console.log(`Unable to deleteUser: '${theUID}' because of error:  ${err}`);
    }

    console.log(`theReason: ${theReason}, theNotes: ${theNotes}`);
    let reasonTxt = "";
    switch(theReason) {
      case "reason001":
        reasonTxt = 'Sorry, your application to IAHSP Europe has been declined, due to reason 001.';
        break;
      case "reason002":
        reasonTxt = 'Sorry, your application to IAHSP Europe has been declined, due to reason 002.';
        break;
      case "reason003":
        reasonTxt = 'Sorry, your application to IAHSP Europe has been declined, due to reason 003.';
        break;
      case "reason004":
        reasonTxt = 'Sorry, your application to IAHSP Europe has been declined, due to reason 004.';
        break;
      default:
        reasonTxt = `
          Hello ${firstName},<br/>
          We regret to inform you that your membership application has been <b>declined for the following reason:</b>
        `;
    }

    let notesTxt = theNotes;
    // using regex so that it will do a global replace, instead of just the 1st one...
    notesTxt = notesTxt.replace(/(\r\n|\n|\r)/g,"<br />");

    if (status !== false) {
      // all the things worked, so we can send an email to the user
      // that they got declined.
      const strEmailSubject = `Your membership application has been declined`;
      const strEmailMessage = `
        ${reasonTxt}<br/>
        <br/>
        ${notesTxt}
        <br/>
        <br/>
        Kind regards
      `;
      Mailer.fnSendMail("info@iahspeurope.com", "info@iahspeurope.com", currentUserEmail, "", "", strEmailSubject, strEmailMessage, true);
    }


    return status;
  } // setUserDeclined()

  // ================================================================
  /**
  * Retrieve a JSON list of users who's isApproved field is false;
  *
  * @return          JSON list of users.
  */
  // ================================================================
  async getUnapprovedUsers(){
    const usersRef = this.db.collection('users');
    let payload = {};

    try {
      const unapprovedUsers = await usersRef.where('isApproved', '==', false).get();
      unapprovedUsers.forEach(doc => {
        //running thru a foreach so we can deliver cleaned data.
        //the raw data had too much info in it, including the key
        //console.log(doc.id, '=>', doc.data());
        payload[doc.id] = doc.data();
      });
    } catch(err) {
      console.log(`Unable to grab unapprovedUsers from firestore because error: ${err}`);
      return "Error retrieving documents.";
    }
    return payload;
  } // getUnapprovedUsers()

  // ================================================================
  /**
  * Create a new user in the db, and set the fields
  *
  * @param userData  JSON obj containing the user info
  * @return          true on success, false on failure;
  */
  // ================================================================
  async createNewUser(userData, createdByAdmin = false) {
    let userID = false;
    let setDoc = null;
    let isSuccess = false;
    let finalResults = {
      "status" : false,
      "payload" : null
    };


    const strPhotoURL = (createdByAdmin === true) ? userData.photoURL : `https://upload.wikimedia.org/wikipedia/en/b/b1/Portrait_placeholder.png`;
    //console.log(`strPhotoURL: ${strPhotoURL}`);

    //using this as a default date, to speicy after they have been approved, that they still
    //still need to pay for registration
    const strDefaultExpiration = "0000-00-00";

    //create the new user
    return await admin.auth().createUser({
      email: userData.email,
      emailVerified: false,
      password: (createdByAdmin === true) ? `${userData.milliToken}${userData.milliToken}` : userData.password,
      displayName: userData.firstName + " " + userData.lastName,
      photoURL: strPhotoURL,
      disabled: false
    })
      .then(async (userRecord) => {
        //console.log(`userRecord is this: ${userRecord}`);
        if (userRecord) {
          //user creation wroked
          userID = userRecord.uid;
          console.log("Successfully created new user: " + userID);


          const usersRef = this.db.collection('users');
          setDoc = await usersRef.doc(userRecord.uid).set({
            displayName: (createdByAdmin === true) ? userData.displayName : userRecord.displayName,
            email: (createdByAdmin === true) ? userData.email : userRecord.email,
            photoURL : strPhotoURL,

            // Additional meta.
            milliToken: userData.milliToken,
            photosWorkExampleCount: userData.photosWorkExampleCount,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            vatNumber: userData.vatNumber,
            address1: userData.address1,
            address2: userData.address2,
            city: userData.city,
            // state: userData.strContactState,
            zip: userData.zip,
            countryCustom: userData.country,
            country: userData.country,
            isAdmin: (createdByAdmin === true) ? userData.isAdmin : false,
            isDisabled: (createdByAdmin === true) ? userData.isDisabled : userRecord.disabled,
            isApproved: (createdByAdmin === true) ? userData.isApproved : false,
            expiration: userData.expiration,
            euHomeStagingCourse: userData.euHomeStagingCourse,
            description: userData.description,

            showPhone: false,


            businessName: userData.businessName,
            businessEmail: userData.businessEmail,
            urlWeb: userData.urlWeb,
            urlLinkedIn: userData.urlLinkedIn,
            urlFacebook: userData.urlFacebook,
            urlInstagram: userData.urlInstagram,
            urlPinterest: userData.urlPinterest,
            dob: userData.dob,
            euAffilicatedAssociation: userData.euAffilicatedAssociation,
            checkboxEthicsCode: userData.checkboxEthicsCode,
            checkboxStatue: userData.checkboxStatue,
            checkboxTermsConditions: userData.checkboxTermsConditions,
            checkboxPrivacyPolicy: userData.checkboxPrivacyPolicy,
            txtHowFoundUs: userData.txtHowFoundUs,
            txtYearsInBusiness: userData.txtYearsInBusiness,
            initialSignUp: userData.initialSignUp,

            // ASP Info
            isASP: false,
            aspid: null
          });

          isSuccess = true;

          finalResults['status'] = isSuccess;
          finalResults['payload'] = userID;

          return finalResults;
        } else {
          //user creation gracefully failed
          //console.log(`the .then was executed even though the user was not created...`);
          finalResults['status'] = false;
          finalResults['payload'] = null;
          return finalResults;
        }
      })
      .catch((err) => {
        this.currentError = `Error creating User, because: ${err}`;
        console.log(this.currentError);
        finalResults['status'] = false;
        finalResults['payload'] = this.currentError;
        return finalResults;
      }); // admin.auth().createUser()

  //return {
    //"status" : true,
    //"payload" : userID
  //}

  } // createNewUser()

  // ================================================================
  /**
  * Retrieve a JSON list of users who's isApproved field is false;
  *
  * @return          JSON list of users.
  */
  // ================================================================
  async chargeCreditCard(userCardInfo){
    let success = false;
    let token = null;
    let tokenID = null;
    let tokenError = "";
    let charge = null;
    let chargeID = null;
    let chargeError = "";

    let finalResults = {
      "status" : false,
      "payload" : null
    };

    try{
      token = await stripe.tokens.create({
        card: {
          number: userCardInfo.strBillingCardNum,
          exp_month: userCardInfo.strBillingMonth,
          exp_year: userCardInfo.strBillingYear,
          cvc: userCardInfo.strBillingSecurityCode,
          name: `${userCardInfo.strBillingFirstName} ${userCardInfo.strBillingLastName}`,
          address_line1: userCardInfo.strBillingStreet,
          address_city: userCardInfo.strBillingCity,
          address_state: userCardInfo.strBillingState,
          address_zip: userCardInfo.strBillingZip,
          address_country: userCardInfo.strBillingCountry
        },
      });
    } catch (err) {
      tokenError = err.message;
      console.log(`Error creating token for credit card.  The error is: ${err}`);
      console.log(tokenError);
    }
    // if token isset
    if (tokenError === "") {
      console.log(`Token successfully created: ${token}`);
      success = true;
      tokenID = token.id;
    } else {
      success = false;
      tokenID = "error";
    }

    if (success === true) {
      //console.log('successfully entered charge section');

      try {
        success = false;
        charge = await stripe.charges.create({
          amount: `${userCardInfo.strFinalPrice}00`,
          currency: 'eur',
          source: tokenID,
          description: 'IAHSP Europe Membership',
        });
      } catch(err) {
        success = false;
        chargeError = err.message;
        console.log(`Could not charge credit card, because of error: ${err}`);
      }

      // if charge isset, we set to null up top
      if (charge !== null) {
        success = true;
        chargeID = charge.id;
      } else {
        success = false;
        charge = null;
        chargeID = "error";
      }
    }

    finalResults['status'] = success;
    finalResults['payload'] = {
      token: tokenID,
      charge: chargeID,
      tokenMessage: tokenError,
      chargeMessage: chargeError
    };

    return finalResults;
  } // chargeCreditCard()

  // ================================================================
    /**
    * Send agent an email from contact modal form
    *
    * @param   allTheData JSON package being sent from angular
    * @return          true on successful update of db, false on error.
    */
  // ================================================================
  async contactFormEmailSend(data){
    let status = null;

    const currentUserEmail = data.iahspEmail;

    console.log(`Sending email to ${currentUserEmail}`);



    const strEmailSubject = `IAHSP Directory | ${data.subject}`;
    const strEmailMessage = `
      You have recieved a message sent from the IAHSP Europe Member Directory contact form.<br/>
      <br/>
      Full Name: ${data.fullName}<br/>
      Email (From): ${data.email}<br/>
      Subject: ${data.subject}<br/>
      <br/>
      <br/>
      <br/>
      Message:<br/>
      <pre>${data.message}</pre>

    `;
    try {
      await Mailer.fnSendMail("info@iahspeurope.com", "info@iahspeurope.com", currentUserEmail, "", "", strEmailSubject, strEmailMessage, true);
      status = true;
    } catch (err) {
      console.log(`Error trying to send email: ${err}`);
      status = false;
    }

    return status;
  } // setUserApproved()

  async deleteTheUser(theUID){
    const usersRef = this.db.collection('users');

    // lets first retrieve the users doc so we can get the milliToken from it.
    const currentData = await usersRef.doc(theUID).get();
    const currentToken = currentData.data().milliToken;
    const currentUserEmail = currentData.data().email;

    const firstName = currentData.data().firstName;

    let status = null;

    try {
      //NOTE!  using .set() will override everything
      //       using .update() will update only the fields provided,
      //       while the rest of the fields stay intact.
      status = await usersRef.doc(theUID).delete();
      console.log(`Document for: ${theUID} has been successully deleted.`);
    } catch (err) {
      status = false;
      console.log(`Unable to remove document: '${theUID}' because of error:  ${err}`);
    }

    status =  this.bucket.deleteFiles({
      prefix: `${currentToken}/`
    }, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log(`All the Firebase Storage files in /${currentToken}/ have been deleted.`);
      }
    });

    try {
      status = await admin.auth().deleteUser(theUID);
      console.log(`User: ${theUID} has been successully deleted.`);
    } catch(err) {
      status = false;
      console.log(`Unable to deleteUser: '${theUID}' because of error:  ${err}`);
    }

    return status;
  } // deleteTheUser()

} // Service()

module.exports = new Service;
