// Global configuration for TETRIS WORLD frontend
// Centralize service endpoints to avoid scattering URLs across modules

// 导入新的配置系统
import { config } from '../config/environment.js';

// 向后兼容的全局配置
window.TW_CONFIG = {
    API_URL: config.api.baseUrl,
    MAX_SCORE: config.game.maxScore,
    DEBUG: config.features.debug,
    
    // 保留原有配置
    ...config
};


