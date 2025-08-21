/**
 * 🚀 TG3 榜单数据修复 - Google Apps Script 更新版本
 * 
 * 请将此代码复制到您的 Google Apps Script 项目中替换现有代码
 * 
 * 主要修复：
 * 1. MAX_RECORDS_PER_PLAYER 改为 1（每人只保留1条最高分记录）
 * 2. 统一表格ID配置
 * 3. 增强去重和清理逻辑
 * 4. 改进错误处理和日志记录
 */

// ===== 配置常量 =====
const CONFIG = {
  VERSION: 'v2.2.0-FIXED',
  SHEET_ID: '17Wu8sonn4kxHX3VWT1ZKPR3M-ZDSUWy8UeKG1SvdFoU', // 🔧 统一使用主表格ID
  SHEET_NAMES: ['Form Responses 1', '表单回复 1', '第 1 张表单回复', 'scores_raw', 'scores', 'Scores', 'Sheet1'],
  MAX_RECORDS_PER_PLAYER: 1, // 🔧 修改为1，解决重复数据问题
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
    if (!e || !e.parameter) {
      return createResponse({ 
        error: 'Missing request parameters',
        version: CONFIG.VERSION 
      }, headers);
    }
    
    const action = e.parameter.action || 'get_scores';
    
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
      case 'cleanup_duplicates':
        return handleCleanupDuplicates(e, headers); // 🆕 新增手动清理功能
      default:
        return createResponse({ error: 'Invalid action: ' + action }, headers);
    }
  } catch (error) {
    console.error('API Error:', error);
    return createResponse({ error: error.toString() }, headers);
  }
}

function doPost(e) {
  return doGet(e);
}

// ===== 业务逻辑处理函数 =====

/**
 * 获取排行榜数据
 */
function handleGetScores(e, headers) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    
    if (params.debug === '1') {
      const worksheet = getWorksheet();
      const data = worksheet.getDataRange().getValues();
      
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
        headers: data[0] || [],
        sample_rows: data.slice(1, 4),
        parsed_records: sampleRecords,
        total_rows: data.length - 1
      }, headers);
    }
    
    const limit = parseInt(params.limit) || CONFIG.DEFAULT_LIMIT;
    const scores = getTopScores(limit);
    
    return createResponse({ 
      scores: scores,
      total: scores.length,
      version: CONFIG.VERSION,
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
    
    // 🔧 检查幂等性 (防止重复提交)
    if (isSubmissionExists(worksheet, scoreData.player_id, scoreData.client_nonce)) {
      console.log('Duplicate submission detected:', scoreData.player_id, scoreData.client_nonce);
      return createResponse({ 
        success: true, 
        message: 'Score already submitted',
        score_id: scoreData.player_id,
        duplicate: true
      }, headers);
    }
    
    // 提交新记录
    addScoreRecord(worksheet, scoreData);
    
    // 🔧 清理该玩家的多余记录（现在只保留1条）
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
    const data = worksheet.getDataRange().getValues().slice(1);
    
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
        timestamp: found.created_at
      }, headers);
    } else {
      return createResponse({ exists: false }, headers);
    }
    
  } catch (error) {
    console.error('ConfirmSubmission Error:', error);
    return createResponse({ exists: false, error: error.toString() }, headers);
  }
}

/**
 * 🆕 手动清理重复数据
 */
