#!/usr/bin/env node

var log = require('npm/lib/utils/log');
log.waitForConfig();

var fs = require('npm/lib/utils/graceful-fs'),
    path = require('path'),
    sys = require('sys'),
    npm = require('npm'),
    ini = require('npm/lib/utils/ini'),
    rm = require('npm/lib/utils/rm-rf'),
    npm2debian = require('./npm2debian'),

    // supported commands.
    argv = process.argv.slice(2),
    arg = '',

    conf = {},
    key,
    arglist = [],
    command,
    flagsDone;

log.verbose(argv, 'cli');

while (arg = argv.shift()) {
    if (!key && (arg.match(/^-+[h?]$/i))) arg = '--usage';
    if (!command && (npm2debian.commands.hasOwnProperty(arg))) {
        if (key) {
            conf[key] = true;
            key = null;
        }
        command = arg;
    } else if (!flagsDone && arg.substr(0, 2) === '--') {
        if (key) conf[key] = true;
        key = arg.substr(2);
        if (key === 'usage') conf[key] = true, key = null;
        flagsDone = (key === '');
    } else if (key) {
        conf[key] = arg;
        key = null;
    } else arglist.push(arg);
}
if (key) conf[key] = true;
npm.argv = arglist;

var vindex = arglist.indexOf('-v')
    , printVersion = vindex !== -1 || conf.version;
if (printVersion) {
    sys.puts(npm2debian.version);
    if (vindex !== -1) arglist.splice(vindex, 1);
} else {
    log('npm@' + npm.version, 'using');
    log('npm2debian@' + npm2debian.version, 'using');
}

process.on('uncaughtException', errorHandler);
process.on('exit', function () {
    if (!itWorked) log.win('not ok');
})

var itWorked = false;


if (!command && !printVersion) conf.usage = true;

if (printVersion) itWorked = true;
else {
    if (conf.usage && command !== 'help') {
        arglist.unshift(command);
        command = 'help';
    }
    ini.resolveConfigs(conf, function (er) {
        if (er) return errorHandler(er);
        npm.config.set('root', ini.get('root'));
        npm.config.set('cwd', process.cwd());
        npm2debian.commands[command](arglist, errorHandler);
    })
}

var cbCalled = false;
function errorHandler(er) {
    if (cbCalled) throw new Error('Callback called more than once.');
    cbCalled = true;
    if (!er) {
        itWorked = true;
        log.win('ok');
        return exit();
    }
    log.error(er);
    if (!(er instanceof Error)) return exit(1);
    if (npm2debian.commands[command].usage) {
        log.error(npm2debian.commands[command].usage);
    }
    log.error([
        'try running: "npm2debian help ' + command + '"',
        'Report this *entire* log at <http://github.com/arikon/npm2debian/issues>'
    ].join('\n'));
    exit(1);
}

function exit(code) {
    rm(npm.tmp, function () {
        process.exit(code || 0);
    })
}
