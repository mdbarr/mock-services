'use strict';

function UI (mock, stripe) {
  ////////////////////

  this.listResponse = (title, fields, list) => {
    const headers = fields.map((item) => ({
      text: mock.utils.ucFirst(item),
      value: item,
    }));

    const response = {
      title,
      headers,
      items: list,
    };

    return response;
  };

  ////////////////////

  mock.api.get('/api/mock/stripe/orgs', (req, res, next) => {
    const response = [ 'default', ...Object.keys(stripe.store.getKeys()) ];
    res.send(200, response);
    return next();
  });

  mock.api.get('/api/mock/stripe/organizations', (req, res, next) => {
    const keys = stripe.store.getKeys();
    const keyList = Object.keys(keys).map((item) => Object.assign({ id: item }, keys[item]));

    const list = [
      {
        id: 'default',
        secretKey: 'sk_test_*',
        publishableKey: 'pk_test_*',
      }, ...keyList,
    ];

    res.send(200, this.listResponse('Organizations',
      [ 'id', 'secretKey', 'publishableKey' ],
      list));
    return next();
  });

  mock.api.get('/api/mock/stripe/plans/:organization', (req, res, next) => {
    const fields = [ 'id', 'name', 'amount', 'interval', 'created' ];
    const items = stripe.store.getPlans(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Plans', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/coupons/:organization', (req, res, next) => {
    const fields = [ 'id', 'amount_off', 'percent_off', 'duration', 'created' ];
    const items = stripe.store.getCoupons(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Coupons', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/tokens/:organization', (req, res, next) => {
    const fields = [ 'id', 'card', 'used', 'created' ];
    const items = stripe.store.getTokens(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Tokens', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/cards/:organization', (req, res, next) => {
    const fields = [ 'id', 'customer', 'last4', 'brand' ];
    const items = stripe.store.getCards(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Cards', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/customers/:organization', (req, res, next) => {
    const fields = [ 'id', 'description', 'account_balance', 'email', 'created' ];
    const items = stripe.store.getCustomers(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Customers', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/subscriptions/:organization', (req, res, next) => {
    const fields = [
      'id', 'customer', 'plan', 'quantity', 'current_period_start',
      'current_period_end', 'created',
    ];
    const items = stripe.store.getSubscriptions(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Subscriptions', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/invoices/:organization', (req, res, next) => {
    const fields = [
      'id', 'customer', 'subscription',
      'charge', 'total', 'paid', 'date',
    ];
    const items = stripe.store.getInvoices(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Invoices', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/charges/:organization', (req, res, next) => {
    const fields = [ 'id', 'customer', 'invoice', 'source', 'amount', 'paid', 'created' ];
    const items = stripe.store.getCharges(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Charges', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/events/:organization', (req, res, next) => {
    const fields = [ 'id', 'type', 'created' ];
    const items = stripe.store.getEvents(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Events', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/webhooks/:organization', (req, res, next) => {
    const fields = [ 'id', 'url', 'events', 'sharedSecret', 'created' ];
    const items = stripe.store.getWebhooks(req.params.organization).map((value) => {
      const item = {};
      fields.forEach((field) => {
        item[field] = value[field];
      });
      return item;
    });

    res.send(200, this.listResponse('Webhooks', fields, items));
    return next();
  });

  mock.api.get('/api/mock/stripe/requests', (req, res, next) => {
    const requests = stripe.store.getRequests();
    const requestList = Object.keys(requests).map((item) => {
      item = requests[item];
      return {
        id: item.id,
        timestamp: item.timestamp,
        method: item.method,
        url: item.url,
        statusCode: item.statusCode,
      };
    });

    requestList.sortByCreated();

    res.send(200, this.listResponse('Requests',
      [ 'id', 'timestamp', 'method', 'url', 'statusCode' ],
      requestList));
    return next();
  });

  mock.api.get('/api/mock/stripe/:type/:organization/:id', (req, res, next) => {
    let item = {};
    switch (req.params.type) {
      case 'plan':
        item = stripe.store.getPlan(req.params.organization, req.params.id);
        break;
      case 'coupon':
        item = stripe.store.getCoupon(req.params.organization, req.params.id);
        break;
      case 'token':
        item = stripe.store.getToken(req.params.organization, req.params.id);
        break;
      case 'card':
        item = stripe.store.getCard(req.params.organization, req.params.id);
        break;
      case 'customer':
        item = stripe.store.getCustomer(req.params.organization, req.params.id);
        break;
      case 'subscription':
        item = stripe.store.getSubscription(req.params.organization, req.params.id);
        break;
      case 'invoice':
        item = stripe.store.getInvoice(req.params.organization, req.params.id);
        break;
      case 'charge':
        item = stripe.store.getCharge(req.params.organization, req.params.id);
        break;
      case 'event':
        item = stripe.store.getEvent(req.params.organization, req.params.id);
        break;
      case 'webhook':
        item = stripe.store.getWebhook(req.params.organization, req.params.id);
        break;
      case 'request':
        item = stripe.store.getRequests()[req.params.id];
        break;
    }

    res.send(200, item);
    return next();
  });

  ////////////////////
}

module.exports = (mock, stripe) => new UI(mock, stripe);
