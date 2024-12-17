#!/usr/bin/env node
'use strict';

const async = require('async');
const { execSync } = require('node:child_process');
const fs = require('node:fs/promises');

async function fetchClient (version) {
  const seen = new Set();
  let queue; // eslint-disable-line prefer-const

  const cleanName = (name) => name.replace(/-[a-f0-9]{32,}\.(css|html|js|svg)/, '.$1').
    replace(/^.*?\/([^/]+)$/, '$1').
    replace(`https://js.stripe.com/${ version }/`, '').
    replace(/^\./, '');

  const fetch = async ({
    url, name, output, data,
  }) => {
    if (seen.has(name)) {
      return;
    }

    seen.add(name);

    const filename = `./${ version }/${ output }`;

    console.log(`${ name } => ${ output } (${ filename })`);

    if (!data) {
      console.log('  Fetching', url);

      execSync(`curl -s ${ url } -o ${ filename }`);
      data = await fs.readFile(filename);
      data = data.toString();
    }

    if (name.endsWith('.js')) {
      data = data.replace(/"((https:\/\/js.stripe.com\/v\d\/)?\.?[A-Za-z0-9_/-]+\.(css|html|js|json|svg))"/g, (match, link) => {
        console.log(`  Found ${ link } in ${ name }`);
        const out = cleanName(link);

        queue.push({
          url: link.startsWith('http') ? link : `https://js.stripe.com/${ version }/${ link }`,
          name: link.replace(/^.*?\/([^/]+)$/, '$1'),
          output: out,
        });
        return link.includes('http') ? `"__BASE_URL__/stripe/${ version }/${ out }"` : `"${ out }"`;
      });
    } else if (name.endsWith('.html')) {
      data = data.replace(/(href|src)="([^"]+)"/g, (match, type, link) => {
        const out = cleanName(link);

        if (!out.startsWith('#')) {
          console.log(`  Found ${ link } in ${ name }`);
          queue.push({
            url: link.startsWith('http') ? link : `https://js.stripe.com/${ version }/${ link }`,
            name: link.replace(/^.*?\/([^/]+)$/, '$1'),
            output: out,
          });
        }
        return link.includes('http') ? `${ type }="__BASE_URL__/stripe/${ version }/${ out }"` : `${ type }="${ out }"`;
      });
    }

    data = data.replaceAll('https://api.stripe.com', '__BASE_URL__').
      replaceAll('https://merchant-ui-api.stripe.com', '__BASE_URL__/stripe').
      replaceAll('https://m.stripe.com', '__BASE_URL__/stripe/m').
      replaceAll('https://r.stripe.com', '__BASE_URL__/stripe/r').
      replaceAll('https://js.stripe.com/v2', '__BASE_URL__/stripe/v2').
      replaceAll('https://js.stripe.com/v3', '__BASE_URL__/stripe/v3').
      replaceAll('https://b.stripecdn.com/stripethirdparty-srv/assets', '__BASE_URL__/stripe/v3').
      replaceAll('return"stripe.com"===n||!!n.match(/\\.stripe\\.(com|me)$/)', 'return true;');

    await fs.writeFile(filename, data);

    console.log();
  };

  queue = async.queue(fetch, 3);

  queue.error(async (error) => console.log(error));

  //////////

  await fs.rm(`./${ version }`, {
    force: true,
    recursive: true,
  });
  await fs.mkdir(`./${ version }`, { recursive: true });

  const data = await fs.readFile(`./client.${ version }.txt`);
  queue.push({
    name: 'stripe.js',
    output: 'stripe.js',
    data: data.toString(),
  });
}

async function main () {
  await fetchClient('v2');
  await fetchClient('v3');
}

main().catch(console.error);
