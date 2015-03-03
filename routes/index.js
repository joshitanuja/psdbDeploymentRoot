"use strict";
var express = require('express');
var router = new express.Router();

var validator = require('../lib/validator');

var psdb = require('../lib/psdb/psdb');

router.param('type', function (request, response, next, type) {
    if (validator.isCharactersOnly(type)) {
        next();
    } else {
        next(new Error('The requested url does not contain a valid type:' + type));
    }
});

router.get('/', function (request, response) {
    response.send('respond with a resource');
});

router.get('/series', function (request, response, next) {
    var query = (request.query !== null) ? psdb.translateURLQuery(request.query) : {};
    var series = psdb.findSeries(query.findMap, query.projectionMap, function (err, seriesList) {
        if (err) {
            next(err);
        } else {
            response.setHeader('Cache-Control', 'no-cache, no-store');
            response.json(seriesList);
        }
    });
});

router.post('/series/:id/session', function (request, response, next) {
    var username = request.body.username;
    var password = request.body.password;
    var roleType = request.body.roleType;
    var creds = { 'userName': username, 'password': password };
    if (validator.isValidString(username) && validator.isValidString(password) && validator.isValidString(roleType)) {
        psdb.getSeriesToken(request.params.id, roleType, creds, {}, function (err, token) {
            if (err) {
                next(err);
            } else {
                response.json({ token: token });
            }
        });
    } else {
        next(new Error('Not valid credentials, please provide valid credentials'));
    }
});

router.delete('/series/:id/session/:token', function (request, response, next) {
    psdb.releaseSeriesToken(request.params.token, function (err) {
        if (err) {
            next(err);
        } else {
            response.json(200, {});
        }
    });
});

router.all('/:type*', function (request, response, next) {
    var token = request.header('token');
    if (validator.isValidString(token)) {
        next();
    } else {
        next(new Error('This is an invalid token ( ' + token + ' ) please provide a valid session token'));
    }
});

router.get('/:type', function (request, response, next) {
    var token = request.header('token');
    var query = (request.query !== null) ? psdb.translateURLQuery(request.query) : {};
    var series = psdb.series(token);
    series.findObj(request.params.type, query.findMap, query.projectionMap, function (err, list) {
        if (err) {
            next(err);
        } else {
            response.setHeader('Cache-Control', 'no-cache, no-store');
            response.json(list);
        }
    });
});

router.get('/:type/:id', function (request, response, next) {
    var token = request.header('token');

    var series = psdb.series(token);
    series.findObj(request.params.type, { "_id": request.params.id }, {}, function (err, list) {
        if (err) {
            next(err);
        } else {
            response.setHeader('Cache-Control', 'no-cache, no-store');
            response.json(list);
        }
    });
});

router.get('/:type/:id/status', function (request, response, next) {
    if (request.params.type !== "events") {
        next(new Error('This is an invalid token ( ' + token + ' ) please provide a valid session token'));
    } else {
        var token = request.header('token');

        var series = psdb.series(token);
        series.findObj(request.params.type, { "_id": request.params.id }, { _id: 0, status: 1 }, function (err, list) {
            if (err) {
                next(err);
            } else {
                response.setHeader('Cache-Control', 'no-cache, no-store');
                response.json(200, list[0].status);
            }
        });
    }
});

router.post('/:type', function (request, response, next) {
    var token = request.header('token');
    var series = psdb.series(token);
    var newObj = request.body;
    series.addObj(request.params.type, newObj, function (err, objInfo) {
        if (err) {
            next(err);
        } else {
            response.setHeader('Cache-Control', 'no-cache, no-store');
            response.json(200, objInfo);
        }
    });
});

router.put('/teams/:teamId/puzzlestates/:puzzleId', function (request, response, next) {
    var token = request.header('token');
    var series = psdb.series(token);
    var puzzlestate = request.body.puzzleStateSolved;
    series.updatePuzzleState(request.params.teamId, request.params.puzzleId, puzzlestate, function (err) {
        if (err !== null) {
            next(err);
        } else {
            response.json(200, {});
        }
    });
});

router.put('/:type/:id', function (request, response, next) {
    var token = request.header('token');
    var series = psdb.series(token);
    series.updateObj(request.params.type, request.params.id, request.body, function (err, count) {
        if (err !== null) {
            next(err);
        } else {
            response.json(200, {});
        }
    });
});

router.delete('/:type/:id', function (request, response, next) {
    var token = request.header('token');
    var series = psdb.series(token);

    series.deleteObj(request.params.type, { "_id": request.params.id }, function (err, count) {
        if (err) {
            next(err);
        } else if (count !== 1) {
            next(new Error('Object deletion failed'));
        } else {
            response.json(200, {});
        }
    });
});

router.put('/:type/:id/active', function (request, response, next) {
    var token = request.header('token');
    var series = psdb.series(token);
    series.setActive(request.params.type, request.params.id, request.body.active, function (err) {
        if (err) {
            next(err);
        } else {
            response.json(200, {});
        }
    });
});

router.put('/events/:id/status', function (request, response, next) {
    var token = request.header('token');
    var series = psdb.series(token);
    console.log(" events/id/status got " + JSON.stringify(request.body));
    series.setEventStatus(request.params.id, request.body.status, function (err) {
        if (err !== null) {
            next(err);
        } else {
            response.json(200, {});
        }
    });
});

router.get('/:type/:id/:associatedtype', function (request, response, next) {
    var token = request.header('token');
    var series = psdb.series(token);
    series.findObj(request.params.type, { "_id": request.params.id }, {}, function (err, list) {
        if (err) {
            next(err);
        } else {
            response.setHeader('Cache-Control', 'no-cache, no-store');
            response.json(200, list[0][request.params.associatedtype]);
        }
    });
});

router.put('/:type/:id/:associatedtype', function (request, response, next) {
    var token = request.header('token');
    var series = psdb.series(token);
    var itemList = request.body;
    series.addItemsToObj(itemList, request.params.associatedtype, request.params.id, request.params.type, function (err) {
        if (err !== null) {
            next(err);
        } else {
            response.json(200, {});
        }
    });
});

router.delete('/:type/:id/:associatedtype', function (request, response, next) {
    var token = request.header('token');
    var series = psdb.series(token);
    var itemList = request.body;
    series.removeItemsFromObj(itemList, request.params.associatedtype, request.params.id, request.params.type, function (err, count) {
        if (err !== null) {
            next(err);
        } else {
            response.json(200, { "count": count });
        }
    });
});

module.exports = router;
