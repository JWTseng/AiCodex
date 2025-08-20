/**
 * TG3 Tetris World API - Google Apps Script
 * 简洁版本 - 专为TG3俄罗斯方块排行榜设计
 * 版本: v2.1.0
 */

// ===== 配置常量 =====
const CONFIG = {
  VERSION: 'v2.1.0',
  SHEET_ID: '1WH1_waEA6EDIGnzG6UE37mWqzKgrXS4FeuREhrS_dK8',
  SHEET_NAMES: ['Form Responses 1', '表单回复 1', '第 1 张表单回复', 'scores_raw', 'scores', 'Scores', 'Sheet1'], // 候选工作表名称
  MAX_RECORDS_PER_PLAYER: 3,
  DEFAULT_LIMIT: 50
};

// ===== 主要处理函数 =====

/**
 * 处理GET请求
 */
function doGet(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  try {
    // 安全检查：确保e和e.parameter存在
    if (!e || !e.parameter) {
      return createResponse({ 
        error: 'Missing request parameters',
        version: CONFIG.VERSION 
      }, headers);
    }
    
    const action = e.parameter.action || 'get_scores';
    
    // 路由处理
    switch(action) {
      case 'get_scores':
        return handleGetScores(e, headers);
      case 'submit_score':
        return handleSubmitScore(e, headers);
      case 'get_player_rank':
        return handleGetPlayerRank(e, headers);
      case 'confirm_submission':
        return handleConfirmSubmission(e, headers);
      case 'version':
        return createResponse({ version: CONFIG.VERSION, timestamp: new Date().toISOString() }, headers);
      default:
        return createResponse({ error: 'Invalid action: ' + action }, headers);
    }
  } catch (error) {
    console.error('API Error:', error);
    return createResponse({ error: error.toString() }, headers);
  }
}

/**
 * 处理POST请求
 */
function doPost(e) {
  return doGet(e);
}

/**
 * 处理OPTIONS预检请求
 */
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ===== 业务逻辑处理函数 =====

/**
 * 获取排行榜数据
 */
function handleGetScores(e, headers) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    
    // 调试模式
    if (params.test === 'version') {
      return createResponse({ version: CONFIG.VERSION, timestamp: new Date().toISOString() }, headers);
    }
    
    if (params.debug === '1') {
      const worksheet = getWorksheet();
      const data = worksheet.getDataRange().getValues();
      
      // 解析前几行数据来验证格式
      const sampleRecords = data.slice(1, 4).map(row => {
        try {
          return parseRowToRecord(row);
        } catch (e) {
          return { error: e.message, raw_row: row };
        }
      });
      
      return createResponse({ 
        debug: true,
        version: CONFIG.VERSION,
        sheet_id: CONFIG.SHEET_ID,
        sheet_name: worksheet.getName(),
        candidate_names: CONFIG.SHEET_NAMES,
        headers: data[0] || [],
        sample_rows: data.slice(1, 4),
        parsed_records: sampleRecords,
        total_rows: data.length - 1
      }, headers);
    }
    
    const limit = parseInt(params.limit) || CONFIG.DEFAULT_LIMIT;
    const scores = getTopScores(limit);
    
    return createResponse({ 
      version: CONFIG.VERSION,
      scores: scores,
      count: scores.length,
      timestamp: new Date().toISOString()
    }, headers);
    
  } catch (error) {
    console.error('GetScores Error:', error);
    return createResponse({ error: error.toString() }, headers);
  }
}

/**
 * 提交成绩
 */
function handleSubmitScore(e, headers) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const scoreData = parseScoreData(params);
    
    // 数据验证
    if (scoreData.score <= 0) {
      return createResponse({ error: 'Invalid score: must be greater than 0' }, headers);
    }
    if (!scoreData.player_name || scoreData.player_name.trim() === '') {
      return createResponse({ error: 'Invalid player name: cannot be empty' }, headers);
    }
    
    const worksheet = getWorksheet();
    
    // 检查幂等性 (防止重复提交)
    if (isSubmissionExists(worksheet, scoreData.player_id, scoreData.client_nonce)) {
      return createResponse({ 
        success: true, 
        message: 'Score already submitted',
        score_id: scoreData.player_id,
        duplicate: true
      }, headers);
    }
    
    // 提交新记录
    addScoreRecord(worksheet, scoreData);
    
    // 清理该玩家的多余记录
    cleanupPlayerRecords(worksheet, scoreData.player_name);
    
    return createResponse({ 
      success: true, 
      message: 'Score submitted successfully',
      score_id: scoreData.player_id,
      timestamp: new Date().toISOString()
    }, headers);
    
  } catch (error) {
    console.error('SubmitScore Error:', error);
    return createResponse({ error: error.toString() }, headers);
  }
}

