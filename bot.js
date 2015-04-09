exports.bot = function (from, message) {
    'use strict';

    var docs = require('./docs.json'),
        commands,
        regex,
        matches,
        words,
        answers = [],
        to = from,
        maxLength = 420,
        debugLog = function (msgArray) {
            console.log(msgArray.join(' '));
        };

    RegExp.escape = function (text) {
        var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'],
            re = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
        return text.replace(re, '\\$1');
    };

    commands = {
        help: function () {
            return '!s search the API for docs';
        },

        s: function (args) {
            var debugMsg = [], lookup, m, c, pattern, items = [], num, answer = '';

            if (!args || args.length === 0) {
                return 'API search: !s [term | $term | term() | term:: | ::term]. ' +
                    'Optionally prefix term type and/or namespace';
            }

            debugMsg.push('"' + args[0] + '"');

            /* Decompose the query!
               The longer pattern below in PCRE-extended-like form:
                   (?:
                       (?: ([\w\\]+ \\)? (\w+) )?
                       (:: | \. | #)
                   )?
                   (\$)?
                   (\w+)?
                   (\(\))?
                   $
               e.g. "yii\db\querybuilder::$dropPrimaryKey()" matches as:
                   m[1]  yii\db
                   m[2]  querybuilder
                   m[3]  ::
                   m[4]  $
                   m[5]  dropPrimaryKey
                   m[6]  ()
               The shorter one matches naked namespace\type combos, e.g. "yii\db\querybuilder" as:
                   m[1]  yii\db
                   m[2]  querybuilder
               Test in: https://regex101.com/
            */
            m = args[0].match(/^([\\\w]*\\)(\w+)$/i) ||
                args[0].match(/(?:(?:([\w\\]+\\)?(\w+))?(::|\.|#))?(\$)?(\w+)?(\(\))?$/i);

            for (let i in Object.keys(m)) {
                if (i > 0 && m[i] !== undefined) {
                    debugMsg.push('m' + i + '="' + m[i] + '"');
                }
            }

            // Need a match and a keyword.
            if (!m || (!m[5] && !m[2])) {
                debugMsg.push('bad m');
                debugLog(debugMsg);
                return null;
            }

            // Does m5 look like a constant?
            c = m[5] && m[5].match(/^[A-Z0-9_]+$/);

            // Property, method and constant searches are mutually exclusive.
            if (Number(m[4]) + Number(m[6]) + Number(c) > 1) {
                debugMsg.push('bad m');
                debugLog(debugMsg);
                return null;
            }

            // Lookup the match keyword in the index. Case insensitive and ignoring underscores.
            lookup = (m[5] || m[2]).replace(/_/g, '').toLocaleLowerCase();
            if (!docs.hasOwnProperty(lookup)) {
                debugMsg.push('nothing');
                debugLog(debugMsg);
                return null;
            }

            debugMsg.push('Nmatch=' + docs[lookup].length);

            // Build a filtering regex pattern, if needed.
            if (m[1] || m[3] || m[4] || m[6] || c) {
                pattern = ['$'];
                m[5] = m[5] && RegExp.escape(m[5]);
                m[2] = m[2] && RegExp.escape(m[2]);
                m[1] = m[1] && RegExp.escape(m[1]);
                if (m[5]) {
                    if (m[6]) {
                        pattern.unshift(m[5] + '\\(\\)');
                    } else if (m[4]) {
                        pattern.unshift('\\$' + m[5]);
                    } else if (c) {
                        pattern.unshift(m[5]);
                    } else {
                        pattern.unshift('\\$?' + m[5] + '(\\(\\))?');
                    }
                    pattern.unshift('::');
                }

                pattern.unshift(m[2]);

                if (m[1]) {
                    pattern.unshift(m[1]);
                } else if (m[2]) {
                    pattern.unshift('\\\\');
                }

                if (pattern.length > 0) {
                    pattern = pattern.join('');
                    debugMsg.push('filter=/' + pattern + '/i');
                    pattern = new RegExp(pattern, 'i');
                } else {
                    pattern = undefined;
                }
            } else {
                debugMsg.push('no-filter');
            }

            // Choose the items that match the pattern, if there is one, or all otherwise.
            for (let item of docs[lookup]) {
                if (!pattern || item[0].match(pattern)) {
                    items.push(item);
                }
            }

            num = items.length;

            if (num === 0) {
                debugMsg.push('Nfilter=0');
                debugLog(debugMsg);
                return null;
            }

            if (num === 1) {
                let url;
                // One answer. The bot can reply the short description and doc URL.

                // The short description.
                answer = items[0][1];

                // Form the URL.
                m = items[0][0].match(/^([\w\\]+)(?:::([\w\$\(\)]+))?$/);
                if (m) {
                    url = m[1].replace(/\\/g, '-').toLowerCase();
                    url = 'http://www.yiiframework.com/doc-2.0/' + url + '.html';
                    if (m[2]) {
                        url += '#' + m[2] + '-detail';
                    }
                }

                // Add the fq-item name if it's not already in teh short description.
                if (!answer.match(new RegExp('^' + RegExp.escape(items[0][0]) + ' '))) {
                    answer = items[0][0] + ' ' + answer;
                }

                // Add the URL.
                if (url) {
                    answer += ' ' + url;
                }
            } else {
                // More than one answer, the bot lists them.
                for (let i in items) {
                    answer += items[i][0];
                    if (answer.length > maxLength) {
                        answer += ' & ' + (num - i) + ' more';
                        return answer;
                    }
                    if (i < num - 1) {
                        answer += ', ';
                    }
                }
            }

            // Remove the search term from the message words so it isn't subject to snooping.
            words.unshift();

            debugLog(debugMsg);
            return answer;
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

    matches = words[0].match(/^([-A-}][-0-9A-}]{0,15}):$/);
    if (matches !== null) {
        to = matches[1];
        words.shift();
    } else {
        matches = words[words.length - 1].match(/^@([-A-}][-0-9A-}]{0,15})$/);
        if (matches !== null) {
            to = matches[1];
            words.pop();
        }
    }

    if (words.length === 0) {
        return null;
    }

    matches = words[0].match(/^!([#-~]+)$/);
    if (matches) {
        let answer,
            cmd = matches[1];

        if (commands.hasOwnProperty(cmd)) {
            let save = words.shift();
            answer = commands[cmd].call(undefined, words);
            if (answer) {
                if (to) {
                    answer = to + ': ' + answer;
                }
                answers = [answer];
            } else {
                words.unshift(save);
            }
        }
    }

    for (let word of words) {
        for (let re of [
            /^[!`·˙]([\w:#\.\\\(\)\$]+)$/,
            /^([\w:#\.\\]+\(\))$/,
            /^([\w:#\.\\]*\$\w+)$/,
            /^([\w\\]*(?:::|\.|#)[\w]*)$/,
            /^([\w\\]*\\[\w\\]*)$/
        ]) {
            matches = word.match(re);
            if (matches) {
                let answer = commands.s([matches[1]]);
                if (answer) {
                    answers.push(answer);
                }
            }
        }
    }

    return answers;
};
