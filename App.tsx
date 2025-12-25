
import React, { useState, useEffect } from 'react';
import Editor from './components/Editor';
import CameraPreview from './components/CameraPreview';
import MascotTeacher from './components/MascotTeacher';

const MISSIONS = [
  { 
    id: 0, 
    target: 'from magic_ai import Pen', 
    hint: '# 1. 召唤魔法库\nfrom magic_ai import Pen', 
    dialogue: '嗨！我是 Sparky。首先，我们要从魔法书里借出【Pen】这个咒语！',
    success: '嘿！魔法库连接成功了！'
  },
  { 
    id: 1, 
    target: 'my_pen = Pen.start()', 
    hint: '# 2. 创建你的魔法画笔\nmy_pen = Pen.start()', 
    dialogue: '现在，我们需要通过 Pen.start() 来唤醒你的第一支【魔法画笔对象】。',
    success: '太棒了！你的画笔已经在内存里睁开眼啦！'
  },
  { 
    id: 2, 
    target: 'my_pen.go()', 
    hint: '# 3. 启动魔法引擎\nmy_pen.go()', 
    dialogue: '还没看到画面？输入 go() 后点击右下角的【运行代码】，看看摄像头发光了吗？',
    success: '魔法引擎全功率运转！我看到你啦！'
  },
  { 
    id: 3, 
    target: 'my_pen.pose("👆", "书写")', 
    hint: '# 4. 赋予食指“书写”超能力\nmy_pen.pose("👆", "书写")', 
    dialogue: '当你竖起食指 👆 时开始书写！写完记得【运行代码】让指令生效哦！',
    success: '契约达成！食指现在就是你的画笔！',
    copyEmoji: '👆'
  },
  { 
    id: 4, 
    target: 'my_pen.pose("✌️", "粒子爆发")', 
    hint: '# 5. 赋予剪刀手“爆发”超能力\nmy_pen.pose("✌️", "粒子爆发")', 
    dialogue: '画错了就用剪刀手 ✌️ 清除吧！快输入指令并再次【运行代码】测试一下！',
    success: '轰！粒子清理器准备就绪！',
    copyEmoji: '✌️'
  },
  { 
    id: 5, 
    target: 'my_pen.color = "gold"', 
    hint: '# 6. 给笔尖染上黄金色彩\nmy_pen.color = "gold"', 
    dialogue: '把它变成金色的吧！运行代码后看看画布上的提示颜色变了吗？',
    success: '哇！这颜色真是太华丽了！'
  },
  { 
    id: 6, 
    target: 'my_pen.width = 30', 
    hint: '# 7. 设置一个霸气的笔触宽度\nmy_pen.width = 30', 
    dialogue: '最后让笔尖变粗一点。最后一次【运行代码】，开启你的魔法创作！',
    success: '完美！你已经掌握了所有的魔法指令！'
  },
];

