"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Play, FileCode, FolderTree } from "lucide-react";

interface Props {
  projectId: string;
  agents: Array<{ id: string; name: string; role: string }>;
}

export default function CoderPanel({ projectId, agents }: Props) {
  const [selectedAgent, setSelectedAgent] = useState("");
  const [taskType, setTaskType] = useState("create_file");
  const [description, setDescription] = useState("");
  const [targetFile, setTargetFile] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runCoderTask() {
    if (!selectedAgent || !description) return;
    
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/tasks/coder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          agentId: selectedAgent,
          task: taskType,
          description,
          targetFile,
          code,
        }),
      });
      
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({ error: "İşlem başarısız" });
    } finally {
      setLoading(false);
    }
  }

  const coderAgents = agents.filter(a => 
    a.role.includes("dev") || a.role.includes("coder")
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-semibold mb-4">🤖 Coder Agent</h2>
      <p className="text-sm text-gray-400 mb-6">
        Agent'lara kod yazdır, dosya oluştur, projene entegre et.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol panel — input */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Agent Seç</label>
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Agent seç...</option>
              {coderAgents.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">İşlem Tipi</label>
            <select
              value={taskType}
              onChange={e => setTaskType(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="create_file">📄 Yeni Dosya Oluştur</option>
              <option value="update_file">✏️ Dosya Güncelle</option>
              <option value="delete_file">🗑️ Dosya Sil</option>
              <option value="refactor">🔧 Kod Refaktörü</option>
              <option value="add_feature">✨ Yeni Özellik Ekle</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">Hedef Dosya (opsiyonel)</label>
            <input
              value={targetFile}
              onChange={e => setTargetFile(e.target.value)}
              placeholder="örn: src/api/auth.ts"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">Görev Tanımı</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="örn: Kullanıcı login endpoint'i oluştur..."
              rows={4}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">Kod (opsiyonel — eklemek istediğin kod)</label>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="function login() { ... }"
              rows={6}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          
          <button
            onClick={runCoderTask}
            disabled={loading || !selectedAgent || !description}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? "Çalışıyor..." : <><Play size={14} /> Çalıştır</>}
          </button>
        </div>
        
        {/* Sağ panel — sonuç */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileCode size={14} className="text-violet-400" />
            <span className="text-xs font-medium text-gray-400">Sonuç</span>
          </div>
          
          {result ? (
            <div className="space-y-3">
              <div className="bg-gray-950 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">İşlem</p>
                <p className="text-sm text-white">{result.result?.action || "—"}</p>
              </div>
              {result.result?.filePath && (
                <div className="bg-gray-950 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Dosya</p>
                  <p className="text-sm font-mono text-green-400">{result.result.filePath}</p>
                </div>
              )}
              {result.result?.explanation && (
                <div className="bg-gray-950 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Açıklama</p>
                  <p className="text-sm text-gray-300">{result.result.explanation}</p>
                </div>
              )}
              {result.result?.content && (
                <div className="bg-gray-950 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Oluşturulan Kod</p>
                  <pre className="text-xs font-mono text-gray-300 overflow-x-auto max-h-64">
                    {result.result.content.slice(0, 1000)}
                    {result.result.content.length > 1000 && "..."}
                  </pre>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-800">
                <span>Token: {result.tokenUsed || 0}</span>
                <span>Süre: {result.durationMs || 0}ms</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-12">
              Bir görev çalıştırın, sonuç burada görünecek.
            </p>
          )}
        </div>
      </div>
      
      {/* Workspace bilgisi */}
      <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <FolderTree size={14} className="text-blue-400" />
          <span className="text-xs font-medium text-gray-400">Çalışma Dizini</span>
        </div>
        <p className="text-xs text-gray-500 font-mono">
          ./workspaces/{projectId}/
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Agent'lar tarafından oluşturulan tüm dosyalar bu dizinde saklanır.
        </p>
      </div>
    </div>
  );
}