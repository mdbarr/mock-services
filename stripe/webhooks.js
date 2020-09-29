'use strict';

const async = require('async');
const crypto = require('crypto');
const request = require('request');

function Webhooks (stripe) {
  this.computeSignature = (payload, secret) => crypto.createHmac('sha256', secret).
    update(payload).
    digest('hex');

  const queue = async.queue((webhook, next) => {
    const event = webhook.event;

    event.pending_webhooks--;

    const timestamp = stripe.util.timestamp();
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
      if (!stripe.options.silent) {
        console.log('%s [%s/%s]: %s', stripe.util.colorize('blue', 'WEBHOOK'), response.statusCode, event.type, error || event.id);
      }

      event.webhooks_delivered_at = stripe.util.timestamp();

      if (stripe.options.webhooks.delay) {
        return setTimeout(() => next(), stripe.options.webhooks.delay);
      }
      return next();
    });
  }, stripe.options.webhooks.concurrency);

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

module.exports = (stripe) => new Webhooks(stripe);
