'use strict';

function GeoIP (mock) {
  this.config = mock.config.geoip;
  this.log = mock.log.child({ service: 'geoip' });

  const match = (ip, pattern) => {
    try {
      const regexp = mock.utils.toRegularExpression(pattern);
      return regexp.test(ip);
    } catch (error) {
      this.log.error('error', error);
      return false;
    }
  };

  const ipapi = (ip) => {
    if (!mock.utils.isValidIP(ip)) {
      return {
        query: ip,
        status: 'fail',
        message: 'invalid query',
      };
    }

    const response = {
      query: ip,
      status: 'success',
    };

    let found = false;
    for (const pattern in this.config.records) {
      if (match(ip, pattern)) {
        Object.assign(response, this.config.records[pattern]);
        found = true;
        break;
      }
    }

    if (!found) {
      for (const pattern in this.config.fallbacks) {
        if (match(ip, pattern)) {
          Object.assign(response, this.config.fallbacks[pattern]);
          break;
        }
      }
    }

    this.log.verbose(`query: ${ ip }, status: ${ response.status }`);
    return response;
  };

  //////////

  mock.api.get('/ipapi/json/:ip', (req, res, next) => {
    const response = ipapi(req.params.ip);

    res.send(200, response);
    return next();
  });

  //////////

  this.start = (callback) => {
    this.log.info(`Mock GeoIP loaded with ${ mock.utils.size(this.config.records) } records`);
    setImmediate(callback);
  };
}

module.exports = (mock) => new GeoIP(mock);
