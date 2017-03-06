'use strict';

const fs = require('fs');
const http = require('http');
function handle(err, req, res, next) {
    if (!err) return next(err);

    if (!(err instanceof Error)) {
        err = new Error(err);
    }
    if (res.statusCode < 400) {
        res.statusCode = 500;
    }
    if (err instanceof EvalError || 
        err instanceof RangeError || 
        err instanceof ReferenceError || 
        err instanceof SyntaxError || 
        err instanceof TypeError || 
        err instanceof URIError || 
        /^(EvalError|Range|Reference|Syntax|Type|URI)Error/.test(err.message)) {
        res.statusCode = 500;
    }
    if (res.statusCode >= 500) {
        console.error('[HTTP STATUS: ' + res.statusCode + ']', err.stack);
    }
    res.statusCode = err.statusCode || res.statusCode;
    let statusMessage = http.STATUS_CODES[res.statusCode];
    let data = {
        statusCode: res.statusCode,
        statusMessage: statusMessage,
        message: err.stack,
        color: '#E90000',
        layout: false,
    };

    let debug = (res.statusCode >= 500) && req.query.__debug__;
    debug = debug || this.config.debug;
    if (res.statusCode < 500) { data.color = '#A93000'; }
    if (req.requestType && req.requestType.toUpperCase() === 'AJAX' && res.apiRender) {
        const common = require('bootjs-common');
        let apiResp = new common.ApiResponse();
        let errMsg = err.message;
        if (debug) {
            errMsg = err.stack;
        }
        apiResp.setCode(common.Error.codes.GENERAL, errMsg);
        return res.apiRender(apiResp);
    }

    if (!debug) {
        let handleUrl = res.exceptionHandler || this.config.exceptionHandler;
        if (handleUrl) {
            if (res.forward) { // 如果加载了bootjs模块，使用forward.
                return res.forward(handleUrl, data);
            } else {
                // @TODO: 永远不要使用redirect.
                // return res.redirect(handleUrl);
            }
        }
    }

    let ejsBaseDir = __dirname + '/ejs/';
    let debugDir = debug? 'debug/': '';
    let viewFile = ejsBaseDir + debugDir + res.statusCode +'.ejs';
    if (!fs.existsSync(viewFile)) {
        viewFile = ejsBaseDir + debugDir + 'error.ejs';
    }
    res.render(viewFile, data);
}

module.exports = function (config) {
    config = config || {
        appName: 'Your Application',
        debug: true,
    };
    let handler = {config: config};
    return [handle.bind(handler)];
};