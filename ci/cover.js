#!/usr/bin/env node

/**
 * Measure test coverage.
 */

"use strict";

var path = require('path'),
    async = require('async'),
    apeCovering = require('ape-covering');

var basedir = path.resolve(__dirname, '..');
process.chdir(basedir);

async.series([
    function (callback) {
        apeCovering.measureCoverage(
            require.resolve('./test.js'), [], {
                dir: 'coverage'
            }, callback
        );
    }
], function (err) {
    if (err) {
        console.error(err);
    }
});