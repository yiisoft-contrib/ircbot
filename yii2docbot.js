'use strict';

var docbot,
    optionsRe,
    options = {
        botPath: './bot.js',
        test: false,
        repl: false,
        types: undefined,
        channel: '#yii2docbot',
        server: 'chat.freenode.net',
        nick: 'yii2docbot',
        pass: undefined
    },

    /**
     * Reads JSON output from the yii2-apidoc docuemntation gernator, processes it into a
     * search index and writes that to docs.json in the CWD.
     *
     * @see http://www.yiiframework.com/doc-2.0/ext-apidoc-index.html
     * @see https://github.com/tom--/yii2-apidoc
     *
     * @param {String} types File path to the JSON output from yii2-apidoc.
     */
    indexTypes = function (types) {
        var index = {},

            /**
             * Adds a key (if needed) and a leaf node to index, i.e. the search tree.
             * @param {String} kind What kind of API item to add "t" = type, "m" = method, also "p" and "c"
             * @param {Object} type The phpdoc object for the type to which the API element belongs
             * @param {Object} item The phpdoc object for the API item to add
             */
            addNode = function (kind, type, item) {
                var name = type.name,
                    keyword = item.name.match(/\w+$/)[0].replace(/_/g, '').toLowerCase();

                if (kind !== 't') {
                    if (item.definedBy === type.name) {
                        return;
                    }

                    name += '::' + item.name;
                    if (kind === 'm') {
                        name += '()';
                    }
                }

                if (!index.hasOwnProperty(keyword)) {
                    index[keyword] = [];
                }
                index[keyword].push([name, item.shortDescription]);
            };

        // Iterate over the types in the JSON file.
        Object.keys(types).map(function (name) {
            var type = types[name],
                kinds = ['methods', 'properties', 'constants'];

            addNode('t', type, type);

            // Look for the three kinds of member in each type object.
            kinds.map(function (kind) {
                if (type.hasOwnProperty(kind) && type[kind]) {
                    // Iterate over each member adding it to the index.
                    Object.keys(type[kind]).map(function (key) {
                        addNode(kind[0], type, type[kind][key]);
                    });
                }
            });
        });

        // Write the documentation index to a JSON file.
        require('fs').writeFile('./docs.json', JSON.stringify(index, null, '  '));
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
                    answers = docbot().bot('nick', cmd);
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
     *
     * @param {Object} options The main script options object.
     */
    ircBot = function (options) {
        var irc = require('irc'),
            client,
            clientIdent = {nick: undefined, pass: undefined},
            reply = function (to) {
                return function (from, message) {
                    var answers;
                    console.log(from + ': ' + message);
                    answers = docbot().bot(from, message);
                    if (answers) {
                        answers.map(function (answer) {
                            client.say(to || from, answer);
                        });
                    }
                };
            };

        try {
            clientIdent = require('./bot-ident.json');
        } catch (ignore) {}

        client = new irc.Client(
            options.server,
            clientIdent.nick,
            {
                server: options.server,
                nick: options.nick || clientIdent.nick,
                channels: [options.channel],
                userName: options.nick || clientIdent.nick,
                password: options.pass || clientIdent.pass,
                sasl: true,
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
            .addListener('pm', reply());
    };

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

// Create a function docbot() that returns the bot function, reloading the bot module
// eact time it is called if the --test option was set.
docbot = (function (options) {
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

if (options.repl) {
    replBot();
} else {
    ircBot(options);
}
