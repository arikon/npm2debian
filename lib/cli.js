var Q = require('qq'),
    FS = require('fs'),
    PATH = require('path');

exports.main = function () {

    var pkgJson = JSON.parse(FS.readFileSync(PATH.resolve(__dirname, '../package.json')));

    require('coa').Cmd()
        .name(PATH.basename(process.argv[1]))
        .title(pkgJson.description)
        .helpful()
        .opt()
            .name('version').title('Version')
            .short('v').long('version')
            .flag()
            .only()
            .act(function() {
                return pkgJson.version;
            })
            .end()
        .completable()
        .act(function() {
        })
        .run();

};
