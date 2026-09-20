import { useState } from 'react';
import { Copy, Check, ShieldAlert, ShieldCheck, FileCode } from 'lucide-react';

interface PolicyPreviewProps {
  policyText: string;
}

export default function PolicyPreview({ policyText }: PolicyPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(policyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlight = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    
    return lines.map((line, i) => {
      let highlightedLine = line
        // Comments
        .replace(/(\/\/.*)/g, '<span class="text-slate-500 italic">$1</span>')
        // Strings
        .replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="text-amber-300 font-medium">$&</span>')
        // Namespaces like AgentApp::Action::
        .replace(/\b(AgentApp::[A-Za-z]+)/g, '<span class="text-cyan-400 font-semibold">$1</span>')
        // Keywords
        .replace(/\b(permit)\b/g, '<span class="text-emerald-400 font-bold bg-emerald-950/40 px-1 py-0.5 rounded border border-emerald-500/30">$1</span>')
        .replace(/\b(forbid)\b/g, '<span class="text-rose-400 font-bold bg-rose-950/40 px-1 py-0.5 rounded border border-rose-500/30">$1</span>')
        .replace(/\b(when|unless|if|then|else)\b/g, '<span class="text-sky-400 font-semibold">$1</span>')
        // Scopes
        .replace(/\b(principal|action|resource|context)\b/g, '<span class="text-purple-300 font-medium">$1</span>')
        // Operators
        .replace(/(==|!=|<=|>=|&&|\|\||\bin\b|\blike\b)/g, '<span class="text-pink-400 font-semibold">$1</span>');

      return (
        <div key={i} className="table-row leading-relaxed hover:bg-white/[0.02] transition-colors">
          <span className="table-cell text-right pr-4 text-slate-600 select-none text-xs font-mono w-10 align-top pt-0.5">
            {i + 1}
          </span>
          <span 
            className="table-cell whitespace-pre font-mono text-xs text-slate-200"
            dangerouslySetInnerHTML={{ __html: highlightedLine }} 
          />
        </div>
      );
    });
  };

  const hasPermit = policyText?.includes('permit');
  const hasForbid = policyText?.includes('forbid');

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#080C14] shadow-2xl">
      {/* Code Editor Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          <div className="h-4 w-[1px] bg-slate-700/60 mx-1"></div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-200 font-medium">cedar_policy.cedar</span>
            <span className="text-slate-500 text-[10px]">· Rust PDP</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasPermit && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              <span>PERMIT</span>
            </span>
          )}
          {hasForbid && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold bg-rose-950/60 text-rose-400 border border-rose-500/30 rounded-full">
              <ShieldAlert className="w-3 h-3" />
              <span>FORBID</span>
            </span>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-700/80 px-2.5 py-1 rounded-md transition border border-slate-700/60"
            title="Copy policy to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-4 overflow-x-auto min-h-[140px] max-h-[380px] bg-[#0A0E18]">
        <div className="table border-spacing-0 w-full">
          {highlight(policyText)}
        </div>
      </div>
    </div>
  );
}
