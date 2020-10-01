'use strict';

module.exports = {
  host: '0.0.0.0',
  port: 5775,
  dns: {
    port: 53,
    host: '0.0.0.0',
    nameservers: [
      '8.8.8.8',
      '1.1.1.1',
    ],
    servers: { },
    domains: { 'dev': '127.0.0.1' },
    hosts: { 'devlocal': '127.0.0.1' },
    fallback_timeout: 350,
    reload_config: true,
    api: 'dns-proxy-t7w!184$A6*55WI',
  },
  logs: {
    level: 'info',
    console: true,
    combined: 'mock-services.log',
    error: 'error.log',
  },
  sendgrid: {
    name: 'mock-services-sendgrid',
    allowUnauthorized: true,
    smtpPort: 5870,
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
        webhooks: [ ],
      },
    ],
  },
  stripe: {
    name: 'Default Organization',
    livemode: false,
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
};
