'use strict';

function StripeServer (mock) {
  this.config = mock.config.stripe;

  this.version = require('../package.json').version;

  this.options = {
    apiVersion: '2017-06-05',
    name: 'mock-stripe-server',
    host: '0.0.0.0',
    port: 5757,
    livemode: false,
    silent: false,
    webhooks: {
      concurrency: 1,
      delay: 0,
    },
  };

  //////////

  this.createUpdateObject = (fields, object, body) => {
    const update = {};
    const previous = {};
    for (const field of fields) {
      if (body[field]) {
        if (typeof object[field] === 'object') {
          previous[field] = clone(object[field]);
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
          target[property] = updateObject(target[property] || {}, source[property], source[property]);
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
    const span = timestamp() - start;
    const used = Math.floor(span / diff * 100);
    const percent = 100 - used;

    return percent;
  };

  this.getDefaultAddress = () => {
    return {
      address: '1 Alewife Center',
      city: 'Cambridge',
      zip: '02140',
      state: 'MA',
      country: 'USA',
    };
  };

  this.getDefaultCreditCard () => {
    return {
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
    };
  };

  this.parseConfig = (configs) => {
    if (!Array.isArray(configs)) {
      configs = [ configs ];
    }

    for (const config of configs) {
      const identity = config.name;

      const context = {
        identity,
        admin: true,
        livemode: toBoolean(config.livemode),
      };

      console.log(`Loading configuration for ${ colorize('bright blue', identity) } organization:`);
      this.store.addKey(identity, {
        secretKey: config.keys.secret,
        publishableKey: config.keys.publishable,
      });

      if (config.plans) {
        for (let plan of config.plans) {
          plan.context = context;
          const amount = `($${ plan.amount / 100 }/${ plan.interval })`;
          console.log(`  Adding plan ${ colorize('bright green', plan.id) } ${ colorize('grey', amount) }`);
          plan = this.model.plan(plan);
        }
      }

      if (config.coupons) {
        for (let coupon of config.coupons) {
          coupon.context = context;
          let amount = coupon.amount_off ? `$${ coupon.amount_off / 100 }` : `${ coupon.percent_off }%`;
          amount = `(${ amount } off)`;
          console.log(`  Adding coupon ${ colorize('bright cyan', coupon.id) } ${ colorize('grey', amount) }`);
          coupon = this.model.coupon(coupon);
        }
      }

      if (config.webhooks) {
        for (let webhook of config.webhooks) {
          webhook.context = context;
          const webhookUrl = url.parse(webhook.url);
          const webhookName = webhook.url.replace(webhookUrl.search, '');
          console.log(`  Adding webhook ${ colorize('bright magenta', webhookName) }`);
          webhook = this.model.webhook(webhook);
        }
      }
    }
  };

  //////////

  this.data = require('../data');

  this.store = require('./dataStore')(this);
  this.ui = require('./ui')(this);

  this.server.use((req, res, next) => {
    const requestId = `req_${ this.store.generateId(24) }`;
    req.requestId = requestId;

    res.header('Request-Id', requestId);
    res.header('mock-stripe-server-version', this.version);
    res.header('Stripe-Version', this.options.apiVersion);

    if (!this.options.silent) {
      this.util.logger(req);
    }
    return next();
  });

  ////////////////////

  this.model = require('./model')(this);
  this.errors = require('./errors')(this);
  this.auth = require('./auth')(this);
  this.tokens = require('./tokens')(this);
  this.plans = require('./plans')(this);
  this.coupons = require('./coupons')(this);
  this.customers = require('./customers')(this);
  this.discounts = require('./discounts')(this);
  this.cards = require('./cards')(this);
  this.subscriptions = require('./subscriptions')(this);
  this.invoices = require('./invoices')(this);
  this.invoiceItems = require('./invoiceItems')(this);
  this.charges = require('./charges')(this);
  this.events = require('./events')(this);
  this.webhooks = require('./webhooks')(this);

  ////////////////////

  Object.assign(this.options, options);

  this.options.livemode = this.util.toBoolean(this.options.livemode);
  this.options.silent = this.util.toBoolean(this.options.silent);

  this.store.loadStore();
  this.util.parseConfig(stripe, mock.config.stripe);

  ////////////////////

  this.boot = (callback) => {
    process.title = this.options.name;
    this.server.listen(this.options.port, this.options.host, (error) => {
      if (!error) {
        console.info('Mock Stripe API Server v%s listening at %s',
          this.version, this.server.url);
      }

      if (callback) {
        return callback(error);
      }

      return true;
    });
  };

  this.close = (callback) => {
    this.server.close(() => {
      this.store.writeStore();
      return callback();
    });
  };

  this.quit = () => {
    console.log('Exiting...');
    this.close(() => {
      process.exit(0);
    });
  };

  ////////////////////

  process.on('SIGINT', () => {
    this.quit();
  });
}

module.exports = StripeServer;
