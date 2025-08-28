import os
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


def get_database_url() -> str:
    host = os.getenv("PGHOST", "localhost")
    port = os.getenv("PGPORT", "5432")
    user = os.getenv("PGUSER", "postgres")
    password = os.getenv("PGPASSWORD", "postgres")
    db = os.getenv("PGDATABASE", "airg")
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"


def create_db_engine() -> Engine:
    return create_engine(get_database_url(), pool_pre_ping=True, future=True)


def fetch_sections_without_embeddings(engine: Engine, project_id: str):
    sql = text(
        """
        SELECT s.id, s.text
        FROM sections s
        JOIN documents d ON d.id = s."documentId"
        WHERE d."projectId" = :project_id AND s.embedding IS NULL
        LIMIT 5000
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"project_id": project_id}).mappings().all()
    return rows


def upsert_section_embeddings(engine: Engine, id_to_vector):
    # id_to_vector: dict[str, list[float]]
    sql = text("UPDATE sections SET embedding = :embedding WHERE id = :id")
    with engine.begin() as conn:
        for sid, vec in id_to_vector.items():
            conn.execute(sql, {"id": sid, "embedding": vec})


def fetch_project_sections_with_embeddings(engine: Engine, project_id: str):
    sql = text(
        """
        SELECT s.id, s.text, d.id as document_id, s.embedding
        FROM sections s
        JOIN documents d ON d.id = s."documentId"
        WHERE d."projectId" = :project_id AND s.embedding IS NOT NULL
        LIMIT 20000
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"project_id": project_id}).mappings().all()
    return rows


def reset_project_themes(engine: Engine, project_id: str):
    with engine.begin() as conn:
        conn.execute(text('DELETE FROM theme_assignments USING themes t WHERE theme_assignments."themeId" = t.id AND t."projectId" = :pid'), {"pid": project_id})
        conn.execute(text('DELETE FROM themes WHERE "projectId" = :pid'), {"pid": project_id})


def insert_theme(engine: Engine, project_id: str, label: str, provenance: dict) -> str:
    sql = text(
        'INSERT INTO themes ("projectId", label, provenance) VALUES (:pid, :label, :prov) RETURNING id'
    )
    with engine.begin() as conn:
        row = conn.execute(sql, {"pid": project_id, "label": label, "prov": provenance}).first()
        return row[0]


def insert_theme_assignments(engine: Engine, theme_id: str, doc_weight_items):
    # doc_weight_items: list[tuple[doc_id, weight]]
    sql = text(
        'INSERT INTO theme_assignments ("themeId", "documentId", weight) VALUES (:tid, :did, :w) '
        'ON CONFLICT ("themeId", "documentId") DO UPDATE SET weight = EXCLUDED.weight'
    )
    with engine.begin() as conn:
        for doc_id, weight in doc_weight_items:
            conn.execute(sql, {"tid": theme_id, "did": doc_id, "w": float(weight)})


def fetch_theme_sections_for_labeling(engine: Engine, theme_id: str):
    sql = text(
        """
        SELECT s.text
        FROM theme_assignments ta
        JOIN documents d ON d.id = ta."documentId"
        JOIN sections s ON s."documentId" = d.id
        WHERE ta."themeId" = :tid
        LIMIT 10000
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"tid": theme_id}).scalars().all()
    return rows


def update_theme_label_and_provenance(engine: Engine, theme_id: str, label: str, provenance: dict):
    sql = text('UPDATE themes SET label = :label, provenance = :prov WHERE id = :id')
    with engine.begin() as conn:
        conn.execute(sql, {"label": label, "prov": provenance, "id": theme_id})


def fetch_theme_sections_for_summary(engine: Engine, theme_id: str):
    sql = text(
        """
        SELECT s.text, s.label, d.title, d.authors, d.year, ta.weight
        FROM theme_assignments ta
        JOIN documents d ON d.id = ta."documentId"
        JOIN sections s ON s."documentId" = d.id
        WHERE ta."themeId" = :tid
        ORDER BY ta.weight DESC
        LIMIT 5000
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"tid": theme_id}).mappings().all()
    return rows


