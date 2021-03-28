'use strict';

const MESSAGE_STATES = {
  NONE: 'none',
  RECEIVED: 'received',
  PROCESSED: 'processed',
  DROPPED: 'dropped',
  DELIVERED: 'delivered',
  BOUNCE: 'bounce',
  DEFERRED: 'deferred',
  OPEN: 'open',
  CLICK: 'click',
  UNSUBSCRIBE: 'unsubscribe',
  SPAM: 'spamreport',
};

function Messages (mock, sendgrid) {
  this.states = MESSAGE_STATES;

  this.message = function({
    user, ip, tls, to, toName, from, fromName,
    subject, body, messageId, timestamp, passthrough,
  }) {
    const id = `msg_${ sendgrid.store.generateId(24) }`;
    const message = {
      id,
      state: MESSAGE_STATES.RECEIVED,
      ip,
      tls,
      user: user || 'default',
      to: to || null,
      toName: toName || null,
      from: from || null,
      fromName: fromName || null,
      subject: subject || null,
      body: body || null,
      messageId: messageId || `<${ id }.${ from }>`,
      timestamp: timestamp || mock.utils.timestamp(),
      read: false,
      deleted: false,
    };

    sendgrid.store.addMessage(to, message);
    sendgrid.pipeline.processMessage(message);
    sendgrid.passthrough.pass(message, passthrough);

    return message;
  };
}

module.exports = (mock, sendgrid) => new Messages(mock, sendgrid);
