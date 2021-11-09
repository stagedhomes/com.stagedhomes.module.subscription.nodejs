// Functionality for all external communication
// ========
var nodemailer = require("nodemailer");


const smtpAccountInfo = require("./data/smtp-settings.json");
//console.log(smtpAccountInfo);

const smtpTransport = nodemailer.createTransport({
  host: smtpAccountInfo.host,
  port: 465,
  secure: true,
  auth: {
    user: smtpAccountInfo.id,
    pass: smtpAccountInfo.password
  }
});

// ================================================================
/**
 * The Service class is used for all the external communications,
 * to things, like the firestore.
 */
// ================================================================
class Mailer {
  constructor() {
  } //constructor

  async fnSendMail (strEmail_from = smtpAccountInfo.email, strEmail_replyTo, strEmail_to, strEmail_CC, strEmail_BCC, strEmail_subject, strMessage, isHTML) {
    // Email sender and contents.
    var mailOptions = {
      from: strEmail_from,
      to: strEmail_to,
      replyTo: strEmail_replyTo,
      subject: strEmail_subject
    }; // mailOptions

    // Determine if the email will be sent as HTML.
    if (isHTML) {
      // HTML Email
      mailOptions["html"] = strMessage;
    } else {
      // Text Email
      mailOptions["text"] = strMessage;
    } // if (isHTML)

    // Transport the email to the sender.
    smtpTransport.sendMail(mailOptions, (error, info) => {
      if (error) {
        // Failed | Do error algorithm here.
        console.log(`smtpTransport had an error trying to send email. The error: ${error}`);
      } else {
        // success | Do success algorithm here.
        console.log(`Email successfully sent to email: ${strEmail_to}.`);
      } // if
    }); // smtpTransport.sendMail
  } // fnSendEmail

} // Mailer()

module.exports = new Mailer;
