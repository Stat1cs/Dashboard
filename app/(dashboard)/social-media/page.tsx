"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MegaphoneIcon, PlusIcon, PencilIcon, Trash2Icon, CopyIcon, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SOCIAL_PATH = "Dashboard/social-posts.json";

const POST_STATUSES = ["draft", "in_review", "scheduled", "published"] as const;
type PostStatus = (typeof POST_STATUSES)[number];

type Post = {
  id: string;
  platform?: string;
  content: string;
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
};

type SocialData = { posts: Post[] };

const defaultData: SocialData = { posts: [] };

function parseData(content: string): SocialData {
  try {
    const d = JSON.parse(content) as SocialData;
    const posts = Array.isArray(d.posts) ? d.posts : [];
    return {
      posts: posts.map((p) => ({
        ...p,
        status: POST_STATUSES.includes(p.status as PostStatus) ? (p.status as PostStatus) : "draft",
      })),
    };
  } catch {
    return defaultData;
  }
}

const COLUMN_STYLES: Record<PostStatus, { header: string; card: string }> = {
  draft: { header: "bg-muted/80 text-muted-foreground", card: "bg-muted/40 border-muted" },
  in_review: { header: "bg-amber-600/90 text-amber-50", card: "bg-amber-500/15 border-amber-500/30" },
  scheduled: { header: "bg-blue-600/90 text-blue-50", card: "bg-blue-500/15 border-blue-500/30" },
  published: { header: "bg-emerald-700/90 text-emerald-50", card: "bg-emerald-500/15 border-emerald-500/30" },
};

function charCount(content: string): number {
  return content.replace(/\s/g, "").length;
}

function getPlatforms(posts: Post[]): string[] {
  const set = new Set<string>();
  posts.forEach((p) => p.platform && set.add(p.platform));
  return Array.from(set).sort();
}

