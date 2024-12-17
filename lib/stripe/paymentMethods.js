'use strict';

function PaymentMethods (mock, stripe) {
  this.createPaymentMethod = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    if (!req.body.type || req.body.type !== 'card') {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: unsupported card type ${ req.body.type }`,
        param: 'id',
        context,
      });
    }

    let card = req.body.card;
    if (card.token) {
      const token = stripe.store.getToken(context.identity, card.token);
      if (!token) {
        return stripe.errors.invalidRequestError({
          statusCode: 404,
          message: `Error: token ${ card.token } not found`,
          param: 'card',
          context,
        });
      }

      card = stripe.store.getCard(context.identity, token.card);
      if (!card) {
        return stripe.errors.invalidRequestError({
          statusCode: 404,
          message: `Error: card ${ token.card } not found`,
          param: 'card',
          context,
        });
      }
    }

    const method = stripe.model.paymentMethod({
      context,
      billing: req.body.billing || req.body.billing_details,
      card,
      description: req.body.description,
      email: req.body.email,
      metadata: req.body.metadata,
    });

    context.send(200, method);
    return next();
  };

  this.updatePaymentMethod = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const method = stripe.store.getPaymentMethod(context.identity, req.params.id);
    if (!method) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such payment method ${ req.params.id }`,
        param: 'id',
        context,
      });
    }

    if (method.customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: payment method ${ req.params.id } not attached to customer`,
        param: 'id',
        context,
      });
    }

    if (!req.body.type || req.body.type !== 'card') {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: unsupported card type ${ req.body.type }`,
        param: 'id',
        context,
      });
    }

    let card = req.body.card;
    if (card.token) {
      const token = stripe.store.getToken(context.identity, card.token);
      if (!token) {
        return stripe.errors.invalidRequestError({
          statusCode: 404,
          message: `Error: token ${ card.token } not found`,
          param: 'card',
          context,
        });
      }

      card = stripe.store.getCard(context.identity, token.card);
      if (!card) {
        return stripe.errors.invalidRequestError({
          statusCode: 404,
          message: `Error: card ${ token.card } not found`,
          param: 'card',
          context,
        });
      }

      req.body.card = card;
    }

    const fields = [ 'card', 'billing_details', 'metadata' ];

    const [ update, previous ] = stripe.createUpdateObject(fields, method, req.body);

    const updated = stripe.store.updatePaymentMethod(context.identity, req.params.id, update);

    stripe.model.event({
      context,
      type: 'payment_method.updated',
      object: updated,
      previous,
    });

    context.send(200, updated);
    return next();
  };

  this.attachPaymentMethod = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const method = stripe.store.getPaymentMethod(context.identity, req.params.id);
    if (!method) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: no such payment method ${ req.params.id }`,
        param: 'id',
        context,
      });
    }

    if (!req.body.customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: customer not specified',
        param: 'id',
        context,
      });
    }

    const customer = stripe.store.getCustomer(context.identity, req.body.customer);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: no such customer ${ req.params.customer }`,
        param: 'customer',
        context,
      });
    }

    method.customer = customer.id;

    customer.default_source = method.card.id || null;
    customer.invoice_settings.default_payment_method = method.id;

    stripe.model.event({
      context,
      type: 'payment_method.attached',
      object: method,
    });

    context.send(200, method);
    return next();
  };

  this.detachPaymentMethod = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const method = stripe.store.getPaymentMethod(context.identity, req.params.id);
    if (!method) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: no such payment method ${ req.params.id }`,
        param: 'id',
        context,
      });
    }

    if (!method.customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: customer not attached to ${ req.params.id }`,
        param: 'id',
        context,
      });
    }

    const customer = stripe.store.getCustomer(context.identity, method.customer);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: no such customer ${ req.params.customer }`,
        param: 'customer',
        context,
      });
    }

    method.customer = null;

    customer.default_source = null;
    customer.invoice_settings.default_payment_method = null;

    stripe.model.event({
      context,
      type: 'payment_method.detached',
      object: method,
    });

    context.send(200, method);
    return next();
  };

  this.retrievePaymentMethod = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    const method = stripe.store.getPaymentMethod(context.identity, req.params.id);
    if (!method) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: no such payment method ${ req.params.id }`,
        param: 'id',
        context,
      });
    }

    context.send(200, method);
    return next();
  };

  this.listPaymentMethods = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const methods = stripe.store.getPaymentMethods(context.identity);
    const results = stripe.model.list({
      items: methods,
      url: '/v1/payment_methods',
      paginate: true,
      query: req.query,
      fields: [ 'customer' ],
    });

    context.send(200, results);
    return next();
  };

  mock.api.post('/v1/payment_methods', stripe.req, this.createPaymentMethod);
  mock.api.get('/v1/payment_methods', stripe.req, this.listPaymentMethods);
  mock.api.get('/v1/payment_methods/:id', stripe.req, this.retrievePaymentMethod);
  mock.api.post('/v1/payment_methods/:id/attach', stripe.req, this.attachPaymentMethod);
  mock.api.post('/v1/payment_methods/:id/detach', stripe.req, this.detachPaymentMethod);
}

module.exports = (mock, stripe) => new PaymentMethods(mock, stripe);
