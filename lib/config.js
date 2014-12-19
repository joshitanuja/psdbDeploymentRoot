var fs = require('fs');

var readConfig = function (filename) {
    var config = {}, env, configfilename, filenameEnv, configEnv;

    configfilename = filename + '.json';
    if (!fs.existsSync(configfilename)) {
        console.log('file not found ' + configfilename);
        return config;
    }

    config = JSON.parse(fs.readFileSync(configfilename, 'utf8'));
    env = process.env.BUILD_ENV;
    if (env !== undefined) {
        console.log('running in env: ' + env);
        filenameEnv = filename + '.' + env + '.json';
        if (fs.existsSync(filenameEnv)) {
            console.log('file found ' + filenameEnv);
            configEnv = JSON.parse(fs.readFileSync(filenameEnv, 'utf8'));
            config = merge(config, configEnv);
        } else {
            console.log('file not found ' + filenameEnv);
        }
    } else {
        console.log('env not found ' + env);
    }
    return config;
};

var merge = function (o1, o2) {
    for (var prop in o2) {
        var val = o2[prop];
        if (o1.hasOwnProperty(prop)) {
            if (typeof val === 'object') {
                if (val && val.constructor !== Array) {
                    val = merge(o1[prop], val);
                }
            }
        }
        o1[prop] = val;
    }
    return o1;
};
module.exports = readConfig;
