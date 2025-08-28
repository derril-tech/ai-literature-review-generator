import os
import asyncio
import json
import uuid
from datetime import datetime
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine, fetch_theme_summary_for_export, fetch_citation_bundle_for_export


def generate_docx_content(project_data, themes_data, bundles_data):
    """Generate DOCX content for narrative review"""
    content = []
    
    # Title page
    content.append({
        "type": "heading",
        "level": 1,
        "text": f"Literature Review: {project_data.get('title', 'Untitled Project')}"
    })
    
    content.append({
        "type": "paragraph",
        "text": f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    })
    
    # Executive summary
    content.append({
        "type": "heading",
        "level": 2,
        "text": "Executive Summary"
    })
    
    content.append({
        "type": "paragraph",
        "text": f"This review synthesizes {len(themes_data)} key themes from {project_data.get('document_count', 0)} papers."
    })
    
    # Themes
    for theme in themes_data:
        content.append({
            "type": "heading",
            "level": 2,
            "text": theme.get('label', 'Untitled Theme')
        })
        
        if theme.get('summary'):
            summary = theme['summary']
            content.append({
                "type": "paragraph",
                "text": f"What: {summary.get('what', 'N/A')}"
            })
            content.append({
                "type": "paragraph",
                "text": f"Findings: {summary.get('findings', 'N/A')}"
            })
            content.append({
                "type": "paragraph",
                "text": f"Limitations: {summary.get('limitations', 'N/A')}"
            })
    
    # References
    content.append({
        "type": "heading",
        "level": 2,
        "text": "References"
    })
    
    for bundle in bundles_data:
        if bundle.get('papers'):
            for paper in bundle['papers']:
                content.append({
                    "type": "paragraph",
                    "text": f"{paper.get('title', 'Untitled')} ({paper.get('year', 'N/A')})"
                })
    
    return content


def generate_json_bundle(project_data, themes_data, bundles_data):
    """Generate JSON bundle for export"""
    return {
        "metadata": {
            "project_id": project_data.get('id'),
            "project_title": project_data.get('title'),
            "exported_at": datetime.now().isoformat(),
            "version": "1.0"
        },
        "themes": themes_data,
        "citation_bundles": bundles_data,
        "statistics": {
            "total_themes": len(themes_data),
            "total_papers": sum(len(b.get('papers', [])) for b in bundles_data),
            "total_quotes": sum(len(b.get('quotes', [])) for b in bundles_data)
        }
    }


async def main():
    nc = NATS()
    await nc.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    engine = create_db_engine()

    async def handle(msg):
        data = msg.data.decode()
        try:
            payload = json.loads(data)
            project_id = payload["projectId"]
            export_type = payload.get("type", "docx")
        except Exception:
            return

        # Fetch project data
        project_data = fetch_project_for_export(engine, project_id)
        themes_data = fetch_theme_summary_for_export(engine, project_id)
        bundles_data = fetch_citation_bundle_for_export(engine, project_id)
        
        if export_type == "docx":
            content = generate_docx_content(project_data, themes_data, bundles_data)
            # In production, use python-docx to create actual DOCX
            file_path = f"/tmp/review-{project_id}-{uuid.uuid4()}.docx"
        elif export_type == "json":
            content = generate_json_bundle(project_data, themes_data, bundles_data)
            file_path = f"/tmp/bundle-{project_id}-{uuid.uuid4()}.json"
            with open(file_path, 'w') as f:
                json.dump(content, f, indent=2)
        
        # Store export record
        insert_export_record(engine, project_id, export_type, file_path)

    await nc.subscribe("export.make", cb=handle)
    while True:
        await asyncio.sleep(5)


def fetch_project_for_export(engine, project_id):
    """Fetch project data for export"""
    # Placeholder - would query project table
    return {
        "id": project_id,
        "title": "Sample Project",
        "document_count": 100
    }


def fetch_theme_summary_for_export(engine, project_id):
    """Fetch theme summaries for export"""
    # Placeholder - would query themes table
    return [
        {
            "id": "1",
            "label": "Sample Theme",
            "summary": {
                "what": "Sample theme description",
                "findings": "Key findings",
                "limitations": "Limitations"
            }
        }
    ]


def fetch_citation_bundle_for_export(engine, project_id):
    """Fetch citation bundles for export"""
    # Placeholder - would query citation_bundles table
    return [
        {
            "papers": [
                {"title": "Sample Paper", "year": 2023}
            ],
            "quotes": []
        }
    ]


def insert_export_record(engine, project_id, export_type, file_path):
    """Insert export record"""
    # Placeholder - would insert into exports table
    pass


if __name__ == "__main__":
    asyncio.run(main())
