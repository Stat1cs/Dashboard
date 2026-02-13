"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UsersIcon, PlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

const CREATOR_OPS_PATH = "Dashboard/creator-ops.json";

const PIPELINE_STAGES = ["Outreach", "In conversation", "Negotiation", "Closed"] as const;
const PARTNERSHIP_STATUSES = ["Prospecting", "Active", "Closed"] as const;
const OFFER_STATUSES = ["Draft", "Live", "Expired"] as const;

type Pipeline = { id: string; name: string; stage: string; notes?: string };
type Partnership = { id: string; name: string; status: string; notes?: string };
type Offer = { id: string; title: string; status: string; notes?: string };

type CreatorOpsData = {
  pipelines: Pipeline[];
  partnerships: Partnership[];
  offers: Offer[];
};

const defaultData: CreatorOpsData = { pipelines: [], partnerships: [], offers: [] };

function parseData(content: string): CreatorOpsData {
  try {
    const d = JSON.parse(content) as CreatorOpsData;
    return {
      pipelines: Array.isArray(d.pipelines) ? d.pipelines : [],
      partnerships: Array.isArray(d.partnerships) ? d.partnerships : [],
      offers: Array.isArray(d.offers) ? d.offers : [],
    };
  } catch {
    return defaultData;
  }
}

const PIPELINE_STYLES: Record<string, { header: string; card: string }> = {
  Outreach: { header: "bg-muted/80 text-muted-foreground", card: "bg-muted/40 border-muted" },
  "In conversation": { header: "bg-blue-600/90 text-blue-50", card: "bg-blue-500/15 border-blue-500/30" },
  Negotiation: { header: "bg-amber-600/90 text-amber-50", card: "bg-amber-500/15 border-amber-500/30" },
  Closed: { header: "bg-emerald-700/90 text-emerald-50", card: "bg-emerald-500/15 border-emerald-500/30" },
};

const PARTNERSHIP_STYLES: Record<string, { header: string; card: string }> = {
  Prospecting: { header: "bg-muted/80 text-muted-foreground", card: "bg-muted/40 border-muted" },
  Active: { header: "bg-blue-600/90 text-blue-50", card: "bg-blue-500/15 border-blue-500/30" },
  Closed: { header: "bg-emerald-700/90 text-emerald-50", card: "bg-emerald-500/15 border-emerald-500/30" },
};

const OFFER_STYLES: Record<string, { header: string; card: string }> = {
  Draft: { header: "bg-muted/80 text-muted-foreground", card: "bg-muted/40 border-muted" },
  Live: { header: "bg-emerald-700/90 text-emerald-50", card: "bg-emerald-500/15 border-emerald-500/30" },
  Expired: { header: "bg-rose-600/80 text-rose-50", card: "bg-rose-500/15 border-rose-500/30" },
};

function normStage(s: string, options: readonly string[]): string {
  return options.includes(s as never) ? s : options[0];
}

