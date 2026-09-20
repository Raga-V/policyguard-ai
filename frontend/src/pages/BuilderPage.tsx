import React, { useState } from 'react';
import { Shield, Check, Loader2, AlertTriangle, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient, AgentResponse } from '../api/client';
import PolicyPreview from '../components/PolicyPreview';

interface BuilderPageProps {
  onDeploy: () => void;
}

const TOOLS = [
  { id: 'read_file', label: '📁 File Read' },
  { id: 'write_file', label: '✏️ File Write' },
  { id: 'http_get', label: '🌐 HTTP GET' },
  { id: 'http_post', label: '📤 HTTP POST' },
  { id: 'sql_query', label: '🗄️ SQL Query' },
  { id: 'run_command', label: '⚙️ Shell Command' },
];

export default function BuilderPage({ onDeploy }: BuilderPageProps) {
  const [description, setDescription] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [resourcesOpen, setResourcesOpen] = useState(true);
  const [scopes, setScopes] = useState({
    filePaths: '',
    endpoints: '',
    databases: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewAgent, setPreviewAgent] = useState<AgentResponse | null>(null);

  const handleGenerate = async () => {
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
    } catch (err: any) {
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = () => {
    // In a real app, you might save it here. Our createAgent already "saved" it, so just redirect.
    onDeploy();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Form */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 bg-gray-800/50">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span>Agent Definition</span>
          </h2>
        </div>
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Natural Language Description</label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={5}
              placeholder="Describe what your AI agent should do...&#10;&#10;Example: Read PDF invoices from /data/invoices, extract the total amount and vendor name from each, then write a summary CSV to /data/reports/"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Allowed Tools</label>
            <div className="grid grid-cols-2 gap-3">
              {TOOLS.map(tool => (
                <label key={tool.id} className="flex items-center space-x-3 p-3 bg-gray-900 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-800 transition">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-500 rounded border-gray-600 bg-gray-800 focus:ring-blue-500 focus:ring-offset-gray-900"
                    checked={selectedTools.includes(tool.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTools([...selectedTools, tool.id]);
                      else setSelectedTools(selectedTools.filter(t => t !== tool.id));
                    }}
                  />
                  <span className="text-sm">{tool.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-800 transition text-sm font-medium text-gray-300"
            >
              <span>Resource Scopes</span>
              {resourcesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {resourcesOpen && (
              <div className="p-4 space-y-4 bg-gray-900">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Allowed File Paths (comma-separated globs)</label>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. /data/invoices/*.pdf, /data/reports/*"
                    value={scopes.filePaths}
                    onChange={e => setScopes({ ...scopes, filePaths: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Allowed Endpoints (comma-separated URLs)</label>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. https://api.vendor.com/v1/*"
                    value={scopes.endpoints}
                    onChange={e => setScopes({ ...scopes, endpoints: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Allowed Databases</label>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. sales_db, audit_db"
                    value={scopes.databases}
                    onChange={e => setScopes({ ...scopes, databases: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            <span>Generate Agent Config</span>
          </button>
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-500/50 text-red-200 text-sm rounded-lg flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Preview */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden flex flex-col h-full min-h-[600px]">
        <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <Play className="w-5 h-5 text-purple-400" />
            <span>Agent Preview</span>
          </h2>
          {previewAgent && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">
              Ready to Deploy
            </span>
          )}
        </div>
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {!previewAgent ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <Shield className="w-16 h-16 opacity-20" />
              <p>Configure and generate an agent to see the preview here.</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-white">{previewAgent.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{previewAgent.description}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className="inline-flex items-center space-x-1 bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-md border border-blue-500/30">
                      <span>Trust Lvl:</span>
                      <strong className="font-bold">3</strong>
                    </span>
                    <span className="inline-flex items-center space-x-1 bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-md border border-amber-500/30">
                      <span>Sensitivity: High</span>
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Generated Cedar Policy</h4>
                  <div className="rounded-lg overflow-hidden border border-gray-700">
                    <PolicyPreview policyText={previewAgent.policy_text} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {previewAgent && (
          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <button
              onClick={handleDeploy}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-lg font-medium transition shadow-lg shadow-blue-500/20"
            >
              <Check className="w-5 h-5" />
              <span>Deploy Agent Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
