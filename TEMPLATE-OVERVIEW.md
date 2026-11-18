# Deploy and Host a Private Qdrant Vector Database and Demo App on Railway

## About Hosting Qdrant and the Demo App

This template deploys one Qdrant service, a Railway Volume mounted at `/qdrant/storage`, and a small Node.js app that can seed and query a sample four-dimensional collection. The app reaches Qdrant through Railway private networking. Qdrant is not exposed publicly. The demo app receives a public HTTPS endpoint so you can use its seed and search controls in a browser.

## Why Deploy Qdrant and the Demo App on Railway?

Keep the application and its vector database in one Railway project environment. The volume persists Qdrant files through restarts and deployments; the internal service reference keeps database traffic on the private network. The demo app makes the connection, seed, and query path easy to inspect.

## Common Use Cases

- Try a private Qdrant service beside a small application.
- See how persistent database files differ from the app container's temporary filesystem.
- Test application-level integration before choosing an embedding model and production topology.

## Dependencies for Qdrant Hosting

- Qdrant `v1.20.1`, using the official `qdrant/qdrant` image.
- A Railway Volume mounted at `/qdrant/storage`.
- A Railway API service built from the template repository.
- One generated Qdrant API key shared with the application through a Railway service reference.

### Deployment Dependencies

- Railway creates a new project and environment for the deployment.
- The app and Qdrant services must remain in the same environment for their private network reference to resolve.
- The app's public URL is for the sample interface. Qdrant stays private.
- This is a single-node demonstration. Volume-backed services cannot use Railway replicas, and Qdrant redeploys have a short interruption.

## Use the Demo

Open the app's generated HTTPS URL, click **Seed sample data**, then click **Search sample data**. The example uses fixed vectors and does not call an embedding model.

## Source and Documentation

- Source repository: https://github.com/WillRaphaelson/railway-vector-search-qdrant
- Qdrant installation: https://qdrant.tech/documentation/install/
- Railway private networking: https://docs.railway.com/networking/private-networking
- Railway volumes: https://docs.railway.com/volumes
