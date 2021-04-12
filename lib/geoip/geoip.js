'use strict';

function GeoIP (mock) {
  this.config = mock.config.geoip;
  this.log = mock.log.child({ service: 'geoip' });

  const data = { ipapi: Object.assign(require('./ipapi.data'), this.config.ipapi) };

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

    for (const pattern in data.ipapi) {
      if (match(ip, pattern)) {
        Object.assign(response, data.ipapi[pattern]);
        break;
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
    this.log.info(`Mock GeoIP loaded with ${ mock.utils.size(data.ipapi) } records`);
    setImmediate(callback);
  };
}

module.exports = (mock) => new GeoIP(mock);
