/**
 * @class Connection
 * Browser Support: IE6+ - Basic Functionality, IE10+ - Progress and Upload support
 */
var Connection = (function () {
    /**
     * @constructor
     */
    /**
     * @property base
     */
    function Connection(base) {
        this.base = base;
    }

    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

    function getParameterNames(functionHandle) {
        var definition = functionHandle.toString().replace(STRIP_COMMENTS, '');
        return definition.slice(definition.indexOf('(') + 1, definition.indexOf(')')).match(/([^\s,]+)/g) || [];
    }

    /**
     * @method call
     * @param verb
     * @param url
     * @param sync
     * @param user
     * @param password
     * @param data
     * @param requestCreated
     * @param headersReceived
     * @param success
     * @param error
     * @param progress
     * @param dataType
     */
    function call(verb, url, sync, user, password, data, requestCreated, headersReceived, success, error, progress, dataType) {
        var request = new XMLHttpRequest();
        typeof requestCreated === 'function' ? requestCreated(request) : true;
        if (sync) {
            request.open(verb, url, !sync, user, password);
            processSend(request, verb, data);
            processDone(request, undefined, success, error, dataType);
        } else {
            // If we have access to the modern XMLHttpRequest features
            if ('onprogress' in request) {
                request.onreadystatechange = function (event) {
                    switch (request.readyState) {
                        case XMLHttpRequest.UNSENT: // Never called
                            break;
                        case XMLHttpRequest.OPENED: // Synonymous with loadstart
                            break;
                        case XMLHttpRequest.HEADERS_RECEIVED:
                            typeof headersReceived === 'function' ? headersReceived(request, event) : true;
                            break;
                        case XMLHttpRequest.LOADING: // Synonymous with progress
                            break;
                        case XMLHttpRequest.DONE: // Synonymous with [ abort, error, load, timeout ]
                            break;
                    }
                };
                var uploadStatus = null;
                var downloadStatus = null;
                // Unnecessary
                // request.addEventListener('loadstart', function(event) { });
                // Unnecessary
                // request.upload.addEventListener('loadstart', function(event) { });
                request.upload.addEventListener('progress', function (event) {
                    typeof progress === 'function' ? progress(request, event, true) : true;
                });
                request.upload.addEventListener('abort', function (event) {
                    downloadStatus = 'abort';
                });
                request.upload.addEventListener('error', function (event) {
                    downloadStatus = 'error';
                });
                // TODO: Unnecessary?
                // request.upload.addEventListener('load', function(event) {
                //uploadStatus = 'load';
                //});
                request.upload.addEventListener('timeout', function (event) {
                    downloadStatus = 'timeout';
                });
                // TODO: Unnecessary?
                //request.upload.addEventListener('loadend', function(event) { });
                request.addEventListener('progress', function (event) {
                    typeof progress === 'function' ? progress(request, event, false) : true;
                });
                request.addEventListener('abort', function (event) {
                    downloadStatus = 'abort';
                });
                request.addEventListener('error', function (event) {
                    downloadStatus = 'error';
                });
                request.addEventListener('load', function (event) {
                    downloadStatus = 'load';
                });
                request.addEventListener('timeout', function (event) {
                    downloadStatus = 'timeout';
                });
                request.addEventListener('loadend', function (event) {
                    if (downloadStatus === 'load') {
                        processDone(request, event, success, error, dataType);
                    } else {
                        typeof error === 'function' ? error(request, event, downloadStatus) : true;
                    }
                });
            } else {
                request.onreadystatechange = function (event) {
                    switch (request.readyState) {
                        case XMLHttpRequest.UNSENT: // Never called
                            break;
                        case XMLHttpRequest.OPENED: // Unnecessary
                            break;
                        case XMLHttpRequest.HEADERS_RECEIVED:
                            typeof headersReceived == 'function' ? headersReceived(request, event) : true;
                            break;
                        case XMLHttpRequest.LOADING:
                            // TODO: Unnecessary?
                            typeof progress == 'function' ? progress(request, event, false) : true;
                            break;
                        case XMLHttpRequest.DONE:
                            processDone(request, event, success, error, dataType);
                            break;
                    }
                };
            }
            request.open(verb, url, !sync, user, password);
            processSend(request, verb, data);
        }
        return request;
    }

    function processSend(request, verb, data) {
        var postOrPut = (verb === 'POST' || verb === 'PUT');
        if (typeof data === 'object') {
            if (data instanceof ArrayBuffer) {
                request.send(data);
            } else if (data instanceof Blob) {
                request.send(data);
            } else if (data instanceof Document) {
                request.send(data);
            } else if (data instanceof FormData) {
                request.send(data);
            } else if (data instanceof File) {
                readFile(data, request);
            } else {
                request.setRequestHeader('Content-Type', 'application/json');
                request.send(JSON.stringify(data));
            }
        } else {
            request.send(data);
        }
    }

    function processDone(request, event, success, error, dataType) {
        switch (Math.floor(request.status / 100)) {
            case 2:
                processSuccess(request, event, success, dataType);
                break;
            case 4:
                if (request.status == 408) {
                    typeof error === 'function' ? error(request, event, 'timeout') : true;
                } else {
                    typeof error === 'function' ? error(request, event, 'error') : true;
                }
                break;
            default:
                typeof error === 'function' ? error(request, event, 'error') : true;
                break;
        }
    }

    function processSuccess(request, event, success, dataType) {
        var data = request.responseText;
        switch (request.responseType || dataType) {
            case 'json':
                data = data ? JSON.parse(data) : data;
                break;
            case 'arraybuffer':
            case 'blob':
            case 'document':
            case 'text':
            case '':
            default:
                break;
        }
        typeof success == 'function' ? success(data, request, event) : true;
    }

    function merge(a, b) {
        if (b) {
            for (var member in b) {
                if (b.hasOwnProperty(member)) {
                    a[member] = b[member];
                }
            }
        }
        return a;
    }

    function readFile(file, request) {
        var reader = new FileReader();
        request.overrideMimeType('text/plain; charset=x-user-defined-binary');
        reader.onload = function (event) {
            request.send(event.target.result);
        };
        reader.readAsBinaryString(file);
        return reader;
    }

    /**
     * @method run
     * @param parameters
     */
    function run(parameters) {
        // TODO: Add support for upload and download types.
        // TODO: Merge callbacks to support success and error.
        parameters = merge({
            verb: 'GET',
            url: '',
            sync: false,
            user: undefined,
            password: undefined,
            data: undefined,
            requestCreated: undefined,
            headersReceived: undefined,
            success: undefined,
            error: undefined,
            progress: undefined,
            dataType: 'json',
            query: undefined,
            params: undefined,
            regex: undefined,
            buildUrl: function () {
                return formatUrl(parameters.url, parameters.params, parameters.query, parameters.regex);
            },
        }, parameters);
        return call(parameters.verb.toUpperCase(), parameters.buildUrl(), parameters.sync, parameters.user, parameters.password, parameters.data, parameters.requestCreated, parameters.headersReceived, parameters.success, parameters.error,
            parameters.progress, parameters.dataType);
    }

    /**
     * @method Get
     * @param parameters
     */
    function Get(parameters) {
        parameters = parameters || {};
        parameters.verb = parameters.verb || 'GET';
        return run(parameters);
    }

    /**
     * @method Post
     * @param parameters
     */
    function Post(parameters) {
        parameters = parameters || {};
        parameters.verb = parameters.verb || 'POST';
        return run(parameters);
    }

    /**
     * @method Put
     * @param parameters
     */
    function Put(parameters) {
        parameters = parameters || {};
        parameters.verb = parameters.verb || 'PUT';
        return run(parameters);
    }

    /**
     * @method Delete
     * @param parameters
     */
    function Delete(parameters) {
        parameters = parameters || {};
        parameters.verb = parameters.verb || 'DELETE';
        return run(parameters);
    }

    /**
     * @method formatUrl
     * @param url
     * @param params
     * @param query
     * @param regex
     * @returns {String}
     */
    function formatUrl(url, params, query, regex) {
        var output;
        if (url) {
            output = url;
            if (params) {
                for (var index in params) {
                    if (params.hasOwnProperty(index)) {
                        if (!regex) {
                            regex = RegExp(':' + index + '(?=[/?#&]|$)', 'g');
                        } else if (typeof regex === 'function') {
                            regex = regex(index);
                        } else {
                            regex = RegExp('\\{' + index + '\\}', 'g');
                        }
                        output = output.replace(regex, params[index]);
                    }
                }
            }
        } else {
            output = '';
        }
        if (query) {
            var request = '';
            for (var index in query) {
                if (query.hasOwnProperty(index)) {
                    if (query[index]) {
                        request += (request ? '&' : '?') + index + '=' + query[index];
                    }
                }
            }
            output += request;
        }
        return output;
    }

    /**
     * @method addRoute
     * @param parameters
     */
    function addRoute(parameters) {
        parameters = merge({
            name: '',
            queryNames: undefined,
            paramNames: undefined,
            action: undefined
        }, parameters);
        var runner = undefined;
        if (parameters.action) {
            var names = getParameterNames(parameters.action);
            runner = function () {
                var override = parameters.action.apply(this, arguments) || {};
                override = merge(override, parameters);
                if (this.base) {
                    var url = override.url;
                    if (url) {
                        if (!/^(f|ht)tps?:\/\//i.test(url)) {
                            override.url = this.base + url;
                        }
                    } else {
                        override.url = this.base;
                    }
                }

                var values = {};
                for (var index = 0, length = names.length; index < length; index++) {
                    values[names[index]] = arguments[index];
                }

                if (override.queryNames) {
                    var query = override.query;
                    override.query = {};
                    for (var index in query) {
                        if (query.hasOwnProperty(index)) {
                            override.query[index] = query[index];
                        }
                    }
                    for (var index = 0, length = override.queryNames.length; index < length; index++) {
                        var name = override.queryNames[index];
                        override.query[name] = values[name];
                    }
                }

                if (override.paramNames) {
                    var params = override.params;
                    override.params = {};
                    for (var index in params) {
                        if (params.hasOwnProperty(index)) {
                            override.params[index] = params[index];
                        }
                    }
                    for (var index = 0, length = override.paramNames.length; index < length; index++) {
                        var name = override.paramNames[index];
                        override.params[name] = values[name];
                    }
                }

                override.success = override.success || values['success'];
                override.success = typeof override.success === 'function' ? override.success.bind(this) : override.success;
                override.error = override.error || values['error'];
                override.error = typeof override.error === 'function' ? override.error.bind(this) : override.error;
                override.progress = override.progress || values['progress'];
                override.progress = typeof override.progress === 'function' ? override.progress.bind(this) : override.progress;
                return this.run(override);
            }.bind(this);
            if (parameters.name) {
                this[parameters.name] = runner;
            }
        }
        return runner;
    }

    Connection.prototype.call = call;
    Connection.prototype.run = run;
    Connection.prototype.Get = Get;
    Connection.prototype.Post = Post;
    Connection.prototype.Put = Put;
    Connection.prototype.Delete = Delete;
    Connection.prototype.formatUrl = formatUrl;
    Connection.prototype.addRoute = addRoute;
    return Connection;
})();

if (typeof exports === "object" && exports) {
    // Node version
    if (module) {
        module.exports = Connection;
    }
}
