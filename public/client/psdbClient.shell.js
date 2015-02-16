var psdbClient;
(function (psdbClient) {
    (function (shell) {
        function initModule($container) {
            setJqueryMap($container);

            $.uriAnchor.configModule({
                schema_map: configMap.anchor_schema_map
            });

            psdbClient.login.initModule(jqueryMap.$modal);
            psdbClient.series.initModule(jqueryMap.$content, jqueryMap.$modal, jqueryMap.$signoutButton);

            $.gevent.subscribe(jqueryMap.$acct, 'psdbClient-login', onSeriesLogin);
            $.gevent.subscribe(jqueryMap.$acct, 'psdbClient-logout', onSeriesLogout);

            $(window).bind('hashchange', onHashChange).trigger('hashchange');
        }
        shell.initModule = initModule;

        function changeAnchorPart(arg_map) {
            var anchor_map_revise = copyAnchorMap(), bool_return = true, key_name, key_dep, key_name_dep, arg_map_dep_obj, anchor_revise_dep_obj = {};

            KEYVAL:
            for (key_name in arg_map) {
                if (arg_map.hasOwnProperty(key_name) && arg_map[key_name] !== null) {
                    if (key_name.indexOf('_') === 0) {
                        continue KEYVAL;
                    }

                    anchor_map_revise[key_name] = arg_map[key_name];

                    key_name_dep = '_' + key_name;
                    if ((arg_map[key_name_dep]) && (arg_map[key_name_dep] !== null)) {
                        arg_map_dep_obj = arg_map[key_name_dep];
                        for (key_dep in arg_map_dep_obj) {
                            if (arg_map_dep_obj.hasOwnProperty(key_dep) && arg_map_dep_obj[key_dep] !== null) {
                                anchor_revise_dep_obj[key_dep] = arg_map_dep_obj[key_dep];
                            }
                        }
                        anchor_map_revise[key_name_dep] = anchor_revise_dep_obj;
                    } else {
                        delete anchor_map_revise[key_name_dep];
                        delete anchor_map_revise['_s' + key_name_dep];
                    }
                }
            }

            try  {
                $.uriAnchor.setAnchor(anchor_map_revise, null, true);
            } catch (error) {
                $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
                bool_return = false;
            }

            return bool_return;
        }
        shell.changeAnchorPart = changeAnchorPart;
    })(psdbClient.shell || (psdbClient.shell = {}));
    var shell = psdbClient.shell;

    var jqueryMap = {
        $container: null,
        $acct: null,
        $header: null,
        $modal: null,
        $content: null,
        $signoutButton: null
    }, stateMap = {
        anchor_map: null
    }, configMap = {
        anchor_schema_map: {
            series: true,
            _series: {
                type: { 'instructors': true, 'events': true, 'players': true, 'teams': true, 'puzzles': true },
                id: true,
                subtype: true,
                roletype: { 'administrator': true, 'instructor': true, 'player': true }
            }
        }
    };

    function setJqueryMap($container) {
        jqueryMap = {
            $container: $container,
            $acct: $container.find('.psdbClient-shell-head-acct'),
            $header: $container.find('.psdbClient-shell-head'),
            $modal: $container.find('.psdbClient-shell-modal'),
            $content: $container.find('.psdbClient-shell-main-content'),
            $signoutButton: $container.find('#signoutButton')
        };
    }

    function onTapSeries(event) {
        var seriesId = $(this).attr('id');

        return false;
    }

    function onSeriesLogin(event, data) {
        if (data) {
            psdbClient.series.loadSeries(data);
        } else {
            var error = { "title": "Unable to retrieve session id" };
            psdbClient.util.handleError(error, jqueryMap.$modal);
        }
    }
    function onSeriesLogout(event, logout_user) {
        jqueryMap.$acct.text('');

        psdbClient.util.getRequest(psdbClient.config.seriesUrl, renderSeriesTemplate);
    }

    function onHashChange(event) {
        var s_anchorMap;
        var _s_series_previous, _s_series_proposed, seriesId_proposed, seriesId_previous, anchor_map_proposed, is_ok = true, anchor_map_previous = copyAnchorMap();

        try  {
            anchor_map_proposed = $.uriAnchor.makeAnchorMap();

            s_anchorMap = $.uriAnchor.makeAnchorString(anchor_map_proposed);
        } catch (error) {
            alert('makeAnchorString returned err: ' + error);
            $.uriAnchor.setAnchor(anchor_map_previous, null, true);
            return false;
        }

        if (stateMap.anchor_map === null) {
            if (anchor_map_proposed.series === null || anchor_map_proposed.series === undefined || anchor_map_proposed.series === {}) {
                stateMap.anchor_map = anchor_map_proposed;
                psdbClient.util.getRequestAsync(psdbClient.config.seriesUrl, renderSeriesTemplate);
                return false;
            }
        }

        stateMap.anchor_map = anchor_map_proposed;

        seriesId_previous = anchor_map_previous.series;
        seriesId_proposed = anchor_map_proposed.series;
        _s_series_previous = anchor_map_previous._s_series;
        _s_series_proposed = anchor_map_proposed._s_series;

        if (!anchor_map_previous || _s_series_previous !== _s_series_proposed) {
            if (seriesId_previous !== seriesId_proposed || psdbClient.series.getCurrentSeriesId() !== seriesId_proposed) {
                psdbClient.series.unloadSeries();
                if (seriesId_proposed !== null && seriesId_proposed !== undefined) {
                    psdbClient.login.initializeSession(seriesId_proposed, anchor_map_proposed._series);
                } else {
                    psdbClient.util.getRequestAsync(psdbClient.config.seriesUrl, renderSeriesTemplate);
                }
            } else {
                is_ok = psdbClient.series.updateSeries(anchor_map_proposed._series);
            }
        }

        if (!is_ok) {
            if (anchor_map_previous) {
                $.uriAnchor.setAnchor(anchor_map_previous, null, true);
                stateMap.anchor_map = anchor_map_previous;
            } else {
                delete anchor_map_proposed.series;
                delete anchor_map_proposed._series;
                delete anchor_map_proposed._s_series;
                $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
            }
        }

        return false;
    }

    function renderSeriesTemplate(err, data) {
        if (err !== null) {
            var error = { 'title': err.title, 'details': err.details, 'code': null };
            psdbClient.util.handleError(error, jqueryMap.$modal);
        } else {
            psdbClient.util.renderTemplate(psdbClient.config.listTemplate, { items: data }, jqueryMap.$content);

            jqueryMap.$signoutButton.hide();
        }
    }

    function copyAnchorMap() {
        return $.extend(true, {}, stateMap.anchor_map);
    }
})(psdbClient || (psdbClient = {}));
