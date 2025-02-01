import CONFIG from './config.toml';

console.log(`CWD: ${process.cwd()}`);

function verifyModelConfig(config) {
  console.log('Verifying model config');

  if (!config.name) {
    throw new Error('Model name is missing');
  }
  if (!config.base_url) {
    throw new Error('Model base URL is missing');
  }
  if (!config.token_name) {
    throw new Error('Model API token name is missing');
  }

  console.log('>> name', config.name);
  console.log('>> base_url', config.base_url);
  console.log('>> token_name', config.token_name, process.env[config.token_name]);
}

CONFIG.models.forEach(verifyModelConfig);

const sve = Bun.serve({
  port: CONFIG.port ?? 10000,
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    const content = await req.json();

    const requiredModel = content.model;
    const config = CONFIG.models.find((model) => model.name === requiredModel);

    const method = req.method;
    const baseUrl = config.base_url;
    const apiToken = process.env[config.token_name];

    console.log(
      `[${method}] ${pathname} => ${baseUrl}${pathname} for model ${requiredModel} with API token ${config.token_name}`,
    );

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

console.log(`OpenAI API Forward Server running at http://localhost:${sve.port}`);