def insert_theme_summary(engine: Engine, theme_id: str, summary: dict):
    sql = text('UPDATE themes SET summary = :summary WHERE id = :id')
    with engine.begin() as conn:
        conn.execute(sql, {"summary": summary, "id": theme_id})


def fetch_theme_papers_for_bundle(engine: Engine, theme_id: str, k: int = 10):
    sql = text(
        """
        SELECT d.id, d.title, d.authors, d.doi, d.venue, d.year, ta.weight
        FROM theme_assignments ta
        JOIN documents d ON d.id = ta."documentId"
        WHERE ta."themeId" = :tid
        ORDER BY ta.weight DESC
        LIMIT :k
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"tid": theme_id, "k": k}).mappings().all()
    return rows


def insert_citation_bundle(engine: Engine, project_id: str, theme_id: str, bundle_data: dict) -> str:
    sql = text(
        'INSERT INTO citation_bundles ("projectId", "themeId", papers, quotes, bibtex, csl) VALUES (:pid, :tid, :papers, :quotes, :bibtex, :csl) RETURNING id'
    )
    with engine.begin() as conn:
        row = conn.execute(sql, {
            "pid": project_id, 
            "tid": theme_id,
            "papers": bundle_data["papers"],
            "quotes": bundle_data["quotes"],
            "bibtex": bundle_data["bibtex"],
            "csl": bundle_data["csl"]
        }).first()
        return row[0]


def fetch_project_documents_for_prisma(engine: Engine, project_id: str):
    sql = text(
        """
        SELECT d.id, d.title, d.status, d.hash, d.doi
        FROM documents d
        WHERE d."projectId" = :pid
        ORDER BY d."createdAt" DESC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pid": project_id}).mappings().all()
    return rows


def update_document_metadata(engine: Engine, document_id: str, metadata: dict):
    sql = text(
        """
        UPDATE documents 
        SET title = :title, authors = :authors, year = :year, 
            venue = :venue, doi = :doi, abstract = :abstract,
            hash = :hash, metadata = :metadata
        WHERE id = :doc_id
        """
    )
    with engine.begin() as conn:
        conn.execute(sql, {
            "title": metadata.get('title', ''),
            "authors": metadata.get('authors', []),
            "year": metadata.get('year'),
            "venue": metadata.get('venue', ''),
            "doi": metadata.get('doi'),
            "abstract": metadata.get('abstract', ''),
            "hash": metadata.get('hash'),
            "metadata": metadata,
            "doc_id": document_id
        })


def find_duplicate_documents(engine: Engine, metadata: dict):
    sql = text(
        """
        SELECT id, title, doi, hash FROM documents 
        WHERE (doi = :doi AND doi IS NOT NULL) 
           OR (hash = :hash AND hash IS NOT NULL)
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {
            "doi": metadata.get('doi'),
            "hash": metadata.get('hash')
        }).fetchall()
        return [dict(row) for row in rows]


def link_duplicate_documents(engine: Engine, new_doc_id: str, original_doc_id: str):
    sql = text(
        """
        INSERT INTO document_duplicates ("originalDocumentId", "duplicateDocumentId")
        VALUES (:original_id, :duplicate_id)
        """
    )
    with engine.begin() as conn:
        conn.execute(sql, {
            "original_id": original_doc_id,
            "duplicate_id": new_doc_id
        })


def update_document_status(engine: Engine, document_id: str, status: str):
    sql = text("UPDATE documents SET status = :status WHERE id = :doc_id")
    with engine.begin() as conn:
        conn.execute(sql, {"status": status, "doc_id": document_id})


def fetch_theme_summary_for_export(engine: Engine, project_id: str):
    sql = text(
        """
        SELECT id, label, summary FROM themes 
        WHERE "projectId" = :pid
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pid": project_id}).mappings().all()
    return rows


def fetch_citation_bundle_for_export(engine: Engine, project_id: str):
    sql = text(
        """
        SELECT papers, quotes FROM citation_bundles 
        WHERE "projectId" = :pid
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pid": project_id}).mappings().all()
    return rows
