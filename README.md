# openai-api-forward

简单的 openai 接口代理，用于支持不同的服务商，方便薅羊毛。

- 只支持 openai 接口
- 只测试了简单的 `/chat/completions` 接口，支持 stream

🚧🚧当前并没有做任务安全措施，只建议在本地使用🚧🚧

## 使用

1. 配置好 [bun](https://github.com/oven-sh/bun) 
2. 修改 config.toml 配置，在 `models` 字段中增加自己的接口

    `token_name` 对应是 `.env.production` 中的 key。

3. 在命令行中执行 `bun index.js`
4. 修改 LLM 接口供应商配置为 `http://localhost:10000`（默认端口是 10000，可以在 config.toml 中配置）

