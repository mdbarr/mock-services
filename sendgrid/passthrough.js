'use strict';

const mailer = require('nodemailer');

function Passthrough (sendgrid) {
  const self = this;

  self.initTransport = function(passthrough) {
    passthrough.transport = mailer.createTransport({
      host: passthrough.host || 'smtp.sendgrid.net',
      port: passthrough.port || 587,
      secure: passthrough.secure !== undefined ? passthrough.secure : false,
      auth: {
        user: passthrough.username,
        pass: passthrough.password,
      },
    });
  };

  self.pass = function(message, passthrough) {
    if (!passthrough) {
      return false;
    }

    if (!passthrough.transport) {
      self.initTransport(passthrough);
    }

    if (Array.isArray(passthrough.whitelist) && passthrough.whitelist.length) {
      let found = false;
      for (const item of passthrough.whitelist) {
        if (message.to.includes(item)) {
          found = true;
          break;
        }
      }
      if (!found) {
        console.log('%s %s %s (%s)', sendgrid.util.colorize('yellow', 'PASSTHROUGH REJECTED'),
          message.id, message.to, 'whitelist');
        return false;
      }
    }

    if (Array.isArray(passthrough.blacklist)) {
      for (const item of passthrough.blacklist) {
        if (message.to.includes(item)) {
          console.log('%s %s %s (%s)', sendgrid.util.colorize('yellow', 'PASSTHROUGH REJECTED'),
            message.id, message.to, 'blacklist');
          return false;
        }
      }
    }

    const options = {
      from: `${ message.fromName || '' } <${ message.from }>`,
      to: `${ message.toName || '' } <${ passthrough.remap || message.to }>`,
      subject: message.subject,
      html: message.body,
    };

    passthrough.transport.sendMail(options, (error, info) => {
      console.log('%s %s %s %s', sendgrid.util.colorize('yellow', 'PASSTHROUGH SENT'),
        message.id, options.to, error ? error : info.response);
    });

    return true;
  };

  return self;
}

module.exports = function(sendgrid) {
  return new Passthrough(sendgrid);
};
