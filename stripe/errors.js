'use strict';

function Errors (mock, stripe) {
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

    stripe.log.error('%s [%s/%s]: %s', mock.utils.colorize('red', 'ERROR'), statusCode, type, message);

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

module.exports = (mock, stripe) => new Errors(mock, stripe);
