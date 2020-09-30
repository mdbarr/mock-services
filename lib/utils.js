'use strict';

const crypto = require('crypto');
const { sha1 } = require('barrkeep/utils');
const colorize = require('barrkeep/colorize');

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

function clone (obj) {
  return JSON.parse(JSON.stringify(obj));
}

function timestamp () {
  return Math.floor(Date.now() / 1000);
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

//////////////////////////////

module.exports = {
  clone,
  colorize,
  createUpdateObject,
  generateAlphaNumeric,
  generateUniqueId,
  rand,
  sha1,
  timestamp,
  toBoolean,
  ucFirst,
};
