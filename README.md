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
dsh plugin --profile web add "file:./dsh-better-model-thinking-control-0.2.9.tgz"
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
`0.2.3` 修正主页面模型搜索菜单样式并保持对 DSH 原生选择逻辑的兼容。
`0.2.4` 使用统一三列网格对齐模型名称、删除按钮、思考档位和输入模态控件。
`0.2.5` 增加 `Ultra` 思考档位；自动拉取会保留网关返回的同模型思考档位和输入模态；中转站默认全部收起。
`0.2.6` 修正新增模型的 Ultra 默认档位。
`0.2.7` 在自动拉取时同时补全网关和 DSH 本地目录提供的思考档位、输入模态。
`0.2.8` 使用严格的两列网格对齐模型名称/删除与思考档位/输入模态。
`0.2.9` 恢复紧凑的模型名称/删除布局，将非推理模型纳入思考档位菜单，并让两个下拉菜单互斥避免重叠。升级后请重启 DSH Web，并安装新打出的 `dsh-better-model-thinking-control-0.2.9.tgz`。

## 许可证

本项目采用 **Sakura-License v1.2**（固定文本标识 `Sakura-License-1.2`）。完整正文见 [LICENSE](./LICENSE)，
采用声明（项目、许可人、适用范围与首次适用提交）见 [NOTICE.md](./NOTICE.md)。

- 它是**源码可用（source-available）**许可证，限制特定商业利用，不是 OSI 批准的开源许可证；
- 阅读、运行、复制、修改、分发与自部署免许可费；但**面向第三方的商业利用（销售、订阅、付费 SaaS、收费托管 / 部署 / 定制 / 支持等）须先取得书面商业授权**；
- 对外分发或提供受覆盖作品时，须保留署名、许可证与来源信息，并**同步公开对应源码**；
- 通过公开 API / HTTP 等协议独立调用本插件的运行实例，不因此构成商用或触发共享义务；
- 历史授权保留：在此前 LGPL-2.1 下取得副本者，可继续按该许可使用（见 [NOTICE.md](./NOTICE.md)）。

> 历史 package.json 的 MIT 声明与根 LICENSE 的 LGPL-2.1 正文存在差异；本次统一后续版本的元数据，不撤销此前依法取得的任何权利，详见 [NOTICE.md](./NOTICE.md)。

商用授权请在 [Issues](https://github.com/Guyao146/dsh-better-model-thinking-control/issues) 发起申请（请勿在公开 Issue 中提交敏感资料）。

## v0.2.10 发布

本版本统一采用 Sakura-License v1.2，随发布包提供 LICENSE 与 NOTICE.md；历史和第三方授权保持不变。功能行为不变。
