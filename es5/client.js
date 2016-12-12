'use strict';

var fetchMock = require('./fetch-mock');
var statusTextMap = require('./status-text');
var theGlobal = typeof window !== 'undefined' ? window : self;

module.exports = fetchMock({
	global: theGlobal,
	Request: theGlobal.Request,
	Response: theGlobal.Response,
	Headers: theGlobal.Headers,
	statusTextMap: statusTextMap
});