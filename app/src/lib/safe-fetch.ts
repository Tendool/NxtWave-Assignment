import "server-only";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";

/**
 * Fetches student-submitted URLs. Because the URL is user-controlled, private, loopback, link-local and other
 * non-public targets are refused (SSRF), on every redirect hop.
 *
 * The check runs inside the connection's own DNS lookup, so the address that was checked is the address that
 * gets connected to. Checking first and then letting fetch() resolve again would allow DNS rebinding: a hostile
 * DNS server answers "public" to the check and "127.0.0.1" to the connection.
 */

export function isPrivateIp(ip: string) {
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return (
      v.startsWith("::") || // unspecified, loopback, IPv4-mapped (::ffff:…) and IPv4-compatible forms
      v.startsWith("fc") || v.startsWith("fd") || // unique local
      /^fe[89ab]/.test(v) || // link-local
      /^fe[c-f]/.test(v) || // old site-local
      v.startsWith("ff") || // multicast
      v.startsWith("64:ff9b:") || // NAT64, can reach IPv4 space
      v.startsWith("2002:") // 6to4, embeds an IPv4 address
    );
  }
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, incl. cloud metadata at 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast and reserved, incl. 255.255.255.255
  );
}

const blocked = () => Object.assign(new Error("That address is not reachable."), { code: "EBLOCKED" });

/** A dns.lookup replacement that refuses to hand a non-public address to the socket. */
const guardedLookup = ((hostname: string, options: dns.LookupOptions, callback: (...args: unknown[]) => void) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateIp(a.address))) return callback(blocked());
    if (options.all) callback(null, list);
    else callback(null, list[0].address, list[0].family);
  });
}) as unknown as net.LookupFunction;

function assertAllowed(u: URL) {
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Only http(s) links are allowed.");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("Unsupported port.");
  if (u.username || u.password) throw new Error("Links with credentials are not allowed.");
  // Literal IPs skip DNS entirely, so check them here.
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isPrivateIp(host)) throw blocked();
}

type Hop = { status: number; location: string | null; contentType: string; body: Buffer };

function requestOnce(url: URL, headers: Record<string, string>, timeoutMs: number, maxBytes: number): Promise<Hop> {
  const mod = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.request(url, { method: "GET", headers, lookup: guardedLookup, signal: AbortSignal.timeout(timeoutMs) }, (res) => {
      const status = res.statusCode ?? 0;
      const location = typeof res.headers.location === "string" ? res.headers.location : null;
      const contentType = String(res.headers["content-type"] ?? "");
      if (status >= 300 && status < 400 && location) {
        res.resume();
        return resolve({ status, location, contentType, body: Buffer.alloc(0) });
      }

      // Decompress ourselves so the size cap applies to the *decompressed* bytes (no gzip bombs).
      const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
      const stream =
        enc === "gzip" || enc === "x-gzip" ? res.pipe(zlib.createGunzip())
        : enc === "deflate" ? res.pipe(zlib.createInflate())
        : enc === "br" ? res.pipe(zlib.createBrotliDecompress())
        : res;

      const chunks: Buffer[] = [];
      let size = 0;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve({ status, location: null, contentType, body: Buffer.concat(chunks).subarray(0, maxBytes) });
      };
      const fail = (e: Error) => {
        if (settled) return;
        // Got some of the page before the error (or before we cut it off): keep what we have.
        if (size > 0) return finish();
        settled = true;
        reject(e);
      };
      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        size += chunk.length;
        if (size >= maxBytes) {
          finish();
          res.destroy();
        }
      });
      stream.on("end", finish);
      stream.on("error", fail);
      res.on("error", fail);
    });
    req.on("error", reject);
    req.end();
  });
}

export type Fetched = { ok: boolean; status: number; ms: number; finalUrl: string; text: string; contentType: string };

export async function safeFetch(rawUrl: string, opts: { maxBytes?: number; timeoutMs?: number; headers?: Record<string, string> } = {}): Promise<Fetched> {
  const { maxBytes = 200_000, timeoutMs = 8000, headers } = opts;
  let url = new URL(rawUrl);
  const started = Date.now();
  const sendHeaders = {
    "user-agent": "Build60-Evaluator/1.0",
    accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.5",
    "accept-encoding": "gzip, deflate, br",
    ...headers,
  };

  for (let hop = 0; hop < 4; hop++) {
    assertAllowed(url);
    const res = await requestOnce(url, sendHeaders, timeoutMs, maxBytes);
    if (res.location) {
      url = new URL(res.location, url);
      continue;
    }
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      ms: Date.now() - started,
      finalUrl: url.toString(),
      contentType: res.contentType,
      text: res.body.toString("utf8"),
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
