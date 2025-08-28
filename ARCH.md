# AI Literature Review Generator — Architecture (V1)

## 1) System Overview
**Frontend/BFF:** Next.js 14 (Vercel) — SSR for heavy viewers; ISR for public reports; Server Actions for signed uploads.  
**API Gateway:** NestJS (Node 20) — REST **/v1** with OpenAPI 3.1, Zod validation, Problem+JSON, RBAC (Casbin), RLS, Idempotency-Key + Request-ID.  
**Workers (Python 3.11 + FastAPI control):**
- pdf-worker (parse/OCR; sections/figures/tables)
- meta-worker (Crossref/OpenAlex enrich; dedup & lineage)
- embed-worker (text/table embeddings)
- cluster-worker (HDBSCAN/K-Means; hierarchy)
- label-worker (constrained theme naming)
- summary-worker (theme + contrastive summaries)
- rag-worker (retrieval + planning/generation with citations-first decoding)
- matrix-worker (methods/metrics/datasets)
- bundle-worker (representatives, quotes, BibTeX/CSL)
- export-worker (DOCX/PDF/CSV/JSON)

**Event Bus/Queues:** NATS (`doc.ingest`, `doc.normalize`, `index.upsert`, `cluster.run`, `label.run`, `summary.make`, `matrix.make`, `qa.ask`, `bundle.make`, `export.make`) + Redis Streams DLQ.  
**Datastores:** Postgres 16 + pgvector (sections embeddings + metadata), S3/R2 (PDFs/exports), Redis (cache/session), optional DuckDB (ad‑hoc analytics), ClickHouse (usage analytics).  
**Observability:** OpenTelemetry + Prometheus/Grafana; Sentry.  
**Security:** TLS/HSTS/CSP; Cloud KMS; per‑project encryption; Postgres RLS; audit logs.

## 2) Data Model (summary)
- **Tenancy:** orgs, users, projects, memberships (RLS on project_id).  
- **Documents/Papers:** documents (DOI/title/authors/venue/year/hash/s3_pdf/status/meta).  
- **Sections:** per document text + embedding (HNSW index).  
- **Tables/Figures:** extracted tables (schema/units) and figures (captions, page, s3).  
- **Themes/Clusters:** themes (hierarchy), theme_assignments (weights).  
- **Matrices:** methods, metrics (values with units/CI/SE), datasets.  
- **Q&A/Evidence:** qa_sessions, answers (text + reasoning + confidence), citations (document + ref + snippet + score).  
- **Bundles & Exports:** citation_bundles (papers, BibTeX, CSL, quotes), exports (s3 keys).  
- **Audit:** audit_log.

**Invariants**
- Objects append-only; re-parses create new versions.  
- Every summary/answer requires ≥1 citation or returns “insufficient evidence.”  
- Theme labels store provenance (seed terms/passages).  
- Unit conversions logged and reproducible.

## 3) Key Flows

### 3.1 Ingest & Normalize
1. Upload PDFs/DOIs/RIS/BibTeX → **pdf-worker** parses; OCR fallback for scans.  
2. **meta-worker** enriches from Crossref/OpenAlex; dedup via DOI/MD5/fuzzy; link preprint↔journal; apply inclusion filters.  
3. Store documents/sections/tables/figures; emit `index.upsert`.

### 3.2 Index & Cluster
1. **embed-worker** creates embeddings for sections/tables → pgvector HNSW.  
2. **cluster-worker** runs hybrid clustering, builds hierarchy; **label-worker** assigns constrained labels with provenance.  
3. Warm Redis caches for hot themes and outlines.

### 3.3 Summarize & Bundles
1. **summary-worker** composes structured theme & contrastive summaries from cited passages; records confidence.  
2. **bundle-worker** selects representative papers, extracts quotes with anchors, generates BibTeX/CSL JSON.

### 3.4 Matrices & Q&A
1. **matrix-worker** extracts methods/metrics/datasets; normalizes units (UCUM).  
2. **rag-worker** performs hybrid retrieval + citations-first decoding; supports filters (theme/year/venue).

### 3.5 Compose & Export
1. Report composer assembles themes, matrices, bundles.  
2. **export-worker** renders DOCX/PDF/CSV/JSON; artifacts saved to S3; signed URLs returned.

## 4) API Surface (REST /v1)
- **Auth/Users:** login, refresh, me, usage.  
- **Documents:** `POST /documents`, `POST /documents/:id/reparse`, `GET /documents`, `GET /documents/:id`.  
- **Themes:** `POST /themes/rebuild`, `GET /themes`, `POST /themes/:id/summarize`.  
- **Matrices:** `GET /matrices/methods|metrics|datasets`.  
- **Q&A:** `POST /qa`, `GET /answers/:id`, `GET /answers/:id/citations`.  
- **Bundles/Exports:** `POST /bundles/citations`, `POST /exports/review`, `POST /exports/json`.  
Conventions: Idempotency-Key; cursor pagination; Problem+JSON; SSE for long jobs (QA, export).

## 5) Observability & SLOs
- **Spans:** pdf.parse, embed.upsert, cluster.run, label.run, summary.make, qa.retrieve, qa.generate, matrix.make, bundle.make, export.render.  
- **Metrics:** parse latency, cluster coherence, retrieval recall@k, faithfulness score, export p95.  
- **SLOs:** 25‑page parse <15s p95; theme rebuild (≤1k) <30s p95; QA first token <2.0s, full <8s; export review <6s p95.

## 6) Security & Governance
- Postgres RLS; Casbin RBAC at API; doc‑level ACLs.  
- KMS‑wrapped tokens; per‑project encryption; signed URLs.  
- Audit trail for imports, edits, exports, prompts.  
- Data Subject Requests; configurable retention; license guards for sources.

## 7) Performance & Scaling
- HNSW tuned (`m`, `ef_search`); adaptive chunking by layout density.  
- Redis caches for outlines, top‑k per theme; precompute hot neighbors.  
- Workers horizontally scalable; DLQ with backoff/jitter.  
- DuckDB for local joins on large CSVs; ClickHouse for usage analytics.

## 8) Accessibility & i18n
- Keyboard-first navigation across clusters, quotes, and tables.  
- ARIA roles for chips, graphs, tables; high-contrast mode.  
- next-intl localization for numbers/dates/venues.