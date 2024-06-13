'use strict';

const errors = require('restify-errors');

function Webhook (mock) {
  this.config = mock.config.webhook;
  this.log = mock.log.child({ service: 'webhook' });

  this.queues = {};

  mock.api.post('/api/webhook/:any', (req, res, next) => {
    if (!req.body || !req.body.webhookId) {
      return next(new errors.BadRequestError(new Error('Invalid webhook event payload')));
    }

    const event = {
      id: mock.utils.generateUniqueId(24),
      webhookId: req.body.webhookId,
      eventType: req.body.event,
      method: req.method,
      url: req.url,
      event: req.body,
    };

    if (!this.queues[event.webhookId]) {
      this.queues[event.webhookId] = [ ];
    }

    this.queues[event.webhookId].push(event);
    this.log.info(`Received eventType=${ event.eventType } on webhookId=${ event.webhookId }`);

    res.send(200, {
      id: event.id,
      ok: true,
    });
    return next();
  });

  mock.api.get('/api/webhook/:webhookId/:eventType', (req, res, next) => {
    if (this.queues[req.params.webhookId]) {
      const event = this.queues[req.params.webhookId].find(w => w.eventType === req.params.eventType);
      if (event) {
        res.send(200, event);
        return next();
      }
      return next(new errors.NotFoundError(`${ req.params.eventType } not found`));
    }

    return next(new errors.NotFoundError(`${ req.params.webhookId } not found`));
  });

  this.start = async () => {
    this.log.info('Mock Webhook Server ready');
  };
}

module.exports = (mock) => new Webhook(mock);
