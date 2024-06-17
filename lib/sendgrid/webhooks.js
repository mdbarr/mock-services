'use strict';

const async = require('async');
const axios = require('axios');
const crypto = require('crypto');

function Webhooks (mock, sendgrid) {
  const queue = async.queue(async (options) => {
    try {
      const response = await axios(options);
      sendgrid.log.info('%s [%s/%s]: %s', mock.utils.colorize('blue', 'WEBHOOK'), response.status, options.data[0].event, options.data[0].sg_message_id);
    } catch (error) {
      sendgrid.log.error('%s [%s/%s]: %s', mock.utils.colorize('blue', 'WEBHOOK'), -1, options.data[0].event, error || options.data[0].sg_message_id);
    }

    if (sendgrid.config.webhooks.delay) {
      await mock.utils.delay(sendgrid.config.webhooks.delay);
    }
  }, sendgrid.config.webhooks.concurrency);

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
      method: 'post',
      url: webhook.url,
      data: events,
    };

    if (webhook.signed === true && webhook.privateKey) {
      if (!webhook.importedKey) {
        webhook.importedKey = crypto.createPrivateKey({
          key: Buffer.from(webhook.privateKey, 'base64'),
          format: 'der',
          type: 'sec1',
        });
      }

      const timestamp = new Date().toISOString();
      const payload = JSON.stringify(events);
      const data = Buffer.concat([ Buffer.from(timestamp), Buffer.from(payload) ]);

      const signature = crypto.sign('SHA256', data, webhook.importedKey).toString('base64');

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
