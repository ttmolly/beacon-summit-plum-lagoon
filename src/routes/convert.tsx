import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/convert")({ component: ConvertPage });

type Manifest = {
  format: string;
  precision: string;
  approximate: boolean;
  attention: string;
  opset: number;
  source: string;
  source_weights_sha256: string;
  conversion_seconds: number;
  shape: Record<string, unknown>;
  versions: Record<string, string>;
};

function ConvertPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  useEffect(() => {
    fetch("/models/moka-tiny/moka_config.json")
      .then((r) => r.json())
      .then(setManifest)
      .catch(() => setManifest(null));
  }, []);

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Conversion</p>
        <h1 className="font-display text-3xl tracking-tight">Official weights, or a refusal</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          The converter loads original Laya safetensors into an export-only graph and writes a
          self-contained ONNX bundle. On this host it stops first. MemAvailable was about 3.2 GiB,
          swap was 0, and a 421M FP32 export needs 6.71 GiB free. No file was written to
          models/typed, models/english, or models/multi.
        </p>
      </header>
      <pre className="overflow-x-auto rounded-lg border border-border bg-bg-elevated p-4 font-mono text-xs leading-relaxed text-accent">
{`# Needs >= 8 GiB MemAvailable (16 GiB RAM recommended) and 20 GiB free disk for all three.
pip install 'moka[convert]'
pip install laya   # only for the official predict() column

moka convert laya-typed-decisions models/typed
moka convert laya models/english
moka convert laya-multilingual models/multi

moka validate models/typed --reference "$SNAP_TYPED" --laya "$SNAP_TYPED"
moka benchmark models/typed --runs 100 --questions 1
moka benchmark models/typed --runs 50 --questions 8`}
      </pre>
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-border bg-surface p-4">
          <h2 className="font-medium">Default graph</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Explicit matmul/softmax attention, opset 17, dynamic batch and sequence. SDPA is
            an experiment flag: it can emit ops CPU EP cannot run.
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <h2 className="font-medium">Refused on this host</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            typed and english are 842 MB FP16 each (421,293,830 params). multilingual is 644 MB
            (321,908,998). The command exits 2 before the download. moka-tiny is not allowed
            under those names. INT8 is not a default. TensorRT is never implicit.
          </p>
        </article>
      </section>
      {manifest && (
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="font-medium">Live bundle provenance</h2>
          <dl className="mt-3 grid gap-2 font-mono text-xs sm:grid-cols-2">
            <Row k="format" v={manifest.format} />
            <Row k="precision" v={manifest.precision} />
            <Row k="approximate" v={String(manifest.approximate)} />
            <Row k="attention" v={manifest.attention} />
            <Row k="opset" v={String(manifest.opset)} />
            <Row k="convert s" v={manifest.conversion_seconds.toFixed(3)} />
            <Row k="weights sha256" v={manifest.source_weights_sha256.slice(0, 20) + "…"} />
            <Row k="torch / ort" v={`${manifest.versions.torch} / ${manifest.versions.onnxruntime}`} />
          </dl>
        </section>
      )}
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5">
      <dt className="text-subtle">{k}</dt>
      <dd className="truncate text-fg">{v}</dd>
    </div>
  );
}
