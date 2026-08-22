# dsh-better-model-thinking-control

![樱落生态成员](https://api.mcylyr.cn/photo/logo/ConnectEcoSystem.svg)
[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-4c7dff)](https://github.com/deepseek-ai/deepseek-harness)
[![已编写Wiki](https://raw.githubusercontent.com/Guyao146/Sakura-EcoSystem-wiki/main/assets/sakura-wiki.svg)](https://wiki.mcylyr.cn/)

DSH Web 插件：在 DSH 自身的「设置 -> 插件 -> 插件配置」里按中转站和模型设置思考强度，并从 OpenAI 兼容中转站自动拉取模型及公开的思考能力。

## 樱落生态Wiki
该项目已编写Wiki，了解项目更多细节 https://wiki.mcylyr.cn

## About

**dsh-better-model-thinking-control** 是 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 的 Web 插件，为 OpenAI 兼容中转 API 提供**按模型的思考强度控制**。它把配置保存到 DSH 原生 `llm-pi-ai` 设置中，而不是代理或篡改模型请求；因此配置即时生效，且可继续由 DSH 的模型选择器和思考档位 UI 使用。

## 已实现

- 接入 DSH 原生 `settings.plugin.item`，不修改 DSH 主仓库。
- 直接编辑 `llm-pi-ai.providers.<provider>.models[].reasoningEfforts`，使用 DSH 原生的按模型推理能力。
- 支持 `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`，也可标记为非推理模型。
- 自动访问中转站的 OpenAI 兼容 `/models` 接口。
- 识别常见扩展字段：`reasoning_efforts`、`supported_reasoning_efforts`、`thinking_levels`、`reasoning.efforts` 等，并保留网关自定义的 wire value。
- API Key 不写入本插件配置；探测时只通过 DSH credentials 引用读取。
- 每个模型可选择文字、图片、视频、语音输入模态；未配置时默认文字。模态选择保存在本插件的浏览器本地配置中。

## 安装

Web版本 DSH
```bash
dsh plugin --profile web add "file:./dsh-better-model-thinking-control-0.2.3.tgz"
```

Desktop版本 DSH
```bash
dsh plugin --profile web add dsh-better-model-thinking-control@latest
```

重启 DSH Web 后，在设置左侧导航直接打开 **「模型思考强度」**。入口只出现在设置侧栏，不会在「插件」页重复显示。每个中转站都可展开/收起；自动拉取支持填写一次性 API Key（只用于本次请求，不会保存）。推理强度选项使用 `Off / Minimal / Low / Medium / High / XHigh / Max`。`0.2.1` 为每个模型增加输入模态选择：文字默认勾选，还可选择图片、视频、语音；这些模态设置保存在本插件的浏览器本地配置中。

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

### DSH 版本兼容性

`0.1.6` 起只注册设置侧栏中的独立「模型思考强度」入口，不再向「插件」页注册重复卡片；推理强度改为纯英文档位。
`0.1.7` 将自动识别说明移到总标题下方，只显示一次。
`0.1.8` 将档位勾选改为下拉多选。
`0.1.9` 将模型名称、强度下拉栏和删除按钮调整为同一行，并将「非推理模型」收进下拉菜单。
`0.2.0` 移除最外层卡片边框，仅保留中转站分组框，并固定三项控件的对齐布局。
`0.2.1` 增加每模型输入模态选择，文字默认勾选，配置保存在插件本地。视频和语音是插件侧能力标记，实际附件输入仍取决于 DSH 和模型适配器支持。
`0.2.2` 增加设置页模型搜索和主页面模型菜单搜索；模型行改为第一行模型名称/删除、第二行思考档位/输入模态。
`0.2.3` 修正主页面模型搜索菜单样式并保持对 DSH 原生选择逻辑的兼容。升级后请重启 DSH Web，并安装新打出的 `dsh-better-model-thinking-control-0.2.3.tgz`。