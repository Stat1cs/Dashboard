import { readdir, readFile, writeFile, stat, mkdir, unlink, rename } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const DEFAULT_WORKSPACE = path.join(os.homedir(), ".openclaw", "workspace");

/**
 * Resolve the workspace root from env or default.
 * Cross-platform (Windows + macOS/Linux).
 */
export function resolveWorkspaceRoot(): string {
  const env =
    process.env.DASHBOARD_WORKSPACE ?? process.env.OPENCLAW_WORKSPACE;
  if (env) return path.resolve(env);
  return path.resolve(DEFAULT_WORKSPACE);
}

/**
 * Validate that the given relative path stays under the workspace root.
 * Rejects '..', absolute paths that escape root, and null bytes.
 */
export function validatePath(relativePath: string, root: string): boolean {
  if (relativePath.includes("\0")) return false;
  const normalized = path.normalize(relativePath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return false;
  const resolved = path.resolve(root, normalized);
  return resolved.startsWith(root);
}

/**
 * Resolve a relative path to an absolute path under root; returns null if invalid.
 */
export function resolvePath(relativePath: string, root: string): string | null {
  if (!validatePath(relativePath, root)) return null;
  return path.resolve(root, path.normalize(relativePath));
}

export type DirEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  mtime?: number;
};

/**
 * List a directory under the workspace. Returns entries (name, path, isDirectory, mtime).
 * path is relative to workspace root.
 */
export async function listDir(
  relativePath: string,
  root: string
): Promise<DirEntry[]> {
  const abs = resolvePath(relativePath, root);
  if (!abs) throw new Error("Invalid path");
  const raw = await readdir(abs, { withFileTypes: true });
  const entries: DirEntry[] = [];
  for (const e of raw) {
    const rel = path.relative(root, path.join(abs, e.name));
    let mtime: number | undefined;
    try {
      const s = await stat(path.join(abs, e.name));
      mtime = s.mtimeMs;
    } catch {
      // ignore
    }
    entries.push({
      name: e.name,
      path: rel.replace(/\\/g, "/"),
      isDirectory: e.isDirectory(),
      mtime,
    });
  }
  return entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory)
      return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

/**
 * Read file content as UTF-8. Path relative to workspace root.
 */
export async function readFileContent(
  relativePath: string,
  root: string
): Promise<{ content: string; mtime: number }> {
  const abs = resolvePath(relativePath, root);
  if (!abs) throw new Error("Invalid path");
  const [content, st] = await Promise.all([
    readFile(abs, "utf-8"),
    stat(abs),
  ]);
  return { content, mtime: st.mtimeMs };
}

/**
 * Write file content. Path relative to workspace root. Creates parent directories if needed.
 */
export async function writeFileContent(
  relativePath: string,
  content: string,
  root: string
): Promise<{ mtime: number }> {
  const abs = resolvePath(relativePath, root);
  if (!abs) throw new Error("Invalid path");
  const dir = path.dirname(abs);
  await mkdir(dir, { recursive: true });
  await writeFile(abs, content, "utf-8");
  const st = await stat(abs);
  return { mtime: st.mtimeMs };
}

/**
 * Delete a file (not a directory). Path relative to workspace root.
 */
export async function deleteFile(
  relativePath: string,
  root: string
): Promise<void> {
  const abs = resolvePath(relativePath, root);
  if (!abs) throw new Error("Invalid path");
  const st = await stat(abs);
  if (st.isDirectory()) throw new Error("Cannot delete directory");
  await unlink(abs);
}

/**
 * Move a file or directory from one path to another within the workspace.
 * Target parent directory is created if needed. Rejects if target exists or if
 * moving a directory into itself or a descendant.
 */
export async function movePath(
  fromPath: string,
  toPath: string,
  root: string
): Promise<void> {
  const fromAbs = resolvePath(fromPath, root);
  const toAbs = resolvePath(toPath, root);
  if (!fromAbs || !toAbs) throw new Error("Invalid path");
  if (fromAbs === toAbs) throw new Error("Source and destination are the same");
  const fromSt = await stat(fromAbs);
  if (fromSt.isDirectory()) {
    const toResolved = path.resolve(toAbs);
    const fromResolved = path.resolve(fromAbs);
    if (toResolved === fromResolved || toResolved.startsWith(fromResolved + path.sep))
      throw new Error("Cannot move a directory into itself or a descendant");
  }
  const toDir = path.dirname(toAbs);
  await mkdir(toDir, { recursive: true });
  await rename(fromAbs, toAbs);
}
