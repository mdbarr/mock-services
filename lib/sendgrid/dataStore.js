'use strict';

function DataStore (mock, sendgrid) {
  const store = {
    prefix: mock.utils.generateAlphaNumeric(6),

    users: [],
    webhooks: {},

    messages: {},
    index: {},

    counter: 0,
  };

  this.clear = () => {
    store.prefix = mock.utils.generateAlphaNumeric(6);
    store.users = [];
    store.webhooks = {};
    store.messages = {};
    store.index = {};
    store.counter = 0;

    if (sendgrid.config.users) {
      this.addUsers(sendgrid.config.users);
    }
  };

  this.generateId = (length) => {
    const id = (store.counter++).toString(16);
    return `${ store.prefix }${ '0'.repeat(length - (id.length + store.prefix.length)) }${ id }`;
  };

  this.ensureArray = (map, property) => {
    if (!Array.isArray(map[property])) {
      map[property] = [];
    }
    return map[property];
  };

  this.addUser = (user) => {
    user.name = user.name || user.username;

    if (Array.isArray(user.webhooks)) {
      store.webhooks[user.name] = user.webhooks;
    }

    if (!Array.isArray(user.domains) || !user.domains.length) {
      user.domains = [ '*' ];
    }

    for (let i = 0; i < user.domains.length; i++) {
      const domain = user.domains[i];
      if (domain !== '*' && !domain.startsWith('@')) {
        user.domains[i] = `@${ domain }`;
      }
    }

    return store.users.push(user);
  };

  this.addUsers = (users) => {
    users.forEach((user) => {
      user.webhooks = user.webhooks || [];

      sendgrid.log.info('Adding user %s with %d webhooks, passthrough %s.',
        mock.utils.colorize('cyan', user.name),
        user.webhooks.length,
        user.passthrough ? 'enabled' : 'disabled');
      this.addUser(user);
    });
  };

  this.getUsers = () => store.users;

  this.getWebhooks = (user) => this.ensureArray(store.webhooks, user);

  this.addMessage = (to, message) => {
    store.index[message.id] = message;
    return this.ensureArray(store.messages, to).push(message).length;
  };

  this.getMessage = (to, index) => {
    this.ensureArray(store.messages, to);

    index = index !== undefined ? index : store.messages[to].length - 1;

    return store.messages[to][index];
  };

  this.getMessageById = (id) => store.index[id];

  this.getMessages = (to) => this.ensureArray(store.messages, to);

  this.getMessageStore = () => store.messages;

  this.popMessage = (to) => this.ensureArray(store.messages, to).shift();

  this.popMessages = (to) => {
    const messages = this.ensureArray(store.messages, to);
    store.messsages[to] = [];
    return messages;
  };
}

module.exports = (mock, sendgrid) => new DataStore(mock, sendgrid);
