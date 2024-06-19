const version = require('../package').version;

function State () {
  this.version = version;

  this.session = null;
  this.loading = false;
}

export default new State();
