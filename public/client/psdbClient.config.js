var psdbClient;
(function (psdbClient) {
    psdbClient.config = {
        listTemplate: 'public/client/templates/listTemplate',
        modalTemplate: 'public/client/templates/modalTemplate',
        loginTemplate: 'public/client/templates/loginTemplate',
        seriesUrl: '/series',
        sessionUrl: '/series/{id}/session',
        eventsUrl: '/events',
        releaseTokenUrl: '/series/{id}/session/{token}',
        timeout: 8000
    };
})(psdbClient || (psdbClient = {}));
