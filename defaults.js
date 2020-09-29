'use strict';

module.exports = {
  sendgrid: {
    allowUnauthorized: true,
    smtpPort: 5870,
    apiPort: 5871,
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
    name: 'Default',
    livemode: false,
    keys: {
      secret: 'sk_test_a28286383674d872787a8807',
      publishable: 'pk_test_c8965c3f05e66f325b055db6',
    },
    plans: [
      {
        amount: '5000',
        interval: 'year',
        name: 'Default Yearly',
        currency: 'usd',
        statement_descriptor: 'Default Yearly Plan',
        id: 'DEFAULT_YEAR',
      },
    ],
  },
};
