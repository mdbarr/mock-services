'use strict';

module.exports = {
  name: 'mock-services',
  version: require('../package').version,
  host: '0.0.0.0',
  port: 8480,
  dns: {
    enabled: true,
    port: 8453,
    nameservers: [
      '8.8.8.8',
      '1.1.1.1',
    ],
    records: {
      A: { 'devlocal': '127.0.0.1' },
      AAAA: { 'devlocal': '::1' },
      CNAME: { 'mydevlocal': 'devlocal' },
      MX: {
        devlocal: {
          preference: 10,
          exchange: 'mail.devlocal',
        },
      },
      PTR: { '127.0.0.1': 'devlocal' },
      SRV: {},
      TXT: {},
    },
    ttl: 300,
    api: 'dns-proxy-7e84f18a0719',
    cache: {
      ttl: 300000,
      reap: 10000,
    },
  },
  logs: {
    level: 'info',
    console: true,
    combined: 'mock-services.log',
    error: 'error.log',
  },
  sendgrid: {
    enabled: true,
    allowUnauthorized: true,
    smtpPort: 8425,
    behaviors: {
      reject: '+should+reject+',
      drop: '+should+drop+',
      bounce: '+should+bounce+',
      defer: '+should+defer+',
      open: '+should+open+',
      click: '+should+click+',
      unsubscribe: '+should+unsubscribe+',
      spam: '+should+spam+',
    },
    webhooks: {
      delay: 250,
      concurrency: 1,
    },
    users: [
      {
        name: 'Default',
        username: 'a28286383674d872787a8807',
        password: 'c8965c3f05e66f325b055db6',
        domains: [ '*' ],
        webhooks: [ ],
      },
    ],
  },
  stripe: {
    enabled: true,
    apiVersion: '2017-06-05',
    livemode: false,
    webhooks: {
      concurrency: 1,
      delay: 0,
    },
    organizations: [
      {
        name: 'Default Organization',
        keys: {
          secret: 'sk_test_a28286383674d872787a8807',
          publishable: 'pk_test_c8965c3f05e66f325b055db6',
        },
        plans: [
          {
            amount: '500',
            interval: 'year',
            name: 'Default Yearly',
            currency: 'usd',
            statement_descriptor: 'Default Yearly Plan',
            id: 'DEFAULT_YEARLY',
          },
        ],
      },
    ],
  },
};
