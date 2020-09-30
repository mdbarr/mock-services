'use strict';

function Pipeline (mock, sendgrid) {
  this.stateTransition = (message, newState) => {
    if (!sendgrid.options.silent) {
      console.log('STATE TRANSITION %s [%s -> %s]', message.id, message.state, newState);
    }

    message.state = newState;

    sendgrid.webhooks.triggerEvent(message);

    return this.processMessage(message);
  };

  this.processMessage = (message) => {
    switch (message.state) {
      case sendgrid.messages.states.RECEIVED:
        if (message.to.includes(sendgrid.config.behaviors.drop)) {
          return this.stateTransition(message, sendgrid.messages.states.DROPPED);
        }
        return this.stateTransition(message, sendgrid.messages.states.PROCESSED);

      case sendgrid.messages.states.PROCESSED:
        if (message.to.includes(sendgrid.config.behaviors.bounce)) {
          return this.stateTransition(message, sendgrid.messages.states.BOUNCE);
        } else if (message.to.includes(sendgrid.config.behaviors.defer)) {
          return this.stateTransition(message, sendgrid.messages.states.DEFERRED);
        }
        return this.stateTransition(message, sendgrid.messages.states.DELIVERED);

      case sendgrid.messages.states.DELIVERED:
        if (message.to.includes(sendgrid.config.behaviors.open)) {
          return this.stateTransition(message, sendgrid.messages.states.OPEN);
        } else if (message.to.includes(sendgrid.config.behaviors.click)) {
          return this.stateTransition(message, sendgrid.messages.states.CLICK);
        } else if (message.to.includes(sendgrid.config.behaviors.unsubscribe)) {
          return this.stateTransition(message, sendgrid.messages.states.UNSUBSCRIBE);
        } else if (message.to.includes(sendgrid.config.behaviors.spam)) {
          return this.stateTransition(message, sendgrid.messages.states.spam);
        }
        return message;

      default:
        return message;
    }
  };
}

module.exports = (mock, sendgrid) => new Pipeline(mock, sendgrid);
