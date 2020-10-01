'use strict';

const winston = require('winston');
const style = require('barrkeep/style');

const colors = {
  dns: 'Cyan3',
  'mock-services': 'DodgerBlue1',
  sendgrid: '#0073b1',
  stripe: 'MediumPurple',
};

module.exports = (config = {}) => {
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.splat(),
    winston.format.printf(info => {
      let service = info.service || 'mock-services';

      service = style(service, colors[service] || 'White');

      if (typeof info.message === 'object') {
        info.message = JSON.stringify(info.message, null, 2);
      }

      return `[${ info.timestamp }] ${ service }/${ info.level }: ${ info.message }`;
    }));

  const logger = winston.createLogger({ level: config.level || 'info' });

  if (config.console) {
    logger.add(new winston.transports.Console({ format: logFormat }));
  }

  if (config.combined) {
    logger.add(new winston.transports.File({
      format: logFormat,
      filename: config.combined,
    }));
  }

  if (config.error) {
    logger.add(new winston.transports.File({
      format: logFormat,
      filename: config.error,
      level: 'error',
    }));
  }

  logger.req = (req) => {
    logger.info(`${ req.method } ${ req.url } ${ req.params } ${ req.query }`);

    if (req.authorization) {
      logger.http(req.authorization);
    }
    if (req.headers) {
      logger.http(req.headers);
    }
    if (req.authorization) {
      logger.http(req.authorization);
    }
    if (req.body) {
      logger.http(req.body);
    }
  };

  return logger;
};
