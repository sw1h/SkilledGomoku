import { BOARD_SIZE } from '../constants';
import { AIDifficulty, CellState, Player, SkillType } from '../types';

// --- Core Game Logic ---

export const createEmptyBoard = (): CellState[][] => {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(CellState.Empty));
};

export const checkWin = (board: CellState[][], player: Player): boolean => {
  const target = player === Player.Black ? CellState.Black : CellState.White;
  
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1],
  ];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== target) continue;

      for (const [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 5; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === target) {
            count++;
          } else {
            break;
          }
        }
        if (count >= 5) return true;
      }
    }
  }
  return false;
};

// --- AI Logic ---

const SCORE = {
  WIN: 1000000,
  LIVE_4: 50000,
  DEAD_4: 10000,
  LIVE_3: 5000,
  DEAD_3: 1000,
  LIVE_2: 500,
  DEAD_2: 100,
};

// Advanced pattern matching could be better, but we use a line scanner for simplicity
const evaluateLine = (line: CellState[], target: CellState): number => {
  const enemy = target === CellState.Black ? CellState.White : CellState.Black;
  let count = 0;
  
  let myPieces = 0;
  let enemyPieces = 0;

  for (const cell of line) {
    if (cell === target) myPieces++;
    else if (cell === enemy) enemyPieces++;
  }

  if (enemyPieces > 0 && myPieces === 0) return 0; // Pure enemy line
  if (enemyPieces > 0 && myPieces > 0) return 0; // Mixed line, useless for connection
  if (myPieces === 0) return 0;

  // It's a pure line of myPieces + empty
  if (myPieces === 5) return SCORE.WIN;
  if (myPieces === 4) return SCORE.LIVE_4; // Simplified (could be dead 4)
  if (myPieces === 3) return SCORE.LIVE_3;
  if (myPieces === 2) return SCORE.LIVE_2;
  
  return myPieces;
};

const getBoardScore = (board: CellState[][], player: Player): number => {
  const target = player === Player.Black ? CellState.Black : CellState.White;
  const enemy = player === Player.Black ? CellState.White : CellState.Black;
  let score = 0;

  const scan = (p: CellState) => {
    let total = 0;
    // Directions
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        for (const [dr, dc] of dirs) {
            // Look at 5-cell windows starting at r,c
            const line: CellState[] = [];
            let valid = true;
            for(let k=0; k<5; k++) {
                const nr = r + dr*k;
                const nc = c + dc*k;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) {
                    valid = false; break;
                }
                line.push(board[nr][nc]);
            }
            if (valid) total += evaluateLine(line, p);
        }
      }
    }
    return total;
  };

  score += scan(target);
  score -= scan(enemy) * 1.5; // Be defensive

  return score;
};

export const getBestMove = (
  board: CellState[][],
  player: Player,
  difficulty: AIDifficulty,
  forbiddenMoves: { r: number; c: number }[]
): { r: number; c: number } | null => {
  const availableMoves: { r: number; c: number; score: number }[] = [];
  const target = player === Player.Black ? CellState.Black : CellState.White;
  
  // Optimize: Only check cells with neighbors
  const candidates = new Set<string>();
  
  let hasPiece = false;
  for(let r=0; r<BOARD_SIZE; r++){
      for(let c=0; c<BOARD_SIZE; c++){
          if(board[r][c] !== CellState.Empty) {
              hasPiece = true;
              for(let dr=-2; dr<=2; dr++){
                  for(let dc=-2; dc<=2; dc++){
                      const nr = r+dr;
                      const nc = c+dc;
                      if(nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && board[nr][nc] === CellState.Empty) {
                          if (!forbiddenMoves.some(m => m.r === nr && m.c === nc)) {
                              candidates.add(`${nr},${nc}`);
                          }
                      }
                  }
              }
          }
      }
  }

  if (!hasPiece) return { r: 7, c: 7 };

  candidates.forEach(coord => {
      const [r, c] = coord.split(',').map(Number);
      
      board[r][c] = target;
      let score = getBoardScore(board, player);
      board[r][c] = CellState.Empty;

      // Add noise for lower difficulty
      const noise = difficulty === AIDifficulty.Easy ? Math.random() * 10000 : Math.random() * 10;
      availableMoves.push({ r, c, score: score + noise });
  });

  if (availableMoves.length === 0) return null;
  
  // Sort desc
  availableMoves.sort((a, b) => b.score - a.score);
  
  // Easy: Pick random from top 5
  if (difficulty === AIDifficulty.Easy) {
      const pool = availableMoves.slice(0, 5);
      return pool[Math.floor(Math.random() * pool.length)];
  }
  
  return availableMoves[0];
};

