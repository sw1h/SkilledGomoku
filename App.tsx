import React, { useState, useEffect, useRef } from 'react';
import Board, { VFXState } from './components/Board';
import SkillPanel from './components/SkillPanel';
import {
  GameState,
  Player,
  CellState,
  GameMode,
  SkillType,
  AIDifficulty,
  InteractionState,
} from './types';
import { createEmptyBoard, checkWin, getBestMove, shouldAIUseSkill } from './utils/logic';
import { SKILLS, INITIAL_SKILL_COUNTS } from './constants';
// 使用import导入音频文件，确保构建时正确处理
import bgmFile from './bgm.mp3';

// Icons
const PlayIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UserIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const CpuIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>;
const HomeIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const VolumeUpIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>;
const VolumeOffIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>;

type ViewState = 'HOME' | 'GAME';

const App: React.FC = () => {
  // --- View State ---
  const [view, setView] = useState<ViewState>('HOME');

  // --- Game Settings ---
  const [mode, setMode] = useState<GameMode>(GameMode.PvAI);
  const [difficulty, setDifficulty] = useState<AIDifficulty>(AIDifficulty.Medium);
  
  // --- Game State ---
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    currentPlayer: Player.Black,
    winner: null,
    history: [],
    forbiddenMoves: [],
    skills: {
      [Player.Black]: { ...INITIAL_SKILL_COUNTS },
      [Player.White]: { ...INITIAL_SKILL_COUNTS },
    },
  });

  const [interaction, setInteraction] = useState<InteractionState>({
    activeSkill: null,
    step: null,
    sourceCoords: null,
  });

  const [vfx, setVfx] = useState<VFXState | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'info' | 'error' | 'success' | 'special' } | null>(null);

  // --- Audio State ---
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Refs for timeouts to clear them on unmount/reset
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vfxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Navigation Handlers ---
  const handleStartGame = (selectedMode: GameMode, selectedDiff?: AIDifficulty) => {
    setMode(selectedMode);
    if (selectedDiff) setDifficulty(selectedDiff);
    resetGameLogic(selectedMode, selectedDiff || difficulty);
    setView('GAME');
  };

  const handleGoHome = () => {
    setView('HOME');
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
  };

  // --- Game Initialization ---
  const resetGameLogic = (newMode: GameMode, newDiff: AIDifficulty) => {
    const initialSkills = { ...INITIAL_SKILL_COUNTS };
    const p2Skills = { ...INITIAL_SKILL_COUNTS };

    // AI Difficulty Adjustment
    if (newMode === GameMode.PvAI) {
      if (newDiff === AIDifficulty.Easy) {
         p2Skills[SkillType.FeiShaZouShi] = 2;
         p2Skills[SkillType.YiXingHuanYing] = 0;
         p2Skills[SkillType.JingRuZhiShui] = 0;
      } else if (newDiff === AIDifficulty.Medium) {
         p2Skills[SkillType.FeiShaZouShi] = 4;
         p2Skills[SkillType.DongShanZaiQi] = 0;
      } else {
         // Hard
         p2Skills[SkillType.DongShanZaiQi] = 1;
         p2Skills[SkillType.FeiShaZouShi] = 5;
         p2Skills[SkillType.JingRuZhiShui] = 1;
         p2Skills[SkillType.YiXingHuanYing] = 3;
      }
    }

    setGameState({
      board: createEmptyBoard(),
      currentPlayer: Player.Black,
      winner: null,
      history: [],
      forbiddenMoves: [],
      skills: {
        [Player.Black]: initialSkills,
        [Player.White]: p2Skills,
      },
    });
    setInteraction({ activeSkill: null, step: null, sourceCoords: null });
    setVfx(null);
    setToast(null);
  };

  const restartGame = () => {
    resetGameLogic(mode, difficulty);
  };

  // 音频加载状态
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  // --- Audio Effect ---
  useEffect(() => {
    if (!audioRef.current) {
        try {
          // 使用导入的音频文件，确保路径正确
          audioRef.current = new Audio(bgmFile);
          audioRef.current.loop = true;
          console.log('音频对象创建成功，使用导入的音频文件');
          
          // 预加载音频
          audioRef.current.preload = 'auto';
        } catch (error) {
          console.error('创建音频对象失败:', error);
        }
      }

    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
      
      // 让背景音乐在主页面('HOME')和游戏页面('GAME')都准备好，但不自动播放
        if ((view === 'HOME' || view === 'GAME') && !isMuted) {
          // 如果是从游戏页面退出到主页面，重置播放位置
          if (view === 'HOME') {
            audioRef.current.currentTime = 0;
          }
          
          // 尝试播放，但处理可能的自动播放限制
          audioRef.current.play().catch(e => {
            console.log("自动播放受限，等待用户交互后播放:", e);
            // 音频将在用户交互后播放
          });
        } else {
        audioRef.current.pause();
      }
    }
  }, [view, isMuted, volume]);
    
    // 添加用户交互触发的音频播放函数 - 增强版本
    const handleUserInteraction = async () => {
      if (!audioRef.current || isMuted) return;
      
      try {
        // 确保暂停状态再播放
        if (audioRef.current.paused) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            console.log('音频通过用户交互成功播放');
            setAudioLoaded(true);
          }
        }
      } catch (error) {
        console.error('用户交互后播放音频失败:', error);
        // 尝试重置并重新播放
        try {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          console.log('重置后音频播放成功');
          setAudioLoaded(true);
        } catch (retryError) {
          console.error('重置后播放仍然失败:', retryError);
        }
      }
    };
    
    // 在组件挂载时添加全局事件监听器 - 更多交互类型
    useEffect(() => {
      // 添加更多交互类型以提高触发概率
      const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
      
      interactionEvents.forEach(event => {
        document.addEventListener(event, handleUserInteraction);
      });
      
      // 组件卸载时清理事件监听器
      return () => {
        interactionEvents.forEach(event => {
          document.removeEventListener(event, handleUserInteraction);
        });
      };
    }, [isMuted]);
    
    // 监听音频加载完成事件
    useEffect(() => {
      if (audioRef.current) {
        const handleLoadedMetadata = () => {
          console.log('音频元数据加载完成');
          setAudioLoaded(true);
        };
        
        const handleError = (e: Event) => {
          console.error('音频加载错误:', e);
          setAudioLoaded(false);
        };
        
        audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.addEventListener('error', handleError);
        
        return () => {
          audioRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audioRef.current?.removeEventListener('error', handleError);
        };
      }
    }, []);
    
    // 页面可见性变化时的处理
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (!document.hidden && audioRef.current && !isMuted && audioLoaded) {
          // 当页面从不可见变为可见时，尝试恢复播放
          audioRef.current.play().catch(e => {
            console.log('页面可见时恢复播放失败，等待用户交互:', e);
          });
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [isMuted, audioLoaded]);

  // --- Effects ---

  // AI Turn Effect
  useEffect(() => {
    if (
      view === 'GAME' &&
      mode === GameMode.PvAI &&
      gameState.currentPlayer === Player.White &&
      !gameState.winner
    ) {
      aiTimerRef.current = setTimeout(() => {
        performAITurn();
      }, 1000);
    }
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [gameState.currentPlayer, gameState.winner, mode, view]);

  // --- Helpers ---

  const showToast = (msg: string, type: 'info' | 'error' | 'success' | 'special' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const triggerVFX = (type: SkillType | 'WIN_SHATTER', coords?: {r: number, c: number}, targetCoords?: {r: number, c: number}) => {
      if (vfxTimerRef.current) clearTimeout(vfxTimerRef.current);
      setVfx({ type, coords, targetCoords });
      
      const duration = type === SkillType.JingRuZhiShui ? 1000 : 
                       type === SkillType.FeiShaZouShi ? 800 :
                       type === SkillType.YiXingHuanYing ? 500 : 1000;

      vfxTimerRef.current = setTimeout(() => setVfx(null), duration);
  };

  const switchTurn = (state: GameState, skipTurnSwitch: boolean = false): GameState => {
    const nextForbidden = state.forbiddenMoves
      .map(m => ({ ...m, duration: m.duration - 1 }))
      .filter(m => m.duration > 0);

    return {
      ...state,
      currentPlayer: skipTurnSwitch ? state.currentPlayer : (state.currentPlayer === Player.Black ? Player.White : Player.Black),
      forbiddenMoves: nextForbidden,
    };
  };

  // --- Logic Actions ---

  const handleCellClick = (r: number, c: number) => {
    if (gameState.winner) return;
    if (mode === GameMode.PvAI && gameState.currentPlayer === Player.White) return;

    if (interaction.activeSkill) {
      handleSkillInteraction(r, c);
      return;
    }

    placePiece(r, c);
  };

  const placePiece = (r: number, c: number) => {
    if (gameState.board[r][c] !== CellState.Empty) return;
    if (gameState.forbiddenMoves.some(m => m.r === r && m.c === c)) {
        showToast('该位置被“飞沙走石”封印中，暂无法落子', 'error');
        return;
    }

    const newBoard = gameState.board.map(row => [...row]);
    newBoard[r][c] = gameState.currentPlayer === Player.Black ? CellState.Black : CellState.White;

    const win = checkWin(newBoard, gameState.currentPlayer);
    
    setGameState(prev => {
      let nextState = {
        ...prev,
        board: newBoard,
        history: [...prev.history, { r, c, player: prev.currentPlayer }],
      };

      if (win) {
        nextState.winner = prev.currentPlayer;
      } else {
        nextState = switchTurn(nextState);
      }
      return nextState;
    });
  };

  // --- Skill Logic ---

  const handleUseSkill = (skillId: SkillType) => {
    const def = SKILLS[skillId];
    
    if (!def.requiresTarget) {
      executeImmediateSkill(skillId);
    } else {
      setInteraction({
        activeSkill: skillId,
        step: def.requiresSelectionStep ? 'SELECT_SOURCE' : 'SELECT_TARGET',
        sourceCoords: null,
      });
      const instruction = skillId === SkillType.YiXingHuanYing ? '请选择己方一枚棋子' : '请选择要移除的对手棋子';
      showToast(instruction, 'info');
    }
  };

  const executeImmediateSkill = (skillId: SkillType) => {
    setGameState(prev => {
        const player = prev.currentPlayer;
        const opponent = player === Player.Black ? Player.White : Player.Black;
        const newSkills = { ...prev.skills };

        if (newSkills[player][skillId] <= 0) return prev;
        newSkills[player][skillId]--;

        if (skillId === SkillType.LiBaShanXi) {
            // 明确检查对手是否有东山再起技能
            const oppHasCounter = prev.skills[opponent][SkillType.DongShanZaiQi] > 0;
            
            if (oppHasCounter) {
                 setTimeout(() => showToast('【东山再起】触发！力拔山兮被抵消！', 'special'), 500);
                 const updatedSkills = { ...newSkills };
                 updatedSkills[opponent][SkillType.DongShanZaiQi]--;
                 triggerVFX(SkillType.LiBaShanXi); // Shake board anyway

                 return switchTurn({
                     ...prev,
                     skills: updatedSkills,
                     forbiddenMoves: prev.forbiddenMoves
                 });
            } else {
                // 确保当对方没有东山再起技能时，直接设置当前玩家为胜利者
                triggerVFX('WIN_SHATTER');
                showToast(`【力拔山兮】生效！${player === Player.Black ? '黑棋' : '白棋'} 获胜！`, 'success');
                return { ...prev, skills: newSkills, winner: player };
            }
        }

        if (skillId === SkillType.JingRuZhiShui) {
            triggerVFX(SkillType.JingRuZhiShui);
            showToast('【静如止水】生效！你获得了额外回合。', 'success');
            return switchTurn({ ...prev, skills: newSkills }, true);
        }

        return { ...prev, skills: newSkills };
    });
  };

  const handleSkillInteraction = (r: number, c: number) => {
    const { activeSkill, step, sourceCoords } = interaction;
    const cell = gameState.board[r][c];
    const isMyPiece = (gameState.currentPlayer === Player.Black && cell === CellState.Black) || 
                      (gameState.currentPlayer === Player.White && cell === CellState.White);
    const isEnemyPiece = !isMyPiece && cell !== CellState.Empty;

    if (activeSkill === SkillType.FeiShaZouShi) {
        if (isEnemyPiece) {
            triggerVFX(SkillType.FeiShaZouShi, {r, c});
            setGameState(prev => {
                const newBoard = prev.board.map(row => [...row]);
                newBoard[r][c] = CellState.Empty;
                const newSkills = { ...prev.skills };
                newSkills[prev.currentPlayer][activeSkill]--;
                
                return switchTurn({
                    ...prev,
                    board: newBoard,
                    skills: newSkills,
                    forbiddenMoves: [...prev.forbiddenMoves, { r, c, duration: 2 }]
                });
            });
            setInteraction({ activeSkill: null, step: null, sourceCoords: null });
            showToast('【飞沙走石】成功！棋子已移除。', 'success');
        } else {
            showToast('请选择对手的棋子', 'error');
        }
    } else if (activeSkill === SkillType.YiXingHuanYing) {
        if (step === 'SELECT_SOURCE') {
            if (isMyPiece) {
                setInteraction({ ...interaction, step: 'SELECT_TARGET', sourceCoords: { r, c } });
                showToast('现在选择要交换的对手棋子', 'info');
            } else {
                showToast('必须选择你自己的棋子', 'error');
            }
        } else if (step === 'SELECT_TARGET') {
            if (isEnemyPiece && sourceCoords) {
                triggerVFX(SkillType.YiXingHuanYing, {r: sourceCoords.r, c: sourceCoords.c}, {r, c});
                setGameState(prev => {
                    const newBoard = prev.board.map(row => [...row]);
                    const myVal = newBoard[sourceCoords.r][sourceCoords.c];
                    const enemyVal = newBoard[r][c];
                    newBoard[sourceCoords.r][sourceCoords.c] = enemyVal;
                    newBoard[r][c] = myVal;
                    
                    const newSkills = { ...prev.skills };
                    newSkills[prev.currentPlayer][activeSkill]--;
                    
                    const win = checkWin(newBoard, prev.currentPlayer);
                    
                    return {
                        ...switchTurn({ ...prev, board: newBoard, skills: newSkills }),
                        winner: win ? prev.currentPlayer : null
                    };
                });
                setInteraction({ activeSkill: null, step: null, sourceCoords: null });
                showToast('【移形换影】成功！', 'success');
            } else {
                showToast('必须选择对手的棋子', 'error');
            }
        }
    }
  };

  // --- AI Engine ---

  const performAITurn = () => {
    const skillDecision = shouldAIUseSkill(
        gameState.board, 
        Player.White, 
        difficulty, 
        gameState.skills[Player.White]
    );

    if (skillDecision) {
        const { skill, target } = skillDecision;

        if (skill === SkillType.FeiShaZouShi && target) {
             showToast('AI 发动【飞沙走石】！', 'special');
             triggerVFX(SkillType.FeiShaZouShi, target);
             setTimeout(() => {
                 setGameState(prev => {
                     const newBoard = prev.board.map(row => [...row]);
                     newBoard[target.r][target.c] = CellState.Empty;
                     const newSkills = { ...prev.skills };
                     newSkills[Player.White][SkillType.FeiShaZouShi]--;
                     return switchTurn({
                         ...prev,
                         board: newBoard,
                         skills: newSkills,
                         forbiddenMoves: [...prev.forbiddenMoves, { r: target.r, c: target.c, duration: 2 }]
                     });
                 });
             }, 800);
             return;
        }

        if (skill === SkillType.JingRuZhiShui) {
             showToast('AI 发动【静如止水】！连下两子！', 'special');
             triggerVFX(SkillType.JingRuZhiShui);
             setTimeout(() => {
                 setGameState(prev => {
                    const newSkills = { ...prev.skills };
                    newSkills[Player.White][SkillType.JingRuZhiShui]--;
                    return switchTurn({ ...prev, skills: newSkills }, true); 
                 });
             }, 1000);
             return;
        }
        
        if (skill === SkillType.YiXingHuanYing && target) {
            // Basic swap impl for AI: Swap target threat with AI's own random piece?
            // For simplicity in this update, we let AI swap a random own piece with target
            const aiPieces: {r:number, c:number}[] = [];
            gameState.board.forEach((row, r) => row.forEach((c, col) => {
                if (c === CellState.White) aiPieces.push({r, c: col});
            }));

            if (aiPieces.length > 0) {
                const myPiece = aiPieces[Math.floor(Math.random() * aiPieces.length)];
                showToast('AI 发动【移形换影】！', 'special');
                triggerVFX(SkillType.YiXingHuanYing, myPiece, target);
                
                setTimeout(() => {
                    setGameState(prev => {
                        const newBoard = prev.board.map(row => [...row]);
                        const myVal = newBoard[myPiece.r][myPiece.c];
                        const enemyVal = newBoard[target.r][target.c];
                        newBoard[myPiece.r][myPiece.c] = enemyVal;
                        newBoard[target.r][target.c] = myVal;
                        
                        const newSkills = { ...prev.skills };
                        newSkills[Player.White][SkillType.YiXingHuanYing]--;
                        return switchTurn({ ...prev, board: newBoard, skills: newSkills });
                    });
                }, 500);
                return;
            }
        }
    }

    const bestMove = getBestMove(gameState.board, Player.White, difficulty, gameState.forbiddenMoves);

    if (bestMove) {
        setGameState(prev => {
            const newBoard = prev.board.map(row => [...row]);
            newBoard[bestMove.r][bestMove.c] = CellState.White;
            const win = checkWin(newBoard, Player.White);
            
            if (win) return { ...prev, board: newBoard, winner: Player.White };
            
            return switchTurn({ ...prev, board: newBoard });
        });
    } else {
        setGameState(prev => ({ ...prev, winner: 'DRAW' }));
    }
  };

  // --- Render ---

  if (view === 'HOME') {
      return (
          <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center space-y-8 border border-indigo-50">
                  <div>
                      <h1 className="text-5xl font-extrabold text-indigo-900 mb-2 tracking-tight">技能五子棋</h1>
                      <p className="text-slate-500 text-lg">Strategy & Skills Gomoku</p>
                  </div>

                  <div className="space-y-4">
                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <h2 className="text-indigo-900 font-bold mb-3 flex items-center justify-center gap-2">
                             <CpuIcon /> 人机挑战
                          </h2>
                          <div className="grid grid-cols-3 gap-2">
                              {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                                  <button
                                    key={d}
                                    onClick={() => handleStartGame(GameMode.PvAI, d as AIDifficulty)}
                                    className={`py-2 px-1 rounded-lg text-sm font-bold transition-all hover:scale-105
                                        ${d === 'EASY' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 
                                          d === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                                          'bg-red-100 text-red-700 hover:bg-red-200'}
                                    `}
                                  >
                                      {d === 'EASY' ? '简单' : d === 'MEDIUM' ? '中等' : '困难'}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <button 
                        onClick={() => handleStartGame(GameMode.PvP)}
                        className="w-full py-4 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center gap-3 text-slate-700 font-bold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all group"
                      >
                          <div className="bg-slate-100 p-2 rounded-full group-hover:bg-indigo-200 transition-colors">
                              <UserIcon />
                          </div>
                          本地双人对战
                      </button>
                  </div>

                  <div className="text-xs text-slate-400 pt-4 border-t">
                      挑战“技能五”或与好友切磋
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-4 font-sans text-slate-800 relative overflow-hidden">
      
      {/* 增强的音频控制 - 固定右上角 */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-center bg-white/80 backdrop-blur-sm p-3 rounded-xl shadow-md border border-indigo-100">
          {/* 显式的音频播放按钮 */}
          <button
            onClick={() => {
              handleUserInteraction(); // 直接触发音频播放
            }}
            className="p-3 rounded-full bg-indigo-100 hover:bg-indigo-200 transition-colors mb-2"
            title="点击播放背景音乐"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {/* 静音切换按钮 */}
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              handleUserInteraction(); // 触发用户交互以帮助播放音频
            }}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
            title={isMuted ? "开启音乐" : "静音"}
          >
              {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </button>
          
          {/* 音量控制 */}
          {!isMuted && (
             <input 
               type="range" 
               min="0" max="1" step="0.1" 
               value={volume} 
               onChange={(e) => setVolume(parseFloat(e.target.value))}
               className="w-20 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-1"
             />
          )}
          
          {/* 音频状态指示器 */}
          <div className="text-sm mt-1 text-gray-600 font-medium">
            {audioLoaded ? "🎵 音乐已加载" : "⏳ 音乐加载中..."}
          </div>
          
          {/* 音频提示文本 */}
          <div className="text-xs mt-1 text-gray-500 text-center max-w-[120px]">
            点击音乐图标开始播放
          </div>
      </div>

      {/* Dynamic Toast - Positioned at top, non-blocking */}
      {toast && (
          <div className={`
              fixed top-20 left-1/2 transform -translate-x-1/2
              px-6 py-3 rounded-xl shadow-2xl text-center z-[60] min-w-[200px]
              border-2 animate-pulse-fast backdrop-blur-md transition-all
              ${toast.type === 'error' ? 'bg-red-500/90 border-red-600 text-white' : 
                toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-600 text-white' : 
                toast.type === 'special' ? 'bg-purple-600/95 border-yellow-400 text-yellow-100' :
                'bg-blue-500/90 border-blue-600 text-white'}
          `}>
              <div className="text-lg font-bold flex items-center gap-2 justify-center">
                  {toast.type === 'special' && <span>⚡</span>}
                  {toast.msg}
              </div>
          </div>
      )}

      {/* Header */}
      <div className="w-full max-w-7xl px-4 flex items-center justify-between mb-6 z-10">
          <button 
            onClick={handleGoHome} 
            className="group flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-indigo-100 rounded-full shadow-sm text-slate-600 hover:text-indigo-700 transition-all font-bold border border-slate-200 hover:border-indigo-300"
          >
              <HomeIcon /> <span className="hidden sm:inline">退出游戏</span>
          </button>
          <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-900">
                  {mode === GameMode.PvAI ? '人机对决' : '双人对战'}
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                  {mode === GameMode.PvAI 
                    ? `VS 技能五 (${difficulty === 'EASY' ? '简单' : difficulty === 'MEDIUM' ? '中等' : '困难'})` 
                    : '黑棋 VS 白棋'}
              </p>
          </div>
          <button onClick={() => setShowRules(true)} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold hover:bg-indigo-200 transition-colors border border-indigo-200">
              规则
          </button>
      </div>

      <div className="max-w-7xl w-full px-2 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 z-10">
        
        {/* Left Panel: Player 1 */}
        <div className="lg:col-span-3 flex justify-center lg:justify-end order-2 lg:order-1">
             <SkillPanel 
                player={Player.Black} 
                currentPlayer={gameState.currentPlayer}
                skills={gameState.skills[Player.Black]}
                onUseSkill={handleUseSkill}
                activeSkill={interaction.activeSkill}
                isAiTurn={mode === GameMode.PvAI && gameState.currentPlayer === Player.White}
                isAI={false}
             />
        </div>

        {/* Center: Board */}
        <div className="lg:col-span-6 flex flex-col items-center justify-start order-1 lg:order-2 space-y-6">
            {/* Status Banner */}
            <div className={`
                px-8 py-3 rounded-2xl font-bold text-white shadow-lg transition-all transform duration-500 flex items-center gap-3
                ${gameState.winner 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 scale-110' 
                    : gameState.currentPlayer === Player.Black 
                        ? 'bg-slate-800' 
                        : 'bg-white text-slate-800 border-2 border-slate-200'}
            `}>
                {gameState.winner 
                  ? (gameState.winner === 'DRAW' ? '平局！' : `${gameState.winner === Player.Black ? '黑棋' : '白棋'} 获胜！`)
                  : (
                      <>
                        <span className={`w-3 h-3 rounded-full ${gameState.currentPlayer === Player.Black ? 'bg-white' : 'bg-black'}`}></span>
                        {gameState.currentPlayer === Player.Black ? '黑棋回合' : '白棋回合'}
                      </>
                  )
                }
            </div>

            <div className="relative">
                <Board 
                    board={gameState.board} 
                    onCellClick={handleCellClick} 
                    lastMove={gameState.history.length > 0 ? gameState.history[gameState.history.length - 1] : null}
                    forbiddenMoves={gameState.forbiddenMoves}
                    interactionState={interaction}
                    vfx={vfx}
                />
                
                {/* Restart Button Overlay when Game Over */}
                {gameState.winner && (
                    <div className="absolute bottom-[-60px] left-1/2 transform -translate-x-1/2 w-full flex justify-center z-50">
                         <button 
                            onClick={restartGame}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all animate-bounce"
                         >
                             <PlayIcon /> 再来一局
                         </button>
                    </div>
                )}
            </div>
        </div>

        {/* Right Panel: Player 2 / AI */}
        <div className="lg:col-span-3 flex justify-center lg:justify-start order-3">
             <SkillPanel 
                player={Player.White} 
                currentPlayer={gameState.currentPlayer}
                skills={gameState.skills[Player.White]}
                onUseSkill={handleUseSkill}
                activeSkill={mode === GameMode.PvP ? interaction.activeSkill : null}
                isAiTurn={mode === GameMode.PvAI}
                isAI={mode === GameMode.PvAI}
             />
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto relative animate-fade-in-up">
                <button onClick={() => setShowRules(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-2xl font-bold text-indigo-900 mb-6">技能手册</h2>
                <div className="space-y-5 text-sm text-slate-600">
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <h3 className="font-bold text-slate-800 mb-2">基础规则</h3>
                        <p>黑棋先手。率先在横、竖、斜方向连成五子者获胜。</p>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                             <div className="bg-red-100 text-red-700 p-1.5 rounded shrink-0 font-bold text-xs">飞沙</div>
                             <div><span className="font-bold text-slate-800">飞沙走石 (5次)</span><br/>消耗本回合，移除对手一子。该位置下回合禁手。</div>
                        </div>
                        <div className="flex items-start gap-3">
                             <div className="bg-blue-100 text-blue-700 p-1.5 rounded shrink-0 font-bold text-xs">止水</div>
                             <div><span className="font-bold text-slate-800">静如止水 (1次)</span><br/>使对手跳过一回合（即你可以连下两子）。<br/><span className="text-xs text-red-500">* 不可用于直接绝杀（如已有四子连珠）</span></div>
                        </div>
                        <div className="flex items-start gap-3">
                             <div className="bg-emerald-100 text-emerald-700 p-1.5 rounded shrink-0 font-bold text-xs">移形</div>
                             <div><span className="font-bold text-slate-800">移形换影 (3次)</span><br/>交换己方一子与对手一子的位置。</div>
                        </div>
                        <div className="flex items-start gap-3">
                             <div className="bg-amber-100 text-amber-700 p-1.5 rounded shrink-0 font-bold text-xs">力拔</div>
                             <div><span className="font-bold text-slate-800">力拔山兮 (1次)</span><br/>掀翻棋盘，直接判胜（双方玩家均可使用）。</div>
                        </div>
                        <div className="flex items-start gap-3 border-t pt-3">
                             <div className="bg-purple-100 text-purple-700 p-1.5 rounded shrink-0 font-bold text-xs">东山</div>
                             <div><span className="font-bold text-slate-800">东山再起 (被动)</span><br/>困难AI或拥有此技能的对手，在遭遇“力拔山兮”时自动触发，抵消判胜并继续游戏。</div>
                        </div>
                    </div>
                </div>
                <button onClick={() => setShowRules(false)} className="mt-8 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                    开始战斗
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;