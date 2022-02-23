'use strict';

function DataStore (mock, arena) {
  const store = {
    workspaces: {},
    items: {},
    attributes: {},
    categories: {},
    sessions: {},
  };

  this.addWorkspace = ({
    workspaceId, webtoken, name,
  }) => {
    if (!arena.validators.workspaceId.test(workspaceId)) {
      throw new Error(`Invalid workspaceId: ${ workspaceId }`);
    }

    if (!arena.validators.webtoken.test(webtoken)) {
      throw new Error(`Invalid webtoken: ${ webtoken }`);
    }

    store.workspaces[workspaceId] = {
      name,
      workspaceId,
      webtoken,
    };
    return store.workspaces[workspaceId];
  };

  this.validateWorkspace = (workspaceId, webtoken) => {
    if (workspaceId in store.workspaces && store.workspaces[workspaceId].webtoken === webtoken) {
      return true;
    }

    return false;
  };

  this.workspaces = () => store.workspaces;

  this.createSesssion = (workspaceId) => {
    const id = `LABS-${ mock.utils.generateAlphaNumeric(32) }|`;
    const session = {
      arenaSessionId: id,
      workspaceId,
      workspaceName: store.workspaces[workspaceId].name,
    };

    store.sessions[id] = session;

    return session;
  };

  this.validateSession = (arenaSessionId) => {
    if (!arena.validators.arenaSessionId.test(arenaSessionId)) {
      return false;
    }

    return arenaSessionId in store.sessions;
  };
}

module.exports = (mock, arena) => new DataStore(mock, arena);
