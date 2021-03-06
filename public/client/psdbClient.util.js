﻿var psdbClient;
(function (psdbClient) {
    (function (util) {
        function renderTemplate(templateName, data, $container, rendercallback) {
            dust.render(templateName, data, function (err, out) {
                var html = rendercallback ? rendercallback(out) : out;
                $container.html(out);
                $container.attr("templateId", templateName);
            });
        }
        util.renderTemplate = renderTemplate;

        function handleError(err, $container, anchorMap, ignoreError) {
            if (typeof ignoreError === "undefined") { ignoreError = false; }
            if (!ignoreError) {
                renderTemplate(psdbClient.config.modalTemplate, err, $container);
                $container.fadeIn(10);
                setModalLocation();

                $('body').append('<div id="mask" class="mask"></div>');

                $container.find('a.btn_close').one('click', function () {
                    $('.modal').remove();
                    $('#mask').remove();

                    return false;
                });
                if (anchorMap) {
                    $.uriAnchor.setAnchor(anchorMap, null, true);
                }
            }
        }
        util.handleError = handleError;

        function getRequest(url, callback, requestParams) {
            requestParams = checkRequestParams(requestParams);
            requestParams.isAsync = false;
            makeRequest('get', url, null, callback, requestParams);
        }
        util.getRequest = getRequest;

        function postRequest(url, data, callback, requestParams) {
            requestParams = checkRequestParams(requestParams);
            requestParams.isAsync = false;
            makeRequest('post', url, data, callback, requestParams);
        }
        util.postRequest = postRequest;

        function deleteRequest(url, data, callback, requestParams) {
            requestParams = checkRequestParams(requestParams);
            requestParams.isAsync = false;
            makeRequest('delete', url, data, callback, requestParams);
        }
        util.deleteRequest = deleteRequest;

        function putRequest(url, data, callback, requestParams) {
            requestParams = checkRequestParams(requestParams);
            requestParams.isAsync = false;
            makeRequest('put', url, data, callback, requestParams);
        }
        util.putRequest = putRequest;

        function getRequestAsync(url, callback, requestParams) {
            requestParams = checkRequestParams(requestParams);
            requestParams.isAsync = true;
            makeRequest('get', url, null, callback, requestParams);
        }
        util.getRequestAsync = getRequestAsync;

        function postRequestAsync(url, data, callback, requestParams) {
            requestParams = checkRequestParams(requestParams);
            requestParams.isAsync = true;
            makeRequest('post', url, data, callback, requestParams);
        }
        util.postRequestAsync = postRequestAsync;

        function deleteRequestAsync(url, data, callback, requestParams) {
            requestParams = checkRequestParams(requestParams);
            requestParams.isAsync = true;
            makeRequest('delete', url, data, callback, requestParams);
        }
        util.deleteRequestAsync = deleteRequestAsync;

        function putRequestAsync(url, data, callback, requestParams) {
            requestParams = checkRequestParams(requestParams);
            requestParams.isAsync = true;
            makeRequest('put', url, data, callback, requestParams);
        }
        util.putRequestAsync = putRequestAsync;

        function encodeData(data) {
            return encodeURIComponent(data).replace(/\-/g, "%2D").replace(/\_/g, "%5F").replace(/\./g, "%2E").replace(/\!/g, "%21").replace(/\~/g, "%7E").replace(/\*/g, "%2A").replace(/\'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
        }
        util.encodeData = encodeData;

        function decodeData(s) {
            try  {
                return decodeURIComponent(s.replace(/\%2D/g, "-").replace(/\%5F/g, "_").replace(/\%2E/g, ".").replace(/\%21/g, "!").replace(/\%7E/g, "~").replace(/\%2A/g, "*").replace(/\%27/g, "'").replace(/\%28/g, "(").replace(/\%29/g, ")"));
            } catch (e) {
            }
            return "";
        }
        util.decodeData = decodeData;

        function makeRequest(type, url, data, callback, requestParams) {
            $.ajax({
                type: type,
                url: url,
                data: data === null ? null : JSON.stringify(data),
                dataType: 'json',
                headers: { 'token': requestParams.session },
                contentType: 'application/json',
                async: requestParams.isAsync,
                timeout: psdbClient.config.timeout,
                beforeSend: function () {
                    if (requestParams.loadPreloader) {
                        launchPreloader();
                    }
                },
                complete: function () {
                    if (requestParams.loadPreloader) {
                        stopPreloader();
                    }
                }
            }).done(function (data) {
                callback(null, data);
            }).fail(function (jqXhr, err) {
                try  {
                    var error = JSON.parse(jqXhr.responseText);
                    callback(error);
                } catch (e) {
                    callback({ title: 'Unknown error' });
                }
            });
        }

        function setModalLocation() {
            var loginModal = $('div.modal');
            var popMargTop = (loginModal.height()) / 2;
            var popMargLeft = (loginModal.width()) / 2;

            loginModal.css({
                'margin-top': -popMargTop,
                'margin-left': -popMargLeft
            });
        }

        function launchPreloader() {
            $('div.psdbClient-shell-preloader').fadeIn('slow');
            $('body').append('<div id="mask" class="mask"></div>');
        }

        function stopPreloader() {
            $('div.psdbClient-shell-preloader').fadeOut('slow');
            $('#mask').remove();
        }

        function checkRequestParams(requestParams) {
            if (requestParams === null || requestParams === undefined) {
                var reqParams = { isAsync: false, session: null, loadPreloader: true };
                return reqParams;
            }

            return requestParams;
        }
    })(psdbClient.util || (psdbClient.util = {}));
    var util = psdbClient.util;
})(psdbClient || (psdbClient = {}));
