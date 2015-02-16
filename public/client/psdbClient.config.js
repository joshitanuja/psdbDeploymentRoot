var psdbClient;
(function (psdbClient) {
    psdbClient.config = {
        listTemplate: 'public/client/templates/listTemplate',
        objlistTemplate: 'public/client/templates/objlistTemplate',
        objtypeTemplate: 'public/client/templates/objtypeTemplate',
        objectTemplate: 'public/client/templates/objectTemplate',
        modalTemplate: 'public/client/templates/modalTemplate',
        loginTemplate: 'public/client/templates/loginTemplate',
        addobjTemplate: 'public/client/templates/addobjTemplate',
        seriesUrl: '/series',
        sessionUrl: '/series/{id}/session',
        eventsUrl: '/events',
        releaseTokenUrl: '/series/{id}/session/{token}',
        deleteObjUrl: '/{type}/{id}',
        timeout: 8000
    };
})(psdbClient || (psdbClient = {}));
