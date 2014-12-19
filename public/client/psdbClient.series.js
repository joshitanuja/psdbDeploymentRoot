var psdbClient;
(function (psdbClient) {
    (function (series) {
        function initModule($content, $modal) {
            jqueryMap.$content = $content;
            jqueryMap.$modal = $modal;
        }
        series.initModule = initModule;

        function loadSeries(sessionData) {
            session = sessionData.token;
            var reqParams = { session: session, loadPreloader: true };
            psdbClient.util.getRequestAsync(psdbClient.config.eventsUrl, renderEventsTemplate, reqParams);
        }
        series.loadSeries = loadSeries;

        var session, jqueryMap = { $content: null, $modal: null };

        function renderEventsTemplate(err, data) {
            if (err !== null) {
                psdbClient.util.handleError(err, jqueryMap.$modal);
            } else {
                psdbClient.util.renderTemplate(psdbClient.config.listTemplate, { items: data }, jqueryMap.$content);
            }
        }
    })(psdbClient.series || (psdbClient.series = {}));
    var series = psdbClient.series;
})(psdbClient || (psdbClient = {}));
