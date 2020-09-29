'use strict';

module.exports = {
  cards: require('./cards.json'),
  plans: {
    intervals: {
      day: 86400,
      week: 604800,
      month: 2592000,
      year: 31536000,
    },
  },
  coupons: { duration: { month: 2592000 } },
  trial: { duration: { day: 86400 } },
};
