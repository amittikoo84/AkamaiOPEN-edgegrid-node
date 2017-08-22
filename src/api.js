
var request = require('request'),
    fs = require('fs'),
    url = require('url'),
    auth = require('./auth'),
    edgerc = require('./edgerc'),
    helpers = require('./helpers'),
    logger = require('./logger');

var EdgeGrid = function(client_token, client_secret, access_token, host) {
  // accepting an object containing a path to .edgerc and a config group
  if (typeof arguments[0] === 'object') {
    this._setConfigFromObj(arguments[0]);
  } else {
    this._setConfigFromStrings(client_token, client_secret, access_token, host);
  }
};

EdgeGrid.prototype.auth = function(req) {
  req = helpers.extend(req, {
    url: this.config.host + req.path,
    method: 'GET',
    headers: {
      'Content-Type': "application/json"
    },
    followRedirect: false,
    body: {}
  });

  this.request = auth.generate_auth(req, this.config.client_token, this.config.client_secret, this.config.access_token, this.config.host);
};

EdgeGrid.prototype.send = function(proxy, callback) {
  if(proxy) {
   this.request.proxy = proxy;   
  }
  request(this.request, function(error, response, body) {
    if (error) { throw new Error(error); }

    if (helpers.isRedirect(response.statusCode)) {
      this._handleRedirect(response, callback);
      return;
    }

    callback(body, response);
  }.bind(this));
};

EdgeGrid.prototype._handleRedirect = function(resp, callback) {
  var parsedUrl = url.parse(resp.headers['location']);

  resp.headers['authorization'] = undefined;
  this.request.url = undefined;
  this.request.path = parsedUrl.path;

  this.auth(this.request);
  this.send(callback);
};

EdgeGrid.prototype._setConfigFromObj = function(obj) {
  if (!obj.path) {
    if (!process.env.EDGEGRID_ENV === 'test') {
      logger.error('No .edgerc path');
    }

    throw new Error('No edgerc path');
  }

  this.config = edgerc(obj.path, obj.group);
};

EdgeGrid.prototype._setConfigFromStrings = function(client_token, client_secret, access_token, host) {
  if (!validatedArgs([client_token, client_secret, access_token, host])) {
    throw new Error('Insufficient Akamai credentials');
  }

  this.config = {
    client_token: client_token,
    client_secret: client_secret,
    access_token: access_token,
    host: host.indexOf('https://') > -1 ? host : 'https://' + host
  };
};

function validatedArgs(args) {
  var expected = [
        'client_token', 'client_secret', 'access_token', 'host'
      ],
      valid = true,
      i;

  expected.forEach(function(arg, i) {
    if (!args[i]) {
      if (process.env.EDGEGRID_ENV !== 'test' ) {
        logger.error('No defined ' + arg);
      }

      valid = false;
    }
  });

  return valid;
}

EdgeGrid.prototype._setConfigFromObj = function(obj) {
  if (!obj.path) {
    if (!process.env.EDGEGRID_ENV === 'test') {
      logger.error('No .edgerc path');
    }

    throw new Error('No edgerc path');
  }

  this.config = edgerc(obj.path, obj.group);
};

module.exports = EdgeGrid;
