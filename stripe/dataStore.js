'use strict';

const fs = require('fs');

function DataStore (stripe) {
  const store = {
    prefix: stripe.util.generateAlphaNumeric(6),
    keys: {},
    cards: {},
    tokens: {},
    plans: {},
    coupons: {},
    customers: {},
    subscriptions: {},
    charges: {},
    invoice_items: {},
    invoices: {},
    discounts: {},
    events: {},
    webhooks: {},
    requests: {},
    counter: 0,
  };

  ////////////////////////////////////////

  stripe.server.get('/data/store', (req, res, next) => {
    res.sendRaw(200, JSON.stringify(store, null, 2));
    return next();
  });

  ////////////////////////////////////////

  this.loadStore = () => {
    try {
      if (stripe.options.store && fs.existsSync(stripe.options.store)) {
        const fileStore = JSON.parse(fs.readFileSync(stripe.options.store));
        Object.assign(store, fileStore);
      }
    } catch (error) {
      console.log('Error loading datastore', error.stack);
    }
  };

  this.writeStore = () => {
    try {
      if (stripe.options.store) {
        fs.writeFileSync(stripe.options.store, JSON.stringify(store, null, 2));
      }
    } catch (error) {
      console.log('Error writing datastore', error.stack);
    }
  };

  ////////////////////////////////////////

  this.generateId = (length) => {
    const id = (store.counter++).toString(16);
    return `${ store.prefix }${ '0'.repeat(length - (id.length + store.prefix.length)) }${ id }`;
  };

  ////////////////////////////////////////

  this.addItem = (container, identity, id, value) => {
    if (!value && typeof id === 'object') {
      value = id;
      id = value.ud;
    }

    if (!container[identity]) {
      container[identity] = {};
    }
    container[identity][id] = value;
  };

  this.getAllItems = (container, identity) => {
    if (!container[identity]) {
      container[identity] = {};
    }
    const results = [];
    for (const id in container[identity]) {
      results.push(container[identity][id]);
    }
    return results.sortByCreated();
  };

  this.getItem = (container, identity, id) => {
    if (!container[identity]) {
      container[identity] = {};
    }
    return container[identity][id];
  };

  this.updateItem = (container, identity, id, object) => {
    if (!container[identity]) {
      container[identity] = {};
    }
    if (container[identity][id]) {
      return stripe.util.updateObject(container[identity][id], object);
    }
    return false;
  };

  this.deleteItem = (container, identity, id) => {
    if (!container[identity]) {
      container[identity] = {};
    }
    if (container[identity][id]) {
      container[identity][id].deleted = true;
      return container[identity][id];
    }
    return false;
  };

  this.findItems = (container, identity, query) => {
    if (!container[identity]) {
      container[identity] = {};
    }

    const results = [];

    for (const itemId in container[identity]) {
      const item = container[identity][itemId];

      let match = true;
      for (const property in query) {
        if (query[property] !== undefined && item[property] !== query[property]) {
          match = false;
          break;
        }
      }

      if (match) {
        results.push(item);
      }
    }

    return results.sortByCreated();
  };

  ////////////////////////////////////////

  this.addKey = (identity, key) => {
    store.keys[identity] = key;
    return key;
  };
  this.getKeys = () => store.keys;

  ////////////////////////////////////////

  this.addCard = (identity, id, card) => this.addItem(store.cards, identity, id, card);
  this.getCard = (identity, id) => this.getItem(store.cards, identity, id);
  this.updateCard = (identity, id, card) => this.updateItem(store.cards, identity, id, card);
  this.deleteCard = (identity, id) => this.deleteItem(store.cards, identity, id);
  this.findCards = (identity, query) => this.findItems(store.cards, identity, query);
  this.getCards = (identity) => this.getAllItems(store.cards, identity);

  this.addToken = (identity, id, token) => this.addItem(store.tokens, identity, id, token);
  this.getToken = (identity, id) => this.getItem(store.tokens, identity, id);
  this.updateToken = (identity, id, token) => this.updateItem(store.tokens, identity, id, token);
  this.getTokens = (identity) => this.getAllItems(store.tokens, identity);

  ////////////////////////////////////////

  this.addPlan = (identity, id, plan) => this.addItem(store.plans, identity, id, plan);
  this.getPlan = (identity, id) => this.getItem(store.plans, identity, id);
  this.updatePlan = (identity, id, plan) => this.updateItem(store.plans, identity, id, plan);
  this.deletePlan = (identity, id) => this.deleteItem(store.plans, identity, id);
  this.getPlans = (identity) => this.getAllItems(store.plans, identity);

  ////////////////////////////////////////

  this.addCoupon = (identity, id, coupon) => this.addItem(store.coupons, identity, id, coupon);
  this.getCoupon = (identity, id) => this.getItem(store.coupons, identity, id);
  this.updateCoupon = (identity, id, coupon) => this.updateItem(store.coupons, identity, id, coupon);
  this.deleteCoupon = (identity, id) => this.deleteItem(store.coupons, identity, id);
  this.getCoupons = (identity) => this.getAllItems(store.coupons, identity);

  ////////////////////////////////////////

  this.addCustomer = (identity, id, customer) => this.addItem(store.customers, identity, id, customer);
  this.getCustomer = (identity, id) => this.getItem(store.customers, identity, id);
  this.updateCustomer = (identity, id, customer) => this.updateItem(store.customers, identity, id, customer);
  this.deleteCustomer = (identity, id) => this.deleteItem(store.customers, identity, id);
  this.getCustomers = (identity) => this.getAllItems(store.customers, identity);

  ////////////////////////////////////////

  this.addSubscription = (identity, id, subscription) =>
    this.addItem(store.subscriptions, identity, id, subscription);
  this.getSubscription = (identity, id) => this.getItem(store.subscriptions, identity, id);
  this.updateSubscription = (identity, id, subscription) =>
    this.updateItem(store.subscriptions, identity, id, subscription);
  this.deleteSubscription = (identity, id) => this.deleteItem(store.subscriptions, identity, id);
  this.getSubscriptions = (identity) => this.getAllItems(store.subscriptions, identity);
  this.findSubscriptions = (identity, query) => this.findItems(store.subscriptions, identity, query);

  ////////////////////////////////////////

  this.addCharge = (identity, id, charge) => this.addItem(store.charges, identity, id, charge);
  this.getCharge = (identity, id) => this.getItem(store.charges, identity, id);
  this.updateCharge = (identity, id, charge) => this.updateItem(store.charges, identity, id, charge);
  this.deleteCharge = (identity, id) => this.deleteItem(store.charges, identity, id);
  this.getCharges = (identity) => this.getAllItems(store.charges, identity);
  this.findCharges = (identity, query) => this.findItems(store.charges, identity, query);

  ////////////////////////////////////////

  this.addInvoiceItem = (identity, id, invoice) =>
    this.addItem(store.invoice_items, identity, id, invoice);
  this.getInvoiceItem = (identity, id) => this.getItem(store.invoice_items, identity, id);
  this.updateInvoiceItem = (identity, id, invoice) =>
    this.updateItem(store.invoice_items, identity, id, invoice);
  this.deleteInvoiceItem = (identity, id) => this.deleteItem(store.invoice_items, identity, id);
  this.getInvoiceItems = (identity) => this.getAllItems(store.invoice_items, identity);
  this.findInvoiceItems = (identity, query) => this.findItems(store.invoice_items, identity, query);

  ////////////////////////////////////////

  this.addInvoice = (identity, id, invoice) => this.addItem(store.invoices, identity, id, invoice);
  this.getInvoice = (identity, id) => this.getItem(store.invoices, identity, id);
  this.updateInvoice = (identity, id, invoice) => this.updateItem(store.invoices, identity, id, invoice);
  this.deleteInvoice = (identity, id) => this.deleteItem(store.invoices, identity, id);
  this.getInvoices = (identity) => this.getAllItems(store.invoices, identity);
  this.findInvoices = (identity, query) => this.findItems(store.invoices, identity, query);

  ////////////////////////////////////////

  this.addDiscount = (identity, id, discount) => this.addItem(store.discounts, identity, id, discount);
  this.getDiscount = (identity, id) => this.getItem(store.discounts, identity, id);
  this.deleteDiscount = (identity, id) => this.deleteItem(store.discounts, identity, id);
  this.findDiscounts = (identity, query) => this.findItems(store.discounts, identity, query);

  ////////////////////////////////////////

  this.addEvent = (identity, id, event) => this.addItem(store.events, identity, id, event);
  this.getEvent = (identity, id) => this.getItem(store.events, identity, id);
  this.getEvents = (identity) => this.getAllItems(store.events, identity);
  this.findEvents = (identity, query) => this.findItems(store.events, identity, query);

  ////////////////////////////////////////

  this.addWebhook = (identity, id, webhook) => this.addItem(store.webhooks, identity, id, webhook);
  this.getWebhook = (identity, id) => this.getItem(store.webhooks, identity, id);
  this.updateWebhook = (identity, id, webhook) => this.updateItem(store.webhooks, identity, id, webhook);
  this.deleteWebhook = (identity, id) => this.deleteItem(store.webhooks, identity, id);
  this.getWebhooks = (identity) => this.getAllItems(store.webhooks, identity);
  this.findWebhooks = (identity, query) => this.findItems(store.webhooks, identity, query);

  ////////////////////////////////////////

  this.addRequest = (request) => {
    store.requests[request.id] = request;
    return request;
  };

  this.getRequests = () => store.requests;

  ////////////////////////////////////////
}

module.exports = (stripe) => new DataStore(stripe);
