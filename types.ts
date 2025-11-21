export enum Player {
  Black = 'BLACK',
  White = 'WHITE',
}

export enum CellState {
  Empty = 0,
  Black = 1,
  White = 2,
}

export enum SkillType {
  FeiShaZouShi = 'FEI_SHA_ZOU_SHI', // 飞沙走石 (Remove opponent piece)
  JingRuZhiShui = 'JING_RU_ZHI_SHUI', // 静如止水 (Skip opponent turn)
  LiBaShanXi = 'LI_BA_SHAN_XI', // 力拔山兮 (Instant Win)
  YiXingHuanYing = 'YI_XING_HUAN_YING', // 移形换影 (Swap pieces)
  DongShanZaiQi = 'DONG_SHAN_ZAI_QI', // 东山再起 (Counter instant win - AI Only)
}

export interface SkillDef {
  id: SkillType;
  name: string;
  description: string;
  maxUses: number;
  colorClass: string;
  textClass: string;
  badgeColor: string;
  requiresTarget?: boolean;
  requiresSelectionStep?: boolean; // For swapping (select own, then enemy)
  aiOnly?: boolean;
  playerOnly?: boolean;
}

export interface GameState {
  board: CellState[][];
  currentPlayer: Player;
  winner: Player | 'DRAW' | null;
  history: { r: number; c: number; player: Player }[];
  forbiddenMoves: { r: number; c: number; duration: number }[]; // Spots blocked by skills
  skills: {
    [Player.Black]: Record<SkillType, number>;
    [Player.White]: Record<SkillType, number>;
  };
}

export enum GameMode {
  PvP = 'PVP',
  PvAI = 'PVAI',
}

export enum AIDifficulty {
  Easy = 'EASY',
  Medium = 'MEDIUM',
  Hard = 'HARD',
}

// Selection state for skills that require clicking the board
export interface InteractionState {
  activeSkill: SkillType | null;
  step: 'SELECT_SOURCE' | 'SELECT_TARGET' | null;
  sourceCoords: { r: number; c: number } | null;
}
