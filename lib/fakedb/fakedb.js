var fs = require('fs');
var assert = require("assert");
var utils = require('../utils');
var fakedbModule = {
    createDBHandleAsync: function (server, dbName, callback) {
        utils.log("fakedb: createDBHandleAsync called");
        setTimeout(callback(null, new fakeDB(server, dbName)), 100);
    },
    createDBHandle: function (server, dbName) {
        return new fakeDB(server, dbName);
    }
};
var fakeDB = (function () {
    function fakeDB(server, dbName) {
        this.lastIndex = {};
        this.readFakeDatabase = function (fakeDBFilename) {
            if (fs.existsSync(fakeDBFilename)) {
                utils.log(utils.getShortfileName(__filename) + " file found " + fakeDBFilename);
                this.handleToDataBase = JSON.parse(fs.readFileSync(fakeDBFilename, 'utf8'));
            } else {
                this.handleToDataBase = {
                    "seriesInfoCollection": [
                        { "name": "HC Test Series1", "_id": "testSeriesId1", "description": "description for test series 1" },
                        { "name": "HC Test Series2", "_id": "testSeriesId2", "description": "description for test series 2" }
                    ]
                };
            }
        };
        var fakeDBFilename;
        this.server = server;
        this.dbName = dbName;
        utils.log("server = " + server + "dbName " + dbName);
        fakeDBFilename = __dirname + "/" + dbName + ".json";
        this.readFakeDatabase(fakeDBFilename);
    }
    fakeDB.prototype.insertObj = function (collection, objMap, callback) {
        if (!fakeDB.checkInDebug()) {
            callback(utils.errors.notInDebug, null);
            return;
        }

        utils.log(utils.getShortfileName(__filename) + " collection requested " + collection);
        utils.log("collection = " + this.handleToDataBase[collection]);

        if (!this.handleToDataBase[collection]) {
            utils.log(utils.getShortfileName(__filename) + " collection not found: " + collection);
            callback(utils.errors.notImpl, null);
        }

        if (this.lastIndex[collection] === undefined) {
            this.lastIndex[collection] = 1;
        }
        objMap._id = collection + "Id" + this.lastIndex[collection];
        this.lastIndex[collection]++;

        this.handleToDataBase[collection].push(objMap);

        callback(null, objMap);
    };

    fakeDB.prototype.findObj = function (collection, findMap, projMap, callback) {
        if (!fakeDB.checkInDebug()) {
            callback(utils.errors.notInDebug, null);
            return;
        }

        utils.log(utils.getShortfileName(__filename) + " collection requested " + collection);
        utils.log("collection = " + this.handleToDataBase[collection]);

        if (!this.handleToDataBase[collection]) {
            utils.log(utils.getShortfileName(__filename) + " collection not found: " + collection);
            callback(utils.errors.notImpl, null);
        }

        var retVal = this.handleToDataBase[collection];

        if (findMap.name || findMap._id) {
            var prop = findMap._id ? "_id" : "name", found = false;
            utils.log(utils.getShortfileName(__filename) + " found property: " + prop);
            for (var i = 0; i < retVal.length && !found; i++) {
                if (retVal[i][prop] === findMap[prop]) {
                    utils.log(utils.getShortfileName(__filename) + " found item: " + retVal[i][prop]);
                    retVal = retVal.slice(i, i + 1);
                    found = true;
                }
            }
            if (!found) {
                retVal = [];
            } else {
                assert(retVal.length === 1);
            }
        }
        setTimeout(callback(null, retVal), 100);
    };

    fakeDB.prototype.updateObj = function (collection, findMap, setMap, callback) {
        var updateObj;
        if (!fakeDB.checkInDebug()) {
            callback(utils.errors.notInDebug, null);
            return;
        }

        utils.log(utils.getShortfileName(__filename) + " collection requested " + collection);
        utils.log("collection = " + this.handleToDataBase[collection]);

        if (!this.handleToDataBase[collection]) {
            utils.log(utils.getShortfileName(__filename) + " collection not found: " + collection);
            callback(utils.errors.notImpl, null);
        }

        if (findMap.name || findMap._id) {
            var prop = findMap._id ? "_id" : "name", found = false;
            utils.log(utils.getShortfileName(__filename) + " found property: " + prop);
            for (var i = 0; i < this.handleToDataBase[collection].length && !found; i++) {
                if (this.handleToDataBase[collection][i][prop] === findMap[prop]) {
                    updateObj = this.handleToDataBase[collection][i];
                    utils.log(utils.getShortfileName(__filename) + "updateObj: found item: " + this.handleToDataBase[collection][i].toString());
                    found = true;
                    for (var setProp in setMap) {
                        if (setMap.hasOwnProperty(setProp)) {
                            updateObj[setProp] = setMap[setProp];
                        }
                    }
                    utils.log(utils.getShortfileName(__filename) + "updateObj: found item: " + updateObj.toString());
                    utils.log(utils.getShortfileName(__filename) + "updateObj: updated item: " + this.handleToDataBase[collection][i].toString());
                }
            }
            if (found) {
                setTimeout(callback(null, 1), 100);
            } else {
                setTimeout(callback(utils.errors.inconsistentDB, 0), 100);
            }
            return;
        }
        setTimeout(callback(utils.errors.inconsistentDB, 0), 100);
    };

    fakeDB.prototype.deleteObj = function (collection, findMap, callback) {
        if (!fakeDB.checkInDebug()) {
            callback(utils.errors.notInDebug, null);
            return;
        }
        callback(utils.errors.notImpl, 0);
    };
    fakeDB.checkInDebug = function () {
        return (global.config && global.config.psdb.useFakeDB === true);
    };
    return fakeDB;
})();

module.exports = fakedbModule;
