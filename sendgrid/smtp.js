'use strict';

const SMTPServer = require('smtp-server').SMTPServer;
const simpleParser = require('mailparser').simpleParser;

function SMTP (mock, sendgrid) {
  //////////////////////////////////////////////////

  this.connect = (session, callback) => {
    callback(null);
  };

  this.auth = (auth, session, callback) => {
    for (const user of sendgrid.store.getUsers()) {
      if (auth.username === user.username) {
        if (!user.password || auth.password === user.password) {
          return callback(null, { user });
        }
        return callback(new Error('Invalid username or password'));
      }
    }
    return callback(new Error('Invalid username or password'));
  };

  this.mailFrom = (address, session, callback) => {
    callback(null);
  };

  this.rcptTo = (address, session, callback) => {
    callback(null);
  };

  this.message = (session, message, callback) => {
    sendgrid.messages.message({
      user: session.user.name,
      ip: session.remoteAddress,
      tls: session.secure,
      to: message.to.value[0].address,
      toName: message.to.value[0].name,
      from: message.from.value[0].address,
      fromName: message.from.value[0].name,
      subject: message.subject,
      body: message.html || message.text,
      messageId: message.messageId,
      passthrough: session.user.passthrough,
    });

    callback(null);
  };

  this.data = (stream, session, callback) => {
    simpleParser(stream, (err, message) => {
      if (err) {
        return callback(err);
      }
      return this.message(session, message, callback);
    });
  };

  //////////////////////////////////////////////////

  sendgrid.smtpServer = new SMTPServer({
    name: `${ sendgrid.config.name } SMTP Server`,
    authOptional: sendgrid.config.allowUnauthorized,
    allowInsecureAuth: true,
    disableReverseLookup: true,
    onAuth: this.auth,
    onConnect: this.connect,
    onMailFrom: this.mailFrom,
    onRcptTo: this.rcptTo,
    onData: this.data,
  });

  this.start = (callback) => {
    sendgrid.smtpServer.listen(sendgrid.config.smtpPort, mock.config.host, (error) => {
      if (error) {
        return callback(error);
      }
      sendgrid.log.info(`Mock Sendgrid SMTP Server running on smtp://${ mock.config.host }:${ sendgrid.config.smtpPort }`);

      return callback();
    });
  };
}

module.exports = (mock, sendgrid) => new SMTP(mock, sendgrid);
