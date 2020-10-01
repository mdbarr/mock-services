'use strict';

const dgram = require('dgram')
const dnsPacket = require('dns-packet')

function DNS (mock) {
  this.config = mock.config.dns;

  this.log = mock.log.child({ service: 'dns' });

  this.socket = dgram.createSocket('udp4')

  this.socket.on('message', (message, rinfo) => {
    message = dnsPacket.decode(message);

    this.log.info(message);
    this.log.info(rinfo);

    const packet = dnsPacket.encode({
      type: 'response',
      id: message.id,
      answers: [{
        type: 'A',
        class: 'IN',
        name: 'hello.a.com',
        data: '127.0.0.1'
      }]
    });

    this.socket.send(packet, 0, packet.length, rinfo.port, rinfo.address);
  });

  this.start = (callback) => {
    console.log('here');
    this.socket.bind(5555, mock.config.host, (error) => {
      console.log('there');
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
