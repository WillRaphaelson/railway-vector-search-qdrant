import http from "node:http";

const port = Number(process.env.PORT || 3000);
const configuredQdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
const qdrantUrl = (configuredQdrantUrl.includes("://") ? configuredQdrantUrl : `http://${configuredQdrantUrl}:6333`).replace(/\/$/, "");
const qdrantApiKey = process.env.QDRANT_API_KEY || "";
const collection = "railway_guide_demo";
const samplePoints = [
  { id: "a8d3e9f0-8d9e-4b7f-9f02-2c6f82b31001", vector: [1, 0, 0, 0], payload: { text: "Railway Volumes keep database files between deployments." } },
  { id: "a8d3e9f0-8d9e-4b7f-9f02-2c6f82b31002", vector: [0, 1, 0, 0], payload: { text: "Qdrant uses a collection to organize vectors and payloads." } },
  { id: "a8d3e9f0-8d9e-4b7f-9f02-2c6f82b31003", vector: [0, 0, 1, 0], payload: { text: "Railway private networking lets app services reach Qdrant internally." } },
];

function send(res, status, body, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  res.end(contentType.startsWith("application/json") ? JSON.stringify(body) : body);
}

async function requestQdrant(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (qdrantApiKey) headers["api-key"] = qdrantApiKey;
  const response = await fetch(`${qdrantUrl}${path}`, { ...options, headers });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { response, body };
}

async function ensureCollection() {
  const existing = await requestQdrant(`/collections/${collection}`);
  if (existing.response.ok) return;
  if (existing.response.status !== 404) {
    throw new Error(`Qdrant collection check failed (${existing.response.status})`);
  }
  const created = await requestQdrant(`/collections/${collection}`, {
    method: "PUT",
    body: JSON.stringify({ vectors: { size: 4, distance: "Cosine" } }),
  });
  if (!created.response.ok) {
    throw new Error(`Qdrant collection creation failed (${created.response.status})`);
  }
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validVector(value) {
  return Array.isArray(value) && value.length === 4 && value.every((n) => Number.isFinite(n));
}

const page = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Railway + Qdrant demo</title>
<style>body{font:16px/1.55 system-ui,sans-serif;max-width:720px;margin:4rem auto;padding:0 1.25rem;color:#202124}button{padding:.65rem 1rem;border:0;border-radius:6px;background:#7b61ff;color:white;font:inherit;cursor:pointer}pre{white-space:pre-wrap;background:#f4f4f7;padding:1rem;border-radius:8px}code{background:#eee;padding:.12rem .3rem;border-radius:4px}</style></head>
<body><h1>Railway + Qdrant</h1><p>This small app writes three sample points to Qdrant, then searches them with a four-number vector. The example does not generate embeddings.</p>
<p><button id="seed">Seed sample data</button> <button id="search">Search sample data</button> <button id="health">Check Qdrant health</button></p><pre id="result">Choose an action to call the API.</pre>
<script>
const out=document.querySelector('#result');
async function call(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const text=await r.text();out.textContent=text;}
document.querySelector('#seed').onclick=()=>call('/api/seed',{});
document.querySelector('#search').onclick=()=>call('/api/search',{vector:[0.9,0.1,0,0]});
document.querySelector('#health').onclick=()=>call('/api/qdrant-health');
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/") return send(res, 200, page, "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { status: "ok" });
    if (req.method === "GET" && url.pathname === "/api/qdrant-health") {
      const { response, body } = await requestQdrant("/readyz");
      return send(res, response.ok ? 200 : 503, { status: response.ok ? "ready" : "unavailable", qdrant: body });
    }
    if (req.method === "POST" && url.pathname === "/api/seed") {
      await readJson(req);
      await ensureCollection();
      const { response, body } = await requestQdrant(`/collections/${collection}/points?wait=true`, {
        method: "PUT",
        body: JSON.stringify({ points: samplePoints }),
      });
      return send(res, response.ok ? 200 : 502, response.ok ? { status: "seeded", count: samplePoints.length } : body);
    }
    if (req.method === "POST" && url.pathname === "/api/search") {
      const input = await readJson(req);
      if (!validVector(input.vector)) return send(res, 400, { error: "vector must contain four finite numbers" });
      const { response, body } = await requestQdrant(`/collections/${collection}/points/query`, {
        method: "POST",
        body: JSON.stringify({ query: input.vector, limit: 3, with_payload: true }),
      });
      return send(res, response.ok ? 200 : 502, response.ok ? body.result : body);
    }
    return send(res, 404, { error: "not found" });
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 502;
    return send(res, status, { error: status === 400 ? "invalid JSON body" : "request failed", detail: error.message });
  }
});

server.listen(port, "0.0.0.0", () => console.log(`Demo app listening on ${server.address().port}`));
