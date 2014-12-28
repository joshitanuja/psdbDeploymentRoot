var psdbClient;
(function (psdbClient) {
    (function (series) {
        function initModule($content, $modal, $signoutButton) {
            jqueryMap.$content = $content;
            jqueryMap.$modal = $modal;
            jqueryMap.$signoutButton = $signoutButton;
        }
        series.initModule = initModule;

        function loadSeries(sessionData) {
            session = sessionData.token;
            seriesId = sessionData.seriesId;

            psdbClient.util.renderTemplate(psdbClient.config.listTemplate, { items: objList }, jqueryMap.$content);
            jqueryMap.$content.find('a').on('utap.utap', onTapObject);
            jqueryMap.$signoutButton.show();
            jqueryMap.$signoutButton.attr("disabled", false);
            jqueryMap.$signoutButton.on('click', onLogout);
        }
        series.loadSeries = loadSeries;

        var session, seriesId, jqueryMap = { $content: null, $modal: null, $signoutButton: null }, objList = [
            { _id: "events", name: "Events", description: "List of events", url: "/events" },
            { _id: "players", name: "Players", "description": "List of players", url: "/players" },
            { _id: "puzzles", name: "Puzzles", "description": "List of Puzzles", url: "/Puzzles" },
            { _id: "teams", name: "Teams", "description": "List of Teams", url: "/Teams" }
        ];

        function renderEventsTemplate(err, data) {
            if (err !== null) {
                psdbClient.util.handleError(err, jqueryMap.$modal);
            } else {
                psdbClient.util.renderTemplate(psdbClient.config.listTemplate, { items: data }, jqueryMap.$content);
            }
        }

        function onTapObject(event) {
            var objType = $(this).attr('id');

            jqueryMap.$content.find('a').off('utap.utap', onTapObject);

            var reqParams = { session: session, loadPreloader: true };
            psdbClient.util.getRequestAsync('/' + objType, renderObjectList, reqParams);
            return false;
        }
        ;

        function renderObjectList(err, result) {
            if (err !== null) {
                var error = { 'title': err.title, 'details': err.details, 'code': null };
                psdbClient.util.handleError(error, jqueryMap.$modal);
            } else {
                psdbClient.util.renderTemplate(psdbClient.config.listTemplate, { items: result }, jqueryMap.$content);
            }
        }

        function onLogout() {
            jqueryMap.$signoutButton.attr("disabled", true);
            jqueryMap.$signoutButton.off('click', onLogout);

            var reqParams = { session: session, loadPreloader: true };
            psdbClient.util.deleteRequestAsync(psdbClient.config.releaseTokenUrl.replace('{Id}', seriesId).replace('{token}', session), publishLogout, reqParams);
            return false;
        }
        function publishLogout(err, result) {
            $.gevent.publish('psdbClient-logout', null);
        }
    })(psdbClient.series || (psdbClient.series = {}));
    var series = psdbClient.series;
})(psdbClient || (psdbClient = {}));
