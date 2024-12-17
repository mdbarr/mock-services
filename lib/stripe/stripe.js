'use strict';

const url = require('url');

function Stripe (mock) {
  this.log = mock.log.child({ service: 'stripe' });

  this.config = mock.config.stripe;

  //////////

  this.createUpdateObject = (fields, object, body) => {
    const update = {};
    const previous = {};
    for (const field of fields) {
      if (body[field]) {
        if (typeof object[field] === 'object') {
          previous[field] = mock.utils.clone(object[field]);
        } else {
          previous[field] = object[field];
        }
        update[field] = body[field];
      }
    }
    return [ update, previous ];
  };

  this.updateObject = (target, source, authority) => {
    authority = authority || target;
    for (const property in authority) {
      if (source[property] !== undefined) {
        if (source[property] && typeof source[property] === 'object') {
          target[property] = this.updateObject(target[property] || {}, source[property], source[property]);
        } else {
          let value = source[property];
          if (value === '' || value === undefined) {
            value = null;
          }
          target[property] = value;
        }
      }
    }
    return target;
  };

  this.calculateProrationPercent = (start, end) => {
    const diff = end - start;
    const span = mock.utils.timestamp() - start;
    const used = Math.floor(span / diff * 100);
    const percent = 100 - used;

    return percent;
  };

  this.getDefaultAddress = () => ({
    address: '1 Alewife Center',
    city: 'Cambridge',
    zip: '02140',
    state: 'MA',
    country: 'USA',
  });

  this.getDefaultCreditCard = () => ({
    number: '4242424242424242',
    exp_month: 12,
    exp_year: new Date().getFullYear() + 2,
    cvc: '123',
    address_line1: '1 Alewife Center',
    address_line2: 'Suite 130',
    address_city: 'Cambridge',
    address_state: 'MA',
    address_zip: '02140',
    address_country: 'US',
  });

  this.parseConfig = (configs) => {
    if (!Array.isArray(configs)) {
      configs = [ configs ];
    }

    for (const config of configs) {
      const identity = config.name;

      const context = {
        identity,
        admin: true,
        livemode: mock.utils.toBoolean(config.livemode),
      };

      this.log.info(`Loading configuration for ${ mock.utils.colorize('bright blue', identity) } organization:`);
      this.store.addKey(identity, {
        secretKey: config.keys.secret,
        publishableKey: config.keys.publishable,
      });

      if (config.plans) {
        for (let plan of config.plans) {
          plan.context = context;
          const amount = `($${ plan.amount / 100 }/${ plan.interval })`;
          this.log.info(`  Adding plan ${ mock.utils.colorize('bright green', plan.id) } ${ mock.utils.colorize('grey', amount) }`);
          plan = this.model.plan(plan);
        }
      }

      if (config.coupons) {
        for (let coupon of config.coupons) {
          coupon.context = context;
          let amount = coupon.amount_off ? `$${ coupon.amount_off / 100 }` : `${ coupon.percent_off }%`;
          amount = `(${ amount } off)`;
          this.log.info(`  Adding coupon ${ mock.utils.colorize('bright cyan', coupon.id) } ${ mock.utils.colorize('grey', amount) }`);
          coupon = this.model.coupon(coupon);
        }
      }

      if (config.webhooks) {
        for (let webhook of config.webhooks) {
          webhook.context = context;
          const webhookUrl = url.parse(webhook.url);
          const webhookName = webhook.url.replace(webhookUrl.search, '');
          this.log.info(`  Adding webhook ${ mock.utils.colorize('bright magenta', webhookName) }`);
          webhook = this.model.webhook(webhook);
        }
      }
    }
  };

  //////////

  this.req = (req, res, next) => {
    const requestId = `req_${ this.store.generateId(24) }`;
    req.requestId = requestId;

    res.header('Request-Id', requestId);
    res.header(`${ mock.config.name }-stripe-version`, mock.config.version);
    res.header('Stripe-Version', this.config.apiVersion);

    mock.log.req(req);

    return this.auth.validateApiKey(req, res, next);
  };

  ////////////////////

  this.data = require('./data');

  this.store = require('./dataStore')(mock, this);
  this.ui = require('./ui')(mock, this);

  this.model = require('./model')(mock, this);
  this.errors = require('./errors')(mock, this);
  this.auth = require('./auth')(mock, this);
  this.tokens = require('./tokens')(mock, this);
  this.paymentMethods = require('./paymentMethods')(mock, this);
  this.plans = require('./plans')(mock, this);
  this.products = require('./products')(mock, this);
  this.coupons = require('./coupons')(mock, this);
  this.customers = require('./customers')(mock, this);
  this.discounts = require('./discounts')(mock, this);
  this.cards = require('./cards')(mock, this);
  this.subscriptions = require('./subscriptions')(mock, this);
  this.invoices = require('./invoices')(mock, this);
  this.invoiceItems = require('./invoiceItems')(mock, this);
  this.charges = require('./charges')(mock, this);
  this.events = require('./events')(mock, this);
  this.webhooks = require('./webhooks')(mock, this);
  this.clients = require('./clients')(mock, this);
  this.elements = require('./elements')(mock, this);

  ////////////////////

  this.start = (callback) => {
    this.store.loadStore();
    this.parseConfig(mock.config.stripe.organizations);
    return setImmediate(callback);
  };
}

module.exports = (mock) => new Stripe(mock);
