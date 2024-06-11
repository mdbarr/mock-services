'use strict';

const fs = require('fs');
const restify = require('restify');
const { basename, resolve } = require('path');
const corsMiddleware = require('restify-cors-middleware2');
const serveStatic = require('./static');

function ApiServer (mock) {
  this.config = {
    ignoreTrailingSlash: true,
    name: 'Mock Services',
    strictNext: true,
  };

  if (mock.config.certificate && mock.config.key) {
    this.config.certificate = fs.readFileSync(resolve(process.cwd(), mock.config.certificate));
    this.config.key = fs.readFileSync(resolve(process.cwd(), mock.config.key));

    mock.log.info(`Secure certificate loaded from ${ basename(mock.config.certificate) }`);
  }

  mock.api = restify.createServer(this.config);

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

  mock.api.on('NotFound', (req, res, error, next) => {
    mock.log.error(`NotFound ${ req.method } ${ req.url }: ${ error }`);
    return next();
  });

  mock.api.on('MethodNotAllowed', (req, res, error, next) => {
    mock.log.error(`MethodNotAllowed ${ req.method } ${ req.url }: ${ error }`);
    return next();
  });

  //////////

  mock.api.get('/css/*', serveStatic({
    directory: './dist',
    default: 'index.html',
    fallback: 'index.html',
  }));

  mock.api.get('/js/*', serveStatic({
    directory: './dist',
    default: 'index.html',
    fallback: 'index.html',
  }));

  mock.api.get('/', serveStatic({
    directory: './dist',
    file: 'index.html',
  }));

  //////////

  this.start = (callback) => {
    mock.api.listen(mock.config.port, mock.config.host, (error) => {
      if (error) {
        return callback(error);
      }

      mock.log.info(`${ mock.api.name } API listening on ${ mock.api.url }`);

      return callback();
    });
  };
}

module.exports = (mock) => new ApiServer(mock);
