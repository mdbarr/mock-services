'use strict';

const { v4: uuid } = require('uuid');
const { SignedXml } = require('xml-crypto');

const issuerXPath = '/*[local-name(.)="Issuer" and namespace-uri(.)="urn:oasis:names:tc:SAML:2.0:assertion"]';

let sessionIndex = 0;
function assertion ({
  requestId, baseUrl, instant, issuer, spUrl, email, name,
}) {
  const notBefore = new Date(new Date(instant).getTime() - 300000).toISOString();
  const notAfter = new Date(new Date(instant).getTime() + 600000).toISOString();

  return `<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" Version="2.0" ID="${ uuid() }" IssueInstant="${ instant }">
    <saml:Issuer>${ baseUrl }</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">${ email }</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="${ notAfter }" Recipient="${ spUrl }" InResponseTo="${ requestId }"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="${ notBefore }" NotOnOrAfter="${ notAfter }">
      <saml:AudienceRestriction>
        <saml:Audience>${ issuer }</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="${ instant }" SessionIndex="${ sessionIndex++ }">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:unspecified</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xsi:type="xs:string">${ email }</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xsi:type="xs:string">${ email }</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xsi:type="xs:string">${ name }</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri">
        <saml:AttributeValue xsi:type="xs:string">${ name }</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>`;
}

function flattenCertificate (certificate) {
  return certificate.replace(/-+BEGIN CERTIFICATE-+\r?\n?/, '').
    replace(/-+END CERTIFICATE-+\r?\n?/, '').
    replace(/\r\n/g, '\n').
    replace(/\n+/g, '').
    trim();
}

function login ({
  baseUrl, requestId, instant, spUrl, issuer, relay,
}) {
  return `<!doctype html>
<html lang="en-US">
  <head>
    <title>Mock Services IDP Login</title>
    <link rel="preconnect" href="https://fonts.gstatic.com">
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300..700&display=swap" rel="stylesheet">
    <style>
    * {
      box-sizing: border-box;
      font-family: 'Fira Code', monospace;
    }

    html, body {
      background-color: #121212;
      height: 100%;
      width: 100%;
    }

    .mock-services-container {
      align-items: center;
      display: flex;
      height: 100%;
      justify-content: center;
    }

    .mock-services-signin {
      background-color: #2a2a2a;
      border: 1px solid #393939;
      border-radius: 5px;
      color: white;
      height: 180px;
      width: 400px;
    }

    .mock-services-signin-title {
      align-items: center;
      background-color: #4682B4;
      border-radius: 5px 5px 0 0;
      display: flex;
      font-size: 16px;
      justify-content: center;
      letter-spacing: 2px;
      padding: 8px;
      position: relative;
      width: 100%;
    }

    .mock-services-logo {
      height: 22px;
      left: 12px;
      position: absolute;
    }

    .mock-services-signin-content {
      align-items: center;
      flex-direction: column;
      display: flex;
      justify-content: center;
      padding: 8px;
    }

    .mock-services-signin-row {
      padding: 16px;
    }

    .mock-services-signin-input {
      background-color: #2a2a2a;
      border-bottom: 1px solid #efefef;
      border-left: none;
      border-right: none;
      border-top: none;
      color: white;
      font-size: 14px;
      outline: none;
      width: 300px;
    }

    .mock-services-signin-button {
      background-color: #4682B4;
      background-position: center;
      border-radius: 3px;
      border: 1px solid #393939;
      color: white;
      font-size: 16px;
      padding: 4px;
      transition: background 0.8s;
      width: 150px;
    }

    .mock-services-signin-button:disabled {
      background-color: #393939;
    }

    .mock-services-signin-button:hover:not([disabled]) {
      background: #4f94cc radial-gradient(circle, transparent 1%, #4f94cc 1%) center/15000%;
      cursor: pointer;
    }

    .mock-services-signin-button:active:not([disabled]) {
      background-color: #6eb9f7;
      background-size: 100%;
      transition: background 0s;
    }
    </style>
  </head>
  <body>
    <div class="mock-services-container">
      <div class="mock-services-signin">
        <div class="mock-services-signin-title">
          <img src="/mock-services.png" class="mock-services-logo"> Mock Services IDP / SAML
        </div>
        <div class="mock-services-signin-content">
          <div class="mock-services-signin-row">
            <input class="mock-services-signin-input" type="email" name="email" id="email" value="" placeholder="Email" autocomplete="off" autofocus>
          </div>
          <div class="mock-services-signin-row">
            <input class="mock-services-signin-button" type="button" id="signin" value="Sign in" disabled>
          </div>
        </div>
      </div>
    </div>
    <script>
  const emailRegExp = /^.+@.+\\..+$/;

  const email = document.getElementById('email');
  const signin = document.getElementById('signin');

  const authenticate = async () => {
    signin.disabled = true;

    const response = await fetch("${ baseUrl }/sso/auth", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityId: '${ baseUrl }',
        requestId: '${ requestId }',
        instant: '${ instant }',
        spUrl: '${ spUrl }',
        issuer: '${ issuer }',
        relay: '${ relay }',
        email: document.getElementById('email').value,
      }),
    });

    if (response.ok) {
      const html = document.open('text/html', 'replace');

      html.write(await response.text());
      html.close();
    } else {
      document.write('Error in getting SAML response');
    }
  };

  email.onkeyup = (event) => {
    if (event.keyCode === 13 && !signin.disabled) {
      authenticate();
    } else {
      signin.disabled = !emailRegExp.test(email.value);
    }
  };

  signin.onclick = authenticate;
    </script>
  </body>
</html>
`;
}

