import React from 'react';
import { SkillDef, SkillType, Player } from '../types';
import { SKILLS } from '../constants';

interface SkillPanelProps {
  player: Player;
  currentPlayer: Player;
  skills: Record<SkillType, number>;
  onUseSkill: (skill: SkillType) => void;
  activeSkill: SkillType | null;
  isAiTurn: boolean;
  isAI: boolean; // New prop to determine if this panel belongs to an AI
}

const SkillPanel: React.FC<SkillPanelProps> = ({
  player,
  currentPlayer,
  skills,
  onUseSkill,
  activeSkill,
  isAiTurn,
  isAI,
}) => {
  const isMyTurn = player === currentPlayer && !isAiTurn;
  const bgClass = player === Player.Black ? 'bg-slate-800 text-white' : 'bg-white text-slate-800 border border-slate-200';
  const titleColor = player === Player.Black ? 'text-white' : 'text-slate-800';

  return (
    <div className={`flex flex-col p-4 rounded-2xl shadow-lg w-full md:w-72 ${bgClass} transition-colors duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-bold ${titleColor}`}>
          {player === Player.Black ? '玩家一 (黑)' : (isAI ? '技能五 (AI)' : '玩家二 (白)')}
        </h2>
        {player === currentPlayer && (
          <span className="relative flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        )}
      </div>
      
      <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar">
        {Object.values(SKILLS).map((skill: SkillDef) => {
          // Visibility Logic:
          // 1. If it's an AI Only skill (Dong Shan Zai Qi), only show if this IS an AI (and usually we hide AI panels controls, but for visual tracking we might show it disabled)
          //    Actually, we usually want to hide the AI's "Dong Shan Zai Qi" button from the UI entirely unless we want to show stock.
          //    Let's show it for AI but disabled.
          // 2. If it's a Player Only skill (Li Ba Shan Xi), hide if this is AI.
          
          if (skill.aiOnly && !isAI) return null; 
          if (skill.playerOnly && isAI) return null;

          const count = skills[skill.id];
          const isActive = activeSkill === skill.id;
          
          // Disable button if:
          // - Not my turn
          // - Out of charges
          // - Another skill is active
          // - It is an AI panel (user can't click AI skills)
          // - It is a passive/reaction skill (Dong Shan Zai Qi)
          const isDisabled = !isMyTurn || count <= 0 || (activeSkill !== null && !isActive) || isAI || skill.id === SkillType.DongShanZaiQi;

          return (
            <button
              key={skill.id}
              onClick={() => onUseSkill(skill.id)}
              disabled={isDisabled}
              className={`
                relative w-full text-left p-3 rounded-xl transition-all duration-200
                flex items-center justify-between group border
                ${isActive ? 'ring-2 ring-offset-1 ring-indigo-500 border-transparent' : 'border-transparent'}
                ${isDisabled ? 'opacity-60 cursor-not-allowed bg-opacity-10 bg-gray-500' : 'hover:scale-[1.02] hover:shadow-md cursor-pointer'}
                ${skill.colorClass}
                ${skill.id === SkillType.DongShanZaiQi ? 'opacity-80' : ''}
              `}
            >
              <div className="flex flex-col flex-1 mr-2">
                <span className={`font-bold text-sm ${skill.textClass}`}>{skill.name}</span>
                <span className="text-[10px] opacity-80 leading-tight mt-1">
                    {skill.description}
                </span>
              </div>
              <div className={`
                h-6 w-8 flex items-center justify-center rounded-md text-xs font-bold text-white shadow-sm
                ${skill.badgeColor}
              `}>
                {count}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SkillPanel;