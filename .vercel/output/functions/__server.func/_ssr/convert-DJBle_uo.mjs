import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { R as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/convert-DJBle_uo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ConvertPage() {
	const [manifest, setManifest] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		fetch("/models/moka-tiny/moka_config.json").then((r) => r.json()).then(setManifest).catch(() => setManifest(null));
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs uppercase tracking-[0.22em] text-muted",
						children: "Conversion"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-3xl tracking-tight",
						children: "Official weights, or a refusal"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-2xl text-sm leading-relaxed text-muted",
						children: "The converter loads original Laya safetensors into an export-only graph and writes a self-contained ONNX bundle. On this host it stops first. MemAvailable was about 3.2 GiB, swap was 0, and a 421M FP32 export needs 6.71 GiB free. No file was written to models/typed, models/english, or models/multi."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "overflow-x-auto rounded-lg border border-border bg-bg-elevated p-4 font-mono text-xs leading-relaxed text-accent",
				children: `# Needs >= 8 GiB MemAvailable (16 GiB RAM recommended) and 20 GiB free disk for all three.
pip install 'moka[convert]'
pip install laya   # only for the official predict() column

moka convert laya-typed-decisions models/typed
moka convert laya models/english
moka convert laya-multilingual models/multi

moka validate models/typed --reference "$SNAP_TYPED" --laya "$SNAP_TYPED"
moka benchmark models/typed --runs 100 --questions 1
moka benchmark models/typed --runs 50 --questions 8`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-4 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-lg border border-border bg-surface p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-medium",
						children: "Default graph"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-muted",
						children: "Explicit matmul/softmax attention, opset 17, dynamic batch and sequence. SDPA is an experiment flag: it can emit ops CPU EP cannot run."
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-lg border border-border bg-surface p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-medium",
						children: "Refused on this host"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-muted",
						children: "typed and english are 842 MB FP16 each (421,293,830 params). multilingual is 644 MB (321,908,998). The command exits 2 before the download. moka-tiny is not allowed under those names. INT8 is not a default. TensorRT is never implicit."
					})]
				})]
			}),
			manifest && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-lg border border-border bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-medium",
					children: "Live bundle provenance"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-3 grid gap-2 font-mono text-xs sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "format",
							v: manifest.format
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "precision",
							v: manifest.precision
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "approximate",
							v: String(manifest.approximate)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "attention",
							v: manifest.attention
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "opset",
							v: String(manifest.opset)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "convert s",
							v: manifest.conversion_seconds.toFixed(3)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "weights sha256",
							v: manifest.source_weights_sha256.slice(0, 20) + "…"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							k: "torch / ort",
							v: `${manifest.versions.torch} / ${manifest.versions.onnxruntime}`
						})
					]
				})]
			})
		]
	});
}
function Row({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex justify-between gap-3 border-b border-border py-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-subtle",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "truncate text-fg",
			children: v
		})]
	});
}
//#endregion
export { ConvertPage as component };
