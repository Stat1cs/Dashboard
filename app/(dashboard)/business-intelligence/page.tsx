"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BarChart3Icon, PlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

const BI_PATH = "Dashboard/bi.json";

const REPORT_STATUSES = ["Draft", "In progress", "Published"] as const;
const OPPORTUNITY_STATUSES = ["Idea", "Evaluating", "Pursuing", "Won", "Lost"] as const;

type Report = { id: string; title: string; date: string; summary?: string; status?: string };
type Kpi = { id: string; name: string; value?: string; target?: string };
type Opportunity = { id: string; title: string; type?: string; notes?: string; status?: string };

type BIData = {
  reports: Report[];
  kpis: Kpi[];
  opportunities: Opportunity[];
};

const defaultData: BIData = { reports: [], kpis: [], opportunities: [] };

function parseData(content: string): BIData {
  try {
    const d = JSON.parse(content) as BIData;
    return {
      reports: Array.isArray(d.reports) ? d.reports : [],
      kpis: Array.isArray(d.kpis) ? d.kpis : [],
      opportunities: Array.isArray(d.opportunities) ? d.opportunities : [],
    };
  } catch {
    return defaultData;
  }
}

function normStatus<T extends { status?: string }>(item: T, options: readonly string[]): string {
  const s = item.status ?? options[0];
  return options.includes(s) ? s : options[0];
}

const REPORT_STYLES: Record<string, { header: string; card: string }> = {
  Draft: { header: "bg-muted/80 text-muted-foreground", card: "bg-muted/40 border-muted" },
  "In progress": { header: "bg-blue-600/90 text-blue-50", card: "bg-blue-500/15 border-blue-500/30" },
  Published: { header: "bg-emerald-700/90 text-emerald-50", card: "bg-emerald-500/15 border-emerald-500/30" },
};

const OPPORTUNITY_STYLES: Record<string, { header: string; card: string }> = {
  Idea: { header: "bg-muted/80 text-muted-foreground", card: "bg-muted/40 border-muted" },
  Evaluating: { header: "bg-blue-600/90 text-blue-50", card: "bg-blue-500/15 border-blue-500/30" },
  Pursuing: { header: "bg-amber-600/90 text-amber-50", card: "bg-amber-500/15 border-amber-500/30" },
  Won: { header: "bg-emerald-700/90 text-emerald-50", card: "bg-emerald-500/15 border-emerald-500/30" },
  Lost: { header: "bg-rose-600/80 text-rose-50", card: "bg-rose-500/15 border-rose-500/30" },
};

function kpiProgress(value: string | undefined, target: string | undefined): { pct: number } {
  const v = parseFloat(value ?? "0");
  const t = parseFloat(target ?? "0");
  if (t <= 0) return { pct: 0 };
  const pct = Math.min(100, Math.round((v / t) * 100));
  return { pct };
}

