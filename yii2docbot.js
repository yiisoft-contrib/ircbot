'use strict';
/**
 * @file yii2docbot.js
 * @license GPL 3.0
 * @copyright 2015 Tom Worster fsb@thefsb.org
 *
 * Copyright 2015 Tom Worster
 *
 * This file is part of yii2docbot.
 *
 * yii2docbot is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * yii2docbot is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with yii2docbot.  If not, see <http://www.gnu.org/licenses/>.
 */
var getBot,
    optionsRe,
    config = {},
    options = {
        repl: false,
        test: false,
        server: 'irc.libera.chat',
        channel: '#yii2docbot',
        nick: 'yii2docbot',
        pass: undefined,
        realName: 'Documentation bot for Yii 2',
        types: undefined,
        botPath: './bot.js'
    },

    /**
     * Reads JSON output from the yii2-apidoc docuemntation gernator, processes it into a
     * search index and writes that to docs.json in the CWD.
     *
     * @see http://www.yiiframework.com/doc-2.0/ext-apidoc-index.html
     * @see https://github.com/tom--/yii2-apidoc
     *
     * @param {String} types The output JSON document from yii2-apidoc.
     */
    indexTypes = function (types) {
        /**
         * The index is an object of search keys, each mapping to an array of one or more leaves.
         *
         * The search key is the type name if the API item is a type (i.e. class, trait or interface)
         * or the member name of the API item is a type member (i.e. property, method or constant).
         * The key is stripped of special chars and underscores and in lower case.
         *
         * Each leaf is an object with properties:
         *   - name: The item's fully-qualified name, which depends on the kind of API item:
         *       - "name\space\TypeName" for a class, trait or interface
         *       - "name\space\TypeName::$property" for a property (note the $ after the ::)
         *       - "name\space\TypeName::method()" for a method (note the dog's bollox at end)
         *       - "name\space\TypeName::CONST" for a constant (no special chars, name may have underscores)
         *   - desc: The short description from the PHP docbock
         * and if the item is a member:
         *   - definedBy: The fully-qualified name of the class that defines the item
         *
         * Thus, for example, one of the entries in index might look like:
             {
                 ...
                 "query": [
                     {"name": "yii\\db\\Query",
                      "desc": "Query represents a SELECT SQL statement in a way that is independent of DBMS."},
                     {"name": "yii\\data\\ActiveDataProvider::$query",
                      "desc": "The query that is used to fetch data models and [[totalCount]]\nif it is not explicitly set.",
                      "definedBy": "yii\\data\\ActiveDataProvider"},
                     {"name": "yii\\db\\Command::query()",
                      "desc": "Executes the SQL statement and returns query result.",
                      "definedBy": "yii\\db\\Command"}
                 ],
                 ...
             }
         *
         */
        var index = {},

            /**
             * Adds a leaf to index (i.e. the search tree) and (if needed) a key node.
             * @param {String} kind What kind of API item to add "t" = type, "m" = method, also "p" and "c"
             * @param {Object} typeName Fully-qualified name of the type the item appears in
             * @param {Object} item The phpdoc object for the API item to add
             */
            addLeaf = function (kind, typeName, item) {
                var keyword = item.name.match(/\w+$/)[0].replace(/_/g, '').toLowerCase(),
                    leaf = {
                        name: typeName,
                        desc: item.shortDescription
                    };

                if (kind !== 't') {
                    leaf.name += '::' + item.name;
                    if (kind === 'm') {
                        leaf.name += '()';
                    }
                    leaf.definedBy = item.definedBy;
                }

                if (!index.hasOwnProperty(keyword)) {
                    index[keyword] = [];
                }
                index[keyword].push(leaf);
            };

        // Iterate over the types in the JSON file.
        Object.keys(types).map(function (name) {
            var type = types[name],
                kinds = ['methods', 'properties', 'constants'];

            addLeaf('t', type.name, type);

            // Look for the three kinds of member in each type object.
            kinds.map(function (kind) {
                if (type.hasOwnProperty(kind) && type[kind]) {
                    // Iterate over each member adding it to the index.
                    Object.keys(type[kind]).map(function (key) {
                        addLeaf(kind[0], type.name, type[kind][key]);
                    });
                }
            });
        });

        // Write the documentation index to a JSON file.
        require('fs').writeFile('./docs.json', JSON.stringify(index, null, '  '), function (err) {
            if (err) {
                console.error('Error:', err);
            }

            console.log('Saved index to: ./docs.json')
        });
    },

    /**
     * Start a node REPL using our own eval function that calls the Yii 2 doc bot.
     */
    replBot = function () {
        require('repl').start({
            "prompt": 'bot> ',
            "eval": function (cmd, context, filename, callback) {
                var answers;
                try {
                    console.log(Date.millinow() + "\n");
                    answers = getBot().bot('nick', cmd, '');
                } catch (err) {
                    console.error('Error:', err);
                }
                if (answers) {
                    callback(undefined, answers.join("  ...  "));
                }
            }
        });
    },


    /**
     * Start an IRC client and add a listener that calls the Yii 2 doc bot.
     * @param {Object} options The main script options object.
     */
    ircBot = function (options) {
        var irc = require('irc'),
            client,
            reply = function (to) {
                return function (from, message) {
                    var answers;
                    answers = getBot().bot(from, message, to || '');
                    if (answers && answers.length > 0) {
                        answers.map(function (answer) {
                            client.say(to || from, answer);
                            console.log(Date.millinow() + ' ' + options.nick + ': ' + answer);
                        });
                    }
                };
            };

        if (!options.pass) {
            throw "Can't connect to IRC without a password, use --pass option.";
        }

        client = new irc.Client(
            options.server,
            options.nick,
            {
                server: options.server,
                nick: options.nick,
                channels: [options.channel],
                userName: options.nick,
                password: options.pass,
                realName: options.realName,
                sasl: false,
                port: 6697,
                secure: true,
                autoConnect: true
            }
        );
        client
            .addListener('error', function (message) {
                console.log('error: ', message);
            })
            .addListener('message' + options.channel, reply(options.channel))
            .addListener('message' + options.channel, function (from, message) {
                console.log(Date.millinow() + ' ' + from + ': ' + message);
            })
            .addListener('pm', reply());
    };

