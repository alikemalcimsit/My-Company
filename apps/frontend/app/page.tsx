"use client";

import { useEffect, useState } from "react";
import { api, Project }        from "@/lib/api";
import Link                    from "next/link";
import { Plus, Layers, Bot, CheckCircle } from "lucide-react";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName,  setNewName]  = useState("");

  useEffect(() => {
    api.getProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  async function createProject() {
    if (!newName.trim()) return;
    const project = await api.createProject({
      name:    newName,
      ownerId: "test-user", // ileriki aşamada auth eklenecek
    });
    setProjects(prev => [project, ...prev]);
    setNewName("");
    setShowForm(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400 text-sm">Yükleniyor...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Bot size={16} />
          </div>
          <span className="font-semibold text-lg">AI Company</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus size={14} />
          Yeni Şirket
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">AI Şirketlerin</h1>
          <p className="text-gray-400 text-sm">Her proje bağımsız bir AI ekibi içerir.</p>
        </div>

        {/* Yeni proje formu */}
        {showForm && (
          <div className="mb-6 p-4 border border-gray-700 rounded-xl bg-gray-900">
            <p className="text-sm text-gray-400 mb-3">Yeni şirket adı</p>
            <div className="flex gap-3">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createProject()}
                placeholder="E-ticaret AI Şirketi"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
              />
              <button
                onClick={createProject}
                className="bg-violet-600 hover:bg-violet-500 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Oluştur
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white px-3 py-2 text-sm transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Proje listesi */}
        {projects.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Bot size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Henüz şirket yok. İlk AI şirketini kur.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="border border-gray-800 hover:border-gray-600 rounded-xl p-5 bg-gray-900 hover:bg-gray-800 transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-violet-900 rounded-lg flex items-center justify-center">
                      <Layers size={18} className="text-violet-400" />
                    </div>
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle size={12} />
                      Aktif
                    </span>
                  </div>
                  <h2 className="font-medium mb-1">{project.name}</h2>
                  <p className="text-xs text-gray-500">
                    {project._count?.agents ?? 0} çalışan · {project._count?.tasks ?? 0} görev
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}