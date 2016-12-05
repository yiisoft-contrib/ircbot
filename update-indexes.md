# Updating Gillette's indexes

in yii2 repo dir

    git checkout master
    git fetch
    git merge upstream/master
    git checkout 2.0.10

    build/build dev/ext authclient
    build/build dev/ext codeception
    build/build dev/ext faker
    build/build dev/ext gii
    build/build dev/ext imagine
    build/build dev/ext jui
    build/build dev/ext mongodb
    build/build dev/ext redis
    build/build dev/ext smarty
    build/build dev/ext sphinx
    build/build dev/ext swiftmailer
    build/build dev/ext twig

in yii2-apidoc repo dir

    git checkout master
    git fetch
    git merge upstream/master

    composer update --prefer-dist

    ./apidoc api ../yii2/framework/,../yii2/extensions output --template=json

in gillette repo dir

    git status
    # git whatever to git the repo up-to-date

    ./yii2docbot --types=../yii2-apidoc/output/types.json --repl
    
deploy and run the updated bot
