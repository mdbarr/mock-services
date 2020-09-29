'use strict';

function Auth (stripe) {
  const defaultKey = {
    name: 'default',
    secretKey: /sk_test_.*/,
    publishableKey: /pk_test_.*/,
  };

  this.keyMatch = (key, value) => {
    if (key instanceof RegExp) {
      return key.test(value);
    }
    return key === value;
  };

  this.validateApiKey = (req, res, next) => {
    if (req.authorization) {
      if (req.authorization.scheme === 'Basic') {
        req.authorization.apiKey = req.authorization.basic.username;
      } else if (req.authorization.scheme === 'Bearer') {
        req.authorization.apiKey = req.authorization.credentials;
      }

      if (req.authorization.apiKey) {
        const keys = stripe.store.getKeys();
        for (const identity in keys) {
          if (this.keyMatch(keys[identity].secretKey, req.authorization.apiKey)) {
            req.authorization.identity = identity;
            req.authorization.admin = true;
            return next();
          } else if (this.keyMatch(keys[identity].publishableKey, req.authorization.apiKey)) {
            req.authorization.identity = identity;
            req.authorization.admin = false;
            return next();
          }
        }

        if (this.keyMatch(defaultKey.secretKey, req.authorization.apiKey)) {
          req.authorization.identity = defaultKey.name;
          req.authorization.admin = true;
          return next();
        } else if (this.keyMatch(defaultKey.publishableKey, req.authorization.apiKey)) {
          req.authorization.identity = defaultKey.name;
          req.authorization.admin = false;
          return next();
        }
      }
    }
    const context = stripe.model.context(req, res, next);
    return stripe.errors.invalidRequestError({
      statusCode: 401,
      message: `Invalid API Key provided: ${ req.authorization.apiKey }`,
      context,
    });
  };

  this.requireAdmin = (req, res, next) => {
    const context = stripe.model.context(req, res, next);
    if (!req.authorization || !req.authorization.admin) {
      return stripe.errors.invalidRequestError({
        statusCode: 401,
        message: `Invalid API Key provided: ${ req.authorization.apiKey }`,
        context,
      });
    }
    return next();
  };

  stripe.server.use(this.validateApiKey);
}

module.exports = (stripe) => new Auth(stripe);
