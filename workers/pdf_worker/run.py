import os
import asyncio
import json
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine, insert_document_sections


def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using PyMuPDF"""
    doc = fitz.open(pdf_path)
    text_content = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        if text.strip():
            text_content.append({
                'page': page_num + 1,
                'text': text.strip()
            })
    
    doc.close()
    return text_content


def extract_text_with_ocr(pdf_path):
    """Extract text using OCR when text extraction fails"""
    doc = fitz.open(pdf_path)
    ocr_text = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap()
        img_data = pix.tobytes("png")
        
        # Convert to PIL Image for OCR
        img = Image.open(io.BytesIO(img_data))
        text = pytesseract.image_to_string(img)
        
        if text.strip():
            ocr_text.append({
                'page': page_num + 1,
                'text': text.strip(),
                'method': 'ocr'
            })
    
    doc.close()
    return ocr_text


def sectionize_text(text_content):
    """Sectionize text using IMRAD structure"""
    sections = []
    current_section = None
    current_text = []
    
    # Common section headers
    section_patterns = {
        'abstract': ['abstract', 'summary'],
        'introduction': ['introduction', 'intro'],
        'methods': ['methods', 'methodology', 'materials and methods'],
        'results': ['results', 'findings'],
        'discussion': ['discussion', 'conclusion', 'conclusions'],
        'references': ['references', 'bibliography', 'works cited']
    }
    
    for page_data in text_content:
        lines = page_data['text'].split('\n')
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check if line is a section header
            detected_section = None
            for section_name, patterns in section_patterns.items():
                if any(pattern in line_lower for pattern in patterns):
                    detected_section = section_name
                    break
            
            if detected_section:
                # Save previous section
                if current_section and current_text:
                    sections.append({
                        'label': current_section,
                        'text': '\n'.join(current_text),
                        'page': page_data['page']
                    })
                
                # Start new section
                current_section = detected_section
                current_text = [line]
            else:
                if current_section:
                    current_text.append(line)
    
    # Save last section
    if current_section and current_text:
        sections.append({
            'label': current_section,
            'text': '\n'.join(current_text),
            'page': page_data['page']
        })
    
    return sections


def detect_figures_and_tables(text_content):
    """Detect figures and tables in text"""
    figures = []
    tables = []
    
    for page_data in text_content:
        lines = page_data['text'].split('\n')
        
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # Figure detection
            if 'figure' in line_lower and any(char.isdigit() for char in line):
                figures.append({
                    'caption': line,
                    'page': page_data['page'],
                    'line_number': i
                })
            
            # Table detection
            if 'table' in line_lower and any(char.isdigit() for char in line):
                tables.append({
                    'caption': line,
                    'page': page_data['page'],
                    'line_number': i
                })
    
    return figures, tables


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
        except Exception:
            return

        try:
            # Extract text from PDF
            text_content = extract_text_from_pdf(file_path)
            
            # Fallback to OCR if no text extracted
            if not text_content:
                text_content = extract_text_with_ocr(file_path)
            
            # Sectionize the text
            sections = sectionize_text(text_content)
            
            # Detect figures and tables
            figures, tables = detect_figures_and_tables(text_content)
            
            # Store sections in database
            for section in sections:
                insert_document_sections(engine, document_id, section)
            
            # Update document status
            update_document_status(engine, document_id, 'parsed')
            
        except Exception as e:
            print(f"Error processing PDF {file_path}: {e}")
            update_document_status(engine, document_id, 'failed')

    await nc.subscribe("pdf.parse", cb=handle)
    while True:
        await asyncio.sleep(5)


def insert_document_sections(engine, document_id, section):
    """Insert document sections into database"""
    sql = """
    INSERT INTO sections ("documentId", label, text, "pageNumber")
    VALUES (:doc_id, :label, :text, :page)
    """
    with engine.begin() as conn:
        conn.execute(sql, {
            "doc_id": document_id,
            "label": section['label'],
            "text": section['text'],
            "page": section['page']
        })


def update_document_status(engine, document_id, status):
    """Update document processing status"""
    sql = "UPDATE documents SET status = :status WHERE id = :doc_id"
    with engine.begin() as conn:
        conn.execute(sql, {"status": status, "doc_id": document_id})


if __name__ == "__main__":
    asyncio.run(main())
