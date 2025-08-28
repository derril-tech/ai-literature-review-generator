import os
import asyncio
import json
import numpy as np
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine


class RAGWorker:
    def __init__(self):
        self.top_k = 5
        self.similarity_threshold = 0.7
        
    def hybrid_retrieval(self, query, sections, embeddings):
        """Perform hybrid retrieval (BM25 + dense)"""
        # Simple implementation - in production would use proper BM25 + dense retrieval
        # For now, use cosine similarity on embeddings
        
        if not embeddings:
            return []
        
        # Convert query to embedding (simplified)
        query_embedding = self.simple_query_embedding(query)
        
        # Calculate similarities
        similarities = []
        for i, section_embedding in enumerate(embeddings):
            similarity = self.cosine_similarity(query_embedding, section_embedding)
            similarities.append((i, similarity))
        
        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Return top k results
        results = []
        for idx, similarity in similarities[:self.top_k]:
            if similarity > self.similarity_threshold:
                results.append({
                    'section': sections[idx],
                    'similarity': similarity,
                    'rank': len(results) + 1
                })
        
        return results
    
    def simple_query_embedding(self, query):
        """Simple query embedding (placeholder)"""
        # In production, would use the same embedding model as sections
        # For now, return a random vector
        return np.random.rand(384).tolist()
    
    def cosine_similarity(self, vec1, vec2):
        """Calculate cosine similarity between two vectors"""
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0
        
        return dot_product / (norm1 * norm2)
    
    def generate_answer(self, query, retrieved_sections):
        """Generate answer from retrieved sections"""
        if not retrieved_sections:
            return {
                'answer': 'I could not find relevant information to answer your question.',
                'confidence': 0.0,
                'sources': []
            }
        
        # Simple answer generation (in production would use LLM)
        # Combine top sections and create a summary
        combined_text = ' '.join([section['section']['text'][:500] for section in retrieved_sections[:3]])
        
        # Create a simple answer
        answer = f"Based on the literature, {combined_text[:200]}..."
        
        # Calculate confidence based on similarity scores
        avg_similarity = np.mean([section['similarity'] for section in retrieved_sections])
        confidence = min(1.0, avg_similarity * 1.2)
        
        # Prepare sources
        sources = []
        for section in retrieved_sections:
            sources.append({
                'document_id': section['section']['document_id'],
                'section_id': section['section']['id'],
                'similarity': section['similarity'],
                'text_snippet': section['section']['text'][:200] + '...'
            })
        
        return {
            'answer': answer,
            'confidence': confidence,
            'sources': sources
        }


async def main():
    nc = NATS()
    await nc.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    engine = create_db_engine()
    worker = RAGWorker()

    async def handle(msg):
        data = msg.data.decode()
        try:
            payload = json.loads(data)
            query = payload["query"]
            project_id = payload.get("projectId")
            filters = payload.get("filters", {})
        except Exception:
            return

        try:
            # Fetch sections with embeddings for the project
            sections_data = fetch_project_sections_with_embeddings(engine, project_id)
            
            if not sections_data:
                await nc.publish("qa.response", json.dumps({
                    "query": query,
                    "answer": "No relevant documents found in this project.",
                    "confidence": 0.0,
                    "sources": []
                }))
                return
            
            # Apply filters if specified
            if filters:
                sections_data = apply_filters(sections_data, filters)
            
            # Extract embeddings and section info
            embeddings = []
            sections = []
            
            for section in sections_data:
                if section['embedding']:
                    embeddings.append(section['embedding'])
                    sections.append({
                        'id': section['id'],
                        'text': section['text'],
                        'document_id': section['document_id']
                    })
            
            # Perform retrieval
            retrieved_sections = worker.hybrid_retrieval(query, sections, embeddings)
            
            # Generate answer
            result = worker.generate_answer(query, retrieved_sections)
            
            # Store QA session
            qa_session_id = store_qa_session(engine, project_id, query, result)
            
            # Publish response
            await nc.publish("qa.response", json.dumps({
                "session_id": qa_session_id,
                "query": query,
                "answer": result['answer'],
                "confidence": result['confidence'],
                "sources": result['sources']
            }))
            
        except Exception as e:
            print(f"Error in RAG processing: {e}")
            await nc.publish("qa.response", json.dumps({
                "query": query,
                "answer": "An error occurred while processing your question.",
                "confidence": 0.0,
                "sources": []
            }))

    await nc.subscribe("qa.ask", cb=handle)
    while True:
        await asyncio.sleep(5)


def fetch_project_sections_with_embeddings(engine, project_id):
    """Fetch sections with embeddings for RAG"""
    sql = """
    SELECT s.id, s.text, s.embedding, d.id as document_id, d.title
    FROM sections s
    JOIN documents d ON d.id = s."documentId"
    WHERE d."projectId" = :project_id AND s.embedding IS NOT NULL
    ORDER BY d."createdAt" DESC
    LIMIT 1000
    """
    with engine.connect() as conn:
        rows = conn.execute(sql, {"project_id": project_id}).mappings().all()
    return rows


def apply_filters(sections_data, filters):
    """Apply filters to sections"""
    filtered_sections = []
    
    for section in sections_data:
        # Apply year filter
        if filters.get('year'):
            # Would need to join with document metadata for year filtering
            pass
        
        # Apply venue filter
        if filters.get('venue'):
            # Would need to join with document metadata for venue filtering
            pass
        
        filtered_sections.append(section)
    
    return filtered_sections


def store_qa_session(engine, project_id, query, result):
    """Store QA session in database"""
    sql = """
    INSERT INTO qa_sessions ("projectId", query, answer, confidence, metadata)
    VALUES (:project_id, :query, :answer, :confidence, :metadata)
    RETURNING id
    """
    with engine.begin() as conn:
        row = conn.execute(sql, {
            "project_id": project_id,
            "query": query,
            "answer": result['answer'],
            "confidence": result['confidence'],
            "metadata": json.dumps(result)
        }).first()
        return row[0]


if __name__ == "__main__":
    asyncio.run(main())
