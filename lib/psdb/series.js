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
    PuzzleSeries.prototype.checkObjectValidityForUpdate = function (objType, currentObj, updateFields, callback) {
        var err = { name: "InvalidUpdate", message: "" };
        switch (objType) {
            case "events":
                if (updateFields.status) {
                    if (currentObj.status === "ended" || (currentObj.status === "notStarted" && updateFields.status !== "started") || (currentObj.status === "started" && updateFields.status !== "ended")) {
                        err.message = "Events: status update (from " + currentObj.status + " to " + updateFields.status + ") is invalid";
                        callback(err);
                        return;
                    }
                }

                if (updateFields.instructors !== undefined || updateFields.players !== undefined || updateFields.puzzles !== undefined || updateFields.teams !== undefined) {
                    err.message = "Sublists cannot be updated through updateObj";
                    callback(err);
                    return;
                }
                break;
            case "teams":
                if (updateFields.players !== undefined) {
                    err.message = "Sublists cannot be updated through updateObj";
                    callback(err);
                    return;
                }
                if (updateFields.teamLeadId) {
                    if (currentObj.playerIds.lastIndexOf(updateFields.teamLeadId) === -1) {
                        err.message = "New teamLead is not part of the team";
                        callback(err);
                        return;
                    }
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

    PuzzleSeries.prototype.checkObjectValidityForListUpdate = function (objType, currentObj, updateFields, callback) {
        var err = { name: "InvalidUpdate", message: "" };
        var playerIdsFlattened;
        switch (objType) {
            case "events":
                break;
            case "teams":
                if (updateFields.playerIds) {
                    this.crudHandle.findObj(global.config.psdb.teamsCollectionName, {
                        "_id": { $nin: [currentObj._id] }
                    }, { "playerIds": 1, "_id": 0 }, function (err2, result) {
                        if (result !== undefined && result !== null && result.length !== 0) {
                            playerIdsFlattened = [];
                            result.forEach(function (item) {
                                item.playerIds.forEach(function (pid) {
                                    playerIdsFlattened.push(pid);
                                });
                            });
                            for (var i = 0; i < updateFields.playerIds.length; i++) {
                                if (playerIdsFlattened.lastIndexOf(updateFields.playerIds[i]) !== -1) {
                                    utils.log("checkObjectValidityForListUpdate detected existing playerId: " + updateFields.playerIds[i]);
                                    callback(utils.errors.invalidItemId);
                                    return;
                                }
                            }
                            callback(null);
                            return;
                        } else {
                            callback(null);
                            return;
                        }
                    });
                }
                break;
            case "players":
            case "instructors":
            case "puzzles":
                err.message = "Invalid update";
                callback(err);
                return;
            default:
                err.message = "Invalid update";
                callback(err);
                return;
        }
    };

    PuzzleSeries.prototype.setActive = function (objType, objId, active, callback) {
        if (objType === "puzzleStates" || !PuzzleSeries.checkObjType(objType)) {
            utils.log(utils.getShortfileName(__filename) + " returning invalidObjType error with objType: " + objType);
            callback(utils.errors.invalidObjType);
            return;
        }
        this.crudHandle.updateObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, { "_id": objId }, { "active": active }, function (err, count) {
            callback(err);
        });
    };

    PuzzleSeries.prototype.updateObj = function (objType, objId, updateFields, callback) {
        var self = this;

        if (objType === "puzzleStates" || !PuzzleSeries.checkObjType(objType)) {
            utils.log(utils.getShortfileName(__filename) + " returning invalidObjType error with objType: " + objType);
            callback(utils.errors.invalidObjType, null);
            return;
        }

        var writePermission = PuzzleSeries.seriesObjTypeMap[objType].allowedPropertyMap[this.token.role].write;

        if (writePermission !== "unrestricted" && (Array.isArray(writePermission) && writePermission.length === 0)) {
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
                    if (objList.length !== 1) {
                        callback(utils.errors.inconsistentDB, 0);
                    } else {
                        self.checkObjectValidityForUpdate(objType, objList[0], updateFields, function (innererr2) {
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

        if (writePermission !== "unrestricted" && (Array.isArray(writePermission) && writePermission.length === 0)) {
            callback(utils.errors.UnauthorizedAccess, null);
            return;
        }

        self.crudHandle.deleteObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, objInfo, function (innerErr2, count) {
            if (innerErr2 !== null) {
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

    PuzzleSeries.prototype.addItemsToObj = function (listItemIds, itemType, objId, objType, callback) {
        var currentItemList, updateField, self = this;
        if (listItemIds === null || listItemIds === undefined || listItemIds.length === 0) {
            callback(null);
            return;
        }

        if (!PuzzleSeries.checkObjType(itemType)) {
            utils.log(utils.getShortfileName(__filename) + " returning invalidItemType error with itemType: " + itemType);
            callback(utils.errors.invalidItemType);
            return;
        }

        if (!PuzzleSeries.checkObjType(objType)) {
            utils.log(utils.getShortfileName(__filename) + " returning invalidObjType error with objType: " + objType);
            callback(utils.errors.invalidObjType);
            return;
        }

        this.crudHandle.findObj(PuzzleSeries.seriesObjTypeMap[itemType].collectionName, { "_id": { $in: listItemIds } }, { "active": 1 }, function (innerErr, objList) {
            if (objList === undefined || objList === null) {
                callback(utils.errors.inconsistentDB);
                return;
            }

            if (objList.length !== listItemIds.length) {
                callback(utils.errors.invalidItemId);
                return;
            }

            for (var i = 0; i < objList.length; i++) {
                if (!objList[i].active) {
                    utils.log("####******** found inactive item " + objList[i]._id);
                    callback(utils.errors.itemNotActive);
                    return;
                }
            }

            var writePermission = PuzzleSeries.seriesObjTypeMap[objType].allowedPropertyMap[self.token.role].write;

            if (writePermission !== "unrestricted" && (Array.isArray(writePermission) && writePermission.length === 0)) {
                callback(utils.errors.UnauthorizedAccess);
                return;
            }

            updateField = {};
            updateField[PuzzleSeries.seriesItemTypeToFieldNameMap[itemType]] = listItemIds;
            if (!PuzzleSeries.checkObjForUpdate(updateField, writePermission)) {
                callback(utils.errors.UnauthorizedAccess);
                return;
            } else {
                self.crudHandle.findObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, { "_id": objId }, {}, function (err2, result) {
                    var currentObj;
                    if (err2 !== null) {
                        callback(err2);
                        return;
                    } else if (result.length !== 1) {
                        callback(utils.errors.invalidObjId);
                        return;
                    } else {
                        currentObj = result[0];

                        self.checkObjectValidityForListUpdate(objType, currentObj, updateField, function (err3) {
                            if (err3 !== null) {
                                callback(err3);
                                return;
                            } else {
                                currentItemList = currentObj[PuzzleSeries.seriesItemTypeToFieldNameMap[itemType]];
                                listItemIds.forEach(function (item) {
                                    if (currentItemList.lastIndexOf(item) === -1) {
                                        currentItemList.push(item);
                                    }
                                });

                                updateField[PuzzleSeries.seriesItemTypeToFieldNameMap[itemType]] = currentItemList;
                                self.crudHandle.updateObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, { "_id": objId }, updateField, function (err4, count) {
                                    if (err4 !== null) {
                                        callback(err4);
                                    } else {
                                        callback(null);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    };

    PuzzleSeries.prototype.removeItemsFromObj = function (listItemIds, itemType, objId, objType, callback) {
        var updateField, updatedItemList, itemField = PuzzleSeries.seriesItemTypeToFieldNameMap[itemType], self = this;
        this.crudHandle.findObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, { "_id": objId }, {}, function (err2, result) {
            if (err2 !== null) {
                callback(err2, 0);
                return;
            } else if (result.length !== 1) {
                callback(utils.errors.invalidObjId, 0);
                return;
            } else {
                updatedItemList = result[0][itemField].filter(function (item) {
                    if (listItemIds.lastIndexOf(item) === -1) {
                        return true;
                    } else {
                        return false;
                    }
                });

                updateField = {};
                updateField[itemField] = updatedItemList;
                self.crudHandle.updateObj(PuzzleSeries.seriesObjTypeMap[objType].collectionName, { "_id": objId }, updateField, function (err4, count) {
                    if (err4 !== null) {
                        callback(err4, 0);
                    } else {
                        callback(null, count);
                    }
                });
            }
        });
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
        this.updateObj("events", eventId, { "status": eventStatus }, function (err, count) {
            if (err) {
                callback(err);
            } else if (count !== 1) {
                callback(utils.errors.inconsistentDB);
            } else {
                callback(null);
            }
        });
    };

    PuzzleSeries.prototype.updatePuzzleState = function (teamID, puzzleID, puzzleStateSolved, callback) {
        var self = this, pzStateId, puzzleStateCollectionName, eventId;

        this.findObj(global.config.psdb.eventsCollectionName, { "status": "started", "active": true }, {}, function (err0, eventList) {
            if (err0 !== null) {
                callback(err0);
            } else {
                if (eventList === null || eventList.length !== 1) {
                    utils.log(" updatePuzzleState found zero or more than one events underway");
                    callback(utils.errors.inconsistentDB);
                } else {
                    eventId = eventList[0]._id;

                    if (eventList[0].teamIds.lastIndexOf(teamID) === -1) {
                        callback(utils.errors.invalidteamId);
                    } else if (eventList[0].puzzleIds.lastIndexOf(puzzleID) === -1) {
                        callback(utils.errors.invalidpuzzleId);
                    } else {
                        self.crudHandle.findObj(global.config.psdb.teamsCollectionName, { "_id": teamID }, {}, function (err3, teamsList) {
                            if (teamsList === null || teamsList.length !== 1) {
                                callback(utils.errors.invalidteamId);
                            } else if (!teamsList[0].active || teamsList[0].puzzleIds.lastIndexOf(puzzleID) === -1) {
                                callback(utils.errors.invalidpuzzleId);
                            } else {
                                pzStateId = PuzzleSeries.composePuzzleStateId(teamID, puzzleID);
                                puzzleStateCollectionName = global.config.psdb.puzzleStatesCollectionNamePrefix + eventId;

                                self.crudHandle.updateObj(puzzleStateCollectionName, { "_id": pzStateId }, { "_id": pzStateId, "teamId": teamID, "puzzleId": puzzleID, "solved": puzzleStateSolved }, function (err1, count) {
                                    if (err1) {
                                        callback(err1);
                                    } else {
                                        if (count < 1) {
                                            callback(utils.errors.inconsistentDB);
                                        } else {
                                            callback(null);
                                        }
                                    }
                                }, { upsert: true });
                            }
                        });
                    }
                }
            }
        });
    };
    PuzzleSeries.initDone = false;

    PuzzleSeries.seriesItemTypeToFieldNameMap = {
        'instructors': 'instructorIds',
        'players': 'playerIds',
        'puzzles': 'puzzleIds',
        'teams': 'teamIds'
    };

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
        if (PuzzleSeries.initDone) {
            return;
        }
        PuzzleSeries.jsonValidator = new validator(["annotations", "events", "instructors", "players", "puzzles", "puzzleStates", "series", "teams"]);
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

        fixedObj.active = false;
        fixedObj.description = fixedObj.description || "";

        utils.log("*********** " + utils.getShortfileName(__filename) + "after fixing " + JSON.stringify(fixedObj));
        return fixedObj;
    };

    PuzzleSeries.checkObjForUpdate = function (objInfo, writePermission) {
        if (writePermission === "unrestricted") {
            return true;
        }
        for (var prop in objInfo) {
            if (!writePermission[prop]) {
                return false;
            }
        }
        return true;
    };

    PuzzleSeries.composePuzzleStateId = function (teamId, puzzleId) {
        return teamId + "_" + puzzleId;
    };
    return PuzzleSeries;
})();
module.exports = PuzzleSeries;
