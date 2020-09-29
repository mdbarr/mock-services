'use strict';

function InvoiceItems (stripe) {
  this.createInvoiceItem = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const customer = stripe.store.getCustomer(context.identity, req.body.customer);
    if (!customer) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such customer: ${ req.body.customer }`,
        param: 'customer',
        context,
      });
    }

    if (!req.body.amount) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: no amount provided',
        param: 'amount',
        context,
      });
    }

    const invoiceItem = stripe.model.invoiceItem({
      context,
      customer: customer.id,
      amount: Number(req.body.amount),
      currency: req.body.currency,
      description: req.body.description,
      invoice: req.body.invoice,
      metadata: req.body.metadata,
    });

    context.send(200, invoiceItem);
    return next();
  };

  this.retrieveInvoiceItem = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const invoiceItem = stripe.store.getInvoiceItem(context.identity, req.params.invoiceItem);
    if (!invoiceItem) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such invoice item: ${ req.params.invoiceItem }`,
        param: 'invoiceItem',
        context,
      });
    }

    context.send(200, invoiceItem);
    return next();
  };

  this.updateInvoiceItem = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    let invoiceItem = stripe.store.getInvoiceItem(context.identity, req.params.invoiceItem);
    if (!invoiceItem) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such invoice item: ${ req.params.invoiceItem }`,
        param: 'invoiceItem',
        context,
      });
    }

    const fields = [ 'amount', 'description', 'discountable', 'metadata' ];
    const [ update, previous ] = stripe.util.createUpdateObject(fields, invoiceItem, req.body);

    invoiceItem = stripe.store.updateInvoiceItem(context.identity, req.params.invoiceItem, update);

    stripe.model.event({
      context,
      type: 'invoiceitem.updated',
      object: invoiceItem,
      previous,
    });

    context.send(200, invoiceItem);
    return next();
  };

  this.deleteInvoiceItem = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    let invoiceItem = stripe.store.getInvoiceItem(context.identity, req.params.invoiceItem);
    if (!invoiceItem) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such invoice item: ${ req.params.invoiceItem }`,
        param: 'invoiceItem',
        context,
      });
    }

    invoiceItem = stripe.store.deleteInvoiceItem(context.identity, req.params.invoiceItem);

    stripe.model.event({
      context,
      type: 'invoiceitem.deleted',
      object: invoiceItem,
    });

    const response = {
      deleted: true,
      id: req.params.invoiceItem,
    };

    context.send(200, response);
    return next();
  };

  this.listAllInvoiceItems = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const invoiceItems = stripe.store.getInvoiceItems(context.identity);
    const results = stripe.model.list({
      items: invoiceItems,
      url: '/v1/invoiceitems',
      paginate: true,
      query: req.query,
    });

    context.send(200, results);
    return next();
  };

  ////////////////////

  stripe.server.post('/v1/invoiceitems', stripe.auth.requireAdmin, this.createInvoiceItem);
  stripe.server.get('/v1/invoiceitems/:invoiceItem', stripe.auth.requireAdmin, this.retrieveInvoiceItem);
  stripe.server.post('/v1/invoiceitems/:invoiceItem', stripe.auth.requireAdmin, this.updateInvoiceItem);
  stripe.server.del('/v1/invoiceitems/:invoiceItem', stripe.auth.requireAdmin, this.deleteInvoiceItem);
  stripe.server.get('/v1/invoiceitems', stripe.auth.requireAdmin, this.listAllInvoiceItems);

  ////////////////////
}

module.exports = (stripe) => new InvoiceItems(stripe);
