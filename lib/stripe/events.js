'use strict';

function Events (mock, stripe) {
  this.retrieveEvent = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    const event = stripe.store.getEvent(context.identity, req.params.event);
    if (!event) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such event ${ req.params.event }`,
        param: 'event',
        context,
      });
    }

    context.send(200, event, { silent: true });
    return next();
  };

  this.listAllEvents = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const events = stripe.store.getEvents(context.identity);
    const results = stripe.model.list({
      items: events,
      url: '/v1/events',
      paginate: true,
      query: req.query,
    });

    context.send(200, results, { silent: true });
    return next();
  };

  ////////////////////

  mock.api.get('/v1/events/:event', stripe.req, this.retrieveEvent);
  mock.api.get('/v1/events', stripe.req, this.listAllEvents);

  ////////////////////
}

module.exports = (mock, stripe) => new Events(mock, stripe);
