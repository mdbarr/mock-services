'use strict';

function API (mock, sendgrid) {
  sendgrid.req = (req, res, next) => {
    const requestId = `req_${ sendgrid.store.generateId(24) }`;
    req.requestId = requestId;

    res.header('Request-Id', requestId);
    res.header(`${ sendgrid.options.name }-version`, sendgrid.version);

    if (!sendgrid.options.silent) {
      mock.utils.logger(req);
    }
    return next();
  };

  //////////////////////////////////////////////////
  // V2 API

  mock.api.post('/api/mail.send.json', sendgrid.req, sendgrid.req, sendgrid.req, (req, res, next) => {
    if (!req.body.api_user || !req.body.api_key ||
        !req.body.to || !req.body.subject || !req.body.from) {
      res.send(400, { message: 'missing required fields' });
      return next();
    }

    let who;

    for (const user of sendgrid.store.getUsers()) {
      if (req.body.api_user === user.username) {
        if (!user.password || req.body.api_key === user.password) {
          who = user;
          break;
        } else {
          res.send(401, { message: 'invalid username or password' });
          return next();
        }
      }
    }

    if (!who) {
      res.send(401, { message: 'invalid username or password' });
      return next();
    }

    sendgrid.messages.message({
      user: who.name,
      ip: req.remoteAddress,
      to: req.body.to,
      toName: req.body.toname,
      from: req.body.from,
      fromName: req.body.fromname,
      subject: req.body.subject,
      body: req.body.html || req.body.text,
      passthrough: who.passthrough,
    });

    res.send(200, { message: 'success' });
    return next();
  });

  //////////////////////////////////////////////////
  // Interaction API

  mock.api.get('/api/users', sendgrid.req, sendgrid.req, sendgrid.req, (req, res, next) => {
    const response = {
      items: [],
      count: 0,
    };

    const users = sendgrid.store.getMessageStore();
    for (const item in users) {
      response.items.push({
        to: item,
        messages: users[item].length,
      });
      response.count++;
    }

    res.send(200, response);
    return next();
  });

  mock.api.get('/api/messages/:to', sendgrid.req, sendgrid.req, sendgrid.req, (req, res, next) => {
    const all = mock.utils.toBoolean(req.query.all);
    const full = mock.utils.toBoolean(req.query.full);
    const read = mock.utils.toBoolean(req.query.read);

    const messages = sendgrid.store.getMessages(req.params.to).
      filter((item) => {
        if (all) {
          return true;
        }
        return read ? item.read : !item.read;
      }).
      map((item, index) => {
        const message = {
          id: item.id,
          index,
          to: item.to,
          from: item.from,
          subject: item.subject,
          read: item.read,
        };

        if (full) {
          message.read = item.read = true;
          message.body = item.body;
        }

        return message;
      });

    const response = {
      items: messages,
      count: messages.length,
    };

    res.send(200, response);
    return next();
  });

  mock.api.get('/api/messages/:to/:index', sendgrid.req, sendgrid.req, sendgrid.req, (req, res, next) => {
    const message = sendgrid.store.getMessages(req.params.to)[req.params.index];
    if (message) {
      message.read = true;
      res.send(200, message);
    } else {
      res.send(404, { message: 'message not found' });
    }
    return next();
  });

  mock.api.get('/api/message/:id', sendgrid.req, sendgrid.req, sendgrid.req, (req, res, next) => {
    const message = sendgrid.store.getMessageById(req.params.id);
    if (!message) {
      res.send(404, { message: 'message not found' });
    } else {
      res.send(200, message);
    }
    return next();
  });

  //////////////////////////////////////////////////
  // Data Store API

  mock.api.get('/api/admin/messages', sendgrid.req, sendgrid.req, sendgrid.req, (req, res, next) => {
    const store = sendgrid.store.getMessageStore();
    res.sendRaw(200, JSON.stringify(store, null, 2));
    return next();
  });

  mock.api.get('/data/store', sendgrid.req, sendgrid.req, sendgrid.req, (req, res, next) => {
    const store = sendgrid.store.getMessageStore();
    res.sendRaw(200, JSON.stringify(store, null, 2));
    return next();
  });

  mock.api.post('/data/store/clear', sendgrid.req, sendgrid.req, sendgrid.req, (req, res, next) => {
    sendgrid.store.clear();
    res.send(200, { message: 'datastore cleared' });
    return next();
  });

  //////////////////////////////////////////////////

  this.boot = () => {
    mock.api.listen(sendgrid.config.apiPort, sendgrid.req, sendgrid.req, sendgrid.req, () => {
      console.log(`Mock Sendgrid API Server running on ${ sendgrid.config.apiPort }`);
    });
  };
}

module.exports = (mock, sendgrid) => new API(mock, sendgrid);
