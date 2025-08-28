import os
import asyncio
import json
import re
from collections import Counter
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine, fetch_theme_sections_for_labeling, update_theme_label_and_provenance


class LabelingWorker:
    def __init__(self):
        self.min_ngram_length = 2
        self.max_ngram_length = 4
        self.top_n_terms = 10
        self.stop_words = self._load_stop_words()
        
    def _load_stop_words(self):
        """Load common stop words"""
        return {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
            'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
        }
    
    def extract_ngrams(self, text, min_length=2, max_length=4):
        """Extract n-grams from text"""
        # Clean text
        text = re.sub(r'[^\w\s]', ' ', text.lower())
        words = text.split()
        
        # Filter stop words
        words = [word for word in words if word not in self.stop_words and len(word) > 2]
        
        ngrams = []
        for n in range(min_length, max_length + 1):
            for i in range(len(words) - n + 1):
                ngram = ' '.join(words[i:i + n])
                ngrams.append(ngram)
        
        return ngrams
    
    def get_top_ngrams(self, texts, min_length=2, max_length=4, top_n=10):
        """Get top n-grams from a collection of texts"""
        all_ngrams = []
        
        for text in texts:
            ngrams = self.extract_ngrams(text, min_length, max_length)
            all_ngrams.extend(ngrams)
        
        # Count n-grams
        ngram_counts = Counter(all_ngrams)
        
        # Return top n most frequent n-grams
        return ngram_counts.most_common(top_n)
    
    def generate_theme_label(self, top_ngrams, theme_texts):
        """Generate theme label from top n-grams"""
        if not top_ngrams:
            return "Unnamed Theme"
        
        # Use the most frequent n-gram as the primary label
        primary_ngram = top_ngrams[0][0]
        
        # If it's a single word, try to find a more descriptive phrase
        if len(primary_ngram.split()) == 1 and len(top_ngrams) > 1:
            # Look for a 2-3 word phrase
            for ngram, count in top_ngrams[1:]:
                if 2 <= len(ngram.split()) <= 3:
                    primary_ngram = ngram
                    break
        
        # Capitalize and format the label
        label = primary_ngram.title()
        
        return label
    
    def extract_key_phrases(self, texts, top_ngrams):
        """Extract key phrases that represent the theme"""
        key_phrases = []
        
        # Get the top n-grams as key phrases
        for ngram, count in top_ngrams[:5]:
            key_phrases.append({
                'phrase': ngram,
                'frequency': count,
                'type': 'ngram'
            })
        
        # Also extract some representative sentences
        for text in texts[:3]:  # Look at first 3 texts
            sentences = re.split(r'[.!?]+', text)
            for sentence in sentences:
                sentence = sentence.strip()
                if len(sentence) > 20 and len(sentence) < 200:
                    # Check if sentence contains any of our top n-grams
                    sentence_lower = sentence.lower()
                    for ngram, _ in top_ngrams[:3]:
                        if ngram.lower() in sentence_lower:
                            key_phrases.append({
                                'phrase': sentence,
                                'frequency': 1,
                                'type': 'sentence'
                            })
                            break
                    if len(key_phrases) >= 8:  # Limit total phrases
                        break
        
        return key_phrases


async def main():
    nc = NATS()
    await nc.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    engine = create_db_engine()
    worker = LabelingWorker()

    async def handle(msg):
        data = msg.data.decode()
        try:
            payload = json.loads(data)
            project_id = payload.get("projectId")
            theme_id = payload.get("themeId")
        except Exception:
            return

        try:
            if project_id:
                # Label all themes in project
                themes = fetch_project_themes(engine, project_id)
                for theme in themes:
                    await label_single_theme(engine, worker, theme['id'])
            elif theme_id:
                # Label single theme
                await label_single_theme(engine, worker, theme_id)
                
        except Exception as e:
            print(f"Error in labeling: {e}")

    async def label_single_theme(engine, worker, theme_id):
        """Label a single theme"""
        # Fetch sections for this theme
        sections = fetch_theme_sections_for_labeling(engine, theme_id)
        
        if not sections:
            print(f"No sections found for theme {theme_id}")
            return
        
        # Extract texts
        texts = [section['text'] for section in sections]
        
        # Get top n-grams
        top_ngrams = worker.get_top_ngrams(
            texts, 
            worker.min_ngram_length, 
            worker.max_ngram_length, 
            worker.top_n_terms
        )
        
        # Generate label
        label = worker.generate_theme_label(top_ngrams, texts)
        
        # Extract key phrases
        key_phrases = worker.extract_key_phrases(texts, top_ngrams)
        
        # Create provenance
        provenance = {
            'method': 'ngram_extraction',
            'top_ngrams': top_ngrams[:5],
            'key_phrases': key_phrases,
            'sections_analyzed': len(sections),
            'min_ngram_length': worker.min_ngram_length,
            'max_ngram_length': worker.max_ngram_length
        }
        
        # Update theme with label and provenance
        update_theme_label_and_provenance(engine, theme_id, label, provenance)
        
        print(f"Labeled theme {theme_id}: {label}")

    await nc.subscribe("label.run", cb=handle)
    await nc.subscribe("label.theme", cb=handle)
    while True:
        await asyncio.sleep(5)


def fetch_project_themes(engine, project_id):
    """Fetch all themes for a project"""
    sql = """
    SELECT id FROM themes 
    WHERE "projectId" = :project_id
    """
    with engine.connect() as conn:
        rows = conn.execute(sql, {"project_id": project_id}).fetchall()
        return [{'id': row[0]} for row in rows]


if __name__ == "__main__":
    asyncio.run(main())
