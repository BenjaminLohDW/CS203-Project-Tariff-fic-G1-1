"""
HS Code Hybrid Search Engine
Semantic search using sentence transformers with hierarchical scoring
"""
import os
import numpy as np
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class HSSearchEngine:
    """
    Hybrid semantic search engine for HS codes using hierarchical embeddings
    """
    
    # Default paths
    DEFAULT_MODEL = "BAAI/bge-m3"
    EMBEDDINGS_DIR = "hs_nomenclature/embeddings"
    CSV_PATH = "hs_nomenclature/chapters_combined.csv"
    
    # File names
    CH_EMB = "chap_embeddings.npy"
    CH_META = "chap_meta.csv"
    HD_EMB = "head_embeddings.npy"
    HD_META = "head_meta.csv"
    SB_EMB = "sub_embeddings.npy"
    SB_META = "sub_meta.csv"
    
    COLS = ["Chapter", "Chapter Value", "Heading", "Heading Value", "Subheading", "Subheading Value"]
    
    def __init__(self, model_name: str = None, embeddings_dir: str = None, csv_path: str = None):
        """
        Initialize the HS Search Engine
        
        Args:
            model_name: Name of the sentence transformer model
            embeddings_dir: Directory to store/load embeddings
            csv_path: Path to the chapters_combined.csv file
        """
        self.model_name = model_name or self.DEFAULT_MODEL
        self.embeddings_dir = embeddings_dir or self.EMBEDDINGS_DIR
        self.csv_path = csv_path or self.CSV_PATH
        
        # Ensure embeddings directory exists
        os.makedirs(self.embeddings_dir, exist_ok=True)
        
        self.model = None
        self.ch_emb = None
        self.ch_meta = None
        self.hd_emb = None
        self.hd_meta = None
        self.sb_emb = None
        self.sb_meta = None
        
        self._is_initialized = False
    
    def _get_embedding_path(self, filename: str) -> str:
        """Get full path for embedding file"""
        return os.path.join(self.embeddings_dir, filename)
    
    def _embeddings_exist(self) -> bool:
        """Check if all embedding files exist"""
        files = [self.CH_EMB, self.CH_META, self.HD_EMB, self.HD_META, self.SB_EMB, self.SB_META]
        return all(os.path.exists(self._get_embedding_path(f)) for f in files)
    
    def _load_source(self, path: str) -> pd.DataFrame:
        """Load and preprocess source CSV"""
        logger.info(f"Loading source CSV from {path}")
        df = pd.read_csv(path, dtype=str, keep_default_na=False)
        
        for col in self.COLS:
            if col not in df.columns:
                df[col] = ""
            df[col] = df[col].fillna("").astype(str).str.strip()
        
        logger.info(f"Loaded {len(df)} rows from CSV")
        return df
    
    def _unique_chapters(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract unique chapters"""
        return df[["Chapter", "Chapter Value"]].drop_duplicates().sort_values(["Chapter"]).reset_index(drop=True)
    
    def _unique_headings(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract unique headings"""
        hd = df[["Chapter", "Chapter Value", "Heading", "Heading Value"]].drop_duplicates()
        hd = hd[hd["Heading"].str.strip() != ""]
        return hd.sort_values(["Chapter", "Heading"]).reset_index(drop=True)
    
    def _subheading_rows(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extract all subheading rows"""
        sb = df[self.COLS].copy()
        sb = sb[sb["Subheading"].str.strip() != ""]
        return sb.reset_index(drop=True)
    
    def _load_model(self) -> SentenceTransformer:
        """Load sentence transformer model"""
        logger.info(f"Loading model {self.model_name}")
        model = SentenceTransformer(self.model_name)
        
        if torch.cuda.is_available():
            model = model.to('cuda')
            logger.info(f"Model loaded on GPU: {torch.cuda.get_device_name(0)}")
        else:
            logger.info("Model loaded on CPU")
        
        return model
    
    def _encode_batch(self, texts: List[str], batch_size: int = 16) -> np.ndarray:
        """Encode a batch of texts to embeddings"""
        if not texts:
            return np.zeros((0, 0), dtype="float32")
        
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            show_progress_bar=True
        ).astype("float32")
        
        return embeddings
    
    def _embed_query(self, query: str) -> np.ndarray:
        """Encode a single query to embedding"""
        return self.model.encode([query], normalize_embeddings=True, show_progress_bar=False).astype("float32")[0]
    
    def build_embeddings(self, batch_size: int = 16, force_rebuild: bool = False) -> None:
        """
        Build embeddings from CSV if they don't exist or force rebuild
        
        Args:
            batch_size: Batch size for encoding
            force_rebuild: Force rebuild even if embeddings exist
        """
        if not force_rebuild and self._embeddings_exist():
            logger.info("Embeddings already exist, skipping build")
            return
        
        logger.info("Building embeddings from scratch...")
        
        # Load source data
        df = self._load_source(self.csv_path)
        ch = self._unique_chapters(df)
        hd = self._unique_headings(df)
        sb = self._subheading_rows(df)
        
        logger.info(f"Extracted: {len(ch)} chapters, {len(hd)} headings, {len(sb)} subheadings")
        
        # Load model
        if self.model is None:
            self.model = self._load_model()
        
        # Build chapter texts
        ch_texts = [f"Chapter {row['Chapter']}: {row['Chapter Value']}" for _, row in ch.iterrows()]
        
        # Build heading texts with chapter context
        hd_texts = [
            f"Chapter {row['Chapter']} - {row['Chapter Value']} | Heading {row['Heading']}: {row['Heading Value']}"
            for _, row in hd.iterrows()
        ]
        
        # Build subheading texts with full hierarchy
        sb_texts = [
            f"Chapter {row['Chapter']}: {row['Chapter Value']} | Heading {row['Heading']}: {row['Heading Value']} | Subheading {row['Subheading']}: {row['Subheading Value']}"
            for _, row in sb.iterrows()
        ]
        
        # Encode chapters
        logger.info(f"Encoding {len(ch_texts)} chapters...")
        ch_emb = self._encode_batch(ch_texts, batch_size=batch_size)
        np.save(self._get_embedding_path(self.CH_EMB), ch_emb)
        ch.to_csv(self._get_embedding_path(self.CH_META), index=False)
        logger.info(f"Saved chapter embeddings")
        
        # Encode headings
        logger.info(f"Encoding {len(hd_texts)} headings...")
        hd_emb = self._encode_batch(hd_texts, batch_size=batch_size)
        np.save(self._get_embedding_path(self.HD_EMB), hd_emb)
        hd.to_csv(self._get_embedding_path(self.HD_META), index=False)
        logger.info(f"Saved heading embeddings")
        
        # Encode subheadings
        logger.info(f"Encoding {len(sb_texts)} subheadings...")
        sb_emb = self._encode_batch(sb_texts, batch_size=batch_size)
        np.save(self._get_embedding_path(self.SB_EMB), sb_emb)
        sb.to_csv(self._get_embedding_path(self.SB_META), index=False)
        logger.info(f"Saved subheading embeddings")
        
        logger.info("✅ Embedding build complete!")
    
    def initialize(self, force_rebuild: bool = False) -> None:
        """
        Initialize the search engine: build/load embeddings and model
        
        Args:
            force_rebuild: Force rebuild embeddings even if they exist
        """
        if self._is_initialized and not force_rebuild:
            logger.info("Search engine already initialized")
            return
        
        # Build embeddings if needed
        self.build_embeddings(force_rebuild=force_rebuild)
        
        # Load model
        if self.model is None:
            self.model = self._load_model()
        
        # Load embeddings and metadata
        logger.info("Loading embeddings and metadata...")
        self.ch_emb = np.load(self._get_embedding_path(self.CH_EMB))
        self.ch_meta = pd.read_csv(self._get_embedding_path(self.CH_META), dtype=str, keep_default_na=False)
        self.hd_emb = np.load(self._get_embedding_path(self.HD_EMB))
        self.hd_meta = pd.read_csv(self._get_embedding_path(self.HD_META), dtype=str, keep_default_na=False)
        self.sb_emb = np.load(self._get_embedding_path(self.SB_EMB))
        self.sb_meta = pd.read_csv(self._get_embedding_path(self.SB_META), dtype=str, keep_default_na=False)
        
        self._is_initialized = True
        logger.info("✅ Search engine initialized successfully!")
    
    def search(
        self,
        query: str,
        top_k: int = 10,
        w_sub: float = 0.7,
        w_head: float = 0.2,
        w_ch: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search for HS codes
        
        Args:
            query: Search query (product description)
            top_k: Number of results to return
            w_sub: Weight for subheading similarity (default: 0.7)
            w_head: Weight for heading similarity (default: 0.2)
            w_ch: Weight for chapter similarity (default: 0.1)
        
        Returns:
            List of search results with scores and hierarchy
        """
        if not self._is_initialized:
            raise RuntimeError("Search engine not initialized. Call initialize() first.")
        
        logger.info(f"Searching for: {query} (top_k={top_k})")
        
        # Encode query
        q = self._embed_query(query)
        
        # Compute similarities
        ch_sims = self.ch_emb @ q
        hd_sims = self.hd_emb @ q
        sb_sims = self.sb_emb @ q
        
        # Build lookup dictionaries
        ch_sim_dict = {
            self.ch_meta.iloc[i]["Chapter"]: float(ch_sims[i])
            for i in range(len(self.ch_meta))
        }
        
        hd_sim_dict = {
            (self.hd_meta.iloc[i]["Chapter"], self.hd_meta.iloc[i]["Heading"]): float(hd_sims[i])
            for i in range(len(self.hd_meta))
        }
        
        # Score each subheading
        results = []
        for i in range(len(self.sb_meta)):
            m = self.sb_meta.iloc[i]
            sub_score = float(sb_sims[i])
            head_score = hd_sim_dict.get((m["Chapter"], m["Heading"]), 0.0)
            ch_score = ch_sim_dict.get(m["Chapter"], 0.0)
            total_score = (w_sub * sub_score) + (w_head * head_score) + (w_ch * ch_score)
            
            results.append({
                'score': total_score,
                'subheading': m['Subheading'],
                'subheading_value': m['Subheading Value'],
                'heading': m['Heading'],
                'heading_value': m['Heading Value'],
                'chapter': m['Chapter'],
                'chapter_value': m['Chapter Value'],
                'scores_breakdown': {
                    'subheading': sub_score,
                    'heading': head_score,
                    'chapter': ch_score
                }
            })
        
        # Sort by score descending
        results.sort(key=lambda x: -x['score'])
        
        # Add rank to top results
        top_results = results[:top_k]
        for rank, r in enumerate(top_results, 1):
            r['rank'] = rank
        
        logger.info(f"Found {len(top_results)} results")
        return top_results
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the search engine"""
        if not self._is_initialized:
            return {'initialized': False}
        
        return {
            'initialized': True,
            'model_name': self.model_name,
            'device': str(self.model.device) if self.model else 'unknown',
            'cuda_available': torch.cuda.is_available(),
            'total_chapters': len(self.ch_meta),
            'total_headings': len(self.hd_meta),
            'total_subheadings': len(self.sb_meta),
            'embeddings_dir': self.embeddings_dir
        }
