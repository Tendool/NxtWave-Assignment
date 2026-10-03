import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Fetches student-submitted URLs. Because the URL is user-controlled, block private,
 * loopback and link-local targets (SSRF) and re-check every redirect hop.
 */

function isPrivateIp(ip: string) {
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

async function assertPublic(u: URL) {
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Only http(s) links are allowed.");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("Unsupported port.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new Error("That address is not reachable.");
}

export type Fetched = { ok: boolean; status: number; ms: number; finalUrl: string; text: string; contentType: string };

export async function safeFetch(rawUrl: string, opts: { maxBytes?: number; timeoutMs?: number; headers?: Record<string, string> } = {}): Promise<Fetched> {
  const { maxBytes = 200_000, timeoutMs = 8000, headers } = opts;
  let url = new URL(rawUrl);
  const started = Date.now();

  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "Build60-Evaluator/1.0", accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.5", ...headers },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
      if (size >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
    return {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      finalUrl: url.toString(),
      contentType: res.headers.get("content-type") ?? "",
      text: Buffer.concat(chunks).toString("utf8").slice(0, maxBytes),
    };
  }
  throw new Error("Too many redirects.");
}

export function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
