'use strict';

const async = require('async');

function MockServices (config = {}) {
  this.config = config;

  this.utils = require('./utils');

  this.apiServer = require('./apiServer')(this);

  this.stripe = require('../stripe/stripe')(this);
  this.sendgrid = require('../sendgrid/sendgrid')(this);

  this.start = (callback) => async.series([
    this.apiServer.start,
    this.stripe.start,
    // this.sendgrid.start,
  ], callback);
}

module.exports = MockServices;
