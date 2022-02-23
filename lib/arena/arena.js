'use strict';

function Arena (mock) {
  this.config = mock.config.arena;

  this.log = mock.log.child({ service: 'arena' });

  this.data = require('./dataStore')(mock, this);
  this.api = require('./api')(mock, this);

  //////////
  // Validators

  this.validators = {
    webtoken: /^[A-Za-z0-9]{73}$/,
    workspaceId: /^[0-9]{9}$/,
    arenaSessionId: /^LABS-[A-Za-z0-9]{32}\|$/,
  };

  //////////

  this.start = (callback) => {
    if (Array.isArray(mock.config.arena.workspaces)) {
      for (const workspace of mock.config.arena.workspaces) {
        this.data.addWorkspace(workspace);
      }
    }

    this.log.info(`Mock Arena loaded with ${ mock.utils.size(this.data.workspaces()) } workspaces`);

    return setImmediate(callback);
  };
}

module.exports = (mock) => new Arena(mock);