export default function BusinessIntelligencePage() {
  const [data, setData] = useState<BIData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"reports" | "kpis" | "opportunities">("reports");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newReportStatus, setNewReportStatus] = useState<string | null>(null);
  const [newOpportunityStatus, setNewOpportunityStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace?path=${encodeURIComponent(BI_PATH)}&file=1`);
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

  const save = useCallback(async (newData: BIData) => {
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: BI_PATH,
          content: JSON.stringify(newData, null, 2),
        }),
      });
      setData(newData);
    } finally {
      setSaving(false);
    }
  }, []);

  const setReportStatus = useCallback((id: string, status: string) => {
    save({
      ...data,
      reports: data.reports.map((r) => (r.id === id ? { ...r, status } : r)),
    });
  }, [data, save]);

  const setOpportunityStatus = useCallback((id: string, status: string) => {
    save({
      ...data,
      opportunities: data.opportunities.map((o) => (o.id === id ? { ...o, status } : o)),
    });
  }, [data, save]);

  const addReport = useCallback((status: string, title?: string, date?: string) => {
    const id = `r-${Date.now()}`;
    const reportDate = date ?? new Date().toISOString().slice(0, 10);
    save({ ...data, reports: [...data.reports, { id, title: title?.trim() || "New report", date: reportDate, status }] });
    setNewReportStatus(null);
    setEditingId(id);
  }, [data, save]);

  const addKpi = useCallback(() => {
    const id = `k-${Date.now()}`;
    save({ ...data, kpis: [...data.kpis, { id, name: "New KPI" }] });
    setEditingId(id);
  }, [data, save]);

  const addOpportunity = useCallback((status: string) => {
    const id = `o-${Date.now()}`;
    save({ ...data, opportunities: [...data.opportunities, { id, title: "New opportunity", status }] });
    setNewOpportunityStatus(null);
    setEditingId(id);
  }, [data, save]);

  const updateReport = useCallback((id: string, u: Partial<Report>) => {
    save({ ...data, reports: data.reports.map((r) => (r.id === id ? { ...r, ...u } : r)) });
    setEditingId(null);
  }, [data, save]);

  const updateKpi = useCallback((id: string, u: Partial<Kpi>) => {
    save({ ...data, kpis: data.kpis.map((k) => (k.id === id ? { ...k, ...u } : k)) });
    setEditingId(null);
  }, [data, save]);

  const updateOpportunity = useCallback((id: string, u: Partial<Opportunity>) => {
    save({ ...data, opportunities: data.opportunities.map((o) => (o.id === id ? { ...o, ...u } : o)) });
    setEditingId(null);
  }, [data, save]);

  const removeReport = useCallback((id: string) => save({ ...data, reports: data.reports.filter((r) => r.id !== id) }), [data, save]);
  const removeKpi = useCallback((id: string) => save({ ...data, kpis: data.kpis.filter((k) => k.id !== id) }), [data, save]);
  const removeOpportunity = useCallback((id: string) => save({ ...data, opportunities: data.opportunities.filter((o) => o.id !== id) }), [data, save]);

  const reportsByStatus = REPORT_STATUSES.reduce(
    (acc, s) => {
      acc[s] = data.reports.filter((r) => normStatus(r, REPORT_STATUSES) === s);
      return acc;
    },
    {} as Record<string, Report[]>
  );

  const opportunitiesByStatus = OPPORTUNITY_STATUSES.reduce(
    (acc, s) => {
      acc[s] = data.opportunities.filter((o) => normStatus(o, OPPORTUNITY_STATUSES) === s);
      return acc;
    },
    {} as Record<string, Opportunity[]>
  );

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Business Intelligence</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Reports kanban, KPI dashboard, and opportunities pipeline. Data in{" "}
        <code className="rounded bg-muted px-1">{BI_PATH}</code>.
      </p>
      <Card className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3Icon className="size-4" />
            BI
          </CardTitle>
          <div className="flex gap-1">
            {(["reports", "kpis", "opportunities"] as const).map((tab) => (
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
          ) : activeTab === "reports" ? (
            <ReportsKanban
              reportsByStatus={reportsByStatus}
              editingId={editingId}
              setEditingId={setEditingId}
              newReportStatus={newReportStatus}
              setNewReportStatus={setNewReportStatus}
              onAdd={addReport}
              onUpdate={updateReport}
              onRemove={removeReport}
              onMove={setReportStatus}
            />
          ) : activeTab === "kpis" ? (
            <KpiDashboard
              kpis={data.kpis}
              editingId={editingId}
              setEditingId={setEditingId}
              onAdd={addKpi}
              onUpdate={updateKpi}
              onRemove={removeKpi}
            />
          ) : (
            <OpportunitiesKanban
              opportunitiesByStatus={opportunitiesByStatus}
              editingId={editingId}
              setEditingId={setEditingId}
              newOpportunityStatus={newOpportunityStatus}
              setNewOpportunityStatus={setNewOpportunityStatus}
              onAdd={addOpportunity}
              onUpdate={updateOpportunity}
              onRemove={removeOpportunity}
              onMove={setOpportunityStatus}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportsKanban({
  reportsByStatus,
  editingId,
  setEditingId,
  newReportStatus,
  setNewReportStatus,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}: {
  reportsByStatus: Record<string, Report[]>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  newReportStatus: string | null;
  setNewReportStatus: (s: string | null) => void;
  onAdd: (status: string, title?: string, date?: string) => void;
  onUpdate: (id: string, u: Partial<Report>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, status: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4">
      {REPORT_STATUSES.map((col) => {
        const items = reportsByStatus[col] ?? [];
        const style = REPORT_STYLES[col];
        const isAdding = newReportStatus === col;
        return (
          <div
            key={col}
            className="flex w-56 shrink-0 flex-col rounded-lg border border-border overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("application/x-bi-report-id");
              if (id) onMove(id, col);
            }}
          >
            <div className={cn("flex items-center justify-between px-3 py-2 font-medium", style.header)}>
              <span>{col}</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{items.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-background/50 min-h-[100px]">
              {items.map((r) => (
                <div key={r.id} className={cn("rounded-lg border p-3", style.card)}>
                  {editingId === r.id ? (
                    <ReportEditForm report={r} onSave={(u) => onUpdate(r.id, u)} onCancel={() => setEditingId(null)} />
                  ) : (
                    <>
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-bi-report-id", r.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <p className="font-medium text-sm">{r.title}</p>
                        <p className="text-[10px] text-muted-foreground">{r.date}</p>
                        {r.summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.summary}</p>}
                      </div>
                      <div className="mt-2 flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingId(r.id)}>
                          <PencilIcon className="size-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => onRemove(r.id)}>
                          <Trash2Icon className="size-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {isAdding && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
                  <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="h-8 text-sm" />
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-8 text-sm" />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7" onClick={() => { onAdd(col, newTitle, newDate); setNewTitle(""); setNewDate(new Date().toISOString().slice(0, 10)); setNewReportStatus(null); }}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setNewReportStatus(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setNewReportStatus(col)}>
                <PlusIcon className="mr-2 size-4" />
                New report
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KpiDashboard({
  kpis,
  editingId,
  setEditingId,
  onAdd,
  onUpdate,
  onRemove,
}: {
  kpis: Kpi[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onAdd: () => void;
  onUpdate: (id: string, u: Partial<Kpi>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={onAdd}>
          <PlusIcon className="size-4 mr-1" />
          Add KPI
        </Button>
      </div>
      {kpis.length === 0 ? (
        <p className="text-sm text-muted-foreground">No KPIs yet. Add one to track value vs target.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kpis.map((k) => {
            const { pct } = kpiProgress(k.value, k.target);
            const hasTarget = k.target != null && k.target !== "";
            return (
              <Card key={k.id} className="overflow-hidden">
                <CardHeader className="pb-1 pt-3 px-3 flex flex-row items-start justify-between gap-2">
                  <span className="font-medium text-sm truncate">{k.name}</span>
                  <div className="flex gap-0.5 shrink-0">
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingId(k.id)}>
                      <PencilIcon className="size-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => onRemove(k.id)}>
                      <Trash2Icon className="size-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  {editingId === k.id ? (
                    <KpiEditForm kpi={k} onSave={(u) => onUpdate(k.id, u)} onCancel={() => setEditingId(null)} />
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold tabular-nums">{k.value ?? "—"}</span>
                        {k.target && (
                          <span className="text-sm text-muted-foreground">/ {k.target}</span>
                        )}
                      </div>
                      {hasTarget && (
                        <div className="mt-2">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500/80"
                              )}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{pct}% of target</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OpportunitiesKanban({
  opportunitiesByStatus,
  editingId,
  setEditingId,
  newOpportunityStatus,
  setNewOpportunityStatus,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}: {
  opportunitiesByStatus: Record<string, Opportunity[]>;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  newOpportunityStatus: string | null;
  setNewOpportunityStatus: (s: string | null) => void;
  onAdd: (status: string) => void;
  onUpdate: (id: string, u: Partial<Opportunity>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, status: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4">
      {OPPORTUNITY_STATUSES.map((col) => {
        const items = opportunitiesByStatus[col] ?? [];
        const style = OPPORTUNITY_STYLES[col];
        const isAdding = newOpportunityStatus === col;
        return (
          <div
            key={col}
            className="flex w-52 shrink-0 flex-col rounded-lg border border-border overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("application/x-bi-opportunity-id");
              if (id) onMove(id, col);
            }}
          >
            <div className={cn("flex items-center justify-between px-3 py-2 font-medium", style.header)}>
              <span>{col}</span>
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{items.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-background/50 min-h-[100px]">
              {items.map((o) => (
                <div key={o.id} className={cn("rounded-lg border p-3", style.card)}>
                  {editingId === o.id ? (
                    <OpportunityEditForm opportunity={o} onSave={(u) => onUpdate(o.id, u)} onCancel={() => setEditingId(null)} />
                  ) : (
                    <>
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/x-bi-opportunity-id", o.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <p className="font-medium text-sm">{o.title}</p>
                        {o.type && <p className="text-[10px] text-muted-foreground">{o.type}</p>}
                        {o.notes && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{o.notes}</p>}
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
                  <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="h-8 text-sm" />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7" onClick={() => { onAdd(col); setNewTitle(""); setNewOpportunityStatus(null); }}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setNewOpportunityStatus(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-2 border-t border-border">
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setNewOpportunityStatus(col)}>
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

function ReportEditForm({ report, onSave, onCancel }: { report: Report; onSave: (u: Partial<Report>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(report.title);
  const [date, setDate] = useState(report.date);
  const [summary, setSummary] = useState(report.summary ?? "");
  const [status, setStatus] = useState(report.status ?? "Draft");
  return (
    <div className="space-y-2 w-full">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-8 text-sm" />
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-sm" />
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm">
        {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary" rows={2} className="text-sm" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7" onClick={() => onSave({ title, date, summary: summary.trim() || undefined, status })}>Save</Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function KpiEditForm({ kpi, onSave, onCancel }: { kpi: Kpi; onSave: (u: Partial<Kpi>) => void; onCancel: () => void }) {
  const [name, setName] = useState(kpi.name);
  const [value, setValue] = useState(kpi.value ?? "");
  const [target, setTarget] = useState(kpi.target ?? "");
  return (
    <div className="space-y-2 w-full">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-8 text-sm" />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" className="h-8 text-sm" />
      <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target" className="h-8 text-sm" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7" onClick={() => onSave({ name, value: value.trim() || undefined, target: target.trim() || undefined })}>Save</Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function OpportunityEditForm({ opportunity, onSave, onCancel }: { opportunity: Opportunity; onSave: (u: Partial<Opportunity>) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(opportunity.title);
  const [type, setType] = useState(opportunity.type ?? "");
  const [notes, setNotes] = useState(opportunity.notes ?? "");
  const [status, setStatus] = useState(opportunity.status ?? "Idea");
  return (
    <div className="space-y-2 w-full">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-8 text-sm" />
      <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type" className="h-8 text-sm" />
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm">
        {OPPORTUNITY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className="text-sm" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7" onClick={() => onSave({ title, type: type.trim() || undefined, notes: notes.trim() || undefined, status })}>Save</Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
