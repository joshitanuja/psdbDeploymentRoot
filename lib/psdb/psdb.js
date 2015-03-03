"use strict";
var crudmodule = require('./crudmodule');
var utils = require('../utils');
var PuzzleSeries = require('./series');

var Token = (function () {
    function Token(seriesId, database, role, credentials) {
        this.seriesId = seriesId;
        this.database = database;
        this.role = role;
        this.credentials = credentials;
        this.tokenString = Token.createUniqueToken(seriesId, role, credentials.userName);
        this.creationTime = Date.now();
    }
    Token.createUniqueToken = function (seriesId, role, name) {
        var retval;
        if (global.config.Debug) {
            retval = Token.tokenIndex + '-' + seriesId + '-' + role + '-' + name;
        } else {
            var t = Math.floor(Math.random() * 1000).toString();
            var d = new Date();
            retval = Token.tokenIndex + "-" + t + "-" + seriesId + "-" + d.getMilliseconds().toString();
        }
        Token.tokenIndex += Math.floor(Math.random() * 10);
        return retval;
    };

    Token.prototype.isValid = function () {
        var currentTime = Date.now();
        utils.log(" config tolerence= " + global.config.psdb.tokenValidityTolerence);
        var tolerence = global.config.psdb.tokenValidityTolerence || 86400000;
        utils.log("creation: " + this.creationTime + " current: " + currentTime + " tolerence: " + tolerence);
        return (currentTime - this.creationTime < tolerence);
    };
    Token.tokenIndex = 0;
    return Token;
})();

var infoDBcrud, initError, initCalled, initCallbackArray = [], seriesInfoMap, roleTypes = {
    'administrator': 'administrator',
    'instructor': 'instructor',
    'player': 'player'
}, tokenMap = {}, env = process.env.BUILD_ENV || "ENV_NOT_FOUND";

console.log("Started psdb module in " + env + " ... ");
initError = null;
initCalled = false;
infoDBcrud = null;
seriesInfoMap = {};

