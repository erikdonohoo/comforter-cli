#! /usr/bin/env node

var argv = require('minimist')(process.argv.slice());
var chalk = require('chalk');
var restler = require('restler');
var fs = require('fs');
var zip = require('zip-dir');
var q = require('q');

var errors = {
	network: 'Cound not communicate with Comforter instance',
	missingCoverage: 'Missing path to lcov file or generated coverage percentange',
	badRequest: 'Coverage data was sent incorrectly or not accepted by Comforter',
	lcovFile: 'LCOV file could not be found',
	missingRequiredParams: 'Missing one or many of required params (commit, branch, project, host)',
	zip: 'Coverage folder was not found or could not be zipped'
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

	var deferred = q.defer();

	// handle lcov file if included
	if (argv.path) {
		try {
			var size = fs.statSync(argv.path).size;
			data.lcov = restler.file(argv.path, 'lcov.info', size);
		} catch (err) {
			fail(errors.lcovFile, err);
		}
	}

	// look for zip directory
	if (argv.zip) {
		try {
			fs.accessSync(argv.zip, fs.F_OK);
			zip(argv.zip, {saveTo: 'coverage.zip'}, function (error) {
				if (error) {
					return fail(errors.zip, error);
				}

				var zipSize = fs.statSync(__dirname + '/coverage.zip').size;
				data.zip = restler.file(__dirname + '/coverage.zip', 'coverage.zip', zipSize);
				deferred.resolve();
			});
		} catch (err) {
			fail(errors.zip, err);
		}
	} else {
		deferred.resolve();
	}

	deferred.promise.then(function () {
		// send multi-part request
		restler.post(argv.host + '/api/apps/' + argv.project + '/coverage', {
			multipart: true,
			data: data
		})

		// successful upload
		.on('success', function (data) {
			console.log('Comforter Coverage: ' + chalk.green(data.coverage));
		})

		// network failure or other issue with the request
		.on('error', fail.bind(null, errors.network))
		.on('fail', fail.bind(null, errors.badRequest));
	});

}

function fail (err, data) {
	console.error(chalk.red('ERROR') + ' ' + err);

	if (data) {
		console.error(data);
	}

	process.exit(1);
}

function handleParams (params) {
	if (!params.path && !params.coverage) {
		fail(errors.missingCoverage);
	}
	if (!params.project || !params.branch || !params.commit || !params.host) {
		fail(errors.missingRequiredParams);
	}

	// add trailing slash to host
	if (params.host.charAt(params.host.length - 1) !== '/') {
		params.host += '/';
	}
}
