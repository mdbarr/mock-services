'use strict';

function Coupons (stripe) {
  this.createCoupon = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    if (!req.body.duration || !(req.body.amount_off && req.body.currency || req.body.percent_off) ||
        req.body.percent_off && req.body.amount_off ||
        req.body.duration === 'repeating' && !req.body.duration_in_months) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: 'Error: Missing coupon fields',
        param: 'coupon',
        context,
      });
    }

    if (stripe.store.getCoupon(context.identity, req.body.id)) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: Coupon ${ req.body.id } already exists`,
        param: 'coupon',
        context,
      });
    }

    const coupon = stripe.model.coupon({
      context,
      id: req.body.id,
      duration: req.body.duration,
      amount_off: req.body.amount_off || null,
      currency: req.body.currency || null,
      duration_in_months: req.body.duration_in_months || null,
      max_redemptions: req.body.max_redemptions || null,
      metadata: req.body.metadata || {},
      percent_off: req.body.percent_off || null,
      redeem_by: req.body.redeem_by || null,
    });

    stripe.model.event({
      context,
      type: 'coupon.created',
      object: coupon,
    });

    context.send(200, coupon);
    return next();
  };

  this.retrieveCoupon = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const coupon = stripe.store.getCoupon(context.identity, req.params.coupon);
    if (!coupon) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: No such coupon ${ req.params.coupon }`,
        param: 'coupon',
        context,
      });
    }

    context.send(200, coupon);
    return next();
  };

  this.updateCoupon = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    let coupon = stripe.store.getCoupon(context.identity, req.params.coupon);
    if (!coupon) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: No such coupon ${ req.params.coupon }`,
        param: 'coupon',
        context,
      });
    }

    const update = { metadata: req.body.metadata };

    const previous = { metadata: coupon.metadata };

    coupon = stripe.store.updateCoupon(context.identity, update);

    stripe.model.event({
      context,
      type: 'coupon.updated',
      object: coupon,
      previous,
    });

    context.send(200, coupon);
    return next();
  };

  this.deleteCoupon = (req, res, next) => {
    const context = stripe.model.context(req, res, next);

    let coupon = stripe.store.getCoupon(context.identity, req.params.coupon);
    if (!coupon) {
      return stripe.errors.invalidRequestError({
        statusCode: 400,
        message: `Error: No such coupon ${ req.params.coupon }`,
        param: 'coupon',
        context,
      });
    }

    coupon = stripe.store.deleteCoupon(context.identity, req.params.coupon);

    stripe.model.event({
      context,
      type: 'coupon.deleted',
      object: coupon,
    });

    const response = {
      deleted: true,
      id: req.params.coupon,
    };

    context.send(200, response);
    return next();
  };

  this.listAllCoupons = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    const coupons = stripe.store.getCoupons(context.identity);
    const results = stripe.model.list({
      items: coupons,
      url: '/v1/coupons',
      paginate: true,
      query: req.query,
    });

    context.send(200, results);
    return next();
  };

  ////////////////////

  stripe.server.post('/v1/coupons', stripe.auth.requireAdmin, this.createCoupon);
  stripe.server.get('/v1/coupons/:coupon', this.retrieveCoupon);
  stripe.server.post('/v1/coupons/:coupon', stripe.auth.requireAdmin, this.updateCoupon);
  stripe.server.del('/v1/coupons/:coupon', stripe.auth.requireAdmin, this.deleteCoupon);
  stripe.server.get('/v1/coupons', this.listAllCoupons);

  ////////////////////
}

module.exports = (stripe) => new Coupons(stripe);
