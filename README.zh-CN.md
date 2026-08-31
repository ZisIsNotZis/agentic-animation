# agentic-animation

一个由智能代理操作的工具链：把故事转换为带旁白的 2D MP4。动作由分层
木偶和代码驱动的关键帧完成，并由 Remotion 渲染；不使用生成式视频。生成
式静态图只允许用于资产制作。

状态：**积极开发中**（`0.0.0`）。仓库中的 episode 只是演示，不是稳定 API
或已完成的电影发布版本；接口可能变化。

## 快速开始

需要 Node 20+、npm、`ffmpeg` 和可用 shell。ComfyUI、生产 TTS 等可选服务由
`anim doctor` 检查；smoke 流程使用本地占位资产。

```sh
npm install
npm run typecheck
npm test
npm run anim -- doctor
npm run smoke
```

真实 YAML episode 先验证，再制作或渲染：

```sh
npm run anim -- check episodes/ai-work-adventure/episode.yml
npm run anim -- make episodes/ai-work-adventure/episode.yml
```

## 规范 YAML 管线

`episode.yml` 是唯一由代理编写的可执行阶段脚本。它把 episode 内部的友好
ID 绑定到版本化资产，声明语义化构图，并在对白边界放置类型化调用：

```text
episode.yml -> source 校验 -> registry + 音频时间轴 -> performance IR
  -> Remotion 帧 -> QA -> MP4
```

渲染器只读取编译后的 performance IR。坐标、骨骼机制、过程配方和默认时长
分别由资产及编译器契约负责；旧式 authoring 形式不再接受。文档归属和冲突
优先级见 [docs/INDEX.md](docs/INDEX.md)。

## 证据、限制与未来

最新记录见 [docs/STATUS.md](docs/STATUS.md)：包括 typecheck、112 个通过测试
和 7 个跳过测试、视觉资产检查、音频 QA，以及 180 秒基准测试。完整电影
渲染仍是后续工作；smoke 不代表可选模型服务已安装，也不代表生产质量。

当前版本为 `0.0.0`，DSL、schema 和 IR 可能发生破坏性变化。近期目标是完整
演示渲染、最终 QA 和版本化发布物。

## Issue / PR

Issue 请附复现命令、环境、输入和日志或 QA 证据。PR 若改变公开行为，应先
更新 `docs/` 中的归属文档，并附聚焦测试或证据，说明已知限制。维护者负责
审核和合并；不要提交生成物或密钥。

## 文档

- [docs/INDEX.md](docs/INDEX.md) — 规范导航和优先级。
- [docs/STATUS.md](docs/STATUS.md) — 当前状态、证据、限制和后续工作。
- [docs/REPOSITORY_MAINTENANCE.md](docs/REPOSITORY_MAINTENANCE.md) — 维护规则。
- [docs/NARROW_EPISODE_DSL.md](docs/NARROW_EPISODE_DSL.md) — YAML authoring 语言。
