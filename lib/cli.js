var Q = require('qq'),
    QFS = require('q-fs'),
    CP = require('child_process'),
    FS = require('fs'),
    PATH = require('path'),
    SYS = require('util'),
    NPM = require('npm'),
    SEMVER = require('semver');

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
            .name('versioned').title('Build versioned debian package')
            .long('versioned')
            .flag()
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
            .name('noPackagePrefix').title('Do not add prefix to Debian package name')
            .long('no-package-prefix')
            .flag()
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

            return Q.step(
                function() {

                    return loadConf({
                        'cache': PATH.resolve('.cache')
                    });

                },
                function() {

                    console.log('versioned = %s', opts.versioned);
                    console.log('bin = %s', NPM.bin);
                    console.log('dir = %s', NPM.dir);
                    console.log('cache = %s', NPM.cache);
                    console.log('tmp = %s', NPM.tmp);
                    console.log('binaries = %s', SYS.inspect(BIN));

                    return args.pkg.reduce(function(done, pkg) {
                        return Q.wait(done, debianize(pkg, opts));
                    }, undefined);

                }
            );

        }) 
        .run();

};

var loadConf = function(conf) {
    var d = Q.defer();
    NPM.load(conf, function(err) {
        err? d.reject(err) : d.resolve();
    });
    return d.promise;
};

var cacheAdd = function(pkg) {
    console.log('cacheAdd: %s', pkg);
    var d = Q.defer();
    NPM.commands.cache.add(pkg, function(err, data) {
        err? d.reject(err) : d.resolve(data);
    });
    return d.promise;
};

var cacheRead = function(pkg, ver, forceBypass) {
    console.log('cacheRead: %s-%s', pkg, ver);
    var d = Q.defer();
    NPM.commands.cache.read(pkg, ver, forceBypass, function(err, data) {
        err? d.reject(err) : d.resolve(data);
    });
    return d.promise;
};

var cacheUnpack = function(pkg, ver, targetPath) {
    console.log('cacheUnpack: %s-%s', pkg, ver);
    var d = Q.defer();
    NPM.commands.cache.unpack(pkg, ver, targetPath, function(err) {
        err? d.reject(err) : d.resolve();
    });
    return d.promise;
};

var debianize = function(pkg, opts) {
    console.log('debianize: %s', pkg);
    return Q.step(
        function() {
            return cacheAdd(pkg);
        },
        function(data) {
            return makeSourcePackage(data.name, data.version, opts);
        }
    );
};

var makeSourcePackage = function(pkg, ver, opts) {
    var ctx = {};

    // populate context from args and opts
    ctx.pkg = pkg;
    ctx.ver = ver;
    ctx.versioned = opts.versioned;
    ctx.arch = 'all';
    ctx.maintainer = opts.maintainer;
    ctx.email = opts.email;
    ctx.debianNamePrefix = opts.noPackagePrefix ? '' : opts.packagePrefix;
    ctx.debianVersionBuild = opts.debBuild;
    ctx.debianVersion = opts.debVersion || ver + '-' + ctx.debianVersionBuild;
    ctx.debianNameSuffix = '-' + ver.replace(/\./g, '-');
    ctx.debianName = ctx.debianNamePrefix + pkg;
    ctx.debianNameVersioned = ctx.debianName + ctx.debianNameSuffix;

    var debianPackageDir = PATH.join(opts.output, ctx.debianName + '-' + ver),
        debianDir = PATH.join(debianPackageDir, 'debian');

    return Q.step(
        function() {
            return QFS.exists(debianPackageDir);
        },
        function(exists) {
            var steps = [];
            if(exists) steps.push(function() {
                return rimraf(debianPackageDir);
            });
            steps.push(
                function() {
                    return cacheUnpack(pkg, ver, debianPackageDir);
                },
                function() {
                    return cacheRead(pkg, ver);
                },
                function(packageData) {

                    ctx.packageData = packageData;
                    ctx.shortdesc = packageData.description || '';
                    ctx.longdesc = 'This is a debianized npm package';

                    var cleanPackages = [],
                        deps = packageData.dependencies || {},
                        devDeps = packageData.devDependencies || {},
                        bundleDeps = packageData.bundleDependencies || [],
                        filter = function(key) {
                            return bundleDeps.indexOf(key) === -1;
                        };

                    console.log('deps = %j', deps);
                    console.log('devDeps = %j', devDeps);
                    console.log('bundleDeps = %j', bundleDeps);

                    cleanPackages = cleanPackages.concat(filterObjectKeys(deps, filter), filterObjectKeys(devDeps, filter));
                    console.log('cleanPackages = %j', cleanPackages);
                    if (cleanPackages.length) ctx.cleanCmd = 'npm uninstall ' + cleanPackages.join(' ');

                    var nodeVer, npmVer;
                    try {
                        nodeVer = packageData.engines.node;
                    } catch(ignore) {}
                    try {
                        npmVer = packageData.engines.npm;
                    } catch(ignore) {}

                    ctx.depends = semverToDebian('nodejs', nodeVer);
                    ctx.buildDepends = semverToDebian('npm', npmVer);

                },
                function() {
                    return dh_make(debianPackageDir, ctx);
                },
                function() {
                    return dch(debianPackageDir, ctx.debianName, ctx.debianVersion, 'Release of ' + pkg + ' ' + ver);
                },
                function() {
                    return Q.wait(
                        tplDebianFile(PATH.join(debianDir, 'control'), ctx),
                        tplDebianFile(PATH.join(debianDir, 'rules'), ctx),
                        tplDebianFile(PATH.join(debianDir, 'links'), ctx)
                    );
                }
            );
            return Q.step.apply(null, steps);
        }
    );

};

