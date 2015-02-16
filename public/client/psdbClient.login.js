var psdbClient;
(function (psdbClient) {
    (function (login) {
        function initializeSession(seriesId, seriesParams) {
            psdbClient.util.renderTemplate(psdbClient.config.loginTemplate, null, jqueryMap.$container);

            setModalLocation();
            $('body').append('<div id="mask" class="mask"></div>');

            jqueryMap.$container.find('a.btn_close').one('utap.utap', function () {
                clearModal();
                $.uriAnchor.setAnchor({});
                return false;
            });

            var $submitBtn = jqueryMap.$container.find('button.submit');
            $submitBtn.on('click', function () {
                $submitBtn.attr("disabled", true);
                jqueryMap.$container.find('#error').html('');
                getSessionToken(seriesId, seriesParams ? seriesParams : null);
                return false;
            });

            jqueryMap.$container.keypress(function (e) {
                if (e.which === 13) {
                    $submitBtn.attr("disabled", true);
                    jqueryMap.$container.find('#error').html('');
                    getSessionToken(seriesId, seriesParams ? seriesParams : null);
                    return false;
                }
            });
        }
        login.initializeSession = initializeSession;

        function initModule($container) {
            jqueryMap.$container = $container;
        }
        login.initModule = initModule;

        var jqueryMap = { $container: null };

        function setModalLocation() {
            var loginModal = $('div.modal');
            var popMargTop = (loginModal.height()) / 2;
            var popMargLeft = (loginModal.width()) / 2;

            loginModal.css({
                'margin-top': -popMargTop,
                'margin-left': -popMargLeft
            });
        }

        function onLogout(err, data) {
            publishLogout(data);
        }
        function onLogin(err, data) {
            if (err) {
                jqueryMap.$container.find('#continueButton').removeAttr('disabled');
                jqueryMap.$container.find('#error').html(err.title);
            } else {
                clearModal();
                publishLogin(data);
            }
        }

        function cleanUp() {
            jqueryMap.$container.unbind('keypress');
            jqueryMap.$container.find('button.submit').unbind('click');
        }

        function clearModal() {
            cleanUp();
            $('div.modal').remove();
            $('#mask').remove();
        }

        function getSessionToken(seriesId, seriesParams) {
            var input = $('#loginForm :input').serializeArray();
            var inputObject = {};
            $.each(input, function (index, item) {
                inputObject[item.name] = item.value;
            });

            var requestParams = { isAsync: false, loadPreloader: false };
            psdbClient.util.postRequest(psdbClient.config.sessionUrl.replace('{id}', seriesId), inputObject, function (err, data) {
                if (err || data === null) {
                    jqueryMap.$container.find('#continueButton').removeAttr('disabled');
                    jqueryMap.$container.find('#error').html(err.title);
                } else {
                    clearModal();

                    data.seriesId = seriesId;
                    data.roleType = inputObject.roleType;
                    data.seriesParams = seriesParams;
                    publishLogin(data);
                }
            });
        }

        function publishLogin(data) {
            $.gevent.publish('psdbClient-login', data);
        }

        function publishLogout(data) {
            $.gevent.publish('psdbClient-logout', data);
        }
    })(psdbClient.login || (psdbClient.login = {}));
    var login = psdbClient.login;
})(psdbClient || (psdbClient = {}));
