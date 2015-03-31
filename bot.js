exports.bot = function (from, message) {
    'use strict';

    var commands,
        regex,
        matches,
        words,
        cmd = null,
        answer = null,
        to = from,
        nickPattern = "[-A-}][-0-9A-}]{0,15}";

    commands = {
        help: function () {
            return '!commands are (c)lass, (p)roperty, (m)ethod, m(e)mber, eg: !c Model';
        },

        c: function (args) {
            if (!args || args.length === 0) {
                return 'Search/lookup class by name: !c name';
            }

            return 'Looking up class: ' + args[0];
        },

        p: function (args) {
            if (!args || args.length === 0) {
                return 'Search/lookup property by name: !p name';
            }

            return 'Looking up property: ' + args[0];
        },

        m: function (args) {
            if (!args || args.length === 0) {
                return 'Search/lookup method by name: !m name';
            }

            return 'Looking up method: ' + args[0];
        },

        e: function (args) {
            if (!args || args.length === 0) {
                return 'Search for member by name: !e name';
            }

            return 'Seaarching for member: ' + args[0];
        }
    };

    words = [];
    regex = new RegExp('(?:\\S+)+', 'g');
    matches = regex.exec(message);
    while (matches !== null) {
        words.push(matches[0]);
        matches = regex.exec(message);
    }

    if (words.length === 0) {
        return null;
    }

    regex = new RegExp('^(' + nickPattern + '):$');
    matches = words[0].match(regex);
    if (matches !== null) {
        to = matches[1];
        words.shift();
    } else {
        regex = new RegExp('^@(' + nickPattern + ')$');
        matches = words[words.length - 1].match(regex);
        if (matches !== null) {
            to = matches[1];
            words.pop();
        }
    }

    if (words.length === 0) {
        return null;
    }

    regex = new RegExp('^!([#-~]+)$');
    matches = words[0].match(regex);
    if (matches !== null) {
        cmd = matches[1];
        words.shift();
        if (commands.hasOwnProperty(cmd) && typeof commands[cmd] === 'function') {
            answer = commands[cmd].call(this, words);
        } else {
            answer = 'undefined bot command: ' + cmd;
            to = from;
        }
    }

    if (answer !== null && to !== null) {
        answer = to + ': ' + answer;
    }

    return answer;
};
