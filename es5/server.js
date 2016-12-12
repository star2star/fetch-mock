'use strict';

var fetch = require('node-fetch');
var Request = fetch.Request;
var Response = fetch.Response;
var Headers = fetch.Headers;
var stream = require('stream');
var fetchMock = require('./fetch-mock');
var http = require('http');

module.exports = fetchMock({
	global: global,
	Request: Request,
	Response: Response,
	Headers: Headers,
	stream: stream,
	statusTextMap: http.STATUS_CODES
});