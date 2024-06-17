'use strict';

const async = require('async');
const axios = require('axios');
const crypto = require('crypto');

function Webhooks (mock, stripe) {
  this.computeSignature = (payload, secret) => crypto.createHmac('sha256', secret).
    update(payload).
    digest('hex');

  const queue = async.queue(async (webhook) => {
    const event = webhook.event;

    event.pending_webhooks--;

    const timestamp = mock.utils.timestamp();
    const payload = JSON.stringify(event);
    const signature = this.computeSignature(`${ timestamp }.${ payload }`, webhook.sharedSecret);

    try {
      const response = await axios({
        method: 'post',
        url: webhook.url,
        data: event,
        headers: { 'Stripe-Signature': `t=${ timestamp }, v1=${ signature }` },
      });

      event.webhooks_delivered_at = mock.utils.timestamp();

      stripe.log.verbose('%s [%s/%s]: %s', mock.utils.colorize('blue', 'WEBHOOK'), response.status, event.type, event.id);
    } catch (error) {
      stripe.log.error('%s [%s/%s]: %s', mock.utils.colorize('blue', 'WEBHOOK'), -1, event.type, error || event.id);
    }

    if (stripe.config.webhooks.delay) {
      await mock.utils.delay(stripe.config.webhooks.delay);
    }
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
