import {
  defineRailway,
  github,
  image,
  project,
  preserve,
  service,
  volume,
} from "railway/iac";

const qdrantData = volume("qdrant-data", {
  region: "us-west2",
  sizeMB: 1024,
});

const qdrant = service("qdrant", {
  source: image("qdrant/qdrant:v1.20.1"),
  volumeMounts: {
    "/qdrant/storage": qdrantData,
  },
  env: {
    PORT: "6333",
    QDRANT__SERVICE__API_KEY: preserve(),
  },
  healthcheck: "/readyz",
});

const app = service("qdrant-demo-app", {
  source: github("WillRaphaelson/railway-vector-search-qdrant", { branch: "main" }),
  start: "node server.mjs",
  healthcheck: "/health",
  env: {
    PORT: "3000",
    QDRANT_URL: qdrant.env.RAILWAY_PRIVATE_DOMAIN,
    QDRANT_API_KEY: qdrant.env.QDRANT__SERVICE__API_KEY,
  },
});

export default defineRailway(() => project("self-hosted-qdrant-example", {
  resources: [app, qdrant, qdrantData],
}));
