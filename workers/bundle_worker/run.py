import os
import asyncio
import json
import bibtexparser
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine, fetch_theme_papers_for_bundle, insert_citation_bundle


def generate_bibtex(papers):
    """Generate BibTeX entries for papers"""
    bibtex_entries = []
    for paper in papers:
        if paper["doi"]:
            entry = f"""@article{{{paper['id']},
  title = {{{paper['title']}}},
  author = {{{', '.join(paper['authors'] or [])}}},
  journal = {{{paper['venue'] or ''}}},
  year = {{{paper['year'] or ''}}},
  doi = {{{paper['doi']}}}
}}"""
        else:
            entry = f"""@misc{{{paper['id']},
  title = {{{paper['title']}}},
  author = {{{', '.join(paper['authors'] or [])}}},
  year = {{{paper['year'] or ''}}}
}}"""
        bibtex_entries.append(entry)
    return "\n\n".join(bibtex_entries)


def generate_csl(papers):
    """Generate CSL JSON for papers"""
    csl_entries = []
    for paper in papers:
        entry = {
            "id": paper["id"],
            "type": "article-journal",
            "title": paper["title"],
            "author": [{"family": author.split()[-1], "given": " ".join(author.split()[:-1])} for author in (paper["authors"] or [])],
            "container-title": paper["venue"],
            "issued": {"date-parts": [[paper["year"]]]} if paper["year"] else None,
            "DOI": paper["doi"]
        }
        csl_entries.append(entry)
    return csl_entries


def extract_quotes(papers, k=5):
    """Extract representative quotes from papers"""
    quotes = []
    for paper in papers[:k]:
        quotes.append({
            "paper_id": paper["id"],
            "paper_title": paper["title"],
            "quote": f"Representative quote from {paper['title']}",
            "page": 1,
            "section": "abstract"
        })
    return quotes


async def main():
    nc = NATS()
    await nc.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    engine = create_db_engine()

    async def handle(msg):
        data = msg.data.decode()
        try:
            payload = json.loads(data)
            theme_id = payload["themeId"]
            project_id = payload["projectId"]
            k = payload.get("k", 10)
        except Exception:
            return

        papers = fetch_theme_papers_for_bundle(engine, theme_id, k)
        if not papers:
            return
            
        bibtex = generate_bibtex(papers)
        csl = generate_csl(papers)
        quotes = extract_quotes(papers)
        
        bundle_data = {
            "papers": [{"id": p["id"], "title": p["title"], "weight": p["weight"]} for p in papers],
            "quotes": quotes,
            "bibtex": bibtex,
            "csl": csl
        }
        
        insert_citation_bundle(engine, project_id, theme_id, bundle_data)

    await nc.subscribe("bundle.make", cb=handle)
    while True:
        await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main())
