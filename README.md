# yii2docbot

An IRC bot to help with Yii 2.0 documentation.

    yii2docbot [--types=<path>] [--repl] [--test]
        [--server=<server>] [--channel=<channel>] [--nick=<nickname>] [--pass=<password>]

      --types       Load a "types" JSON documentation file from <path>. The file should be
                    the 'types.json' file output by `apidoc api --template=json`
      --repl        Use a REPL instead of an IRC client
      --test        Reload bot.js module before evaluating each input
      --server      Connect to IRC server <server> instead of chat.freenode.net
      --channel     Join channel <channel> instead of #yii2docbot
      --nick        Use nick <nickname> instead of yii2docbot
      --pass        Use password <password>

Unless you specify `--repl`, the bot tries to log on to IRC.

Default options’ values are at the top of the yii2docbot.js script. The options object
is first extended by the file botrc.json, if it exists, and then by command line options.
botrc.json should contain a single JSON object of option-value pairs.

The JavaScript is ES6 (Harmony) and I use strict mode in the .js files. The `node-irc`
dependency uses octal literals in a couple of places which are not allowed in strict ES6.
My [PR](https://github.com/martynsmith/node-irc/pull/368) to correct these awaits
attention so for now the package.json specifies my fork.

### Using the bot

The bot responds to bot commands and snoops messages, sometimes interjecting in
conversations.

Commands start with ! at the beginning of an IRC message. Commands include:

- *!help*
- *!s keyword*   Search for API documentation matching the keyword

The bot also snoops all IRC messages in the channel (except its own) and PMs looking
for things to run API searches on. For example, if someone sends the message

> Your getAuthor method should return a hasone() relation

Then the bot interjects with:

> yii\db\BaseActiveRecord::hasOne() Declares a `has-one` relation. http://www.yiiframework.com/doc-2.0/yii-db-baseactiverecord.html#hasOne()-detail

The bot recognized that "hasone()" might be a method in Yii and ran an API search with
keyword *hasone()*. A number of patterns trigger the search.

### API search

The bot runs an API search in response to:

- The *!s keyword* bot command
- A keyword pattern that it recognizes including *name()*, *.$name*, *::$name*, *NAME*, *::name*, *name::*, *\name*, *name\name*, some of which can be combined
- A keyword trigger character (exclamation point or backtick) at the start of a word, e.g.
"Use a \`query object"

In the simplest form, i.e. *!s name*, the bot searches for members (methods,
properties and constants) and types (classes, traits and interfaces) with matching name. If it finds
one match, it gives the found item's short description and a link to the documentation in yiiframework.com.
If it finds more than one, it lists them. Some keywords, e.g. *init* match a lot of different items.

You can do several things to narrow a search:

- Put *()* at the end of a name, e.g. *query()*, to search for methods.
- Put *$* at the start of a name, e.g. *$query*, to search for properties.
- Use *ALL_CAPS*, e.g. *POS_READY*, to search for constants.
- Put *type::* in front of a member name, e.g. *query::all*, to search only in types named *type*.
- Put *\\* at the start of a name, e.g. *\query*, or *::* at the end, e.g. *query::*, to search only for types.
- Use a name-space, e.g. *mysql\schema* (matching from right to left).

(You can use octothorpe or period instead of paamayim nekudotayim.)

When searching for a member, unless a type name is included in teh keyword, the bot
will find only types that define the member, not those that inherit it. There would
be too many matches otherwise.
