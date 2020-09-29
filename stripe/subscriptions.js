'use strict';

function Subscriptions (stripe) {
  this.populateSubscription = (identity, subscription) => {
    const response = stripe.util.clone(subscription);

    for (const item of response.items.data) {
      item.plan = stripe.store.getPlan(identity, item.plan);
    }
    response.plan = stripe.store.getPlan(identity, response.plan);

    if (response.discount) {
      response.discount.coupon = stripe.store.getCoupon(identity, response.discount.coupon);
    }

    return response;
  };

  this.createSubscription = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    const customerId = req.params.customer || req.body.customer;
    const items = req.body.items || [];

    if (req.body.plan) {
      items.push({
        plan: req.body.plan,
        quantity: req.body.quantity,
      });
    }

    if (!customerId) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: no customer specified',
        param: 'customer',
        context,
      });
    }

    if (!items.length) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: no plan specified',
        param: 'plan',
        context,
      });
    }

    const customer = stripe.store.getCustomer(context.identity, customerId);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer: ${ customerId }`,
        param: 'customer',
        context,
      });
    }

    for (const item of items) {
      const plan = stripe.store.getPlan(context.identity, item.plan);
      if (!plan || plan.deleted) {
        return stripe.errors.invalidRequestError({
          statusCode: 400,
          message: `Error: no such plan: ${ item.plan }`,
          param: 'plan',
          context,
        });
      }
      item.plan = plan;
    }

    const coupon = stripe.store.getCoupon(context.identity, req.body.coupon);

    const subscription = stripe.model.subscription({
      context,
      customer,
      items,
      coupon,
      metadata: req.body.metadata,
      application_fee_percent: req.body.application_fee_percent,
      tax_percent: req.body.tax_percent,
      trial_end: req.body.trial_end,
      trial_period_days: req.body.trial_period_days,
    });

    if (subscription.trial_start === null) {
      let invoice = stripe.model.invoice({
        context,
        customer,
        subscription,
        pay: true,
      });

      invoice = stripe.invoices.populateInvoice(context.identity, invoice);
      stripe.model.event({
        context,
        type: 'invoice.created',
        object: invoice,
      });

      if (invoice.paid) {
        stripe.model.event({
          context,
          type: 'invoice.payment_succeeded',
          object: invoice,
        });
      }
    }

    const response = this.populateSubscription(context.identity, subscription);

    stripe.model.event({
      context,
      type: 'customer.subscription.created',
      object: response,
    });

    context.send(200, response);
    return next();
  };

  this.retrieveSubscription = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    let subscriptionId;
    let customerId;

    if (req.params) {
      if (req.params.subscription) {
        subscriptionId = req.params.subscription;
      }
      if (req.params.customer) {
        customerId = req.params.customer;
      }
    }
    if (req.body) {
      if (req.body.subscription) {
        subscriptionId = req.body.subscription;
      }
      if (req.body.customer) {
        customerId = req.body.customer;
      }
    }

    const subscription = stripe.store.getSubscription(context.identity, subscriptionId);
    if (!subscription) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such subscription ${ subscriptionId }`,
        param: 'subscription',
        context,
      });
    }

    if (!customerId) {
      customerId = subscription.customer;
    }

    const customer = stripe.store.getCustomer(context.identity, customerId);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer ${ customerId }`,
        param: 'customer',
        context,
      });
    }

    const response = this.populateSubscription(context.identity, subscription);

    context.send(200, response);
    return next();
  };

  this.updateSubscription = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    const subscriptionId = req.params.subscription || req.body.subscription;
    let subscription = stripe.store.getSubscription(context.identity, subscriptionId);

    if (!subscription) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such subscription ${ subscriptionId }`,
        param: 'subscription',
        context,
      });
    }

    const customer = stripe.store.getCustomer(context.identity, subscription.customer);

    let coupon = req.body.coupon;
    if (coupon) {
      delete req.body.coupon;
      coupon = stripe.store.getCoupon(context.identity, coupon);

      req.body.discount = stripe.model.discount({
        context,
        customer: subscription.customer,
        subscription: subscription.id,
        coupon,
      });
    } else if (coupon === null) {
      stripe.store.deleteDiscount(context.identity, subscription.customer);
      req.body.discount = null;
    }

    const items = req.body.items || [];
    delete req.body.items;

    if ((req.body.quantity || req.body.plan) && subscription.items.data.length) {
      items.push({
        id: subscription.items.data[0].id,
        quantity: req.body.quantity || subscription.items.data[0].quantity,
        plan: req.body.plan || subscription.items.data[0].plan,
        deleted: false,
      });
    }

    const prorationItems = items.filter((item) => {
      item.subscriptionItem = subscription.items.data.findById(item.id);
      if (!item.subscriptionItem) {
        return stripe.errors.invalidRequestError({
          statusCode: 400,
          message: `Error: no such subscription_item ${ item.id }`,
          param: 'items',
          context,
        });
      }

      item.quantity = Number(item.quantity);
      item.planObject = stripe.store.getPlan(context.identity, item.plan);

      if (!item.planObject) {
        return stripe.errors.invalidRequestError({
          statusCode: 400,
          message: `Error: no such plan ${ item.plan }`,
          param: 'items',
          context,
        });
      }

      item.subscriptionPlanObject = stripe.store.getPlan(context.identity, item.subscriptionItem.plan);

      if (item.deleted || Number(item.quantity) !== Number(item.subscriptionItem.quantity) ||
          item.plan !== item.subscriptionItem.plan) {
        return true;
      }
      return false;
    });

    prorationItems.forEach((item) => {
      stripe.invoices.createProration({
        context,
        item,
        customer,
        subscription,
      });

      item.subscriptionItem.plan = item.plan;
      item.subscriptionItem.quantity = item.quantity;
      req.body.plan = item.plan;
      req.body.quantity = item.quantity;
    });

    const fields = [
      'application_free_percent', 'coupon', 'items', 'discount',
      'metadata', 'source', 'tax_percent', 'plan', 'quantity',
    ];

    const [ update, previous ] = stripe.util.createUpdateObject(fields, subscription, req.body);

    subscription = stripe.store.updateSubscription(context.identity, subscription.id, update);

    const response = this.populateSubscription(context.identity, subscription);

    stripe.model.event({
      context,
      type: 'customer.subscription.updated',
      object: response,
      previous,
    });

    context.send(200, response);
    return next();
  };

  this.cancelSubscription = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    const subscriptionId = req.params.subscription || req.body.subscription;
    const subscription = stripe.store.getSubscription(context.identity, subscriptionId);
    if (!subscription) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such subscription ${ subscriptionId }`,
        param: 'subscription',
        context,
      });
    }

    subscription.canceled_at = stripe.util.timestamp();
    if (req.query && stripe.util.toBoolean(req.query.at_period_end)) {
      subscription.cancel_at_period_end = true;
    } else {
      subscription.status = 'canceled';
      subscription.ended_at = subscription.canceled_at;
    }

    stripe.store.updateSubscription(context.identity, subscription.id, subscription);

    const response = this.populateSubscription(context.identity, subscription);
    context.send(200, response);
    return next();
  };

  this.listSubscriptions = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    let subscriptions = stripe.store.getSubscriptions(context.identity);
    subscriptions = subscriptions.map((subscription) => this.populateSubscription(context.identity, subscription));
    const results = stripe.model.list({
      items: subscriptions,
      url: '/v1/subscriptions',
      paginate: true,
      query: req.query,
    });

    context.send(200, results);
    return next();
  };

  ////////////////////

  stripe.server.post('/v1/subscriptions', stripe.auth.requireAdmin, this.createSubscription);
  stripe.server.post('/v1/customers/:customer/subscriptions', stripe.auth.requireAdmin, this.createSubscription);

  stripe.server.get('/v1/subscriptions/:subscription', stripe.auth.requireAdmin, this.retrieveSubscription);
  stripe.server.get('/v1/customers/:customer/subscriptions/:subscription', stripe.auth.requireAdmin, this.retrieveSubscription);

  stripe.server.post('/v1/subscriptions/:subscription', stripe.auth.requireAdmin, this.updateSubscription);
  stripe.server.post('/v1/customers/:customer/subscriptions/:subscription', stripe.auth.requireAdmin, this.updateSubscription);

  stripe.server.del('/v1/subscriptions/:subscription', stripe.auth.requireAdmin, this.cancelSubscription);
  stripe.server.del('/v1/customers/:customer/subscriptions/:subscription', stripe.auth.requireAdmin, this.cancelSubscription);

  stripe.server.get('/v1/subscriptions', stripe.auth.requireAdmin, this.listSubscriptions);

  ////////////////////
}

module.exports = (stripe) => new Subscriptions(stripe);
