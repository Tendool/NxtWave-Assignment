import { describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { hit } from "@/db/rate-limit";
import { isPrivateIp, safeFetch } from "@/lib/safe-fetch";
import { checkPassword } from "@/lib/admin-auth";

describe("SSRF guard", () => {
  it("treats private, loopback, link-local, metadata and tunnelling ranges as non-public", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "198.18.0.1", "224.0.0.1", "255.255.255.255", "::1", "::", "::ffff:127.0.0.1", "fd00:ec2::254", "fe80::1", "64:ff9b::7f00:1", "2002:7f00:1::"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "100.128.0.1", "2606:4700:4700::1111"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  it("refuses internal targets before sending anything", async () => {
    for (const url of ["http://127.0.0.1/", "http://169.254.169.254/latest/meta-data/", "http://[::1]/", "http://2130706433/", "http://localhost/"]) {
      await expect(safeFetch(url, { timeoutMs: 3000 }), url).rejects.toThrow(/not reachable/i);
    }
  });

  it("refuses odd ports, credentials in the link and non-http schemes", async () => {
    await expect(safeFetch("http://example.com:8080/")).rejects.toThrow(/port/i);
    await expect(safeFetch("http://user:pass@example.com/")).rejects.toThrow(/credentials/i);
    await expect(safeFetch("file:///etc/passwd")).rejects.toThrow(/http/i);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit in a window, then blocks", async () => {
    const key = `test:${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await hit(key, 3, 60)).ok);
    expect(results).toEqual([true, true, true, false]);
  });

  it("starts a fresh window once the old one has passed", async () => {
    const key = `test:${Math.random()}`;
    await hit(key, 1, 60);
    expect((await hit(key, 1, 60)).ok).toBe(false);
    const db = await getDb();
    await db.execute(sql`update rate_limits set reset_at = now() - interval '1 second' where key = ${key}`);
    expect((await hit(key, 1, 60)).ok).toBe(true);
  });

  it("counts correctly under concurrent hits", async () => {
    const key = `test:${Math.random()}`;
    const results = await Promise.all(Array.from({ length: 10 }, () => hit(key, 5, 60)));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
  });
});

describe("admin password check", () => {
  it("accepts only the exact password (dev default here), whatever the length of the guess", () => {
    expect(checkPassword("admin")).toBe(true);
    expect(checkPassword("admi")).toBe(false);
    expect(checkPassword("admin ")).toBe(false);
    expect(checkPassword("")).toBe(false);
    expect(checkPassword("x".repeat(10_000))).toBe(false);
  });
});

describe("local models on the server", () => {
  it("are blocked when ALLOW_LOCAL_MODELS is false: no detection, no model calls", async () => {
    vi.stubEnv("ALLOW_LOCAL_MODELS", "false");
    vi.resetModules();
    const ai = await import("@/lib/ai");
    expect(ai.LOCAL_MODELS_ALLOWED).toBe(false);
    const r = await ai.detectLocalModels("http://localhost:11434/v1", "ollama");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no GPU/);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("are off by default in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const ai = await import("@/lib/ai");
    expect(ai.LOCAL_MODELS_ALLOWED).toBe(false);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe("migration connection", () => {
  it("uses Neon's direct host instead of the pooler, and leaves other URLs alone", async () => {
    const { directUrl } = await import("@/db");
    expect(directUrl("postgresql://u:p@ep-cool-name-123-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require")).toBe(
      "postgresql://u:p@ep-cool-name-123.us-east-2.aws.neon.tech/neondb?sslmode=require",
    );
    expect(directUrl("postgresql://u:p@db.example.com:5432/app")).toBe("postgresql://u:p@db.example.com:5432/app");
  });
});
