import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Image as ImageIcon } from "lucide-react";
import { api } from "../lib/apiClient";
import type { Section } from "../lib/types";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState } from "../components/EmptyState";

export default function Sections() {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [editModal, setEditModal] = useState<{ open: boolean; section?: Section }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; section?: Section }>({ open: false });
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");

  const fetchSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ sections: Section[] }>("/section/list");
      setSections(data?.sections ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore caricamento sezioni");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const openCreate = () => {
    setFormName("");
    setEditModal({ open: true });
  };

  const openEdit = (section: Section) => {
    setFormName(section.name);
    setEditModal({ open: true, section });
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editModal.section) {
        await api.put("/section", { id: editModal.section.id, name: formName.trim() });
        toast("Sezione aggiornata", "success");
      } else {
        await api.post("/section", { name: formName.trim() });
        toast("Sezione creata", "success");
      }
      setEditModal({ open: false });
      fetchSections();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Errore salvataggio", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.section) return;
    setSaving(true);
    try {
      await api.del(`/section/${deleteDialog.section.id}`);
      toast("Sezione eliminata", "success");
      setDeleteDialog({ open: false });
      fetchSections();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Errore eliminazione", "error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = sections.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

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
    return <ErrorState message={error} onRetry={fetchSections} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca sezione…"
            className="pl-9 pr-4 py-2.5 rounded-lg bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-primary/20 w-64"
          />
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-br from-primary to-primary-container text-white text-sm font-semibold shadow-[0_4px_14px_rgba(74,44,23,0.2)] hover:opacity-90 transition-all active:scale-95"
        >
          <Plus size={18} /> Nuova Sezione
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nessuna sezione"
          description={search ? "Nessun risultato per la ricerca" : "Crea la prima sezione per iniziare"}
          action={!search ? { label: "Nuova Sezione", onClick: openCreate } : undefined}
        />
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="text-outline text-[10px] font-bold uppercase tracking-widest border-b border-outline-variant/10">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Foto</th>
                <th className="px-6 py-4">Creata il</th>
                <th className="px-6 py-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">#{s.id}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{s.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-outline">
                      <ImageIcon size={14} /> {s.photos?.length ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-outline">
                    {new Date(s.created_at).toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 rounded-lg text-outline hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteDialog({ open: true, section: s })}
                        className="p-2 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editModal.open}
        title={editModal.section ? "Modifica Sezione" : "Nuova Sezione"}
        onClose={() => setEditModal({ open: false })}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">
              Nome sezione
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="es. wedding, portrait…"
              className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditModal({ open: false })}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {saving ? "Salvataggio…" : editModal.section ? "Aggiorna" : "Crea"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Elimina Sezione"
        message={`Sei sicuro di voler eliminare la sezione "${deleteDialog.section?.name}"? Questa azione potrebbe impattare le foto collegate.`}
        confirmLabel="Elimina"
        destructive
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false })}
      />
    </div>
  );
}
