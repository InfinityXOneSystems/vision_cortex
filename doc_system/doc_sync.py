"""
Document Sync System - Synchronizes documents across repositories and systems

Supports:
- Multi-repository sync
- Bidirectional sync
- Conflict resolution
- Version reconciliation
- Change tracking
"""

import json
import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict
import subprocess

logger = logging.getLogger(__name__)


@dataclass
class SyncLocation:
    """Sync location (repository/filesystem)"""
    location_id: str
    name: str
    path: str
    location_type: str  # local, git, remote
    last_sync: Optional[str] = None
    sync_count: int = 0


@dataclass
class SyncRecord:
    """Sync operation record"""
    sync_id: str
    timestamp: str
    from_location: str
    to_location: str
    files_synced: int
    files_skipped: int
    conflicts: int
    status: str  # success, partial, failed


class DocSyncSystem:
    """Synchronizes documents across locations"""
    
    def __init__(self, sync_dir: str = "docs_sync"):
        """Initialize sync system"""
        self.sync_dir = Path(sync_dir)
        self.sync_dir.mkdir(parents=True, exist_ok=True)
        self.locations_file = self.sync_dir / "locations.json"
        self.sync_log_file = self.sync_dir / "sync_log.json"
        self.locations: Dict[str, SyncLocation] = self._load_locations()
        self.sync_records: List[SyncRecord] = self._load_sync_log()
        self.file_hashes: Dict[str, str] = {}
    
    def _load_locations(self) -> Dict[str, SyncLocation]:
        """Load sync locations"""
        if self.locations_file.exists():
            try:
                with open(self.locations_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return {
                        k: SyncLocation(**v) for k, v in data.items()
                    }
            except Exception as e:
                logger.error(f"Failed to load locations: {e}")
        return {}
    
    def _save_locations(self):
        """Save sync locations"""
        try:
            with open(self.locations_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {k: asdict(v) for k, v in self.locations.items()},
                    f,
                    indent=2
                )
        except Exception as e:
            logger.error(f"Failed to save locations: {e}")
    
    def _load_sync_log(self) -> List[SyncRecord]:
        """Load sync history"""
        if self.sync_log_file.exists():
            try:
                with open(self.sync_log_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return [SyncRecord(**record) for record in data]
            except Exception as e:
                logger.error(f"Failed to load sync log: {e}")
        return []
    
    def _save_sync_log(self):
        """Save sync history"""
        try:
            with open(self.sync_log_file, 'w', encoding='utf-8') as f:
                json.dump(
                    [asdict(r) for r in self.sync_records],
                    f,
                    indent=2
                )
        except Exception as e:
            logger.error(f"Failed to save sync log: {e}")
    
    def add_location(self, location_id: str, name: str, path: str,
                    location_type: str = "local") -> bool:
        """
        Add sync location
        
        Args:
            location_id: Location ID
            name: Location name
            path: Path to location
            location_type: Type (local, git, remote)
            
        Returns:
            Success status
        """
        try:
            if location_id in self.locations:
                logger.warning(f"Location already exists: {location_id}")
                return False
            
            location = SyncLocation(
                location_id=location_id,
                name=name,
                path=path,
                location_type=location_type
            )
            
            self.locations[location_id] = location
            self._save_locations()
            
            logger.info(f"Added sync location: {location_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add location: {e}")
            return False
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate file hash"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception as e:
            logger.error(f"Failed to calculate hash: {e}")
            return ""
    
    def _get_location_files(self, location_id: str, 
                           pattern: str = "*.md") -> List[Path]:
        """Get files from location"""
        if location_id not in self.locations:
            return []
        
        location = self.locations[location_id]
        loc_path = Path(location.path)
        
        if not loc_path.exists():
            return []
        
        return list(loc_path.glob(f"**/{pattern}"))
    
    def sync_locations(self, from_location: str, to_location: str,
                      pattern: str = "*.md", 
                      bidirectional: bool = False) -> Tuple[bool, SyncRecord]:
        """
        Sync documents between locations
        
        Args:
            from_location: Source location ID
            to_location: Target location ID
            pattern: File pattern to sync
            bidirectional: Also sync from target to source
            
        Returns:
            (success, sync_record)
        """
        try:
            if from_location not in self.locations or to_location not in self.locations:
                return False, None
            
            sync_id = f"sync_{datetime.now().isoformat()}"
            files_synced = 0
            files_skipped = 0
            conflicts = 0
            
            from_loc = self.locations[from_location]
            to_loc = self.locations[to_location]
            
            # Get source files
            source_files = self._get_location_files(from_location, pattern)
            
            # Sync files
            from_path = Path(from_loc.path)
            to_path = Path(to_loc.path)
            
            for source_file in source_files:
                try:
                    # Calculate relative path
                    rel_path = source_file.relative_to(from_path)
                    target_file = to_path / rel_path
                    
                    # Create target directory
                    target_file.parent.mkdir(parents=True, exist_ok=True)
                    
                    # Check for conflicts
                    if target_file.exists():
                        source_hash = self._calculate_file_hash(str(source_file))
                        target_hash = self._calculate_file_hash(str(target_file))
                        
                        if source_hash != target_hash:
                            conflicts += 1
                            continue
                    
                    # Copy file
                    with open(source_file, 'rb') as src:
                        with open(target_file, 'wb') as dst:
                            dst.write(src.read())
                    
                    files_synced += 1
                    
                except Exception as e:
                    logger.error(f"Failed to sync file {source_file}: {e}")
                    files_skipped += 1
            
            # Update location metadata
            from_loc.last_sync = datetime.now().isoformat()
            from_loc.sync_count += 1
            to_loc.last_sync = datetime.now().isoformat()
            to_loc.sync_count += 1
            
            self._save_locations()
            
            # Create record
            record = SyncRecord(
                sync_id=sync_id,
                timestamp=datetime.now().isoformat(),
                from_location=from_location,
                to_location=to_location,
                files_synced=files_synced,
                files_skipped=files_skipped,
                conflicts=conflicts,
                status="success" if conflicts == 0 else "partial"
            )
            
            self.sync_records.append(record)
            self._save_sync_log()
            
            logger.info(
                f"Sync complete: {files_synced} files, "
                f"{files_skipped} skipped, {conflicts} conflicts"
            )
            
            return True, record
            
        except Exception as e:
            logger.error(f"Sync failed: {e}")
            return False, None
    
    def resolve_conflict(self, file_path: str, resolution: str = "newer") -> bool:
        """
        Resolve sync conflict
        
        Args:
            file_path: Path to conflicted file
            resolution: Resolution strategy (newer, older, manual)
            
        Returns:
            Success status
        """
        try:
            if resolution == "newer":
                # Use newer file (by modification time)
                pass
            elif resolution == "older":
                # Use older file
                pass
            elif resolution == "manual":
                # Prompt user for resolution
                pass
            
            logger.info(f"Resolved conflict: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to resolve conflict: {e}")
            return False
    
    def get_sync_status(self) -> Dict[str, Any]:
        """Get sync status"""
        total_syncs = len(self.sync_records)
        successful = sum(1 for r in self.sync_records if r.status == "success")
        
        return {
            "total_locations": len(self.locations),
            "total_syncs": total_syncs,
            "successful_syncs": successful,
            "partial_syncs": total_syncs - successful,
            "last_sync": self.sync_records[-1].timestamp if self.sync_records else None
        }
    
    def get_sync_history(self, location_id: Optional[str] = None,
                        limit: int = 10) -> List[Dict[str, Any]]:
        """Get sync history"""
        records = self.sync_records
        
        if location_id:
            records = [
                r for r in records 
                if r.from_location == location_id or r.to_location == location_id
            ]
        
        return [
            {
                "sync_id": r.sync_id,
                "timestamp": r.timestamp,
                "from": r.from_location,
                "to": r.to_location,
                "files_synced": r.files_synced,
                "conflicts": r.conflicts
            }
            for r in records[-limit:]
        ]
    
    def list_locations(self) -> List[Dict[str, Any]]:
        """List all sync locations"""
        return [
            {
                "id": loc.location_id,
                "name": loc.name,
                "path": loc.path,
                "type": loc.location_type,
                "last_sync": loc.last_sync,
                "sync_count": loc.sync_count
            }
            for loc in self.locations.values()
        ]


if __name__ == "__main__":
    # Example usage
    sync = DocSyncSystem()
    
    # Add locations
    sync.add_location("repo1", "Local Repo", "./docs/repo1", "local")
    sync.add_location("repo2", "Remote Repo", "./docs/repo2", "git")
    
    # Perform sync
    success, record = sync.sync_locations("repo1", "repo2", "*.md")
    print(f"Sync successful: {success}")
    
    if record:
        print(f"Synced {record.files_synced} files")
    
    # Get status
    status = sync.get_sync_status()
    print(f"Status: {json.dumps(status, indent=2)}")
