/**
 * Release node js package.
 * @memberof module:ape-releasing/lib
 * @function releasePackage
 * @param {object} [options] - Optional settings.
 * @param {function[]} [options.beforeRelease] - Tasks to do before release.
 * @param {function[]} [options.afterRelease] - Tasks to do before release.
 * @param {string} [options.confirmMsg=releasePackage.CONFIRM_MSG] - Confirm message before release.
 * @param {function} callback - Callback when done.
 */

"use strict";

var argx = require('argx'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    apeAsking = require('ape-asking'),
    taggit = require('taggit'),
    colorprint = require('colorprint'),
    versionup = require('versionup'),
    execCommand = require('./exec_command');

/** @lends releasePackage */
function releasePackage(options, callback) {
    var args = argx(arguments);
    callback = args.pop('function') || argx.noop;
    options = args.pop('object') || {};

    if ("skip-interactive" in options && options["skip-interactive"]){
        releasePackage._doRelease(options, callback);
    } else {

        var confirmMsg = options.confirmMsg || releasePackage.CONFIRM_MSG;

        apeAsking.askYesNo(confirmMsg, {
            yes: function () {
                releasePackage._doRelease(options, callback);
            },
            no: function () {
                callback(null);
            }
        });

    }

}

releasePackage._doRelease = function(options, callback){

    var pkgPath = path.resolve(process.cwd(), 'package.json');
    fs.exists(pkgPath, function (exists) {
        if (!exists) {
            callback(new Error('package.json not found.'));
            return;
        }
        var pkg = require(pkgPath);

        var beforeRelease = options.beforeRelease || [],
            afterRelease = options.afterRelease || [];
        async.series([
            function (callback) {
                async.series([].concat(beforeRelease).map(releasePackage.task), callback);
            },
            function (callback) {
                releasePackage.execute(pkg, callback);
            },
            function (callback) {
                async.series([].concat(afterRelease).map(releasePackage.task), callback);
            }
        ], callback);
    });

}

releasePackage.task = function (task) {
    if (typeof(task) === 'string') {
        return function (callback) {
            execCommand(task, [], callback);
        }
    }
    return task;
};

releasePackage.execute = function (pkg, callback) {
    var logger = new colorprint.Colorprint({
        PREFIX: '[ape-releasing] '
    });
    async.series([
        function (callback) {
            logger.info('Creating git tag...');
            taggit({}, callback);
        },
        function (callback) {
            logger.info('Publishing to npm...');
            execCommand('npm', ['publish', '.'], callback);
        },
        function (callback) {
            logger.info('Updating package version...');
            versionup({}, callback);
        },
        function (callback) {
            var commitMsg = 'Version incremented to ' + pkg['version'];
            execCommand('git', ['commit', '-a', '-m', commitMsg], callback)
        },
        function (callback) {
            execCommand('git', ['push'], callback);
        }
    ], callback);
};

releasePackage.CONFIRM_MSG = 'Are you sure to release new version? (y/N) ';

module.exports = releasePackage;
