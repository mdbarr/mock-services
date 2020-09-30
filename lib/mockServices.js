'use strict';

function MockServices (config = {}) {
  this.config = config;

  this.utils = require('./utils');

  this.apiServer = require('./apiServer')(this);

  this.stripe = require('../stripe')(this);
  this.sendgrid = require('../sendgrid')(this);

  this.start = (callback) => {
    return callback(null);
  };
}

module.exports = MockServices;
