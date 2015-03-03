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
        objsublistTemplate: 'public/client/templates/objsublistTemplate',
        objaddsublistTemplate: 'public/client/templates/objaddsublistTemplate',
        seriesUrl: '/series',
        sessionUrl: '/series/{id}/session',
        eventsUrl: '/events',
        releaseTokenUrl: '/series/{id}/session/{token}',
        deleteObjUrl: '/{type}/{id}',
        adddeleteSublistObjUrl: '/{type}/{id}/{subtype}',
        timeout: 8000
    };
})(psdbClient || (psdbClient = {}));
