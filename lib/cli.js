var Q = require('qq'),
    CP = require('child_process'),
    FS = require('fs'),
    PATH = require('path'),
    SYS = require('sys'),
    NPM = require('npm');

BIN = {
    'debchange': 'debchange',
    'dh_make': 'dh_make'
};

exports.main = function () {

    var pkgJson = JSON.parse(FS.readFileSync(PATH.resolve(__dirname, '../package.json')));

    require('coa').Cmd()
        .name(PATH.basename(process.argv[1]))
        .title(pkgJson.description)
        .helpful()
        .opt()
            .name('output').title('Output directory')
            .short('o').long('output')
            .def(process.cwd())
            .end()
        .opt()
            .name('maintainer').title('Debian package maintainer name')
            .short('m').long('maintainer')
            .def(process.env.DEBFULLNAME)
            .end()
        .opt()
            .name('email').title('Debian package maintainer email')
            .short('e').long('email')
            .def(process.env.EMAIL)
            .end()
        .opt()
            .name('packagePrefix').title('Debian package name prefix')
            .short('p').long('package-prefix')
            .def('npm-')
            .end()
        .opt()
            .name('debVersion').title('Debian package version')
            .short('u').long('debian-version')
            .end()
        .opt()
            .name('debBuild').title('Debian package build')
            .short('b').long('debian-build')
            .def('1')
            .end()
        .opt()
            .name('local').title('Use bundled dh_make and debchange')
            .long('local')
            .flag()
            .act(function() {
                for (var bin in BIN) {
                    var localPath = PATH.resolve(__dirname, '../bin', bin);
                    if(PATH.existsSync(localPath)) BIN[bin] = localPath;
                }
            })
            .end()
        .opt()
            .name('version').title('Show version')
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
            .req()
            .end()
        .completable()
        .act(function(opts, args) {

            NPM.load({}, function(err, npm) {

                console.log('bin = %s', npm.bin);
                console.log('dir = %s', npm.dir);
                console.log('cache = %s', npm.cache);
                console.log('tmp = %s', npm.tmp);
                console.log('binaries = %s', SYS.inspect(BIN));

                return args.pkg.reduce(function(done, pkg) {
                    return Q.wait(done, debianize(pkg, opts));
                }, undefined);

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


var dh_make = function(dir, ctx) {
    var d = Q.defer(),
        cmd = [
            BIN.dh_make,
            '--cdbs',
            '--defaultless',
            '--templates', PATH.resolve(__dirname, '../debian-npm/'),
            '--packagename', ctx.debianName,
            //'--copyright', 'gpl', // TODO
            '--createorig',
            '--file', PATH.resolve(NPM.cache, ctx.pkg, ctx.ver, 'package.tgz')
        ].join(' '),
        opts = { cwd: dir, env: process.env };

    console.log(cmd);

    var child = CP.exec(cmd, opts, function(err, stdout, stderr) {
        if(err) return d.reject(err);
        d.resolve();
    });
    child.stdin.write('\n');

    return d.promise;
};

var dch = function(dir, pkg, ver, text) {
    var d = Q.defer(),
        cmd = [
            BIN.debchange,
            '--create',
            '--empty',
            '--package', pkg,
            '--newversion', ver,
            '--distribution', 'unstable',
            '--force-distribution',
            '"' + text + '"'
        ].join(' '),
        opts = { cwd: dir, env: process.env };

    console.log(cmd);

    CP.exec(cmd, opts, function(err, stdout, stderr) {
        if(err) return d.reject(err);
        d.resolve();
    });

    return d.promise;
};
