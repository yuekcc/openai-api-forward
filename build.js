import { $ } from 'bun';

// await $`mkdir -p dist`;
await $`rm -rf dist/*`;

console.log('Build');
await $`bun build --target=bun --outfile=dist/index.js index.js`;

console.log('Install');
const files = ['openai-api-forward.ps1'];
for (const file of files) {
  await $`cp ${file} dist`;
}
