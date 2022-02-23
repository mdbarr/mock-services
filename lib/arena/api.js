'use strict';

const errors = require('restify-errors');

function API (mock, arena) {
  arena.req = (req, res, next) => {
    const requestId = `req_${ arena.store.generateId(24) }`;
    req.requestId = requestId;

    res.header('Request-Id', requestId);
    res.header(`${ mock.config.name }-arena-version`, mock.config.version);

    mock.log.req(req);

    return next();
  };

  arena.authenticate = (req, res, next) => {
    const arenaSessionId = req.headers.arena_session_id;
    if (!arenaSessionId || !arena.data.validateSession(arenaSessionId)) {
      return next(new errors.NotAuthorizedError(new Error('Invalid session')));
    }

    return next();
  };

  //////////
  // Interaction API

  mock.api.post('/api/mock/arena/workspace', (req, res, next) => {
    if (!req.body.name || !req.body.workspaceId || !req.body.webtoken) {
      return next(new errors.BadRequestError(new Error('Missing required fields')));
    }

    if (!arena.validators.workspaceId.test(req.body.workspaceId)) {
      return next(new errors.BadRequestError(new Error('Invalid workspaceId')));
    }

    if (!arena.validators.webtoken.test(req.body.webtoken)) {
      return next(new errors.BadRequestError(new Error('Invalid webtoken')));
    }

    const workspace = arena.data.addWorkspace(req.body);

    res.send(200, workspace);
    return next();
  });

  //////////
  // V1 API

  mock.api.post('/v1/login', arena.req, (req, res, next) => {
    const workspaceId = req.body.workspaceId;
    const webtoken = req.body.webtoken;

    if (!workspaceId || !webtoken) {
      return next(new errors.BadRequestError(new Error('Missing required fields')));
    }

    if (!arena.data.validateWorkspace(workspaceId, webtoken)) {
      return next(new errors.BadRequestError(new Error('Invalid workspaceId or webtoken')));
    }

    const session = arena.data.createSession(workspaceId);
    res.send(200, session);
    return next();
  });

  mock.api.get('/v1/settings/items/bom/attributes', arena.req, (req, res, next) => {
    console.log('here');
    return next(new errors.BadRequestError(new Error('Empty request body')));
  });

  mock.api.get('/v1/settings/items/categories', arena.req, (req, res, next) => {
    console.log('here');
    return next(new errors.BadRequestError(new Error('Empty request body')));
  });

  mock.api.get('/v1/settings/items/attributes', arena.req, (req, res, next) => {
    console.log('here');
    return next(new errors.BadRequestError(new Error('Empty request body')));
  });
}

module.exports = (mock, arena) => new API(mock, arena);