function handleCleanupDuplicates(e, headers) {
  try {
    const worksheet = getWorksheet();
    const data = worksheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createResponse({ 
        message: 'No data to cleanup',
        cleaned: 0
      }, headers);
    }
    
    // 统计每个玩家的记录数
    const playerRecords = new Map();
    for (let i = 1; i < data.length; i++) {
      const record = parseRowToRecord(data[i]);
      const playerName = String(record.player_name || '').trim().toLowerCase();
      
      if (!playerName) continue;
      
      if (!playerRecords.has(playerName)) {
        playerRecords.set(playerName, []);
      }
      playerRecords.get(playerName).push({ record, rowIndex: i + 1 });
    }
    
    let totalCleaned = 0;
    
    // 清理每个玩家的重复记录
    for (const [playerName, records] of playerRecords) {
      if (records.length > CONFIG.MAX_RECORDS_PER_PLAYER) {
        // 按照分数排序，保留最高分
        records.sort((a, b) => compareScores(a.record, b.record));
        
        const toDelete = records.slice(CONFIG.MAX_RECORDS_PER_PLAYER);
        
        // 倒序删除，避免行号偏移
        toDelete
          .sort((a, b) => b.rowIndex - a.rowIndex)
          .forEach(item => {
            worksheet.deleteRow(item.rowIndex);
            totalCleaned++;
          });
        
        console.log(`Cleaned ${toDelete.length} duplicate records for player: ${playerName}`);
      }
    }
    
    return createResponse({ 
      message: `Cleanup completed`,
      players_processed: playerRecords.size,
      records_cleaned: totalCleaned
    }, headers);
    
  } catch (error) {
    console.error('CleanupDuplicates Error:', error);
    return createResponse({ error: error.toString() }, headers);
  }
}

// ===== 数据操作函数 =====

function getWorksheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    
    for (const sheetName of CONFIG.SHEET_NAMES) {
      try {
        const worksheet = spreadsheet.getSheetByName(sheetName);
        if (worksheet) {
          console.log(`✅ 找到工作表: ${sheetName}`);
          return worksheet;
        }
      } catch (e) {
        // 继续尝试下一个名称
      }
    }
    
    throw new Error('未找到有效的工作表');
  } catch (error) {
    console.error('获取工作表失败:', error);
    throw error;
  }
}

function getTopScores(limit = CONFIG.DEFAULT_LIMIT) {
  const worksheet = getWorksheet();
  const data = worksheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return [];
  }
  
  const records = data.slice(1)
    .map(row => parseRowToRecord(row))
    .filter(record => record.score > 0);
  
  // 🔧 按玩家去重，保留每人最高分
  const topScores = deduplicateByPlayer(records);
  
  return topScores
    .sort(compareScores)
    .slice(0, limit)
    .map(formatScoreForAPI);
}

function parseRowToRecord(row) {
  const validatedRow = validateAndFixRowData(row);
  
  return {
    created_at: validatedRow[0] || new Date().toISOString(),
    player_id: String(validatedRow[1] || ''),
    player_name: String(validatedRow[2] || 'Anonymous'),
    score: parseInt(validatedRow[3]) || 0,
    level: parseInt(validatedRow[4]) || 1,
    lines: parseInt(validatedRow[5]) || 0,
    duration_ms: parseInt(validatedRow[6]) || 0,
    client_version: String(validatedRow[7] || ''),
    client_nonce: String(validatedRow[8] || '')
  };
}

function validateAndFixRowData(row) {
  const fixedRow = [...row];
  
  while (fixedRow.length < 9) {
    fixedRow.push('');
  }
  
  return fixedRow;
}

/**
 * 🔧 按玩家去重，保留最高分
 */
function deduplicateByPlayer(records) {
  const playerMap = new Map();
  
  records.forEach(record => {
    const playerName = String(record.player_name || '').trim().toLowerCase();
    if (!playerName || playerName === 'anonymous') {
      return;
    }
    
    const existing = playerMap.get(playerName);
    
    if (!existing || shouldReplaceRecord(record, existing)) {
      playerMap.set(playerName, record);
    }
  });
  
  return Array.from(playerMap.values());
}

function shouldReplaceRecord(newRecord, existing) {
  if (newRecord.score > existing.score) return true;
  if (newRecord.score === existing.score && newRecord.level > existing.level) return true;
  if (newRecord.score === existing.score && newRecord.level === existing.level) {
    return new Date(newRecord.created_at) > new Date(existing.created_at);
  }
  return false;
}

function compareScores(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.level !== a.level) return b.level - a.level;
  return new Date(b.created_at) - new Date(a.created_at);
}

function formatScoreForAPI(record) {
  return {
    player_name: record.player_name,
    score: record.score,
    level: record.level,
    lines: record.lines,
    duration: record.duration_ms,
    timestamp: record.created_at
  };
}

