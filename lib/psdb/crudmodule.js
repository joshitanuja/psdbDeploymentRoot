var fakedbModule = require('../fakedb/fakedb');
var mongodbModule = require('./mongodbcrud');
"use strict";

var dbcrudmodule = {
    createDBHandleAsync: function (server, dbName, callback) {
        if (global.config.psdb.useFakeDB) {
            fakedbModule.createDBHandleAsync(global.config.psdb.fakeserver, dbName, callback);
        } else {
            mongodbModule.createDBHandleAsync(server, dbName, callback);
        }
        return;
    },
    createDBHandle: function (server, dbName) {
        if (global.config.psdb.useFakeDB) {
            return fakedbModule.createDBHandle(global.config.psdb.fakeserver, dbName);
        } else {
            return mongodbModule.createDBHandle(server, dbName);
        }
    }
};
module.exports = dbcrudmodule;
