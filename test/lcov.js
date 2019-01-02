'use strict';

var lab = exports.lab = require('lab').script();
var code = require('code');
var child = require('child_process');
var path = require('path');
var fs = require('fs-extra');

var outfile = path.resolve(__dirname, '.output/lcov.out');

lab.experiment('setup: lcov file or coverage percent', function () {

	lab.before(function (done) {
		fs.mkdirpSync(path.resolve(__dirname, '.output'));
		done();
	});

	lab.after(function (done) {
		fs.unlink(outfile);
		done();
	});

	lab.test('fails when missing lcov file ref or coverage directly', function (done) {
		child.exec('node ' + __dirname + '/../lib/index.js --branch branch --project 1 --host a --commit sha --apiKey key > ' +
		outfile, function (err) {
			code.expect(err).to.exist();
			code.expect(err.toString()).to.contain('Missing path to lcov file or generated coverage percentange');
			done(); // dont pass err cuz we are expecting err
		});
	});

	lab.test('fails if lcov file path doesnt exist', function (done) {
		child.exec('node ' + __dirname + '/../lib/index.js --branch branch --apiKey key --project 1 --host a --commit sha --path ' +
			__dirname + '/../test/lcovv.info --name coolProject > ' + outfile, function (err) {
			code.expect(err).to.exist();
			code.expect(err.toString()).to.contain('LCOV file could not be found');
			done(); // dont pass err cuz we are expecting err
		});
	});
});
