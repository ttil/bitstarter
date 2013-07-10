#!/usr/bin/env node

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(inFile) {
	var inStr = inFile.toString();
	if (!fs.existsSync(inStr)) {
		console.error("%s does not exist. Exiting.", inStr);
		process.exit(1);
	}

	return inStr;
};

var cheerioHtml = function(html) {
	return cheerio.load(html);
};

var loadChecks = function(checksFile) {
	return JSON.parse(fs.readFileSync(checksFile));
};

var checkHtml = function(html, checksFile) {
	$ = cheerioHtml(html);
	var checks = loadChecks(checksFile);
	var out = {};
	for (var ii in checks)
	{
		var present = $(checks[ii]).length > 0;
		out[checks[ii]] = present;
	}

	outputResults(out);
};

var clone = function(fn) {
	return fn.bind({});
};

var buildWebCallbackFn = function(checksFile) {
	var checkCallback = function(result, response) {
		if (result instanceof Error) {
			outputError(util.format(response.message));
		} else {
			checkHtml(result, checksFile);
		}
	};

	return checkCallback;
};

var buildFsCallbackFn = function(checksFile) {
	var checkCallback = function(err, data) {
		if (err) {
			outputError(err);
		} else {
			checkHtml(data, checksFile);
		}
	};

	return checkCallback;
};

var outputError = function(err) {
	console.error("Error occurred: %s", err);
	program.exit(1);
};

var outputResults = function(resultJson) {
	var outJson = JSON.stringify(resultJson, null, 4);
	console.log(outJson);
};

var checkHtmlFile = function(htmlFile, checksFile) {
	var checkCallback = buildFsCallbackFn(checksFile);
	fs.readFile(htmlFile, checkCallback);
};

var checkUrl = function(url, checksFile) {
	var checkCallback = buildWebCallbackFn(checksFile);
	rest.get(url).on('complete', checkCallback);
};

if (require.main == module) {
	program
		.option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
		.option('-f, --file <html_file>', 'Path to html file', clone(assertFileExists), HTMLFILE_DEFAULT)
		.option('-u, --url <html_file_url>', 'URL of htm file')
		.parse(process.argv);

	if (program.url != null) {
		checkUrl(program.url, program.checks);
	} else {
		checkHtmlFile(program.file, program.checks);
	}
} else {
	exports.checkHtmlFile = checkHtmlFile;
	exports.checkUrl = checkUrl;
}
