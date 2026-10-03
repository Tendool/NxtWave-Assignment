// Local demo data only. Writes to .data/registrations.json (git-ignored).
// Usage: node scripts/seed.mjs [count]
import { mkdirSync, writeFileSync } from "node:fs";

const count = Number(process.argv[2] ?? 64);
const colleges = [
  ["CBIT Hyderabad", 6], ["VNR VJIET", 5], ["JNTU Hyderabad", 5], ["GITAM University", 4],
  ["KL University", 4], ["SRM Institute of Science and Technology", 4], ["VIT Vellore", 3],
  ["Anna University", 3], ["Lovely Professional University", 3], ["PES University", 2],
  ["Government Engineering College", 2], ["Osmania University", 2],
];
const branches = ["CSE", "CSE", "CSE", "IT", "AI & Data Science / ML", "ECE", "EEE", "Mechanical"];
const first = ["Aarav", "Ananya", "Karthik", "Sneha", "Rohit", "Divya", "Manoj", "Pooja", "Vikram", "Meera", "Arjun", "Kavya", "Sai", "Lakshmi", "Harsha", "Nikhil", "Priya", "Teja", "Ishita", "Rahul"];
const last = ["Reddy", "Sharma", "Rao", "Naidu", "Iyer", "Gupta", "Kumar", "Patel", "Singh", "Das"];
const sources = ["Ambassador", "Ambassador", "WhatsApp group", "Instagram", "TPO email", null];
const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const code = (n) => n.toUpperCase().slice(0, 4) + "-" + Array.from({ length: 3 }, () => pick(A)).join("");
const pool = colleges.flatMap(([c, w]) => Array(w).fill(c));

const rows = [];
const now = Date.now();
for (let i = 0; i < count; i++) {
  const fn = pick(first), ln = pick(last);
  const referrer = rows.length > 5 && Math.random() < 0.45 ? pick(rows.slice(0, Math.min(rows.length, 12))) : null;
  rows.push({
    id: crypto.randomUUID(),
    name: `${fn} ${ln}`,
    email: `${fn}.${ln}${i}@example.edu`.toLowerCase(),
    whatsapp: String(6000000000 + Math.floor(Math.random() * 3999999999)),
    college: referrer && Math.random() < 0.7 ? referrer.college : pick(pool),
    branch: pick(branches),
    year: "Final year (4th)",
    ref_code: code(fn),
    referred_by: referrer?.ref_code ?? null,
    source: referrer ? null : pick(sources),
    created_at: new Date(now - (count - i) * 3.1 * 3600_000).toISOString(),
  });
}
mkdirSync(".data", { recursive: true });
writeFileSync(".data/registrations.json", JSON.stringify(rows, null, 2));
console.log(`Seeded ${rows.length} demo registrations into .data/registrations.json`);
