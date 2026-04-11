import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Image as ImageIcon, Grid, PlusCircle, UploadCloud, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "../lib/apiClient";
import type { Section, AppUser } from "../lib/types";
import { useAuth } from "../lib/auth";

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [sections, setSections] = useState<Section[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const secData = await api.get<{ sections: Section[] }>("/section/list");
        if (!cancelled) setSections(secData?.sections ?? []);
      } catch {
        // editor might not have access
      }

      if (isAdmin) {
        try {
          const userData = await api.get<{ users: AppUser[] }>("/users/list");
          if (!cancelled) setUsers(userData?.users ?? []);
        } catch {
          // ignore
        }
      }

      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const totalPhotos = sections.reduce((sum, s) => sum + (s.photos?.length ?? 0), 0);
  const editorCount = users.filter((u) => u.role === "editor").length;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))
        ) : (
          <>
            <StatCard
              icon={<Grid className="text-primary" size={24} />}
              label="Sezioni Totali"
              value={String(sections.length)}
            />
            <StatCard
              icon={<ImageIcon className="text-primary" size={24} />}
              label="Foto Totali"
              value={String(totalPhotos)}
            />
            {isAdmin ? (
              <StatCard
                icon={<Users className="text-outline" size={24} />}
                label="Editor Attivi"
                value={String(editorCount)}
              />
            ) : (
              <StatCard
                icon={<Users className="text-outline" size={24} />}
                label="Le Tue Sezioni"
                value={String(sections.length)}
              />
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Recent Users Table (admin only) */}
        {isAdmin && (
          <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold tracking-tight">Utenti Recenti</h3>
              <button
                onClick={() => navigate("/users")}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Vedi tutti
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-outline py-4">Nessun utente trovato</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-outline text-[10px] font-bold uppercase tracking-widest border-b border-outline-variant/10">
                      <th className="pb-4">Utente</th>
                      <th className="pb-4">Ruolo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-transparent">
                    {users.slice(0, 5).map((u) => {
                      const badge = u.role === "admin"
                        ? { text: "Admin", cls: "bg-amber-100 text-amber-900" }
                        : u.role === "editor"
                          ? { text: "Editor", cls: "bg-teal-100 text-teal-900" }
                          : { text: "Nessuno", cls: "bg-stone-200 text-stone-700" };
                      return (
                        <tr key={u.uid} className="hover:bg-surface-container transition-colors">
                          <td className="py-4 rounded-l-lg pl-2">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.email)}&background=e2e8f0&color=475569&size=32`}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                              <span className="text-sm font-medium">{u.email}</span>
                            </div>
                          </td>
                          <td className="py-4 rounded-r-lg">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${badge.cls}`}>
                              {badge.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className={`${isAdmin ? "col-span-12 lg:col-span-4" : "col-span-12 lg:col-span-6"} bg-primary p-8 rounded-2xl text-white shadow-[0_12px_40px_rgba(74,44,23,0.2)] relative overflow-hidden`}>
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-6">Quick Actions</h3>
            <div className="space-y-3">
              {isAdmin && (
                <ActionButton
                  icon={<PlusCircle size={18} />}
                  label="Nuova Sezione"
                  onClick={() => navigate("/sections")}
                />
              )}
              <ActionButton
                icon={<UploadCloud size={18} />}
                label="Carica Foto"
                onClick={() => navigate("/photos")}
              />
              {isAdmin && (
                <ActionButton
                  icon={<UserPlus size={18} />}
                  label="Gestisci Utenti"
                  onClick={() => navigate("/users")}
                  primary
                />
              )}
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Sections overview (editor view uses full width) */}
        {!isAdmin && (
          <div className="col-span-12 lg:col-span-6 bg-surface-container-low rounded-2xl p-8">
            <h3 className="text-xl font-bold tracking-tight mb-6">Sezioni Disponibili</h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : sections.length === 0 ? (
              <p className="text-sm text-outline">Nessuna sezione disponibile</p>
            ) : (
              <div className="space-y-2">
                {sections.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest">
                    <span className="text-sm font-medium text-slate-900">{s.name}</span>
                    <span className="text-xs text-outline">{s.photos?.length ?? 0} foto</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-primary/5 rounded-lg">{icon}</div>
      </div>
      <p className="text-outline text-xs font-bold uppercase tracking-widest">{label}</p>
      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{value}</h3>
    </div>
  );
}

function ActionButton({ icon, label, primary, onClick }: { icon: ReactNode; label: string; primary?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
        primary
          ? "bg-primary-container text-white shadow-lg hover:scale-[0.98]"
          : "bg-white/10 hover:bg-white/20"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
