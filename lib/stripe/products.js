'use strict';

function Products (mock, stripe) {
  this.createProduct = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    const product = stripe.model.product({
      context,
      id: req.body.id,
      name: req.body.name,
      active: req.body.active,
      description: req.body.description,
      metadata: req.body.metadata,
      statement_descriptor: req.body.statement_descriptor,
    });

    stripe.model.event({
      context,
      type: 'product.created',
      object: product,
    });

    context.send(200, product);
    return next();
  };

  this.retrieveProduct = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    const product = stripe.store.getProduct(context.identity, req.params.id);
    if (!product) {
      return stripe.errors.invalidRequestError({
        statusCode: 404,
        message: `Error: no such product ${ req.params.id }`,
        param: 'id',
        context,
      });
    }

    context.send(200, product);
    return next();
  };

  mock.api.post('/v1/products', stripe.req, stripe.auth.requireAdmin, this.createProduct);
  mock.api.get('/v1/products/:id', stripe.req, stripe.auth.requireAdmin, this.retrieveProduct);
}

module.exports = (mock, stripe) => new Products(mock, stripe);
