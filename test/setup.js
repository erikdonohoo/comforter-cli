'use strict';

var lab = exports.lab = require('lab').script();
var code = require('code');
var child = require('child_process');
var path = require('path');
var fs = require('fs-extra');
var Combinatorics = require('js-combinatorics');

var outfile = path.resolve(__dirname, '.output/setup.out');

lab.experiment('setup: params', function () {

	lab.before(function (done) {
		fs.mkdirpSync(path.resolve(__dirname, '.output'));
		done();
	});

	lab.after(function (done) {
		fs.unlink(outfile);
		done();
	});

	var params = {
		host: 'http://localhost/',
		branch: 'my-branch',
		commit: 'sha',
		project: 1,
		apiKey: 'key',
		name: 'stuff'
	};

	var keys = Object.keys(params);

	var permutations = Combinatorics.permutation(keys).toArray();

	permutations.forEach(function (permutation, index) {

		var string = '';
		permutation.forEach(function (param, index) {
			if (index === permutation.length - 1) {
				return; // only use 3
			}
			string += '--' + param + ' ' + params[param] + ' ';
		});

		lab.test('fails when missing required params combo ' + index, function (done) {
			child.exec('node ' + __dirname + '/../lib/index.js --coverage 98.8 ' + string + ' > ' + outfile, function (err) {
				code.expect(err).to.exist();
				code.expect(err.toString()).to.contain('Missing one or many of required params (commit, branch, project, host, apiKey, name)');
				done();
			});
		});
	});
});
