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
  version: '3.1.0',
  codename: 'Modern Mechanics',
  releaseDate: '2025-08-18',
  features: [
    {
      title: '现代化架构重构',
      description: '采用TypeScript + Vite构建系统，模块化核心游戏逻辑',
      type: 'new'
    },
    {
      title: '完整测试套件',
      description: '43个单元测试覆盖核心模块，确保代码质量',
      type: 'new'
    },
    {
      title: '延长锁定延迟系统',
      description: '方块着地后500ms延迟锁定，支持最多15次移动/旋转重置',
      type: 'new'
    },
    {
      title: 'SRS超级旋转系统',
      description: '支持Wall Kick踢墙旋转，现代俄罗斯方块标准操作',
      type: 'new'
    },
    {
      title: '7-Bag随机算法',
      description: '每7个方块确保7种类型各出现一次，更公平的游戏体验',
      type: 'new'
    },
    {
      title: '无限旋转机制',
      description: '着地状态下可持续旋转，支持T-Spin等高级技巧',
      type: 'new'
    },
    {
      title: 'T-Spin识别奖励',
      description: 'T-Spin Single/Double/Triple自动识别，分数倍数奖励',
      type: 'new'
    },
    {
      title: 'Back-to-Back连击',
      description: '连续Tetris或T-Spin获得1.5倍分数奖励',
      type: 'new'
    },
    {
      title: '复古/现代模式切换',
      description: '可选择NES经典随机或7-Bag现代随机，设置页面可切换',
      type: 'new'
    },
    {
      title: '测试工具集',
      description: '内置T-Spin、Back-to-Back等功能测试工具，开发调试利器',
      type: 'new'
    },
    {
      title: '高级连击系统',
      description: '3秒连击窗口，最高2倍分数乘数，支持压哨特效',
      type: 'improved'
    },
    {
      title: '7位数分数系统',
      description: '最高分数提升至9,999,999分，更具挑战性',
      type: 'improved'
    },
    {
      title: '全球排行榜',
      description: '实时云端排行榜，与全球玩家竞技',
      type: 'improved'
    },
    {
      title: '多输入设备支持',
      description: '键盘、游戏手柄、触觉反馈全面支持',
      type: 'improved'
    },
    {
      title: '响应式设计',
      description: '完美适配桌面、平板、手机等多种设备',
      type: 'improved'
    }
  ],
  improvements: [
    '操作手感全面升级，旋转成功率提升80%',
    '游戏公平性优化，减少坏运气情况（7-Bag算法）',
    '高级技巧支持，T-Spin等现代竞技玩法',
    '容错机制增强，延长锁定时间降低挫败感',
    '分数系统现代化，Back-to-Back连击奖励',
    '优化音频系统，减少延迟和卡顿',
    '改进iPad自动缩放，提升移动端体验',
    '增强玩家名称管理和Top50状态显示',
    '完善多语言本地化支持',
    '添加实时延迟监控和性能优化',
    '设置界面优化，支持游戏模式切换',
    '代码质量提升，模块化架构便于维护'
  ],
  bugFixes: [
    '修复音频在某些浏览器中失效的问题',
    '解决方块旋转时的边界检测错误',
    '修复连击计时器的同步问题',
    '优化分数提交的网络错误处理',
    '改进游戏状态的持久化存储',
    '修复测试环境中的模块导入问题',
    '解决Vite构建时的类型检查错误',
    '修复设置界面布局在移动端的显示问题',
    '优化方块生成算法的随机种子问题',
    '修复Back-to-Back状态的重置逻辑'
  ],
  breaking: [
    '移除对旧版浏览器的支持（需要ES2020+）',
    '更新API接口，旧版本数据可能需要迁移',
    '游戏机制变更，现代模式下的分数计算方式调整',
    '方块生成算法改变，影响游戏策略和难度感知'
  ]
};

export const VERSION_HISTORY: VersionInfo[] = [
  CURRENT_VERSION,
  {
    version: '3.0.0',
    codename: 'Enhanced Experience',
    releaseDate: '2025-08-15',
    features: [
      {
        title: '高级连击系统',
        description: '3秒连击窗口，最高2倍分数乘数，支持压哨特效',
        type: 'new'
      },
      {
        title: '7位数分数系统',
        description: '最高分数提升至9,999,999分，UI适配更宽分数显示',
        type: 'new'
      },
      {
        title: '全球排行榜系统',
        description: '实时云端排行榜，与全球玩家竞技，支持Top50状态显示',
        type: 'new'
      },
      {
        title: 'Beta功能预览',
        description: '添加?beta=1参数体验最新实验功能',
        type: 'experimental'
      },
      {
        title: '多语言本地化',
        description: '浏览器语言检测，本地化座右铭和界面文本',
        type: 'new'
      },
      {
        title: '多输入设备支持',
        description: '键盘、游戏手柄、触觉反馈全面支持',
        type: 'improved'
      },
      {
        title: '响应式设计优化',
        description: 'iPad自动缩放80%，完美适配多种设备',
        type: 'improved'
      }
    ],
    improvements: [
      '优化音频系统，减少iOS设备延迟和卡顿',
      '改进iPad触摸解锁和自动缩放体验',
      '增强玩家名称管理和验证机制',
      '完善输入事件处理，支持preventDefault',
      '添加实时延迟监控和性能优化',
      '优化分数提交的网络错误处理',
      '改进UI响应性和视觉效果'
    ],
    bugFixes: [
      '修复音频在iOS设备中的初始化问题',
      '解决iPad上的音频解锁触发机制',
      '修复空格键和方向键的事件冲突',
      '优化移动端触摸事件处理',
      '修复分数显示的数字格式问题',
      '解决排行榜加载的竞态条件',
      '修复玩家名称验证的边界情况'
    ]
  },
  {
    version: '2.1.0',
    releaseDate: '2025-06-15',
    features: [
      {
        title: '音频系统重构',
        description: '全新音频管理系统，实时延迟调整',
        type: 'new'
      }
    ],
    improvements: [
      '改进游戏性能和稳定性',
      '优化用户界面响应速度'
    ],
    bugFixes: [
      '修复音频播放内存泄漏',
      '解决高分保存的竞态条件'
    ]
  }
];