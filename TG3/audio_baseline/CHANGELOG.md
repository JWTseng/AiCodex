# CHANGELOG

## v1 (2025-08-17)
- 建立音频基准目录与文件：README, profile.json, code_refs.md, tests.md
- 对齐到线上满意版本（af9e9a7）：
  - SFX 直接播放（同步），去除阻塞等待
  - LEGACY_AUDIO_PROFILE（频率/波形/时长/包络）固化
  - 连击与压哨“叮”采用同步路径
  - 开局仅后台预热音乐，不阻塞 SFX
