"use strict";
var express = require('express');
var path = require('path');

var connect = require('connect');

var config = require('./lib/config');
global.config = config('config');
var psdb = require('./lib/psdb/psdb');
var app = express();

app.use(connect.json());
app.use(connect.urlencoded());

app.set('title', 'Puzzle Orchestration');

app.use(express.static(path.join(__dirname, 'public')));

var startServer = function (err) {
    if (err !== null) {
        console.log('psdb module initialization failed with' + err.message);
    } else if (!global.config.test) {
        app.set('port', process.env.PORT || 3000);
        var server = app.listen(app.get('port'), function () {
            console.log('Express server listening on port ' + server.address().port);
        });
    }
};

var routes = require('./routes')(app);

if (app.get('NODE_ENV') === 'test') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500).json({
            'title': err.message,
            'details': err
        });
    });
}

app.use(function (err, req, res, next) {
    console.log("///////APP reporting error: " + err.message + " for url: " + req.url);
    res.status(err.status || 500).json({
        'title': err.message,
        'details': {}
    });
});

psdb.Init(startServer);

module.exports = app;
