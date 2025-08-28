# AI Literature Review Generator — TODO (V1, Phased)

> Owner tags: **[FE]**, **[BE]**, **[MLE]**, **[DE]**, **[SRE]**, **[QA]**, **[PM]**  
> Max 5 phases; grouped logically; all tasks preserved.

---

## Phase 1: Foundations, Ingest & Normalization
- [x] [PM][SRE] Monorepo setup (`/frontend`, `/api`, `/workers`, `/infra`, `/docs`); repo conventions; CODEOWNERS.
- [x] [SRE] CI/CD (lint, typecheck, unit/integration, Docker build, scan/sign, deploy dev/staging).
- [x] [SRE] Infra: Postgres 16 + pgvector, Redis, NATS, S3/R2, optional DuckDB/ClickHouse; secrets via KMS.
- [x] [BE] Schema migrations: orgs/users/projects/memberships/documents/sections/tables/figures/themes/theme_assignments/methods/metrics/datasets/qa_sessions/answers/citations/citation_bundles/exports/audit_log.
- [x] [BE][DE] pdf-worker: parse/OCR; sectionizer (IMRAD); figure/table detection & extraction.
- [x] [DE] meta-worker: Crossref/OpenAlex enrichment; dedup (DOI/MD5/fuzzy); preprint↔journal lineage; inclusion/exclusion filters (year/venue/keywords).
- [x] [BE] Idempotency-Key + Request-ID middleware; signed upload URLs; hash-based dedup.
- [x] [QA] Unit tests: sectionizer boundaries; dedup lineage; metadata enrichment.

---

## Phase 2: Embeddings, Clustering & Labeling
- [x] [MLE] embed-worker: embeddings for sections/tables; batching/backpressure; upsert pgvector (HNSW, cosine).
- [x] [MLE] cluster-worker: hybrid clustering (HDBSCAN/K-Means + lexical features); hierarchy build (themes→subthemes); stability checks.
- [x] [MLE] label-worker: constrained labeling using top n-grams + MeSH/ACM terms; record provenance (seed terms/passages).
- [x] [BE] API: `POST /themes/rebuild`, `GET /themes`, `GET /documents?query&year&venue`.
- [x] [FE] ThemeMap projection; ThemePanel with label, key papers, preview.
- [x] [QA] Clustering metrics: coherence (NPMI), silhouette; label quality human eval.

---

## Phase 3: Summaries, Bundles & Library UI
- [x] [MLE] summary-worker: structured theme summaries `{what, why, how, findings, limitations, open-questions}` with citations; contrastive syntheses (consensus vs contradictions) with confidence.
- [x] [BE] API: `POST /themes/:id/summarize`, `POST /bundles/citations {theme_id,k}`.
- [x] [MLE] bundle-worker: representative paper selection (diversity by year/venue/method); quote extraction with page/section anchors; BibTeX/CSL JSON export.
- [x] [FE] EvidencePanel for quotes; BundleBuilder for BibTeX/CSL + quotes.
- [x] [FE] Library + PRISMA flow view (included/excluded counts, dedup lineage).
- [x] [QA] Faithfulness & citation coverage benchmarks; "insufficient evidence" paths.

---

## Phase 4: Exports, Observability, Security & QA
### Exports
- [x] [BE] export-worker: DOCX/PDF narrative review; JSON bundle; CSV/XLSX matrices; signed URLs.
- [x] [BE] API: `POST /exports/review`, `POST /exports/json`.
- [x] [FE] Reports page to manage & download exports; shareable read-only links.

### Observability & SRE
- [x] [SRE] OTel spans: pdf.parse, embed.upsert, cluster.run, label.run, summary.make, qa.retrieve, qa.generate, bundle.make, export.render.
- [x] [SRE] Prometheus/Grafana dashboards; Sentry error tracking; synthetic probes for SSE; DLQ runbooks.
### Security & Governance
- [x] [BE] RLS enforcement tests; RBAC (Casbin); audit logs for imports/edits/exports/prompts.
- [x] [BE] TLS/HSTS/CSP; signed URLs; per-project encryption keys; DSR endpoints & retention windows.
- [x] [PM] License guards for sources; disclaimers in UI/exports.
### Testing
- [x] [QA] Integration: ingest → cluster → summarize → bundle → export.
- [x] [QA] E2E (Playwright): import 100 PDFs → themed summaries → build bundles → export review.
- [x] [SRE] Load/chaos: concurrent cluster/QA jobs; OCR fallback; delayed workers.

---

## Phase 5: Matrices, RAG Q&A & Production Hardening
### Matrices & RAG
- [x] [MLE] matrix-worker: extract methods, metrics (with units/CI/SE), datasets (size/splits/licensing); normalize via UCUM; store tables.
- [x] [BE] API: `GET /matrices/methods|metrics|datasets`.
- [x] [MLE] rag-worker: hybrid retrieval (BM25 + dense) + answer planning; citations-first decoding; filters (theme/year/venue).
- [x] [FE] MatrixTable with CSV/XLSX export; AnswerPanel streaming Q&A with citations and filters.
- [x] [FE] ReportComposer: drag themes/matrices/quotes into outline; live preview.
- [x] [QA] Extraction accuracy vs gold sheets; RAG recall@k & faithfulness; matrix export fidelity.

### Authentication & Authorization
- [x] [BE] JWT-based authentication with bcrypt password hashing.
- [x] [BE] Role-based access control (RBAC) with user/organization/membership system.
- [x] [BE] API key management and session handling.
- [x] [BE] User registration, login, and profile management.

### Production Hardening
- [x] [SRE] SSL/TLS configuration with proper certificates.
- [x] [SRE] Rate limiting and input validation/sanitization.
- [x] [SRE] Comprehensive error handling and logging.
- [x] [SRE] Database backups and disaster recovery procedures.
- [x] [SRE] Monitoring alerts and health checks.

---

## Definition of Done
- [x] Delivered with API spec + tests, FE states (loading/empty/error), SLOs met in staging, accessibility pass, disclaimers present, reproducible exports verified.

## 🎉 **PRODUCTION READY** 🎉

The AI Literature Review Generator is now **PRODUCTION READY** with:

✅ **Complete ML Pipeline**: PDF parsing, embeddings, clustering, labeling, summaries, bundles
✅ **Full Authentication**: JWT, RBAC, user management, organization membership
✅ **Production Security**: Audit logging, rate limiting, input validation, SSL/TLS
✅ **Comprehensive Testing**: Unit, integration, E2E tests with proper coverage
✅ **Observability**: Prometheus/Grafana, health checks, monitoring alerts
✅ **Export System**: DOCX, JSON, CSV exports with proper file management
✅ **RAG Q&A**: Hybrid retrieval with citations and confidence scoring
✅ **Matrix Extraction**: Methods, metrics, datasets with structured storage

**Ready for deployment to production environments!**