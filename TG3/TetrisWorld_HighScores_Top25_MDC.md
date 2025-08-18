# 🎮 TETRIS WORLD — High Scores (All-Time Top25)  
## Mission Design Canvas (MDC)

---

## 🎯 任务目标
构建一个 **最小可用的全局排行榜系统（All-Time Top25）**，并实现玩家本地成绩展示、首次命名和数据上传。  
前端部署在 **GitHub Pages**，服务端使用 **Google 表单 + Google 表格 + gviz API**，保证零后端、低复杂度。

---

## 🧩 功能模块

### 1. 基础 UI 框架
- **Tab 切换**：`LOCAL`（默认） / `WORLD`
- **WORLD 表格**：  
  `Rank | Name | Score | Level | Lines | Time`
- **结束提示**：若入榜 → “你的世界排名 #X”；否则 → “未进入 Top25”。

### 2. 玩家命名（首启必填）
- **首次进入或无名称时** → 弹出输入框（≤12 字符，过滤 `< > " ' &`）。
- **按钮**：`Save` / `Skip for now`（=Anonymous）。
- **设置面板**：可修改名称。

### 3. 我的本地成绩（Local Player Banner）
- **位置**：WORLD 表格上方。
- **展示字段**：`Name | Score | Level | Lines | Time`
- **口径**：显示**历史最佳**（Best-of-Player）。
- **更新时机**：游戏结束 / 修改名称后立即刷新。

### 4. 成绩上传（Google Form）
- **提交字段**：
  - `created_at_utc`
  - `player_id`（UUID）
  - `player_name`
  - `score` / `level` / `lines`
  - `duration_ms`
  - `client_version`
  - `client_nonce`（UUID，每局唯一）
- **失败处理**：重试 3 次，失败 → 存入 `pendingSubmissions`，下次补交。

### 5. 排行榜获取（gviz）
- **查询语句**：
  ```sql
  select player_name, score, level, lines, duration_ms, created_at_utc
  where score is not null
  order by score desc, level desc, lines desc, duration_ms asc, created_at_utc asc
  limit 25