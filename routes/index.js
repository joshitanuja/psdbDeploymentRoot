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
    var query = (request.query !== null) ? request.query : {};
    var series = psdb.findSeries(query, function (err, seriesList) {
        if (err) {
            next(err);
        } else {
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
            response.send(200);
        }
    });
});

router.all('/:type*', function (request, response, next) {
    var token = request.headers['token'];
    if (validator.isValidString(token)) {
        next();
    } else {
        next(new Error('This is an invalid token ( ' + token + ' ) please provide a valid session token'));
    }
});

router.get('/:type', function (request, response, next) {
    var token = request.headers['token'];
    var query = (request.query !== null) ? request.query : {};
    var series = psdb.series(token);
    series.findObj(request.params.type, query, {}, function (err, list) {
        if (err) {
            next(err);
        } else {
            response.json(list);
        }
    });
});

router.get('/:type/:id', function (request, response) {
    response.json(200, {});
});

router.get('/:type/:id/status', function (request, response) {
    response.json(200, {});
});

router.post('/:type', function (request, response, next) {
    response.json(200, {});
});

router.put('/:type/:id', function (request, response) {
    response.json({});
});

router.delete('/:type/:id', function (request, response) {
    response.json(200, {});
});

router.post('/:type/:id/:associatedtype', function (request, response) {
    response.json(200, {});
});

router.put('/:type/:id/active', function (request, response) {
    response.json(200, {});
});

router.put('/:type/:id/status', function (request, response) {
    response.json(200, {});
});

router.put('/:type/:id/puzzlestates/id', function (request, response) {
    response.json(200, {});
});

router.delete('/:type/:id/:associatedtype', function (request, response) {
    response.json(200, {});
});

module.exports = router;
