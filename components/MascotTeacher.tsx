
import React from 'react';

interface MascotTeacherProps {
  message: string;
  isSuccess: boolean;
  successMsg: string;
  step: number;
}

const MascotTeacher: React.FC<MascotTeacherProps> = ({ message, isSuccess, successMsg, step }) => {
  return (
    <div className="flex items-start gap-5 relative">
      {/* Sparky 角色形象 */}
      <div className="flex-shrink-0 relative group">
        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-400 to-purple-500 p-0.5 shadow-xl animate-bounce-slow">
           <div className="w-full h-full bg-[#0f172a] rounded-[1.4rem] flex items-center justify-center overflow-hidden">
              {/* 这里使用 SVG 绘制一个可爱的机器人导师 */}
              <svg className="w-12 h-12 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="5" y="8" width="14" height="12" rx="3" strokeWidth="1.5" />
                <path d="M9 13H9.01M15 13H15.01" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M10 17C10 17 11 18 12 18C13 18 14 17 14 17" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 8V5M12 5L10 3M12 5L14 3" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
           </div>
        </div>
      </div>

      {/* 对话气泡 */}
      <div className="flex-1 pt-2">
        <div className="relative bg-white/5 border border-white/10 p-5 rounded-3xl rounded-tl-none shadow-xl backdrop-blur-md">
          {/* 小尖角 */}
          <div className="absolute -left-2 top-0 w-4 h-4 bg-[#0f172a] border-t border-l border-white/10 rotate-45 transform -translate-x-1/2"></div>
          
          {isSuccess && step > 0 && (
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter mb-1 animate-in fade-in slide-in-from-left duration-500">
              🎉 {successMsg}
            </div>
          )}
          
          <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
            "{message}"
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
      `}} />
    </div>
  );
};

export default MascotTeacher;
