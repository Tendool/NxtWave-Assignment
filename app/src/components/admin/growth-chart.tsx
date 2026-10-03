"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { day: string; total: number; n: number };

export function GrowthChart({ data, target }: { data: Point[]; target: number }) {
  if (data.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No registrations yet.</p>;
  }
  return (
    <div className="h-64 w-full text-foreground">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.15} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => d.slice(5)}
            tick={{ fontSize: 11, fontFamily: "var(--font-label)", fill: "currentColor" }}
            stroke="currentColor"
          />
          <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-label)", fill: "currentColor" }} stroke="currentColor" domain={[0, target]} />
          <Tooltip
            contentStyle={{ border: "1.5px solid var(--ink)", borderRadius: 4, background: "var(--card)", color: "var(--foreground)", fontSize: 12 }}
            formatter={(v, k) => [v as number, k === "total" ? "Cumulative" : "That day"]}
          />
          <ReferenceLine y={target} stroke="var(--flame)" strokeDasharray="5 4" label={{ value: `Target ${target}`, fontSize: 11, fill: "var(--flame)", position: "insideTopLeft" }} />
          <Line type="monotone" dataKey="total" stroke="currentColor" strokeWidth={2.5} dot={{ r: 3, fill: "var(--flame)", stroke: "currentColor" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
