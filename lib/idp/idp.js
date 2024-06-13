'use strict';

const { promisify } = require('node:util');
const { readFile } = require('node:fs/promises');
const { generateKeyPair } = require('node:crypto');

const generateKeyPairAsync = promisify(generateKeyPair);

const saml = {
  metadata: `<?xml version="1.0" encoding="utf-8"?>
<EntityDescriptor
  ID="_c066524f-ba36-49d5-9dfa-ae14e13c1392"
  entityID="https://idp.identityserver"
  validUntil="2022-07-20T09:48:54Z"
  cacheDuration="PT15M"
  xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  xmlns:saml2="urn:oasis:names:tc:SAML:2.0:assertion">

  <IDPSSODescriptor WantAuthnRequestsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.identityserver/saml/sso" />
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://idp.identityserver/saml/sso" />
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact" Location="https://idp.identityserver/saml/sso" />

    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.identityserver/saml/slo" />
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://idp.identityserver/saml/slo" />
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact" Location="https://idp.identityserver/saml/slo" />

    <ArtifactResolutionService Binding="urn:oasis:names:tc:SAML:2.0:bindings:SOAP" Location="https://idp.identityserver/saml/ars" index="0" />

    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</NameIDFormat>
    <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</NameIDFormat>
    <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</NameIDFormat>
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>

    <KeyDescriptor use="signing">
      <KeyInfo
        xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data>
          <X509Certificate>IDP_PUBLIC_SIGNING_CERTIFICATE_USED_FOR_SIGNING_RESPONSES</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
  </IDPSSODescriptor>

  <Organization>
    <OrganizationName xml:lang="en-GB">Example</OrganizationName>
    <OrganizationDisplayName xml:lang="en-GB">Example Org</OrganizationDisplayName>
    <OrganizationURL xml:lang="en-GB">https://example.com/</OrganizationURL>
  </Organization>

  <ContactPerson contactType="technical">
    <Company>Example</Company>
    <GivenName>bob</GivenName>
    <SurName>smith</SurName>
    <EmailAddress>bob@example.com</EmailAddress>
  </ContactPerson>

</EntityDescriptor>
`,
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

  mock.api.get('/idp/keys/public', async (req, res) => {
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(this.config.publicKey),
      'Content-Type': 'text/plain',
    });
    res.write(this.config.publicKey);
    res.end();
  });

  mock.api.get('/idp/keys/private', async (req, res) => {
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(this.config.privateKey),
      'Content-Type': 'text/plain',
    });
    res.write(this.config.privateKey);
    res.end();
  });

  this.start = async () => {
    if (!this.config.id) {
      this.config.id = mock.utils.uuid();
      this.log.info(`Generated new id: ${ this.config.id }`);
    }

    if (!this.config?.publicKey) {
      this.log.info('Generating new keypair...');

      const keypair = await generateKeyPairAsync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      this.config.publicKey = keypair.publicKey;
      this.config.privateKey = keypair.privateLey;
    } else {
      if (/^\.{0,2}\//.test(this.config.publicKey)) {
        this.log.info(`Loading public key from ${ this.config.publicKey }`);
        this.config.publicKey = (await readFile(this.config.publicKey)).toString();
      }
      if (/^\.{0,2}\//.test(this.config.privateKey)) {
        this.log.info(`Loading private key from ${ this.config.privateKey }`);
        this.config.privateKey = (await readFile(this.config.privateKey)).toString();
      }
    }

    this.log.info('Mock IDP/SAML Server ready');
  };
}

module.exports = (mock) => new IdentityProvider(mock);
