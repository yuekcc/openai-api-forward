import CONFIG from './config.toml';

function log(...args) {
  console.log(...args);
}

function mask(str) {
  return str.slice(0, 4).split('').filter(Boolean).join('') + '****' + str.slice(-4).split('').filter(Boolean).join('');
}

function verifyModelConfig(config) {
  log('Verifying model config');

  if (!config.name) {
    throw new Error('Model name is missing');
  }
  if (!config.base_url) {
    throw new Error('Model base URL is missing');
  }
  if (!config.token_name) {
    throw new Error('Model API token name is missing');
  }

  log('>> name', config.name);
  log('>> base_url', config.base_url);
  log('>> token_name', config.token_name, mask(process.env[config.token_name]));
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

const sve = Bun.serve({
  port: CONFIG.port ?? 10000,
  static: {
    '/favicon.ico': new Response('not found', { status: 404 }),
  },
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    const method = req.method;
    log(`[${method}] ${pathname}`);

    if (pathname === '/') {
      return serverStatus();
    }

    if (pathname === '/v1/models') {
      return modelList();
    }

    const content = await req.json();
    const requiredModel = content.model;
    const config = CONFIG.models.find((model) => model.name === requiredModel);

    const baseUrl = config.base_url;
    const apiToken = process.env[config.token_name];

    log(`forward to ${baseUrl}${pathname} for ${requiredModel}`);

    const res = await fetch(`${baseUrl}${pathname}`, {
      method,
      body: JSON.stringify(content),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    return res;
  },
});

log(`\nCWD: ${process.cwd()}`);
log(`\nOpenAI API Forward Server running at http://localhost:${sve.port}`);