var psdb = {
    checkAllOk: function (seriesId) {
        if (!initCalled) {
            return utils.errors.initNotCalled;
        } else if (initError !== null) {
            return initError;
        } else if (infoDBcrud === null) {
            return utils.errors.initPending;
        } else if (seriesInfoMap === null) {
            return utils.errors.inconsistentDB;
        } else if (seriesId && !seriesInfoMap[seriesId]) {
            return utils.errors.invalidSeriesID;
        } else if (seriesId && !seriesInfoMap[seriesId].dbHandle) {
            return utils.errors.inconsistentDB;
        } else {
            return null;
        }
    },
    fixSeriesFieldsToReturn: function (inList) {
        var found = false, outList = { 'name': 1, 'description': 1, "_id": 1 }, fieldsToRemove = [];
        if (Object.getOwnPropertyNames(inList).length === 0) {
            return outList;
        }
        for (var prop in outList) {
            if (inList[prop] === undefined) {
                fieldsToRemove.push(prop);
            }
        }
        fieldsToRemove.forEach(function (prop) {
            delete outList[prop];
        });
        if (Object.getOwnPropertyNames(outList).length === 0) {
            return { 'name': 1, 'description': 1, "_id": 1 };
        } else {
            return outList;
        }
    },
    getSeriesTokenInternal: function (seriesId, role, credentials, options, callback) {
        var checkErr = this.checkAllOk(seriesId);
        if (checkErr !== null) {
            console.log("returning error out of getSeriesTOkenInternal: " + JSON.stringify(checkErr));
            setTimeout(function () {
                callback(checkErr, null);
            }, 100);
            return;
        }

        var userCrud, collectionName;
        switch (role) {
            case "administrator":
                userCrud = infoDBcrud;
                collectionName = global.config.psdb.userInfoCollectionName;
                break;
            case "instructor":
                userCrud = seriesInfoMap[seriesId].dbHandle;
                collectionName = global.config.psdb.instructorsCollectionName;
                break;
            case "player":
                userCrud = seriesInfoMap[seriesId].dbHandle;
                collectionName = global.config.psdb.playersCollectionName;
        }
        userCrud.findObj(collectionName, { "name": credentials.userName }, { roleType: 1, password: 1 }, function (innerErr1, userList) {
            if (innerErr1) {
                callback(innerErr1, null);
                return;
            } else if (userList.length === 0 || (userList[0].password && userList[0].password !== credentials.password)) {
                callback(utils.errors.invalidCredentials, null);
                return;
            } else {
                if (userList[0].roleType !== undefined && userList[0].roleType.indexOf(role) < 0) {
                    callback(utils.errors.invalidRole, null);
                    return;
                } else {
                    var seriesToken = new Token(seriesId, seriesInfoMap[seriesId].database, role, credentials);

                    tokenMap[seriesToken.tokenString] = { "token": seriesToken, "crudHandle": seriesInfoMap[seriesId].dbHandle };
                    utils.log(utils.getShortfileName(__filename) + " returning token " + seriesToken.tokenString);
                    callback(null, seriesToken.tokenString);
                }
            }
        });
        return;
    },
    callInitCompleteCallback: function (err) {
        var item = initCallbackArray.shift();
        while (item) {
            item(err);
            item = initCallbackArray.shift();
        }
    },
    Init: function (initComplete) {
        var self = this;
        console.log("******* psdb module init called ***********");
        if (initCalled === true) {
            var checkErr = this.checkAllOk();
            if (checkErr && checkErr === utils.errors.initPending) {
                initCallbackArray.push(initComplete);
                return;
            } else if (checkErr) {
                initComplete(checkErr);
                return;
            } else {
                initComplete(null);
                return;
            }
        } else {
            initCalled = true;
            utils.log("psdb:Init() called with " + global.config.psdb.serverName + " " + global.config.psdb.infoDBName);
            initCallbackArray.push(initComplete);
            crudmodule.createDBHandleAsync(global.config.psdb.serverName, global.config.psdb.infoDBName, function (err, dbcrud) {
                utils.log("psdb:createDBHandleAsync returned with " + err);

                if (err === null) {
                    infoDBcrud = dbcrud;
                    initError = null;

                    infoDBcrud.findObj(global.config.psdb.seriesInfoCollectionName, {}, {}, function (innerErr2, seriesList) {
                        if (innerErr2 !== null) {
                            utils.log("findObj failed for seriesList with : " + innerErr2.message);
                            self.callInitCompleteCallback(innerErr2);
                        } else {
                            var seriesCount = seriesList.length;
                            for (var i = 0; i < seriesCount; i++) {
                                utils.log("got serisInfo for: " + seriesList[i]._id + " **** " + seriesList[i]);
                                seriesInfoMap[seriesList[i]._id] = seriesList[i];
                            }
                            utils.log("Cached serisInfo: " + JSON.stringify(seriesInfoMap));
                            self.callInitCompleteCallback(null);
                        }
                    });
                } else {
                    infoDBcrud = null;
                    initError = err;
                    self.callInitCompleteCallback(err);
                }
            });
        }
    },
    findSeries: function (queryFields, fieldsReturned, callback) {
        var fixedFieldsReturned, checkErr = this.checkAllOk();
        if (checkErr !== null) {
            setTimeout(function () {
                callback(checkErr, null);
            }, 100);
            return;
        }

        fixedFieldsReturned = this.fixSeriesFieldsToReturn(fieldsReturned);

        infoDBcrud.findObj(global.config.psdb.seriesInfoCollectionName, queryFields, fixedFieldsReturned, function (innerErr, seriesList) {
            callback(innerErr, seriesList);
        });
    },
    getSeriesToken: function (seriesId, role, credentials, options, callback) {
        var self = this;
        var checkErr = this.checkAllOk();
        if (checkErr !== null) {
            setTimeout(function () {
                callback(checkErr, null);
            }, 100);
            return;
        }

        if (!seriesInfoMap[seriesId]) {
            utils.log("invalid seriesId requested: " + seriesId);
            callback(utils.errors.invalidSeriesID, null);
            return;
        }
        if (!seriesInfoMap[seriesId].database) {
            callback(utils.errors.inconsistentDB, null);
            return;
        }

        if (seriesInfoMap[seriesId].dbHandle) {
            self.getSeriesTokenInternal(seriesId, role, credentials, options, callback);
            return;
        } else {
            crudmodule.createDBHandleAsync(global.config.psdb.serverName, seriesInfoMap[seriesId].database, function (innerErr3, dbcrud) {
                if (innerErr3 !== null) {
                    callback(innerErr3, null);
                } else {
                    seriesInfoMap[seriesId].dbHandle = dbcrud;

                    self.getSeriesTokenInternal(seriesId, role, credentials, options, callback);
                }
            });
            return;
        }
    },
    releaseSeriesToken: function (token, callback) {
        if (tokenMap[token] && tokenMap[token].token && tokenMap[token].token.isValid()) {
            delete tokenMap[token];
            utils.log("Token released: " + token);
            callback(null);
        } else {
            callback(utils.errors.invalidTokenID);
        }
    },
    series: function (token) {
        if (tokenMap[token]) {
            if (tokenMap[token].token && tokenMap[token].token.isValid()) {
                if (tokenMap[token].crudHandle === null) {
                    utils.log(" Error: dbHandle to the series database is null in the request for a series object");
                }
                return new PuzzleSeries(tokenMap[token].token, tokenMap[token].crudHandle);
            } else {
                utils.log(utils.getShortfileName(__filename) + " got an invalidToken request with token: " + token);
                delete tokenMap[token];
                return null;
            }
        }
        return null;
    },
    translateURLQuery: function (query) {
        if (query === null || query === undefined) {
            return {};
        }
        var translatedQuery = { findMap: {}, projectionMap: {} }, queryParts, subparts, fieldValue, values, queryOperator, projParts;
        var transFunc = function (item) {
            translatedQuery.projectionMap[item] = 1;
        };
        for (var fieldName in query) {
            if (query.hasOwnProperty(fieldName)) {
                if (fieldName === global.config.psdb.projectionMapKeyWord) {
                    projParts = query[fieldName].split(global.config.psdb.queryValueSeparator);
                    projParts.forEach(transFunc);
                } else {
                    if (query[fieldName].indexOf(global.config.psdb.queryValueSeparator) !== -1) {
                        queryOperator = '$in';
                        values = query[fieldName].split(global.config.psdb.queryValueSeparator);
                    } else {
                        queryOperator = null;

                        if (query[fieldName] === "true" || query[fieldName] === "false") {
                            values = JSON.parse(query[fieldName]);
                        } else {
                            values = query[fieldName];
                        }
                    }
                    if (fieldName.lastIndexOf('!') === 0) {
                        fieldName = fieldName.substr(1);
                        if (queryOperator === null) {
                            values = [values];
                        }

                        queryOperator = '$nin';
                    }
                    if (queryOperator !== null) {
                        fieldValue = {};
                        fieldValue[queryOperator] = values;
                    } else {
                        fieldValue = values;
                    }
                    translatedQuery.findMap[fieldName] = fieldValue;
                }
            }
        }
        return translatedQuery;
    }
};

module.exports = psdb;
