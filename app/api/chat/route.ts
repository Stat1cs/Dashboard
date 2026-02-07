import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
const TOKEN =
  process.env.OPENCLAW_GATEWAY_TOKEN ?? process.env.OPENCLAW_GATEWAY_PASSWORD;

export async function POST(request: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: "OpenClaw gateway token not configured. Set OPENCLAW_GATEWAY_TOKEN or OPENCLAW_GATEWAY_PASSWORD." },
      { status: 503 }
    );
  }

  let body: { input?: string; stream?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const input = body.input ?? "";
  const stream = body.stream === true;
  const agentId = process.env.OPENCLAW_AGENT_ID ?? "main";

  const payload = {
    model: "openclaw",
    input: typeof input === "string" ? input : [{ type: "message", role: "user", content: [{ type: "input_text", text: input }] }],
    stream,
    user: "dashboard",
  };

  const url = `${GATEWAY_URL.replace(/\/$/, "")}/v1/responses`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
    "x-openclaw-agent-id": agentId,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      let err: { message?: string };
      try {
        err = JSON.parse(text);
      } catch {
        err = { message: text || res.statusText };
      }
      return NextResponse.json(
        { error: err.message ?? res.statusText },
        { status: res.status }
      );
    }

    if (stream && res.body) {
      return new NextResponse(res.body, {
        status: 200,
        headers: {
          "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream",
        },
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gateway request failed";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
