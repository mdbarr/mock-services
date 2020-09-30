'use strict';

const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware');

function ApiServer (mock) {
  mock.api = restify.createServer({
    ignoreTrailingSlash: true,
    name: 'Mock Services',
    strictNext: true,
  });

  //////////

  this.cors = corsMiddleware({
    origins: [ '*' ],
    allowHeaders: [ 'Authorization' ],
    exposeHeaders: [ 'Authorization' ],
  });

  mock.api.pre(this.cors.preflight);
  mock.api.use(this.cors.actual);

  //////////

  mock.api.use(restify.pre.sanitizePath());
  mock.api.use(restify.plugins.bodyParser());
  mock.api.pre(restify.plugins.pre.dedupeSlashes());
  mock.api.use(restify.plugins.dateParser());
  mock.api.use(restify.plugins.queryParser());
  mock.api.use(restify.plugins.authorizationParser());

  //////////

  this.start = (callback) => {
    mock.api.listen(callback);
  };
}

module.exports = (mock) => new ApiServer(mock);
