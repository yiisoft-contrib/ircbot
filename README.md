# yii2docbot

An IRC bot to help with Yii 2.0 documentation.

    yii2docbot [--repl] [--test] [--types=file] [--channel=#foo]

      --repl        Use a REPL instead of an IRC client
      --test        Reload bot.js module before evaluating each input
      --types       Load a types doc file, which is the 'types.json' file output by
                    `apidoc api --template=json` in https://github.com/tom--/yii2-apidoc
      --channel     Join the given channel instead of the default #yii2docbot

Unless you specify `--repl`, the bot tries to log on to Freenode with an identity
read from the file `bot-ident.json`, which needs to look like this:

    {"nick": "mybotnick", "password": "mybotpass"}

I'm using ES6 for the first time in this project and want to use strict mode throughout.
I had to hack `node-irc` a little bit to get rid of the octal literals. There's a patch
to show what I did. Sorry.

### Using the bot

The bot responds to bot commands and snoops messages, sometimes interjecting in
conversations.

Commands start with ! at the beginning of an IRC message. There are at present two commands:

- *!help*   Lists bot commands
- *!s keyword*   Search for API documentation matching the keyword

The bot also snoops all IRC messages in the channel (probably even its own) looking for things
to run API searches on. For example, if someone sends the message

> Your getAuthor method should return a hasone() relation

Then the bot interjects with:

> yii\db\BaseActiveRecord::hasOne() Declares a `has-one` relation. http://www.yiiframework.com/doc-2.0/yii-db-baseactiverecord.html#hasOne()-detail

The bot recognized that "hasone()" might be a method in the Yii and ran an API search with
keyword *hasone()*. A number of patterns trigger the search.

### API search

The bot runs an API search in response to:

- The *!s keyword* bot command
- A keyword pattern that it recognizes, including

    - name()
    - $name
    - NAME
    - type::name
    - type::
    - space\type

    and some combinations of these.
- A keyword trigger character (exclamation point or backtick) at the start of a word, e.g.
"Use a \`query object".

In the simplest form, i.e. *!s keyword*, the bot searches for members (methods,
properties and constants) and types (classes, traits and interfaces) named *keyword*. If it finds
one match, it gives the found item's short description and a link to the documentation in yiiframework.com.
If it finds more than one, it lists them. Some keywords, e.g. *init* match a lot of different items.

You can do several things to narrow a search:

- Put *()* at the end of a name, e.g. *query()*, to search for methods.
- Put *$* at the start of a name, e.g. *$query*, to search for properties.
- Use *ALL_CAPS*, e.g. *POS_READY*, to search for constants.
- Put *type::* in front of a member name, e.g. *query::all*, to search only in types named *type*.
- Put *\\* at the start of a name, e.g. *\query*, or *::* at the end, e.g. *query::*, to search only for types.
- Use a namespace, e.g. *mysql\schema* (matching from right to left).

You can use octothorpe or period instead of paamayim nekudotayim.

If you specify member and type then the bot will find members defined in a matching type. There
are just too many matches if inherited members are included.