/**
 * Add a method to Date that returns logging timestamps.
 * @returns {string}
 */
Date.millinow = function () {
    var now = new Date();
    function pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }
    return pad(now.getUTCHours()) +
        ':' + pad(now.getUTCMinutes()) +
        ':' + pad(now.getUTCSeconds()) +
        '.' +
        (now.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
};

// look for --config=path in args and load the (JSON) file into config object
process.argv.some(function (arg) {
    var matches = arg.match(/^--config=(.+)$/);
    if (matches) {
        config = require(matches[1]);
        return true;
    }
});

// config file options override the hard-coded defaults
Object.keys(config).map(function (key) {
    if (options.hasOwnProperty(key)) {
        options[key] = config[key];
    }
});

// finally, each option can overridden from command line
// Note: not escaping the option names.
optionsRe = new RegExp('^--(' + Object.keys(options).join('|') + ')(?:=(.+))?$');
process.argv.map(function (arg) {
    var matches = arg.match(optionsRe);
    if (matches) {
        options[matches[1]] = matches[2] || true;
    }
});

// The supplied path input can be relative but we need the absolute path because that's
// what the require cache uses for its key, which we need to delete the cache entry if
// --test was specified.
options.botPath = require.resolve(options.botPath);

// Create a a bot-getter function that returns the bot function, reloading
// the bot module each time it is called if the --test option was set.
getBot = (function (options) {
    var bot;
    return function () {
        if (!bot || options.test) {
            delete require.cache[options.botPath];
            bot = require(options.botPath);
        }
        return bot;
    };
}(options));

// Update the search index if requested.
if (options.types) {
    indexTypes(require(options.types));
}

// Start the bot either in a REPL or as an IRC client.
if (options.repl) {
    replBot();
} else {
    ircBot(options);
}
