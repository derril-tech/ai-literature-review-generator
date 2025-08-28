Python Workers

Workers are FastAPI-managed services triggered via NATS subjects and writing to Postgres/S3.

Planned workers per ARCH.md:
- pdf-worker, meta-worker, embed-worker, cluster-worker, label-worker, summary-worker, rag-worker, matrix-worker, bundle-worker, export-worker.

Dev quickstart:
- pip install -e .[dev]
- pytest -q

