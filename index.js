#! /usr/bin/env node

const { URLSearchParams } = require('url');

(async () => {
	const fs = require('fs');
	const ZipDir = require('zip-dir');
	const args = require('yargs').argv;
	const path = require('path');
	const fetch = require('node-fetch');
	const FormData = require('form-data');

	const errors = {
		network: 'Cound not communicate with Comforter instance',
		missingCoverage: 'Missing path to lcov file or generated coverage percentange',
		badRequest: 'Coverage data was sent incorrectly or not accepted by Comforter',
		lcovFile: 'LCOV file could not be found',
		missingRequiredParams: 'Missing one or many of required params (commit, branch, project, host, apiKey, name)',
		zip: 'Coverage folder was not found or could not be zipped'
	};

	console.log('Posting Coverage...');

	const copyFolderSync = (from, to) => {
		fs.mkdirSync(to, { recursive: true });
		fs.readdirSync(from).forEach(element => {
			if (fs.lstatSync(path.join(from, element)).isFile()) {
				fs.copyFileSync(path.join(from, element), path.join(to, element));
			} else {
				copyFolderSync(path.join(from, element), path.join(to, element));
			}
		});
	}

	const fail = (err, data) => {
		console.error('ERROR: ', err);
		if (data) {
			console.error(data);
		}

		process.exit(1);
	}

	// Handle Params
	if (args.path == null && args.totalLines == null) {
		fail(errors.missingCoverage);
	}

	if (args.project == null || args.branch == null || args.commit == null || args.host == null || args.name == null) {
		fail(errors.missingRequiredParams);
	}

	// Handle trailing slash
	if (args.host.charAt(args.host.length - 1) !== '/') {
		args.host += '/';
	}

	// Prepare request
	const data = {
		branch: args.branch,
		project: args.project,
		commit: args.commit,
		name: args.name
	};

	// Set coverage directly if supplied
	if (args.totalLines != null) {
		data.totalLines = args.totalLines;
		data.totalCovered = args.totalCovered;
	}

	// Handle extra params
	['merge-base', 'target-branch', 'merge-request-iid'].forEach((param) => {
		if (args[param] != null) {
			data[param] = args[param];
		}
	});

	// Check for lcov file
	if (args.path) {
		try {
			data.lcov = fs.createReadStream(args.path);
		} catch (err) {
			fail(errors.lcovFile, err);
		}
	}

	// Handle zip
	if (args.zip) {
		await new Promise(async (resolve, reject) => {
			fs.accessSync(args.zip, fs.constants.F_OK);

			// Zip it up
			await ZipDir(args.zip, { saveTo: './coverage.zip', each: file => console.log(file) });
			data.zip = fs.createReadStream('coverage.zip');

			resolve();
		});
	}

	// Send request
	const body = new FormData();
	for (const key in data) {
		body.append(key, data[key]);
	}

	const response = await fetch(`${args.host}api/commits`, {
		method: 'POST',
		headers: {
			'Accept': 'application/json'
		},
		body
	}).then((res) => res.json());

	console.log(`Coverage: ${response.coverage}%`);

})();
