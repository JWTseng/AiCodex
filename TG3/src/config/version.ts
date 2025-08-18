// 版本信息配置
export interface VersionInfo {
  version: string;
  codename?: string;
  releaseDate: string;
  features: VersionFeature[];
  improvements: string[];
  bugFixes: string[];
  breaking?: string[];
}

export interface VersionFeature {
  title: string;
  description: string;
  type: 'new' | 'improved' | 'experimental';
  icon?: string;
}

export const CURRENT_VERSION: VersionInfo = {
  version: '3.0.0',
  codename: 'Clean Architecture',
  releaseDate: '2025-08-18',
  features: [
    {
      title: '现代化架构重构',
      description: '采用 TypeScript + Vite 构建系统，模块化核心游戏逻辑',
      type: 'new',
      icon: '🏗️'
    },
    {
      title: '完整测试套件',
      description: '34个单元测试覆盖核心模块，确保代码质量',
      type: 'new',
      icon: '🧪'
    },
    {
      title: '高级连击系统',
      description: '3秒连击窗口，最高2倍分数乘数，支持压哨特效',
      type: 'improved',
      icon: '⚡'
    },
    {
      title: '7位数分数系统',
      description: '最高分数提升至9,999,999分，更具挑战性',
      type: 'improved',
      icon: '🎯'
    },
    {
      title: '全球排行榜',
      description: '实时云端排行榜，与全球玩家竞技',
      type: 'new',
      icon: '🌍'
    },
    {
      title: '多输入设备支持',
      description: '键盘、游戏手柄、触觉反馈全面支持',
      type: 'improved',
      icon: '🎮'
    },
    {
      title: '响应式设计',
      description: '完美适配桌面、平板、手机等多种设备',
      type: 'improved',
      icon: '📱'
    },
    {
      title: 'Beta功能预览',
      description: '添加?beta=1参数体验最新实验功能',
      type: 'experimental',
      icon: '🔬'
    }
  ],
  improvements: [
    '优化音频系统，减少延迟和卡顿',
    '改进iPad自动缩放，提升移动端体验',
    '增强玩家名称管理和Top50状态显示',
    '完善多语言本地化支持',
    '添加实时延迟监控和性能优化'
  ],
  bugFixes: [
    '修复音频在某些浏览器中失效的问题',
    '解决方块旋转时的边界检测错误',
    '修复连击计时器的同步问题',
    '优化分数提交的网络错误处理',
    '改进游戏状态的持久化存储'
  ],
  breaking: [
    '移除对旧版浏览器的支持（需要ES2020+）',
    '更新API接口，旧版本数据可能需要迁移'
  ]
};

export const VERSION_HISTORY: VersionInfo[] = [
  CURRENT_VERSION,
  {
    version: '2.1.0',
    releaseDate: '2025-06-15',
    features: [
      {
        title: '音频系统重构',
        description: '全新的音频管理系统，支持实时延迟调节',
        type: 'new',
        icon: '🔊'
      }
    ],
    improvements: [
      '提升游戏性能和稳定性',
      '优化用户界面响应速度'
    ],
    bugFixes: [
      '修复音频播放的内存泄漏',
      '解决高分保存的竞态条件'
    ]
  }
];