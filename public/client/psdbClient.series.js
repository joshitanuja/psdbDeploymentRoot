var psdbClient;
(function (psdbClient) {
    (function (__series) {
        function initModule($content, $modal, $signoutButton) {
            jqueryMap.$content = $content;
            jqueryMap.$modal = $modal;
            jqueryMap.$signoutButton = $signoutButton;
        }
        __series.initModule = initModule;

        function loadSeries(sessionData) {
            resetStateMap();
            stateMap.session = sessionData.token;
            stateMap.seriesId = sessionData.seriesId;
            if (sessionData.seriesParams !== null && sessionData.seriesParams !== undefined) {
                alert("Found seriesparams in loadseries: " + JSON.stringify(sessionData.seriesParams));
            }

            stateMap.seriesAnchorMap.roletype = sessionData.roleType;
            updateSeries(sessionData.seriesParams);
        }
        __series.loadSeries = loadSeries;

        function unloadSeries() {
            if (stateMap.session !== null) {
                var reqParams = { session: stateMap.session, loadPreloader: true };
                var url = psdbClient.config.releaseTokenUrl.replace('{id}', stateMap.seriesId).replace('{token}', stateMap.session);
                psdbClient.util.deleteRequest(url, null, function (err, result) {
                    resetStateMap();
                }, reqParams);
            }
        }
        __series.unloadSeries = unloadSeries;

        function updateSeries(seriesParams) {
            if (!stateOk(seriesParams)) {
                return false;
            }

            if (seriesParams === null || seriesParams === undefined) {
                loadSeriesObjList();
                return true;
            }

            if (seriesParams.type === null || seriesParams.type === undefined) {
                loadSeriesObjList();
                return true;
            } else {
                if (seriesParams.id === null || seriesParams.id === undefined) {
                    loadObjList(seriesParams.type);
                    return true;
                } else {
                    if (seriesParams.subtype === null || seriesParams.subtype === undefined) {
                        loadObject(seriesParams.type, seriesParams.id);
                        return true;
                    } else {
                        loadObjSublist(seriesParams.type, seriesParams.id, seriesParams.subtype);
                        return true;
                    }
                }
            }
            return true;
        }
        __series.updateSeries = updateSeries;

        function getCurrentSeriesId() {
            return stateMap.seriesId;
        }
        __series.getCurrentSeriesId = getCurrentSeriesId;

        var stateMap = {
            session: null, seriesId: null,
            seriesAnchorMap: {
                type: null,
                id: null,
                subtype: null,
                roletype: null
            }
        }, jqueryMap = { $content: null, $modal: null, $signoutButton: null }, objList = [
            { _id: "events", name: "Events", description: "List of events", url: "/events" },
            { _id: "players", name: "Players", "description": "List of players", url: "/players" },
            { _id: "puzzles", name: "Puzzles", "description": "List of Puzzles", url: "/Puzzles" },
            { _id: "teams", name: "Teams", "description": "List of Teams", url: "/teams" },
            { _id: "instructors", name: "Instructors", "description": "List of Instructors", url: "/instructors" }
        ], objToCollectionMap = {
            eventIds: "events",
            playerIds: "players",
            puzzleIds: "puzzles",
            teamIds: "teams",
            instructorIds: "instructors"
        };

        function onTapObject(event) {
            stateMap.seriesAnchorMap.type = $(this).attr('id');

            jqueryMap.$content.find('a').off('utap.utap', onTapObject);

            var reqParams = { session: stateMap.session, loadPreloader: true };
            psdbClient.util.getRequestAsync('/' + stateMap.seriesAnchorMap.type, renderObjectList, reqParams);
            return false;
        }

        function renderObject(err, result) {
            var error, redirectUrl = {
                series: stateMap.seriesId,
                _series: { type: stateMap.seriesAnchorMap.type, roletype: stateMap.seriesAnchorMap.roletype }
            };
            if (err !== null) {
                error = { 'title': err.title, 'details': err.details, 'code': null };
                psdbClient.util.handleError(error, jqueryMap.$modal, redirectUrl);
                return;
            }
            var items = result;
            if (items.length === 0) {
                error = { 'title': 'Object not found', 'details': 'No object found for the given id?', 'code': null };
                psdbClient.util.handleError(error, jqueryMap.$modal, redirectUrl);
            } else {
                psdbClient.util.renderTemplate(psdbClient.config.objectTemplate, { seriesId: stateMap.seriesId, type: stateMap.seriesAnchorMap.type, item: result[0] }, jqueryMap.$content);
                jqueryMap.$content.find('#objdeleteButton').on('click', deleteObject);
            }
            enableSignoutButton(true);
        }
        function deleteObject() {
            var objId, reqParams, url;
            objId = jqueryMap.$content.find('#rootItem').attr('objId');
            reqParams = { session: stateMap.session, loadPreloader: true };
            url = psdbClient.config.deleteObjUrl.replace('{id}', objId).replace('{type}', stateMap.seriesAnchorMap.type);
            psdbClient.util.deleteRequestAsync(url, null, function (err, result) {
                psdbClient.shell.changeAnchorPart({
                    series: stateMap.seriesId,
                    _series: { type: stateMap.seriesAnchorMap.type, roletype: stateMap.seriesAnchorMap.roletype }
                });
            }, reqParams);
        }
        function renderObjectList(err, result) {
            if (err !== null) {
                var error = { 'title': err.title, 'details': err.details, 'code': null };
                psdbClient.util.handleError(error, jqueryMap.$modal);
            } else {
                psdbClient.util.renderTemplate(psdbClient.config.objlistTemplate, { items: result, seriesId: stateMap.seriesId, objtype: stateMap.seriesAnchorMap.type }, jqueryMap.$content);
                enableSignoutButton(true);

                jqueryMap.$content.find('.button-small').prop('disabled', true);
                var $addBtn = jqueryMap.$content.find('#addButton');
                $addBtn.attr('disabled', false);
                $addBtn.on('click', renderAddobjTemplate);
            }
        }
        function renderAddobjTemplate() {
            psdbClient.util.renderTemplate(psdbClient.config.addobjTemplate, { objType: stateMap.seriesAnchorMap.type }, jqueryMap.$content);
            var $saveBtn = jqueryMap.$content.find('#saveButton');
            $saveBtn.on('click', addObjToCollection);
            return false;
        }
        function addObjToCollection() {
            var input = $('#addForm :input').serializeArray();
            var inputObject = {};
            $.each(input, function (index, item) {
                inputObject[item.name] = item.value;
            });

            inputObject.active = (inputObject.active === "true") ? true : false;
            var reqParams = { session: stateMap.session, loadPreloader: true };
            psdbClient.util.postRequestAsync('/' + stateMap.seriesAnchorMap.type, inputObject, function (err, data) {
                if (err) {
                    jqueryMap.$content.find('#error').html(err.title);
                } else {
                    var anchorSchemaMap = {
                        series: stateMap.seriesId,
                        _series: {
                            type: stateMap.seriesAnchorMap.type,
                            role: stateMap.seriesAnchorMap.roletype
                        }
                    };
                    psdbClient.shell.changeAnchorPart(anchorSchemaMap);
                }
            }, reqParams);
        }
        function renderObjectSublist(err, result) {
            var error, reqParams = { session: stateMap.session, loadPreloader: true };
            var idList = result;
            if (err !== null) {
                error = { 'title': err.title, 'details': err.details, 'code': null };
                psdbClient.util.handleError(error, jqueryMap.$modal);
                return;
            } else {
                if (idList.length === 0) {
                    psdbClient.util.renderTemplate(psdbClient.config.objlistTemplate, { items: [], seriesId: stateMap.seriesId, objtype: stateMap.seriesAnchorMap.type }, jqueryMap.$content);
                    setUpSublistUI();
                } else {
                    var queryUrl = objToCollectionMap[stateMap.seriesAnchorMap.subtype] + "?properties=name,description&_id=";
                    idList.forEach(function (item, index) {
                        queryUrl = queryUrl.concat(item);
                        if (index !== idList.length - 1) {
                            queryUrl = queryUrl.concat(',');
                        }
                    });

                    psdbClient.util.getRequestAsync(queryUrl, function (err, queryResult) {
                        psdbClient.util.renderTemplate(psdbClient.config.objsublistTemplate, { items: queryResult, seriesId: stateMap.seriesId, objtype: stateMap.seriesAnchorMap.type, subtype: stateMap.seriesAnchorMap.subtype }, jqueryMap.$content);
                        setUpSublistUI();
                    }, reqParams);
                }
            }
        }

        function setUpSublistUI() {
            var addButton, deleteButton;
            jqueryMap.$content.find('#objsublist').selectable({
                stop: function () {
                    var selectedItems, countSelect;
                    selectedItems = jqueryMap.$content.find('li').filter(function () {
                        return $(this).hasClass('ui-selected');
                    });
                    countSelect = selectedItems.length;

                    if (countSelect === 0) {
                        jqueryMap.$content.find('#deleteSublistButton').prop('disabled', true);
                    } else {
                        jqueryMap.$content.find('#deleteSublistButton').prop('disabled', false);
                    }
                }
            });
            addButton = jqueryMap.$content.find('#addSublistButton');
            deleteButton = jqueryMap.$content.find('#deleteSublistButton');
            addButton.prop('disabled', false);
            addButton.on('click', renderAddSublistTemplate);
            deleteButton.prop('disabled', true);
            deleteButton.on('click', openSublistRemoveDialogConfirm);

            $("#sublist-remove-dialog-confirm").dialog({
                resizable: false,
                autoOpen: false,
                height: 300,
                width: 600,
                modal: true,
                buttons: {
                    "Remove all items": function () {
                        $(this).dialog("close");
                        deleteSublistObjects();
                    },
                    Cancel: function () {
                        $(this).dialog("close");
                    }
                }
            });
            $("#sublist-add-dialog").dialog({
                resizable: true,
                autoOpen: false,
                modal: true,
                buttons: {
                    "Add items": function () {
                        var selectedItems = $("#objaddsublist").find('li').filter(function () {
                            return $(this).hasClass('ui-selected');
                        });
                        if (selectedItems.length === 0) {
                            alert("Please select items from the list to add");
                        } else {
                            $(this).dialog("close");
                            addsublistItems(selectedItems);
                        }
                    },
                    Cancel: function () {
                        $(this).dialog("close");
                    }
                }
            });
        }

        function addsublistItems(selectedItems) {
            var queryURL, selectedIds = [], requestParams;

            queryURL = psdbClient.config.adddeleteSublistObjUrl.replace('{id}', stateMap.seriesAnchorMap.id).replace('{type}', stateMap.seriesAnchorMap.type).replace('{subtype}', objToCollectionMap[stateMap.seriesAnchorMap.subtype]);
            for (var i = 0; i < selectedItems.length; i++) {
                selectedIds.push(selectedItems[i].id);
            }
            requestParams = { session: stateMap.session, isAsync: true, loadPreloader: true };

            psdbClient.util.putRequestAsync(queryURL, selectedIds, function (err, result) {
                var error;
                if (err) {
                    error = { 'title': err.title, 'details': err.details, 'code': null };
                    psdbClient.util.handleError(error, jqueryMap.$modal);
                } else {
                    loadObjSublist(stateMap.seriesAnchorMap.type, stateMap.seriesAnchorMap.id, stateMap.seriesAnchorMap.subtype);
                }
            }, requestParams);
        }
        function openSublistRemoveDialogConfirm() {
            $("#sublist-remove-dialog-confirm").dialog("open");
        }

        function renderAddSublistTemplate() {
            var queryUrl, requestParams = { session: stateMap.session, isAsync: true, loadPreloader: true }, currentIds = [], currentItems = jqueryMap.$content.find('li');

            queryUrl = objToCollectionMap[stateMap.seriesAnchorMap.subtype] + "?properties=name,description&active=true";
            for (var i = 0; i < currentItems.length; i++) {
                currentIds.push(currentItems[i].id);
            }
            if (currentIds.length !== 0) {
                queryUrl = queryUrl.concat("&!_id=");
                currentIds.forEach(function (item, index) {
                    queryUrl = queryUrl.concat(item);
                    if (index !== currentIds.length - 1) {
                        queryUrl = queryUrl.concat(',');
                    }
                });
            }

            psdbClient.util.getRequestAsync(queryUrl, function (err, result) {
                if (err) {
                    jqueryMap.$content.find('#error').html(err.title);
                } else {
                    psdbClient.util.renderTemplate(psdbClient.config.objaddsublistTemplate, { items: result, seriesId: stateMap.seriesId, objtype: stateMap.seriesAnchorMap.type, subtype: stateMap.seriesAnchorMap.subtype }, $("#sublist-add-items-container"));
                    $('#objaddsublist').selectable();
                    $("#sublist-add-dialog").dialog("open");
                }
            }, requestParams);
        }

        function deleteSublistObjects() {
            var queryURL, requestParams, selectedIds = [], selectedItems = jqueryMap.$content.find('li').filter(function () {
                return $(this).hasClass('ui-selected');
            });

            queryURL = psdbClient.config.adddeleteSublistObjUrl.replace('{id}', stateMap.seriesAnchorMap.id).replace('{type}', stateMap.seriesAnchorMap.type).replace('{subtype}', objToCollectionMap[stateMap.seriesAnchorMap.subtype]);
            for (var i = 0; i < selectedItems.length; i++) {
                selectedIds.push(selectedItems[i].id);
            }
            requestParams = { session: stateMap.session, isAsync: true, loadPreloader: true };

            psdbClient.util.deleteRequestAsync(queryURL, selectedIds, function (err, result) {
                if (err) {
                    jqueryMap.$content.find('#error').html(err.title);
                }
                loadObjSublist(stateMap.seriesAnchorMap.type, stateMap.seriesAnchorMap.id, stateMap.seriesAnchorMap.subtype);
            }, requestParams);
        }
        function onLogout() {
            enableSignoutButton(false);

            $.uriAnchor.setAnchor({});
            return false;
        }
        function publishLogout(err, result) {
            resetStateMap();
            $.gevent.publish('psdbClient-logout', null);
        }

        function resetStateMap() {
            stateMap.session = null;
            stateMap.seriesId = null;
            stateMap.seriesAnchorMap.id = null;
            stateMap.seriesAnchorMap.roletype = null;
            stateMap.seriesAnchorMap.subtype = null;
            stateMap.seriesAnchorMap.type = null;
        }
        function stateOk(seriesParams) {
            if (stateMap.session === null || stateMap.session === undefined || stateMap.seriesId === null || stateMap.seriesId === undefined || (seriesParams !== null && seriesParams !== undefined && seriesParams.roletype !== null && seriesParams.roletype !== undefined && stateMap.seriesAnchorMap.roletype !== seriesParams.roletype)) {
                alert("returning false stateOk: seriesParams.roletype = " + seriesParams.roletype);
                return false;
            }
            return true;
        }

        function loadSeriesObjList() {
            stateMap.seriesAnchorMap.id = null;
            stateMap.seriesAnchorMap.subtype = null;
            stateMap.seriesAnchorMap.type = null;

            psdbClient.util.renderTemplate(psdbClient.config.objtypeTemplate, { items: objList, seriesId: stateMap.seriesId }, jqueryMap.$content);
            enableSignoutButton(true);
        }

        function loadObjList(objtype) {
            stateMap.seriesAnchorMap.type = objtype;
            stateMap.seriesAnchorMap.id = null;
            stateMap.seriesAnchorMap.subtype = null;

            var reqParams = { session: stateMap.session, loadPreloader: true };
            psdbClient.util.getRequestAsync('/' + stateMap.seriesAnchorMap.type, renderObjectList, reqParams);
        }

        function loadObject(objtype, objId) {
            stateMap.seriesAnchorMap.type = objtype;
            stateMap.seriesAnchorMap.id = objId;
            stateMap.seriesAnchorMap.subtype = null;

            var reqParams = { session: stateMap.session, loadPreloader: true };
            psdbClient.util.getRequestAsync('/' + stateMap.seriesAnchorMap.type + '/' + stateMap.seriesAnchorMap.id, renderObject, reqParams);
        }

        function loadObjSublist(objtype, objId, objSubtype) {
            stateMap.seriesAnchorMap.type = objtype;
            stateMap.seriesAnchorMap.id = objId;
            stateMap.seriesAnchorMap.subtype = objSubtype;

            var reqParams = { session: stateMap.session, loadPreloader: true };
            psdbClient.util.getRequestAsync('/' + stateMap.seriesAnchorMap.type + '/' + stateMap.seriesAnchorMap.id + '/' + stateMap.seriesAnchorMap.subtype, renderObjectSublist, reqParams);
        }
        function enableSignoutButton(enable) {
            if (enable) {
                jqueryMap.$signoutButton.show();
                jqueryMap.$signoutButton.attr("disabled", false);
                jqueryMap.$signoutButton.on('click', onLogout);
            } else {
                jqueryMap.$signoutButton.attr("disabled", true);
                jqueryMap.$signoutButton.off('click', onLogout);
                jqueryMap.$signoutButton.hide();
            }
        }
    })(psdbClient.series || (psdbClient.series = {}));
    var series = psdbClient.series;
})(psdbClient || (psdbClient = {}));
