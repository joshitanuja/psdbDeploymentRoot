var Validator = (function () {
    function Validator(value) {
        this.fsHandle = null;
        this.jsonValidator = null;
        this.schemaUri = 'http://eastsideweb.github.io/schema/';
        this.schemaPath = '';
        this.fsHandle = require('fs');

        this.jsonValidator = require('JSV').JSV.createEnvironment('json-schema-draft-03');

        this.loadSchema(value);
    }
    Validator.isCharactersOnly = function (value) {
        var regPattern = new RegExp('^[a-zA-Z]+$');
        if (value) {
            var arrayMatch = value.match(regPattern);
            return (arrayMatch && arrayMatch.length !== 0);
        }
        return false;
    };

    Validator.isValidId = function (value) {
        var regPattern = new RegExp('^[0-9a-fA-F]{24}$');
        if (value) {
            var arrayMatch = value.match(regPattern);
            return (arrayMatch && arrayMatch.length !== 0);
        }
        return false;
    };

    Validator.isValidString = function (value) {
        return (typeof (value) === 'string' && value && !(/^\s*$/.test(value)));
    };

    Validator.isEmptyJson = function (value) {
        return (value === null || Object.keys(value).length === 0);
    };

    Validator.prototype.loadSchema = function (value) {
        var schemaPath;
        for (var i = 0; i < value.length; i++) {
            schemaPath = __dirname + '\\..\\public\\schema\\' + value[i] + '.json';

            this.loadSchemaFromPath(value[i], schemaPath, this.getSchemaRefUri(value[i]));
        }
    };

    Validator.prototype.checkSchema = function (type, jsonBody, callback) {
        var schemaRefUri = this.getSchemaRefUri(type);

        var schemaJson = this.jsonValidator.findSchema(schemaRefUri);

        if (schemaJson) {
            var result = this.jsonValidator.validate(jsonBody, schemaJson);
            callback(result.errors);
        } else {
            callback([new Error("No valid schema found against which to validate")]);
        }
    };

    Validator.prototype.loadSchemaFromPath = function (schemaName, schemaPath, schemaRefUri) {
        if (this.fsHandle.existsSync(schemaPath)) {
            this.jsonValidator.createSchema(JSON.parse(this.fsHandle.readFileSync(schemaPath, 'utf8')), undefined, schemaRefUri);
        }
    };

    Validator.prototype.getSchemaRefUri = function (schemaName) {
        return this.schemaUri + schemaName + '.json';
    };
    return Validator;
})();

module.exports = Validator;
