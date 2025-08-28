# AI Literature Review Generator — Delivery Plan (v0.1)
_Date: 2025-08-28 • Owner: PM/Tech Lead • Status: Draft_

## 0) One-liner
**“Upload or connect your paper set and get an instant, evidence-linked literature review: auto-grouped themes, crisp summaries, and citation bundles you can export.”**

## 1) Goals & Non-Goals (V1)
**Goals**
- Theme discovery over uploaded/connected papers with human-readable labels.
- Grounded theme/contrastive summaries with inline citations to passages/pages.
- Citation bundles (representative papers, quotes with anchors, BibTeX/CSL JSON).
- Method/metric/dataset matrices; PRISMA-style flow & dedup lineage.
- Exports: DOCX/PDF narrative review, CSV/XLSX matrices, JSON bundle.

**Non-Goals**
- Acting as peer review; the tool assists research, it does not validate findings.
- Open web crawling beyond configured scholarly sources.

## 2) Scope
**In-scope**
- Ingestion: arXiv, PubMed/PMC, Crossref/DOI, OpenAlex/Semantic Scholar, drag‑and‑drop PDFs, RIS/BibTeX/EndNote.
- Normalization: sectionizer, table extraction, entity tagging, unit normalization, dedup/preprint↔journal lineage.
- Theming: hybrid clustering (HDBSCAN/K‑Means + lexical), hierarchical themes, constrained labeling.
- Summarization: structured theme + contrastive narratives with citations/confidence.
- Bundles: representative k papers, quotes with anchors, BibTeX/CSL export.
- Matrices: method/metric/dataset extraction & normalization.
- RAG Q&A with citations; filters by theme/year/venue.
- Reports: composer for narrative reviews; PRISMA flow; exports in DOCX/PDF/CSV/JSON.
- Governance: workspaces/projects, roles, share links, audit logs.
- Observability & SRE; security (RLS, signed URLs, KMS).

**Out-of-scope**
- Full manuscript writing assistance beyond assembling cited summaries.
- Proprietary paywalled sources without provided credentials.

## 3) Workstreams & Success Criteria
1. **Ingest & Normalize** — ✅ Parse PDFs/metadata; sectionize & table extraction; dedup & lineage; entity tagging; unit normalization.
2. **Cluster & Label** — ✅ Hybrid clustering; hierarchy build; constrained labeling; quality metrics (coherence).
3. **Summarize & Bundle** — ✅ Theme & contrastive summaries with citations; citation bundles with quotes + BibTeX/CSL.
4. **Matrices & Q&A** — ✅ Extract methods/metrics/datasets; normalize units; RAG Q&A with ≥2 citations per answer.
5. **Compose & Export** — ✅ Narrative review composer; PRISMA flow; exports (DOCX/PDF/CSV/JSON) within p95 latency targets.
6. **SRE & Governance** — ✅ OTel traces, dashboards, audit logs, RLS verification.

## 4) Milestones (~12 weeks)
- **Weeks 1–2**: Infra, schemas, ingestion/connectors, sectionizer & dedup.
- **Weeks 3–4**: Embeddings, clustering pipeline, hierarchy & labeler.
- **Weeks 5–6**: Theme/contrastive summaries; bundles builder; library & themes UI.
- **Weeks 7–9**: Matrices extraction, RAG Q&A; PRISMA view; composer.
- **Weeks 10–12**: Exports; observability; security hardening; beta rollout.

## 5) Deliverables
- Dev/staging/prod environments with IaC.
- OpenAPI 3.1 spec; TypeScript SDK; Postman collection.
- Gold sets: clustering labels, extraction sheets, RAG Q&A faithfulness.
- Playwright E2E + pipeline integration tests.
- Dashboards & runbooks; on-call rotation.

## 6) Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Heterogeneous PDF layouts | Medium | Hybrid parsers; OCR fallback; manual review flags |
| Noisy clustering labels | High | Constrained labeler from top terms; human-in-the-loop relabel |
| Hallucinations in summaries | High | Citations-first decoding; “insufficient evidence” fallback |
| Dedup across preprint/journal | Medium | DOI/MD5/metadata fuzzy; lineage linking |
| Metric unit inconsistencies | Medium | UCUM normalization; explicit conversion logs |

## 7) Acceptance Criteria
- Theme coherence (NPMI) ≥ 0.15 on top 10 themes.
- Faithfulness ≥ 0.85 (human-rated); citation coverage ≥ 2 per paragraph.
- PRISMA flow generated for any corpus ≥ 50 papers.
- Export p95: review ≤ 6s, matrices ≤ 4s.
- Time-to-first draft (<300 papers) ≤ 20 minutes median.

## 8) Rollout
- Pilot with two research groups; gather feedback on summaries/labels.
- Beta with feature flags (contrastive view, matrices).
- GA with share links & read-only public theme cards.