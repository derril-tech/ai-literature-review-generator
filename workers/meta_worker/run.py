import os
import asyncio
import json
import hashlib
import requests
from difflib import SequenceMatcher
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine, update_document_metadata, find_duplicate_documents


def calculate_md5(file_path):
    """Calculate MD5 hash of file"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def extract_doi_from_text(text):
    """Extract DOI from text using regex"""
    import re
    doi_pattern = r'\b(10\.\d{4,}(?:\.\d+)*\/\S+(?:(?!["&\'<>])\S)*)\b'
    matches = re.findall(doi_pattern, text)
    return matches[0] if matches else None


def fetch_crossref_metadata(doi):
    """Fetch metadata from Crossref API"""
    try:
        url = f"https://api.crossref.org/works/{doi}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            work = data['message']
            
            return {
                'title': work.get('title', [''])[0] if work.get('title') else '',
                'authors': [author.get('given', '') + ' ' + author.get('family', '') 
                           for author in work.get('author', [])],
                'year': work.get('published-print', {}).get('date-parts', [[None]])[0][0],
                'venue': work.get('container-title', [''])[0] if work.get('container-title') else '',
                'doi': doi,
                'abstract': work.get('abstract', ''),
                'type': work.get('type', ''),
                'publisher': work.get('publisher', '')
            }
    except Exception as e:
        print(f"Error fetching Crossref metadata for {doi}: {e}")
    return None


def fetch_openalex_metadata(doi):
    """Fetch metadata from OpenAlex API"""
    try:
        url = f"https://api.openalex.org/works/doi:{doi}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            return {
                'title': data.get('title', ''),
                'authors': [author.get('author', {}).get('display_name', '') 
                           for author in data.get('authorships', [])],
                'year': data.get('publication_year'),
                'venue': data.get('primary_location', {}).get('source', {}).get('display_name', ''),
                'doi': doi,
                'abstract': data.get('abstract_inverted_index', {}),
                'type': data.get('type', ''),
                'publisher': data.get('primary_location', {}).get('source', {}).get('publisher', '')
            }
    except Exception as e:
        print(f"Error fetching OpenAlex metadata for {doi}: {e}")
    return None


def fuzzy_string_similarity(str1, str2):
    """Calculate fuzzy string similarity"""
    return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()


def detect_duplicates(documents, similarity_threshold=0.8):
    """Detect duplicate documents using fuzzy matching"""
    duplicates = []
    
    for i, doc1 in enumerate(documents):
        for j, doc2 in enumerate(documents[i+1:], i+1):
            # Compare titles
            title_similarity = fuzzy_string_similarity(doc1.get('title', ''), doc2.get('title', ''))
            
            # Compare DOIs
            doi_match = (doc1.get('doi') and doc2.get('doi') and 
                        doc1.get('doi').lower() == doc2.get('doi').lower())
            
            # Compare MD5 hashes
            hash_match = (doc1.get('hash') and doc2.get('hash') and 
                         doc1.get('hash') == doc2.get('hash'))
            
            if doi_match or hash_match or title_similarity > similarity_threshold:
                duplicates.append({
                    'doc1_id': doc1['id'],
                    'doc2_id': doc2['id'],
                    'similarity': title_similarity,
                    'doi_match': doi_match,
                    'hash_match': hash_match
                })
    
    return duplicates


def apply_inclusion_filters(metadata, filters):
    """Apply inclusion/exclusion filters"""
    if not filters:
        return True
    
    # Year filter
    if filters.get('min_year') and metadata.get('year'):
        if metadata['year'] < filters['min_year']:
            return False
    
    if filters.get('max_year') and metadata.get('year'):
        if metadata['year'] > filters['max_year']:
            return False
    
    # Venue filter
    if filters.get('venues') and metadata.get('venue'):
        if metadata['venue'].lower() not in [v.lower() for v in filters['venues']]:
            return False
    
    # Keywords filter
    if filters.get('keywords') and metadata.get('abstract'):
        abstract_lower = metadata['abstract'].lower()
        if not any(keyword.lower() in abstract_lower for keyword in filters['keywords']):
            return False
    
    return True


async def main():
    nc = NATS()
    await nc.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    engine = create_db_engine()

    async def handle(msg):
        data = msg.data.decode()
        try:
            payload = json.loads(data)
            document_id = payload["documentId"]
            file_path = payload["filePath"]
            filters = payload.get("filters", {})
        except Exception:
            return

        try:
            # Calculate file hash
            file_hash = calculate_md5(file_path)
            
            # Extract DOI from document text
            doi = extract_doi_from_text(get_document_text(engine, document_id))
            
            # Fetch metadata from APIs
            metadata = None
            if doi:
                metadata = fetch_crossref_metadata(doi)
                if not metadata:
                    metadata = fetch_openalex_metadata(doi)
            
            # If no DOI found, try to extract from filename
            if not metadata:
                metadata = extract_metadata_from_filename(file_path)
            
            # Add hash to metadata
            if metadata:
                metadata['hash'] = file_hash
            
            # Apply inclusion filters
            if metadata and apply_inclusion_filters(metadata, filters):
                # Check for duplicates
                duplicates = find_duplicate_documents(engine, metadata)
                
                if duplicates:
                    # Mark as duplicate
                    update_document_status(engine, document_id, 'duplicate')
                    link_duplicate_documents(engine, document_id, duplicates[0]['id'])
                else:
                    # Update document with metadata
                    update_document_metadata(engine, document_id, metadata)
                    update_document_status(engine, document_id, 'enriched')
                    
                    # Trigger next step in pipeline
                    await nc.publish("embed.upsert", json.dumps({
                        "documentId": document_id
                    }))
            else:
                # Excluded by filters
                update_document_status(engine, document_id, 'excluded')
                
        except Exception as e:
            print(f"Error enriching metadata for document {document_id}: {e}")
            update_document_status(engine, document_id, 'failed')

    await nc.subscribe("meta.enrich", cb=handle)
    while True:
        await asyncio.sleep(5)


def get_document_text(engine, document_id):
    """Get document text for DOI extraction"""
    sql = """
    SELECT text FROM sections 
    WHERE "documentId" = :doc_id 
    ORDER BY "pageNumber" 
    LIMIT 1000
    """
    with engine.connect() as conn:
        rows = conn.execute(sql, {"doc_id": document_id}).fetchall()
        return ' '.join([row[0] for row in rows])


def extract_metadata_from_filename(file_path):
    """Extract basic metadata from filename"""
    filename = os.path.basename(file_path)
    return {
        'title': filename.replace('.pdf', ''),
        'authors': [],
        'year': None,
        'venue': '',
        'doi': None,
        'abstract': '',
        'type': 'article',
        'publisher': ''
    }


def update_document_metadata(engine, document_id, metadata):
    """Update document with enriched metadata"""
    sql = """
    UPDATE documents 
    SET title = :title, authors = :authors, year = :year, 
        venue = :venue, doi = :doi, abstract = :abstract,
        hash = :hash, metadata = :metadata
    WHERE id = :doc_id
    """
    with engine.begin() as conn:
        conn.execute(sql, {
            "title": metadata.get('title', ''),
            "authors": metadata.get('authors', []),
            "year": metadata.get('year'),
            "venue": metadata.get('venue', ''),
            "doi": metadata.get('doi'),
            "abstract": metadata.get('abstract', ''),
            "hash": metadata.get('hash'),
            "metadata": json.dumps(metadata),
            "doc_id": document_id
        })


def find_duplicate_documents(engine, metadata):
    """Find duplicate documents in database"""
    sql = """
    SELECT id, title, doi, hash FROM documents 
    WHERE (doi = :doi AND doi IS NOT NULL) 
       OR (hash = :hash AND hash IS NOT NULL)
    """
    with engine.connect() as conn:
        rows = conn.execute(sql, {
            "doi": metadata.get('doi'),
            "hash": metadata.get('hash')
        }).fetchall()
        return [dict(row) for row in rows]


def link_duplicate_documents(engine, new_doc_id, original_doc_id):
    """Link duplicate documents"""
    sql = """
    INSERT INTO document_duplicates ("originalDocumentId", "duplicateDocumentId")
    VALUES (:original_id, :duplicate_id)
    """
    with engine.begin() as conn:
        conn.execute(sql, {
            "original_id": original_doc_id,
            "duplicate_id": new_doc_id
        })


def update_document_status(engine, document_id, status):
    """Update document status"""
    sql = "UPDATE documents SET status = :status WHERE id = :doc_id"
    with engine.begin() as conn:
        conn.execute(sql, {"status": status, "doc_id": document_id})


if __name__ == "__main__":
    asyncio.run(main())
