#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { argv: options } = require('yargs');
const MockServices = require('../lib/mockServices');

let config;
if (options.config) {
  config = JSON.parse(fs.readFileSync(options.config));
}

const mock = new MockServices(config);
mock.start();
