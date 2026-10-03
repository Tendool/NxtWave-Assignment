import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Evaluation, Registration } from "./types";

/**
 * Storage with two backends behind one interface:
 *  - Supabase (production) when SUPABASE_URL + SUPABASE_SERVICE_KEY are set
 *  - a JSON file (local dev / demo) otherwise
 */

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export const backend = supabase ? "supabase" : "file";

// ---------- file backend ----------
const dir = process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), ".data");
const regFile = path.join(dir, "registrations.json");
const evalFile = path.join(dir, "evaluations.json");

async function readJson<T>(file: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T[];
  } catch {
    return [];
  }
}
async function writeJson<T>(file: string, rows: T[]) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(rows, null, 2));
}

// ---------- public API ----------
export async function allRegistrations(): Promise<Registration[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: true })
      .range(0, 9999);
    if (error) throw error;
    return (data ?? []) as Registration[];
  }
  return readJson<Registration>(regFile);
}

export async function findRegistration(by: { code?: string; email?: string; whatsapp?: string }) {
  const rows = await allRegistrations();
  return (
    rows.find(
      (r) =>
        (by.code && r.ref_code === by.code) ||
        (by.email && r.email === by.email) ||
        (by.whatsapp && r.whatsapp === by.whatsapp),
    ) ?? null
  );
}

export type NewRegistration = Omit<Registration, "id" | "created_at">;

export async function insertRegistration(input: NewRegistration): Promise<Registration> {
  if (supabase) {
    const { data, error } = await supabase.from("registrations").insert(input).select().single();
    if (error) throw error;
    return data as Registration;
  }
  const rows = await readJson<Registration>(regFile);
  const row: Registration = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  rows.push(row);
  await writeJson(regFile, rows);
  return row;
}

export async function allEvaluations(): Promise<Evaluation[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("evaluations")
      .select("*")
      .order("total", { ascending: false })
      .range(0, 999);
    if (error) throw error;
    return (data ?? []) as Evaluation[];
  }
  const rows = await readJson<Evaluation>(evalFile);
  return rows.sort((a, b) => b.total - a.total);
}

export async function insertEvaluation(input: Omit<Evaluation, "id" | "created_at">) {
  if (supabase) {
    const { data, error } = await supabase.from("evaluations").insert(input).select().single();
    if (error) throw error;
    return data as Evaluation;
  }
  const rows = await readJson<Evaluation>(evalFile);
  const row: Evaluation = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  rows.push(row);
  await writeJson(evalFile, rows);
  return row;
}
