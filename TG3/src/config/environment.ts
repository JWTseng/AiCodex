// 环境配置管理
export interface AppConfig {
  api: {
    baseUrl: string;
  };
  game: {
    maxScore: number;
    maxLevel: number;
    comboWindow: number;
  };
  audio: {
    defaultMasterVolume: number;
    defaultMusicVolume: number;
    defaultSfxVolume: number;
  };
  features: {
    analytics: boolean;
    debug: boolean;
    betaFeatures: boolean;
  };
  dev: {
    port: number;
    host: string;
  };
}

const defaultConfig: AppConfig = {
  api: {
    baseUrl: 'https://script.google.com/macros/s/AKfycbw9oCs3E9iPT2u2IukGvg_36MHjcjYxtdqaYGzd4zv0NNU9VrllIpiBqF5u6_I0bwE/exec'
  },
  game: {
    maxScore: 9999999,
    maxLevel: 29,
    comboWindow: 3000
  },
  audio: {
    defaultMasterVolume: 0.3,
    defaultMusicVolume: 0.3,
    defaultSfxVolume: 0.8
  },
  features: {
    analytics: false,
    debug: false,
    betaFeatures: false
  },
  dev: {
    port: 3000,
    host: 'localhost'
  }
};

function getEnvVar(key: string, fallback: string): string {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key] ?? fallback;
  }
  // Fallback for non-Vite environments
  return fallback;
}

function getEnvNumber(key: string, fallback: number): number {
  const value = getEnvVar(key, String(fallback));
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

function getEnvBoolean(key: string, fallback: boolean): boolean {
  const value = getEnvVar(key, String(fallback));
  return value.toLowerCase() === 'true';
}

export const config: AppConfig = {
  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL', defaultConfig.api.baseUrl)
  },
  game: {
    maxScore: getEnvNumber('VITE_MAX_SCORE', defaultConfig.game.maxScore),
    maxLevel: getEnvNumber('VITE_MAX_LEVEL', defaultConfig.game.maxLevel),
    comboWindow: getEnvNumber('VITE_COMBO_WINDOW', defaultConfig.game.comboWindow)
  },
  audio: {
    defaultMasterVolume: getEnvNumber('VITE_DEFAULT_MASTER_VOLUME', defaultConfig.audio.defaultMasterVolume),
    defaultMusicVolume: getEnvNumber('VITE_DEFAULT_MUSIC_VOLUME', defaultConfig.audio.defaultMusicVolume),
    defaultSfxVolume: getEnvNumber('VITE_DEFAULT_SFX_VOLUME', defaultConfig.audio.defaultSfxVolume)
  },
  features: {
    analytics: getEnvBoolean('VITE_ENABLE_ANALYTICS', defaultConfig.features.analytics),
    debug: getEnvBoolean('VITE_ENABLE_DEBUG', defaultConfig.features.debug),
    betaFeatures: getEnvBoolean('VITE_ENABLE_BETA_FEATURES', defaultConfig.features.betaFeatures)
  },
  dev: {
    port: getEnvNumber('VITE_DEV_PORT', defaultConfig.dev.port),
    host: getEnvVar('VITE_DEV_HOST', defaultConfig.dev.host)
  }
};

// 开发环境检测
export const isDevelopment = getEnvVar('NODE_ENV', 'production') === 'development';
export const isProduction = !isDevelopment;

// 调试日志
if (config.features.debug) {
  console.log('🔧 App Configuration:', config);
  console.log('🏗️ Environment:', isDevelopment ? 'Development' : 'Production');
}