import { useCallback, useEffect, useState } from "react";
import { UserPlus, UserMinus, Copy, Check } from "lucide-react";
import { api } from "../lib/apiClient";
import type { AppUser } from "../lib/types";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState } from "../components/EmptyState";

export default function Users() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    user?: AppUser;
    action?: "promote" | "remove";
  }>({ open: false });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ users: AppUser[] }>("/users/list");
      setUsers(data?.users ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore caricamento utenti");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async () => {
    if (!actionDialog.user || !actionDialog.action) return;
    setSaving(true);
    const uid = actionDialog.user.uid;
    try {
      if (actionDialog.action === "promote") {
        await api.post(`/users/${uid}/editor`);
        toast("Ruolo editor assegnato", "success");
      } else {
        await api.del(`/users/${uid}/editor`);
        toast("Ruolo editor rimosso", "success");
      }
      setActionDialog({ open: false });
      fetchUsers();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Errore aggiornamento ruolo", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchUsers} />;
  }

  if (users.length === 0) {
    return <EmptyState title="Nessun utente" description="Non ci sono utenti registrati" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Gestione Utenti</h2>
        <span className="text-sm text-outline">{users.length} utenti</span>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="text-outline text-[10px] font-bold uppercase tracking-widest border-b border-outline-variant/10">
              <th className="px-6 py-4">Utente</th>
              <th className="px-6 py-4">UID</th>
              <th className="px-6 py-4">Ruolo</th>
              <th className="px-6 py-4 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {users.map((u) => (
              <UserRow
                key={u.uid}
                user={u}
                onPromote={() => setActionDialog({ open: true, user: u, action: "promote" })}
                onRemove={() => setActionDialog({ open: true, user: u, action: "remove" })}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={actionDialog.open}
        title={actionDialog.action === "promote" ? "Promuovi a Editor" : "Rimuovi Editor"}
        message={
          actionDialog.action === "promote"
            ? `Assegnare il ruolo editor a ${actionDialog.user?.email}?`
            : `Rimuovere il ruolo editor da ${actionDialog.user?.email}?`
        }
        confirmLabel={actionDialog.action === "promote" ? "Promuovi" : "Rimuovi"}
        destructive={actionDialog.action === "remove"}
        loading={saving}
        onConfirm={handleAction}
        onCancel={() => setActionDialog({ open: false })}
      />
    </div>
  );
}

function UserRow({
  user,
  onPromote,
  onRemove,
}: {
  user: AppUser;
  onPromote: () => void;
  onRemove: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyUid = async () => {
    await navigator.clipboard.writeText(user.uid);
    setCopied(true);
    toast("UID copiato", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  const roleBadge = user.role === "admin"
    ? { text: "Admin", cls: "bg-amber-100 text-amber-900" }
    : user.role === "editor"
      ? { text: "Editor", cls: "bg-teal-100 text-teal-900" }
      : { text: "Nessuno", cls: "bg-stone-100 text-stone-600" };

  return (
    <tr className="hover:bg-surface-container-low transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=e2e8f0&color=475569&size=40`}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-slate-200"
          />
          <span className="text-sm font-medium text-slate-900">{user.email}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <button
          onClick={copyUid}
          className="inline-flex items-center gap-1 text-xs text-outline font-mono bg-slate-50 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
        >
          {user.uid.slice(0, 12)}…
          {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
        </button>
      </td>
      <td className="px-6 py-4">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${roleBadge.cls}`}>
          {roleBadge.text}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        {user.role === "admin" ? (
          <span className="text-xs text-outline">—</span>
        ) : user.role === "editor" ? (
          <button
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <UserMinus size={14} /> Rimuovi editor
          </button>
        ) : (
          <button
            onClick={onPromote}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <UserPlus size={14} /> Imposta editor
          </button>
        )}
      </td>
    </tr>
  );
}
