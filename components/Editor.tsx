
import React from 'react';

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  ghostText?: string;
}

const Editor: React.FC<EditorProps> = ({ value, onChange, ghostText }) => {
  return (
    <div className="h-full w-full relative font-mono text-sm md:text-base">
      {/* 幽灵代码引导层 */}
      <div className="absolute inset-0 p-8 pointer-events-none select-none opacity-20 whitespace-pre leading-[1.8] text-indigo-300">
        {/* 已输入的文字（保持透明以对齐） */}
        <span className="text-transparent">{value}</span>
        {/* 动态显示的虚化提示 */}
        {ghostText && !value.replace(/\s/g, '').includes(ghostText.replace(/\s/g, '').split('\n').pop() || '') && (
          <span className="animate-pulse">
            {value && !value.endsWith('\n') ? '\n' : ''}
            {ghostText}
          </span>
        )}
      </div>

      {/* 实际输入层 */}
      <textarea
        id="code-editor"
        name="code-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="relative z-10 w-full h-full bg-transparent p-8 leading-[1.8] text-indigo-50 outline-none resize-none spellcheck-false selection:bg-indigo-500/30 overflow-y-auto"
        spellCheck={false}
        placeholder=""
      />
    </div>
  );
};

export default Editor;
