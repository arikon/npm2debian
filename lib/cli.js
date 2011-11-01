var Q = require('qq'),
    FS = require('fs'),
    PATH = require('path'),
    NPM = require('npm');

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
        .arg()
            .name('pkg').title('Package')
            .arr()
            .end()
        .completable()
        .act(function(opts, args) {

            NPM.load({}, function(err, npm) {

                console.log('bin = %s', npm.bin);
                console.log('dir = %s', npm.dir);
                console.log('cache = %s', npm.cache);
                console.log('tmp = %s', npm.tmp);

                if(args.pkg) {
                    args.pkg.reduce(function(done, pkg) {
                        return Q.wait(done, cacheAdd(pkg));
                    }, undefined);
                }

            });
        })
        .run();

};

var cacheAdd = function(pkg) {
    console.log('cacheAdd: %s', pkg);
    var d = Q.defer();
    NPM.commands.cache.add(pkg, function(err, data) {
        if(err) return d.reject(err);
        d.resolve(data);
    });
    return d.promise;
};

var cacheUnpack = function(pkg, ver, targetPath, data) {
    console.log('cacheUnpack: %s-%s', pkg, ver);
    var d = Q.defer();
    NPM.commands.cache.unpack(pkg, ver, targetPath, function(err) {
        if(err) return d.reject(err);
        d.resolve(data);
    });
    return d.promise;
};

var debianize = function(pkg) {
    console.log('debianize: %s', pkg);
    return Q.step(
        function() {
            return cacheAdd(pkg);
        },
        function(data) {
            return cacheUnpack(data.name, data.version, PATH.resolve(__dirname, '../../tmp'), data);
        }
    );
};
