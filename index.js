#! /usr/bin/env node

var argv = require('minimist')(process.argv.slice());
var chalk = require('chalk');
var restler = require('restler');
var fs = require('fs');

var errors = {
    network: 'Cound not communicate with Comforter instance',
    missingCoverage: 'Missing path to lcov file or generated coverage percentange',
    badRequest: 'Coverage data was sent incorrectly or not accepted by Comforter',
    lcovFile: 'LCOV file could not be found',
    missingRequiredParams: 'Missing one or many of required params (commit, branch project)'
};

// begin
console.log('Posting coverage to Comforter...');

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
            fail();
        }
    }

    restler.post('http://localhost:3000/api/apps/' + argv.project + '/coverage', {
        multipart: true,
        data: data
    }).on('success', function (data) {
        console.log('Comforter Coverage: ' + chalk.green(data.coverage));
    }).on('error', function (err) {
        console.error(chalk.red('ERROR') + ' ' + errors.network);
        console.error(err);
        fail();
    }).on('fail', function (data) {
        console.error(chalk.red('FAILED') + ' ' + errors.badRequest);
        console.error(data);
        fail();
    });
}

function fail () {
    process.exit(1);
}

function handleParams (params) {
    if (!params.path && !params.coverage) {
        console.error(chalk.red('ERROR') + ' ' + errors.missingCoverage);
        fail();
    }
    if (!params.project || !params.branch || !params.commit) {
        console.error(chalk.red('ERROR') + ' ' + errors.missingRequiredParams);
        fail();
    }
}
