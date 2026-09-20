import { 
  Shield, 
  Cpu, 
  Server, 
  Database, 
  ArrowRight,
  Sparkles,
  Lock
} from 'lucide-react';

export default function ArchitectureFlow() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Left: Summary Title */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white shadow-xs">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-slate-900 tracking-tight uppercase">
                Zero-Trust Hardware Pipeline
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Hardware-isolated sandbox with sub-millisecond Cedar PDP policy gate
            </div>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          
          {/* Stage 1: Local Inference */}
          <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-gradient-to-b from-blue-50/70 to-slate-50/50 border border-blue-200/80 shadow-2xs hover:border-blue-400 transition-colors">
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">1. Local LLM</div>
              <div className="text-[10px] text-blue-700 font-mono font-medium">Qwen2.5:7b Offline</div>
            </div>
          </div>

          {/* Stage 2: Policy Compiler */}
          <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-gradient-to-b from-emerald-50/70 to-slate-50/50 border border-emerald-200/80 shadow-2xs hover:border-emerald-400 transition-colors">
            <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">2. Cedar PDP</div>
              <div className="text-[10px] text-emerald-700 font-mono font-medium">Fail-Closed Gate</div>
            </div>
          </div>

          {/* Stage 3: Isolated MicroVM */}
          <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-gradient-to-b from-purple-50/70 to-slate-50/50 border border-purple-200/80 shadow-2xs hover:border-purple-400 transition-colors">
            <div className="w-7 h-7 rounded-md bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">3. MicroVM Sandbox</div>
              <div className="text-[10px] text-purple-700 font-mono font-medium">ReadOnly Seccomp</div>
            </div>
          </div>

          {/* Stage 4: Immutable Audit */}
          <div className="flex items-center space-x-2.5 p-2.5 rounded-lg bg-gradient-to-b from-amber-50/70 to-slate-50/50 border border-amber-200/80 shadow-2xs hover:border-amber-400 transition-colors">
            <div className="w-7 h-7 rounded-md bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">4. Audit Stream</div>
              <div className="text-[10px] text-amber-700 font-mono font-medium">Cryptographic Log</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

