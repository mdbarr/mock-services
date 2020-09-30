'use strict';

const async = require('async');
const request = require('request');

function Webhooks (mock, sendgrid) {
  const queue = async.queue((options, next) => request(options, (error, response) => {
    if (!sendgrid.options.silent) {
      console.log('%s [%s/%s]: %s', mock.utils.colorize('blue', 'WEBHOOK'), response.statusCode, options.body[0].event, error || options.body[0].sg_message_id);
    }

    if (sendgrid.config.webhooks.delay) {
      return setTimeout(() => next(), sendgrid.config.webhooks.delay);
    }
    return next();
  }), sendgrid.config.webhooks.concurrency);

  this.event = (message) => {
    const event = {
      sg_message_id: message.id,
      email: message.to,
      timestamp: message.timestamp,
      'smtp-id': message.messageId,
      event: message.state,
    };
    return event;
  };

  this.sendEvents = (webhook, events) => {
    const options = {
      body: events,
      json: true,
      method: 'POST',
      url: webhook.url,
    };

    if (webhook.username) {
      options.auth = {
        username: webhook.username,
        password: webhook.password,
      };
    }

    queue.push(options);
  };

  this.triggerEvent = (message) => {
    if (message.user) {
      const webhooks = sendgrid.store.getWebhooks(message.user);
      if (Array.isArray(webhooks) && webhooks.length) {
        const event = this.event(message);

        for (const webhook of webhooks) {
          this.sendEvents(webhook, [ event ]);
        }
      }
    }
  };
}

module.exports = (mock, sendgrid) => new Webhooks(mock, sendgrid);
