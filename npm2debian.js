
process.title = "npm2debian";

var npm2debian = exports,
    //set = require("npm/utils/set"),
    //get = require("npm/utils/get"),
    //ini = require("npm/utils/ini"),
    log = require("npm/utils/log"),
    fs = require("npm/utils/graceful-fs"),
    path = require("path");

npm2debian.commands = {};


if (process.getuid() === 0) {
    log.error("\nRunning npm2debian as root is not recommended!\n"
        + "Seriously, don't do this!\n", "sudon't!");
}

try {
    var j = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json")) + "");
    npm2debian.version = j.version;
    npm2debian.nodeVersionRequired = j.engines.node;
} catch (ex) {
    log(ex, "error reading version");
    npm2debian.version = ex;
}

var commandCache = {};
[ "source", /*"binary", */"help"].forEach(function (c) {
    Object.defineProperty(npm2debian.commands, c, {
        get : function () {
            if (c in commandCache) return commandCache[c];
            return commandCache[c] = require(__dirname + "/lib/" + c);
        },
        enumerable: true
    })
});
