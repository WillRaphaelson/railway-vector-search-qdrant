# Railway Qdrant Example

This repository deploys a small Node.js demonstration app, a Qdrant vector database service, and a persistent volume. The app and database communicate through Railway private networking. A Railway Volume stores Qdrant's database files at `/qdrant/storage`.

The demo has four behaviors:

- `GET /health` reports whether the app process is responding.
- `GET /api/qdrant-health` checks Qdrant's `/readyz` endpoint.
- `POST /api/seed` creates a four-dimensional collection if needed and writes three sample records.
- `POST /api/search` queries those points with a supplied four-number vector.

The demo uses fixed vectors so the database connection and query workflow are visible without choosing an embedding model. It does not generate embeddings or represent a production retrieval stack.

## Run locally

1. Start Qdrant with its official [Docker installation instructions](https://qdrant.tech/documentation/install/).
2. Copy `.env.example` to `.env`. Set `QDRANT_API_KEY` if the local Qdrant service uses an API key.
3. Run `npm start`.
4. Open `http://localhost:3000`, click **Seed sample data**, then **Search sample data**.

## Deploy with Railway

The `.railway/railway.ts` file declares the Qdrant image, volume mount, Qdrant API service, private service reference, and app healthcheck using Railway Infrastructure as Code. The API key uses `preserve()` so the value is stored in Railway rather than committed to source control. Set `QDRANT__SERVICE__API_KEY` on the Qdrant service in Railway before exposing any public route to the demo app.

The template version published from the tested project will generate an API key for each new deployment. The published template also deploys the application with a public HTTPS endpoint so the demo page can be opened in a browser. The Qdrant service itself stays on the private network.

## Template overview

See [TEMPLATE-OVERVIEW.md](TEMPLATE-OVERVIEW.md) for the marketplace description and deployment requirements.
