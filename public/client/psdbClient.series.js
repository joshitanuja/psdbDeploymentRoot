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
                psdbClient.util.deleteRequest(url, function (err, result) {
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
        ];

        function onTapObject(event) {
            stateMap.seriesAnchorMap.type = $(this).attr('id');

            jqueryMap.$content.find('a').off('utap.utap', onTapObject);

            var reqParams = { session: stateMap.session, loadPreloader: true };
            psdbClient.util.getRequestAsync('/' + stateMap.seriesAnchorMap.type, renderObjectList, reqParams);
            return false;
        }

        function renderObject(err, result) {
            var error;
            if (err !== null) {
                error = { 'title': err.title, 'details': err.details, 'code': null };
                psdbClient.util.handleError(error, jqueryMap.$modal);
                return;
            }
            var items = result;
            if (items.length === 0) {
                error = { 'title': 'Object not found', 'details': 'No object found for the given id?', 'code': null };
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
            psdbClient.util.deleteRequestAsync(url, function (err, result) {
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
            psdbClient.util.renderTemplate(psdbClient.config.addobjTemplate, {}, jqueryMap.$content);
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
            var reqParams = { session: stateMap.session, loadPreloader: true };
            psdbClient.util.postRequestAsync('/' + stateMap.seriesAnchorMap.type, inputObject, function (err, data) {
                if (err) {
                    jqueryMap.$content.find('#error').html(err.title);
                } else {
                    var anchorSchemaMap = {
                        series: stateMap.seriesId,
                        _series: {
                            id: stateMap.seriesAnchorMap.id,
                            type: stateMap.seriesAnchorMap.type,
                            subtype: stateMap.seriesAnchorMap.subtype,
                            role: stateMap.seriesAnchorMap.roletype
                        }
                    };

                    psdbClient.shell.changeAnchorPart(anchorSchemaMap);
                }
            }, reqParams);
        }
        function renderObjectSublist(err, result) {
            var itemList = result;
            var reqParams = { session: stateMap.session, loadPreloader: true };
            var objToCollectionMap = {
                eventIds: "events",
                playerIds: "players",
                puzzleIds: "puzzles",
                teamIds: "teams",
                instructorIds: "instructors"
            };
            var queryUrl = objToCollectionMap[stateMap.seriesAnchorMap.subtype];
            psdbClient.util.getRequestAsync(queryUrl, function (err, queryResult) {
                var idList = result;
                if (idList.length === 0) {
                    var error = { 'title': 'Object not found', 'details': 'No object found for the given id?', 'code': null };
                } else {
                    var objId;
                    var collList = queryResult;
                    var arr = [];
                    for (var j = 0; j < idList.length; j++) {
                        objId = idList[j];
                        for (var i = 0; i < collList.length; i++) {
                            if (collList[i]._id === objId) {
                                arr.push(collList[i]);
                                break;
                            }
                        }
                    }
                    psdbClient.util.renderTemplate(psdbClient.config.objlistTemplate, { items: arr, seriesId: stateMap.seriesId, objtype: stateMap.seriesAnchorMap.type }, jqueryMap.$content);
                }
            }, reqParams);
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
