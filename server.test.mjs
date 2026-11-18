import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";

test("health route and invalid vector validation", async () => {
  const qdrant = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ title: "qdrant", version: "test" }));
  });
  qdrant.listen(0, "127.0.0.1");
  await once(qdrant, "listening");
  const qdrantPort = qdrant.address().port;
  const app = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL(".", import.meta.url),
    env: { ...process.env, PORT: "0", QDRANT_URL: `http://127.0.0.1:${qdrantPort}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  app.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  const started = new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error("app did not start")), 5000);
    const poll = setInterval(() => {
      const match = output.match(/Demo app listening on (\d+)/);
      if (match) { clearTimeout(deadline); clearInterval(poll); resolve(Number(match[1])); }
    }, 25);
    app.once("exit", (code) => reject(new Error(`app exited with ${code}`)));
  });
  try {
    const port = await started;
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });
    const invalid = await fetch(`http://127.0.0.1:${port}/api/search`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vector: [1, 2] }),
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { error: "vector must contain four finite numbers" });
  } finally {
    app.kill("SIGTERM");
    qdrant.close();
  }
});
