'use strict';

const async = require('async');
const request = require('request');
const ecdsa = require('starkbank-ecdsa');

const Ecdsa = ecdsa.Ecdsa;
const PrivateKey = ecdsa.PrivateKey;

function Webhooks (mock, sendgrid) {
  const queue = async.queue((options, next) => request(options, (error, response) => {
    if (error || !response) {
      sendgrid.log.error('%s [%s/%s]: %s', mock.utils.colorize('blue', 'WEBHOOK'), -1, options.body[0].event, error || options.body[0].sg_message_id);
    } else {
      sendgrid.log.info('%s [%s/%s]: %s', mock.utils.colorize('blue', 'WEBHOOK'), response.statusCode, options.body[0].event, error || options.body[0].sg_message_id);
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

    if (webhook.signed === true && webhook.privateKey) {
      if (typeof webhook.privateKey === 'string') {
        webhook.privateKey = PrivateKey.fromPem(webhook.privateKey);
      }

      const timestamp = new Date().toISOString();
      const payload = JSON.stringify(events);
      const signature = Ecdsa.sign(timestamp + payload, webhook.privateKey).toBase64();

      options.headers = {
        'X-Twilio-Email-Event-Webhook-Signature': signature,
        'X-Twilio-Email-Event-Webhook-Timestamp': timestamp,
      };
    }

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
