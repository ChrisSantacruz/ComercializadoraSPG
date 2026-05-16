'use strict';

const { randomBytes } = require('crypto');

/**
 * Propagates or generates X-Request-Id for tracing (logs + error responses).
 */
function requestContext(req, res, next) {
  const incoming = req.get('X-Request-Id') || req.get('x-request-id');
  const requestId =
    incoming && String(incoming).length <= 128
      ? String(incoming)
      : randomBytes(8).toString('hex');
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestContext;
