"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabaseClient";

type Role = "ADMIN" | "PRESIDENT" | "TRESORIER" | "SECRETAIRE" | "MEMBRE" | "ANONYMOUS";

type Folder = {
  id: string;
  parent_id: string | null;
  nom: string;
  slug: string;
  scope_type: "ASSOCIATION" | "BUREAU" | "MEMBRE_PRIVE";
  owner_membre_id?: string | null;
  created_by?: string;
  created_at?: string;
};

type DocumentItem = {
  id: string;
  folder_id: string;
  nom_original: string;
  nom_stockage: string;
  chemin_storage: string;
  mime_type: string | null;
  taille_bytes: number | null;
  source_type?: "UPLOAD" | "IMPRESSION_APP";
  created_at?: string;
};

function formatBytes(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!n || n <= 0) return "Taille inconnue";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(2)} Mo`;
}

function isBureauRole(role: Role) {
  return role === "ADMIN" || role === "PRESIDENT" || role === "TRESORIER";
}

function formatDate(value?: string) {
  if (!value) return "Date inconnue";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function scopeTitle(scope: Folder["scope_type"]) {
  if (scope === "BUREAU") return "Bureau";
  if (scope === "MEMBRE_PRIVE") return "Privé";
  return "Association";
}

function fileTypeLabel(mime: string | null) {
  const value = (mime ?? "").toLowerCase();
  if (value.includes("pdf")) return "PDF";
  if (value.includes("word") || value.includes("document")) return "Word";
  if (value.includes("excel") || value.includes("spreadsheet") || value.includes("sheet")) return "Excel";
  if (value.includes("image")) return "Image";
  return "Fichier";
}

function fileIcon(mime: string | null) {
  const type = fileTypeLabel(mime);
  if (type === "PDF") return "📄";
  if (type === "Word") return "📝";
  if (type === "Excel") return "📊";
  if (type === "Image") return "🖼️";
  return "📁";
}

function folderIcon(scope: Folder["scope_type"]) {
  if (scope === "BUREAU") return "🏛️";
  if (scope === "MEMBRE_PRIVE") return "🔒";
  return "📁";
}

function badgeClass(scope: Folder["scope_type"]) {
  if (scope === "BUREAU") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (scope === "MEMBRE_PRIVE") return "border-violet-400/30 bg-violet-400/10 text-violet-200";
  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
}

function FolderCard({
  folder,
  active,
  onClick,
}: {
  folder: Folder;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full rounded-3xl border p-4 text-left shadow-[0_16px_50px_rgba(0,0,0,0.25)] transition",
        active
          ? "border-cyan-300/50 bg-cyan-400/10"
          : "border-white/10 bg-slate-950/55 hover:border-white/25 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl">
          {folderIcon(folder.scope_type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-white">{folder.nom}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeClass(folder.scope_type)}`}>
              {scopeTitle(folder.scope_type)}
            </span>
            <span className="truncate text-xs text-slate-400">{folder.slug}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function StatCard({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.25)]">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 truncate text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{help}</div>
    </div>
  );
}

function RuleCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "bureau" | "association" | "prive";
}) {
  const map = {
    bureau: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    association: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    prive: "border-violet-400/20 bg-violet-400/10 text-violet-100",
  };

  return (
    <div className={`rounded-3xl border p-4 ${map[tone]}`}>
      <div className="text-sm font-black">{title}</div>
      <div className="mt-1 text-sm opacity-90">{text}</div>
    </div>
  );
}

