import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, Edit2, Trash2, RefreshCw, LayoutGrid, List, GripVertical,
  ImagePlus, ChevronLeft, ChevronRight, Check, Loader2, X, AlertCircle,
} from "lucide-react";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { useSortable, isSortableOperation } from "@dnd-kit/react/sortable";
import { api } from "../lib/apiClient";
import { cn, photoUrl } from "../lib/utils";
import type { Photo, Section } from "../lib/types";
import { useToast } from "../components/Toast";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { EmptyState, ErrorState } from "../components/EmptyState";

interface PhotoConfig {
  file: File;
  preview: string;
  sectionId: number;
  photoName: string;
  altText: string;
  position: number;
  error?: string;
}

export default function Photos() {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  const [editModal, setEditModal] = useState<{ open: boolean; photo?: Photo }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; photo?: Photo }>({ open: false });
  const [resetDialog, setResetDialog] = useState<{ open: boolean; photo?: Photo }>({ open: false });
  const [saving, setSaving] = useState(false);

  // File drop overlay
  const [showDropOverlay, setShowDropOverlay] = useState(false);
  const dragCounter = useRef(0);

  // Multi-upload wizard
  const [wizardConfigs, setWizardConfigs] = useState<PhotoConfig[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSections = useCallback(async () => {
    try {
      const data = await api.get<{ sections: Section[] }>("/section/list");
      const list = data?.sections ?? [];
      setSections(list);
      if (list.length > 0) {
        setSelectedSectionId((current) => current ?? list[0].id);
      }
    } catch {
      // sections may fail if user is editor without section read
    }
  }, []);

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

  // --- File drop zone handlers (HTML5 drag events, only fires for OS file drops) ---
  const handlePageDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes("Files")) return;
    dragCounter.current++;
    if (dragCounter.current === 1) setShowDropOverlay(true);
  }, []);

  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setShowDropOverlay(false);
    }
  }, []);

  const openWizardWithFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast("Nessun file immagine trovato", "error");
      return;
    }
    const maxPos = photos.reduce((max, p) => Math.max(max, p.position), 0);
    const configs: PhotoConfig[] = imageFiles.map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      sectionId: selectedSectionId ?? sections[0]?.id ?? 0,
      photoName: "",
      altText: "",
      position: maxPos + 1 + i,
    }));
    setWizardConfigs(configs);
  }, [photos, selectedSectionId, sections, toast]);

  const handlePageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setShowDropOverlay(false);
    const files = Array.from(e.dataTransfer.files);
    openWizardWithFiles(files);
  }, [openWizardWithFiles]);

  const closeWizard = useCallback(() => {
    wizardConfigs.forEach((c) => URL.revokeObjectURL(c.preview));
    setWizardConfigs([]);
  }, [wizardConfigs]);

  const handleWizardComplete = useCallback(() => {
    wizardConfigs.forEach((c) => URL.revokeObjectURL(c.preview));
    setWizardConfigs([]);
    fetchPhotos();
  }, [wizardConfigs, fetchPhotos]);

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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) openWizardWithFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="space-y-6 relative"
      onDragEnter={handlePageDragEnter}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {showDropOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-sm transition-all">
          <div className="flex flex-col items-center gap-4 p-16 rounded-3xl border-2 border-dashed border-primary/40 bg-white/80 shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <ImagePlus size={40} className="text-primary/70" />
            </div>
            <p className="text-xl font-bold text-primary font-headline">Rilascia le tue foto qui</p>
            <p className="text-sm text-outline">Puoi trascinare più immagini contemporaneamente</p>
          </div>
        </div>
      )}

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
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-br from-primary to-primary-container text-white text-sm font-semibold shadow-[0_4px_14px_rgba(74,44,23,0.2)] hover:opacity-90 transition-all active:scale-95"
        >
          <Upload size={18} /> Carica Foto
        </button>
      </div>

      {/* Content */}
      <DragDropProvider onDragEnd={(event) => {
        if (event.canceled) return;
        if (!isSortableOperation(event.operation) || !selectedSectionId) return;

        const { source } = event.operation;
        const { initialIndex, index } = source;
        if (initialIndex === index) return;

        const movedPhoto = photos[initialIndex];
        const targetPhoto = photos[index];
        if (!movedPhoto || !targetPhoto) return;

        setPhotos((prev) => {
          const next = [...prev];
          const [moved] = next.splice(initialIndex, 1);
          next.splice(index, 0, moved);
          return next;
        });

        const fd = new FormData();
        fd.append("id", String(movedPhoto.id));
        fd.append("section_id", String(selectedSectionId));
        fd.append("position", String(targetPhoto.position));
        api.putForm("/photo", fd)
          .then(() => { toast("Ordine aggiornato", "success"); fetchPhotos(); })
          .catch((err: unknown) => { toast(err instanceof Error ? err.message : "Errore riordino", "error"); fetchPhotos(); });
      }}>
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
            description="Carica la prima foto o trascinale qui"
            action={{ label: "Carica Foto", onClick: () => fileInputRef.current?.click() }}
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {photos.map((photo, idx) => (
              <SortablePhotoCard
                key={photo.id}
                photo={photo}
                index={idx}
                onEdit={() => setEditModal({ open: true, photo })}
                onDelete={() => setDeleteDialog({ open: true, photo })}
                onReset={() => setResetDialog({ open: true, photo })}
              />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[40px_72px_1fr_1fr_100px_120px] items-center text-outline text-[10px] font-bold uppercase tracking-widest border-b border-outline-variant/10">
              <div className="px-3 py-4" />
              <div className="px-2 py-4">Anteprima</div>
              <div className="px-4 py-4">Posizione</div>
              <div className="px-4 py-4">Alt Text</div>
              <div className="px-4 py-4">Aggiornata</div>
              <div className="px-4 py-4 text-right">Azioni</div>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {photos.map((photo, idx) => (
                <SortableListRow
                  key={photo.id}
                  photo={photo}
                  index={idx}
                  onEdit={() => setEditModal({ open: true, photo })}
                  onDelete={() => setDeleteDialog({ open: true, photo })}
                  onReset={() => setResetDialog({ open: true, photo })}
                />
              ))}
            </div>
          </div>
        )}

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease-out" }}>
          {(source) => {
            const photo = photos.find((p) => p.id === source.id);
            if (!photo) return null;
            return (
              <div className="w-20 h-20 rounded-xl overflow-hidden shadow-2xl ring-2 ring-primary/30 rotate-3">
                <img src={photoUrl(photo.path)} alt={photo.altText} className="w-full h-full object-cover" />
              </div>
            );
          }}
        </DragOverlay>
      </DragDropProvider>

      {/* Multi-upload wizard */}
      {wizardConfigs.length > 0 && (
        <MultiUploadWizard
          configs={wizardConfigs}
          sections={sections}
          onUpdate={setWizardConfigs}
          onClose={closeWizard}
          onComplete={handleWizardComplete}
        />
      )}

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

// ----- Sortable components -----

function SortablePhotoCard({
  photo,
  index,
  onEdit,
  onDelete,
  onReset,
}: {
  photo: Photo;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  const { ref, isDragSource } = useSortable({ id: photo.id, index });

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex flex-col bg-surface-container-low rounded-2xl overflow-hidden transition-all shadow-sm cursor-grab active:cursor-grabbing",
        isDragSource
          ? "opacity-30 scale-95"
          : "hover:bg-surface-container-lowest hover:shadow-[0_12px_40px_rgba(74,44,23,0.06)]",
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

function SortableListRow({
  photo,
  index,
  onEdit,
  onDelete,
  onReset,
}: {
  photo: Photo;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  const { ref, isDragSource } = useSortable({ id: photo.id, index });

  return (
    <div
      ref={ref}
      className={cn(
        "grid grid-cols-[40px_72px_1fr_1fr_100px_120px] items-center transition-all cursor-grab active:cursor-grabbing",
        isDragSource ? "opacity-30" : "hover:bg-surface-container-low",
      )}
    >
      <div className="px-3 py-3">
        <GripVertical size={16} className="text-outline/40" />
      </div>
      <div className="px-2 py-3">
        <img src={photoUrl(photo.path)} alt={photo.altText} className="w-14 h-14 rounded-lg object-cover" draggable={false} />
      </div>
      <div className="px-4 py-3 text-sm font-medium">#{photo.position}</div>
      <div className="px-4 py-3 text-sm text-slate-700 truncate">{photo.altText || "—"}</div>
      <div className="px-4 py-3 text-sm text-outline">{new Date(photo.updated_at).toLocaleDateString("it-IT")}</div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onEdit} className="p-2 rounded-lg text-outline hover:text-primary hover:bg-primary/5 transition-colors">
            <Edit2 size={16} />
          </button>
          <button onClick={onReset} className="p-2 rounded-lg text-outline hover:text-amber-600 hover:bg-amber-50 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg text-outline hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- Upload wizard -----

function MultiUploadWizard({
  configs,
  sections,
  onUpdate,
  onClose,
  onComplete,
}: {
  configs: PhotoConfig[];
  sections: Section[];
  onUpdate: (configs: PhotoConfig[]) => void;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadStatuses, setUploadStatuses] = useState<("pending" | "success" | "error")[]>([]);

  const total = configs.length;
  const current = configs[currentStep];
  const hasErrors = configs.some((c) => c.error);

  const updateCurrent = (patch: Partial<PhotoConfig>) => {
    const next = [...configs];
    next[currentStep] = { ...next[currentStep], ...patch, error: undefined };
    onUpdate(next);
  };

  const handleRemove = () => {
    URL.revokeObjectURL(configs[currentStep].preview);
    const remaining = configs.filter((_, i) => i !== currentStep);
    if (remaining.length === 0) {
      onClose();
      return;
    }
    onUpdate(remaining);
    if (currentStep >= remaining.length) setCurrentStep(remaining.length - 1);
  };

  const handleUploadAll = async () => {
    const toUpload = configs.map((c) => ({ ...c, error: undefined }));
    onUpdate(toUpload);

    setUploading(true);
    setUploadedCount(0);
    setUploadStatuses(toUpload.map(() => "pending"));

    const results: { idx: number; error?: string }[] = [];

    for (let i = 0; i < toUpload.length; i++) {
      const cfg = toUpload[i];
      try {
        const fd = new FormData();
        fd.append("photo", cfg.file);
        fd.append("section_id", String(cfg.sectionId));
        if (cfg.photoName.trim()) fd.append("photo_name", cfg.photoName.trim());
        if (cfg.altText.trim()) fd.append("alt_text", cfg.altText.trim());
        fd.append("position", String(cfg.position >= 1 ? cfg.position : 1));
        await api.postForm("/photo", fd);
        results.push({ idx: i });
        setUploadStatuses((prev) => { const n = [...prev]; n[i] = "success"; return n; });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Errore caricamento";
        results.push({ idx: i, error: msg });
        setUploadStatuses((prev) => { const n = [...prev]; n[i] = "error"; return n; });
      }
      setUploadedCount(i + 1);
    }

    setUploading(false);

    const failed = results.filter((r) => r.error);
    const okCount = results.length - failed.length;

    if (failed.length === 0) {
      toast(`${okCount} foto caricate con successo`, "success");
      onComplete();
    } else {
      if (okCount > 0) {
        toast(`${okCount}/${toUpload.length} caricate — ${failed.length} errori`, "error");
      } else {
        toast(`Errore nel caricamento di ${failed.length} foto`, "error");
      }
      const failedConfigs = failed.map((f) => ({
        ...toUpload[f.idx],
        error: f.error!,
      }));
      onUpdate(failedConfigs);
      setCurrentStep(0);
    }
  };

  if (!current) return null;

  return (
    <Modal
      open={true}
      title={uploading ? "Caricamento in corso..." : hasErrors ? `Riprova — ${total} foto con errori` : `Foto ${currentStep + 1} di ${total}`}
      onClose={uploading ? () => {} : onClose}
    >
      {uploading ? (
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="text-primary animate-spin" />
            <p className="text-sm text-slate-600">
              Caricamento foto {Math.min(uploadedCount + 1, total)} di {total}...
            </p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(uploadedCount / total) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {configs.map((cfg, i) => (
              <div key={i} className="relative w-12 h-12">
                <img
                  src={cfg.preview}
                  alt={cfg.file.name}
                  className={cn(
                    "w-12 h-12 rounded-lg object-cover transition-opacity",
                    uploadStatuses[i] !== "pending" && "opacity-40",
                  )}
                />
                {uploadStatuses[i] === "success" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-primary/90 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  </div>
                )}
                {uploadStatuses[i] === "error" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-red-500/90 flex items-center justify-center">
                      <X size={14} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {total > 1 && (
            <div className="flex items-center gap-1.5 justify-center">
              {configs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === currentStep ? "bg-primary w-6" : "bg-slate-200 hover:bg-slate-300 w-1.5",
                  )}
                />
              ))}
            </div>
          )}

          {current.error && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{current.error}</p>
            </div>
          )}

          <div className="relative flex justify-center">
            <img
              src={current.preview}
              alt={current.file.name}
              className="max-h-48 rounded-xl object-contain"
            />
            {total > 1 && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                title="Rimuovi questa foto"
              >
                <X size={14} className="text-white" />
              </button>
            )}
          </div>

          <p className="text-center text-xs text-outline truncate">{current.file.name}</p>

          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Sezione *</label>
            <select
              value={current.sectionId}
              onChange={(e) => updateCurrent({ sectionId: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Nome personalizzato</label>
            <input
              type="text"
              value={current.photoName}
              onChange={(e) => updateCurrent({ photoName: e.target.value })}
              placeholder="Lascia vuoto per nome originale"
              className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Posizione</label>
              <input
                type="number"
                min={1}
                value={current.position}
                onChange={(e) => updateCurrent({ position: Number(e.target.value) || 1 })}
                className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Alt Text</label>
              <input
                type="text"
                value={current.altText}
                onChange={(e) => updateCurrent({ altText: e.target.value })}
                placeholder="Descrizione"
                className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={currentStep > 0 ? () => setCurrentStep(currentStep - 1) : onClose}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={16} />
              {currentStep > 0 ? "Indietro" : "Annulla"}
            </button>

            {currentStep < total - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-container transition-colors"
              >
                Avanti <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUploadAll}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-container transition-colors"
              >
                <Upload size={16} />
                {hasErrors
                  ? (total === 1 ? "Riprova" : `Riprova (${total})`)
                  : (total === 1 ? "Carica" : `Carica tutte (${total})`)}
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ----- Edit modal -----

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
