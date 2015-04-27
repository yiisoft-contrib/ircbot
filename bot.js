/**
 * Look at a IRC message and respond to it as appropriate.
 *
 * @param {String} from IRC nick of the message sender
 * @param {String} message IRC message to process
 * @returns {String[]|undefined} One or more bot response messages
 */
exports.bot = function (from, message) {
    'use strict';

    var docs = require('./docs.json'),
        maxLength = 400,
        words = [],
        num,
        answer,
        answers = [],
        to,
        regex,
        matches,
        save,

        /**
         * A logger object with methods to add to a message line and flush the kine to console.
         * Methods return the logger object to allow chaining.
         */
        logger = (function () {
            var line = [];
            return {
                /**
                 * Add a string to the message line.
                 * @param {String} word
                 */
                add: function (word) {
                    line.push(word);
                    return logger;
                },
                /**
                 * Flush the accumulated message line to console.
                 */
                write: function () {
                    console.log(line.join(' '));
                    line = [];
                    return logger;
                }
            };
        }()),

        /**
         * An object of search methods, each implementing one bot command. Each method is called with
         * one argument, an array of one or more words from the IRC user's message. The method can
         * look at any number of them. It may remove items from the array words (in the outer bot()
         * scope) if it needs to prevent other commands (e.g. snooping) from inspecting them.
         */
        commands = {
            ray: function () {
                return 'Agent Ray Gillette, expert in Yii and defusing bombs: https://youtu.be/_K_WmV50e7c';
            },

            help: function () {
                return 'https://bitbucket.org/thefsb/yii2docbot/src#markdown-header-using-the-bot';
            },

            gillette: function () {
                return 'See !Ray';
            },

            /**
             * Search for Yii API items matching a query term and return documentation. If one match
             * is found then the first element of words (from the bot() scope) is removed.
             *
             * @param {Array} args The first word in the array is used as search query.
             * @returns {String|undefined} Documentation of an API item if one item matches the query.
             * Comma-separated item names if more than one match. undefined for none.
             */
            s: function (args) {
                var docKey,
                    m,
                    isConst,
                    pattern,
                    items = [],
                    listThem;

                if (!args || args.length === 0) {
                    // Cancel addressing the reply to a specific nick and send to sender instead.
                    to = from;
                    return 'Usage: !s [term | $term | term() | term:: | ::term]. ' +
                        'Optionally prefix term with a type name and/or namespace';
                }

                logger.add('"' + args[0] + '"');

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
                    args[0].match(/(?:(?:([\w\\]+\\)?(\w+))?(\.|::|#))?(\$)?(\w+)?(\(\))?$/i);

                m.map(function (val, i) {
                    if (i > 0 && val) {
                        logger.add('m' + i + '="' + val + '"');
                    }
                });

                // Need a match and a keyword.
                if (!m || (!m[5] && !m[2])) {
                    logger.add('bad m').write();
                    return;
                }

                // Does m5 look like a constant?
                isConst = m[5] && m[5].match(/^[A-Z0-9_]+$/);

                // Property, method and constant searches are mutually exclusive.
                if (Number(m[4]) + Number(m[6]) + Number(isConst) > 1) {
                    logger.add('bad m').write();
                    return;
                }

                // Lookup the match keyword in the index. Case insensitive and ignoring underscores.
                docKey = (m[5] || m[2]).replace(/_/g, '').toLocaleLowerCase();
                if (!docs.hasOwnProperty(docKey)) {
                    logger.add('nothing').write();
                    return;
                }

                logger.add('Nmatch=' + docs[docKey].length);

                // Build a filtering regex pattern, if needed.
                if (m[1] || m[3] || m[4] || m[6] || isConst) {
                    pattern = ['$'];
                    m[5] = m[5] && RegExp.escape(m[5]);
                    m[2] = m[2] && RegExp.escape(m[2]);
                    m[1] = m[1] && RegExp.escape(m[1]);
                    if (m[5]) {
                        if (m[6]) {
                            pattern.unshift(m[5] + '\\(\\)');
                        } else if (m[4]) {
                            pattern.unshift('\\$' + m[5]);
                        } else if (isConst) {
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

                    pattern = pattern.join('');
                    logger.add('filter=/' + pattern + '/i');
                    pattern = new RegExp(pattern, 'i');
                } else {
                    logger.add('no-filter');
                }

                // Choose the items that match the pattern, if there is one, or all otherwise.
                docs[docKey].map(function (item) {
                    if (!pattern ||
                            (item.name.match(pattern) && (m[2] || (item.definedBy && item.name.startsWith(item.definedBy))))) {
                        items.push(item);
                    }
                });

                // How many items matched after filtering?
                num = items.length;
                if (num === 0) {
                    logger.add('Nfilter=0').write();
                    return;
                }

                // From here on we will certainly return an answer of some kind.
                answer = '';
                if (num === 1) {
                    (function (item) {
                        var nameMatches, descriptionMatches, url;

                        // Start with the item's fq-name.
                        answer += item.name + ' ';

                        // Add the description, removing its first word if it repeats the name.
                        nameMatches = item.name.match(/\$?\w+(?:\(\))?$/);
                        descriptionMatches = nameMatches &&
                            item.desc.match(new RegExp('^(?:' + RegExp.escape(nameMatches[0]) + ') (.+)$'));
                        answer += descriptionMatches ? descriptionMatches[1] : item.desc;
                        // Sometimes there's a newline in the description.
                        answer = answer.replace(/\s+/g, ' ');

                        // Form the doc URL to include in the answer.
                        nameMatches = (item.definedBy || item.name).match(/^[\w\\]+/);
                        if (nameMatches) {
                            url = nameMatches[0].replace(/\\/g, '-').toLowerCase();
                            url = 'http://www.yiiframework.com/doc-2.0/' + url + '.html';
                            nameMatches = item.name.match(/(?:::([\w\$\(\)]+))$/);
                            if (nameMatches) {
                                url += '#' + nameMatches[1] + '-detail';
                            }
                            answer += ' ' + url;
                        }
                    }(items[0]));
                } else {
                    listThem = function (items) {
                        if (items.length === 0) {
                            return;
                        }
                        if (answer.length > maxLength) {
                            answer += '… ' + items.length + ' more';
                            return;
                        }
                        answer += items.shift().name + (items.length ? ', ' : '');

                        // tail calls are optimized in ES6!
                        listThem(items);
                    };
                    listThem(items);
                }

                // Remove the query term from words so it isn't subject to further snooping.
                words.unshift();

                logger.write();
                return answer;
            }
        };

    RegExp.escape = function (text) {
        var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'],
            re = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
        return text.replace(re, '\\$1');
    };

    regex = new RegExp('(?:\\S+)+', 'g');
    matches = regex.exec(message);
    while (matches) {
        words.push(matches[0]);
        matches = regex.exec(message);
    }

    if (words.length === 0) {
        return;
    }

    // Look for addressing the message with nick: at beginning.
    matches = words[0].match(/^([\-A-}][\-0-9A-}]{0,15}):$/);
    if (matches) {
        to = matches[1];
        words.shift();
    } else {
        // Look for throwing the message with @nick at end.
        matches = words[words.length - 1].match(/^@([\-A-}][\-0-9A-}]{0,15})$/);
        if (matches) {
            to = matches[1];
            words.pop();
        }
    }

    if (words.length === 0) {
        return;
    }

    matches = words[0].match(/^!([#-~]+)$/);
    if (matches) {
        if (commands.hasOwnProperty(matches[1].toLowerCase())) {
            save = words.shift();
            answer = commands[matches[1].toLowerCase()].call(undefined, words);
            if (answer) {
                answers = [answer];
            } else {
                words.unshift(save);
            }
        }
    }

    words.map(function (word) {
        [
            // Trigger chars at the start of a keyword. Don't capture the trigger
            /^[!`·˙]([\w:#\.\\\(\)\$]+)$/,

            // Methods end in dog's bollox ()
            /^([\w:#\.\\]*\w\(\))$/,

            // Properties have a $ before the last string of word chars and a separator
            /^([\w\\]*(?:::|\.|#)\$\w+)$/,

            // Class name ending with ::
            /^([\w\\]*\w::)$/,

            // Member name starting with ::
            /^(::\w\w*)$/,

            // Member of a given class with :: . or # as separator
            /^([\w\\]*\w(?:::|\.|#)[\w]+)$/,

            // Class name with namespace
            /^([\w\\]*\\[\w\\]*)$/
        ].every(function (re) {
            matches = word.match(re);
            if (matches) {
                answer = commands.s([matches[1]]);
                if (answer) {
                    answers.push(answer);
                    return false;
                }
            }
            return true;
        });
    });

    if (to && answers) {
        answers = answers.map(function (answer) {
            return to + ': ' + answer;
        });
    }

    return answers;
};
