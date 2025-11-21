import React from 'react';
import { CellState, InteractionState, SkillType } from '../types';
import { BOARD_SIZE } from '../constants';

export interface VFXState {
  type: SkillType | 'WIN_SHATTER';
  coords?: { r: number; c: number };
  targetCoords?: { r: number; c: number }; // For swap
}

interface BoardProps {
  board: CellState[][];
  onCellClick: (r: number, c: number) => void;
  lastMove: { r: number; c: number } | null;
  forbiddenMoves: { r: number; c: number }[];
  interactionState: InteractionState;
  vfx: VFXState | null;
}

const Board: React.FC<BoardProps> = ({
  board,
  onCellClick,
  lastMove,
  forbiddenMoves,
  interactionState,
  vfx,
}) => {
  const isForbidden = (r: number, c: number) => {
    return forbiddenMoves.some((m) => m.r === r && m.c === c);
  };

  const isSourceSelection = (r: number, c: number) => {
    return (
      interactionState.activeSkill &&
      interactionState.step === 'SELECT_TARGET' &&
      interactionState.sourceCoords?.r === r &&
      interactionState.sourceCoords?.c === c
    );
  };

  // Helper to determine cursor style based on interaction state
  const getCursorStyle = (cell: CellState, r: number, c: number) => {
    if (interactionState.activeSkill) {
      if (interactionState.activeSkill === 'FEI_SHA_ZOU_SHI') {
        return cell !== CellState.Empty ? 'cursor-crosshair' : 'cursor-not-allowed';
      }
      if (interactionState.activeSkill === 'YI_XING_HUAN_YING') {
         if (interactionState.step === 'SELECT_SOURCE') {
             return cell !== CellState.Empty ? 'cursor-pointer' : 'cursor-default';
         }
         if (interactionState.step === 'SELECT_TARGET') {
             return cell !== CellState.Empty ? 'cursor-pointer' : 'cursor-default';
         }
      }
    }
    return cell === CellState.Empty && !isForbidden(r, c) ? 'cursor-pointer' : 'cursor-default';
  };

  // VFX Helpers
  const isVFXActive = (r: number, c: number) => {
     if (!vfx) return false;
     if (vfx.type === SkillType.FeiShaZouShi && vfx.coords?.r === r && vfx.coords?.c === c) return true;
     if (vfx.type === SkillType.YiXingHuanYing && ((vfx.coords?.r === r && vfx.coords?.c === c) || (vfx.targetCoords?.r === r && vfx.targetCoords?.c === c))) return true;
     return false;
  };

  return (
    <div className={`relative p-4 bg-[#DEB887] rounded-lg shadow-xl border-4 border-[#8B4513] 
        ${vfx?.type === 'WIN_SHATTER' ? 'animate-shake-board' : ''}
    `}>
      {/* Global Effects Overlay */}
      {vfx?.type === SkillType.JingRuZhiShui && (
         <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden rounded-lg">
             <div className="w-full h-full rounded-full border-4 border-blue-400/50 animate-water-ripple bg-blue-200/20"></div>
         </div>
      )}
      {vfx?.type === 'WIN_SHATTER' && (
         <div className="absolute inset-0 z-50 pointer-events-none bg-cover opacity-30 mix-blend-overlay" 
              style={{backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDAgTDEwMCAxMDAgTTUwIDAgTDUwIDEwMCBNMCA1MCBMMTAwIDUwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=")'}}>
         </div>
      )}

      <div
        className="grid bg-[#F3DAB7] border border-[#8B4513]"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          width: 'min(100vw - 40px, 600px)',
          height: 'min(100vw - 40px, 600px)',
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              onClick={() => onCellClick(r, c)}
              className={`relative border-[0.5px] border-[#8B4513]/50 flex items-center justify-center ${getCursorStyle(cell, r, c)}`}
            >
              {/* Star Points */}
              {((r === 3 || r === 7 || r === 11) && (c === 3 || c === 7 || c === 11)) && (
                <div className="absolute w-1.5 h-1.5 bg-black rounded-full z-0" />
              )}

              {/* Pieces */}
              {cell !== CellState.Empty && (
                <div
                  className={`w-[85%] h-[85%] rounded-full shadow-md z-10 transition-all duration-200
                    ${cell === CellState.Black 
                      ? 'bg-gradient-to-br from-gray-800 to-black' 
                      : 'bg-gradient-to-br from-white to-gray-200 border border-gray-300'}
                    ${isSourceSelection(r, c) ? 'ring-4 ring-green-400 scale-110' : ''}
                    ${isVFXActive(r,c) && vfx?.type === SkillType.YiXingHuanYing ? 'animate-flash-move' : ''}
                  `}
                />
              )}

              {/* VFX: Sand / Dust */}
              {vfx?.type === SkillType.FeiShaZouShi && vfx.coords?.r === r && vfx.coords?.c === c && (
                  <div className="absolute w-full h-full z-40 animate-sand-blow">
                      <div className="w-full h-full bg-amber-600 rounded-full blur-sm opacity-60"></div>
                      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-stone-700 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
                  </div>
              )}

              {/* Forbidden Marker */}
              {isForbidden(r, c) && cell === CellState.Empty && (
                <div className="absolute w-full h-full bg-red-500/20 flex items-center justify-center z-20">
                    <span className="text-red-600 text-xs font-bold">X</span>
                </div>
              )}

              {/* Last Move Marker */}
              {lastMove?.r === r && lastMove?.c === c && (
                <div className={`absolute w-3 h-3 rounded-full z-20 ${cell === CellState.Black ? 'bg-white/50' : 'bg-black/50'}`} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Board;