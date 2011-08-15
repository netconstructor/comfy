var request = require('request'),
    reStatusOK = /^2\d{2}$/,
    reServerLevelUrl = /^\_(uuids|stats|replication)/i,
    reContinuous = /feed\=continuous/i,
    reTrailingSlash = /\/$/;

/* internals */

/* exports */

function Couch(config) {
    var couch = this;
    
    // if no configuration was passed, then initialise an empty object literal
    config = config || {};

    // initialise members
    this.url = (config.url || 'http://localhost:5984/').replace(reTrailingSlash, '');
    this.db  = config.db;
    this.debug = config.debug;
    
    ['get', 'post', 'put', 'head', 'del'].forEach(function(method) {
        couch[method] = function(target, callback) {
            if (typeof target == 'function') {
                callback = target;
                target = undefined;
            } // if
            
            // if the target has been passed in as a string, then convert that to an action
            if (typeof target == 'string') {
                target = {
                    action: target
                };
            } // if
            
            // prepare the request
            couch._prepareRequest(target, method, function(requestOpts) {
                if (couch.debug) {
                    console.log(method, requestOpts);
                } // if
                
                request[method](requestOpts, couch._processResponse(requestOpts.onResponse, callback));
            });
        };
    });
} // Couch

Couch.prototype._checkDocData = function(data, callback) {
    if (! callback) {
        return;
    } // if
    
    if (! data._id) {
        this.get('_uuids', function(error, res) {
            callback(res.uuids[0], data);
        });
    }
    else {
        callback(data._id, data);
    } // if..else
}; // checkDocData

Couch.prototype._prepareRequest = function(target, method, callback) {
    
    var urlParts = [this.url],
        requestOpts = {},
        targetData = target || {},
        targetUrl = targetData.action || targetData._id;
        
    // if a database is currently specified, then add to the url
    if (this.db && (! reServerLevelUrl.test(targetUrl))) {
        urlParts.push(this.db);
    } // if
    
    // add the target url
    if (target && method.toUpperCase() === 'PUT') {
        this._checkDocData(target, function(id, data) {
            urlParts.push(id);

            callback({
                uri: urlParts.join('/'),
                json: target
            });
        });
    }
    else {
        if (targetUrl) {
            urlParts.push(targetUrl);
        } // if
        
        callback({
            uri: urlParts.join('/'),
            onResponse: reContinuous.test(targetUrl)
        });
    } // if..else
}; // makeOpts

Couch.prototype._processResponse = function(stream, callback) {
    function parseResponse(error, resp, body) {
        var processed;

        if (! error) {
            if (typeof body == 'object') {
                processed = body;
            }
            else if (body) {
                try {
                    processed = JSON.parse(body);
                }
                catch (e) {
                    console.log('error parsing JSON response:', body);
                    error = e;
                } // try..catch
            }
        } // if

        if (processed && callback) {
            callback(error || processed.error, processed);
        } // if
    } // parseResponse

    if (stream) {
        return function(error, resp, body) {
            if (error) {
                return;
            } // if
            
            // process the streamed data
            resp.on('data', function(data) {
                parseResponse(error, resp, data.toString());
            });
        };
    }
    else {
        return parseResponse;
    } // if..else
}; // _parseResponse

/* some high level helpers */

Couch.prototype.exists = function(target, callback) {
    if (typeof target == 'function') {
        callback = target;
        target = {};
    } // if
        
    this.get(target, function(error, res) {
        callback(! error, res);
    });
}; // exists

module.exports = Couch;