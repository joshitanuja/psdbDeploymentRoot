var assert = require("assert");
var utils = require('../utils');
var mongodb = require('mongodb');

var mongodbModule = {
    createDBHandleAsync: function (server, dbName, callback) {
        var uri = server + dbName;
        mongodb.MongoClient.connect(uri, function (err, db) {
            if (err === null) {
                utils.log(utils.getShortfileName(__filename) + ": mongoDBCRUD: connected to database: " + dbName + " on server " + server);
                callback(null, new mongoDBCRUD(db));
            } else {
                utils.log(utils.getShortfileName(__filename) + ": mongoDBCRUD: connect to database (" + dbName + " ) on server " + server + " failed: " + err.message);
                callback(err, null);
            }
        });
    },
    createDBHandle: function (server, dbName) {
        return null;
    }
};
var mongoDBCRUD = (function () {
    function mongoDBCRUD(dbHandle) {
        this.checkAllOk = function (collection) {
            if (this.dbHandle === null) {
                utils.log(utils.getShortfileName(__filename) + "dbHandle is null");
                return utils.errors.inconsistentDB;
            } else {
                return null;
            }
        };
        this.dbHandle = dbHandle;
    }
    mongoDBCRUD.prototype.getNextId = function (collection, callback) {
        this.dbHandle.collection(global.config.psdb.countersCollectionName).findAndModify({ "_id": collection }, null, { $inc: { seq: 1 } }, { new: true }, function (err1, result) {
            if (err1 === null) {
                callback(null, result.seq);
            } else {
                callback(err1, -1);
            }
        });
        return;
    };

    mongoDBCRUD.prototype.fixQueryForObjectId = function (query) {
        var fixedQuery = query;
        if (global.config.psdb.useObjectID) {
            fixedQuery = {};

            for (var prop in query) {
                if (query.hasOwnProperty(prop)) {
                    if (prop === "_id") {
                        fixedQuery[prop] = new mongodb.ObjectID(query[prop]);
                    } else {
                        fixedQuery[prop] = query[prop];
                    }
                }
            }
        }
        return fixedQuery;
    };

    mongoDBCRUD.prototype.insertObj = function (collection, objMap, callback) {
        var self = this, checkerror = this.checkAllOk(collection);
        if (checkerror !== null) {
            callback(checkerror, null);
            return;
        }

        if (objMap._id !== null && objMap._id !== undefined) {
            this.insertObjInternal(collection, objMap, callback);
        } else {
            this.getNextId(collection, function (err1, seq) {
                if (err1 !== null) {
                    callback(err1, null);
                } else {
                    objMap._id = collection + seq.toString();
                    self.insertObjInternal(collection, objMap, callback);
                }
            });
        }
    };
    mongoDBCRUD.prototype.insertObjInternal = function (collection, objMap, callback) {
        this.dbHandle.collection(collection).insert(objMap, function (err1, result) {
            if (err1 !== null) {
                callback(err1, null);
            } else {
                assert.equal(result.length, 1);
                if (result.length !== 1) {
                    utils.log("Returning inconsistentDB error out of insertOb");
                    callback(utils.errors.inconsistentDB, null);
                } else {
                    callback(null, result[0]);
                }
            }
        });
    };

    mongoDBCRUD.prototype.findObj = function (collection, findMap, projMap, callback) {
        var checkerror = this.checkAllOk(collection);
        if (checkerror !== null) {
            callback(checkerror, null);
            return;
        }
        this.dbHandle.collection(collection).find(findMap, projMap, function (err1, result) {
            if (err1 !== null) {
                callback(err1, null);
            } else {
                result.toArray(function (err2, retVal) {
                    if (err2 !== null) {
                        callback(err2, null);
                    } else {
                        callback(null, retVal);
                    }
                });
            }
        });
    };

    mongoDBCRUD.prototype.updateObj = function (collection, findMap, setMap, callback, options) {
        var upsertOptionValue, checkerror = this.checkAllOk(collection);
        if (checkerror !== null) {
            callback(checkerror, null);
            return;
        }

        upsertOptionValue = (options !== null && options !== undefined && options.upsert !== undefined) ? options.upsert : false;
        this.dbHandle.collection(collection).update(findMap, { $set: setMap }, { safe: true, upsert: upsertOptionValue, multi: false, fullResult: true }, function (err1, result) {
            if (err1 !== null) {
                callback(err1, 0);
            } else {
                callback(null, 1);
            }
        });
    };

    mongoDBCRUD.prototype.deleteObj = function (collection, findMap, callback) {
        var checkerror = this.checkAllOk(collection);
        if (checkerror !== null) {
            callback(checkerror, null);
            return;
        }
        this.dbHandle.collection(collection).remove(findMap, { safe: true, single: true }, function (err1, result) {
            if (err1 !== null) {
                callback(err1, 0);
            } else {
                callback(null, 1);
            }
        });
    };
    return mongoDBCRUD;
})();

module.exports = mongodbModule;