/**
 * 获取玩家排名
 */
function handleGetPlayerRank(e, headers) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const score = parseInt(params.score) || 0;
    if (score <= 0) {
      return createResponse({ error: 'Invalid score' }, headers);
    }
    
    const worksheet = getWorksheet();
    const data = worksheet.getDataRange().getValues().slice(1); // 跳过表头
    
    const higherScores = data.filter(row => parseInt(row[3]) > score).length;
    const rank = higherScores + 1;
    
    return createResponse({ 
      rank: rank,
      total_players: data.length,
      score: score
    }, headers);
    
  } catch (error) {
    console.error('GetPlayerRank Error:', error);
    return createResponse({ error: error.toString() }, headers);
  }
}

/**
 * 确认提交状态
 */
function handleConfirmSubmission(e, headers) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const playerId = params.player_id || '';
    const clientNonce = params.client_nonce || '';
    
    if (!playerId || !clientNonce) {
      return createResponse({ 
        exists: false, 
        error: 'Missing player_id or client_nonce' 
      }, headers);
    }
    
    const worksheet = getWorksheet();
    const found = findSubmission(worksheet, playerId, clientNonce);
    
    if (found) {
      return createResponse({
        exists: true,
        player_id: found.player_id,
        player_name: found.player_name,
        score: found.score,
        level: found.level,
        lines: found.lines,
        duration_ms: found.duration_ms,
        created_at: found.created_at
      }, headers);
    }
    
    return createResponse({ exists: false }, headers);
    
  } catch (error) {
    console.error('ConfirmSubmission Error:', error);
    return createResponse({ exists: false, error: error.toString() }, headers);
  }
}

// ===== 数据操作函数 =====

/**
 * 获取工作表 - 自动发现可用的工作表
 */
function getWorksheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    
    // 尝试候选工作表名称
    for (const sheetName of CONFIG.SHEET_NAMES) {
      try {
        const worksheet = spreadsheet.getSheetByName(sheetName);
        if (worksheet) {
          console.log(`✅ 找到工作表: ${sheetName}`);
          return worksheet;
        }
      } catch (e) {
        continue; // 尝试下一个候选名称
      }
    }
    
    // 如果候选名称都不存在，尝试使用第一个工作表
    const allSheets = spreadsheet.getSheets();
    if (allSheets && allSheets.length > 0) {
      const firstSheet = allSheets[0];
      console.log(`⚠️ 使用第一个工作表: ${firstSheet.getName()}`);
      return firstSheet;
    }
    
    throw new Error('No worksheets found in spreadsheet');
    
  } catch (error) {
    throw new Error(`Failed to open worksheet: ${error.message}`);
  }
}

/**
 * 获取排行榜数据
 */
function getTopScores(limit = CONFIG.DEFAULT_LIMIT) {
  const worksheet = getWorksheet();
  const data = worksheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return []; // 只有表头或空表
  }
  
  // 转换原始数据为记录对象
  const records = data.slice(1)
    .map(row => parseRowToRecord(row))
    .filter(record => record.score > 0);
  
  // 按玩家去重，保留每人最高分
  const topScores = deduplicateByPlayer(records);
  
  // 排序并截取前N条
  return topScores
    .sort(compareScores)
    .slice(0, limit)
    .map(formatScoreForAPI);
}

/**
 * 解析行数据为记录对象
 */
function parseRowToRecord(row) {
  // 数据验证和修正
  const validatedRow = validateAndFixRowData(row);
  
  return {
    created_at: validatedRow[0] || new Date().toISOString(),
    player_id: String(validatedRow[1] || ''),
    player_name: String(validatedRow[2] || 'Anonymous'),
    score: parseInt(validatedRow[3]) || 0,
    level: parseInt(validatedRow[4]) || 1,
    lines: parseInt(validatedRow[5]) || 0,
    duration_ms: parseInt(validatedRow[6]) || 0, // 如果数据中没有duration列，默认为0
    client_version: String(validatedRow[7] || ''),
    client_nonce: String(validatedRow[8] || '')
  };
}

/**
 * 验证和修正行数据
 */
