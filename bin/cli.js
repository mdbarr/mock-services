#!/usr/bin/env node
'use strict';

const fs = require('fs');
const async = require('async');
const { argv: options } = require('yargs');
const SendgridServer = require('./sendgrid/sendgrid');
const StripeServer = require('./stripe/stripe');

async.parallel([
  (next) => {
    const config = {};
    const configFile = options.config || options.c || './config.json';
    try {
      if (fs.existsSync(configFile)) {
        console.log(`Loading configuration from ${ configFile }...`);
        const data = JSON.parse(fs.readFileSync(configFile));
        Object.assign(config, data);
      }
    } catch (error) {
      console.log('Failed to load configuration', error);
    }

    const sendgridServer = new SendgridServer(options, config);
    sendgridServer.boot(next);
  }, (next) => {
    let config;

    options.config = options.config || options.c || './config.json';
    options.store = options.store || options.s;

    if (!options.store && options.config && fs.existsSync(options.config)) {
      console.log(`Loading config file ${ options.config }...`);
      try {
        config = JSON.parse(fs.readFileSync(options.config));
      } catch (error) {
        console.log('Failed to load config file: ', error.message);
      }
    }

    const stripeServer = new StripeServer(options, config);
    stripeServer.boot(next);
  },
]);
