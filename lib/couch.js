var request = require('request'),
    reStatusOK = /^2\d{2}$/,
    reServerLevelUrl = /^\_(uuids|stats|replication|changes)/i,
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
    
    ['get', 'post', 'put', 'head', 'del'].forEach(function(method) {
        couch[method] = function(target, opts, callback) {
            if (typeof target == 'function') {
                callback = target;
                opts = {};
                target = '';
            }
            else if (typeof opts == 'function') {
                callback = opts;
                opts = {};
            } // if..else
            
            // initialise default values
            target = target || '';
            opts = opts || {};
            
            // prepare the request
            couch._prepareRequest(target, opts, function(requestOpts) {
                request[method](requestOpts, couch._processResponse(callback));
            });
        };
    });
} // Couch

Couch.prototype._checkDocData = function(data, callback) {
    if (! callback) {
        return;
    } // if
    
    if (! data._id) {
        this.get('_uuids', function(res) {
            callback(res.uuids[0], data);
        });
    }
    else {
        callback(data._id, data);
    } // if..else
}; // checkDocData

Couch.prototype._prepareRequest = function(target, opts, callback) {
    
    var urlParts = [this.url],
        requestOpts = {};
        
    // if a database is currently specified, then add to the url
    if (this.db && (! reServerLevelUrl.test(target))) {
        urlParts.push(this.db);
    } // if
    
    // add the target url
    if (typeof target == 'object') {
        this._checkDocData(target, function(id, data) {
            urlParts.push(id);

            callback({
                uri: urlParts.join('/'),
                json: target
            });
        });
    }
    else {
        if (target) {
            urlParts.push(target);
        } // if
        
        callback({
            uri: urlParts.join('/')
        });
    } // if..else
}; // makeOpts

Couch.prototype._processResponse = function(callback) {
    var processed = {};

    return function(error, resp, body) {
        if (error) {
            processed = {
                error: 'cannot_connect',
                reason: error.message
            };
        }
        else if (typeof body == 'object') {
            processed = body;
        }
        else {
            try {
                processed = JSON.parse(body);
            }
            catch (e) {
                console.log(body);
                processed.error = e.message;
            } // try..catch
        } // if..else

        if (callback) {
            callback(processed);
        } // if
    };
}; // _parseResponse

/* some high level helpers */

Couch.prototype.exists = function(target, callback) {
    if (typeof target == 'function') {
        callback = target;
        target = '';
    } // if
        
    this.get(target, function(res) {
        callback(! res.error);
    });
}; // exists

module.exports = Couch;