function metadata ({
  id, baseUrl, validUntil, certificate,
}) {
  certificate = flattenCertificate(certificate);

  return `<?xml version="1.0" encoding="utf-8"?>
<EntityDescriptor
  ID="_${ id }"
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
}

function postForm (url, parameters = []) {
  const inputs = parameters.map(({ name, value }) => `      <input type="hidden" name="${ name }" value="${ value }"/>`);

  const html = `<!doctype html>
<html lang="en-US">
  <head>
    <title>Mock Services IDP Login</title>
    <style>
    html, body {
      background-color: #121212;
      height: 100%;
      width: 100%;
    }
    </style>
  </head>
  <body onload="document.forms[0].submit()">
  <form method="post" action="${ url }">
${ inputs }
    <input type="submit" value="Continue" >
  </form>
  <script>document.forms[0].style.display="none";</script>
  </body>
</html>
`;

  return html;
}

function response ({
  certificate, key, requestId, issuer, baseUrl, instant, spUrl, email, name,
}) {
  const assert = assertion({
    requestId,
    issuer,
    baseUrl,
    instant,
    spUrl,
    email,
    name,
  });

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${ uuid() }" InResponseTo="${ requestId }" Version="2.0" IssueInstant="${ instant }" Destination="${ spUrl }">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${ baseUrl }</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  ${ assert }
</samlp:Response>
`;

  const signedAssertionXml = sign(xml, key, certificate, '//*[local-name(.)="Assertion"]');

  const signedXml = sign(
    signedAssertionXml,
    key,
    certificate,
    '/*[local-name(.)="Response" and namespace-uri(.)="urn:oasis:names:tc:SAML:2.0:protocol"]',
  );

  return signedXml;
}

function sign (xml, key, certificate, xPath) {
  const flattened = flattenCertificate(certificate);

  const sig = new SignedXml({
    privateKey: key,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    getKeyInfoContent: ({ prefix }) => {
      prefix = prefix || '';
      prefix = prefix ? `${ prefix }:` : prefix;
      return `<${ prefix }X509Data><${ prefix }X509Certificate>${ flattened }</${ prefix }X509Certificate</${ prefix }X509Data>`;
    },
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  });

  sig.addReference({
    xpath: xPath,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  });

  sig.computeSignature(xml, {
    location: {
      reference: xPath + issuerXPath,
      action: 'after',
    },
  });

  return sig.getSignedXml();
}

module.exports = {
  assertion,
  flattenCertificate,
  login,
  metadata,
  postForm,
  response,
  sign,
};
