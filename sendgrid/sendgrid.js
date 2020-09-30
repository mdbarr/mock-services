'use strict';

function Sendgrid (mock) {
  this.config = mock.config.sendgrid;

  this.store = require('./dataStore')(mock, this);

  //////////

  this.webhooks = require('./webhooks')(mock, this);
  this.pipeline = require('./pipeline')(mock, this);
  this.passthrough = require('./passthrough')(mock, this);
  this.messages = require('./messages')(mock, this);

  this.smtp = require('./smtp')(mock, this);
  this.api = require('./api')(mock, this);

  //////////

  this.start = (callback) => {
    if (this.config.users) {
      this.store.addUsers(this.config.users);
    }

    this.smtp.start(callback);
  };
}

module.exports = (mock) => new Sendgrid(mock);
