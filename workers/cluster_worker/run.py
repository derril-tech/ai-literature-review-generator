import os
import asyncio
import json
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler
from nats.aio.client import Client as NATS
from workers.common.db import create_db_engine, fetch_project_sections_with_embeddings, reset_project_themes, insert_theme, insert_theme_assignments


class ClusteringWorker:
    def __init__(self):
        self.min_clusters = 3
        self.max_clusters = 20
        self.random_state = 42
        
    def determine_optimal_clusters(self, embeddings, max_clusters=None):
        """Determine optimal number of clusters using silhouette analysis"""
        if max_clusters is None:
            max_clusters = min(self.max_clusters, len(embeddings) // 10)
        
        max_clusters = min(max_clusters, len(embeddings) - 1)
        
        if max_clusters < self.min_clusters:
            return self.min_clusters
        
        silhouette_scores = []
        k_values = range(self.min_clusters, max_clusters + 1)
        
        for k in k_values:
            kmeans = KMeans(n_clusters=k, random_state=self.random_state, n_init=10)
            cluster_labels = kmeans.fit_predict(embeddings)
            
            if len(set(cluster_labels)) > 1:
                score = silhouette_score(embeddings, cluster_labels)
                silhouette_scores.append(score)
            else:
                silhouette_scores.append(0)
        
        # Find k with highest silhouette score
        optimal_k = k_values[np.argmax(silhouette_scores)]
        return optimal_k, max(silhouette_scores)
    
    def perform_clustering(self, embeddings, n_clusters):
        """Perform K-means clustering"""
        # Standardize embeddings
        scaler = StandardScaler()
        embeddings_scaled = scaler.fit_transform(embeddings)
        
        # Perform clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=self.random_state, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings_scaled)
        
        # Calculate silhouette score
        silhouette_avg = silhouette_score(embeddings_scaled, cluster_labels)
        
        return cluster_labels, silhouette_avg, kmeans.cluster_centers_
    
    def build_theme_hierarchy(self, cluster_labels, cluster_centers, embeddings):
        """Build theme hierarchy from clusters"""
        themes = []
        
        for cluster_id in range(len(cluster_centers)):
            # Find sections in this cluster
            cluster_sections = [i for i, label in enumerate(cluster_labels) if label == cluster_id]
            
            if not cluster_sections:
                continue
            
            # Calculate cluster characteristics
            cluster_embeddings = [embeddings[i] for i in cluster_sections]
            cluster_center = cluster_centers[cluster_id]
            
            # Calculate average distance to center
            distances = [np.linalg.norm(emb - cluster_center) for emb in cluster_embeddings]
            avg_distance = np.mean(distances)
            
            # Determine if this is a main theme or subtheme
            is_main_theme = len(cluster_sections) >= 5  # Threshold for main theme
            
            themes.append({
                'cluster_id': cluster_id,
                'section_indices': cluster_sections,
                'center': cluster_center,
                'avg_distance': avg_distance,
                'size': len(cluster_sections),
                'is_main_theme': is_main_theme
            })
        
        return themes


async def main():
    nc = NATS()
    await nc.connect(os.getenv("NATS_URL", "nats://localhost:4222"))
    engine = create_db_engine()
    worker = ClusteringWorker()

    async def handle(msg):
        data = msg.data.decode()
        try:
            payload = json.loads(data)
            project_id = payload["projectId"]
        except Exception:
            return

        try:
            # Fetch sections with embeddings
            sections_data = fetch_project_sections_with_embeddings(engine, project_id)
            
            if not sections_data or len(sections_data) < 10:
                print(f"Insufficient data for clustering: {len(sections_data)} sections")
                return
            
            # Extract embeddings and metadata
            embeddings = []
            section_metadata = []
            
            for section in sections_data:
                if section['embedding']:
                    embeddings.append(section['embedding'])
                    section_metadata.append({
                        'id': section['id'],
                        'document_id': section['document_id'],
                        'text': section['text']
                    })
            
            if not embeddings:
                print("No embeddings found for clustering")
                return
            
            # Convert to numpy array
            embeddings_array = np.array(embeddings)
            
            # Determine optimal number of clusters
            optimal_k, silhouette_score = worker.determine_optimal_clusters(embeddings_array)
            print(f"Optimal clusters: {optimal_k}, Silhouette score: {silhouette_score:.3f}")
            
            # Perform clustering
            cluster_labels, actual_silhouette, cluster_centers = worker.perform_clustering(
                embeddings_array, optimal_k
            )
            
            # Build theme hierarchy
            themes = worker.build_theme_hierarchy(cluster_labels, cluster_centers, embeddings_array)
            
            # Reset existing themes for project
            reset_project_themes(engine, project_id)
            
            # Create themes and assignments
            for theme in themes:
                # Create theme record
                theme_id = insert_theme(engine, project_id, f"Theme {theme['cluster_id']}", {
                    'method': 'kmeans',
                    'silhouette': actual_silhouette,
                    'cluster_id': theme['cluster_id'],
                    'size': theme['size'],
                    'avg_distance': float(theme['avg_distance']),
                    'is_main_theme': theme['is_main_theme']
                })
                
                # Create theme assignments
                doc_weight_items = []
                for section_idx in theme['section_indices']:
                    section_meta = section_metadata[section_idx]
                    # Calculate weight based on distance to center
                    distance = np.linalg.norm(embeddings_array[section_idx] - theme['center'])
                    weight = max(0.1, 1.0 - distance / np.max([np.linalg.norm(emb - theme['center']) for emb in embeddings_array]))
                    doc_weight_items.append((section_meta['document_id'], weight))
                
                insert_theme_assignments(engine, theme_id, doc_weight_items)
            
            # Trigger labeling
            await nc.publish("label.run", json.dumps({
                "projectId": project_id
            }))
            
        except Exception as e:
            print(f"Error in clustering: {e}")

    await nc.subscribe("cluster.run", cb=handle)
    while True:
        await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(main())
