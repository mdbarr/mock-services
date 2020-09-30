'use strict';

function Charges (mock, stripe) {
  this.retrieveCharge = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const charge = stripe.store.getCharge(context.identity, req.params.charge);
    if (!charge) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: no such charge: ${ charge }`,
        param: 'charge',
        context,
      });
    }

    const card = stripe.store.getCard(context.identity, charge.source);

    const response = mock.utils.clone(charge);
    response.source = card;

    context.send(200, response);
    return next();
  };

  this.listAllCharges = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const charges = stripe.store.getCharges(context.identity);
    const results = stripe.model.list({
      items: charges,
      url: '/v1/charges',
      paginate: true,
      query: req.query,
    });

    context.send(200, results);
    return next();
  };

  ////////////////////

  mock.api.get('/v1/charges/:charge', stripe.auth.requireAdmin, this.retrieveCharge);
  mock.api.get('/v1/charges', stripe.auth.requireAdmin, this.listAllCharges);

  ////////////////////
}

module.exports = (mock, stripe) => new Charges(mock, stripe);
