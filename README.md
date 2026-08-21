# dsh-better-model-thinking-control

![樱落生态成员](https://api.mcylyr.cn/photo/logo/ConnectEcoSystem.svg)

DSH Web 插件：在 DSH 自身的「设置 -> 插件 -> 插件配置」里按中转站和模型设置思考强度，并从 OpenAI 兼容中转站自动拉取模型及公开的思考能力。

## About

**dsh-better-model-thinking-control** 是 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 的 Web 插件，为 OpenAI 兼容中转 API 提供**按模型的思考强度控制**。它把配置保存到 DSH 原生 `llm-pi-ai` 设置中，而不是代理或篡改模型请求；因此配置即时生效，且可继续由 DSH 的模型选择器和思考档位 UI 使用。

仓库 Topics / 发布 Git tag 均使用 `dsh-plugin`。每次推送至 `main` 都会自动测试、执行 `npm pack`，并创建一个带安装包附件的 GitHub Release。

## 已实现

- 接入 DSH 原生 `settings.plugin.item`，不修改 DSH 主仓库。
- 直接编辑 `llm-pi-ai.providers.<provider>.models[].reasoningEfforts`，使用 DSH 原生的按模型推理能力。
- 支持 `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`，也可标记为非推理模型。
- 自动访问中转站的 OpenAI 兼容 `/models` 接口。
- 识别常见扩展字段：`reasoning_efforts`、`supported_reasoning_efforts`、`thinking_levels`、`reasoning.efforts` 等，并保留网关自定义的 wire value。
- API Key 不写入本插件配置；探测时只通过 DSH credentials 引用读取。

## 重要限制

标准 OpenAI `/models` 通常只有模型 ID，并不会声明思考档位。没有公开能力元数据时，插件会保留当前配置并允许你手动勾选，不会通过真实对话逐档试错，因为那会产生费用和副作用。

插件要求 DSH 已启用 `llm-pi-ai`，中转站使用 OpenAI Completions 或 Responses 协议。

## 安装

```bash
npm pack
dsh plugin --profile web add "file:./dsh-better-model-thinking-control-0.2.0.tgz"
```

重启 DSH Web 后，在设置左侧导航直接打开 **「模型思考强度」**。入口只出现在设置侧栏，不会在「插件」页重复显示。每个中转站都可展开/收起；自动拉取支持填写一次性 API Key（只用于本次请求，不会保存）。推理强度选项使用 `Off / Minimal / Low / Medium / High / XHigh / Max`。

## 配置结果示例

插件最终写入 DSH 原生设置：

```yaml
llm-pi-ai:
  providers:
    my-gateway:
      baseURL: https://gateway.example/v1
      api: openai-completions
      models:
        - id: deepseek-reasoner
          reasoningEfforts:
            off:
            high: high
            max: max
```

`reasoningEfforts` 的键是 DSH 选择器提供的档位，值是中转站实际接受的拼写。只有 `off` 可以为空值，表示关闭思考时不发送协议参数。

## 开发校验

```bash
npm test
npm pack
```

### DSH 版本兼容性

`0.1.6` 起只注册设置侧栏中的独立「模型思考强度」入口，不再向「插件」页注册重复卡片；推理强度改为纯英文档位。`0.1.7` 将自动识别说明移到总标题下方，只显示一次。`0.1.8` 将档位勾选改为下拉多选。`0.1.9` 将模型名称、强度下拉栏和删除按钮调整为同一行，并将「非推理模型」收进下拉菜单。`0.2.0` 移除最外层卡片边框，仅保留中转站分组框，并固定三项控件的对齐布局。升级后请重启 DSH Web，并安装新打出的 `dsh-better-model-thinking-control-0.2.0.tgz`。

## 自动发布

`.github/workflows/release.yml` 会在每次推送 `main` 后执行以下操作：

1. 使用 Node.js 22 运行测试；
2. 执行 `npm pack`；
3. 创建 `dsh-plugin-v<package-version>-<run-number>` Git tag 与 GitHub Release；
4. 上传 `.tgz` 安装包；
5. 尝试更新仓库 About 描述、Homepage，并在 Topics 中添加 `dsh-plugin`（保留既有 Topics）。

工作流需要仓库 Settings -> Actions -> General -> Workflow permissions 允许 `Read and write permissions`，否则 GitHub 无法创建 Release。About/Topics 更新缺少仓库管理权限时只会打印 warning，不会阻断发布；可在仓库 About 面板手动填写描述并添加 `dsh-plugin`。