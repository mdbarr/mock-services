'use strict';

const async = require('async');
const dgram = require('dgram');
const { Resolver } = require('dns');
const dnsPacket = require('dns-packet');

function DNS (mock) {
  this.config = mock.config.dns;

  this.log = mock.log.child({ service: 'dns' });

  //////////

  this.resolver = new Resolver();
  if (Array.isArray(this.config.nameservers)) {
    this.resolver.setServers(this.config.nameservers);
  } else {
    this.resolver.setServers([ '8.8.8.8', '1.1.1.1' ]);
  }

  this.resolve = (question, callback) => {
    this.log.info(question);

    return this.resolver.resolve(question.name, question.type, (error, result) => {
      this.log.info(result);

      if (error || !result) {
        return callback(error);
      }

      if (!Array.isArray(result)) {
        result = [ result ];
      }

      result = result.map((data) => {
        console.log('data', typeof data);
        return Object.assign({}, question, { data });
      });

      return callback(null, result);
    });
  };

  //////////

  this.socket = dgram.createSocket('udp4');

  this.socket.on('message', (message, rinfo) => {
    message = dnsPacket.decode(message);

    this.log.info(message);
    this.log.info(rinfo);

    const response = {
      type: 'response',
      id: message.id,
      questions: message.questions,
      answers: [ ],
    };

    return async.map(message.questions, this.resolve, (error, answers) => {
      if (error) {
        console.log('error', error);
      }

      if (Array.isArray(answers)) {
        answers.forEach((answer) => {
          console.log(answer);
          if (answer) {
            response.answers.push(...answer);
          }
        });
      }

      this.log.info('resolve done');
      this.log.info(response);

      const packet = dnsPacket.encode(response);
      return this.socket.send(packet, 0, packet.length, rinfo.port, rinfo.address);
    });
  });

  /////////

  this.start = (callback) => {
    this.socket.bind(5555, mock.config.host, (error) => {
      if (error) {
        return callback(error);
      }
      const address = this.socket.address();

      this.log.info(`Mock DNS Proxy Server running on dns://${ address.address }:${ address.port }`);
      return callback();
    });
  };
}

module.exports = (mock) => new DNS(mock);