const App: React.FC = () => {
  const [code, setCode] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [pyodide, setPyodide] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isVisualLoading, setIsVisualLoading] = useState(false);
  const [config, setConfig] = useState({
    color: 'cyan',
    size: 20,
    active: false,
    poses: {} as Record<string, string>
  });
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        // @ts-ignore
        const py = await window.loadPyodide();
        
        py.globals.set("update_config_js", (key: string, value: any) => {
          let val = value;
          if (value && typeof value.toJs === 'function') {
            val = value.toJs({ dict_converter: Object.fromEntries });
          }
          setConfig(prev => ({ ...prev, [key]: val }));
        });

        // 初始化魔法库，将 on_pose 改为 pose
        await py.runPythonAsync(`
import sys
from types import ModuleType

class Pen:
    def __init__(self):
        self._color = "cyan"
        self._width = 20
        self._poses = {}

    @property
    def color(self): return self._color

    @color.setter
    def color(self, val):
        self._color = val
        update_config_js("color", val)

    @property
    def width(self): return self._width

    @width.setter
    def width(self, val):
        self._width = int(val)
        update_config_js("size", int(val))

    def pose(self, emoji, action):
        self._poses[emoji] = action
        update_config_js("poses", self._poses)

    def go(self):
        update_config_js("active", True)

    @staticmethod
    def start():
        return Pen()

m = ModuleType("magic_ai")
m.Pen = Pen
sys.modules["magic_ai"] = m
        `);

        setPyodide(py);
        setIsInitializing(false);
      } catch (err) {
        console.error("Initialization failed", err);
      }
    }
    setup();
  }, []);

  useEffect(() => {
    if (currentStep < MISSIONS.length) {
      const mission = MISSIONS[currentStep];
      const normalizedCode = code.replace(/\s/g, '').replace(/['"]/g, '"');
      const normalizedTarget = mission.target.replace(/\s/g, '').replace(/['"]/g, '"');
      
      if (normalizedCode.includes(normalizedTarget)) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [code, currentStep]);

  const handleRun = async () => {
    if (!pyodide || !code.trim()) return;
    setIsRunning(true);
    setIsVisualLoading(true);
    
    // 强制 2s 的加载动画，提升体验
    const delay = new Promise(resolve => setTimeout(resolve, 2000));
    
    // 每次运行前重置配置，确保代码从头执行逻辑清晰
    setConfig({ color: 'cyan', size: 20, active: false, poses: {} });
    
    try {
      // 在代码末尾添加换行符，防止部分语法在 Pyodide 下解析异常
      await pyodide.runPythonAsync(code + '\n');
    } catch (err: any) {
      // 捕获语法错误或其他 Python 异常，不中断 JS 流程
      console.warn("Python Spell Error:", err.message);
    }
    
    await delay;
    setIsRunning(false);
    setIsVisualLoading(false);
  };

  const handleReset = () => {
    setCode('');
    setCurrentStep(0);
    setConfig({ color: 'cyan', size: 20, active: false, poses: {} });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      const lines = code.trim().split('\n');
      if (lines.length > 0) {
        lines.pop();
        setCode(lines.join('\n') + (lines.length > 0 ? '\n' : ''));
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-screen md:flex-row bg-[#020617] font-sans text-slate-200 overflow-hidden">
      {/* 侧边：控制面板 */}
      <div className="w-full md:w-[480px] flex flex-col bg-[#0f172a]/95 border-r border-indigo-500/20 backdrop-blur-2xl z-30 shadow-2xl">
        <header className="p-8 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
              {/* 修改标题为 Python魔法实验室 */}
              <h1 className="text-xl font-black text-white tracking-widest uppercase">Python魔法实验室</h1>
              <div className="flex gap-1 mt-1">
                {[...Array(MISSIONS.length)].map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i < currentStep ? 'w-4 bg-indigo-500' : 'w-2 bg-white/10'}`}></div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 flex flex-col gap-6">
          {/* 动漫导师对话区 */}
          <MascotTeacher 
            message={currentStep < MISSIONS.length ? MISSIONS[currentStep].dialogue : "所有咒语已就绪，快去创造属于你的魔法吧！"} 
            isSuccess={currentStep > 0}
            successMsg={currentStep > 0 ? MISSIONS[currentStep - 1].success : ""}
            step={currentStep}
          />

          {/* 编辑器 */}
          <div className="flex-1 rounded-[2.5rem] bg-slate-900/50 border border-white/5 flex flex-col shadow-inner overflow-hidden relative">
            <div className="bg-slate-800/50 px-6 py-3 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  {/* 去掉文件名 magic_canvas.py，保留复制按钮 */}
                  {currentStep < MISSIONS.length && MISSIONS[currentStep].copyEmoji && (
                    <button 
                      onClick={() => copyToClipboard(MISSIONS[currentStep].copyEmoji!)}
                      className={`text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/40 transition-all flex items-center gap-1 animate-in fade-in zoom-in duration-300`}
                    >
                      {copySuccess ? '已复制 ✨' : `点击复制表情: ${MISSIONS[currentStep].copyEmoji}`}
                    </button>
                  )}
               </div>
               <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
               </div>
            </div>
            <Editor 
              value={code} 
              onChange={setCode} 
              ghostText={currentStep < MISSIONS.length ? MISSIONS[currentStep].hint : ''}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-8 flex gap-3">
           <button 
             onClick={handleBack} 
             disabled={currentStep === 0}
             className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors group disabled:opacity-30 disabled:cursor-not-allowed"
             title="回到上一步"
           >
              <svg className="w-5 h-5 text-slate-400 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
           </button>
           <button 
             onClick={handleReset} 
             className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors group"
             title="重置全部"
           >
              <svg className="w-5 h-5 text-slate-400 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
           </button>
           <button 
             onClick={handleRun}
             disabled={isInitializing || isRunning}
             className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
           >
             {isRunning ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
             {isRunning ? "正在释放魔法..." : "运行代码"}
           </button>
        </div>
      </div>

      {/* 右侧：画布 */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <CameraPreview config={{ ...config, isRunning: config.active }} />
        
        {/* 加载动画覆盖层 */}
        {isVisualLoading && (
          <div className="absolute inset-0 z-50 bg-[#020617]/60 backdrop-blur-sm flex items-center justify-center">
             <div className="flex flex-col items-center gap-4">
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                   </div>
                </div>
                <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">释放魔法指令中...</span>
             </div>
          </div>
        )}

        {!config.active && !isVisualLoading && (
           <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-12">
              <div className="max-w-md text-center">
                 <div className="w-24 h-24 bg-indigo-500/10 rounded-full border border-indigo-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
                    <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                 </div>
                 <h2 className="text-3xl font-black text-white mb-4 italic tracking-wider">等待激活魔法</h2>
                 <p className="text-slate-400 font-mono text-sm leading-relaxed">
                   小魔法师，请根据 Sparky 的提示编写代码。<br/>
                   一旦你输入了 <span className="text-indigo-400">my_pen.go()</span> 并点击运行，这里就会展现奇迹！
                 </p>
              </div>
           </div>
        )}

        {/* HUD UI */}
        {config.active && !isVisualLoading && (
           <div className="absolute inset-0 pointer-events-none p-12 flex flex-col justify-between">
              <div className="flex items-center gap-6 px-8 py-4 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full self-start shadow-2xl">
                 <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.color, boxShadow: `0 0 20px ${config.color}` }}></div>
                 <div className="h-4 w-px bg-white/20"></div>
                 <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Active Matrix</span>
              </div>
              <div className="flex gap-4">
                 {Object.entries(config.poses).map(([emoji, action]) => (
                   <div key={emoji} className="bg-black/50 backdrop-blur-xl border border-white/5 px-6 py-4 rounded-3xl flex items-center gap-4 animate-in slide-in-from-bottom duration-500">
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{action}</span>
                   </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default App;
