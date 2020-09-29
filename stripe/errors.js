'use strict';

function Errors (stripe) {
  this.sendError = function({
    type, code, param, detail, statusCode = 400, message, context,
  }) {
    const response = {
      error: {
        type,
        code: code || null,
        param: param || null,
        message,
        detail: detail || null,
        statusCode,
        decline_code: null,
        charge: null,
        requestId: context.requestId,
      },
    };

    if (!stripe.options.silent) {
      console.log('%s [%s/%s]: %s', stripe.util.colorize('red', 'ERROR'), statusCode, type, message);
    }

    context.send(statusCode, response);
    context.next(false);
  };

  this.apiError = (options) => {
    options.type = 'api_error';
    return this.sendError(options);
  };

  this.authenticationError = (options) => {
    options.type = 'authentication_error';
    return this.sendError(options);
  };

  this.cardError = (options) => {
    options.type = 'card_error';
    return this.sendError(options);
  };

  this.invalidRequestError = (options) => {
    options.type = 'invalid_request_error';
    return this.sendError(options);
  };
}

module.exports = (stripe) => new Errors(stripe);
