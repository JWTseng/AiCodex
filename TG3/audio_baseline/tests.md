# 音频基准回归测试清单

## 1. 参数对齐
- 加载运行时参数（可在控制台打印或添加导出按钮）
- 对比 `audio_baseline/profile.json`
- 所有键值严格相等方为通过

## 2. 代码路径校验
- 对照 `audio_baseline/code_refs.md`：
  - `playSFX` 为同步直接播放，允许 `resume()` 尝试
  - `generateChiptuneSFX` 使用 `LEGACY_AUDIO_PROFILE`，并按简单/复杂分支生成
  - `playComboSound`、`playClutchDing` 为同步直接播放
  - `startGame` 音频启动段仅后台预热

## 3. 延迟性能
- 打开 `audio_comparison_test.html`
- 运行“响应延迟测试”10 次，统计平均延迟
- 通过标准：平均 < 10ms；最大 < 20ms

## 4. 连续播放稳定性
- `audio_comparison_test.html` 运行“连续播放测试”（20 次）
- 通过标准：成功率 > 95%

## 5. 音色/音量主观比对
- 逐项试听：移动、旋转、落锁、消行、升级、结束、连击、压哨“叮”
- 与线上满意版本对比，确认无明显差异（频率滑变与包络一致）

## 6. 辅助校验（可选）
- 在开发工具 Performance 中捕获 SFX 启动到 audible 之间的时间
- 检查 `AudioContext.state` 是否在播放时保持 `running`
