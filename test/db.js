var async = require('async'),
    couch = require('./init');
    
function deleteExistingDB(callback) {
    console.log('Checking for existing db');
    couch.exists(function(exists) {
        if (exists) {
            console.log('DB exists, deleting');
            couch.del(callback);
        }
        else {
            callback();
        } // if..else
    });
} // deleteExistingDB

function createDB(callback) {
    couch.put(callback);
} // createDB

function testDocPut(callback) {
    console.log('testing document creation');

    couch.put({ title: 'Test Document' }, function(res) {
        callback(res.error, res);
    });
} // testDocPut

function testDocGet(data, callback) {
    console.log('testing document retrieval. getting id: ' + data.id);
    
    couch.get(data.id, function(res) {
        callback(res.error, res);
    });
} // testDocGet

deleteExistingDB(function() {
    createDB(function(res) {
        if (res.error) {
            console.log('Error connecting to CouchDB, aborting tests');
            return;
        } // if

        async.waterfall([testDocPut, testDocGet], function(error) {
            if (! error) {
                console.log('tests completed successfully');
            } // if
        });
    });
});