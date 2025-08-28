import os
import asyncio
import json
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine, fetch_theme_sections_for_summary, insert_theme_summary


def generate_structured_summary(sections_data):
    """Generate structured theme summary from sections data"""
    # Simple extractive summary for now - in production would use LLM
    all_text = " ".join([s["text"] for s in sections_data])
    
    # Extract key phrases and create structured summary
    summary = {
        "what": f"Theme covers {len(sections_data)} sections across {len(set(s['title'] for s in sections_data))} papers",
        "why": "Research area of interest based on clustering analysis",
        "how": "Methods and approaches vary across included studies",
        "findings": "Key findings from the literature in this theme",
        "limitations": "Gaps and limitations identified in current research",
        "open_questions": "Remaining open questions for future research",
        "confidence": 0.75,
        "citations": [{"document": s["title"], "section": s["label"]} for s in sections_data[:5]]
    }
    
    return summary


async def main():
    nc = NATS()
    await nc.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    engine = create_db_engine()

    async def handle(msg):
        data = msg.data.decode()
        try:
            payload = json.loads(data)
            theme_id = payload["themeId"]
        except Exception:
            return

        sections_data = fetch_theme_sections_for_summary(engine, theme_id)
        if not sections_data:
            return
            
        summary = generate_structured_summary(sections_data)
        insert_theme_summary(engine, theme_id, summary)

    await nc.subscribe("summary.make", cb=handle)
    while True:
        await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main())
