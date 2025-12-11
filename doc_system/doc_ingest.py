"""
Document Ingest System - Loads documents from various sources

Supports:
- Local file system (markdown, txt, json, yaml, pdf)
- Git repositories
- Web URLs
- Database queries
- Streaming sources
"""

import os
import json
import yaml
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import logging
import mimetypes
import subprocess
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DocMetadata:
    """Document metadata"""
    source_id: str
    source_type: str  # file, git, url, database
    content_hash: str
    created_at: str
    modified_at: str
    file_path: Optional[str] = None
    url: Optional[str] = None
    tags: List[str] = None
    size_bytes: int = 0
    encoding: str = "utf-8"
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []


class DocIngestSystem:
    """Ingests documents from multiple sources"""
    
    def __init__(self, ingest_dir: str = "docs_ingested"):
        """Initialize the ingest system"""
        self.ingest_dir = Path(ingest_dir)
        self.ingest_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.ingest_dir / "ingest_metadata.json"
        self.ingest_log = self.ingest_dir / "ingest.log"
        self.ingested_docs: Dict[str, DocMetadata] = self._load_metadata()
        
    def _load_metadata(self) -> Dict[str, DocMetadata]:
        """Load existing ingest metadata"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return {
                        k: DocMetadata(**v) for k, v in data.items()
                    }
            except Exception as e:
                logger.error(f"Failed to load metadata: {e}")
        return {}
    
    def _save_metadata(self):
        """Save ingest metadata"""
        try:
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {k: asdict(v) for k, v in self.ingested_docs.items()},
                    f,
                    indent=2
                )
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")
    
    def _calculate_hash(self, content: str) -> str:
        """Calculate content hash"""
        return hashlib.md5(content.encode()).hexdigest()
    
    def ingest_file(self, file_path: str, tags: List[str] = None) -> Tuple[bool, str]:
        """
        Ingest a local file
        
        Args:
            file_path: Path to file
            tags: Optional tags for document
            
        Returns:
            (success, document_id)
        """
        try:
            path = Path(file_path)
            if not path.exists():
                return False, f"File not found: {file_path}"
            
            # Read file
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Create metadata
            file_hash = self._calculate_hash(content)
            source_id = f"file_{hashlib.md5(str(path).encode()).hexdigest()}"
            
            # Check if already ingested
            if source_id in self.ingested_docs:
                existing = self.ingested_docs[source_id]
                if existing.content_hash == file_hash:
                    return True, source_id
            
            # Store document
            doc_path = self.ingest_dir / source_id / "content.txt"
            doc_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(doc_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Create metadata
            metadata = DocMetadata(
                source_id=source_id,
                source_type="file",
                content_hash=file_hash,
                created_at=datetime.now().isoformat(),
                modified_at=datetime.now().isoformat(),
                file_path=str(path.absolute()),
                tags=tags or [],
                size_bytes=len(content),
                encoding="utf-8"
            )
            
            self.ingested_docs[source_id] = metadata
            self._save_metadata()
            
            logger.info(f"Ingested file: {file_path} -> {source_id}")
            return True, source_id
            
        except Exception as e:
            logger.error(f"Failed to ingest file {file_path}: {e}")
            return False, str(e)
    
    def ingest_directory(self, dir_path: str, pattern: str = "*.md", 
                        recursive: bool = True, tags: List[str] = None) -> Tuple[int, List[str]]:
        """
        Ingest all files in a directory
        
        Args:
            dir_path: Path to directory
            pattern: File pattern to match
            recursive: Search recursively
            tags: Tags for all documents
            
        Returns:
            (count, document_ids)
        """
        try:
            path = Path(dir_path)
            if not path.exists():
                return 0, []
            
            doc_ids = []
            if recursive:
                files = list(path.glob(f"**/{pattern}"))
            else:
                files = list(path.glob(pattern))
            
            for file_path in files:
                success, doc_id = self.ingest_file(str(file_path), tags)
                if success:
                    doc_ids.append(doc_id)
            
            logger.info(f"Ingested {len(doc_ids)} files from {dir_path}")
            return len(doc_ids), doc_ids
            
        except Exception as e:
            logger.error(f"Failed to ingest directory {dir_path}: {e}")
            return 0, []
    
    def ingest_git_repo(self, repo_url: str, branch: str = "main", 
                       tags: List[str] = None) -> Tuple[int, List[str]]:
        """
        Ingest documents from a git repository
        
        Args:
            repo_url: Git repository URL
            branch: Branch to clone
            tags: Tags for documents
            
        Returns:
            (count, document_ids)
        """
        try:
            # Clone repo
            repo_name = repo_url.split('/')[-1].replace('.git', '')
            repo_dir = self.ingest_dir / f"git_{repo_name}"
            
            if not repo_dir.exists():
                subprocess.run(
                    ['git', 'clone', '--branch', branch, repo_url, str(repo_dir)],
                    check=True,
                    capture_output=True
                )
            
            # Ingest all markdown files
            count, doc_ids = self.ingest_directory(
                str(repo_dir),
                pattern="*.md",
                recursive=True,
                tags=tags or ["git", repo_name]
            )
            
            return count, doc_ids
            
        except Exception as e:
            logger.error(f"Failed to ingest git repo {repo_url}: {e}")
            return 0, []
    
    def ingest_url(self, url: str, tags: List[str] = None) -> Tuple[bool, str]:
        """
        Ingest document from URL
        
        Args:
            url: Document URL
            tags: Tags for document
            
        Returns:
            (success, document_id)
        """
        try:
            import urllib.request
            
            # Download content
            with urllib.request.urlopen(url) as response:
                content = response.read().decode('utf-8')
            
            # Create metadata
            source_id = f"url_{hashlib.md5(url.encode()).hexdigest()}"
            file_hash = self._calculate_hash(content)
            
            # Check if already ingested
            if source_id in self.ingested_docs:
                existing = self.ingested_docs[source_id]
                if existing.content_hash == file_hash:
                    return True, source_id
            
            # Store document
            doc_path = self.ingest_dir / source_id / "content.txt"
            doc_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(doc_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Create metadata
            metadata = DocMetadata(
                source_id=source_id,
                source_type="url",
                content_hash=file_hash,
                created_at=datetime.now().isoformat(),
                modified_at=datetime.now().isoformat(),
                url=url,
                tags=tags or ["web"],
                size_bytes=len(content),
                encoding="utf-8"
            )
            
            self.ingested_docs[source_id] = metadata
            self._save_metadata()
            
            logger.info(f"Ingested URL: {url} -> {source_id}")
            return True, source_id
            
        except Exception as e:
            logger.error(f"Failed to ingest URL {url}: {e}")
            return False, str(e)
    
    def get_document(self, doc_id: str) -> Optional[str]:
        """Get document content by ID"""
        try:
            doc_path = self.ingest_dir / doc_id / "content.txt"
            if doc_path.exists():
                with open(doc_path, 'r', encoding='utf-8') as f:
                    return f.read()
        except Exception as e:
            logger.error(f"Failed to get document {doc_id}: {e}")
        return None
    
    def list_documents(self, tag: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all ingested documents
        
        Args:
            tag: Optional tag filter
            
        Returns:
            List of document metadata
        """
        docs = []
        for source_id, metadata in self.ingested_docs.items():
            if tag is None or tag in metadata.tags:
                docs.append({
                    "id": source_id,
                    **asdict(metadata)
                })
        return docs
    
    def get_stats(self) -> Dict[str, Any]:
        """Get ingest statistics"""
        by_type = {}
        total_size = 0
        
        for metadata in self.ingested_docs.values():
            source_type = metadata.source_type
            by_type[source_type] = by_type.get(source_type, 0) + 1
            total_size += metadata.size_bytes
        
        return {
            "total_documents": len(self.ingested_docs),
            "by_type": by_type,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2)
        }
    
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document"""
        try:
            if doc_id in self.ingested_docs:
                doc_path = self.ingest_dir / doc_id
                import shutil
                shutil.rmtree(doc_path)
                del self.ingested_docs[doc_id]
                self._save_metadata()
                logger.info(f"Deleted document: {doc_id}")
                return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
        return False


if __name__ == "__main__":
    # Example usage
    ingest = DocIngestSystem()
    
    # Ingest local files
    # success, doc_id = ingest.ingest_file("README.md", tags=["readme"])
    # print(f"Ingested: {success}, {doc_id}")
    
    # Ingest directory
    # count, doc_ids = ingest.ingest_directory("docs")
    # print(f"Ingested {count} files")
    
    # List documents
    docs = ingest.list_documents()
    print(f"Total documents: {len(docs)}")
    
    # Get stats
    stats = ingest.get_stats()
    print(f"Stats: {json.dumps(stats, indent=2)}")
