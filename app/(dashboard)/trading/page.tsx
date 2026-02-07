"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUpIcon,
  PieChartIcon,
  BarChart3Icon,
  BookOpenIcon,
  PlusIcon,
  FileTextIcon,
} from "lucide-react";

const TRADES_PATH = "Dashboard/trades.json";
const JOURNAL_PATH = "Dashboard/trade-journal.md";

type Trade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  date: string;
  notes?: string;
  createdAt: string;
};

type TradesData = { trades: Trade[] };

const defaultData: TradesData = { trades: [] };

function parseData(content: string): TradesData {
  try {
    const d = JSON.parse(content) as TradesData;
    return { trades: Array.isArray(d.trades) ? d.trades : [] };
  } catch {
    return defaultData;
  }
}

export default function TradingPage() {
  const [data, setData] = useState<TradesData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTrade, setNewTrade] = useState<{ symbol: string; side: "buy" | "sell"; notes: string }>({ symbol: "", side: "buy", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace?path=${encodeURIComponent(TRADES_PATH)}&file=1`
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

  const save = useCallback(async (newData: TradesData) => {
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: TRADES_PATH,
          content: JSON.stringify(newData, null, 2),
        }),
      });
      setData(newData);
    } finally {
      setSaving(false);
    }
  }, []);

  const addTrade = useCallback(() => {
    const symbol = newTrade.symbol.trim().toUpperCase();
    if (!symbol) return;
    const id = `t-${Date.now()}`;
    const date = new Date().toISOString().slice(0, 10);
    save({
      trades: [
        {
          id,
          symbol,
          side: newTrade.side,
          date,
          notes: newTrade.notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        },
        ...data.trades,
      ],
    });
    setNewTrade({ symbol: "", side: "buy", notes: "" });
  }, [data.trades, newTrade, save]);

  const removeTrade = useCallback(
    (id: string) => {
      save({ trades: data.trades.filter((t) => t.id !== id) });
    },
    [data.trades, save]
  );

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Trading</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Trade log in <code className="rounded bg-muted px-1">{TRADES_PATH}</code>. Full journal in Documents.
      </p>
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="size-4" />
              Portfolio overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-center justify-center rounded bg-muted/30 text-sm text-muted-foreground">
              Connect a broker or paste data later
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUpIcon className="size-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-center justify-center rounded bg-muted/30 text-sm text-muted-foreground">
              Placeholder
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3Icon className="size-4" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-center justify-center rounded bg-muted/30 text-sm text-muted-foreground">
              Placeholder
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpenIcon className="size-4" />
              Trade journal
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/documents?open=${encodeURIComponent(JOURNAL_PATH)}`}>
                <FileTextIcon className="mr-1 size-4" />
                Open full journal
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Symbol (e.g. AAPL)"
                value={newTrade.symbol}
                onChange={(e) =>
                  setNewTrade((p) => ({ ...p, symbol: e.target.value }))
                }
                className="w-28"
              />
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newTrade.side}
                onChange={(e) =>
                  setNewTrade((p) => ({
                    ...p,
                    side: e.target.value as "buy" | "sell",
                  }))
                }
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
              <Input
                placeholder="Notes"
                value={newTrade.notes}
                onChange={(e) =>
                  setNewTrade((p) => ({ ...p, notes: e.target.value }))
                }
                className="min-w-[160px]"
              />
              <Button onClick={addTrade} disabled={saving}>
                <PlusIcon className="mr-1 size-4" />
                Log trade
              </Button>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : data.trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No trades logged. Add one above or write in the full journal.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.trades.slice(0, 20).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded border border-border/50 px-2 py-1.5"
                  >
                    <span>
                      <span
                        className={
                          t.side === "buy"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {t.side.toUpperCase()}
                      </span>{" "}
                      {t.symbol} — {t.date}
                      {t.notes ? ` · ${t.notes}` : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => removeTrade(t.id)}
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
