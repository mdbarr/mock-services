'use strict';

const fs = require('fs');
const path = require('path');
const escapeRE = require('escape-regexp-component');

const assert = require('assert-plus');
const mime = require('mime');
const errors = require('restify-errors');

const MethodNotAllowedError = errors.MethodNotAllowedError;
const NotAuthorizedError = errors.NotAuthorizedError;
const ResourceNotFoundError = errors.ResourceNotFoundError;

function serveStatic (options) {
  const opts = options || {};

  if (typeof opts.appendRequestPath === 'undefined') {
    opts.appendRequestPath = true;
  }

  assert.object(opts, 'options');
  assert.string(opts.directory, 'options.directory');
  assert.optionalNumber(opts.maxAge, 'options.maxAge');
  assert.optionalObject(opts.match, 'options.match');
  assert.optionalString(opts.charSet, 'options.charSet');
  assert.optionalString(opts.file, 'options.file');
  assert.bool(opts.appendRequestPath, 'options.appendRequestPath');

  const p = path.normalize(opts.directory).replace(/\\/g, '/');
  const re = new RegExp(`^${ escapeRE(p) }/?.*`);

  // eslint-disable-next-line max-params
  function serveFileFromStats (file, err, stats, isGzip, req, res, next) {
    if (typeof req.closed === 'function' && req.closed()) {
      next(false);
      return;
    }

    if (err) {
      next(new ResourceNotFoundError(err, '%s', req.path()));
      return;
    } else if (!stats.isFile()) {
      next(new ResourceNotFoundError('%s does not exist', req.path()));
      return;
    }

    if (res.handledGzip && isGzip) {
      res.handledGzip();
    }

    const fstream = fs.createReadStream(file + (isGzip ? '.gz' : ''));
    const maxAge = opts.maxAge === undefined ? 3600 : opts.maxAge;
    fstream.once('open', () => {
      res.cache({ maxAge });
      res.set('Content-Length', stats.size);
      res.set('Content-Type', mime.getType(file));
      res.set('Last-Modified', stats.mtime);

      if (opts.charSet) {
        const type = `${ res.getHeader('Content-Type') }; charset=${ opts.charSet }`;
        res.setHeader('Content-Type', type);
      }

      if (opts.etag) {
        res.set('ETag', opts.etag(stats, opts));
      }
      res.writeHead(200);
      fstream.pipe(res);
      fstream.once('close', () => {
        next(false);
      });
    });

    res.once('close', () => {
      fstream.close();
    });
  }

  function serveNormal (file, req, res, next) {
    fs.stat(file, (err, stats) => {
      if (err && opts.fallback) {
        // Serve the fallback file in the specified directory
        const filePath = path.join(opts.directory, opts.fallback);
        fs.stat(filePath, (dirErr, dirStats) => {
          serveFileFromStats(
            filePath,
            dirErr,
            dirStats,
            false,
            req,
            res,
            next,
          );
        });
      } else if (!err && stats.isDirectory() && opts.default) {
        // Serve an index.html page or similar
        const filePath = path.join(file, opts.default);
        fs.stat(filePath, (dirErr, dirStats) => {
          serveFileFromStats(
            filePath,
            dirErr,
            dirStats,
            false,
            req,
            res,
            next,
          );
        });
      } else {
        serveFileFromStats(file, err, stats, false, req, res, next);
      }
    });
  }

  function serve (req, res, next) {
    let file;

    if (opts.file) {
      // serves a direct file
      file = path.join(opts.directory, decodeURIComponent(opts.file));
    } else if (opts.appendRequestPath) {
      file = path.join(opts.directory, decodeURIComponent(req.path()));
    } else {
      const dirBasename = path.basename(opts.directory);
      const reqpathBasename = path.basename(req.path());

      if (
        path.extname(req.path()) === '' &&
                dirBasename === reqpathBasename
      ) {
        file = opts.directory;
      } else {
        file = path.join(
          opts.directory,
          decodeURIComponent(path.basename(req.path())),
        );
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next(new MethodNotAllowedError('%s', req.method));
      return;
    }

    if (!re.test(file.replace(/\\/g, '/'))) {
      next(new NotAuthorizedError('%s', req.path()));
      return;
    }

    if (opts.match && !opts.match.test(file)) {
      next(new NotAuthorizedError('%s', req.path()));
      return;
    }

    if (opts.gzip && req.acceptsEncoding('gzip')) {
      fs.stat(`${ file }.gz`, (err, stats) => {
        if (!err) {
          res.setHeader('Content-Encoding', 'gzip');
          serveFileFromStats(file, err, stats, true, req, res, next);
        } else {
          serveNormal(file, req, res, next);
        }
      });
    } else {
      serveNormal(file, req, res, next);
    }
  }

  return serve;
}

module.exports = serveStatic;
