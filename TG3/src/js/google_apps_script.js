/**
 * Google Apps Script - TETRIS WORLD API
 * 作为Google Sheets的中间层，解决CORS问题
 */

// 部署为Web应用后，设置访问权限为"Anyone"

function doGet(e) {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  try {
    const action = e.parameter.action || 'get_scores';
    
    switch(action) {
      case 'get_scores':
        return getScores(e, headers);
      case 'submit_score':
        return submitScore(e, headers);
      case 'get_player_rank':
        return getPlayerRank(e, headers);
      default:
        return createResponse({ error: 'Invalid action' }, 400, headers);
    }
    
  } catch (error) {
    return createResponse({ error: error.toString() }, 500, headers);
  }
}

function doPost(e) {
  // 处理POST请求（成绩提交）
  return doGet(e);
}

function doOptions(e) {
  // 处理预检请求
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
}

// 获取排行榜数据
function getScores(e, headers) {
  try {
    const limit = parseInt(e.parameter.limit) || 50;
    const sheet = SpreadsheetApp.openById('17Wu8sonn4kxHX3VWT1ZKPR3M-ZDSUWy8UeKG1SvdFoU');
    const worksheet = sheet.getSheetByName('scores_raw');
    
    if (!worksheet) {
      return createResponse({ error: 'Sheet not found' }, 404, headers);
    }
    
    const data = worksheet.getDataRange().getValues();
    const headers_row = data[0];
    
    // 跳过标题行，获取数据
    const scores = data.slice(1)
      .map(row => {
        return {
          player_name: row[0] || 'Anonymous',
          score: parseInt(row[1]) || 0,
          level: parseInt(row[2]) || 1,
          lines: parseInt(row[3]) || 0,
          duration_ms: parseInt(row[4]) || 0,
          created_at: row[5] || new Date().toISOString()
        };
      })
      .filter(score => score.score > 0) // 过滤有效分数
      .sort((a, b) => b.score - a.score) // 按分数降序
      .slice(0, limit); // 限制数量
    
    return createResponse({ scores: scores }, 200, headers);
    
  } catch (error) {
    return createResponse({ error: error.toString() }, 500, headers);
  }
}

// 提交成绩
function submitScore(e, headers) {
  try {
    const scoreData = {
      player_id: e.parameter.player_id || generateUUID(),
      player_name: e.parameter.player_name || 'Anonymous',
      score: parseInt(e.parameter.score) || 0,
      level: parseInt(e.parameter.level) || 1,
      lines: parseInt(e.parameter.lines) || 0,
      duration_ms: parseInt(e.parameter.duration_ms) || 0,
      client_version: e.parameter.client_version || 'v1.0.0',
      client_nonce: e.parameter.client_nonce || generateNonce()
    };
    
    // 验证数据
    if (scoreData.score <= 0) {
      return createResponse({ error: 'Invalid score' }, 400, headers);
    }
    
    const sheet = SpreadsheetApp.openById('17Wu8sonn4kxHX3VWT1ZKPR3M-ZDSUWy8UeKG1SvdFoU');
    const worksheet = sheet.getSheetByName('scores_raw');
    
    if (!worksheet) {
      return createResponse({ error: 'Sheet not found' }, 404, headers);
    }
    
    // 添加新行
    const newRow = [
      scoreData.player_id,
      scoreData.player_name,
      scoreData.score,
      scoreData.level,
      scoreData.lines,
      scoreData.duration_ms,
      scoreData.client_version,
      scoreData.client_nonce,
      new Date().toISOString()
    ];
    
    worksheet.appendRow(newRow);
    
    return createResponse({ 
      success: true, 
      message: 'Score submitted successfully',
      score_id: scoreData.player_id
    }, 200, headers);
    
  } catch (error) {
    return createResponse({ error: error.toString() }, 500, headers);
  }
}

// 获取玩家排名
function getPlayerRank(e, headers) {
  try {
    const score = parseInt(e.parameter.score) || 0;
    
    if (score <= 0) {
      return createResponse({ error: 'Invalid score' }, 400, headers);
    }
    
    const sheet = SpreadsheetApp.openById('17Wu8sonn4kxHX3VWT1ZKPR3M-ZDSUWy8UeKG1SvdFoU');
    const worksheet = sheet.getSheetByName('scores_raw');
    
    if (!worksheet) {
      return createResponse({ error: 'Sheet not found' }, 404, headers);
    }
    
    const data = worksheet.getDataRange().getValues();
    
    // 计算排名
    const higherScores = data.slice(1)
      .filter(row => parseInt(row[1]) > score)
      .length;
    
    const rank = higherScores + 1;
    
    return createResponse({ 
      rank: rank,
      total_players: data.length - 1
    }, 200, headers);
    
  } catch (error) {
    return createResponse({ error: error.toString() }, 500, headers);
  }
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 生成nonce
function generateNonce() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `nonce-${timestamp}-${random}`;
}

// 创建响应
function createResponse(data, statusCode, headers) {
  const response = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // 设置CORS头
  Object.keys(headers).forEach(key => {
    response.setHeader(key, headers[key]);
  });
  
  return response;
}