function validateAndFixRowData(row) {
  const fixedRow = [...row];
  
  // 确保有足够的列
  while (fixedRow.length < 9) {
    fixedRow.push('');
  }
  
  // 验证时间戳格式
  if (fixedRow[0] && typeof fixedRow[0] === 'string') {
    // 如果是ISO格式的时间戳，保持不变
    if (!fixedRow[0].includes('T')) {
      // 尝试转换其他格式的时间戳
      try {
        const date = new Date(fixedRow[0]);
        if (!isNaN(date.getTime())) {
          fixedRow[0] = date.toISOString();
        }
      } catch (e) {
        // 转换失败，使用当前时间
        fixedRow[0] = new Date().toISOString();
      }
    }
  }
  
  // 验证分数数据
  if (fixedRow[3] && (isNaN(parseInt(fixedRow[3])) || parseInt(fixedRow[3]) < 0)) {
    fixedRow[3] = 0;
  }
  
  if (fixedRow[4] && (isNaN(parseInt(fixedRow[4])) || parseInt(fixedRow[4]) < 1)) {
    fixedRow[4] = 1;
  }
  
  if (fixedRow[5] && (isNaN(parseInt(fixedRow[5])) || parseInt(fixedRow[5]) < 0)) {
    fixedRow[5] = 0;
  }
  
  if (fixedRow[6] && (isNaN(parseInt(fixedRow[6])) || parseInt(fixedRow[6]) < 0)) {
    fixedRow[6] = 0;
  }
  
  return fixedRow;
}

/**
 * 按玩家去重，保留最高分
 */
function deduplicateByPlayer(records) {
  const playerMap = new Map();
  
  records.forEach(record => {
    // 安全的字符串处理
    const playerName = String(record.player_name || '').trim().toLowerCase();
    if (!playerName || playerName === 'anonymous') {
      return; // 跳过匿名或空名称
    }
    
    const existing = playerMap.get(playerName);
    
    if (!existing || shouldReplaceRecord(record, existing)) {
      playerMap.set(playerName, record);
    }
  });
  
  return Array.from(playerMap.values());
}

/**
 * 判断是否应该替换现有记录
 */
function shouldReplaceRecord(newRecord, existingRecord) {
  // 分数优先
  if (newRecord.score > existingRecord.score) return true;
  if (newRecord.score < existingRecord.score) return false;
  
  // 同分数时，等级优先
  if (newRecord.level > existingRecord.level) return true;
  if (newRecord.level < existingRecord.level) return false;
  
  // 同分数同等级时，时间优先（较新优先）
  return newRecord.created_at > existingRecord.created_at;
}

/**
 * 比较分数用于排序
 */
function compareScores(a, b) {
  // 分数降序
  if (b.score !== a.score) return b.score - a.score;
  // 等级降序
  if (b.level !== a.level) return b.level - a.level;
  // 时间降序（较新优先）
  return new Date(b.created_at) - new Date(a.created_at);
}

/**
 * 格式化记录为API返回格式
 */
function formatScoreForAPI(record) {
  return {
    player_name: record.player_name,
    score: record.score,
    level: record.level,
    lines: record.lines,
    duration_ms: record.duration_ms
  };
}

/**
 * 解析请求参数为成绩数据
 */
function parseScoreData(params) {
  return {
    player_id: params.player_id || generateUUID(),
    player_name: (params.player_name || 'Anonymous').trim(),
    score: parseInt(params.score) || 0,
    level: parseInt(params.level) || 1,
    lines: parseInt(params.lines) || 0,
    duration_ms: parseInt(params.duration_ms) || 0,
    client_version: params.client_version || 'v1.0.0',
    client_nonce: params.client_nonce || generateNonce()
  };
}

/**
 * 检查提交是否已存在（幂等性）
 */
function isSubmissionExists(worksheet, playerId, clientNonce) {
  const data = worksheet.getDataRange().getValues().slice(1);
  return data.some(row => 
    String(row[1]) === String(playerId) && // Player ID 列
    String(row[8]) === String(clientNonce) // Client Nonce 列
  );
}

/**
 * 添加成绩记录
 */
function addScoreRecord(worksheet, scoreData) {
  const newRow = [
    new Date().toISOString(),           // 时间戳记
    scoreData.player_id,                // Player ID
    scoreData.player_name,              // Player Name
    scoreData.score,                    // Score
    scoreData.level,                    // Level
    scoreData.lines,                    // Lines
    scoreData.duration_ms,              // Duration (ms)
    scoreData.client_version,           // Client Version
    scoreData.client_nonce              // Client Nonce
  ];
  
  worksheet.appendRow(newRow);
}

/**
 * 清理玩家多余记录
 */
