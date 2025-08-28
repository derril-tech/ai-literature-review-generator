import os
import asyncio
import json
import re
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine


def extract_methods(text):
    """Extract methods from text"""
    methods = []
    
    # Common method patterns
    method_patterns = [
        r'(?:using|with|via|through)\s+([A-Za-z\s]+(?:learning|network|algorithm|model|method|approach|technique))',
        r'([A-Za-z\s]+(?:learning|network|algorithm|model|method|approach|technique))',
        r'(?:implemented|developed|proposed)\s+([A-Za-z\s]+(?:learning|network|algorithm|model|method|approach|technique))'
    ]
    
    for pattern in method_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            method = match.group(1).strip()
            if len(method) > 3 and len(method) < 100:
                methods.append(method)
    
    return list(set(methods))


def extract_metrics(text):
    """Extract metrics with units from text"""
    metrics = []
    
    # Metric patterns with units
    metric_patterns = [
        r'(\d+(?:\.\d+)?)\s*(accuracy|precision|recall|f1|f1-score|auc|mse|mae|rmse|r2|correlation|p-value|t-statistic|z-score)',
        r'(accuracy|precision|recall|f1|f1-score|auc|mse|mae|rmse|r2|correlation|p-value|t-statistic|z-score)\s*(?:of|is|was)\s*(\d+(?:\.\d+)?)',
        r'(\d+(?:\.\d+)?)\s*(percent|%|seconds|minutes|hours|days|weeks|months|years|epochs|iterations|samples|instances|features|dimensions)'
    ]
    
    for pattern in metric_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            if len(match.groups()) == 2:
                value = match.group(1)
                unit = match.group(2)
                metrics.append({
                    'value': float(value),
                    'unit': unit,
                    'metric': unit
                })
    
    return metrics


def extract_datasets(text):
    """Extract dataset information from text"""
    datasets = []
    
    # Dataset patterns
    dataset_patterns = [
        r'([A-Za-z0-9\s]+(?:dataset|corpus|collection|benchmark))',
        r'(?:using|on|with)\s+([A-Za-z0-9\s]+(?:dataset|corpus|collection|benchmark))',
        r'([A-Za-z0-9\s]+)\s+(?:dataset|corpus|collection|benchmark)',
        r'(\d+(?:,\d+)?(?:k|K|m|M)?)\s+(?:samples|instances|records|examples|data points)'
    ]
    
    for pattern in dataset_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            dataset_info = match.group(1).strip()
            if len(dataset_info) > 2:
                datasets.append({
                    'name': dataset_info,
                    'size': extract_dataset_size(dataset_info),
                    'type': 'dataset'
                })
    
    return datasets


def extract_dataset_size(text):
    """Extract dataset size from text"""
    size_patterns = [
        r'(\d+(?:,\d+)?(?:k|K|m|M)?)\s+(?:samples|instances|records|examples|data points)',
        r'(\d+(?:,\d+)?(?:k|K|m|M)?)\s+(?:training|test|validation)\s+(?:samples|instances|records|examples)'
    ]
    
    for pattern in size_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return None


async def main():
    nc = NATS()
    await nc.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    engine = create_db_engine()

    async def handle(msg):
        data = msg.data.decode()
        try:
            payload = json.loads(data)
            project_id = payload["projectId"]
        except Exception:
            return

        try:
            # Fetch project documents
            documents = fetch_project_documents(engine, project_id)
            
            for document in documents:
                # Extract methods, metrics, datasets
                methods = extract_methods(document['text'])
                metrics = extract_metrics(document['text'])
                datasets = extract_datasets(document['text'])
                
                # Store extracted data
                store_extracted_data(engine, document['id'], methods, metrics, datasets)
                
        except Exception as e:
            print(f"Error in matrix extraction: {e}")

    await nc.subscribe("matrix.extract", cb=handle)
    while True:
        await asyncio.sleep(5)


def fetch_project_documents(engine, project_id):
    """Fetch documents for matrix extraction"""
    sql = """
    SELECT d.id, s.text
    FROM documents d
    JOIN sections s ON s."documentId" = d.id
    WHERE d."projectId" = :project_id AND d.status = 'parsed'
    """
    with engine.connect() as conn:
        rows = conn.execute(sql, {"project_id": project_id}).mappings().all()
    return rows


def store_extracted_data(engine, document_id, methods, metrics, datasets):
    """Store extracted methods, metrics, and datasets"""
    # Store methods
    for method in methods:
        insert_method(engine, document_id, method)
    
    # Store metrics
    for metric in metrics:
        insert_metric(engine, document_id, metric)
    
    # Store datasets
    for dataset in datasets:
        insert_dataset(engine, document_id, dataset)


def insert_method(engine, document_id, method_name):
    """Insert method into database"""
    sql = """
    INSERT INTO methods ("documentId", name, metadata)
    VALUES (:doc_id, :name, :metadata)
    ON CONFLICT ("documentId", name) DO UPDATE SET metadata = EXCLUDED.metadata
    """
    with engine.begin() as conn:
        conn.execute(sql, {
            "doc_id": document_id,
            "name": method_name,
            "metadata": {"extracted": True}
        })


def insert_metric(engine, document_id, metric_data):
    """Insert metric into database"""
    sql = """
    INSERT INTO metrics ("documentId", name, value, unit, metadata)
    VALUES (:doc_id, :name, :value, :unit, :metadata)
    """
    with engine.begin() as conn:
        conn.execute(sql, {
            "doc_id": document_id,
            "name": metric_data['metric'],
            "value": metric_data['value'],
            "unit": metric_data['unit'],
            "metadata": {"extracted": True}
        })


def insert_dataset(engine, document_id, dataset_data):
    """Insert dataset into database"""
    sql = """
    INSERT INTO datasets ("documentId", name, size, metadata)
    VALUES (:doc_id, :name, :size, :metadata)
    ON CONFLICT ("documentId", name) DO UPDATE SET size = EXCLUDED.size, metadata = EXCLUDED.metadata
    """
    with engine.begin() as conn:
        conn.execute(sql, {
            "doc_id": document_id,
            "name": dataset_data['name'],
            "size": dataset_data['size'],
            "metadata": {"extracted": True, "type": dataset_data['type']}
        })


if __name__ == "__main__":
    asyncio.run(main())
