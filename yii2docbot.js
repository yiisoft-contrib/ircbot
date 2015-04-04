'use strict';

var irc = require('irc'),
    repl = require('repl'),
    path = require('path'),
    botPath = path.resolve('./bot.js'),
    docbot = require(botPath),
    cli = process.argv.indexOf('repl') > -1,
    reload = process.argv.indexOf('test') > -1,
    client,
    typesFile,
    botIdent = require('./bot-ident.json'),
    channel = '#yii',
    clientSpec = {
        server: 'chat.freenode.net',
        nick: botIdent.nick,
        channels: [channel],
        userName: botIdent.nick,
        password: botIdent.password,
        sasl: true,
        port: 6697,
        secure: true,
        autoConnect: true
    };

for (let arg of process.argv) {
    let matches = arg.match(/^--types=(.+)$/);
    if (matches) {
        typesFile = matches[1];
    }
}

if (typesFile) {
    let fs = require('fs'),
        type,
        types,
        index = {},
        item,
        addNode = function (kind, type, item) {
            var name = type.name,
                keyword = item.name.match(/\w+$/)[0].toLowerCase();

            if (kind !== 't') {
                if (item.definedBy !== type.name) {
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

    types = require(typesFile);

    for (let fqTypeName of Object.keys(types)) {
        type = types[fqTypeName];
        addNode('t', type, type);
        for (let kind of ['methods', 'properties', 'constants']) {
            if (type.hasOwnProperty(kind) && type[kind]) {
                for (let key of Object.keys(type[kind])) {
                    addNode(kind[0], type, type[kind][key]);
                }
            }
        }
    }

    fs.writeFile('./docs.json', JSON.stringify(index, null, '    '));
}

if (cli) {
    client = repl.start({
        prompt: 'docbot> ',
        "eval": function (cmd, context, filename, callback) {
            var error, answers;
            try {
                if (reload) {
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
    client = new irc.Client(clientSpec.server, clientSpec.nick, clientSpec);
    client.addListener('error', function (message) {
        console.log('error: ', message);
    });
    client.addListener('message' + channel, function (from, message) {
        var answers;
        console.log(from + ': ' + message);
        if (reload) {
            delete require.cache[botPath];
            docbot = require(botPath);
        }
        answers = docbot.bot(from, message);
        if (answers) {
            for (let answer of answers) {
                client.say(channel, answer);
            }
        }
    });
}
