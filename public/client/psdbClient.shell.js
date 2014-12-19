var psdbClient;
(function (psdbClient) {
    (function (shell) {
        function initModule($container) {
            setJqueryMap($container);

            psdbClient.login.initModule(jqueryMap.$modal);
            psdbClient.series.initModule(jqueryMap.$content, jqueryMap.$modal);

            $.gevent.subscribe(jqueryMap.$acct, 'psdbClient-login', onSeriesLogin);

            psdbClient.util.getRequestAsync(psdbClient.config.seriesUrl, renderSeriesTemplate);
        }
        shell.initModule = initModule;
        ;
    })(psdbClient.shell || (psdbClient.shell = {}));
    var shell = psdbClient.shell;

    var jqueryMap = {
        $container: null,
        $acct: null,
        $header: null,
        $modal: null,
        $content: null
    }, session;

    function setJqueryMap($container) {
        jqueryMap = {
            $container: $container,
            $acct: $container.find('.psdbClient-shell-head-acct'),
            $header: $container.find('.psdbClient-shell-head'),
            $modal: $container.find('.psdbClient-shell-modal'),
            $content: $container.find('.psdbClient-shell-main-content')
        };
    }
    ;

    function onTapSeries(event) {
        var seriesId = $(this).attr('id');
        psdbClient.login.initializeSession(seriesId);
        return false;
    }
    ;

    function onSeriesLogin(event, data) {
        if (data) {
            jqueryMap.$content.find('a').off('utap.utap', onTapSeries);

            psdbClient.series.loadSeries(data);
        } else {
            var error = { "title": "Unable to retrieve session id" };
            psdbClient.util.handleError(error, jqueryMap.$modal);
        }
    }
    ;
    function onSeriesLogout(event, logout_user) {
        jqueryMap.$acct.text('');

        psdbClient.util.getRequest(psdbClient.config.seriesUrl, renderSeriesTemplate);
    }
    ;

    function renderSeriesTemplate(err, data) {
        if (err !== null) {
            var error = { 'title': err.title, 'details': err.details, 'code': null };
            psdbClient.util.handleError(error, jqueryMap.$modal);
        } else {
            psdbClient.util.renderTemplate(psdbClient.config.listTemplate, { items: data }, jqueryMap.$content);
            jqueryMap.$content.find('a').on('utap.utap', onTapSeries);
        }
    }
})(psdbClient || (psdbClient = {}));