export default function CreatorOpsPage() {
  const [data, setData] = useState<CreatorOpsData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipelines" | "partnerships" | "offers">("pipelines");
  const [editing, setEditing] = useState<string | null>(null);
  const [newItemColumn, setNewItemColumn] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace?path=${encodeURIComponent(CREATOR_OPS_PATH)}&file=1`);
      if (res.ok) {
        const json = await res.json();
        setData(parseData(json.content ?? "{}"));
      } else {
        setData(defaultData);
      }
    } catch {
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (newData: CreatorOpsData) => {
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: CREATOR_OPS_PATH,
          content: JSON.stringify(newData, null, 2),
        }),
      });
      setData(newData);
    } finally {
      setSaving(false);
    }
  }, []);

  const setPipelineStage = useCallback((id: string, stage: string) => {
    save({
      ...data,
      pipelines: data.pipelines.map((p) => (p.id === id ? { ...p, stage } : p)),
    });
  }, [data, save]);

  const setPartnershipStatus = useCallback((id: string, status: string) => {
    save({
      ...data,
      partnerships: data.partnerships.map((p) => (p.id === id ? { ...p, status } : p)),
    });
  }, [data, save]);

  const setOfferStatus = useCallback((id: string, status: string) => {
    save({
      ...data,
      offers: data.offers.map((o) => (o.id === id ? { ...o, status } : o)),
    });
  }, [data, save]);

  const updatePipeline = useCallback((id: string, u: Partial<Pipeline>) => {
    save({ ...data, pipelines: data.pipelines.map((p) => (p.id === id ? { ...p, ...u } : p)) });
    setEditing(null);
  }, [data, save]);

  const updatePartnership = useCallback((id: string, u: Partial<Partnership>) => {
    save({ ...data, partnerships: data.partnerships.map((p) => (p.id === id ? { ...p, ...u } : p)) });
    setEditing(null);
  }, [data, save]);

  const updateOffer = useCallback((id: string, u: Partial<Offer>) => {
    save({ ...data, offers: data.offers.map((o) => (o.id === id ? { ...o, ...u } : o)) });
    setEditing(null);
  }, [data, save]);

  const addPipeline = useCallback((stage: string) => {
    const name = newName.trim() || "New pipeline";
    const id = `pl-${Date.now()}`;
    save({ ...data, pipelines: [...data.pipelines, { id, name, stage, notes: newNotes.trim() || undefined }] });
    setNewName("");
    setNewNotes("");
    setNewItemColumn(null);
    setEditing(id);
  }, [data, save, newName, newNotes]);

  const addPartnership = useCallback((status: string) => {
    const name = newName.trim() || "New partnership";
    const id = `pt-${Date.now()}`;
    save({ ...data, partnerships: [...data.partnerships, { id, name, status, notes: newNotes.trim() || undefined }] });
    setNewName("");
    setNewNotes("");
    setNewItemColumn(null);
    setEditing(id);
  }, [data, save, newName, newNotes]);

  const addOffer = useCallback((status: string) => {
    const title = newName.trim() || "New offer";
    const id = `of-${Date.now()}`;
    save({ ...data, offers: [...data.offers, { id, title, status, notes: newNotes.trim() || undefined }] });
    setNewName("");
    setNewNotes("");
    setNewItemColumn(null);
    setEditing(id);
  }, [data, save, newName, newNotes]);

  const removePipeline = useCallback((id: string) => save({ ...data, pipelines: data.pipelines.filter((p) => p.id !== id) }), [data, save]);
  const removePartnership = useCallback((id: string) => save({ ...data, partnerships: data.partnerships.filter((p) => p.id !== id) }), [data, save]);
  const removeOffer = useCallback((id: string) => save({ ...data, offers: data.offers.filter((o) => o.id !== id) }), [data, save]);

  const pipelinesByStage = PIPELINE_STAGES.reduce(
    (acc, s) => {
      acc[s] = data.pipelines.filter((p) => normStage(p.stage, PIPELINE_STAGES) === s);
      return acc;
    },
    {} as Record<string, Pipeline[]>
  );

  const partnershipsByStatus = PARTNERSHIP_STATUSES.reduce(
    (acc, s) => {
      acc[s] = data.partnerships.filter((p) => normStage(p.status, PARTNERSHIP_STATUSES) === s);
      return acc;
    },
    {} as Record<string, Partnership[]>
  );

  const offersByStatus = OFFER_STATUSES.reduce(
    (acc, s) => {
      acc[s] = data.offers.filter((o) => normStage(o.status, OFFER_STATUSES) === s);
      return acc;
    },
    {} as Record<string, Offer[]>
  );

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Creator Ops</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Kanban boards for pipelines, partnerships, and offers. Drag cards between columns. Data in{" "}
        <code className="rounded bg-muted px-1">{CREATOR_OPS_PATH}</code>.
      </p>
      <Card className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersIcon className="size-4" />
            Creator Ops
          </CardTitle>
          <div className="flex gap-1">
            {(["pipelines", "partnerships", "offers"] as const).map((tab) => (
              <Button
                key={tab}
                size="sm"
                variant={activeTab === tab ? "default" : "ghost"}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto p-0">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : activeTab === "pipelines" ? (
            <KanbanPipeline
              columns={PIPELINE_STAGES}
              byColumn={pipelinesByStage}
              styles={PIPELINE_STYLES}
              editingId={editing}
              setEditingId={setEditing}
              newItemColumn={newItemColumn}
              setNewItemColumn={setNewItemColumn}
              newName={newName}
              setNewName={setNewName}
              newNotes={newNotes}
              setNewNotes={setNewNotes}
              onAdd={addPipeline}
              onUpdate={updatePipeline}
              onRemove={removePipeline}
              onMove={setPipelineStage}
              dataTransferKey="application/x-creator-pipeline-id"
              renderCard={(p) => (
                <>
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.notes && <span className="text-xs text-muted-foreground line-clamp-2">{p.notes}</span>}
                </>
              )}
              renderEdit={(p, onSave, onCancel) => (
                <EditPipelineForm pipeline={p} onSave={onSave} onCancel={onCancel} />
              )}
            />
          ) : activeTab === "partnerships" ? (
            <KanbanPartnership
              columns={PARTNERSHIP_STATUSES}
              byColumn={partnershipsByStatus}
              styles={PARTNERSHIP_STYLES}
              editingId={editing}
              setEditingId={setEditing}
              newItemColumn={newItemColumn}
              setNewItemColumn={setNewItemColumn}
              newName={newName}
              setNewName={setNewName}
              newNotes={newNotes}
              setNewNotes={setNewNotes}
              onAdd={addPartnership}
              onUpdate={updatePartnership}
              onRemove={removePartnership}
              onMove={setPartnershipStatus}
              dataTransferKey="application/x-creator-partnership-id"
              renderCard={(p) => (
                <>
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.notes && <span className="text-xs text-muted-foreground line-clamp-2">{p.notes}</span>}
                </>
              )}
              renderEdit={(p, onSave, onCancel) => (
                <EditPartnershipForm partnership={p} onSave={onSave} onCancel={onCancel} />
              )}
            />
          ) : (
            <KanbanOffer
              columns={OFFER_STATUSES}
              byColumn={offersByStatus}
              styles={OFFER_STYLES}
              editingId={editing}
              setEditingId={setEditing}
              newItemColumn={newItemColumn}
              setNewItemColumn={setNewItemColumn}
              newName={newName}
              setNewName={setNewName}
              newNotes={newNotes}
              setNewNotes={setNewNotes}
              onAdd={addOffer}
              onUpdate={updateOffer}
              onRemove={removeOffer}
              onMove={setOfferStatus}
              dataTransferKey="application/x-creator-offer-id"
              renderCard={(o) => (
                <>
                  <span className="font-medium text-sm">{o.title}</span>
                  {o.notes && <span className="text-xs text-muted-foreground line-clamp-2">{o.notes}</span>}
                </>
              )}
              renderEdit={(o, onSave, onCancel) => (
                <EditOfferForm offer={o} onSave={onSave} onCancel={onCancel} />
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanPipeline({
  columns,
  byColumn,
  styles,
  editingId,
  setEditingId,
  newItemColumn,
  setNewItemColumn,
  newName,
  setNewName,
  newNotes,
  setNewNotes,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  dataTransferKey,
  renderCard,
  renderEdit,
}: {
  columns: readonly string[];
  byColumn: Record<string, Pipeline[]>;
  styles: Record<string, { header: string; card: string }>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  newItemColumn: string | null;
  setNewItemColumn: (c: string | null) => void;
  newName: string;
  setNewName: (s: string) => void;
  newNotes: string;
  setNewNotes: (s: string) => void;
  onAdd: (stage: string) => void;
  onUpdate: (id: string, u: Partial<Pipeline>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, stage: string) => void;
  dataTransferKey: string;
  renderCard: (p: Pipeline) => React.ReactNode;
  renderEdit: (p: Pipeline, onSave: (u: Partial<Pipeline>) => void, onCancel: () => void) => React.ReactNode;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4">
      {columns.map((col) => {
        const items = byColumn[col] ?? [];
        const style = styles[col] ?? styles[Object.keys(styles)[0]];
        const isAdding = newItemColumn === col;
        return (
          <div
            key={col}
            className="flex w-64 shrink-0 flex-col rounded-lg border border-border overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData(dataTransferKey);
              if (id) onMove(id, col);
            }}
          >
            <div className={cn("flex items-center justify-between px-3 py-2 font-medium", style.header)}>
              <span>{col}</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{items.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-background/50 min-h-[120px]">
              {items.map((p) => (
                <div key={p.id} className={cn("rounded-lg border p-3", style.card)}>
                  {editingId === p.id ? (
                    renderEdit(p, (u) => onUpdate(p.id, u), () => setEditingId(null))
                  ) : (
                    <>
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(dataTransferKey, p.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        {renderCard(p)}
                      </div>
                      <div className="mt-2 flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingId(p.id)}>
                          <PencilIcon className="size-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => onRemove(p.id)}>
                          <Trash2Icon className="size-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {isAdding && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
                  <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-sm" />
                  <Textarea placeholder="Notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} className="text-sm" />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7" onClick={() => onAdd(col)}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setNewItemColumn(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setNewItemColumn(col)}>
                <PlusIcon className="mr-2 size-4" />
                New
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanPartnership({
  columns,
  byColumn,
  styles,
  editingId,
  setEditingId,
  newItemColumn,
  setNewItemColumn,
  newName,
  setNewName,
  newNotes,
  setNewNotes,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  dataTransferKey,
  renderCard,
  renderEdit,
}: {
  columns: readonly string[];
  byColumn: Record<string, Partnership[]>;
  styles: Record<string, { header: string; card: string }>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  newItemColumn: string | null;
  setNewItemColumn: (c: string | null) => void;
  newName: string;
  setNewName: (s: string) => void;
  newNotes: string;
  setNewNotes: (s: string) => void;
  onAdd: (status: string) => void;
  onUpdate: (id: string, u: Partial<Partnership>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, status: string) => void;
  dataTransferKey: string;
  renderCard: (p: Partnership) => React.ReactNode;
  renderEdit: (p: Partnership, onSave: (u: Partial<Partnership>) => void, onCancel: () => void) => React.ReactNode;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4">
      {columns.map((col) => {
        const items = byColumn[col] ?? [];
        const style = styles[col] ?? styles[Object.keys(styles)[0]];
        const isAdding = newItemColumn === col;
        return (
          <div
            key={col}
            className="flex w-64 shrink-0 flex-col rounded-lg border border-border overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData(dataTransferKey);
              if (id) onMove(id, col);
            }}
          >
            <div className={cn("flex items-center justify-between px-3 py-2 font-medium", style.header)}>
              <span>{col}</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{items.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-background/50 min-h-[120px]">
              {items.map((p) => (
                <div key={p.id} className={cn("rounded-lg border p-3", style.card)}>
                  {editingId === p.id ? (
                    renderEdit(p, (u) => onUpdate(p.id, u), () => setEditingId(null))
                  ) : (
                    <>
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(dataTransferKey, p.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        {renderCard(p)}
                      </div>
                      <div className="mt-2 flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingId(p.id)}>
                          <PencilIcon className="size-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => onRemove(p.id)}>
                          <Trash2Icon className="size-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {isAdding && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
                  <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-sm" />
                  <Textarea placeholder="Notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} className="text-sm" />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7" onClick={() => onAdd(col)}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setNewItemColumn(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setNewItemColumn(col)}>
                <PlusIcon className="mr-2 size-4" />
                New
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanOffer({
  columns,
  byColumn,
  styles,
  editingId,
  setEditingId,
  newItemColumn,
  setNewItemColumn,
  newName,
  setNewName,
  newNotes,
  setNewNotes,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  dataTransferKey,
  renderCard,
  renderEdit,
}: {
  columns: readonly string[];
  byColumn: Record<string, Offer[]>;
  styles: Record<string, { header: string; card: string }>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  newItemColumn: string | null;
  setNewItemColumn: (c: string | null) => void;
  newName: string;
  setNewName: (s: string) => void;
  newNotes: string;
  setNewNotes: (s: string) => void;
  onAdd: (status: string) => void;
  onUpdate: (id: string, u: Partial<Offer>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, status: string) => void;
  dataTransferKey: string;
  renderCard: (o: Offer) => React.ReactNode;
  renderEdit: (o: Offer, onSave: (u: Partial<Offer>) => void, onCancel: () => void) => React.ReactNode;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4">
      {columns.map((col) => {
        const items = byColumn[col] ?? [];
        const style = styles[col] ?? styles[Object.keys(styles)[0]];
        const isAdding = newItemColumn === col;
        return (
          <div
            key={col}
            className="flex w-64 shrink-0 flex-col rounded-lg border border-border overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData(dataTransferKey);
              if (id) onMove(id, col);
            }}
          >
            <div className={cn("flex items-center justify-between px-3 py-2 font-medium", style.header)}>
              <span>{col}</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{items.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-background/50 min-h-[120px]">
              {items.map((o) => (
                <div key={o.id} className={cn("rounded-lg border p-3", style.card)}>
                  {editingId === o.id ? (
                    renderEdit(o, (u) => onUpdate(o.id, u), () => setEditingId(null))
                  ) : (
                    <>
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(dataTransferKey, o.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        {renderCard(o)}
                      </div>
                      <div className="mt-2 flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingId(o.id)}>
                          <PencilIcon className="size-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => onRemove(o.id)}>
                          <Trash2Icon className="size-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {isAdding && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
                  <Input placeholder="Title" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-sm" />
                  <Textarea placeholder="Notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} className="text-sm" />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7" onClick={() => onAdd(col)}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setNewItemColumn(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setNewItemColumn(col)}>
                <PlusIcon className="mr-2 size-4" />
                New
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditPipelineForm({ pipeline, onSave, onCancel }: { pipeline: Pipeline; onSave: (u: Partial<Pipeline>) => void; onCancel: () => void }) {
  const [name, setName] = useState(pipeline.name);
  const [stage, setStage] = useState(pipeline.stage);
  const [notes, setNotes] = useState(pipeline.notes ?? "");
  return (
    <div className="space-y-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-8 text-sm" />
      <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm">
        {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className="text-sm" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7" onClick={() => onSave({ name, stage, notes: notes.trim() || undefined })}>Save</Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function EditPartnershipForm({ partnership, onSave, onCancel }: { partnership: Partnership; onSave: (u: Partial<Partnership>) => void; onCancel: () => void }) {
  const [name, setName] = useState(partnership.name);
  const [status, setStatus] = useState(partnership.status);
  const [notes, setNotes] = useState(partnership.notes ?? "");
  return (
    <div className="space-y-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-8 text-sm" />
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm">
        {PARTNERSHIP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className="text-sm" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7" onClick={() => onSave({ name, status, notes: notes.trim() || undefined })}>Save</Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function EditOfferForm({ offer, onSave, onCancel }: { offer: Offer; onSave: (u: Partial<Offer>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(offer.title);
  const [status, setStatus] = useState(offer.status);
  const [notes, setNotes] = useState(offer.notes ?? "");
  return (
    <div className="space-y-2">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-8 text-sm" />
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm">
        {OFFER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className="text-sm" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7" onClick={() => onSave({ title, status, notes: notes.trim() || undefined })}>Save</Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
