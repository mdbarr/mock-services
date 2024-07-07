'use strict';

const xml2js = require('xml2js');
const { readFile } = require('node:fs/promises');

function IdentityProvider (mock) {
  this.config = mock.config.idp;
  this.log = mock.log.child({ service: 'idp' });

  this.baseUrl = `${ mock.config.baseUrl }/idp`;

  this.saml = require('./saml');

  mock.api.get('/idp/info', async (req, res) => {
    res.send(200, {
      id: `_${ this.config.id }`,
      arp: `${ this.baseUrl }/arp`,
      entity: this.baseUrl,
      metadata: `${ this.baseUrl }/metadata`,
      slo: `${ this.baseUrl }/slo`,
      sso: `${ this.baseUrl }/sso`,
    });
  });

  mock.api.get('/idp/metadata', async (req, res) => {
    const validUntil = new Date(Date.now() + mock.utils.milliseconds('365d')).toISOString();

    const metadata = this.saml.metadata({
      id: this.config.id,
      baseUrl: this.baseUrl,
      validUntil,
      certificate: this.config.certificate,
    });

    res.setHeader('Content-Length', Buffer.byteLength(metadata));
    res.setHeader('Content-Type', 'application/xml');

    if ('download' in req.query) {
      res.setHeader('Content-Disposition', 'Attachment; filename=mock-services-idp-metadata.xml');
    }

    res.sendRaw(200, metadata);
  });

  mock.api.post('/idp/sso', async (req, res) => {
    const request = Buffer.from(req.body.SAMLRequest, 'base64').toString();
    const body = await this.parser.parseStringPromise(request);

    const data = body['saml2p:AuthnRequest'].$;
    const relay = req.body.RelayState;

    const html = this.saml.signin({
      baseUrl: this.baseUrl,
      requestId: data.ID,
      instant: data.IssueInstant,
      spUrl: data.AssertionConsumerServiceURL,
      issuer: body['saml2p:AuthnRequest']['saml2:Issuer'][0]._,
      relay,
    });

    res.setHeader('Content-Length', Buffer.byteLength(html));
    res.setHeader('Content-Type', 'text/html');

    res.sendRaw(200, html);
  });

  mock.api.post('/idp/sso/auth', async (req, res) => {
    const response = this.saml.response({
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

    const html = this.saml.postForm(req.body.spUrl, [
      {
        name: 'RelayState',
        value: req.body.relay,
      }, {
        name: 'SAMLResponse',
        value: Buffer.from(response).toString('base64'),
      },
    ]);

    res.setHeader('Content-Length', Buffer.byteLength(html));
    res.setHeader('Content-Type', 'text/html');

    res.sendRaw(200, html);
  });

  mock.api.get('/idp/certificate', async (req, res) => {
    res.setHeader('Content-Length', Buffer.byteLength(this.config.certificate));
    res.setHeader('Content-Type', 'application/x-x509-ca-cert');

    if ('download' in req.query) {
      res.setHeader('Content-Disposition', 'Attachment; filename=mock-services-idp.crt');
    }

    res.sendRaw(200, this.config.certificate);
  });

  mock.api.get('/idp/key', async (req, res) => {
    res.setHeader('Content-Length', Buffer.byteLength(this.config.key));
    res.setHeader('Content-Type', 'text/plain');

    res.sendRaw(200, this.config.key);
  });

  this.start = async () => {
    if (!this.config.id) {
      this.config.id = mock.utils.uuid();
      this.log.info(`Generated new id: ${ this.config.id }`);
    }

    // openssl req -x509 -newkey rsa:2048 -keyout idp.key -out idp.crt -sha256 -days 365000 -nodes
    if (/^\.{0,2}\//.test(this.config.certificate)) {
      this.log.info(`Loading certificate from ${ this.config.certificate }`);
      this.config.certificate = (await readFile(this.config.certificate)).toString();
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
