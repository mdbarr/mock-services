'use strict';

function Customers (mock, stripe) {
  this.addSources = (identity, customer) => {
    const cards = stripe.store.findCards(identity, {
      customer: customer.id,
      id: customer.default_source,
    }).sort((a, b) => {
      if (a.id === customer.default_source) {
        return -1;
      } else if (b.id === customer.default_source) {
        return 1;
      }
      return 0;
    });

    customer.sources = stripe.model.list({
      items: cards,
      url: `/v1/customers/${ customer.id }/sources`,
    });

    return customer;
  };

  this.addSubscriptions = (identity, customer) => {
    let subscriptions = stripe.store.findSubscriptions(identity, { customer: customer.id });

    subscriptions = subscriptions.map((subscription) => {
      subscription = stripe.subscriptions.populateSubscription(identity, subscription);
      return subscription;
    });

    customer.subscriptions = stripe.model.list({
      items: subscriptions,
      url: `/v1/customers/${ customer.id }/subscriptions`,
    });

    return customer;
  };

  this.addDiscount = (identity, customer) => {
    let discount = stripe.store.getDiscount(identity, customer.id);
    if (discount) {
      discount = mock.utils.clone(discount);
      discount.coupon = stripe.store.getCoupon(identity, discount.coupon);
      customer.discount = discount;
    }
    return customer;
  };

  this.createCustomer = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const tokenId = req.body.source || req.body.card;
    const methodId = req.body.payment_method;

    let token;
    let card;
    let method;

    if (tokenId) {
      token = stripe.store.getToken(context.identity, tokenId);
      if (!token) {
        return stripe.errors.invalidRequestError({
          statusCode: 404,
          message: `Error: token ${ tokenId } not found`,
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

    if (methodId) {
      method = stripe.store.getPaymentMethod(context.identity, methodId);
      if (!method) {
        return stripe.errors.invalidRequestError({
          statusCode: 404,
          message: `Error: payment method ${ methodId } not found`,
          param: 'payment_method',
          context,
        });
      }

      if (method.card.id) {
        card = stripe.store.getCard(context.identity, method.card.id);
      }
    }

    const customer = stripe.model.customer({
      context,
      token,
      card,
      description: req.body.description,
      email: req.body.email,
      name: req.body.name,
      metadata: req.body.metadata,
      shipping: req.body.shipping,
      method,
    });

    stripe.model.event({
      context,
      type: 'customer.created',
      object: customer,
    });

    if (card && token) {
      token.used = true;
      stripe.store.updateToken(context.identity, token.id, token);

      card.customer = customer.id;
      stripe.store.updateCard(context.identity, card.id, card);
      stripe.model.event({
        context,
        type: 'customer.source.created',
        object: card,
      });
    }

    if (method) {
      method.customer = customer.id;
      stripe.store.updatePaymentMethod(context.identity, method.id, method);
      stripe.model.event({
        context,
        type: 'payment_method.attached',
        object: method,
      });
    }

    const response = mock.utils.clone(customer);
    this.addSources(context.identity, response);
    this.addSubscriptions(context.identity, response);
    this.addDiscount(context.identity, response);

    context.send(200, response);
    return next();
  };

  this.retrieveCustomer = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const customer = stripe.store.getCustomer(context.identity, req.params.customer);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer ${ req.params.customer }`,
        param: 'customer',
        context,
      });
    }

    const response = mock.utils.clone(customer);
    this.addSources(context.identity, response);
    this.addSubscriptions(context.identity, response);
    this.addDiscount(context.identity, response);

    context.send(200, response);
    return next();
  };

  this.updateCustomer = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const tokenId = req.body.source || req.body.card;
    let token;
    let card;

    if (tokenId) {
      delete req.body.source;
      delete req.body.card;

      token = stripe.store.getToken(context.identity, tokenId);
      if (!token) {
        return stripe.errors.invalidRequestError({
          statusCode: 404,
          message: `Error: token ${ tokenId } not found`,
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

    let customer = stripe.store.getCustomer(context.identity, req.params.customer);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer ${ req.params.customer }`,
        param: 'customer',
        context,
      });
    }

    if (card) {
      token.used = true;
      stripe.store.updateToken(context.identity, token.id, token);

      card.customer = customer.id;
      stripe.store.updateCard(context.identity, card.id, card);

      stripe.model.event({
        context,
        type: 'customer.source.created',
        object: card,
      });

      req.body.default_source = card.id;
    }

    const fields = [
      'account_balance', 'business_vat_id', 'default_source',
      'description', 'email', 'metadata', 'shipping',
    ];

    const [ update, previous ] = stripe.createUpdateObject(fields, customer, req.body);

    customer = stripe.store.updateCustomer(context.identity, req.params.customer, update);

    stripe.model.event({
      context,
      type: 'customer.updated',
      object: customer,
      previous,
    });

    const response = mock.utils.clone(customer);
    this.addSources(context.identity, response);
    this.addSubscriptions(context.identity, response);
    this.addDiscount(context.identity, response);

    context.send(200, response);
    return next();
  };

  this.deleteCustomer = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    let customer = stripe.store.getCustomer(context.identity, req.params.customer);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer ${ req.params.customer }`,
        param: 'customer',
        context,
      });
    }

    customer = stripe.store.deleteCustomer(context.identity, req.params.customer);
    stripe.model.event({
      context,
      type: 'customer.deleted',
      object: customer,
    });

    const response = {
      deleted: true,
      id: req.params.customer,
    };

    context.send(200, response);
    return next();
  };

  this.listAllCustomers = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const customers = stripe.store.getCustomers(context.identity);
    const results = stripe.model.list({
      items: customers,
      url: '/v1/customers',
      paginate: true,
      query: req.query,
    });

    context.send(200, results);
    return next();
  };

  ////////////////////

  mock.api.post('/v1/customers', stripe.req, stripe.auth.requireAdmin, this.createCustomer);
  mock.api.get('/v1/customers/:customer', stripe.req, this.retrieveCustomer);
  mock.api.post('/v1/customers/:customer', stripe.req, stripe.auth.requireAdmin, this.updateCustomer);
  mock.api.del('/v1/customers/:customer', stripe.req, stripe.auth.requireAdmin, this.deleteCustomer);
  mock.api.get('/v1/customers', stripe.req, this.listAllCustomers);

  ////////////////////
}

module.exports = (mock, stripe) => new Customers(mock, stripe);
