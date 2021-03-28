'use strict';

const async = require('async');
const dgram = require('dgram');
const { Resolver } = require('dns');
const dnsPacket = require('dns-packet');

function DNS (mock) {
  this.config = mock.config.dns;
  this.log = mock.log.child({ service: 'dns' });

  this.cache = new Map();

  //////////

  this.resolver = new Resolver();
  if (Array.isArray(this.config.nameservers)) {
    this.resolver.setServers(this.config.nameservers);
  } else {
    this.resolver.setServers([ '8.8.8.8', '1.1.1.1' ]);
  }

  function cacheKey (question) {
    return `${ question.class }-${ question.type }-${ question.name }`;
  }

  function match (name, pattern) {
    const regexp = mock.utils.toRegularExpression(pattern);
    return regexp.test(name);
  }

  this.lookup = (key, question, callback) => {
    if (this.cache.has(key)) {
      const result = this.cache.get(key);
      this.log.verbose('cache hit');
      this.log.verbose(result);
      return setImmediate(callback, result.data);
    }

    this.log.verbose('cache miss');
    this.log.verbose(question);

    const records = this.config.records[question.type];

    if (records) {
      for (const pattern in records) {
        if (match(question.name, pattern)) {
          return setImmediate(callback, records[pattern]);
        }
      }
    }

    return this.resolver.resolve(question.name, question.type, (error, result) => callback(result));
  };

  this.resolve = (question, callback) => {
    this.log.verbose(question);

    const key = cacheKey(question);

    return this.lookup(key, question, (result) => {
      this.log.verbose(result);

      if (!result) {
        return callback(new Error('NXDOMAIN'));
      }

      if (!Array.isArray(result)) {
        result = [ result ];
      }

      this.cache.set(key, {
        data: result,
        timestamp: Date.now(),
      });

      result = result.map((data) => Object.assign({}, question, {
        data,
        ttl: mock.config.dns.ttl,
      }));

      return callback(null, result);
    });
  };

  //////////

  this.socket = dgram.createSocket('udp4');

  this.socket.on('message', (message, rinfo) => {
    message = dnsPacket.decode(message);

    this.log.verbose(message);
    this.log.verbose(rinfo);

    const response = {
      type: 'response',
      id: message.id,
      questions: message.questions,
      answers: [ ],
    };

    return async.map(message.questions, this.resolve, (error, answers) => {
      if (error) {
        this.log.error('error', error);
      }

      if (Array.isArray(answers)) {
        answers.forEach((answer) => {
          if (answer) {
            response.answers.push(...answer);
          }
        });
      }

      this.log.verbose('resolve done');
      this.log.verbose(response);

      try {
        const packet = dnsPacket.encode(response);
        this.socket.send(packet, 0, packet.length, rinfo.port, rinfo.address);
      } catch (error) {
        this.log.error('error', error);
      }
    });
  });

  //////////

  this.reap = () => {
    const now = Date.now();
    for (const [ key, value ] of this.cache) {
      if (now - value.timestamp > this.config.cache.ttl) {
        this.cache.delete(key);
      }
    }
  };

  //////////

  mock.api.get('/api/mock/dns/:type(a|aaaa|cname|mx|ptr|srv|txt)', (req, res, next) => {
    const type = req.params.type.toUpperCase();
    const records = this.config.records[type];

    res.send(200, records);
    return next();
  });

  mock.api.put('/api/mock/dns/:type(a|aaaa|cname|mx|ptr|srv|txt)', (req, res, next) => {
    const type = req.params.type.toUpperCase();
    const records = this.config.records[type];

    for (const key in req.body) {
      records[key] = req.body[key];
    }

    res.send(200, records);
    return next();
  });

  mock.api.del('/api/mock/dns/:type(a|aaaa|cname|mx|ptr|srv|txt)', (req, res, next) => {
    const type = req.params.type.toUpperCase();
    const records = this.config.records[type];

    for (const key in req.body) {
      delete records[key];
    }

    res.send(200, records);
    return next();
  });

  //////////

  this.start = (callback) => {
    const configs = [];
    for (const type in this.config.records) {
      const size = mock.utils.size(this.config.records[type]);
      if (size) {
        configs.push(`${ size } IN ${ type }`);
      }
    }

    if (configs.length) {
      this.log.info(`${ configs.join(', ') } records added`);
    }

    this.socket.bind(mock.config.dns.port, mock.config.host, (error) => {
      if (error) {
        return callback(error);
      }

      this.reaper = setInterval(this.reap, this.config.cache.reap);

      const address = this.socket.address();

      this.log.info(`Mock DNS Proxy Server running on dns://${ address.address }:${ address.port }`);

      return callback();
    });
  };
}

module.exports = (mock) => new DNS(mock);
