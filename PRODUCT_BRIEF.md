AI Literature Review Generator — auto-group academic papers into themes with citation bundles 

 

1) Product Description & Presentation 

One-liner 

“Upload or connect your paper set and get an instant, evidence-linked literature review: auto-grouped themes, crisp summaries, and citation bundles you can export.” 

What it produces 

Theme clusters of papers (topics/subtopics) with human-readable labels and short abstracts. 

Citation bundles per theme: top passages, canonical citations, BibTeX/CSL JSON, and key quotes with page refs. 

Contrastive syntheses that explain where studies agree, differ, or contradict, with confidence and links. 

Method/metric matrices (study design, datasets, models, metrics) extracted and normalized. 

PRISMA-style flow (included/excluded criteria, dedup lineage). 

Exports: DOCX/PDF narrative review, CSV/Excel matrices, and a JSON bundle of the corpus, themes, and claims. 

Scope/Safety 

Research assistance only; not a substitute for peer review. 

All summaries are grounded in cited passages; if insufficient evidence, the system says so. 

Optional code-exec sandbox is locked to whitelisted libs for reproducible plots/tables. 

 

2) Target User 

Graduate students & researchers compiling literature in a domain. 

R&D teams surveying techniques and benchmarks. 

Systematic review authors (rapid scoping, narrative reviews). 

Science communicators preparing evidence summaries. 

 

3) Features & Functionalities (Extensive) 

Ingestion & Connectors 

Sources: arXiv, PubMed/PMC, Crossref/DOI, OpenAlex/Semantic Scholar; drag-and-drop PDFs; RIS/BibTeX/EndNote. 

Artifacts: full text, figures/tables, references, metadata (title, authors, venue, year, DOI). 

Dedup & lineage: DOI/MD5/metadata fuzzy match; link preprint ↔ journal versions. 

Filters: year, venue tier, field, inclusion/exclusion keywords. 

Normalization & Enrichment 

Layout parsing: sectionizer (Intro/Methods/Results/Discussion/Conclusion); table extraction. 

Entity tagging: tasks, datasets, methods, models, metrics, domains; units normalization (UCUM). 

Quality signals: citation counts, venue tier, sample size, study type (RCT/obs/benchmark). 

Reference graph: in/out-degree, co-citation clusters, temporal spread. 

Theming & Summarization 

Hybrid clustering: HDBSCAN/K-Means on sentence/section embeddings + lexical features; hierarchical themes → subthemes. 

Theme labeling: LLM labeler constrained by top n-grams, CPC/MeSH/ACM terms. 

Theme summaries: structured {what, why, how, findings, limitations, open-questions} with citations. 

Contrastive view: highlights consensus vs disagreement; flags contradictions. 

Citation Bundles 

Representative set: k papers per theme with diversity (year/venue/method). 

Auto-quotes: extracted key passages with page/section anchors. 

Bib exports: BibTeX, CSL JSON; consistent canonicalization across variants. 

Claim ↔ evidence map: each claim ties to passages/figures/tables. 

Study Matrices & Metrics 

Method matrix: rows=papers, cols=method components; binary/valued cells. 

Metric table: normalized metrics with units; CI/SE when present. 

Dataset table: sizes/splits/regions/licensing. 

Retrieval & Q&A (RAG) 

Hybrid retrieval: BM25 + dense pgvector + rerank; section-aware and table-aware. 

Citations-first decoding: answer planning selects evidence before generation. 

Filters: restrict by theme/subtheme/venue/year. 

Views & Reporting 

Theme map (2-D projection) with cluster sizes; click → theme details. 

Paper library with dedup states; PRISMA flow. 

Matrices and evidence panels with copy-ready quotes. 

Report composer: drag themes, matrices, and citations into an outline. 

Rules & Automations 

Auto-update themes as new papers arrive. 

Alerts for new high-signal papers in tracked themes. 

Weekly digest with deltas to summaries and matrices. 

Collaboration & Governance 

Workspaces/projects; roles (Owner/Admin/Member/Viewer). 

Read-only share links for public theme cards/reports. 

Full audit trail of imports, edits, exports, and prompts. 

 

4) Backend Architecture (Extremely Detailed & Deployment-Ready) 

4.1 Topology 

Frontend/BFF: Next.js 14 (Vercel). Server Actions for signed uploads, SSR for large viewers, ISR for public reports. 

API Gateway: NestJS (Node 20) — REST /v1 (OpenAPI 3.1), Zod validation, Problem+JSON, RBAC (Casbin), RLS, Idempotency-Key, Request-ID (ULID). 

Python workers (3.11 + FastAPI control) 

pdf-worker (parse/OCR; tables/figures) 