function parseScoreData(params) {
  return {
    player_id: params.player_id || generateUUID(),
    player_name: params.player_name || 'Anonymous',
    score: parseInt(params.score) || 0,
    level: parseInt(params.level) || 1,
    lines: parseInt(params.lines) || 0,
    duration_ms: parseInt(params.duration_ms) || 0,
    client_version: params.client_version || 'v1.0.0',
    client_nonce: params.client_nonce || generateNonce()
  };
}

function isSubmissionExists(worksheet, playerId, clientNonce) {
  const data = worksheet.getDataRange().getValues().slice(1);
  return data.some(row => 
    String(row[1]) === String(playerId) && 
    String(row[8]) === String(clientNonce)
  );
}

function addScoreRecord(worksheet, scoreData) {
  const newRow = [
    new Date().toISOString(),
    scoreData.player_id,
    scoreData.player_name,
    scoreData.score,
    scoreData.level,
    scoreData.lines,
    scoreData.duration_ms,
    scoreData.client_version,
    scoreData.client_nonce
  ];
  
  worksheet.appendRow(newRow);
}

/**
 * 🔧 清理玩家多余记录（现在只保留1条最高分）
 */
function cleanupPlayerRecords(worksheet, playerName) {
  try {
    const lock = LockService.getDocumentLock();
    lock.waitLock(8000);
    
    const data = worksheet.getDataRange().getValues();
    const playerRecords = [];
    
    for (let i = 1; i < data.length; i++) {
      const record = parseRowToRecord(data[i]);
      const recordPlayerName = String(record.player_name || '').trim().toLowerCase();
      const targetPlayerName = String(playerName || '').trim().toLowerCase();
      
      if (recordPlayerName && targetPlayerName && recordPlayerName === targetPlayerName) {
        playerRecords.push({ record, rowIndex: i + 1 });
      }
    }
    
    // 🔧 如果记录数超过限制，删除多余的（现在只保留1条最高分）
    if (playerRecords.length > CONFIG.MAX_RECORDS_PER_PLAYER) {
      playerRecords.sort((a, b) => compareScores(a.record, b.record));
      
      const toDelete = playerRecords.slice(CONFIG.MAX_RECORDS_PER_PLAYER);
      console.log(`清理玩家 ${playerName} 的多余记录: ${toDelete.length} 条`);
      
      toDelete
        .sort((a, b) => b.rowIndex - a.rowIndex)
        .forEach(item => worksheet.deleteRow(item.rowIndex));
    }
    
    lock.releaseLock();
  } catch (error) {
    console.error('Cleanup Error:', error);
  }
}

function findSubmission(worksheet, playerId, clientNonce) {
  const data = worksheet.getDataRange().getValues().slice(1);
  const found = data.find(row => 
    String(row[1]) === String(playerId) && 
    String(row[8]) === String(clientNonce)
  );
  
  return found ? parseRowToRecord(found) : null;
}

// ===== 工具函数 =====

function createResponse(data, headers) {
  const response = ContentService.createTextOutput(JSON.stringify(data));
  response.setMimeType(ContentService.MimeType.JSON);
  
  if (headers) {
    Object.keys(headers).forEach(key => {
      response.setHeader(key, headers[key]);
    });
  }
  
  return response;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateNonce() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `nonce-${timestamp}-${random}`;
}

/**
 * 🧪 测试函数 - 在 Google Apps Script 编辑器中运行此函数来测试
 */
function testScript() {
  console.log('=== TG3 API Script Test ===');
  console.log('Version:', CONFIG.VERSION);
  console.log('Sheet ID:', CONFIG.SHEET_ID);
  console.log('Max Records Per Player:', CONFIG.MAX_RECORDS_PER_PLAYER);
  
  try {
    const worksheet = getWorksheet();
    console.log('✅ Worksheet connection successful');
    console.log('Using worksheet:', worksheet.getName());
    
    const data = worksheet.getDataRange().getValues();
    console.log('✅ Data read successful');
    console.log('Total rows:', data.length);
    console.log('Headers:', data[0]);
    
    const scores = getTopScores(10);
    console.log('✅ Get scores successful');
    console.log('Top 10 scores:', scores);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}