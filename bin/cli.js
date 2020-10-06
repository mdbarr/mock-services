#!/usr/bin/env node
'use strict';

require('barrkeep/pp');
const { resolve } = require('path');
const { argv: options } = require('yargs');

const MockServices = require('../lib/mockServices');

const config = options.config ? require(resolve(process.cwd(), options.config)) : undefined;

const mock = new MockServices(config);
mock.start();
