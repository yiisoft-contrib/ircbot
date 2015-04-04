exports.bot = function (from, message) {
    'use strict';

    var
        docs = require('./docs.json'),
        commands,
        regex,
        m,
        words,
        cmd = null,
        answers = [],
        to = from,
        maxLength = 250,
        nickPattern = "[-A-}][-0-9A-}]{0,15}";

    RegExp.escape = function(text) {
        var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'],
            re = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
        return text.replace(re, '\\$1');
    };

    commands = {
        help: function () {
            return '!s search the API for docs';
        },

        s: function (args) {
            var index, m, pattern, items = [], num, url, answer = '',
                use = 'API search: !s [term | $term | term() | term:: | ::term]. ' +
                'Optionally prefix term type and/or namespace';

            if (!args || args.length === 0) {
                return use;
            }

            /* The RegExp in PCRE-extended-like form
                    (?:
                        (?: ([\w\\]+ \\)? (\w+) )?
                        (::|\.|#)
                    )?
                    (\$)?
                    (\w+)?
                    (\(\))?
                    $
                Contrived example: "yii\db\querybuilder::$dropPrimaryKey()"
                  (normally $ and () are not both allowed)
                Matches:
                    m1  yii\db
                    m2  querybuilder
                    m3  ::
                    m4  $
                    m5  dropPrimaryKey
                    m6  ()
            */
            m = args[0].match(/(?:(?:([\w\\]+\\)?(\w+))?(::|\.|#))?(\$)?(\w+)?(\(\))?$/i);

            if (!m || (!m[5] && !m[2]) || (m[4] === '$' && m[6] === '()')) {
                return use;
            }

            // The docs index key is m5 or m2 in lower case.
            index = (m[5] || m[2]).toLocaleLowerCase();
            if (!docs.hasOwnProperty(index)) {
                return null;
            }

            // Build a regex pattern from to match on fully qualified item names.
            if (m[3] || m[4] || m[6]) {
                pattern = [];
                if (m[5]) {
                    if (m[3] || m[4] || m[6]) {
                        pattern.unshift('$');
                    }
                    if (m[6]) {
                        pattern.unshift('\\(\\)');
                    }
                    pattern.unshift(RegExp.escape(m[5]));
                    if (m[4]) {
                        pattern.unshift('\\$');
                    }
                    pattern.unshift('::');
                }
                if (m[3] && !m[5]) {
                    pattern.unshift('$');
                }
                if (m[2]) {
                    pattern.unshift(RegExp.escape(m[2]));
                }
                if (m[3] && !m[5]) {
                    pattern.unshift('(?:^|\\\\)');
                }
                if (m[1]) {
                    pattern.unshift(RegExp.escape(m[1]));
                }
                if (pattern.length > 0) {
                    pattern = pattern.join('');
                    console.log(pattern);
                    pattern = new RegExp(pattern, 'i');
                } else {
                    pattern = undefined;
                }
            }

            // Choose the items that match the pattern, if there is one, or all otherwise.
            for (let item of docs[index]) {
                if (!pattern || item[0].match(pattern)) {
                    items.push(item);
                }
            }

            num = items.length;

            if (num === 0) {
                return null;
            }

            if (num === 1) {
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

            return answer;
        }
    };

    words = [];
    regex = new RegExp('(?:\\S+)+', 'g');
    m = regex.exec(message);
    while (m !== null) {
        words.push(m[0]);
        m = regex.exec(message);
    }

    if (words.length === 0) {
        return null;
    }

    regex = new RegExp('^(' + nickPattern + '):$');
    m = words[0].match(regex);
    if (m !== null) {
        to = m[1];
        words.shift();
    } else {
        regex = new RegExp('^@(' + nickPattern + ')$');
        m = words[words.length - 1].match(regex);
        if (m !== null) {
            to = m[1];
            words.pop();
        }
    }

    if (words.length === 0) {
        return null;
    }

    for (let word of words) {
        for (let re of [
            /^[!`]([\w:#\.\\\(\)\$]+)$/,
            /^([\w:#\.\\]+\(\))$/,
            /^([\w:#\.\\]*\$\w+)$/,
            /^((?:::|\.|#)[\w\\]+)$/,
            /^([\w\\]+(?:::|\.|#))$/,
        ]) {
            let m = word.match(re);
            if (m) {
                let answer = commands.s([m[1]]);
                if (answer) {
                    answers.push(answer);
                }
            }
        }
    }

    if (answers.length === 0) {
        regex = new RegExp('^!([#-~]+)$');
        m = words[0].match(regex);
        if (m !== null) {
            let answer = null;
            cmd = m[1];
            words.shift();
            if (commands.hasOwnProperty(cmd) && typeof commands[cmd] === 'function') {
                answer = commands[cmd].call(this, words);
            } else {
                answer = 'undefined bot command: ' + cmd;
                to = from;
            }

            if (answer !== null && to !== null) {
                answer = to + ': ' + answer;
            }

            if (answer) {
                answers = [answer];
            }
        }
    }

    return answers;
};
