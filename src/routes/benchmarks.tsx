import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/benchmarks")({ component: BenchmarksPage });

type Studio = {
  host: { cpu: string; cores: number; ram_bytes: number; gpu: null; python: string };
  onnxruntime: string;
  latency_ort: { p50_ms: number; p95_ms: number; mean_ms: number; decisions_per_sec: number; runs: number };
  latency_pytorch: { p50_ms: number; p95_ms: number; decisions_per_sec: number; note: string };
  energy: { available: boolean; reason: string };
  snake: { ticks: number; score: number; interventions: number; decisions_per_sec: number; seconds: number };
  speedup_vs_pytorch: number;
};

function BenchmarksPage() {
  const [data, setData] = useState<Studio | null>(null);
  useEffect(() => {
    fetch("/data/studio.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);
  const chart = data
    ? [
        { name: "PyTorch eager", p50: data.latency_pytorch.p50_ms, p95: data.latency_pytorch.p95_ms },
        { name: "ORT CPU", p50: data.latency_ort.p50_ms, p95: data.latency_ort.p95_ms },
      ]
    : [];

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Benchmarks</p>
        <h1 className="font-display text-3xl tracking-tight">Official rows are empty</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          The chart is moka-tiny, a distilled reference model, not Laya. Official laya versus Moka
          ORT CPU was not measured: the 421M and 322M bundles were refused on this host (
          {data?.host.cpu}, {data?.host.cores} cores, {(data ? data.host.ram_bytes / 1e9 : 0).toFixed(1)}{" "}
          GB RAM, no GPU, no swap). CUDA was not present. INT8 is not a default.
        </p>
      </header>
      <div className="h-64 rounded-lg border border-border bg-surface p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid stroke="rgba(242,235,228,0.08)" vertical={false} />
            <XAxis dataKey="name" stroke="#9c9288" fontSize={12} />
            <YAxis stroke="#9c9288" fontSize={12} unit=" ms" />
            <Tooltip
              contentStyle={{
                background: "#171412",
                border: "1px solid rgba(242,235,228,0.12)",
                color: "#f2ebe4",
              }}
            />
            <Bar dataKey="p50" fill="#d9cfc4" name="P50 ms" radius={[4, 4, 0, 0]} />
            <Bar dataKey="p95" fill="#c17a4a" name="P95 ms" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data && (
        <section className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Student ORT P50 / P95"
            value={`${data.latency_ort.p50_ms.toFixed(2)} / ${data.latency_ort.p95_ms.toFixed(2)} ms`}
          />
          <Metric label="vs own eager" value={`${data.speedup_vs_pytorch.toFixed(2)}×`} />
          <Metric label="Student decisions/s" value={data.latency_ort.decisions_per_sec.toFixed(0)} />
        </section>
      )}
      <article className="rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-muted">
        <h2 className="font-medium text-fg">Energy</h2>
        <p className="mt-2">{data?.energy.reason}</p>
      </article>
      {data && (
        <article className="rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-muted">
          <h2 className="font-medium text-fg">Snake loop (student)</h2>
          <p className="mt-2">
            Headless 180 steps, score {data.snake.score}, {data.snake.interventions} safety
            interventions, {data.snake.decisions_per_sec.toFixed(1)} decisions/s including inference.
            Terminal painting excluded. Not a Laya policy claim.
          </p>
        </article>
      )}
      <p className="text-xs text-subtle">
        Official batch-1 P50, RSS, and bundle size versus Hub safetensors are blank until models/typed
        and models/english exist. Those directories were not created here.
      </p>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-subtle">{label}</p>
      <p className="mt-1 font-mono text-xl tabular-nums">{value}</p>
    </div>
  );
}
