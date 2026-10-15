# 中文沙雕动画样片

## Phase 4 & 5

- [x] 每句对白独立 TTS 音频与绝对时间轴
- [x] 每句 Rhubarb 口型 cue 与对白字幕同步
- [x] 重新混音、静帧视觉 QA、golden baseline
- [x] 最终 MP4 重渲染与媒体流验证

## Visual feedback follow-up

- [x] 加入 gesture 肢体动作并绑定对白节奏
- [x] 删除静态嘴巴覆盖，保留可见口型动画
- [x] 眼睛支持 gaze、blink、emotion 的动态变化
- [x] 扩充小卖部背景道具与层次

- [x] 扩展逐句 dialogue-first script/timeline
- [x] 接入逐句中文 TTS 与角色语气参数
- [x] 增加表情/说话/反应 preset 编译与渲染
- [x] 增加平面 SVG 场景、道具和漫画特效
- [x] 增加底部大字中文字幕
- [x] 编写中文样片并完整渲染
- [x] 多模态检查关键帧并修正 Phase 3 移动表情脱离问题
- [x] 运行测试并验证最终 MP4 音视频字幕流

## Compiled continuous-performance Remotion runtime

- [ ] Define the studio performance manifest/frame-state seam without changing the compiler
- [ ] Add red tests for actors, expressions, gestures, semantic placement, camera, bound props, subtitles, VFX, and seek determinism
- [ ] Implement the pure frame evaluator and `PerformanceEpisode` composition
- [ ] Register a new Remotion composition while keeping legacy `episode`
- [ ] Run focused tests, full current tests, and typecheck; review diff for preserved Puppet/Sets/Shot changes
