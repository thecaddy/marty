var fs = require('fs');
var _ = require('lodash');
var create = require('./lib/create');
var Dispatcher = require('./lib/dispatcher');
var package = JSON.parse(fs.readFileSync(__dirname + '/package.json'), 'utf-8');

var Marty = _.extend({
  version: package.version,
  dispatcher: new Dispatcher()
}, create);

module.exports = Marty;