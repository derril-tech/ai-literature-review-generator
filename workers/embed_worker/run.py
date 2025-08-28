import os
import asyncio
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine, fetch_sections_without_embeddings, upsert_section_embeddings


class EmbeddingWorker:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.batch_size = 32
        self.max_length = 512
        
    def preprocess_text(self, text):
        """Preprocess text for embedding"""
        # Clean and truncate text
        text = text.strip()
        if len(text) > self.max_length * 4:  # Approximate character limit
            text = text[:self.max_length * 4]
        return text
    
    def generate_embeddings(self, texts):
        """Generate embeddings for a batch of texts"""
        # Preprocess texts
        processed_texts = [self.preprocess_text(text) for text in texts]
        
        # Generate embeddings
        embeddings = self.model.encode(
            processed_texts,
            batch_size=self.batch_size,
            show_progress_bar=False,
            convert_to_numpy=True
        )
        
        return embeddings.tolist()
    
    def process_batch(self, sections_batch):
        """Process a batch of sections"""
        if not sections_batch:
            return {}
        
        # Extract texts and IDs
        section_ids = [section['id'] for section in sections_batch]
        texts = [section['text'] for section in sections_batch]
        
        # Generate embeddings
        embeddings = self.generate_embeddings(texts)
        
        # Create mapping of ID to embedding
        id_to_embedding = {}
        for section_id, embedding in zip(section_ids, embeddings):
            id_to_embedding[section_id] = embedding
        
        return id_to_embedding


async def main():
    nc = NATS()
    await nc.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    engine = create_db_engine()
    worker = EmbeddingWorker()

    async def handle(msg):
        data = msg.data.decode()
        try:
            payload = json.loads(data)
            project_id = payload.get("projectId")
            document_id = payload.get("documentId")
        except Exception:
            return

        try:
            # Fetch sections without embeddings
            if document_id:
                # Process specific document
                sections = fetch_sections_for_document(engine, document_id)
            elif project_id:
                # Process entire project
                sections = fetch_sections_without_embeddings(engine, project_id)
            else:
                return
            
            if not sections:
                return
            
            # Process in batches
            batch_size = 32
            for i in range(0, len(sections), batch_size):
                batch = sections[i:i + batch_size]
                
                # Generate embeddings for batch
                id_to_embedding = worker.process_batch(batch)
                
                # Upsert embeddings to database
                if id_to_embedding:
                    upsert_section_embeddings(engine, id_to_embedding)
                
                # Small delay to prevent overwhelming the database
                await asyncio.sleep(0.1)
            
            # Trigger clustering if processing entire project
            if project_id:
                await nc.publish("cluster.run", json.dumps({
                    "projectId": project_id
                }))
                
        except Exception as e:
            print(f"Error generating embeddings: {e}")

    await nc.subscribe("embed.upsert", cb=handle)
    while True:
        await asyncio.sleep(5)


def fetch_sections_for_document(engine, document_id):
    """Fetch sections for a specific document"""
    sql = """
    SELECT s.id, s.text
    FROM sections s
    WHERE s."documentId" = :doc_id AND s.embedding IS NULL
    """
    with engine.connect() as conn:
        rows = conn.execute(sql, {"doc_id": document_id}).mappings().all()
    return rows


if __name__ == "__main__":
    asyncio.run(main())
