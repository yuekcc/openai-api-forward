import sysconfig from './config.toml';

const sve = Bun.serve({
  port: sysconfig.port ?? 10000,
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    const content = await req.json();

    const requiredModel = content.model;
    const config = sysconfig.models.find((model) => model.name === requiredModel);

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
