'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var compileRoute = require('./compile-route');

var FetchMock = function () {
	function FetchMock(opts) {
		_classCallCheck(this, FetchMock);

		this.config = {
			sendAsJson: true
		};
		this.Headers = opts.Headers;
		this.Request = opts.Request;
		this.Response = opts.Response;
		this.stream = opts.stream;
		this.global = opts.global;
		this.statusTextMap = opts.statusTextMap;
		this.routes = [];
		this._calls = {};
		this._matchedCalls = [];
		this._unmatchedCalls = [];
		this.fetchMock = this.fetchMock.bind(this);
		this.restore = this.restore.bind(this);
		this.reset = this.reset.bind(this);
	}

	_createClass(FetchMock, [{
		key: 'mock',
		value: function mock(matcher, response, options) {

			var route = void 0;

			// Handle the variety of parameters accepted by mock (see README)

			// Old method matching signature
			if (options && /^[A-Z]+$/.test(response)) {
				throw new Error('The API for method matching has changed.\n\t\t\t\tNow use .get(), .post(), .put(), .delete() and .head() shorthand methods,\n\t\t\t\tor pass in, e.g. {method: \'PATCH\'} as a third paramter');
			} else if (options) {
				route = _extends({
					matcher: matcher,
					response: response
				}, options);
			} else if (matcher && response) {
				route = {
					matcher: matcher,
					response: response
				};
			} else if (matcher && matcher.matcher) {
				route = matcher;
			} else {
				throw new Error('Invalid parameters passed to fetch-mock');
			}

			this.addRoute(route);

			return this._mock();
		}
	}, {
		key: 'once',
		value: function once(matcher, response, options) {
			return this.mock(matcher, response, _extends({}, options, { times: 1 }));
		}
	}, {
		key: '_mock',
		value: function _mock() {
			// Do this here rather than in the constructor to ensure it's scoped to the test
			this.realFetch = this.realFetch || this.global.fetch;
			this.global.fetch = this.fetchMock;
			return this;
		}
	}, {
		key: '_unMock',
		value: function _unMock() {
			if (this.realFetch) {
				this.global.fetch = this.realFetch;
				this.realFetch = null;
			}
			this.fallbackResponse = null;
			return this;
		}
	}, {
		key: 'catch',
		value: function _catch(response) {
			if (this.fallbackResponse) {
				console.warn('calling fetchMock.catch() twice - are you sure you want to overwrite the previous fallback response');
			}
			this.fallbackResponse = response || 'ok';
			return this._mock();
		}
	}, {
		key: 'spy',
		value: function spy() {
			this._mock();
			return this.catch(this.realFetch);
		}
	}, {
		key: 'isMocked',
		value: function isMocked(url, opts) {
			var route = void 0;
			var bReturn = false;
			for (var i = 0, il = this.routes.length; i < il; i++) {
				route = this.routes[i];
				//console.log('****', route.name, route.matcher(url, opts))
				if (route.isMocked(url, opts)) {
					bReturn = true;
					console.log('bbbbb', route, bReturn);
				}
			}
			return bReturn;
		}
	}, {
		key: 'fetchMock',
		value: function fetchMock(url, opts) {
			var _this = this;

			console.warn('unmatched call to ' + url);
			var response = this.router(url, opts);

			if (!response) {

				this.push(null, [url, opts]);

				if (this.fallbackResponse) {
					response = this.fallbackResponse;
				} else {
					if (!this.isMocked(url, opts)) {
						console.warn('unmatched call to ' + url + ' passing to realFetch ' + JSON.stringify(opts) + ' ' + this);
						return this.realFetch.bind(this.global)(url, opts);
					}

					throw new Error('unmatched call to ' + url);
				}
			}

			if (typeof response === 'function') {
				response = response(url, opts);
			}

			if (typeof response.then === 'function') {
				return response.then(function (response) {
					return _this.mockResponse(url, response, opts);
				});
			} else {
				return this.mockResponse(url, response, opts);
			}
		}
	}, {
		key: 'router',
		value: function router(url, opts) {
			var route = void 0;
			for (var i = 0, il = this.routes.length; i < il; i++) {
				route = this.routes[i];
				//console.log('****', route.name, route.matcher(url, opts))
				if (route.matcher(url, opts)) {
					this.push(route.name, [url, opts]);
					return route.response;
				}
			}
		}
	}, {
		key: 'addRoute',
		value: function addRoute(route) {

			if (!route) {
				throw new Error('.mock() must be passed configuration for a route');
			}

			// Allows selective application of some of the preregistered routes
			this.routes.push(compileRoute(route, this.Request));
		}
	}, {
		key: 'mockResponse',
		value: function mockResponse(url, responseConfig, fetchOpts) {
			// It seems odd to call this in here even though it's already called within fetchMock
			// It's to handle the fact that because we want to support making it very easy to add a
			// delay to any sort of response (including responses which are defined with a function)
			// while also allowing function responses to return a Promise for a response config.
			if (typeof responseConfig === 'function') {
				responseConfig = responseConfig(url, fetchOpts);
			}

			if (this.Response.prototype.isPrototypeOf(responseConfig)) {
				return Promise.resolve(responseConfig);
			}

			if (responseConfig.throws) {
				return Promise.reject(responseConfig.throws);
			}

			if (typeof responseConfig === 'number') {
				responseConfig = {
					status: responseConfig
				};
			} else if (typeof responseConfig === 'string' || !(responseConfig.body || responseConfig.headers || responseConfig.throws || responseConfig.status)) {
				responseConfig = {
					body: responseConfig
				};
			}

			var opts = responseConfig.opts || {};
			opts.url = url;
			opts.sendAsJson = responseConfig.sendAsJson === undefined ? this.config.sendAsJson : responseConfig.sendAsJson;
			if (responseConfig.status && (typeof responseConfig.status !== 'number' || parseInt(responseConfig.status, 10) !== responseConfig.status || responseConfig.status < 200 || responseConfig.status > 599)) {
				throw new TypeError('Invalid status ' + responseConfig.status + ' passed on response object.\nTo respond with a JSON object that has status as a property assign the object to body\ne.g. {"body": {"status: "registered"}}');
			}
			opts.status = responseConfig.status || 200;
			opts.statusText = this.statusTextMap['' + opts.status];
			// The ternary operator is to cope with new Headers(undefined) throwing in Chrome
			// https://code.google.com/p/chromium/issues/detail?id=335871
			opts.headers = responseConfig.headers ? new this.Headers(responseConfig.headers) : new this.Headers();

			var body = responseConfig.body;
			if (opts.sendAsJson && responseConfig.body != null && (typeof body === 'undefined' ? 'undefined' : _typeof(body)) === 'object') {
				//eslint-disable-line
				body = JSON.stringify(body);
			}

			if (this.stream) {
				var s = new this.stream.Readable();
				if (body != null) {
					//eslint-disable-line
					s.push(body, 'utf-8');
				}
				s.push(null);
				body = s;
			}

			return Promise.resolve(new this.Response(body, opts));
		}
	}, {
		key: 'push',
		value: function push(name, call) {
			if (name) {
				this._calls[name] = this._calls[name] || [];
				this._calls[name].push(call);
				this._matchedCalls.push(call);
			} else {
				this._unmatchedCalls.push(call);
			}
		}
	}, {
		key: 'restore',
		value: function restore() {
			this._unMock();
			this.reset();
			this.routes = [];
			return this;
		}
	}, {
		key: 'reset',
		value: function reset() {
			this._calls = {};
			this._matchedCalls = [];
			this._unmatchedCalls = [];
			this.routes.forEach(function (route) {
				return route.reset && route.reset();
			});
			return this;
		}
	}, {
		key: 'calls',
		value: function calls(name) {
			return name ? this._calls[name] || [] : {
				matched: this._matchedCalls,
				unmatched: this._unmatchedCalls
			};
		}
	}, {
		key: 'lastCall',
		value: function lastCall(name) {
			var calls = name ? this.calls(name) : this.calls().matched;
			if (calls && calls.length) {
				return calls[calls.length - 1];
			} else {
				return undefined;
			}
		}
	}, {
		key: 'lastUrl',
		value: function lastUrl(name) {
			var call = this.lastCall(name);
			return call && call[0];
		}
	}, {
		key: 'lastOptions',
		value: function lastOptions(name) {
			var call = this.lastCall(name);
			return call && call[1];
		}
	}, {
		key: 'called',
		value: function called(name) {
			if (!name) {
				return !!(this._matchedCalls.length || this._unmatchedCalls.length);
			}
			return !!(this._calls[name] && this._calls[name].length);
		}
	}, {
		key: 'done',
		value: function done(name) {
			var _this2 = this;

			//console.log('name: '+ name)
			var names = name ? [name] : this.routes.map(function (r) {
				return r.name;
			});
			// Ideally would use array.every, but not widely supported
			var xReturn = names.map(function (name) {
				if (!_this2.called(name)) {
					return false;
				}
				// would use array.find... but again not so widely supported
				var expectedTimes = (_this2.routes.filter(function (r) {
					return r.name === name;
				}) || [{}])[0].times;
				//console.log('TTTT:', expectedTimes, this.calls(name).length)
				return !expectedTimes || expectedTimes <= _this2.calls(name).length;
			}).filter(function (bool) {
				return !bool;
			}).length === 0;

			return xReturn;
		}
	}, {
		key: 'configure',
		value: function configure(opts) {
			_extends(this.config, opts);
		}
	}]);

	return FetchMock;
}();

['get', 'post', 'put', 'delete', 'head', 'patch'].forEach(function (method) {
	FetchMock.prototype[method] = function (matcher, response, options) {
		return this.mock(matcher, response, _extends({}, options, { method: method.toUpperCase() }));
	};
	FetchMock.prototype[method + 'Once'] = function (matcher, response, options) {
		return this.once(matcher, response, _extends({}, options, { method: method.toUpperCase() }));
	};
});

module.exports = function (opts) {
	return new FetchMock(opts);
};