export default function DocumentationPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<Role>("ANONYMOUS");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creatingMine, setCreatingMine] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user ?? null;

    if (authUser?.id) {
      const { data: membreRow } = await supabase
        .from("membres")
        .select("role")
        .eq("id", authUser.id)
        .maybeSingle();

      setRole(String(membreRow?.role ?? "ANONYMOUS").toUpperCase() as Role);
    } else {
      setRole("ANONYMOUS");
    }

    const [{ data: folderRows, error: foldersError }, { data: docRows, error: docsError }] =
      await Promise.all([
        supabase
          .from("documentation_folders")
          .select("id,parent_id,nom,slug,scope_type,owner_membre_id,created_by,created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("documentation_documents")
          .select("id,folder_id,nom_original,nom_stockage,chemin_storage,mime_type,taille_bytes,source_type,created_at")
          .order("created_at", { ascending: false }),
      ]);

    if (foldersError) {
      setMessage("Erreur chargement dossiers : " + foldersError.message);
      setLoading(false);
      return;
    }

    if (docsError) {
      setMessage("Erreur chargement documents : " + docsError.message);
      setLoading(false);
      return;
    }

    const safeFolders = (folderRows ?? []) as Folder[];
    const safeDocs = (docRows ?? []) as DocumentItem[];

    setFolders(safeFolders);
    setDocuments(safeDocs);

    if (!selectedFolderId && safeFolders.length > 0) {
      const preferred = safeFolders.find((f) => f.slug === "documentation-association") ?? safeFolders[0];
      setSelectedFolderId(preferred.id);
    } else if (selectedFolderId && !safeFolders.some((f) => f.id === selectedFolderId) && safeFolders.length > 0) {
      setSelectedFolderId(safeFolders[0].id);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, []);

  const rootBureau = useMemo(
    () => folders.find((f) => f.parent_id === null && f.slug === "documentation-bureau"),
    [folders]
  );

  const rootAssociation = useMemo(
    () => folders.find((f) => f.parent_id === null && f.slug === "documentation-association"),
    [folders]
  );

  const membersRoot = useMemo(() => folders.find((f) => f.slug === "membres"), [folders]);

  const currentFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );

  const childFolders = useMemo(
    () => folders.filter((f) => f.parent_id === selectedFolderId),
    [folders, selectedFolderId]
  );

  const currentDocs = useMemo(
    () => documents.filter((d) => d.folder_id === selectedFolderId),
    [documents, selectedFolderId]
  );

  const currentPath = useMemo(() => {
    if (!currentFolder) return [];
    const path: Folder[] = [];
    let cursor: Folder | undefined | null = currentFolder;

    while (cursor) {
      path.unshift(cursor);
      cursor = cursor.parent_id ? folders.find((f) => f.id === cursor?.parent_id) : null;
    }

    return path;
  }, [currentFolder, folders]);

  async function createMyFolder() {
    setCreatingMine(true);
    setMessage("");

    const { error } = await supabase.rpc("fn_create_my_member_folder");

    if (error) {
      setCreatingMine(false);
      setMessage("Erreur création dossier : " + error.message);
      return;
    }

    setCreatingMine(false);
    setMessage("Votre dossier membre privé a été créé ou renommé avec votre nom.");
    await loadPage();
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !selectedFolderId) return;

    setUploading(true);
    setMessage("");

    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, "_");
    const finalName = `${timestamp}_${safeName}`;
    const storagePath = `${selectedFolderId}/${finalName}`;

    const uploadRes = await supabase.storage
      .from("documentation")
      .upload(storagePath, file, { upsert: false });

    if (uploadRes.error) {
      setUploading(false);
      setMessage("Erreur upload : " + uploadRes.error.message);
      return;
    }

    const insertRes = await supabase.from("documentation_documents").insert({
      folder_id: selectedFolderId,
      nom_original: file.name,
      nom_stockage: finalName,
      chemin_storage: storagePath,
      mime_type: file.type || null,
      taille_bytes: file.size,
      source_type: "UPLOAD",
    });

    if (insertRes.error) {
      setUploading(false);
      setMessage("Erreur enregistrement document : " + insertRes.error.message);
      return;
    }

    setUploading(false);
    setMessage("Document importé avec succès.");
    await loadPage();
  }

  async function openDocument(path: string) {
    setMessage("");

    const { data, error } = await supabase.storage
      .from("documentation")
      .createSignedUrl(path, 60);

    if (error || !data?.signedUrl) {
      setMessage("Impossible d’ouvrir le document.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async function deleteDocument(doc: DocumentItem) {
    const ok = window.confirm(`Supprimer définitivement le document "${doc.nom_original}" ?`);
    if (!ok) return;

    setDeletingDocId(doc.id);
    setMessage("");

    const storageRes = await supabase.storage
      .from("documentation")
      .remove([doc.chemin_storage]);

    if (storageRes.error) {
      setDeletingDocId(null);
      setMessage("Erreur suppression fichier : " + storageRes.error.message);
      return;
    }

    const deleteRes = await supabase
      .from("documentation_documents")
      .delete()
      .eq("id", doc.id);

    if (deleteRes.error) {
      setDeletingDocId(null);
      setMessage("Erreur suppression document : " + deleteRes.error.message);
      return;
    }

    setDeletingDocId(null);
    setMessage("Document supprimé avec succès.");
    await loadPage();
  }
  return (
    <AppShell>
      <div className="min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_top_left,rgba(6,182,212,0.11),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-5 pb-24 lg:pb-6">
          <section className="rounded-[32px] border border-white/10 bg-slate-950/50 p-4 shadow-[0_26px_90px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-6 md:p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                  Documentation sécurisée USC
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
                  Centre documentaire
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">
                  Documents du bureau, documents partagés de l’association et dossiers privés des membres.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:min-w-[520px]">
                <StatCard label="Rôle" value={role} help="profil détecté" />
                <StatCard label="Dossiers" value={String(folders.length)} help="visibles" />
                <StatCard label="Documents" value={String(documents.length)} help="chargés" />
                <StatCard label="Privés" value={String(folders.filter((f) => f.scope_type === "MEMBRE_PRIVE").length)} help="membres" />
              </div>
            </div>
          </section>

          {message ? (
            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {message}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-8 text-sm text-slate-300">
              Chargement de la documentation...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <aside className="space-y-5 lg:col-span-4">
                <section className="rounded-[32px] border border-white/10 bg-slate-950/50 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-white">Espaces</h2>
                      <p className="text-xs text-slate-400">Choisissez un dossier</p>
                    </div>
                  </div>

                  <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1 lg:max-h-none">
                    {isBureauRole(role) && rootBureau ? (
                      <FolderCard
                        folder={rootBureau}
                        active={selectedFolderId === rootBureau.id}
                        onClick={() => setSelectedFolderId(rootBureau.id)}
                      />
                    ) : null}

                    {rootAssociation ? (
                      <FolderCard
                        folder={rootAssociation}
                        active={selectedFolderId === rootAssociation.id}
                        onClick={() => setSelectedFolderId(rootAssociation.id)}
                      />
                    ) : null}

                    {membersRoot ? (
                      <FolderCard
                        folder={membersRoot}
                        active={selectedFolderId === membersRoot.id}
                        onClick={() => setSelectedFolderId(membersRoot.id)}
                      />
                    ) : null}

                    {childFolders.map((folder) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        active={selectedFolderId === folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                      />
                    ))}
                  </div>

                  <button
                    onClick={createMyFolder}
                    disabled={creatingMine}
                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_18px_45px_rgba(34,211,238,0.30)] disabled:opacity-60"
                  >
                    {creatingMine ? "Création..." : "Créer / corriger mon dossier membre"}
                  </button>
                </section>

                <section className="rounded-[32px] border border-white/10 bg-slate-950/50 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-5">
                  <h3 className="text-lg font-black text-white">Règles d’accès</h3>

                  <div className="mt-4 grid gap-3">
                    <RuleCard title="Bureau" text="Accessible aux profils Président, Trésorier et Admin." tone="bureau" />
                    <RuleCard title="Association" text="Visible aux membres autorisés par le backend." tone="association" />
                    <RuleCard title="Privé" text="Réservé au membre propriétaire de son dossier." tone="prive" />
                  </div>
                </section>
              </aside>

              <main className="space-y-5 lg:col-span-8">
                <section className="sticky top-2 z-30 rounded-[32px] border border-white/10 bg-slate-950/85 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Dossier actif
                      </div>

                      <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-white md:text-3xl">
                        {currentFolder?.nom ?? "Aucun dossier sélectionné"}
                      </h2>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {currentPath.length > 0 ? (
                          currentPath.map((folder, index) => (
                            <div key={folder.id} className="flex items-center gap-2 text-xs text-slate-300">
                              <button
                                onClick={() => setSelectedFolderId(folder.id)}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10"
                              >
                                {folder.nom}
                              </button>
                              {index < currentPath.length - 1 ? <span className="text-slate-500">/</span> : null}
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">Aucun chemin actif</span>
                        )}
                      </div>
                    </div>

                    <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-[0_14px_35px_rgba(0,0,0,0.22)] transition hover:bg-white/15">
                      {uploading ? "Import en cours..." : "Importer un document"}
                      <input
                        type="file"
                        className="hidden"
                        disabled={!selectedFolderId || uploading}
                        onChange={handleUpload}
                      />
                    </label>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Type</div>
                      <div className="mt-1 truncate text-sm font-black text-white">
                        {currentFolder ? scopeTitle(currentFolder.scope_type) : "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Sous-dossiers</div>
                      <div className="mt-1 text-sm font-black text-white">{childFolders.length}</div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Documents</div>
                      <div className="mt-1 text-sm font-black text-white">{currentDocs.length}</div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-white/10 bg-slate-950/50 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-white">Documents disponibles</h3>
                      <p className="text-sm text-slate-400">Fichiers du dossier sélectionné.</p>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                      {currentDocs.length}
                    </span>
                  </div>

                  {currentDocs.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
                      <div className="text-5xl">🗂️</div>
                      <div className="mt-3 text-base font-black text-white">Aucun document</div>
                      <div className="mt-1 text-sm text-slate-400">Importez un fichier dans ce dossier.</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {currentDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_16px_50px_rgba(0,0,0,0.24)] transition hover:bg-white/[0.06]"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 text-2xl">
                              {fileIcon(doc.mime_type)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-base font-black text-white">{doc.nom_original}</div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                                  {fileTypeLabel(doc.mime_type)}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                                  {formatBytes(doc.taille_bytes)}
                                </span>
                              </div>

                              <div className="mt-3 text-xs text-slate-400">
                                Ajouté le {formatDate(doc.created_at)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                              onClick={() => openDocument(doc.chemin_storage)}
                              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
                            >
                              Consulter
                            </button>

                            <button
                              onClick={() => deleteDocument(doc)}
                              disabled={deletingDocId === doc.id}
                              className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-500/20 disabled:opacity-60"
                            >
                              {deletingDocId === doc.id ? "Suppression..." : "Supprimer"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </main>
            </div>
          )}

          <label className="fixed bottom-20 right-4 z-50 inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-2xl font-black text-slate-950 shadow-xl lg:hidden">
            +
            <input
              type="file"
              className="hidden"
              disabled={!selectedFolderId || uploading}
              onChange={handleUpload}
            />
          </label>
        </div>
      </div>
    </AppShell>
  );
}

