#! /usr/bin/env node

var argv = require('minimist')(process.argv.slice());
var chalk = require('chalk');
var request = require('request');
var fs = require('fs');
var targz = require('tar.gz');
var q = require('q');
var mv = require('mv');
var rimraf = require('rimraf');

var errors = {
	network: 'Cound not communicate with Comforter instance',
	missingCoverage: 'Missing path to lcov file or generated coverage percentange',
	badRequest: 'Coverage data was sent incorrectly or not accepted by Comforter',
	lcovFile: 'LCOV file could not be found',
	missingRequiredParams: 'Missing one or many of required params (commit, branch, project, host, apiKey, name)',
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
		commit: argv.commit,
		apiKey: argv.apiKey,
		name: argv.name
	};

	// set coverage directly if supplied
	if (argv.totalLines) {
		data.totalLines = argv.totalLines;
		data.totalCovered = argv.totalCovered;
	}

	if (argv['merge-base']) {
		data.mergeBase = argv['merge-base'];
	}

	if (argv['target-branch']) {
		data.targetBranch = argv['target-branch'];
	}

	if (argv['merge-request-iid']) {
		data.mergeRequestIID = argv['merge-request-iid'];
	}

	var deferred = q.defer();

	// handle lcov file if included
	if (argv.path) {
		try {
			data.lcov = fs.createReadStream(argv.path);
		} catch (err) {
			fail(errors.lcovFile, err);
		}
	}

	// look for zip directory
	if (argv.zip) {
		try {
			fs.accessSync(argv.zip, fs.F_OK); // check for existence of folder
			var branchPath = './comforter-tmp/' + argv.branch.replace(/\//g, '-');
			var dirDef = q.defer();
			try {
				fs.accessSync(branchPath, fs.F_OK);
				rimraf(branchPath, function (err) {
					if (err) console.error(err);
					dirDef.resolve();
				});
			} catch (e) {
				dirDef.resolve();
			}
			dirDef.promise.then(function () {
				mv(argv.zip, branchPath, {mkdirp: true, clobber: true}, function (err) {
					if (err) {
						return fail(errors.zip, err);
					}
					targz().compress(branchPath, 'coverage.zip', function (error) {
						if (error) {
							return fail(errors.zip, error);
						}
						data.zip = fs.createReadStream('coverage.zip');
						deferred.resolve();
					});
				});
			});

		} catch (err) {
			fail(errors.zip, err);
		}
	} else {
		deferred.resolve();
	}

	deferred.promise.then(function () {
		// send multi-part request
		var config = {
			url: argv.host + 'api/apps/' + argv.project + '/coverage?apiKey=' + data.apiKey,
			formData: data
		};

		request.post(config, function (err, response, body) {
			if (err) return fail.bind(null, errors.network);
			if (response.statusCode >= 400) return fail.bind(null, errors.badRequest);
			console.log('Comforter Coverage: ' + chalk.green(body.coverage));
		});
	})
	.catch(fail.bind(null, errors.badRequest));

}

function fail (err, data) {
	console.error(chalk.red('ERROR') + ' ' + err);

	if (data) {
		console.error(data);
	}

	process.exit(1);
}

function handleParams (params) {
	if (!params.path && !params.totalLines) {
		fail(errors.missingCoverage);
	}
	if (!params.project || !params.branch || !params.commit || !params.host || !params.apiKey || !params.name) {
		fail(errors.missingRequiredParams);
	}

	// add trailing slash to host
	if (params.host.charAt(params.host.length - 1) !== '/') {
		params.host += '/';
	}
}
