"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGridIcon, PlusIcon } from "lucide-react";

const CANVAS_PATH = "Dashboard/canvas.json";

type Node = { id: string; text: string; x: number; y: number };
type Edge = { id: string; from: string; to: string };
type CanvasData = { nodes: Node[]; edges: Edge[] };

const defaultData: CanvasData = { nodes: [], edges: [] };

function parseData(content: string): CanvasData {
  try {
    const d = JSON.parse(content) as CanvasData;
    return {
      nodes: Array.isArray(d.nodes) ? d.nodes : [],
      edges: Array.isArray(d.edges) ? d.edges : [],
    };
  } catch {
    return defaultData;
  }
}

export default function PlaygroundPage() {
  const [data, setData] = useState<CanvasData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNodeText, setNewNodeText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const latestDataRef = useRef<CanvasData>(data);
  latestDataRef.current = data;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace?path=${encodeURIComponent(CANVAS_PATH)}&file=1`
      );
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

  const save = useCallback(async (newData: CanvasData) => {
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: CANVAS_PATH,
          content: JSON.stringify(newData, null, 2),
        }),
      });
      setData(newData);
    } finally {
      setSaving(false);
    }
  }, []);

  const addNode = useCallback(() => {
    const text = newNodeText.trim() || "New node";
    setNewNodeText("");
    const id = `n-${Date.now()}`;
    const nodes = [...data.nodes, { id, text, x: 20 + data.nodes.length * 20, y: 20 + data.nodes.length * 15 }];
    save({ ...data, nodes });
  }, [data, newNodeText, save]);

  const updateNode = useCallback(
    (id: string, updates: Partial<Pick<Node, "text" | "x" | "y">>) => {
      const nodes = data.nodes.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      );
      save({ ...data, nodes });
      if (updates.text !== undefined) setEditingId(null);
    },
    [data, save]
  );

  const removeNode = useCallback(
    (id: string) => {
      save({
        nodes: data.nodes.filter((n) => n.id !== id),
        edges: data.edges.filter((e) => e.from !== id && e.to !== id),
      });
    },
    [data, save]
  );

  const handleDragStart = useCallback((id: string, clientX: number, clientY: number) => {
    const node = data.nodes.find((n) => n.id === id);
    if (!node) return;
    setDraggingId(id);
    setDragStart({ x: clientX - node.x, y: clientY - node.y });
  }, [data.nodes]);

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingId) return;
      const newX = Math.max(0, clientX - dragStart.x);
      const newY = Math.max(0, clientY - dragStart.y);
      setData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === draggingId ? { ...n, x: newX, y: newY } : n
        ),
      }));
    },
    [draggingId, dragStart]
  );

  const handleDragEnd = useCallback(() => {
    if (draggingId) {
      save(latestDataRef.current);
      setDraggingId(null);
    }
  }, [draggingId, save]);

  useEffect(() => {
    if (!draggingId) return;
    const onMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onUp = () => handleDragEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingId, handleDragMove, handleDragEnd]);

  const addEdge = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const exists = data.edges.some(
        (e) => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
      );
      if (exists) return;
      save({
        ...data,
        edges: [...data.edges, { id: `e-${Date.now()}`, from: fromId, to: toId }],
      });
    },
    [data, save]
  );

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Playground</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Canvas state in <code className="rounded bg-muted px-1">{CANVAS_PATH}</code>. Add nodes and connect ideas.
      </p>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="New node label"
          value={newNodeText}
          onChange={(e) => setNewNodeText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNode()}
          className="max-w-xs"
        />
        <Button onClick={addNode} disabled={saving}>
          <PlusIcon className="mr-1 size-4" />
          Add node
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGridIcon className="size-5" />
            Canvas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : (
            <div className="relative min-h-[320px] rounded-lg border border-dashed border-border bg-muted/10 p-4">
              {data.edges.length > 0 && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  style={{ overflow: "visible" }}
                >
                  {data.edges.map((e) => {
                    const from = data.nodes.find((n) => n.id === e.from);
                    const to = data.nodes.find((n) => n.id === e.to);
                    if (!from || !to) return null;
                    return (
                      <line
                        key={e.id}
                        x1={from.x + 80}
                        y1={from.y + 20}
                        x2={to.x + 80}
                        y2={to.y + 20}
                        stroke="var(--muted-foreground)"
                        strokeWidth="1"
                      />
                    );
                  })}
                </svg>
              )}
              <div className="relative flex flex-wrap gap-4">
                {data.nodes.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center gap-2 select-none"
                    style={{ transform: `translate(${n.x}px, ${n.y}px)` }}
                  >
                    <div
                      className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm min-w-[120px] cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) => {
                        if (editingId === n.id) return;
                        e.preventDefault();
                        handleDragStart(n.id, e.clientX, e.clientY);
                      }}
                    >
                      {editingId === n.id ? (
                        <Input
                          autoFocus
                          value={n.text}
                          onChange={(e) => updateNode(n.id, { text: e.target.value })}
                          onBlur={() => setEditingId(null)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && setEditingId(null)
                          }
                          className="h-8 text-sm"
                        />
                      ) : (
                        <span
                          className="cursor-pointer text-sm"
                          onClick={() => setEditingId(n.id)}
                        >
                          {n.text}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => removeNode(n.id)}
                      >
                        ×
                      </Button>
                      <select
                        className="rounded border border-border bg-background px-1 text-xs"
                        defaultValue=""
                        onChange={(ev) => {
                          const toId = ev.target.value;
                          if (toId) addEdge(n.id, toId);
                          ev.target.value = "";
                        }}
                      >
                        <option value="">Link to…</option>
                        {data.nodes
                          .filter((o) => o.id !== n.id)
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.text}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              {data.nodes.length === 0 && (
                <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                  Add a node to start
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
