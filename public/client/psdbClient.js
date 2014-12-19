var psdbClient;
(function (psdbClient) {
    

    function initModule($container) {
        psdbClient.shell.initModule($container);
    }
    psdbClient.initModule = initModule;
})(psdbClient || (psdbClient = {}));
