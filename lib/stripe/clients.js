'use strict';

const fs = require('node:fs/promises');
const errors = require('restify-errors');
const { basename, extname } = require('node:path');

const safeFileRegExp = /^[a-zA-Z0-9][a-zA-Z0-9\-_.]+\.(css|html|js|json|svg)$/;

function Clients (mock) {
  const cache = new Map();

  const loadFile = async (filename) => {
    if (cache.has(filename)) {
      return cache.get(filename);
    }

    let data = await fs.readFile(`${ __dirname }/data/${ filename }`);
    data = data.toString().replace(/__BASE_URL__/g, mock.config.baseUrl);
    cache.set(filename, data);
    return data;
  };

  const mimeType = (file) => {
    const extension = extname(file);

    switch (extension) {
      case '.css':
        return 'text/css';
      case '.html':
        return 'text/html';
      case '.js':
        return 'text/javascript';
      case '.svg':
        return 'image/svg+xml';
      default:
        return 'text/plain';
    }
  };

  mock.api.get('/stripe/v2', async (req, res) => {
    const client = await loadFile('v2/stripe.js');

    res.setHeader('Content-Type', 'text/javascript');
    res.sendRaw(200, client);
  });

  mock.api.get('/stripe/v2/*', async (req, res) => {
    const file = basename(req.params['*'] || 'stripe.js');

    if (!safeFileRegExp.test(file)) {
      throw new errors.NotFoundError(`${ file } not found`);
    }

    const data = await loadFile(`v2/${ file }`);

    res.setHeader('Content-Type', mimeType(file));
    res.sendRaw(200, data);
  });

  mock.api.get('/stripe/v3', async (req, res) => {
    const client = await loadFile('v3/stripe.js');

    res.setHeader('Content-Type', 'text/javascript');
    res.sendRaw(200, client);
  });

  mock.api.get('/stripe/v3/*', async (req, res) => {
    const file = basename(req.params['*'] || 'stripe.js');

    if (!safeFileRegExp.test(file)) {
      throw new errors.NotFoundError(`${ file } not found`);
    }

    const data = await loadFile(`v3/${ file }`);

    res.setHeader('Content-Type', mimeType(file));
    res.sendRaw(200, data);
  });

  //////////

  mock.api.post('/stripe/m/:id', async (req, res) => {
    res.send(200, { ok: true });
  });

  mock.api.post('/stripe/r/:id', async (req, res) => {
    res.send(200, { ok: true });
  });
}

module.exports = (mock, stripe) => new Clients(mock, stripe);
