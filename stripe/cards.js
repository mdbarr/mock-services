'use strict';

function Cards (stripe) {
  this.retrieveCard = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const customer = stripe.store.getCustomer(context.identity, req.params.customer);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer ${ req.params.customer }`,
        param: 'id',
        context,
      });
    }

    const card = stripe.store.getCard(context.identity, req.params.card);
    if (!card) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: card ${ req.params.card } not found`,
        param: 'card',
        context,
      });
    }

    if (card.customer !== customer.id) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: card ${ req.params.card } not found`,
        param: 'card',
        context,
      });
    }

    context.send(200, card);
    return next();
  };

  this.updateCard = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    let card = stripe.store.getCard(context.identity, req.params.card);
    if (!card) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such card ${ req.params.card }`,
        param: 'card',
        context,
      });
    }

    const customer = stripe.store.getCustomer(context.identity, req.params.customer);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer ${ req.params.customer }`,
        param: 'customer',
        context,
      });
    }

    if (card.customer !== customer.id) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: card ${ req.params.card } not associated with ${ req.params.customer }`,
        param: 'customer',
        context,
      });
    }

    const fields = [
      'address_city', 'address_country', 'address_line1', 'address_line2',
      'address_state', 'address_zip', 'exp_month', 'exp_year', 'metadata', 'name',
    ];

    const [ update, previous ] = stripe.util.createUpdateObject(fields, card, req.body);

    card = stripe.store.updateCard(context.identity, req.params.card, update);

    stripe.model.event({
      context,
      type: 'customer.source.updated',
      object: card,
      previous,
    });

    context.send(200, card);
    return next();
  };

  this.deleteCard = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const customer = stripe.store.getCustomer(context.identity, req.params.customer);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer ${ req.params.customer }`,
        param: 'id',
        context,
      });
    }

    const card = stripe.store.getCard(context.identity, req.params.card);
    if (!card) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: card ${ req.params.card } not found`,
        param: 'card',
        context,
      });
    }

    if (card.customer !== customer.id) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: card ${ req.params.card } not found`,
        param: 'card',
        context,
      });
    }

    if (customer.default_source === card.id) {
      customer.default_source = null;

      stripe.store.updateCustomer(context.identity, customer.id, customer);
    }

    stripe.store.deleteCard(context.identity, card.id);

    const response = {
      delete: true,
      id: card.id,
    };

    context.send(200, response);
    return next();
  };

  ////////////////////

  stripe.server.get('/v1/customers/:customer/sources/:card', stripe.auth.requireAdmin, this.retrieveCard);
  stripe.server.post('/v1/customers/:customer/sources/:card', stripe.auth.requireAdmin, this.updateCard);
  stripe.server.del('/v1/customers/:customer/sources/:card', stripe.auth.requireAdmin, this.deleteCard);

  ////////////////////
}

module.exports = (stripe) => new Cards(stripe);