export default function SocialMediaPage() {
  const [data, setData] = useState<SocialData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [newPostStatus, setNewPostStatus] = useState<PostStatus | null>(null);
  const [form, setForm] = useState({ platform: "", content: "", scheduledAt: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspace?path=${encodeURIComponent(SOCIAL_PATH)}&file=1`);
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

  const save = useCallback(async (newData: SocialData) => {
    setSaving(true);
    try {
      await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: SOCIAL_PATH,
          content: JSON.stringify(newData, null, 2),
        }),
      });
      setData(newData);
    } finally {
      setSaving(false);
    }
  }, []);

  const setPostStatus = useCallback(
    (id: string, status: PostStatus) => {
      const updates: Partial<Post> = { status };
      if (status === "published") updates.publishedAt = new Date().toISOString().slice(0, 10);
      save({
        posts: data.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      });
    },
    [data.posts, save]
  );

  const updatePost = useCallback(
    (id: string, updates: Partial<Post>) => {
      save({
        posts: data.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      });
      setEditingId(null);
    },
    [data.posts, save]
  );

  const removePost = useCallback(
    (id: string) => {
      save({ posts: data.posts.filter((p) => p.id !== id) });
      setEditingId(null);
    },
    [data.posts, save]
  );

  const duplicatePost = useCallback(
    (post: Post) => {
      const id = `sm-${Date.now()}`;
      const createdAt = new Date().toISOString().slice(0, 10);
      save({
        posts: [{ ...post, id, status: "draft" as PostStatus, createdAt, publishedAt: undefined }, ...data.posts],
      });
    },
    [data.posts, save]
  );

  const addPost = useCallback(() => {
    const content = form.content.trim();
    if (!content || !newPostStatus) return;
    const id = `sm-${Date.now()}`;
    const createdAt = new Date().toISOString().slice(0, 10);
    const post: Post = {
      id,
      platform: form.platform.trim() || undefined,
      content,
      status: newPostStatus,
      scheduledAt: form.scheduledAt.trim() || undefined,
      createdAt,
    };
    save({ posts: [post, ...data.posts] });
    setForm({ platform: "", content: "", scheduledAt: "" });
    setNewPostStatus(null);
  }, [form, newPostStatus, data.posts, save]);

  const filteredPosts = platformFilter === "all" ? data.posts : data.posts.filter((p) => p.platform === platformFilter);
  const postsByStatus = POST_STATUSES.reduce(
    (acc, s) => {
      acc[s] = filteredPosts.filter((p) => p.status === s);
      return acc;
    },
    {} as Record<PostStatus, Post[]>
  );

  const scheduledDates = data.posts
    .filter((p) => p.scheduledAt && p.status === "scheduled")
    .map((p) => p.scheduledAt as string)
    .filter((d, i, a) => a.indexOf(d) === i)
    .sort()
    .slice(0, 14);

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Social Media</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Kanban pipeline for the Social Media agent. Drag between columns. Data in{" "}
        <code className="rounded bg-muted px-1">{SOCIAL_PATH}</code>.
      </p>

      {/* Platform filter + content calendar strip */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Platform:</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setPlatformFilter("all")}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              platformFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted"
            )}
          >
            All
          </button>
          {getPlatforms(data.posts).map((pf) => (
            <button
              key={pf}
              type="button"
              onClick={() => setPlatformFilter(pf)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                platformFilter === pf ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted"
              )}
            >
              {pf}
            </button>
          ))}
        </div>
        {scheduledDates.length > 0 && (
          <div className="ml-4 flex items-center gap-2 border-l border-border pl-4">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upcoming:</span>
            <div className="flex gap-1">
              {scheduledDates.map((d) => {
                const count = data.posts.filter((p) => p.scheduledAt === d && p.status === "scheduled").length;
                return (
                  <span
                    key={d}
                    className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-700 dark:text-blue-300"
                    title={`${d}: ${count} post(s)`}
                  >
                    {d.slice(5)}
                    {count > 1 ? ` (${count})` : ""}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Card className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MegaphoneIcon className="size-4" />
            Posts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto p-0">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 px-4">
              {POST_STATUSES.map((statusKey) => {
                const posts = postsByStatus[statusKey];
                const style = COLUMN_STYLES[statusKey];
                const isAdding = newPostStatus === statusKey;
                return (
                  <div
                    key={statusKey}
                    className="flex w-72 shrink-0 flex-col rounded-lg border border-border overflow-hidden"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("application/x-social-post-id");
                      if (id) setPostStatus(id, statusKey);
                    }}
                  >
                    <div className={cn("flex items-center justify-between px-3 py-2 font-medium", style.header)}>
                      <span className="capitalize">{statusKey.replace("_", " ")}</span>
                      <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{posts.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-background/50 min-h-[120px]">
                      {posts.map((p) => (
                        <PostCard
                          key={p.id}
                          post={p}
                          style={style.card}
                          isEditing={editingId === p.id}
                          onEdit={() => setEditingId(p.id)}
                          onSave={(u) => updatePost(p.id, u)}
                          onCancel={() => setEditingId(null)}
                          onRemove={() => removePost(p.id)}
                          onDuplicate={() => duplicatePost(p)}
                        />
                      ))}
                      {isAdding && (
                        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-2">
                          <Input
                            placeholder="Platform (optional)"
                            value={form.platform}
                            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                            className="h-8 text-sm"
                          />
                          <Textarea
                            placeholder="Content…"
                            value={form.content}
                            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                            rows={3}
                            className="text-sm"
                          />
                          {statusKey === "scheduled" && (
                            <Input
                              type="date"
                              value={form.scheduledAt}
                              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                              className="h-8 text-sm"
                            />
                          )}
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7" onClick={addPost} disabled={saving || !form.content.trim()}>
                              Add
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => setNewPostStatus(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setNewPostStatus(statusKey)}
                        disabled={saving}
                      >
                        <PlusIcon className="mr-2 size-4" />
                        New post
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PostCard({
  post,
  style,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  onDuplicate,
}: {
  post: Post;
  style: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (u: Partial<Post>) => void;
  onCancel: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const chars = charCount(post.content);
  const over280 = chars > 280;

  if (isEditing) {
    return (
      <EditPostForm post={post} onSave={onSave} onCancel={onCancel} />
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-social-post-id", post.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-colors hover:border-primary/40",
        style
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          {post.platform && (
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{post.platform}</span>
          )}
          <p className="text-sm whitespace-pre-wrap line-clamp-4 mt-0.5">{post.content}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={cn("text-[10px]", over280 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {chars} chars
              {over280 && " (over 280)"}
            </span>
            {post.scheduledAt && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <CalendarIcon className="size-3" />
                {post.scheduledAt}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button size="icon" variant="ghost" className="size-7" onClick={onEdit} title="Edit">
            <PencilIcon className="size-3" />
          </Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={onDuplicate} title="Duplicate">
            <CopyIcon className="size-3" />
          </Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={onRemove} title="Remove">
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditPostForm({
  post,
  onSave,
  onCancel,
}: {
  post: Post;
  onSave: (u: Partial<Post>) => void;
  onCancel: () => void;
}) {
  const [platform, setPlatform] = useState(post.platform ?? "");
  const [content, setContent] = useState(post.content);
  const [status, setStatus] = useState<Post["status"]>(post.status);
  const [scheduledAt, setScheduledAt] = useState(post.scheduledAt ?? "");
  const chars = charCount(content);
  const over280 = chars > 280;
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <Input placeholder="Platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-8 text-sm" />
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="text-sm" />
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px]", over280 ? "text-amber-600" : "text-muted-foreground")}>{chars} chars</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Post["status"])}
          className="rounded border border-input bg-background px-2 py-1 text-xs"
        >
          {POST_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      <Input type="date" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="h-8 text-sm" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7" onClick={() => onSave({ platform: platform.trim() || undefined, content, status, scheduledAt: scheduledAt || undefined })}>
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
