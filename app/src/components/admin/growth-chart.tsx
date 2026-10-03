"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { day: string; total: number; n: number };

export function GrowthChart({ data, target }: { data: Point[]; target: number }) {
  if (data.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No registrations yet.</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#16120e22" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => d.slice(5)}
            tick={{ fontSize: 11, fontFamily: "var(--font-label)" }}
            stroke="#16120e"
          />
          <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-label)" }} stroke="#16120e" domain={[0, target]} />
          <Tooltip
            contentStyle={{ border: "1.5px solid #16120e", borderRadius: 4, background: "#fbf8f1", fontSize: 12 }}
            formatter={(v, k) => [v as number, k === "total" ? "Cumulative" : "That day"]}
          />
          <ReferenceLine y={target} stroke="#ff4a1c" strokeDasharray="5 4" label={{ value: `Target ${target}`, fontSize: 11, fill: "#ff4a1c", position: "insideTopLeft" }} />
          <Line type="monotone" dataKey="total" stroke="#16120e" strokeWidth={2.5} dot={{ r: 3, fill: "#ff4a1c", stroke: "#16120e" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
