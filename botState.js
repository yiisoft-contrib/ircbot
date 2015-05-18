exports.recentSnoops = (function () {
    'use strict';
    var snoopsAnswered = {},
        // miliseconds
        maxAge = 90000;
    return {
        isRecent: function (snoop) {
            return snoopsAnswered[snoop] && (snoopsAnswered[snoop] + maxAge > Date.now());
        },
        add: function (snoop) {
            snoopsAnswered[snoop] = Date.now();
        },
        flush: function () {
            var now = Date.now();
            Object.keys(snoopsAnswered).map(function (snoop) {
                if (snoopsAnswered[snoop] + maxAge < now) {
                    delete snoopsAnswered[snoop];
                }
            });
        }
    };
}());
