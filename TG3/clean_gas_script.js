function doGet(e) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  try {
    var action = 'get_scores';
    if (e && e.parameter && e.parameter.action) {
      action = e.parameter.action;
    }
    
    if (action === 'get_scores') {
      return getScores(e, headers);
    } else if (action === 'version') {
      return createResponse({version: 'v2.1.0', timestamp: new Date()}, headers);
    } else {
      return createResponse({error: 'Invalid action'}, headers);
    }
  } catch (error) {
    return createResponse({error: error.toString()}, headers);
  }
}

function getScores(e, headers) {
  try {
    var SHEET_ID = '1WH1_waEA6EDIGnzG6UE37mWqzKgrXS4FeuREhrS_dK8';
    
    // 检查调试模式
    if (e && e.parameter && e.parameter.debug === '1') {
      return debugMode(SHEET_ID, headers);
    }
    
    // 获取数据
    var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    var worksheet = findWorksheet(spreadsheet);
    var data = worksheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createResponse({scores: [], count: 0}, headers);
    }
    
    // 处理数据
    var records = processData(data);
    var limit = 50;
    if (e && e.parameter && e.parameter.limit) {
      limit = parseInt(e.parameter.limit) || 50;
    }
    
    var result = records.slice(0, limit);
    
    return createResponse({
      scores: result,
      count: result.length,
      version: 'v2.1.0',
      timestamp: new Date()
    }, headers);
    
  } catch (error) {
    return createResponse({error: error.toString()}, headers);
  }
}

function findWorksheet(spreadsheet) {
  var names = ['Form Responses 1', 'Sheet1', 'scores'];
  
  for (var i = 0; i < names.length; i++) {
    try {
      var sheet = spreadsheet.getSheetByName(names[i]);
      if (sheet) {
        return sheet;
      }
    } catch (e) {
      continue;
    }
  }
  
  var sheets = spreadsheet.getSheets();
  if (sheets.length > 0) {
    return sheets[0];
  }
  
  throw new Error('No worksheet found');
}

function processData(data) {
  var records = [];
  var playerMap = {};
  
  // 跳过表头，从第二行开始
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var record = parseRow(row);
    
    if (!record || !record.player_name || record.score <= 0) {
      continue;
    }
    
    var key = record.player_name.toLowerCase();
    var existing = playerMap[key];
    
    if (!existing || record.score > existing.score) {
      playerMap[key] = record;
    }
  }
  
  // 转换为数组并排序
  for (var playerName in playerMap) {
    records.push(playerMap[playerName]);
  }
  
  records.sort(function(a, b) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    return 0;
  });
  
  return records;
}

function parseRow(row) {
  if (!row || row.length < 4) {
    return null;
  }
  
  var playerName = '';
  var score = 0;
  var level = 1;
  var lines = 0;
  var duration = 0;
  
  // 根据列位置解析数据
  if (row[2]) {
    playerName = String(row[2]).trim();
  }
  
  if (row[3]) {
    score = parseInt(row[3]) || 0;
  }
  
  if (row[4]) {
    level = parseInt(row[4]) || 1;
  }
  
  if (row[5]) {
    lines = parseInt(row[5]) || 0;
  }
  
  if (row[6]) {
    duration = parseInt(row[6]) || 0;
  }
  
  if (!playerName || playerName === 'Anonymous' || score <= 0) {
    return null;
  }
  
  return {
    player_name: playerName,
    score: score,
    level: level,
    lines: lines,
    duration_ms: duration
  };
}

function debugMode(sheetId, headers) {
  try {
    var spreadsheet = SpreadsheetApp.openById(sheetId);
    var worksheet = findWorksheet(spreadsheet);
    var data = worksheet.getDataRange().getValues();
    
    return createResponse({
      debug: true,
      sheet_name: worksheet.getName(),
      total_rows: data.length,
      headers: data.length > 0 ? data[0] : [],
      sample_rows: data.slice(1, 4),
      version: 'v2.1.0'
    }, headers);
    
  } catch (error) {
    return createResponse({debug: true, error: error.toString()}, headers);
  }
}

function createResponse(data, headers) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function testFunction() {
  try {
    var result = doGet({parameter: {action: 'get_scores', limit: '5'}});
    Logger.log('Test successful');
    return 'Test passed';
  } catch (error) {
    Logger.log('Test failed: ' + error.toString());
    return 'Test failed: ' + error.toString();
  }
}