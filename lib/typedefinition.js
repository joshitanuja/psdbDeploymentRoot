//
//   MODULE: typedefinition
//   Copyright (c) 2014 Eastside Web (http://eastsideweb.github.io/)
//
//   FILE: typedefinition.ts
//   DESCRIPTION: File containing the main psdb interface used by the server
//
//   HISTORY:
//     Date            By  Comment
//     2014 May 10th    NSA  Created
//
//
// Helps filter the PSDB types in the rest APIs endpoints
"use strict";
// This is called by the rest api endpoints while validating the types in
// rest API endpoint
var typedefinition = (function () {
    function typedefinition() {
        this.typeMap = { 'series': 'series', 'events': 'events', 'puzzles': 'puzzles', 'instructors': 'instructors', 'teams': 'teams', 'players': 'players' };
    }
    typedefinition.prototype.checkValidType = function (type) {
        if (type) {
            return this.typeMap[type];
        }

        return undefined;
    };

    typedefinition.prototype.getTypesAssociatedWithToken = function () {
        return this.typeMap.series;
    };

    typedefinition.prototype.getTypesAssociatedWithStatus = function () {
        return this.typeMap.events;
    };

    typedefinition.prototype.getTypesAssociatedWithActiveState = function () {
        return this.typeMap.series + ',' + this.typeMap.players + ',' + this.typeMap.puzzles + ',' + this.typeMap.instructors + ',' + this.typeMap.teams;
    };

    typedefinition.prototype.getTypesWithAssociatedRelations = function () {
        return this.typeMap.teams;
    };

    typedefinition.prototype.getTypesAssociatedWithTeams = function () {
        return this.typeMap.puzzles + ',' + this.typeMap.players;
    };
    return typedefinition;
})();
;

module.exports = typedefinition;
//# sourceMappingURL=typedefinition.js.map
