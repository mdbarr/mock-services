'use strict';

const async = require('async');
const defaults = require('./defaults');

function MockServices (config = {}) {
  this.utils = require('./utils');

  this.config = this.utils.merge(defaults, config);

  this.apiServer = require('./apiServer')(this);

  this.stripe = require('../stripe/stripe')(this);
  this.sendgrid = require('../sendgrid/sendgrid')(this);

  this.start = (callback) => async.series([
    this.apiServer.start,
    this.stripe.start,
    this.sendgrid.start,
  ], callback);
}

module.exports = MockServices;
