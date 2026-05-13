"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function VisibilityTrendChart({
  data,
}: {
  data: { day: string; chatgpt: number; claude: number; gemini: number; perplexity: number }[];
}) {
  return (
    <div className="h-[280px] w-full min-h-[200px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis dataKey="day" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={{ stroke: "#262626" }} />
          <YAxis domain={[0, 100]} tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={{ stroke: "#262626" }} />
          <Tooltip contentStyle={{ background: "#111", border: "1px solid #262626", borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#a3a3a3" }} />
          <Line type="monotone" dataKey="chatgpt" name="ChatGPT" stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="claude" name="Claude" stroke="#a78bfa" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="gemini" name="Gemini" stroke="#38bdf8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="perplexity" name="Perplexity" stroke="#f97316" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
