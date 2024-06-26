'use strict';

function Invoices (mock, stripe) {
  this.populatePlan = (identity, invoiceItem) => {
    invoiceItem = mock.utils.clone(invoiceItem);
    invoiceItem.plan = stripe.store.getPlan(identity, invoiceItem.plan);

    return invoiceItem;
  };

  this.populateInvoice = (identity, invoice) => {
    invoice = mock.utils.clone(invoice);
    for (const lineItem of invoice.lines.data) {
      if ((lineItem.type === 'subscription' || lineItem.proration) && lineItem.plan) {
        lineItem.plan = stripe.store.getPlan(identity, lineItem.plan);
      }
    }
    if (invoice.discount) {
      invoice.discount.coupon = stripe.store.getCoupon(identity, invoice.discount.coupon);
    }
    return invoice;
  };

  this.createProration = function({
    context, item, customer, subscription,
  }) {
    const percent = stripe.calculateProrationPercent(subscription.current_period_start,
      subscription.current_period_end);

    if (item.deleted) {
      const invoiceitem = stripe.model.invoiceItem({
        context,
        amount: -1 * ( item.subscriptionPlanObject.amount * item.subscriptionItem.quantity * (percent / 100)),
        customer: customer.id,
        plan: item.subscriptionItem.plan,
        quantity: item.subscriptionItem.quantity,
        subscription: subscription.id,
        subscription_item: item.subscription_item.id,
        start: subscription.current_period_start,
        end: subscription.current_period_end,
        description: `Unused time on ${ item.subscriptionItem.quantity } x ${ item.subscriptionPlanObject.name }`,
        proration: true,
      });

      stripe.model.event({
        context,
        type: 'invoiceitem.created',
        object: this.populatePlan(context.identity, invoiceitem),
      });
    } else {
      const invoiceitemA = stripe.model.invoiceItem({
        context,
        amount: -1 * (item.subscriptionPlanObject.amount * item.subscriptionItem.quantity * (percent / 100)),
        customer: customer.id,
        plan: item.subscriptionItem.plan,
        quantity: item.subscriptionItem.quantity,
        subscription: subscription.id,
        subscription_item: item.subscriptionItem.id,
        start: subscription.current_period_start,
        end: subscription.current_period_end,
        description: `Unused time on ${ item.subscriptionItem.quantity } x ${ item.subscriptionPlanObject.name }`,
        proration: true,
      });

      stripe.model.event({
        context,
        type: 'invoiceitem.created',
        object: this.populatePlan(context.identity, invoiceitemA),
      });

      const invoiceitemB = stripe.model.invoiceItem({
        context,
        amount: item.planObject.amount * item.quantity * (percent / 100),
        customer: customer.id,
        plan: item.plan,
        quantity: item.quantity,
        subscription: subscription.id,
        subscription_item: item.subscriptionItem.id,
        start: subscription.current_period_start,
        end: subscription.current_period_end,
        description: `Remaining time on ${ item.quantity } x ${ item.planObject.name }`,
        proration: true,
      });

      stripe.model.event({
        context,
        type: 'invoiceitem.created',
        object: this.populatePlan(context.identity, invoiceitemB),
      });
    }
  };

  this.retrieveUpcomingInvoice = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    if (!req.query.customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: no customer specified',
        param: 'customer',
        context,
      });
    }

    const customerId = req.query.customer;
    const customer = stripe.store.getCustomer(context.identity, customerId);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer ${ customerId }`,
        param: 'id',
        context,
      });
    }

    const subscriptionId = req.query.subscription;
    let subscription = stripe.store.getSubscription(context.identity, subscriptionId);
    if (subscriptionId && !subscription) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such subscription ${ subscriptionId }`,
        param: 'id',
        context,
      });
    }

    const invoices = stripe.store.findInvoices(context.identity, {
      customer: customerId,
      subscription: subscriptionId,
    });

    const subscriptions = stripe.store.findSubscriptions(context.identity, { customer: customerId });

    if (!invoices.length || !subscriptions.length) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: No upcoming invoices for customer: ${ customerId }`,
        context,
      });
    }

    if (!subscription && subscriptions.length) {
      subscription = subscriptions[0];
    }

    const invoice = stripe.model.invoice({
      context,
      customer,
      subscription,
      upcoming: true,
      pay: false,
      metadata: subscription.metadata,
    });

    const response = this.populateInvoice(context.identity, invoice);

    context.send(200, response);
    return next();
  };

  this.createInvoice = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const customerId = req.params.customer || req.body.customer;

    if (!customerId) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: no customer specified',
        param: 'customer',
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

    let subscription;
    if (req.body.subscription) {
      subscription = stripe.store.getSubscription(context.identity, req.body.subscription);
      if (!subscription) {
        return stripe.errors.invalidRequestError({
          statusCode: 400,
          message: `Error: no such subscription: ${ req.body.subscription }`,
          param: 'subscription',
          context,
        });
      }
    }

    const invoiceItems = stripe.store.findInvoiceItems(context.identity, {
      customer: customer.id,
      invoice: null,
    });

    if (!invoiceItems.length) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: no pending invoice items',
        param: 'customer',
        context,
      });
    }

    let invoice = stripe.model.invoice({
      context,
      customer,
      application_fee: req.body.application_fee || null,
      description: req.body.description || null,
      statement_descriptor: req.body.statement_descriptor || null,
      subscription,
      metadata: req.body.metadata || {},
      tax_percent: req.body.tax_percent || null,
      pay: mock.utils.toBoolean(req.body.auto_advance),
      auto_advance: mock.utils.toBoolean(req.body.auto_advance),
    });

    invoice = this.populateInvoice(context.identity, invoice);

    if (subscription) {
      subscription = stripe.store.updateSubscription(context.identity, subscription.id, { latest_invoice: invoice.id });

      stripe.model.event({
        context,
        type: 'customer.subscription.updated',
        object: subscription,
      });
    }

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

    context.send(200, invoice);
    return next();
  };

  this.retrieveInvoice = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const invoiceId = req.params.invoice;
    if (!invoiceId) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: no invoice specified',
        param: 'invoice',
        context,
      });
    }

    const invoice = stripe.store.getInvoice(context.identity, invoiceId);
    if (!invoice) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such invoice: ${ invoiceId }`,
        param: 'invoice',
        context,
      });
    }

    const response = this.populateInvoice(context.identity, invoice);
    context.send(200, response);
    return next();
  };

  this.listAllInvoices = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    let invoices;
    if (req.query && req.query.customer) {
      invoices = stripe.store.findInvoices(context.identity, {
        customer: req.query.customer,
        // status: req.query.status,
      });
    } else {
      invoices = stripe.store.getInvoices(context.identity);
    }

    invoices = mock.utils.clone(invoices);
    invoices = invoices.map((invoice) => this.populateInvoice(context.identity, invoice));

    const results = stripe.model.list({
      items: invoices,
      url: '/v1/invoices',
      paginate: true,
      query: req.query,
    });

    context.send(200, results);
    return next();
  };

  this.payInvoice = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const invoiceId = req.params.invoice;
    if (!invoiceId) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: no invoice specified',
        param: 'invoice',
        context,
      });
    }

    const invoice = stripe.store.getInvoice(context.identity, invoiceId);
    if (!invoice) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such invoice: ${ invoiceId }`,
        param: 'invoice',
        context,
      });
    }

    let paid = false;

    invoice.auto_advance = false;

    if (!invoice.paid) {
      const customer = stripe.store.getCustomer(context.identity, invoice.customer);

      if (invoice.total > 0) {
        const charge = stripe.model.charge({
          context,
          customer,
          invoice: invoice.id,
          amount: invoice.total,
        });

        invoice.charge = charge.id;
        invoice.closed = charge.paid;
        invoice.paid = charge.paid;
      } else {
        stripe.store.updateCustomer(context.identity, customer.id, { account_balance: invoice.total });
        invoice.ending_balance = invoice.total;
        invoice.closed = true;
        invoice.paid = true;
      }
      paid = true;
    }

    stripe.store.updateInvoice(context.identity, invoice.id, invoice);

    const response = this.populateInvoice(context.identity, invoice);
    if (paid) {
      stripe.model.event({
        context,
        type: 'invoice.payment_succeeded',
        object: response,
      });
    } else {
      stripe.model.event({
        context,
        type: 'invoice.updated',
        object: response,
      });
    }

    context.send(200, response);
    return next();
  };

  ////////////////////

  mock.api.get('/v1/invoices/upcoming', stripe.req, stripe.auth.requireAdmin, this.retrieveUpcomingInvoice);
  mock.api.post('/v1/invoices', stripe.req, stripe.auth.requireAdmin, this.createInvoice);
  mock.api.get('/v1/invoices/:invoice', stripe.req, stripe.auth.requireAdmin, this.retrieveInvoice);
  mock.api.post('/v1/invoices/:invoice/pay', stripe.req, stripe.auth.requireAdmin, this.payInvoice);
  mock.api.get('/v1/invoices', stripe.req, stripe.auth.requireAdmin, this.listAllInvoices);

  ////////////////////
}

module.exports = (mock, stripe) => new Invoices(mock, stripe);