var filterObjectKeys = function(obj, cb) {
    cb = cb || function() {
        return true;
    };
    var keys = [];
    for (var key in obj) {
        if (!obj.hasOwnProperty(key) || !cb(key, obj)) continue;
        keys.push(key);
    }
    return keys;
};

var dh_make = function(dir, ctx) {
    var d = Q.defer(),
        tplDir = ctx.versioned? 'debian-npm-ver' : 'debian-npm',
        cmd = [
            BIN.dh_make,
            //'--cdbs',
            '--defaultless',
            '--templates', PATH.resolve(__dirname, '..', tplDir),
            '--packagename', ctx.debianName,
            //'--copyright', 'gpl', // TODO
            '--createorig',
            '--file', PATH.resolve(NPM.cache, ctx.pkg, ctx.ver, 'package.tgz')
        ].join(' '),
        opts = { cwd: dir, env: process.env };

    console.log(cmd);

    var child = CP.exec(cmd, opts, function(err, stdout, stderr) {
        err? d.reject(err) : d.resolve();
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
        err? d.reject(err) : d.resolve();
    });

    return d.promise;
};

var rimraf = function(path) {
    var d = Q.defer();
    require('rimraf')(path, function(err) {
        err? d.reject(err) : d.resolve();
    });
    return d.promise;
};

var tplDebianFile = function(path, ctx) {
    return Q.when(QFS.read(path, { charset: 'utf8' }), function(tpl) {
        console.log('tplDebianFile: %s', path);
        return QFS.write(path, parseTemplate(tpl, ctx), { charset: 'utf8' });
    });
};

var parseTemplate = function(template, vars) {
    return (Array.isArray(template)? template.join('\n') + '\n' : template)
        .replace(/\${\s*([^\s:}]*)\s*}/gi, function(s, varName){
            return (vars || {})[varName] || '';
        });
};

var parseRange = function(range) {
    return SEMVER.toComparators(SEMVER.replaceStars(range.trim()));
};

var semverToDebian = function(pkg, ver) {
    if(!ver) return pkg;

    var ranges = parseRange(ver),
        deps = [];

    ranges.forEach(function(range) {
        range.forEach(function(edge) {
            if(!edge) {
                deps.push(pkg);
            } else {
                edge = edge
                    .replace(/^(\d)/, '= $1')
                    .replace(/^(<|>)(\d)/, '$1$1 $2')
                    .replace(/^(>=|<=)/, '$1 ');
                deps.push(pkg + ' (' + edge + ')');
            }
        });
    });

    return deps.join(' | ');
};
