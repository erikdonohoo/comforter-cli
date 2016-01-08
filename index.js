#! /usr/bin/env node

var argv = require('minimist')(process.argv.slice());
var chalk = require('chalk');
var restler = require('restler');
var fs = require('fs');

var errors = {
    network: 'Cound not communicate with Comforter instance',
    missingCoverage: 'Missing path to lcov file or generated coverage percentange',
    badRequest: 'Coverage data was sent incorrectly or not accepted by Comforter',
    lcovFile: 'LCOV file could not be found'
};

// begin
console.log('Posting coverage to Comforter...');

// post to ci, with status running

// check passed params
handleParams(argv);

// send request to comforter
sendRequest();

function sendRequest () {

    // start building request data
    var data = {
        branch: argv.branch,
        project: argv.project,
        commit: argv.commit
    };

    // set coverage directly if supplied
    if (argv.coverage) {
        data.coverage = argv.coverage;
    }

    // handle lcov file if included
    var size;
    if (argv.path) {
        try {
            size = fs.statSync(argv.path).size;
            data.lcov = restler.file(argv.path, 'lcov.info', size);
        } catch (err) {
            console.error(chalk.red('ERROR') + ' ' + errors.lcovFile);
            console.error(err);
            fail(errors.lcovFile);
        }
    }

    restler.post('http://localhost:3000/api/apps/1/coverage', {
        multipart: true,
        data: data
    }).on('error', function (err) {
        console.error(chalk.red('ERROR') + ' ' + errors.network);
        console.error(err);
        fail(errors.network);
    }).on('fail', function (data) {
        console.error(chalk.red('FAILED') + ' ' + errors.badRequest);
        console.error(data);
        fail(errors.badRequest);
    });
}

function fail (reason) {
    process.exit(reason);
}

function handleParams (params) {
    if (!params.path && !params.coverage) {
        console.error(chalk.red('ERROR') + ' ' + errors.missingCoverage);
        fail(errors.missingCoverage);
    }
}
