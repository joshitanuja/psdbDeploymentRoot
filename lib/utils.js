var errors = {
    "notImpl": {
        name: 'NOTIMPLEMENTED',
        message: 'Method not implemented yet'
    },
    "notInDebug": {
        name: 'NOTINDEBUG',
        message: 'Debug method called while not in debug mode'
    },
    "invalidCredentials": {
        name: "InvalidCredentials",
        message: 'Invalid credentials'
    },
    "invalidSeriesID": {
        name: "InvalidSeriesID",
        message: 'series id not found"'
    },
    "invalidRole": {
        name: "InvalidRoleType",
        message: "Invalid role"
    },
    "inconsistentDB": {
        name: "InconsistentDB",
        message: "Database has an inconsistent entry"
    },
    "invalidTokenID": {
        name: "InvalidRoleTokenID",
        message: "Invalid token"
    },
    "invalidObjType": {
        name: "InvalidObjType",
        message: "Invalid object type specified"
    },
    "UnauthorizedAccess": {
        name: "UnauthorizedAccess",
        message: "Access to this api not supported for the RoleType"
    },
    "serverTimeOut": {
        name: "serverTimeOut",
        message: "Connection to the server timed out"
    },
    "initNotCalled": {
        name: "initNotCalled",
        message: "module not initialized"
    },
    "initPending": {
        name: "initPending",
        message: "module initialization completion pending"
    }
};
var getShortfileName = function (filename) {
    var i = filename.lastIndexOf('\\');
    return filename.slice(i + 1);
};

var log = function (logstring) {
    if (global.config.printLog) {
        console.log("--------- " + logstring + " ---------");
    }
};

var utils = {
    "errors": errors,
    "getShortfileName": getShortfileName,
    "log": log
};
module.exports = utils;
