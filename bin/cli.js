#!/usr/bin/env node
'use strict';

require('barrkeep/pp');
const { argv: options } = require('yargs');

const MockServices = require('../lib/mockServices');

let config;
if (options.config) {
  config = require(options.config);
}

const mock = new MockServices(config);
mock.start();