function cleanupPlayerRecords(worksheet, playerName) {
  try {
    const lock = LockService.getDocumentLock();
    lock.waitLock(8000);
    
    const data = worksheet.getDataRange().getValues();
    const playerRecords = [];
    
    // 找出该玩家的所有记录
    for (let i = 1; i < data.length; i++) {
      const record = parseRowToRecord(data[i]);
      const recordPlayerName = String(record.player_name || '').trim().toLowerCase();
      const targetPlayerName = String(playerName || '').trim().toLowerCase();
      
      if (recordPlayerName && targetPlayerName && recordPlayerName === targetPlayerName) {
        playerRecords.push({ record, rowIndex: i + 1 });
      }
    }
    
    // 如果记录数超过限制，删除多余的
    if (playerRecords.length > CONFIG.MAX_RECORDS_PER_PLAYER) {
      // 按照分数、等级、时间排序，保留前N条
      playerRecords.sort((a, b) => compareScores(a.record, b.record));
      
      const toDelete = playerRecords.slice(CONFIG.MAX_RECORDS_PER_PLAYER);
      
      // 倒序删除，避免行号偏移
      toDelete
        .sort((a, b) => b.rowIndex - a.rowIndex)
        .forEach(item => worksheet.deleteRow(item.rowIndex));
    }
    
    lock.releaseLock();
  } catch (error) {
    console.error('Cleanup Error:', error);
    // 清理失败不影响主流程
  }
}

/**
 * 查找提交记录
 */
function findSubmission(worksheet, playerId, clientNonce) {
  const data = worksheet.getDataRange().getValues().slice(1);
  const found = data.find(row => 
    String(row[1]) === String(playerId) && // Player ID 列
    String(row[8]) === String(clientNonce) // Client Nonce 列
  );
  
  return found ? parseRowToRecord(found) : null;
}

// ===== 数据迁移工具 =====

/**
 * 数据迁移：为缺少Duration列的数据添加默认值
 * 注意：此函数需要手动调用，不会自动执行
 */
function migrateDataAddDurationColumn() {
  try {
    const worksheet = getWorksheet();
    const data = worksheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log('No data to migrate');
      return;
    }
    
    const headers = data[0];
    const hasDurationColumn = headers.length >= 7 && headers[6] && headers[6].toString().toLowerCase().includes('duration');
    
    if (hasDurationColumn) {
      console.log('Duration column already exists');
      return;
    }
    
    // 在Client Version列之前插入Duration列
    const newData = data.map((row, index) => {
      if (index === 0) {
        // 表头行
        const newRow = [...row];
        newRow.splice(6, 0, 'Duration (ms)');
        return newRow;
      } else {
        // 数据行
        const newRow = [...row];
        newRow.splice(6, 0, 0); // 默认duration为0
        return newRow;
      }
    });
    
    // 清空工作表并重新写入数据
    worksheet.clear();
    worksheet.getRange(1, 1, newData.length, newData[0].length).setValues(newData);
    
    console.log(`Migration completed: Added Duration column to ${newData.length - 1} records`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// ===== 工具函数 =====

/**
 * 生成UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成随机nonce
 */
function generateNonce() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `nonce-${timestamp}-${random}`;
}

/**
 * 创建API响应
 */
function createResponse(data, headers) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== 测试函数 =====

/**
 * 发现并列出所有工作表 - 调试用
 */
function discoverWorksheets() {
  console.log('=== 工作表发现 ===');
  console.log('Sheet ID:', CONFIG.SHEET_ID);
  console.log('候选名称:', CONFIG.SHEET_NAMES);
  
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const allSheets = spreadsheet.getSheets();
    
    console.log('🔍 所有可用的工作表:');
    allSheets.forEach((sheet, index) => {
      console.log(`  ${index + 1}. "${sheet.getName()}"`);
    });
    
    // 检查候选名称
    console.log('🎯 检查候选名称:');
    CONFIG.SHEET_NAMES.forEach(name => {
      try {
        const sheet = spreadsheet.getSheetByName(name);
        if (sheet) {
          console.log(`  ✅ "${name}" - 找到`);
        } else {
          console.log(`  ❌ "${name}" - 未找到`);
        }
      } catch (e) {
        console.log(`  ❌ "${name}" - 错误: ${e.message}`);
      }
    });
    
    return allSheets.map(s => s.getName());
    
  } catch (error) {
    console.error('❌ 发现失败:', error);
    return [];
  }
}

/**
 * 简单测试函数 - 在Google Apps Script编辑器中运行
 */
function testScript() {
  console.log('=== TG3 API Script Test ===');
  console.log('Version:', CONFIG.VERSION);
  console.log('Sheet ID:', CONFIG.SHEET_ID);
  
  try {
    // 首先发现工作表
    const sheetNames = discoverWorksheets();
    
    // 测试工作表连接
    const worksheet = getWorksheet();
    console.log('✅ Worksheet connection successful');
    console.log('Using worksheet:', worksheet.getName());
    
    // 测试数据读取
    const data = worksheet.getDataRange().getValues();
    console.log('✅ Data read successful');
    console.log('Total rows:', data.length);
    console.log('Headers:', data[0]);
    
    // 测试获取分数
    const scores = getTopScores(5);
    console.log('✅ Get scores successful');
    console.log('Top 5 scores:', scores);
    
    console.log('=== Test completed successfully ===');
    return { success: true, sheetNames, worksheet: worksheet.getName() };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}