import pino from 'pino';
import CONFIG from './config.toml';
import fs from 'node:fs/promises';
import path from 'node:path';

const PORT = CONFIG.port ?? 10000;
const HOST = CONFIG.host ?? '127.0.0.1';
const RUN_DIR = path.resolve(process.cwd(), '.run');

const logger = pino({ level: 'debug' }, pino.destination(path.resolve(process.cwd(), './log.jsonl')));

function mask(str) {
  return str.slice(0, 4).split('').filter(Boolean).join('') + '****' + str.slice(-4).split('').filter(Boolean).join('');
}

function verifyModelConfig(config) {
  logger.info('Verifying model config');

  if (!config.name) {
    throw new Error('Model name is missing');
  }
  if (!config.base_url) {
    throw new Error('Model base URL is missing');
  }
  if (!config.token_name) {
    throw new Error('Model API token name is missing');
  }

  logger.debug(config, 'Config item');
  logger.debug(mask(process.env[config.token_name]), 'Config key');
}

CONFIG.models.forEach(verifyModelConfig);

function modelList() {
  const data = {
    data: CONFIG.models.map((model) => ({
      object: 'model',
      owned_by: 'true-openai',
      id: model.name,
    })),
  };

  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

function serverStatus() {
  const data = {
    data: {
      message: 'ok',
    },
  };
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

/**
 * @param {Request} req
 */
async function forward(req) {
  const reqId = Bun.randomUUIDv7();

  const method = req.method;
  const pathname = new URL(req.url).pathname;

  logger.debug(`[${method}] ${pathname} ${req.headers.get('content-type')}`);
  // console.log('headers', req.headers);

  if (pathname === '/') {
    return serverStatus();
  }

  const reqContentTypeHeader = req.headers.get('content-type') ?? '';
  const reqAcceptHeader = req.headers.get('accept') ?? '';
  const reqHeaders = JSON.parse(JSON.stringify(req.headers));

  let baseUrl = CONFIG.default_base_url;
  let apiToken = process.env[CONFIG.default_token_name];

  delete reqHeaders['host'];
  delete reqHeaders['authorization'];
  delete reqHeaders['Authorization'];
  reqHeaders['authorization'] = `Bearer ${apiToken}`;

  if (reqContentTypeHeader.includes('json') || reqContentTypeHeader.includes('plain')) {
    const rawReqBody = await req.text();

    // 记录请求
    const logMessage = `${method} ${req.url}\n${JSON.stringify(reqHeaders, null, 4)}\n\n${rawReqBody}`;
    await fs.writeFile(path.resolve(RUN_DIR, `${reqId}-req.txt`), logMessage, 'utf-8');

    if (reqContentTypeHeader.includes('json')) {
      const content = JSON.parse(rawReqBody);

      const requiredModel = content.model;
      const config = CONFIG.models.find((model) => model.name === requiredModel);

      baseUrl = config.base_url;
      apiToken = process.env[config.token_name];

      logger.info(`forward to ${baseUrl}${pathname} for ${requiredModel}`);
    }

    reqHeaders['authorization'] = `Bearer ${apiToken}`;

    const remoteResponse = await fetch(`${baseUrl}${pathname}`, {
      method,
      body: method === 'GET' ? null : rawReqBody,
      headers: reqHeaders,
    });

    return remoteResponse;
  }

  logger.info('直接转发');
  return fetch(`${baseUrl}${pathname}`, {
    method,
    body: method === 'GET' ? null : await req.bytes(),
    headers: reqHeaders,
  });
}

const sve = Bun.serve({
  hostname: HOST,
  port: PORT,
  routes: {
    '/v1/models': () => modelList(),
    '/favicon.ico': () => new Response(null, { status: 404 }),
  },
  fetch(req) {
    return forward(req);
  },
});

if (!(await fs.exists(RUN_DIR))) {
  await fs.mkdir('.run');
}

await fs.writeFile(path.resolve(RUN_DIR, 'url.txt'), `http://${sve.hostname}:${sve.port}`, 'utf-8');

logger.info(`CWD: ${process.cwd()}`);
console.log(`OpenAI API Forward Server running at http://${sve.hostname}:${sve.port}`);
