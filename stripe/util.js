'use strict';

const url = require('url');
const crypto = require('crypto');

//////////////////////////////

Object.defineProperty(Array.prototype, 'findById', {
  value (id) {
    for (const obj of this) {
      if (obj.id && obj.id === id) {
        return obj;
      }
    }
    return undefined;
  },
  enumerable: false,
});

Object.defineProperty(Array.prototype, 'sortByCreated', {
  value () {
    return this.sort((a, b) => {
      const aCreated = a.created || a.date || a.timestamp;
      const bCreated = b.created || b.date || b.timestamp;
      if (aCreated > bCreated) {
        return -1;
      } else if (aCreated < bCreated) {
        return 1;
      }
      if (a.id > b.id) {
        return -1;
      } else if (a.id < b.id) {
        return 1;
      }
      return 0;
    });
  },
  enumerable: false,
});

//////////////////////////////

function rand (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ucFirst (string) {
  return string[0].toUpperCase() + string.slice(1);
}

function generateAlphaNumeric (length) {
  const possibleAlphaNumerics = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
  let generated = '';
  for (let i = 0; i < length; i++) {
    generated += possibleAlphaNumerics.charAt(rand(0, possibleAlphaNumerics.length - 1));
  }
  return generated;
}

function generateUniqueId (length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex');
}

function getSHA1Hex (input) {
  if (typeof input !== 'string') {
    input = JSON.stringify(input);
  }
  return crypto.createHash('sha1').update(input).
    digest('hex');
}

function clone (obj) {
  return JSON.parse(JSON.stringify(obj));
}

function timestamp () {
  return Math.floor(Date.now() / 1000);
}

const colors = {
  'black': 30,
  'red': 31,
  'green': 32,
  'yellow': 33,
  'blue': 34,
  'magenta': 35,
  'cyan': 36,
  'white': 37,

  'gray': 90,
  'grey': 90,
  'bright red': 91,
  'bright green': 92,
  'bright yellow': 93,
  'bright blue': 94,
  'bright magenta': 95,
  'bright cyan': 96,
  'bright white': 97,
};

function colorize (name, string) {
  if (global && global.flags && global.flags.noColor ||
      process.stdout && !process.stdout.isTTY) {
    return string;
  }

  const color = colors[name] || colors.gray;
  return `\u001b[${ color }m${ string }\u001b[0m`;
}

console.json = (json, printNonEnumerables) => prettyPrint(json, {
  all: printNonEnumerables,
  print: true,
});

function prettyPrint (object, { all = false, print = true } = {}) {
  function indent (depth) {
    return '  '.repeat(depth + 1);
  }

  function prettyPrinter (value, depth, overrideColor) {
    let line = indent(depth);
    if (typeof value === 'string') {
      line += colorize(overrideColor || 'green', `"${ value }"`);
    } else if (typeof value === 'number') {
      line += colorize(overrideColor || 'yellow', value);
    } else if (typeof value === 'boolean') {
      line += colorize(overrideColor || 'cyan', value);
    } else if (value === undefined || value === null) {
      line += colorize(overrideColor || 'magenta', value);
    } else if (value instanceof Date || value instanceof RegExp ||
               typeof value === 'function') {
      line += colorize('blue', value.toString());
    } else if (Array.isArray(value)) {
      line += '[';
      if (value.length) {
        line += '\n';
      }

      depth++;
      for (let i = 0; i < value.length; i++) {
        const comma = i < value.length - 1 ? ',' : '';
        line += `${ prettyPrinter(value[i], depth) + comma }\n`;
      }
      depth--;
      line += `${ indent(depth) }]`;
    } else if (typeof value === 'object') {
      line += '{';
      let keys = Object.getOwnPropertyNames(value);
      if (keys.length) {
        line += '\n';
      }

      const enumerables = {};
      keys = keys.filter((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        enumerables[key] = descriptor.enumerable;
        return descriptor.enumerable === true || all === true;
      });

      depth++;
      for (let j = 0; j < keys.length; j++) {
        const key = keys[j];
        const comma = j < keys.length - 1 ? ',' : '';
        const keyColor = enumerables[key] ? 'gray' : 'red';
        line += `${ prettyPrinter(key, depth, keyColor) }: `;
        line += `${ prettyPrinter(value[key], depth) + comma }\n`;
      }
      depth--;
      line += `${ indent(depth) }}`;
    } else {
      line += colorize('bright red', value.toString());
    }

    return line.replace(/:\s+/g, ': ').
      replace(/([{[])\s+([}\]])/g, '$1$2');
  }

  const output = prettyPrinter(object, 0);

  if (print !== false) {
    console.log(output);
  }
  return output;
}

function toBoolean (value) {
  if (typeof value === 'string') {
    switch (value.toLowerCase()) {
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        return false;
    }
  } else {
    return Boolean(value);
  }
}

function createUpdateObject (fields, object, body) {
  const update = {};
  const previous = {};
  for (const field of fields) {
    if (body[field]) {
      if (typeof object[field] === 'object') {
        previous[field] = clone(object[field]);
      } else {
        previous[field] = object[field];
      }
      update[field] = body[field];
    }
  }
  return [ update, previous ];
}

function updateObject (target, source, authority) {
  authority = authority || target;
  for (const property in authority) {
    if (source[property] !== undefined) {
      if (source[property] && typeof source[property] === 'object') {
        target[property] = updateObject(target[property] || {}, source[property], source[property]);
      } else {
        let value = source[property];
        if (value === '' || value === undefined) {
          value = null;
        }
        target[property] = value;
      }
    }
  }
  return target;
}

function calculateProrationPercent (start, end) {
  const diff = end - start;
  const span = timestamp() - start;
  const used = Math.floor(span / diff * 100);
  const percent = 100 - used;

  return percent;
}

//////////////////////////////

function getDefaultAddress () {
  return {
    address: '1 Alewife Center',
    city: 'Cambridge',
    zip: '02140',
    state: 'MA',
    country: 'USA',
  };
}

function getDefaultCreditCard () {
  return {
    number: '4242424242424242',
    exp_month: 12,
    exp_year: new Date().getFullYear() + 2,
    cvc: '123',
    address_line1: '1 Alewife Center',
    address_line2: 'Suite 130',
    address_city: 'Cambridge',
    address_state: 'MA',
    address_zip: '02140',
    address_country: 'US',
  };
}

//////////////////////////////

function logger (req) {
  console.log(req.method, req.url, req.params, req.query);

  if (req.authorization) {
    console.json(req.authorization);
  }
  if (req.headers) {
    console.json(req.headers);
  }
  if (req.authorization) {
    console.json(req.authorization);
  }
  if (req.body) {
    console.json(req.body);
  }
}

//////////////////////////////

function parseConfig (stripe, configs) {
  if (!Array.isArray(configs)) {
    configs = [ configs ];
  }

  for (const config of configs) {
    const identity = config.name;

    const context = {
      identity,
      admin: true,
      livemode: toBoolean(config.livemode),
    };

    console.log(`Loading configuration for ${ colorize('bright blue', identity) } organization:`);
    stripe.store.addKey(identity, {
      secretKey: config.keys.secret,
      publishableKey: config.keys.publishable,
    });

    if (config.plans) {
      for (let plan of config.plans) {
        plan.context = context;
        const amount = `($${ plan.amount / 100 }/${ plan.interval })`;
        console.log(`  Adding plan ${ colorize('bright green', plan.id) } ${ colorize('grey', amount) }`);
        plan = stripe.model.plan(plan);
      }
    }

    if (config.coupons) {
      for (let coupon of config.coupons) {
        coupon.context = context;
        let amount = coupon.amount_off ? `$${ coupon.amount_off / 100 }` : `${ coupon.percent_off }%`;
        amount = `(${ amount } off)`;
        console.log(`  Adding coupon ${ colorize('bright cyan', coupon.id) } ${ colorize('grey', amount) }`);
        coupon = stripe.model.coupon(coupon);
      }
    }

    if (config.webhooks) {
      for (let webhook of config.webhooks) {
        webhook.context = context;
        const webhookUrl = url.parse(webhook.url);
        const webhookName = webhook.url.replace(webhookUrl.search, '');
        console.log(`  Adding webhook ${ colorize('bright magenta', webhookName) }`);
        webhook = stripe.model.webhook(webhook);
      }
    }
  }
}

//////////////////////////////

module.exports = {
  calculateProrationPercent,
  clone,
  colorize,
  createUpdateObject,
  generateAlphaNumeric,
  generateUniqueId,
  getDefaultAddress,
  getDefaultCreditCard,
  getSHA1Hex,
  logger,
  parseConfig,
  prettyPrint,
  rand,
  timestamp,
  toBoolean,
  ucFirst,
  updateObject,
};
