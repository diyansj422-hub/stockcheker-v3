const http = require('http');
const fs = require('fs');
const path = require('path');

const licenseHandler = require('./api/license');
const stockHandler = require('./api/stock');

const root = __dirname;
const port = Number(process.env.PORT) || 10000;
const handlers = {
  '/api/license': licenseHandler,
  '/api/stock': stockHandler,
  '/API/license': licenseHandler,
  '/API/stock': stockHandler
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mpeg': 'audio/mpeg',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

function responseAdapter(res) {
  let statusCode = 200;
  const adapter = {
    setHeader: (name, value) => res.setHeader(name, value),
    status: status => {
      statusCode = status;
      return adapter;
    },
    json: body => {
      if (!res.headersSent) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      res.end(JSON.stringify(body));
    },
    end: body => {
      if (!res.headersSent) res.writeHead(statusCode);
      res.end(body);
    }
  };
  return adapter;
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2 * 1024 * 1024) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

function safeFilePath(requestPath) {
  const requested = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.resolve(root, `.${requested}`);
  return filePath.startsWith(`${root}${path.sep}`) ? filePath : null;
}

function serveStatic(req, res, requestPath) {
  const filePath = safeFilePath(requestPath);
  if (!filePath) return json(res, 400, { error: 'Invalid path.' });

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) return json(res, 404, { error: 'Not found.' });
    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health' && (req.method === 'GET' || req.method === 'HEAD')) {
    if (req.method === 'HEAD') return res.writeHead(200).end();
    return json(res, 200, { ok: true, service: 'croma-stock-signal', time: new Date().toISOString() });
  }

  const handler = handlers[url.pathname];
  if (handler) {
    if (req.method === 'POST') {
      try {
        req.body = await readJson(req);
      } catch (error) {
        return json(res, error.statusCode || 400, { error: error.message });
      }
    }
    try {
      return await handler(req, responseAdapter(res));
    } catch (error) {
      console.error(error);
      return json(res, 500, { error: 'Internal server error.' });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json(res, 405, { error: 'Method not allowed.' });
  }
  return serveStatic(req, res, decodeURIComponent(url.pathname));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Croma Stock Signal listening on port ${port}`);
});
