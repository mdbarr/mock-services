'use strict';

const mailer = require('nodemailer');

function Passthrough (mock) {
  this.initTransport = (passthrough) => {
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

  this.pass = (message, passthrough) => {
    if (!passthrough) {
      return false;
    }

    if (!passthrough.transport) {
      this.initTransport(passthrough);
    }

    // Only allow specific to addresses if an allow list is defined
    if (Array.isArray(passthrough.allow) && passthrough.allow.length) {
      let found = false;
      for (const item of passthrough.allow) {
        if (message.to.includes(item)) {
          found = true;
          break;
        }
      }
      if (!found) {
        console.log('%s %s %s (%s)', mock.utils.colorize('yellow', 'PASSTHROUGH REJECTED'),
          message.id, message.to, 'allow');
        return false;
      }
    }

    // Always deny specific to addresses if a deny list is defined
    if (Array.isArray(passthrough.deny)) {
      for (const item of passthrough.deny) {
        if (message.to.includes(item)) {
          console.log('%s %s %s (%s)', mock.utils.colorize('yellow', 'PASSTHROUGH REJECTED'),
            message.id, message.to, 'deny');
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
      console.log('%s %s %s %s', mock.utils.colorize('yellow', 'PASSTHROUGH SENT'),
        message.id, options.to, error ? error : info.response);
    });

    return true;
  };
}

module.exports = (mock) => new Passthrough(mock);
