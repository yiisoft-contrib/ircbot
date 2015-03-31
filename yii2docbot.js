(function () {
    'use strict';

    var irc = require('irc'),
        repl = require('repl'),
        util = require('util'),
        path = require('path'),
        botPath = path.resolve('./bot.js'),
        docbot = require(botPath),
        cli = process.argv.indexOf('repl') > -1,
        reload = process.argv.indexOf('test') > -1,
        channel = '#yii2docbot',
        botname = 'yii2docbot',
        commands = {},
        client,
        clientSpec = {
            server: 'chat.freenode.net',
            nick: botname,
            channels: [channel],
            userName: botname,
            password: 'E98gnHBZw',
            sasl: true,
            port: 6697,
            secure: true,
            autoConnect: true
        };

    if (cli) {
        client = repl.start({
            prompt: 'docbot> ',
            "eval": function (cmd, context, filename, callback) {
                var error, result;
                try {
                    if (reload) {
                        delete require.cache[botPath];
                        docbot = require(botPath);
                    }
                    result = docbot.bot('nick', cmd);
                } catch (err) {
                    console.error('Error:', error);
                }
                callback(error, result);
            }
        });
    } else {
        client = new irc.Client(clientSpec.server, clientSpec.nick, clientSpec);
        client.addListener('error', function (message) {
            console.log('error: ', message);
        });
        client.addListener('message' + channel, function (from, message) {
            var answer;
            console.log(from + ': ' + message);
            if (reload) {
                delete require.cache[botPath];
                docbot = require(botPath);
            }
            answer = docbot.bot(from, message);
            if (typeof answer === 'string') {
                client.say(channel, from + ': ' + answer);
            }
        });
    }
}());
