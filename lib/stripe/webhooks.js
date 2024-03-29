'use strict';

const async = require('async');
const crypto = require('crypto');
const request = require('request');

function Webhooks (mock, stripe) {
  this.computeSignature = (payload, secret) => crypto.createHmac('sha256', secret).
    update(payload).
    digest('hex');

  const queue = async.queue((webhook, next) => {
    const event = webhook.event;

    event.pending_webhooks--;

    const timestamp = mock.utils.timestamp();
    const payload = JSON.stringify(event);
    const signature = this.computeSignature(`${ timestamp }.${ payload }`,
      webhook.sharedSecret);

    return request({
      body: event,
      headers: { 'Stripe-Signature': `t=${ timestamp }, v1=${ signature }` },
      json: true,
      method: 'POST',
      url: webhook.url,
    }, (error, response) => {
      if (error || !response) {
        stripe.log.error('%s [%s/%s]: %s', mock.utils.colorize('blue', 'WEBHOOK'), -1, event.type, error || event.id);
      } else {
        stripe.log.verbose('%s [%s/%s]: %s', mock.utils.colorize('blue', 'WEBHOOK'), response.statusCode, event.type, error || event.id);
      }

      event.webhooks_delivered_at = mock.utils.timestamp();

      if (stripe.config.webhooks.delay) {
        return setTimeout(() => next(), stripe.config.webhooks.delay);
      }
      return next();
    });
  }, stripe.config.webhooks.concurrency);

  this.queueWebhooks = ({ context, event }) => {
    const webhooks = stripe.store.getWebhooks(context.identity);

    for (const webhook of webhooks) {
      let match = false;
      for (const type of webhook.events) {
        if (type === event.type || type === '*' ||
            type.endsWith('*') && event.type.startsWith(type.replace('*', ''))) {
          match = true;
          break;
        }
      }

      if (match) {
        event.pending_webhooks++;

        const webhookRequest = {
          event,
          sharedSecret: webhook.sharedSecret,
          url: webhook.url,
        };

        queue.push(webhookRequest);
      }
    }
  };
}

module.exports = (mock, stripe) => new Webhooks(mock, stripe);
