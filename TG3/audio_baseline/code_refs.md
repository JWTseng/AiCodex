# 代码基准引用（关键函数与位置索引）

以下引用自当前工作副本，用于将来与基准进行精确比对。请勿随意改动本文件。

## TG3/audio_manager.js
- 类：GlobalAudioManager
- 关键属性：LEGACY_AUDIO_PROFILE（约第 50 行）
- 关键函数：
  - playSFX(type)（约第 220 行）：同步直接播放，含移动节流与最小间隔
  - generateChiptuneSFX(type, frequency, duration)（约第 365 行）：按 legacyProfile 生成（简单/复杂两类）
  - initializeAudio()（约第 100 行）：AudioContext 初始化，latencyHint=interactive, sampleRate=48000

## TG3/tetris.js
- 关键函数：
  - playComboSound(comboCount, options)（约第 1975 行）：同步直接播放，遇 suspended 尝试 resume
  - playClutchDing()（约第 2003 行）：同步直接播放，200ms 冷却
  - startGame() 音频启动段（约第 708 行）：后台预热与启动音乐，不阻塞 SFX

注：具体行号可能因后续改动小幅偏移，建议以函数签名与文件片段比对为主。
