import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Edit2, Trash2, RefreshCw, LayoutGrid, List, GripVertical } from "lucide-react";
import { api } from "../lib/apiClient";
import { cn, photoUrl } from "../lib/utils";
import type { Photo, Section } from "../lib/types";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState } from "../components/EmptyState";

export default function Photos() {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  const [uploadModal, setUploadModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; photo?: Photo }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; photo?: Photo }>({ open: false });
  const [resetDialog, setResetDialog] = useState<{ open: boolean; photo?: Photo }>({ open: false });
  const [saving, setSaving] = useState(false);

  // Drag & drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const fetchSections = useCallback(async () => {
    try {
      const data = await api.get<{ sections: Section[] }>("/section/list");
      const list = data?.sections ?? [];
      setSections(list);
      if (list.length > 0 && selectedSectionId === null) {
        setSelectedSectionId(list[0].id);
      }
    } catch {
      // sections may fail if user is editor without section read
    }
  }, [selectedSectionId]);

  const fetchPhotos = useCallback(async () => {
    if (selectedSectionId === null) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ photos: Photo[] }>(`/photo/list?section_id=${selectedSectionId}`);
      setPhotos(data?.photos ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Errore caricamento foto");
    } finally {
      setLoading(false);
    }
  }, [selectedSectionId]);

  useEffect(() => { fetchSections(); }, [fetchSections]);
  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // --- Drag & drop handlers ---
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (idx !== overIdx) setOverIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleDrop = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx || !selectedSectionId) {
      handleDragEnd();
      return;
    }

    const draggedPhoto = photos[dragIdx];
    const targetPhoto = photos[targetIdx];
    if (!draggedPhoto || !targetPhoto) { handleDragEnd(); return; }

    const newPosition = targetPhoto.position;

    // Optimistic reorder
    const reordered = [...photos];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setPhotos(reordered);
    handleDragEnd();

    try {
      const fd = new FormData();
      fd.append("id", String(draggedPhoto.id));
      fd.append("section_id", String(selectedSectionId));
      fd.append("position", String(newPosition));
      await api.putForm("/photo", fd);
      toast("Ordine aggiornato", "success");
      fetchPhotos();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Errore riordino", "error");
      fetchPhotos();
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.photo) return;
    setSaving(true);
    try {
      await api.del(`/photo/${deleteDialog.photo.id}`);
      toast("Foto eliminata", "success");
      setDeleteDialog({ open: false });
      fetchPhotos();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Errore eliminazione", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!resetDialog.photo) return;
    setSaving(true);
    try {
      await api.put(`/photo/${resetDialog.photo.id}/reset`);
      toast("Path ripristinato", "success");
      setResetDialog({ open: false });
      fetchPhotos();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Errore reset", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface-container-low rounded-lg p-1">
            <button
              onClick={() => setView("grid")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                view === "grid" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-outline hover:bg-surface-container-high"
              }`}
            >
              <LayoutGrid size={14} className="inline mr-1" />Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                view === "list" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-outline hover:bg-surface-container-high"
              }`}
            >
              <List size={14} className="inline mr-1" />List
            </button>
          </div>
          <select
            value={selectedSectionId ?? ""}
            onChange={(e) => setSelectedSectionId(Number(e.target.value) || null)}
            className="bg-surface-container-low border-none text-outline text-xs font-medium py-2.5 px-4 rounded-lg focus:ring-0 cursor-pointer outline-none"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setUploadModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-br from-primary to-primary-container text-white text-sm font-semibold shadow-[0_4px_14px_rgba(74,44,23,0.2)] hover:opacity-90 transition-all active:scale-95"
        >
          <Upload size={18} /> Carica Nuova Foto
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-3"}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={view === "grid" ? "aspect-[4/5] bg-slate-100 rounded-2xl animate-pulse" : "h-20 bg-slate-100 rounded-xl animate-pulse"} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchPhotos} />
      ) : photos.length === 0 ? (
        <EmptyState
          title="Nessuna foto in questa sezione"
          description="Carica la prima foto per iniziare"
          action={{ label: "Carica Foto", onClick: () => setUploadModal(true) }}
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {photos.map((photo, idx) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isDragging={dragIdx === idx}
              isOver={overIdx === idx}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(idx)}
              onEdit={() => setEditModal({ open: true, photo })}
              onDelete={() => setDeleteDialog({ open: true, photo })}
              onReset={() => setResetDialog({ open: true, photo })}
            />
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="text-outline text-[10px] font-bold uppercase tracking-widest border-b border-outline-variant/10">
                <th className="px-3 py-4 w-10"></th>
                <th className="px-4 py-4">Anteprima</th>
                <th className="px-4 py-4">Posizione</th>
                <th className="px-4 py-4">Alt Text</th>
                <th className="px-4 py-4">Aggiornata</th>
                <th className="px-4 py-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {photos.map((photo, idx) => (
                <tr
                  key={photo.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(idx)}
                  className={cn(
                    "transition-colors",
                    dragIdx === idx ? "opacity-40" : "hover:bg-surface-container-low",
                    overIdx === idx && dragIdx !== idx ? "ring-2 ring-primary/30 ring-inset" : "",
                  )}
                >
                  <td className="px-3 py-3">
                    <GripVertical size={16} className="text-outline/40 cursor-grab active:cursor-grabbing" />
                  </td>
                  <td className="px-4 py-3">
                    <img src={photoUrl(photo.path)} alt={photo.altText} className="w-14 h-14 rounded-lg object-cover" />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">#{photo.position}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 max-w-xs truncate">{photo.altText || "—"}</td>
                  <td className="px-4 py-3 text-sm text-outline">{new Date(photo.updated_at).toLocaleDateString("it-IT")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditModal({ open: true, photo })} className="p-2 rounded-lg text-outline hover:text-primary hover:bg-primary/5 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setResetDialog({ open: true, photo })} className="p-2 rounded-lg text-outline hover:text-amber-600 hover:bg-amber-50 transition-colors">
                        <RefreshCw size={16} />
                      </button>
                      <button onClick={() => setDeleteDialog({ open: true, photo })} className="p-2 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 transition-colors">
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

      {/* Upload Modal */}
      <UploadPhotoModal
        open={uploadModal}
        sections={sections}
        defaultSectionId={selectedSectionId}
        currentPhotos={photos}
        onClose={() => setUploadModal(false)}
        onSuccess={() => {
          setUploadModal(false);
          fetchPhotos();
        }}
      />

      {/* Edit Modal */}
      <EditPhotoModal
        open={editModal.open}
        photo={editModal.photo}
        sections={sections}
        onClose={() => setEditModal({ open: false })}
        onSuccess={() => {
          setEditModal({ open: false });
          fetchPhotos();
        }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Elimina Foto"
        message="Sei sicuro di voler eliminare questa foto? Il file verrà rimosso definitivamente."
        confirmLabel="Elimina"
        destructive
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false })}
      />

      {/* Reset Confirm */}
      <ConfirmDialog
        open={resetDialog.open}
        title="Reset Path"
        message="Vuoi ripristinare il path originale di questa foto?"
        confirmLabel="Ripristina"
        loading={saving}
        onConfirm={handleReset}
        onCancel={() => setResetDialog({ open: false })}
      />
    </div>
  );
}

