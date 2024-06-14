'use strict';

const xml2js = require('xml2js');
const { readFile } = require('node:fs/promises');
const { X509Certificate } = require('node:crypto');

function IdentityProvider (mock) {
  this.config = mock.config.idp;
  this.log = mock.log.child({ service: 'idp' });

  this.baseUrl = `${ mock.config.baseUrl }/idp`;

  this.responses = require('./responses');

  mock.api.get('/idp/metadata', async (req, res) => {
    const validUntil = new Date(Date.now() + mock.utils.milliseconds('1y')).toISOString();
    const certificate = this.config.x509.toString().
      replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').
      replace(/\s/g, '');

    const metadata = this.responses.metadata({
      id: this.config.id,
      baseUrl: this.baseUrl,
      validUntil,
      certificate,
    });

    const headers = {
      'Content-Length': Buffer.byteLength(metadata),
      'Content-Type': 'application/xml',
    };

    if ('download' in req.query) {
      headers['Content-Disposition'] = 'Attachment; filename=mock-services-idp-metadata.xml';
    }

    res.writeHead(200, headers);
    res.write(metadata);
    res.end();
  });

  mock.api.post('/idp/sso', async (req, res) => {
    const request = Buffer.from(req.body.SAMLRequest, 'base64').toString();
    const body = await this.parser.parseStringPromise(request);

    const data = body['saml2p:AuthnRequest'].$;
    const relay = req.body.RelayState;

    const html = this.responses.login({
      baseUrl: this.baseUrl,
      requestId: data.ID,
      instant: data.IssueInstant,
      spUrl: data.AssertionConsumerServiceURL,
      issuer: body['saml2p:AuthnRequest']['saml2:Issuer'][0]._,
      relay,
    });

    const headers = {
      'Content-Length': Buffer.byteLength(html),
      'Content-Type': 'text/html',
    };

    res.writeHead(200, headers);
    res.write(html);
    res.end();
  });

  mock.api.post('/idp/sso/auth', async (req, res) => {
    const response = this.responses.response({
      certificate: this.config.certificate,
      key: this.config.key,
      requestId: req.body.requestId,
      issuer: req.body.issuer,
      baseUrl: this.baseUrl,
      instant: req.body.instant,
      spUrl: req.body.spUrl,
      email: req.body.email,
      name: req.body.name || req.body.email,
    });

    this.log.info(`authenticating user ${ req.body.email } for ${ req.body.issuer }`);

    const html = this.responses.postForm(req.body.spUrl, [
      {
        name: 'RelayState',
        value: req.body.relay,
      }, {
        name: 'SAMLResponse',
        value: Buffer.from(response).toString('base64'),
      },
    ]);

    const headers = {
      'Content-Length': Buffer.byteLength(html),
      'Content-Type': 'text/html',
    };

    res.writeHead(200, headers);
    res.write(html);
    res.end();
  });

  mock.api.get('/idp/certificate', async (req, res) => {
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(this.config.certificate),
      'Content-Type': 'text/plain',
    });
    res.write(this.config.certificate);
    res.end();
  });

  mock.api.get('/idp/key', async (req, res) => {
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(this.config.key),
      'Content-Type': 'text/plain',
    });
    res.write(this.config.key);
    res.end();
  });

  this.start = async () => {
    if (!this.config.id) {
      this.config.id = mock.utils.uuid();
      this.log.info(`Generated new id: ${ this.config.id }`);
    }

    if (/^\.{0,2}\//.test(this.config.certificate)) {
      this.log.info(`Loading certificate from ${ this.config.certificate }`);
      this.config.certificate = (await readFile(this.config.certificate)).toString();
      this.config.x509 = new X509Certificate(this.config.certificate);
    }
    if (/^\.{0,2}\//.test(this.config.key)) {
      this.log.info(`Loading private key from ${ this.config.key }`);
      this.config.key = (await readFile(this.config.key)).toString();
    }

    this.parser = new xml2js.Parser();

    this.log.info('Mock IDP/SAML Server ready');
  };
}

module.exports = (mock) => new IdentityProvider(mock);
