'use strict';

var path = require('path'),
    botPath = path.resolve('./bot.js'),
    docbot = require(botPath),
    options = {
        channel: '#yii2docbot',
        cli: process.argv.indexOf('--repl') > -1,
        reload: process.argv.indexOf('--test') > -1,
        typesFile: undefined
    },
    client;

for (let arg of process.argv) {
    let matches = arg.match(/^--(types|channel)=(.+)$/);
    if (matches) {
        options[matches[1]] = matches[2];
    }
}

if (options.typesFile !== undefined) {
    let fs = require('fs'),
        types = require(options.typesFile),
        index = {},

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

    for (let fqTypeName of Object.keys(types)) {
        let type = types[fqTypeName];
        addNode('t', type, type);
        for (let kind of ['methods', 'properties', 'constants']) {
            if (type.hasOwnProperty(kind) && type[kind]) {
                for (let key of Object.keys(type[kind])) {
                    addNode(kind[0], type, type[kind][key]);
                }
            }
        }
    }

    // Write the documentation index to a JSON file.
    fs.writeFile('./docs.json', JSON.stringify(index, null, '  '));
}

if (options.cli) {
    let repl = require('repl');

    client = repl.start({
        prompt: 'docbot> ',
        "eval": function (cmd, context, filename, callback) {
            var error, answers;
            try {
                if (options.reload) {
                    delete require.cache[botPath];
                    docbot = require(botPath);
                }
                answers = docbot.bot('nick', cmd);
            } catch (err) {
                console.error('Error:', error);
            }
            if (answers) {
                callback(error, answers.join("  ...  "));
            }
        }
    });
} else {
    let irc = require('irc'),
        clientIdent = require('./bot-ident.json'),
        clientOptions = {
            server: 'chat.freenode.net',
            nick: clientIdent.nick,
            channels: [options.channel],
            userName: clientIdent.nick,
            password: clientIdent.password,
            sasl: true,
            port: 6697,
            secure: true,
            autoConnect: true
        };

    client = new irc.Client(clientOptions.server, clientOptions.nick, clientOptions);
    client.addListener('error', function (message) {
        console.log('error: ', message);
    });
    client.addListener('message' + options.channel, function (from, message) {
        var answers;
        console.log(from + ': ' + message);
        if (options.reload) {
            delete require.cache[botPath];
            docbot = require(botPath);
        }
        answers = docbot.bot(from, message);
        if (answers) {
            for (let answer of answers) {
                client.say(options.channel, answer);
            }
        }
    });
}
