import pino from 'pino';
import CONFIG from './config.toml';

const logger = pino({ level: 'debug' }, pino.destination('./log.jsonl'));

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

  logger.debug(config, 'Config item')
  logger.debug(mask(process.env[config.token_name]), 'Config key')
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

async function forward(req) {
  const method = req.method;
  const pathname = new URL(req.url).pathname;
  logger.debug(`[${method}] ${pathname}`);

  if (pathname === '/') {
    return serverStatus();
  }

  const content = await req.json();
  const requiredModel = content.model;
  const config = CONFIG.models.find((model) => model.name === requiredModel);

  const baseUrl = config.base_url;
  const apiToken = process.env[config.token_name];

  logger.info(`forward to ${baseUrl}${pathname} for ${requiredModel}`);
  logger.info(content, 'request');

  const res = await fetch(`${baseUrl}${pathname}`, {
    method,
    body: method === 'GET' ? null : JSON.stringify(content),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`,
    },
  });

  return res;
}

const sve = Bun.serve({
  port: CONFIG.port ?? 10000,
  routes: {
    '/v1/models': () => modelList(),
    '/favicon.ico': () => new Response(null, { status: 404 }),
  },
  fetch(req) {
    return forward(req)
  }
});

logger.info(`CWD: ${process.cwd()}`);
console.log(`OpenAI API Forward Server running at http://localhost:${sve.port}`);
