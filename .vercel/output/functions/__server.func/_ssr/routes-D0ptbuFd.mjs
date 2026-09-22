import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { R as require_jsx_runtime, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as CircleX, i as Cpu, n as ShieldCheck, o as ArrowRight, r as Gauge } from "../_libs/lucide-react.mjs";
import { t as Badge } from "./badge-DVdOTbBI.mjs";
import { t as Button } from "./button-BdSii95N.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-D0ptbuFd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	const [data, setData] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		fetch("/data/studio.json").then((r) => r.json()).then(setData).catch(() => setData(null));
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "space-y-14",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs uppercase tracking-[0.22em] text-muted",
							children: "Independent Linux port"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "max-w-xl font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl",
							children: "Same Laya answers. No PyTorch at inference."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "max-w-xl text-base leading-relaxed text-muted",
							children: "Moka converts official Laya checkpoints to ONNX Runtime. It does not train a new model and it does not rename Hub weights. This machine refused the 421M and 322M exports: about 3.2 GiB free, no swap, 6.71 GiB required. The studio graph is a distilled reference, not Laya."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/playground",
									children: ["Run a decision ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "secondary",
								asChild: true,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/snake",
									children: "Watch Snake"
								})
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "rounded-xl border border-border bg-surface p-5 shadow-soft",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs uppercase tracking-[0.18em] text-muted",
							children: "Distilled reference, not Laya"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-4 grid grid-cols-2 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "ORT P50",
									value: data ? `${data.latency_ort.p50_ms.toFixed(2)} ms` : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "vs own PyTorch",
									value: data ? `${data.speedup_vs_pytorch.toFixed(2)}×` : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "Student fidelity",
									value: data ? `${data.fidelity_fp32.matched}/${data.fidelity_fp32.total}` : "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
									label: "421M bundles",
									value: "refused",
									warn: true
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-xs leading-relaxed text-subtle",
							children: "moka-tiny, hidden 64. The 1.21× is this student versus its own eager graph, not a win over official Laya. Hub conversion did not run."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Note, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "size-4" }),
						title: "ONNX Runtime, CPU first",
						body: "Default execution provider is CPU. CUDA, TensorRT and OpenVINO are opt-in because they are absent here and TensorRT can change numerics."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Note, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "size-4" }),
						title: "Drift-gated, not vibes",
						body: "FP32 matched 43/43 on the distilled student, drift 0.0. That is not Laya parity. INT8 matched 41/43 and is not a default."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Note, {
						icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { className: "size-4" }),
						title: "Energy: not invented",
						body: "RAPL was unreadable. nvidia-smi is absent. Energy per decision is omitted with that reason, not guessed."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl tracking-tight",
					children: "API surface"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "overflow-x-auto rounded-lg border border-border bg-bg-elevated p-4 font-mono text-xs leading-relaxed text-accent",
					children: `import moka
agent = moka.load("./models/typed")
result = agent.predict(state, {
  "refund": {"type": "noul", "instructions": "Does the customer request a refund?"}
})
# choice / score / noul · calibrated probabilities · output_tokens = 0`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: "Apache-2.0" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: "Not an official Convai or laya-coreml release" }),
					data?.fidelity_int8.passed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: "ok",
						children: "INT8 passed"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						tone: "danger",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "size-3" }), " INT8 failed answer-match gate"]
					})
				]
			})
		]
	});
}
function Stat({ label, value, warn }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
		className: "text-xs uppercase tracking-[0.16em] text-subtle",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
		className: `mt-1 font-mono text-lg tabular-nums ${warn ? "text-danger" : "text-fg"}`,
		children: value
	})] });
}
function Note({ icon, title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-lg border border-border bg-surface p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 text-muted",
			children: [icon, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-medium text-fg",
				children: title
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm leading-relaxed text-muted",
			children: body
		})]
	});
}
//#endregion
export { Home as component };
