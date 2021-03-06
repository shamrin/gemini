'use strict';
var _ = require('lodash'),
    Suite = require('./suite'),
    State = require('./state');

function nothing() {}

function buildBrowserSkipMatcher(browserToSkip, comment) {
    return {
        matches: _.isRegExp(browserToSkip)
            ? browserToSkip.test.bind(browserToSkip)
            : _.isEqual.bind(null, browserToSkip),
        comment: comment
    };
}

function notString(arg) {
    return typeof arg !== 'string';
}

function argumentsToArray(args) {
    if (args.length === 1 && Array.isArray(args[0])) {
        return args[0];
    } else {
        return Array.prototype.slice.call(args);
    }
}

function SuiteBuilder(suite) {
    this.setCaptureElements = function() {
        var selectors = argumentsToArray(arguments);

        if (selectors.some(notString)) {
            throw new TypeError('suite.captureElements accepts only strings or array of strings');
        }

        suite.captureSelectors = selectors;
        return this;
    };

    this.before = function(hook) {
        if (typeof hook !== 'function') {
            throw new TypeError('before hook must be a function');
        }
        suite.beforeHook = hook;
        return this;
    };

    this.after = function(hook) {
        if (typeof hook !== 'function') {
            throw new TypeError('after hook must be a function');
        }
        suite.afterHook = hook;
        return this;
    };

    this.setUrl = function setUrl(url) {
        if (typeof url !== 'string') {
            throw new TypeError('URL must be string');
        }
        suite.url = url;
        return this;
    };

    this.setTolerance = function setTolerance(tolerance) {
        if (typeof tolerance !== 'number') {
            throw new TypeError('tolerance must be number');
        }
        suite.tolerance = tolerance;
        return this;
    };

    this.capture = function capture(name, opts, cb) {
        if (typeof name !== 'string') {
            throw new TypeError('State name should be string');
        }

        if (!cb) {
            cb = opts;
            opts = null;
        }

        cb = cb || nothing;
        opts = opts || {};

        if (typeof cb !== 'function') {
            throw new TypeError('Second argument of suite.capture must be a function');
        }

        if (suite.hasStateNamed(name)) {
            throw new Error('State "' + name + '" already exists in suite "' + suite.name + '". ' +
                'Choose different name');
        }
        var state = new State(suite, name, cb);
        if ('tolerance' in opts) {
            if (typeof opts.tolerance !== 'number') {
                throw new TypeError('Tolerance should be number');
            }
            state.tolerance = opts.tolerance;
        }
        suite.addState(state);
        return this;
    };

    this.ignoreElements = function ignoreElements() {
        var selectors = argumentsToArray(arguments);

        if (selectors.some(notString)) {
            throw new TypeError('suite.ignoreElements accepts only strings or array of strings');
        }
        suite.ignoreSelectors = selectors;
        return this;
    };

    this.skip = function skip(browser, comment) {
        if (!browser) {
            suite.skip();
        } else if (_.isArray(browser)) {
            browser.forEach(_.bind(this.skip, this, _, comment));
        } else if (_.isString(browser) || _.isRegExp(browser)) {
            suite.skip(buildBrowserSkipMatcher(browser, comment));
        } else {
            throw new TypeError('suite.skip browser must be string or RegExp object');
        }
        return this;
    };
}

module.exports = function(context, rootSuite, browsers) {
    var suiteId = 1;
    context.suite = function suite(name, callback) {
        if (typeof name !== 'string') {
            throw new TypeError('First argument of the gemini.suite must be a string');
        }

        if (typeof callback !== 'function') {
            throw new TypeError('Second argument of the gemini.suite must be a function');
        }

        if (rootSuite.hasChildNamed(name)) {
            throw new Error('Suite ' + name + ' already exists at this level. Choose different name');
        }

        rootSuite = Suite.create(name, rootSuite);
        rootSuite.id = suiteId++;
        rootSuite.browsers = browsers;
        callback(new SuiteBuilder(rootSuite));
        if (rootSuite.hasStates) {
            if (!rootSuite.url) {
                throw new Error('URL is required to capture screenshots. ' +
                    'Call suite.setUrl(<DESIRED PATH>) on "' + rootSuite.name +
                    '" suite or one of its parents');
            }

            if (!rootSuite.captureSelectors) {
                throw new Error('Capture region is required to capture screenshots. ' +
                    'Call suite.setCaptureElements(<CSS SELECTORS>) on "' + rootSuite.name +
                    '" suite or one of its parents');
            }
        }
        rootSuite = rootSuite.parent;
    };
};
