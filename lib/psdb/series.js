var utils = require('../utils');
var validator = require('../validator');


var PuzzleSeries = (function () {
    function PuzzleSeries(token, crudHandle) {
        this.token = token;
        this.crudHandle = crudHandle;
        if (!PuzzleSeries.initDone) {
            PuzzleSeries.initializeObjTypeMap();
        }
    }
    PuzzleSeries.prototype.checkObjectValidity = function (objType, currentObj, updateFields, callback) {
        var err = { name: "InvalidUpdate", message: "" };
        switch (objType) {
            case "events":
                if (updateFields.status) {
                    if (currentObj.status === "ended" || (currentObj.status === "notStarted" && updateFields.status !== "started") || (currentObj.status === "started" && updateFields.status !== "ended")) {
                        err.message = "Events: status update is invalid";
                        callback(err);
                        return;
                    }
                }
                break;
            case "teams":
                if (updateFields.teamLeadId) {
                }
                break;
            case "players":
                break;
            case "instructors":
                break;
            case "puzzles":
                break;
            default:
                break;
        }
        callback(null);
    };

    PuzzleSeries.prototype.activate = function (objType, objId, callback) {
    };
    PuzzleSeries.prototype.deactivate = function (objType, objId, callback) {
    };

    PuzzleSeries.prototype.updateObj = function (objType, objId, updateFields, callback) {
        var self = this;

        if (objType === "puzzleStates" || !PuzzleSeries.checkObjType(objType)) {
            utils.log(utils.getShortfileName(__filename) + " returning invalidObjType error with objType: " + objType);
            callback(utils.errors.invalidObjType, null);
            return;
        }

        var writePermission = PuzzleSeries.seriesObjTypeMap[objType].allowedPropertyMap[this.token.role].write;

        if (writePermission != "unrestricted" && (Array.isArray(writePermission) && writePermission.length === 0)) {
            callback(utils.errors.UnauthorizedAccess, null);
            return;
        }
        if (!PuzzleSeries.checkObjForUpdate(updateFields, writePermission)) {
            callback(utils.errors.UnauthorizedAccess, 0);
        } else {
            self.crudHandle.findObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, { "_id": objId }, {}, function (innererr1, objList) {
                if (innererr1) {
                    callback(innererr1, 0);
                } else {
                    if (objList.length != 1) {
                        callback(utils.errors.inconsistentDB, 0);
                    } else {
                        self.checkObjectValidity(objType, objList[0], updateFields, function (innererr2) {
                            if (innererr2) {
                                callback(innererr2, 0);
                            } else {
                                self.crudHandle.updateObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, { "_id": objId }, updateFields, function (innererr3, count) {
                                    if (innererr3) {
                                        callback(innererr3, 0);
                                    } else {
                                        if (count < 1) {
                                            callback(utils.errors.inconsistentDB, 0);
                                        } else {
                                            callback(null, count);
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
    };

    PuzzleSeries.prototype.addObj = function (objType, objInfo, callback) {
        var self = this, writePermission, fixedObj;

        if (objType === "puzzleStates" || !PuzzleSeries.checkObjType(objType)) {
            utils.log(utils.getShortfileName(__filename) + " returning invalidObjType error with objType: " + objType);
            callback(utils.errors.invalidObjType, null);
            return;
        }

        writePermission = PuzzleSeries.seriesObjTypeMap[objType].allowedPropertyMap[this.token.role].write;

        if (writePermission !== "unrestricted" && (Array.isArray(writePermission) && writePermission.length === 0)) {
            callback(utils.errors.UnauthorizedAccess, null);
            return;
        }

        PuzzleSeries.jsonValidator.checkSchema(objType, objInfo, function (innerErr1) {
            if (innerErr1 && innerErr1.length !== 0) {
                console.log(innerErr1);
                var error = { "name": "InvalidObjSchema", "message": innerErr1.toString() };
                callback(error, null);
            } else {
                fixedObj = PuzzleSeries.commonFixObjForInsertion(objInfo, writePermission);

                if (PuzzleSeries.seriesObjTypeMap[objType].fixObjForInsertion && typeof (PuzzleSeries.seriesObjTypeMap[objType].fixObjForInsertion) === "function") {
                    fixedObj = PuzzleSeries.seriesObjTypeMap[objType].fixObjForInsertion(fixedObj);
                }
                utils.log("*********** " + utils.getShortfileName(__filename) + "after fixing second time " + JSON.stringify(fixedObj));

                self.crudHandle.insertObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, fixedObj, function (innerErr2, resultObj) {
                    if (innerErr2 !== null) {
                        callback(innerErr2, null);
                    } else {
                        var prunedFieldsReturned = PuzzleSeries.pruneFields(resultObj, objType, self.token.role);
                        utils.log("*********** " + utils.getShortfileName(__filename) + "returning " + JSON.stringify(prunedFieldsReturned));
                        callback(null, prunedFieldsReturned);
                    }
                });
            }
        });
    };

    PuzzleSeries.prototype.deleteObj = function (objType, objInfo, callback) {
        var self = this, writePermission;

        if (!PuzzleSeries.checkObjType(objType)) {
            utils.log(utils.getShortfileName(__filename) + " returning invalidObjType error with objType: " + objType);
            callback(utils.errors.invalidObjType, null);
            return;
        }

        writePermission = PuzzleSeries.seriesObjTypeMap[objType].allowedPropertyMap[this.token.role].write;

        if (writePermission != "unrestricted" && (Array.isArray(writePermission) && writePermission.length === 0)) {
            callback(utils.errors.UnauthorizedAccess, null);
            return;
        }

        self.crudHandle.deleteObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, objInfo, function (innerErr2, count) {
            if (innerErr2 != null) {
                callback(innerErr2, null);
            } else {
                if (count < 1) {
                    callback(utils.errors.inconsistentDB, 0);
                } else {
                    callback(null, 1);
                }
            }
        });
    };

    PuzzleSeries.prototype.addPlayersToTeam = function (listPlayerIds, teamId, callback) {
    };

    PuzzleSeries.prototype.removePlayersFromTeam = function (listPlayerIds, teamId, callback) {
    };

    PuzzleSeries.prototype.findObj = function (objType, queryFields, fieldsReturned, callback) {
        if (!PuzzleSeries.checkObjType(objType)) {
            utils.log(utils.getShortfileName(__filename) + " returning invalidObjType error with objType: " + objType);
            callback(utils.errors.invalidObjType, null);
            return;
        }

        var prunedFieldsReturned = PuzzleSeries.pruneFields(fieldsReturned, objType, this.token.role);
        utils.log(" objType " + objType);
        utils.log(" soType " + PuzzleSeries.seriesObjTypeMap[objType]);
        utils.log(" collection " + PuzzleSeries.seriesObjTypeMap[objType].collectionName);
        this.crudHandle.findObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, queryFields, prunedFieldsReturned, function (innerErr, objList) {
            callback(innerErr, objList);
        });
    };

    PuzzleSeries.prototype.setEventStatus = function (eventId, eventStatus, callback) {
    };

    PuzzleSeries.prototype.assignPuzzlesToTeam = function (listPuzzleIds, teamId, callback) {
    };

    PuzzleSeries.prototype.removePuzzlesFromTeam = function (listPuzzleIds, teamId, callback) {
    };

    PuzzleSeries.prototype.updatePuzzleState = function (teamID, puzzleID, puzzleState, callback) {
        var self = this, pzStateId, puzzleStateCollectionName, eventId;

        pzStateId = PuzzleSeries.composePuzzleStateId(teamID, puzzleID);
        puzzleStateCollectionName = global.config.psdb.puzzleStatesCollectionNamePrefix + eventId;

        this.crudHandle.findObj(puzzleStateCollectionName, { "_id": pzStateId }, {}, function (err, objList) {
            if (err) {
                callback(err);
            } else {
                if (objList && objList.length === 1) {
                    self.crudHandle.updateObj(puzzleStateCollectionName, { "_id": pzStateId }, { "solved": puzzleState }, function (err1, count) {
                        if (err1) {
                            callback(err1);
                        } else {
                            if (count < 1) {
                                callback(utils.errors.inconsistentDB);
                            } else {
                                callback(null);
                            }
                        }
                    });
                } else {
                    self.crudHandle.insertObj(puzzleStateCollectionName, { "_id": pzStateId, "teamId": teamID, "puzzleId": puzzleID, "solved": puzzleState }, function (err2, obj) {
                        if (err2) {
                            callback(err2);
                        } else {
                            callback(null);
                        }
                    });
                }
            }
        });
    };
    PuzzleSeries.initDone = false;

    PuzzleSeries.seriesObjTypeMap = {
        'instructors': {
            collectionName: global.config.psdb.instructorsCollectionName,
            allowedPropertyMap: {
                'administrator': {
                    "read": "unrestricted",
                    "write": "unrestricted"
                },
                'instructor': {
                    "read": ["name", "description", "_id", "active"],
                    "write": ["name", "description"]
                },
                'player': {
                    "read": ["name", "description", "_id", "active"],
                    "write": []
                }
            }
        },
        'events': {
            collectionName: global.config.psdb.eventsCollectionName,
            allowedPropertyMap: {
                'administrator': {
                    "read": "unrestricted",
                    "write": "unrestricted"
                },
                'instructor': {
                    "read": ["name", "description", "_id", "active", "status", "puzzleIds", "instructorIds", "teamIds"],
                    "write": ["name", "description", "active", "status", "puzzleIds", "instructorIds", "teamIds"]
                },
                'player': {
                    "read": ["name", "description", "_id", "active"],
                    "write": []
                }
            },
            fixObjForInsertion: function (obj) {
                obj.status = "notStarted";
                obj.puzzleIds = [];
                obj.playerIds = [];
                obj.instructorIds = [];
                obj.teamIds = [];
                return obj;
            }
        },
        'puzzles': {
            collectionName: global.config.psdb.puzzlesCollectionName,
            propertyAccessMap: {
                'administrator': {
                    "read": "unrestricted",
                    "write": "unrestricted"
                },
                'instructor': {
                    "read": ["name", "description", "_id", "active"],
                    "write": ["name", "description"]
                },
                'player': {
                    "read": ["name", "description", "_id", "active"],
                    "write": []
                }
            },
            fixObjForInsertion: function (obj) {
                return obj;
            }
        },
        'teams': {
            collectionName: global.config.psdb.teamsCollectionName,
            allowedPropertyMap: {
                'administrator': {
                    "read": "unrestricted",
                    "write": "unrestricted"
                },
                'instructor': {
                    "read": ["name", "description", "_id", "active", "puzzleIds", "playerIds", "teamLeadId"],
                    "write": ["name", "description", "active", "puzzleIds", "playerIds", "teamLeadId"]
                },
                'player': {
                    "read": ["name", "description", "_id", "active", "puzzleIds", "playerIds", "teamLeadId"],
                    "write": []
                }
            },
            fixObjForInsertion: function (obj) {
                obj.puzzleIds = [];
                obj.playerIds = [];
                obj.teamLeadId = obj.teamLeadId || "";
                return obj;
            }
        },
        'players': {
            collectionName: global.config.psdb.playersCollectionName,
            'administrator': {
                "read": "unrestricted",
                "write": "unrestricted"
            },
            'instructor': {
                "read": ["name", "description", "_id", "active"],
                "write": ["name", "description"]
            },
            'player': {
                "read": ["name", "description", "_id", "active"],
                "write": []
            }
        },
        'annotations': {
            collectionName: global.config.psdb.annotationsCollectionName,
            allowedPropertyMap: {
                'administrator': {
                    "read": "unrestricted",
                    "write": "unrestricted"
                },
                'instructor': {
                    "read": ["name", "description", "_id", "puzzleIds", "eventIds", "teamIds", "playerIds"],
                    "write": ["name", "description", "_id", "puzzleIds", "eventIds", "teamIds", "playerIds"]
                },
                'player': {
                    "read": ["name", "description", "_id", "puzzleIds", "eventIds", "teamIds", "playerIds"],
                    "write": []
                }
            },
            fixObjForInsertion: function (obj) {
                return obj;
            }
        }
    };

    PuzzleSeries.initializeObjTypeMap = function () {
        var objType;
        if (PuzzleSeries.initDone)
            return;
        PuzzleSeries.jsonValidator = new validator(["annotations", "events", "instructors", "players", "puzzleStates", "series", "teams"]);
        PuzzleSeries.initDone = true;
    };

    PuzzleSeries.checkObjType = function (objType) {
        if (!PuzzleSeries.seriesObjTypeMap[objType]) {
            utils.log(utils.getShortfileName(__filename) + " returning false out of checkObjType() with objType: " + objType);
            return false;
        } else {
            return true;
        }
    };

    PuzzleSeries.pruneFields = function (fieldsReturned, objType, role) {
        return fieldsReturned;
    };

    PuzzleSeries.commonFixObjForInsertion = function (objInfo, writePermission) {
        var fixedObj = {};

        for (var prop in objInfo) {
            if (prop !== "_id" && (writePermission === "unrestricted" || writePermission[prop])) {
                fixedObj[prop] = objInfo[prop];
            }
        }
        utils.log("*********** " + utils.getShortfileName(__filename) + "after copy " + JSON.stringify(fixedObj));

        fixedObj["active"] = false;
        fixedObj["description"] = fixedObj["description"] || "";

        utils.log("*********** " + utils.getShortfileName(__filename) + "after fixing " + JSON.stringify(fixedObj));
        return fixedObj;
    };

    PuzzleSeries.checkObjForUpdate = function (objInfo, writePermission) {
        if (writePermission === "unrestricted")
            return true;
        for (var prop in objInfo) {
            if (!writePermission[prop]) {
                return false;
            }
        }
        return true;
    };

    PuzzleSeries.composePuzzleStateId = function (teamId, puzzleId) {
        return "puzzleStateId_" + teamId + "_" + puzzleId;
    };
    return PuzzleSeries;
})();
module.exports = PuzzleSeries;
