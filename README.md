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



example        | description               | relevant decomposition       | filter regex
---|---|---|---
name           | type/method/prop/const    | m5=name                      | no filter

::name         | type/method/prop/const    | m5=name                      |     ::\$?m5(\(\))?$
one::name      | method/prop/const         | m2=one m3=:: m5=name         | \\m2::\$?m5(\(\))?$
two\one::name  | method/prop/const         | m1=two m2=one m3=:: m5=name  | m1m2::\$?m5(\(\))?$

name::         | class/interface/trait     | m2=name m3=::                |               \\m2$
two\name::     | class/interface/trait     | m1=two\ m2=name m3=::        |               m1m2$
two\name       | class/interface/trait     | m1=two\ m2=name m3=::        |               m1m2$

name()         | method                    | m5=name m6=()                |           ::m5\(\)$
$name          | property                  | m5=name m4=$                 |             ::\$m5$
NAME           | constant                  | m5=NAME in allcaps_          |               ::m5$

::name()       | method                    | m5=name m6=()                |           ::m5\(\)$
::$name        | property                  | m5=name m4=$                 |             ::\$m5$
::NAME         | constant                  | m5=NAME in allcaps_          |               ::m5$

one::name()    | method                    | m2=one m5=name m6=()         |       \\m2::m5\(\)$
one::$name     | property                  | m2=one m5=name m4=$          |         \\m2::\$m5$
one::NAME      | constant                  | m2=one m5=NAME in allcaps_   |           \\m2::m5$

two\one::name()| method                   | m1=one\ m2=one m5=name m6=()  |       m1m2::m5\(\)$
two\one::$name | property                 | m1=one\ m2=one m5=name m4=$   |         m1m2::\$m5$
two\one::NAME  | constant                 | m1=one\ m2=one m5=NAME        |           m1m2::m5$

