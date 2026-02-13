import { NextRequest, NextResponse } from "next/server";
import {
  resolveWorkspaceRoot,
  validatePath,
  listDir,
  readFileContent,
  writeFileContent,
  deletePath,
  movePath,
} from "@/lib/workspace";

export async function GET(request: NextRequest) {
  const root = resolveWorkspaceRoot();
  const { searchParams } = new URL(request.url);
  const pathParam = searchParams.get("path") ?? "";
  const asFile = searchParams.get("file") === "1";

  if (!validatePath(pathParam, root)) {
    return NextResponse.json(
      { error: "Invalid path" },
      { status: 400 }
    );
  }

  try {
    if (asFile) {
      const { content, mtime } = await readFileContent(pathParam, root);
      return NextResponse.json({ content, mtime });
    }
    const entries = await listDir(pathParam, root);
    return NextResponse.json({ path: pathParam, entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("ENOENT")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const root = resolveWorkspaceRoot();
  let body: { path: string; content: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { path: pathParam, content } = body;
  if (typeof pathParam !== "string" || typeof content !== "string") {
    return NextResponse.json(
      { error: "Body must include path (string) and content (string)" },
      { status: 400 }
    );
  }

  if (!validatePath(pathParam, root)) {
    return NextResponse.json(
      { error: "Invalid path" },
      { status: 400 }
    );
  }

  try {
    const { mtime } = await writeFileContent(pathParam, content, root);
    return NextResponse.json({ ok: true, mtime });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const root = resolveWorkspaceRoot();
  const { searchParams } = new URL(request.url);
  const pathParam = searchParams.get("path") ?? "";

  if (!validatePath(pathParam, root)) {
    return NextResponse.json(
      { error: "Invalid path" },
      { status: 400 }
    );
  }

  try {
    await deletePath(pathParam, root);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("ENOENT")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const root = resolveWorkspaceRoot();
  let body: { from: string; to: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const { from: fromPath, to: toPath } = body;
  if (typeof fromPath !== "string" || typeof toPath !== "string") {
    return NextResponse.json(
      { error: "Body must include from (string) and to (string)" },
      { status: 400 }
    );
  }
  if (!validatePath(fromPath, root) || !validatePath(toPath, root)) {
    return NextResponse.json(
      { error: "Invalid path" },
      { status: 400 }
    );
  }
  try {
    await movePath(fromPath, toPath, root);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("ENOENT")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
