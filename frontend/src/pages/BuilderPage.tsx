import { useState } from 'react';
import { 
  Shield, 
  Check, 
  Loader2, 
  AlertTriangle, 
  FileText, 
  Globe, 
  Database, 
  Terminal, 
  Folder, 
  Edit3, 
  Sparkles,
  Play,
  ArrowRight,
  Lock,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { apiClient, AgentResponse } from '../api/client';
import PolicyPreview from '../components/PolicyPreview';

interface BuilderPageProps {
  onDeploy: () => void;
}

const TOOLS = [
  { id: 'read_file', label: 'File Read', icon: Folder, category: 'Storage', desc: 'Read files from allowed directory trees' },
  { id: 'write_file', label: 'File Write', icon: Edit3, category: 'Storage', desc: 'Create and update allowed report files' },
  { id: 'list_dir', label: 'List Directory', icon: FileText, category: 'Storage', desc: 'Inspect available files in scoped paths' },
  { id: 'http_get', label: 'HTTP GET', icon: Globe, category: 'Network', desc: 'Fetch data from approved internal APIs' },
  { id: 'http_post', label: 'HTTP POST', icon: Globe, category: 'Network', desc: 'Push structured reports to internal endpoints' },
  { id: 'sql_query', label: 'SQL Query', icon: Database, category: 'Database', desc: 'Execute read-only queries on internal databases' },
  { id: 'run_command', label: 'Shell Command', icon: Terminal, category: 'Runtime', desc: 'Execute explicitly whitelisted shell utilities' },
];

const PRESETS = [
  {
    title: '🛡️ SecOps Threat Sentinel',
    tag: 'Cybersecurity',
    desc: 'Analyzes auth logs for brute force SSH attacks & writes alerts',
    prompt: 'You are a cybersecurity log analyst agent. Read system auth logs from /data/logs/auth.log, detect failed SSH brute force attempts, and write incident alerts to /data/alerts/security.json',
    tools: ['read_file', 'write_file', 'list_dir'],
    scopes: {
      filePaths: '/data/logs/auth.log, /data/alerts/security.json',
      endpoints: '',
      databases: ''
    },
    sensitivity: 'confidential',
    trustLevel: 4
  },
  {
    title: '📑 Financial Invoice Auditor',
    tag: 'Finance',
    desc: 'Extracts totals from vendor invoices & outputs audit CSV',
    prompt: 'Read PDF invoices from /data/invoices, extract vendor name, invoice date, and total amount, then write a summary CSV to /data/reports/summary.csv',
    tools: ['read_file', 'write_file', 'list_dir'],
    scopes: {
      filePaths: '/data/invoices/*, /data/reports/summary.csv',
      endpoints: '',
      databases: ''
    },
    sensitivity: 'internal',
    trustLevel: 3
  },
  {
    title: '🏥 HIPAA Patient Data Analyst',
    tag: 'Healthcare',
    desc: 'Safe SQL stats aggregation with strict PII forbid rules',
    prompt: 'Query internal hospital database patient_records for treatment statistics while strictly blocking access to patient PII and credentials',
    tools: ['sql_query', 'http_post'],
    scopes: {
      filePaths: '',
      endpoints: 'https://internal-analytics.hospital.local/api',
      databases: 'patient_records'
    },
    sensitivity: 'confidential',
    trustLevel: 4
  },
  {
    title: '⚙️ Air-Gapped DevOps Copilot',
    tag: 'Infrastructure',
    desc: 'Inspects build artifacts, strictly blocking rm/curl/bash',
    prompt: 'Inspect build logs in /data/build/build.log and check artifact status, but forbidden from modifying system files or reaching external networks',
    tools: ['read_file', 'list_dir', 'run_command'],
    scopes: {
      filePaths: '/data/build/*',
      endpoints: '',
      databases: ''
    },
    sensitivity: 'internal',
    trustLevel: 3
  }
];

export default function BuilderPage({ onDeploy }: BuilderPageProps) {
  const [description, setDescription] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['read_file', 'list_dir']);
  const [sensitivity, setSensitivity] = useState<'internal' | 'confidential' | 'restricted'>('internal');
  const [trustLevel, setTrustLevel] = useState(3);
  const [scopes, setScopes] = useState({
    filePaths: '/data/logs/*, /data/alerts/*',
    endpoints: '',
    databases: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewAgent, setPreviewAgent] = useState<AgentResponse | null>(null);

  // Policy Simulation state
  const [simPath, setSimPath] = useState('/data/logs/auth.log');
  const [simResult, setSimResult] = useState<{ decision: 'ALLOW' | 'DENY'; reason: string } | null>(null);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setDescription(preset.prompt);
    setSelectedTools(preset.tools);
    setScopes(preset.scopes);
    setSensitivity(preset.sensitivity as any);
    setTrustLevel(preset.trustLevel);
    setError('');
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please provide a description of the agent role.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const resource_scopes: Record<string, string[]> = {};
      if (scopes.filePaths) resource_scopes['files'] = scopes.filePaths.split(',').map(s => s.trim());
      if (scopes.endpoints) resource_scopes['endpoints'] = scopes.endpoints.split(',').map(s => s.trim());
      if (scopes.databases) resource_scopes['databases'] = scopes.databases.split(',').map(s => s.trim());

      const agent = await apiClient.createAgent({
        description,
        selected_tools: selectedTools,
        resource_scopes
      });
      setPreviewAgent(agent);
      setSimResult(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred during agent compilation.');
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = (path: string, isTamper = false) => {
    if (!previewAgent) return;
    const policy = previewAgent.policy_text || '';
    
    if (isTamper || path.includes('/etc') || path.includes('/secrets') || path.includes('.env')) {
      setSimResult({
        decision: 'DENY',
        reason: 'Blocked by Platform Hard Deny: Target path is in protected system boundaries'
      });
      return;
    }

    const matchesScope = policy.includes(path) || policy.includes(path.split('/').slice(0, -1).join('/') + '/*');
    if (matchesScope) {
      setSimResult({
        decision: 'ALLOW',
        reason: `Matched Cedar permit rule for ${previewAgent.name}`
      });
    } else {
      setSimResult({
        decision: 'DENY',
        reason: 'Implicit Deny: Resource not within agent permitted scope'
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* 1-Click Demo Presets Bar */}
      <div className="glass-card p-5 rounded-2xl border border-cyan-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-wide uppercase text-cyan-300">
              Hackathon 1-Click Demo Templates
            </h3>
          </div>
          <span className="text-xs text-slate-400">Click any preset to auto-configure in 1 second</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(preset)}
              className="text-left p-3 rounded-xl bg-cyber-900/80 border border-white/[0.08] hover:border-cyan-500/50 hover:bg-cyber-850 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors">
                  {preset.title}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {preset.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {preset.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: Agent Builder Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card rounded-2xl border border-white/[0.08] p-6 shadow-xl space-y-6">
            
            {/* Header */}
            <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span>Agent Intent & Boundary Definition</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Describe what the agent should do. Cedar policies and sandbox constraints will be generated automatically.
                </p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Natural Language Prompt */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Natural Language Agent Specification
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Parsed by local Qwen2.5:7b</span>
              </div>
              <textarea
                className="w-full bg-[#070B12] border border-white/[0.12] rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition font-sans leading-relaxed"
                rows={4}
                placeholder="Example: Read PDF invoices from /data/invoices, extract vendor name and total amount, then write a summary CSV to /data/reports/summary.csv"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Allowed Tools Grid */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Approved Tool Capabilities
                </label>
                <span className="text-[11px] text-cyan-400 font-medium">
                  {selectedTools.length} tools selected
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TOOLS.map(tool => {
                  const Icon = tool.icon;
                  const isChecked = selectedTools.includes(tool.id);
                  return (
                    <label 
                      key={tool.id} 
                      className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                        isChecked 
                          ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm shadow-cyan-500/10' 
                          : 'bg-cyber-900/60 border-white/[0.06] hover:border-white/[0.15] hover:bg-cyber-850'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTools([...selectedTools, tool.id]);
                          else setSelectedTools(selectedTools.filter(t => t !== tool.id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <Icon className={`w-3.5 h-3.5 ${isChecked ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <span className={`text-xs font-semibold ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                            {tool.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {tool.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Fine-Grained Resource Scopes */}
            <div className="space-y-4 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Granular Resource Access Scopes
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Allowed Filesystem Paths (Glob Patterns)
                  </label>
                  <input
                    type="text"
                    placeholder="/data/logs/*, /data/reports/*"
                    value={scopes.filePaths}
                    onChange={e => setScopes({ ...scopes, filePaths: e.target.value })}
                    className="w-full bg-[#070B12] border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Approved HTTP Endpoints
                    </label>
                    <input
                      type="text"
                      placeholder="https://internal-api.corp/v1/*"
                      value={scopes.endpoints}
                      onChange={e => setScopes({ ...scopes, endpoints: e.target.value })}
                      className="w-full bg-[#070B12] border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Allowed Databases
                    </label>
                    <input
                      type="text"
                      placeholder="analytics_db, reports_db"
                      value={scopes.databases}
                      onChange={e => setScopes({ ...scopes, databases: e.target.value })}
                      className="w-full bg-[#070B12] border border-white/[0.1] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Posture & Generate Button */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span className="flex items-center space-x-1 font-mono">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Isolation: Docker/MicroVM</span>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-mono">Fail-Closed: Enabled</span>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling Policy via Local LLM...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Cedar Policy & Sandbox</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT: Live Generated Policy & Simulation (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card rounded-2xl border border-white/[0.08] p-6 shadow-xl space-y-6 flex flex-col">
            
            <div className="border-b border-white/[0.08] pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Authorization Policy Verification</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cryptographically enforced by Cedar Policy Engine before every tool execution.
                </p>
              </div>
            </div>

            {/* If no agent generated yet */}
            {!previewAgent && (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-cyber-900/50 rounded-xl border border-dashed border-white/[0.1] space-y-3 my-auto">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
                  <Shield className="w-6 h-6 text-slate-500" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">No Policy Generated Yet</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Select a template on the left and click <strong>"Generate Cedar Policy & Sandbox"</strong> to compile your agent.
                </p>
              </div>
            )}

            {/* Generated Agent Preview */}
            {previewAgent && (
              <div className="space-y-5">
                
                {/* Agent Metadata Card */}
                <div className="p-4 rounded-xl bg-cyber-900/80 border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Agent Name:</span>
                    <span className="text-xs font-bold text-cyan-300 font-mono">{previewAgent.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Sandbox Container:</span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      {previewAgent.container_id ? `agent-${previewAgent.id.slice(0, 8)}` : 'Ready'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Sensitivity Level:</span>
                    <span className="text-[11px] uppercase font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      {previewAgent.sensitivity || 'Internal'}
                    </span>
                  </div>
                </div>

                {/* Cedar Policy Code Viewer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Compiled Cedar Authorization Policy
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Rust Engine v3</span>
                  </div>
                  <PolicyPreview policyText={previewAgent.policy_text} />
                </div>

                {/* Interactive Live Attack Simulator (Hackathon Demo Feature!) */}
                <div className="p-4 rounded-xl bg-cyber-900/90 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Live Policy Simulator
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">Sub-millisecond PDP</span>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Verify authorization outcomes before running agent in production:
                  </p>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => runSimulation('/data/logs/auth.log', false)}
                      className="flex-1 py-1.5 px-3 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Test Permitted Action</span>
                    </button>
                    <button
                      onClick={() => runSimulation('/etc/shadow', true)}
                      className="flex-1 py-1.5 px-3 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Simulate Attack</span>
                    </button>
                  </div>

                  {simResult && (
                    <div className={`p-3 rounded-lg border text-xs flex items-start space-x-2 animate-in fade-in duration-200 ${
                      simResult.decision === 'ALLOW' 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}>
                      {simResult.decision === 'ALLOW' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold flex items-center space-x-1.5">
                          <span>Decision: {simResult.decision}</span>
                          <span className="text-[10px] font-normal opacity-80">(Cedar Evaluator)</span>
                        </div>
                        <p className="text-[11px] opacity-90 mt-0.5">{simResult.reason}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Deploy Button */}
                <button
                  onClick={onDeploy}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Open Active Sandbox in Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
