# yii2docbot

An IRC bot to help with Yii 2.0 documentation.

    yii2docbot [--repl] [--test] [--types=filepath]

      --repl        Use a REPL instead of an IRC client
      --test        Reload bot.js module before evaluating each input
      --types=file  Load a types doc file, which is the 'types.json' file output by
                    `apidoc api --template=json` in https://github.com/tom--/yii2-apidoc

Unless you specify `--repl`, the bot tries to log on to Freenode with an identity
read from the file `bot-ident.json`, which needs to look like this:

    {"nick": "mybotbick", "password": "mybotpass"}

#### ES6 hacking

I'm using ES6 for the first time in this project and want to use strict mode throughout.
I had to hack `node-irc` a little bit to get rid of the octal literals. There's a patch
to show what I did. Sorry.
