'use strict';

const winston = require('winston');
const style = require('barrkeep/style');

const colors = {
  arena: 'DarkOliveGreen',
  dns: 'Cyan3',
  geoip: 'FireBrick',
  'mock-services': 'DodgerBlue1',
  sendgrid: '#0073b1',
  stripe: 'MediumPurple',
};

module.exports = (config = {}) => {
  // Formatter
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

  // Logger instance
  const logger = winston.createLogger({ level: config.level || 'info' });

  // Transports
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

  // Custom logger
  logger.req = (req, res, next) => {
    logger.info(`${ req.method } ${ req.url }`);

    if (req.params) {
      logger.info(`params ${ JSON.stringify(req.params, null, 2) }`);
    }
    if (req.query) {
      logger.info(`query ${ JSON.stringify(req.query, null, 2) }`);
    }
    if (req.authorization) {
      logger.http(`authorization ${ JSON.stringify(req.authorization, null, 2) }`);
    }
    if (req.headers) {
      logger.http(`headers ${ JSON.stringify(req.headers, null, 2) }`);
    }
    if (req.body) {
      logger.http(`body ${ JSON.stringify(req.body, null, 2) }`);
    }

    if (next) {
      setImmediate(next);
    }
  };

  return logger;
};
