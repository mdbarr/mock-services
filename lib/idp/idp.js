'use strict';

const xml2js = require('xml2js');
const { readFile } = require('node:fs/promises');
const { X509Certificate } = require('node:crypto');

const saml = {
  response: `<?xml version="1.0" encoding="utf-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="{respId}" InResponseTo="{inResponseTo}" Version="2.0" IssueInstant="{issueTime}" Destination="{destination}">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">{issuer}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  {assertion}
</samlp:Response>
`,
  assertion: `<?xml version="1.0" encoding="utf-8"?>
<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" Version="2.0" ID="{assertId}" IssueInstant="{issueTime}">
  <saml:Issuer>{issuer}</saml:Issuer>
  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">john.doe@example.com</saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData NotOnOrAfter="{expiryTime}" Recipient="{acsUrl}" InResponseTo="{inResponseTo}"/>
    </saml:SubjectConfirmation>
  </saml:Subject>
  <saml:Conditions NotBefore="{issueTime}" NotOnOrAfter="{expiryTime}">
    <saml:AudienceRestriction>
      <saml:Audience>{audience}</saml:Audience>
        </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="{issueTime}" SessionIndex="2345">
        <saml:AuthnContext>
            <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified</saml:AuthnContextClassRef>
        </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement xmlns:xs="http://www.w3.org/2001/XMLSchema"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
            <saml:AttributeValue xsi:type="xs:string">john.doe@example.com</saml:AttributeValue>
        </saml:Attribute>
        <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
            <saml:AttributeValue xsi:type="xs:string">john.doe@example.com</saml:AttributeValue>
        </saml:Attribute>
        <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
            <saml:AttributeValue xsi:type="xs:string">John Doe</saml:AttributeValue>
        </saml:Attribute>
        <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
            <saml:AttributeValue xsi:type="xs:string">John</saml:AttributeValue>
        </saml:Attribute>
    </saml:AttributeStatement>
</saml:Assertion>
`,
};

function IdentityProvider (mock) {
  this.config = mock.config.idp;
  this.log = mock.log.child({ service: 'idp' });

  this.saml = saml;

  mock.api.get('/idp/metadata', async (req, res) => {
    const baseUrl = `${ mock.config.baseUrl }/idp`;
    const validUntil = new Date(Date.now() + mock.utils.milliseconds('1y')).toISOString();
    const certificate = this.config.x509.toString().replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').
      replace(/\s/g, '');

    const metadata = `<?xml version="1.0" encoding="utf-8"?>
<EntityDescriptor
  ID="_${ this.config.id }"
  entityID="${ baseUrl }"
  validUntil="${ validUntil }"
  cacheDuration="PT15M"
  xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion">

  <IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${ baseUrl }/sso" />
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${ baseUrl }/sso" />
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact" Location="${ baseUrl }/sso" />

    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${ baseUrl }/slo" />
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${ baseUrl }/slo" />
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact" Location="${ baseUrl }/slo" />

    <ArtifactResolutionService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="${ baseUrl }/ars" index="0" />

    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</NameIDFormat>
    <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</NameIDFormat>
    <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</NameIDFormat>
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>

    <KeyDescriptor use="signing">
      <KeyInfo
        xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data>
          <X509Certificate>${ certificate }</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
  </IDPSSODescriptor>

  <Organization>
    <OrganizationName xml:lang="en-US">MockServices IDP</OrganizationName>
    <OrganizationDisplayName xml:lang="en-US">MockServices IDP</OrganizationDisplayName>
    <OrganizationURL xml:lang="en-US">${ baseUrl }</OrganizationURL>
  </Organization>

  <ContactPerson contactType="technical">
    <Company>MockServices</Company>
    <GivenName>Mark</GivenName>
    <SurName>Barr</SurName>
    <EmailAddress>mark@mock-services.io</EmailAddress>
  </ContactPerson>

</EntityDescriptor>
`;

    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(metadata),
      'Content-Type': 'application/xml',
    });
    res.write(metadata);
    res.end();
  });

  mock.api.post('/idp/sso', async (req, res) => {
    console.log(req.body);
    const request = await this.parser.parseStringPromise(Buffer.from(req.body.SAMLRequest, 'base64').toString());
    console.log(request);

    const relay = Buffer.from(req.body.RelayState, 'base64').toString();
    console.log(relay);

    res.send(200);
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
