import { SkillDef, SkillType } from './types';

export const BOARD_SIZE = 15;

export const SKILLS: Record<SkillType, SkillDef> = {
  [SkillType.FeiShaZouShi]: {
    id: SkillType.FeiShaZouShi,
    name: '飞沙走石',
    description: '去除对手一子，且该点下回合不可落子',
    maxUses: 5,
    colorClass: 'bg-red-100',
    textClass: 'text-red-800',
    badgeColor: 'bg-red-500',
    requiresTarget: true,
  },
  [SkillType.JingRuZhiShui]: {
    id: SkillType.JingRuZhiShui,
    name: '静如止水',
    description: '跳过对手回合 (不可在绝杀前使用)',
    maxUses: 1,
    colorClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    badgeColor: 'bg-blue-500',
    requiresTarget: false,
  },
  [SkillType.LiBaShanXi]: {
    id: SkillType.LiBaShanXi,
    name: '力拔山兮',
    description: '掀翻棋盘，直接获胜',
    maxUses: 1,
    colorClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    badgeColor: 'bg-amber-500',
    requiresTarget: false,
    playerOnly: true,
  },
  [SkillType.YiXingHuanYing]: {
    id: SkillType.YiXingHuanYing,
    name: '移形换影',
    description: '交换己方与对方各一枚棋子',
    maxUses: 3,
    colorClass: 'bg-emerald-100',
    textClass: 'text-emerald-800',
    badgeColor: 'bg-emerald-500',
    requiresTarget: true,
    requiresSelectionStep: true,
  },
  [SkillType.DongShanZaiQi]: {
    id: SkillType.DongShanZaiQi,
    name: '东山再起',
    description: '反制力拔山兮，继续游戏',
    maxUses: 1,
    colorClass: 'bg-purple-100',
    textClass: 'text-purple-800',
    badgeColor: 'bg-purple-500',
    requiresTarget: false,
    aiOnly: true,
  },
};

export const INITIAL_SKILL_COUNTS = {
  [SkillType.FeiShaZouShi]: 5,
  [SkillType.JingRuZhiShui]: 1,
  [SkillType.LiBaShanXi]: 1,
  [SkillType.YiXingHuanYing]: 3,
  [SkillType.DongShanZaiQi]: 0, // Default 0, added dynamically based on mode
};
