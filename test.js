var SEMVER = require('semver');

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

console.log(semverToDebian('nodejs', '*'));
console.log(semverToDebian('nodejs', '0.4.12'));
console.log(semverToDebian('nodejs', '~0.4.0'));
console.log(semverToDebian('nodejs', '0.4'));
console.log(semverToDebian('nodejs', '0.4 || 0.5 || 0.6'));
console.log(semverToDebian('nodejs', '=0.4'));
console.log(semverToDebian('nodejs', '>=0.4.0 <0.7.0'));
console.log(semverToDebian('nodejs', '0.x >=0.0.4'));