// ----- Sub-components -----

function PhotoCard({
  photo,
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onEdit,
  onDelete,
  onReset,
}: {
  photo: Photo;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={cn(
        "group relative flex flex-col bg-surface-container-low rounded-2xl overflow-hidden transition-all shadow-sm cursor-grab active:cursor-grabbing",
        isDragging ? "opacity-40 scale-95" : "hover:bg-surface-container-lowest hover:shadow-[0_12px_40px_rgba(74,44,23,0.06)]",
        isOver && !isDragging ? "ring-2 ring-primary/40 scale-[1.02]" : "",
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={photoUrl(photo.path)}
          alt={photo.altText}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          draggable={false}
        />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="bg-primary/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded">
            #{photo.position}
          </span>
        </div>
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm">
            <GripVertical size={16} className="text-slate-500" />
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div>
          <p className="text-[10px] text-outline font-bold uppercase tracking-widest mb-1">Alt Text</p>
          <p className="text-sm font-medium text-slate-900 line-clamp-1">{photo.altText || "—"}</p>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-2 hover:bg-surface-container rounded-lg text-outline transition-colors"><Edit2 size={16} /></button>
            <button onClick={onReset} className="p-2 hover:bg-surface-container rounded-lg text-outline transition-colors"><RefreshCw size={16} /></button>
          </div>
          <button onClick={onDelete} className="p-2 hover:bg-red-50 rounded-lg text-error transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>
    </div>
  );
}

function UploadPhotoModal({
  open,
  sections,
  defaultSectionId,
  currentPhotos,
  onClose,
  onSuccess,
}: {
  open: boolean;
  sections: Section[];
  defaultSectionId: number | null;
  currentPhotos: Photo[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sectionId, setSectionId] = useState<number>(defaultSectionId ?? 0);
  const [photoName, setPhotoName] = useState("");
  const [altText, setAltText] = useState("");
  const [position, setPosition] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setSectionId(defaultSectionId ?? sections[0]?.id ?? 0);
      setPhotoName("");
      setAltText("");
      const maxPos = currentPhotos.reduce((max, p) => Math.max(max, p.position), 0);
      setPosition(String(maxPos + 1));
    }
  }, [open, defaultSectionId, sections, currentPhotos]);

  const handleSubmit = async () => {
    if (!file || !sectionId) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("section_id", String(sectionId));
      if (photoName.trim()) fd.append("photo_name", photoName.trim());
      if (altText.trim()) fd.append("alt_text", altText.trim());
      const pos = Number(position);
      fd.append("position", String(pos >= 1 ? pos : 1));

      await api.postForm("/photo", fd);
      toast("Foto caricata", "success");
      onSuccess();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Errore caricamento", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Carica Nuova Foto" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">File immagine *</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/5 file:text-primary hover:file:bg-primary/10" />
        </div>
        <div>
          <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Sezione *</label>
          <select value={sectionId} onChange={(e) => setSectionId(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20">
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Nome personalizzato</label>
          <input type="text" value={photoName} onChange={(e) => setPhotoName(e.target.value)} placeholder="Lascia vuoto per nome originale" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Posizione</label>
            <input type="number" min={1} value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Alt Text</label>
            <input type="text" value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Descrizione" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Annulla</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !file || !sectionId} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-container transition-colors disabled:opacity-50">
            {saving ? "Caricamento…" : "Carica"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditPhotoModal({
  open,
  photo,
  sections,
  onClose,
  onSuccess,
}: {
  open: boolean;
  photo?: Photo;
  sections: Section[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sectionId, setSectionId] = useState<number>(0);
  const [photoName, setPhotoName] = useState("");
  const [altText, setAltText] = useState("");
  const [position, setPosition] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && photo) {
      setFile(null);
      setAltText(photo.altText ?? "");
      setPosition(String(photo.position));
      setPhotoName("");
      const normalized = photo.path.replace(/\\/g, "/");
      const sectionFromPath = sections.find((s) => normalized.includes(`/${s.name}/`));
      setSectionId(sectionFromPath?.id ?? sections[0]?.id ?? 0);
    }
  }, [open, photo, sections]);

  const handleSubmit = async () => {
    if (!photo || !sectionId) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("id", String(photo.id));
      fd.append("section_id", String(sectionId));
      if (altText.trim()) fd.append("alt_text", altText.trim());
      if (position && Number(position) >= 1) fd.append("position", position);
      if (file) {
        fd.append("photo", file);
        if (photoName.trim()) fd.append("photo_name", photoName.trim());
      }

      await api.putForm("/photo", fd);
      toast("Foto aggiornata", "success");
      onSuccess();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Errore aggiornamento", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!photo) return null;

  return (
    <Modal open={open} title="Modifica Foto" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-center">
          <img src={photoUrl(photo.path)} alt={photo.altText} className="w-32 h-32 object-cover rounded-xl" />
        </div>
        <div>
          <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Sostituisci file</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/5 file:text-primary hover:file:bg-primary/10" />
        </div>
        {file && (
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Nome personalizzato</label>
            <input type="text" value={photoName} onChange={(e) => setPhotoName(e.target.value)} placeholder="Lascia vuoto per nome originale" className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Sezione</label>
          <select value={sectionId} onChange={(e) => setSectionId(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20">
            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Posizione</label>
            <input type="number" min={1} value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Alt Text</label>
            <input type="text" value={altText} onChange={(e) => setAltText(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Annulla</button>
          <button type="button" onClick={handleSubmit} disabled={saving || !sectionId} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-container transition-colors disabled:opacity-50">
            {saving ? "Salvataggio…" : "Aggiorna"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