// AI Skill Decision Engine
export const shouldAIUseSkill = (
  board: CellState[][],
  aiPlayer: Player,
  difficulty: AIDifficulty,
  inventory: Record<SkillType, number>
): { skill: SkillType; target?: { r: number; c: number } } | null => {
  
  if (difficulty === AIDifficulty.Easy) return null;

  const aiPiece = aiPlayer === Player.Black ? CellState.Black : CellState.White;
  const playerPiece = aiPlayer === Player.Black ? CellState.White : CellState.Black;

  // 1. CRITICAL DEFENSE: "Fei Sha Zou Shi" (Remove Piece)
  // Scan if Human has a winning line (4 in a row, or open 3)
  if (inventory[SkillType.FeiShaZouShi] > 0) {
      const threats = findThreats(board, playerPiece); // Find human threats
      // If threat level is high (Open 3 or 4)
      if (threats.length > 0) {
          // Sort threats by severity
          threats.sort((a, b) => b.severity - a.severity);
          // Target the most critical piece (usually the middle of a line)
          const target = threats[0].target;
          return { skill: SkillType.FeiShaZouShi, target };
      }
  }

  // 2. WIN SECURING: "Jing Ru Zhi Shui" (Skip Turn)
  // If AI has a good attack (Open 3 or better), skip opponent turn to win
  // FIX: Do NOT use if AI already has a winning move (4 in a row / severity 10)
  if (inventory[SkillType.JingRuZhiShui] > 0 && difficulty === AIDifficulty.Hard) {
      const aiAttacks = findThreats(board, aiPiece);
      
      // Check if we can ALREADY win (Severity 10 usually means 4 in a row)
      const canWinImmediately = aiAttacks.some(t => t.severity >= 10);

      // If we can win immediately, don't use the skill, just place the piece!
      if (!canWinImmediately) {
           // If we have a setup (Severity 5 means Open 3), then using skill helps us win.
           if (aiAttacks.some(t => t.severity >= 5)) {
               return { skill: SkillType.JingRuZhiShui };
           }
      }
  }

  // 3. DISRUPTION: "Yi Xing Huan Ying" (Swap)
  // If losing badly and no removal available, try to swap AI's worst piece with Player's best piece
  if (difficulty === AIDifficulty.Hard && inventory[SkillType.YiXingHuanYing] > 0 && inventory[SkillType.FeiShaZouShi] === 0) {
      const score = getBoardScore(board, aiPlayer);
      if (score < -5000) {
          // Find a player piece involved in a threat
          const threats = findThreats(board, playerPiece);
          if (threats.length > 0) {
              // Return skill, allow app to handle random swap logic for AI
              return { skill: SkillType.YiXingHuanYing, target: threats[0].target };
          }
      }
  }

  return null;
};

// Helper to find lines of 3 or 4
// Returns list of critical cells to remove
const findThreats = (board: CellState[][], targetPlayer: CellState): { severity: number, target: {r: number, c: number} }[] => {
    const threats: { severity: number, target: {r: number, c: number} }[] = [];
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === targetPlayer) {
                for (const [dr, dc] of directions) {
                   // Check lines of length 4 and 3
                   let count = 1;
                   const lineCoords = [{r, c}];
                   // Look forward
                   for(let k=1; k<5; k++) {
                       const nr = r + dr*k;
                       const nc = c + dc*k;
                       if (nr>=0 && nr<BOARD_SIZE && nc>=0 && nc<BOARD_SIZE && board[nr][nc] === targetPlayer) {
                           count++;
                           lineCoords.push({r: nr, c: nc});
                       } else {
                           break;
                       }
                   }

                   if (count === 4) {
                       // Critical! Pick a middle piece to break it
                       threats.push({ severity: 10, target: lineCoords[1] });
                   } else if (count === 3) {
                       // Check if open ends (dangerous)
                       // Simple logic: treat as threat
                       threats.push({ severity: 5, target: lineCoords[1] });
                   }
                }
            }
        }
    }
    return threats;
}