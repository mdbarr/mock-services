'use strict';

const async = require('async');
const defaults = require('./defaults');

function MockServices (config = {}) {
  this.utils = require('./utils');

  this.config = this.utils.merge(defaults, config);

  this.log = require('./logger')(this.config.logs);

  this.apiServer = require('./apiServer')(this);

  const services = [ this.apiServer.start ];

  if (this.config.dns.enabled) {
    this.dns = require('./dns/dns')(this);
    services.push(this.dns.start);
  }

  if (this.config.geoip.enabled) {
    this.geoip = require('./geoip/geoip')(this);
    services.push(this.geoip.start);
  }

  if (this.config.sendgrid.enabled) {
    this.sendgrid = require('./sendgrid/sendgrid')(this);
    services.push(this.sendgrid.start);
  }

  if (this.config.stripe.enabled) {
    this.stripe = require('./stripe/stripe')(this);
    services.push(this.stripe.start);
  }

  if (this.config.webhook.enabled) {
    this.webhook = require('./webhook/webhook')(this);
    services.push(this.webhook.start);
  }

  this.start = (callback) => async.series(services, callback);
}

module.exports = MockServices;