meta-worker (Crossref/OpenAlex enrich, dedup) 

embed-worker (text/table embeddings) 

cluster-worker (HDBSCAN/K-Means; hierarchy build) 

label-worker (theme naming with constraints) 

summary-worker (theme/contrastive summaries) 

rag-worker (retrieval + answer planning/generation) 

matrix-worker (method/metric/dataset extraction) 

bundle-worker (citation bundles, BibTeX/CSL) 

export-worker (DOCX/PDF/CSV/JSON) 

Event bus/queues: NATS (doc.ingest, doc.normalize, index.upsert, cluster.run, label.run, summary.make, matrix.make, qa.ask, bundle.make, export.make) + Redis Streams; Celery/RQ orchestration. 

Datastores: Postgres 16 + pgvector, S3/R2 (PDFs/exports), Redis (cache/session), optional DuckDB (local analytics), ClickHouse (usage analytics). 

Observability: OpenTelemetry + Prometheus/Grafana; Sentry. 

Secrets: Cloud KMS; per-workspace encryption keys. 

4.2 Data Model (Postgres + pgvector) 

-- Tenancy 
CREATE TABLE orgs (id UUID PRIMARY KEY, name TEXT, plan TEXT DEFAULT 'free', created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE users (id UUID PRIMARY KEY, org_id UUID REFERENCES orgs(id) ON DELETE CASCADE, 
  email CITEXT UNIQUE NOT NULL, name TEXT, role TEXT DEFAULT 'member', tz TEXT, created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE projects (id UUID PRIMARY KEY, org_id UUID, name TEXT, created_by UUID, created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE memberships (user_id UUID, project_id UUID, role TEXT CHECK (role IN ('owner','admin','member','viewer')), 
  PRIMARY KEY(user_id, project_id)); 
 
-- Documents / Papers 
CREATE TABLE documents ( 
  id UUID PRIMARY KEY, project_id UUID, doi TEXT, title TEXT, authors TEXT[], 
  venue TEXT, year INT, kind TEXT, hash TEXT UNIQUE, s3_pdf TEXT, status TEXT, meta JSONB 
); 
CREATE TABLE sections ( 
  id UUID PRIMARY KEY, document_id UUID, name TEXT, page_from INT, page_to INT, text TEXT, 
  embedding VECTOR(1536), meta JSONB 
); 
CREATE INDEX ON sections USING hnsw (embedding vector_cosine_ops); 
 
-- Tables & Figures (optional) 
CREATE TABLE tables (id UUID PRIMARY KEY, document_id UUID, title TEXT, schema JSONB, units JSONB, meta JSONB); 
CREATE TABLE figures (id UUID PRIMARY KEY, document_id UUID, caption TEXT, page INT, s3_key TEXT, meta JSONB); 
 
-- Themes / Clusters 
CREATE TABLE themes (id UUID PRIMARY KEY, project_id UUID, parent_id UUID, label TEXT, summary JSONB, quality JSONB, meta JSONB); 
CREATE TABLE theme_assignments (theme_id UUID, document_id UUID, weight NUMERIC, PRIMARY KEY(theme_id, document_id)); 
 
-- Matrices 
CREATE TABLE methods (id UUID PRIMARY KEY, document_id UUID, components JSONB, meta JSONB); 
CREATE TABLE metrics (id UUID PRIMARY KEY, document_id UUID, values JSONB, meta JSONB); 
CREATE TABLE datasets (id UUID PRIMARY KEY, document_id UUID, summary JSONB, meta JSONB); 
 
-- Q&A / Evidence 
CREATE TABLE qa_sessions (id UUID PRIMARY KEY, project_id UUID, question TEXT, created_by UUID, created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE answers (id UUID PRIMARY KEY, session_id UUID, text TEXT, confidence NUMERIC, reasoning JSONB, created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE citations (id UUID PRIMARY KEY, answer_id UUID, document_id UUID, ref JSONB, snippet TEXT, score NUMERIC); 
 
-- Bundles & Exports 
CREATE TABLE citation_bundles (id UUID PRIMARY KEY, theme_id UUID, papers UUID[], bibtex TEXT, csl_json JSONB, quotes JSONB, created_at TIMESTAMPTZ DEFAULT now()); 
CREATE TABLE exports (id UUID PRIMARY KEY, project_id UUID, kind TEXT, s3_key TEXT, meta JSONB, created_at TIMESTAMPTZ DEFAULT now()); 
 
-- Audit 
CREATE TABLE audit_log (id BIGSERIAL PRIMARY KEY, org_id UUID, user_id UUID, action TEXT, target TEXT, meta JSONB, created_at TIMESTAMPTZ DEFAULT now()); 
  

Invariants 

RLS on project_id. 

Every summary/answer requires ≥1 citation; else return “insufficient evidence.” 

Theme labels recorded with provenance (top terms + seed passages). 

4.3 API Surface (REST /v1, OpenAPI 3.1) 

Auth/Users: POST /auth/login, POST /auth/refresh, GET /me, GET /usage 

Documents: 

POST /documents (signed upload or DOI list) → doc.ingest 

POST /documents/:id/reparse 

GET /documents/:id, GET /documents?query&year&venue 

Themes & Summaries: 

POST /themes/rebuild {project_id} 

GET /themes?project_id=… 

POST /themes/:id/summarize 

Matrices: 

GET /matrices/methods?project_id=… 

GET /matrices/metrics?project_id=… 

Q&A: 

POST /qa {project_id, question, filters?} → SSE stream with citations 

GET /answers/:id, GET /answers/:id/citations 

Bundles/Exports: 

POST /bundles/citations {theme_id, k} → BibTeX/CSL + quotes 

POST /exports/review {project_id, outline?} → DOCX/PDF 

POST /exports/json {project_id} 

Conventions: Idempotency-Key; cursor pagination; Problem+JSON; SSE for long jobs. 

4.4 Pipelines & Workers 

Ingest: fetch/parse PDF/metadata → sectionize/tables → dedup/version. 

Index: embed sections/tables → upsert pgvector → warm caches. 

Cluster: hybrid clustering → hierarchy build → labeler assigns names. 

Summarize: per theme & subtheme summaries (+ contrastive deltas). 

Matrices: extract methods/metrics/datasets → normalize units. 

Bundles: build citation bundles with quotes & BibTeX/CSL. 

Export: compose narrative review/report → upload & sign URL. 

4.5 Realtime 

WebSockets: ws:project:{id}:status (ingest/cluster/summarize progress). 

SSE: QA streams and long exports. 

4.6 Caching & Performance 

Redis: doc outlines, top-k per theme, bundle caches. 

ANN HNSW tuned per section type; precompute neighbors for hot themes. 

Incremental reclustering on deltas; large CSV previews via DuckDB. 

4.7 Observability 

OTel spans: pdf.parse, embed.upsert, cluster.run, label.run, summary.make, qa.retrieve, qa.generate, bundle.make, export.render. 

Metrics: parse latency, cluster coherence (NPMI), retrieval recall@k, faithfulness score, export p95. 

Sentry: parse/ingest failures, sparse citation warnings. 

4.8 Security & Compliance 

TLS/HSTS/CSP; signed URLs; KMS-wrapped secrets; per-workspace encryption. 

Tenant isolation via RLS; audit trail; DSR endpoints & data deletion. 

License guards for third-party sources; configurable retention windows. 

 

5) Frontend Architecture (React 18 + Next.js 14) 

5.1 Tech Choices 

UI: PrimeReact + Tailwind (DataTable, Tree, Dialog, Splitter, Timeline). 

Charts: Recharts (theme map, timeline, matrices). 

State/Data: TanStack Query; Zustand for panels; URL-synced filters. 

Realtime: WS client + SSE. 

i18n/A11y: next-intl; keyboard-first; ARIA for graphs/tables. 

5.2 App Structure 

/app 
  /(marketing)/page.tsx 
  /(auth)/sign-in/page.tsx 
  /(app)/library/page.tsx 
  /(app)/themes/page.tsx 
  /(app)/matrices/page.tsx 
  /(app)/qa/page.tsx 
  /(app)/bundles/page.tsx 
  /(app)/reports/page.tsx 
  /(app)/settings/page.tsx 
/components 
  UploadWizard/*          // PDFs/DOIs/RIS/BibTeX 
  ThemeMap/*              // 2D projection, cluster info 
  ThemePanel/*            // label, summary, key papers 
  EvidencePanel/*         // quotes with anchors 
  MatrixTable/*           // methods/metrics/datasets 
  AnswerPanel/*           // streaming Q&A with citations 
  BundleBuilder/*         // select k, export BibTeX/CSL 
  ReportComposer/*        // drag themes → outline 
/lib 
  api-client.ts 
  sse-client.ts 
  zod-schemas.ts 
  rbac.ts 
/store 
  useLibraryStore.ts 
  useThemeStore.ts 
  useQAStore.ts 
  useMatrixStore.ts 
  useBundleStore.ts 
  

5.3 Key Pages & UX Flows 

Library: import PDFs/DOIs → dedup → view PRISMA flow. 

Themes: explore clusters → read summaries → open citation bundles. 

QA: ask domain questions → streamed, cited answers; filter by theme/year/venue. 

Matrices: inspect methods/metrics; export CSV/XLSX. 

Bundles: pick k representative papers; export BibTeX/CSL + quotes. 

Reports: compose narrative; insert matrices and bundles; export DOCX/PDF/JSON. 

5.4 Component Breakdown (Selected) 

ThemeMap/Projection.tsx: props { nodes, edges } — zoom/pan, hover stats, click→ThemePanel. 

EvidencePanel/Quote.tsx: props { docId, ref } — shows page/section quote with copy+cite. 

ReportComposer/Outline.tsx: props { sections } — drag themes/quotes → live preview. 

5.5 Data Fetching & Caching 

Server components for heavy lists and exports; client queries for QA/interactive panels. 

Prefetch sequence: documents → themes → summaries → matrices → bundles. 

5.6 Validation & Error Handling 

Zod schemas; Problem+JSON with remediation (bad RIS/BibTeX). 

Guards: export disabled until at least one theme summarized and k≥3 representatives. 

5.7 Accessibility & i18n 

Keyboard navigation across clusters and tables; high-contrast mode; SR-friendly citation chips; localized dates/venues. 

 

6) SDKs & Integration Contracts 

Create/rebuild themes 

POST /v1/themes/rebuild { "project_id": "UUID", "min_cluster_size": 10 } 
  

Get theme citation bundle 

POST /v1/bundles/citations { "theme_id":"UUID", "k":5 } 
  

Ask a question with theme filter 

POST /v1/qa 
{ 
  "project_id":"UUID", 
  "question":"What are the dominant pretraining objectives for biomedical LMs?", 
  "filters": {"themes":["Pretraining Objectives"], "year_gte":2019} 
} 
  

Export review 

POST /v1/exports/review { "project_id":"UUID", "format":"docx" } 
  

JSON bundle keys: documents[], sections[], themes[], assignments[], summaries[], matrices:{methods,metrics,datasets}, bundles[], answers[], citations[]. 

 

7) DevOps & Deployment 

FE: Vercel (Next.js). 

APIs/Workers: Render/Fly/GKE; pools: ingest/index/cluster/summary/qa/matrix/bundle/export. 

DB: Managed Postgres + pgvector; PITR; read replicas. 

Cache/Bus: Redis + NATS; DLQ with retries/backoff/jitter. 

Storage: S3/R2 with lifecycle (original PDFs, exports). 

CI/CD: GitHub Actions (lint/typecheck/unit/integration, Docker build, image scan, sign, deploy); blue/green; migration approvals. 

IaC: Terraform for DB/Redis/NATS/buckets/CDN/secrets/DNS. 

Envs: dev/staging/prod; region pinning; error budgets & alerts. 

Operational SLOs 

25-page PDF ingest parse < 15 s p95. 

Theme rebuild (≤1k papers) < 30 s p95. 

QA first token < 2.0 s p95; full answer < 8 s p95. 

Export review (10 themes) < 6 s p95. 

 

8) Testing 

Unit: sectionizer boundaries; entity/tag extraction; unit normalization. 

Clustering: coherence (NPMI), silhouette; stability under resampling. 

Labeling: human eval of label quality; term coverage. 

RAG: recall@k; faithfulness and citation precision; “insufficient evidence” coverage. 

Matrices: extraction accuracy vs gold sheets; unit conversion correctness. 

Integration: ingest → cluster → summarize → bundle → export. 

E2E (Playwright): import 100 PDFs → themed summaries → build bundles → export review. 

Load: concurrent cluster/QA jobs; big CSVs; DuckDB joins. 

Chaos: source API outages, OCR fallback, delayed workers; retry/backoff. 

Security: RLS coverage; signed URL scope; audit completeness. 

 

9) Success Criteria 

Product KPIs 

Reviewer satisfaction on summaries ≥ 4.3/5. 

Faithfulness score (human-rated) ≥ 0.85; citation coverage ≥ 2.0 per paragraph. 

Theme coherence (NPMI) ≥ 0.15 across top 10 themes. 

Median time-to-first review draft < 20 min for 300-paper set. 

Engineering SLOs 

Pipeline success ≥ 99% (excl. source outages). 

SSE drop rate < 0.5%. 

Export p95 < 6 s. 

 

10) Visual/Logical Flows 

A) Ingest & Normalize 

 Upload DOI/PDF/RIS → parse & enrich → dedup → embed → index. 

B) Cluster & Label 

 Hybrid clustering → hierarchy build → constrained labeler → store themes & assignments. 

C) Summarize & Bundle 

 Generate theme/contrastive summaries → build citation bundles (quotes + BibTeX/CSL). 

D) Compose & Export 

 Drag themes/matrices/quotes into outline → render narrative review → export DOCX/PDF/JSON. 

 

 