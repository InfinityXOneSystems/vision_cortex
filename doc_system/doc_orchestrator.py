"""
Document System Orchestrator - Unified interface for all doc system components

Coordinates:
- Doc Ingest
- Doc Transform
- Doc Evolve
- Doc Create
- Doc Sync
- Interactive Todo List
"""

import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from doc_create import DocCreateSystem
from doc_evolve import DocEvolveSystem
# Import all doc system components
from doc_ingest import DocIngestSystem, DocMetadata
from doc_sync import DocSyncSystem
from doc_transform import DocTransformSystem, TransformConfig
from interactive_todo import InteractiveTodoSystem, TodoPriority, TodoStatus

logger = logging.getLogger(__name__)


class DocSystemOrchestrator:
    """Main orchestrator for document system"""

    def __init__(self, base_dir: str = "."):
        """Initialize orchestrator with all components"""
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

        # Initialize all subsystems
        self.ingest = DocIngestSystem(str(self.base_dir / "docs_ingested"))
        self.transform = DocTransformSystem(str(self.base_dir / "docs_transformed"))
        self.evolve = DocEvolveSystem(str(self.base_dir / "docs_versions"))
        self.create = DocCreateSystem(
            str(self.base_dir / "doc_templates"), str(self.base_dir / "docs_created")
        )
        self.sync = DocSyncSystem(str(self.base_dir / "docs_sync"))
        self.todos = InteractiveTodoSystem(str(self.base_dir / "todos"))

        self.operations_log = self.base_dir / "doc_system.log"

        logger.info("Document System Orchestrator initialized")

    def ingest_and_transform(
        self, source_path: str, target_format: str, tags: List[str] = None
    ) -> Tuple[bool, str, str]:
        """
        Ingest document and transform to target format

        Args:
            source_path: Source file path
            target_format: Target format
            tags: Tags for document

        Returns:
            (success, doc_id, transformed_content)
        """
        try:
            # Step 1: Ingest
            success, doc_id = self.ingest.ingest_file(source_path, tags)
            if not success:
                return False, "", f"Failed to ingest: {doc_id}"

            # Step 2: Get content
            content = self.ingest.get_document(doc_id)
            if not content:
                return False, doc_id, "Failed to retrieve content"

            # Step 3: Transform
            success, transformed = self.transform.transform(
                content, "markdown", target_format
            )

            if success:
                logger.info(f"Ingested and transformed: {doc_id} -> {target_format}")

            return success, doc_id, transformed

        except Exception as e:
            logger.error(f"Ingest and transform failed: {e}")
            return False, "", str(e)

    def create_evolving_document(
        self, title: str, initial_content: str, doc_id: str = ""
    ) -> Tuple[bool, str]:
        """
        Create a document and set up version tracking

        Args:
            title: Document title
            initial_content: Initial content
            doc_id: Optional document ID

        Returns:
            (success, doc_id)
        """
        try:
            if not doc_id:
                doc_id = f"doc_{int(datetime.now().timestamp())}"

            # Create version
            version_id = self.evolve.create_version(
                doc_id, initial_content, change_summary=f"Initial version of {title}"
            )

            logger.info(
                f"Created evolving document: {doc_id} with version {version_id}"
            )
            return True, doc_id

        except Exception as e:
            logger.error(f"Failed to create evolving document: {e}")
            return False, ""

    def improve_document(self, doc_id: str) -> Tuple[bool, str]:
        """
        Get suggestions and improvements for a document

        Args:
            doc_id: Document ID

        Returns:
            (success, suggestions_summary)
        """
        try:
            # Get latest version
            version = self.evolve.get_latest_version(doc_id)
            if not version:
                return False, "Document not found"

            # Get suggestions
            suggestions = self.evolve.suggest_improvements(version.content)

            summary = f"Found {len(suggestions)} improvement suggestions:\n"
            for i, suggestion in enumerate(suggestions, 1):
                summary += f"{i}. {suggestion['suggestion']}\n"

            return True, summary

        except Exception as e:
            logger.error(f"Failed to improve document: {e}")
            return False, str(e)

    def create_document_from_template(
        self, template_id: str, data: Dict[str, Any], track_with_todo: bool = False
    ) -> Tuple[bool, str]:
        """
        Create document from template and optionally link to todo

        Args:
            template_id: Template ID
            data: Template data
            track_with_todo: Create linked todo

        Returns:
            (success, document_id)
        """
        try:
            # Create from template
            success, content = self.create.create_from_template(template_id, data)
            if not success:
                return False, f"Template creation failed: {content}"

            # Save document
            doc_id = f"created_{int(datetime.now().timestamp())}"
            success, file_path = self.create.save_document(doc_id, content)

            if success and track_with_todo:
                # Create tracking todo
                todo_id = self.todos.create_todo(
                    title=f"Document: {data.get('title', doc_id)}",
                    description=f"Created from template: {template_id}",
                    tags=["document", template_id],
                )
                # Link document
                self.todos.link_document(todo_id, doc_id)

            logger.info(f"Created document from template: {doc_id}")
            return True, doc_id

        except Exception as e:
            logger.error(f"Failed to create from template: {e}")
            return False, str(e)

    def sync_and_track(
        self, from_location: str, to_location: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Sync documents and create tracking todos

        Args:
            from_location: Source location
            to_location: Target location

        Returns:
            (success, sync_details)
        """
        try:
            # Perform sync
            success, record = self.sync.sync_locations(from_location, to_location)

            if success and record:
                # Create tracking todo
                todo_id = self.todos.create_todo(
                    title=f"Sync: {from_location} -> {to_location}",
                    description=f"Synced {record.files_synced} files",
                    tags=["sync", "automation"],
                )

                details = {
                    "sync_id": record.sync_id,
                    "files_synced": record.files_synced,
                    "conflicts": record.conflicts,
                    "todo_id": todo_id,
                    "status": record.status,
                }

                return True, details

            return False, {}

        except Exception as e:
            logger.error(f"Sync and track failed: {e}")
            return False, {}

    def generate_system_report(self) -> Dict[str, Any]:
        """Generate comprehensive system report"""
        try:
            return {
                "generated_at": datetime.now().isoformat(),
                "ingest": {"stats": self.ingest.get_stats()},
                "transform": {"stats": self.transform.get_statistics()},
                "evolve": {"total_documents": len(self.evolve.versions)},
                "create": {"stats": self.create.get_statistics()},
                "sync": {
                    "status": self.sync.get_sync_status(),
                    "locations": self.sync.list_locations(),
                },
                "todos": {
                    "stats": self.todos.get_statistics(),
                    "progress": self.todos.generate_progress_report(),
                },
            }

        except Exception as e:
            logger.error(f"Failed to generate report: {e}")
            return {"error": str(e)}

    def health_check(self) -> Dict[str, Any]:
        """Check system health"""
        health = {"timestamp": datetime.now().isoformat(), "components": {}}

        try:
            # Check each component
            health["components"]["ingest"] = {
                "status": "ok",
                "documents": len(self.ingest.ingested_docs),
            }
            health["components"]["transform"] = {
                "status": "ok",
                "transformations": len(self.transform.transformations),
            }
            health["components"]["evolve"] = {
                "status": "ok",
                "versions": len(self.evolve.versions),
            }
            health["components"]["create"] = {
                "status": "ok",
                "templates": len(self.create.templates),
            }
            health["components"]["sync"] = {
                "status": "ok",
                "locations": len(self.sync.locations),
            }
            health["components"]["todos"] = {
                "status": "ok",
                "todos": len(self.todos.todos),
            }

            health["overall"] = "healthy"

        except Exception as e:
            health["overall"] = "degraded"
            health["error"] = str(e)

        return health

    def get_quick_summary(self) -> str:
        """Get quick system summary"""
        ingest_stats = self.ingest.get_stats()
        todo_stats = self.todos.get_statistics()
        sync_status = self.sync.get_sync_status()

        summary = f"""
Document System Summary
=======================

INGEST: {ingest_stats['total_documents']} documents ({ingest_stats['total_size_mb']} MB)
EVOLVE: {len(self.evolve.versions)} versioned documents
CREATE: {len(self.create.templates)} templates available
SYNC: {sync_status['total_syncs']} syncs across {sync_status['total_locations']} locations
TODOS: {todo_stats['total_todos']} items ({todo_stats['completed_percent']}% complete)

Key Metrics:
- High Priority Items: {todo_stats['high_priority_count']}
- Overdue Items: {len(self.todos.get_overdue_todos())}
- Estimated Hours: {todo_stats['total_estimated_hours']}
"""
        return summary


if __name__ == "__main__":
    # Example usage
    doc_system = DocSystemOrchestrator()

    # Show summary
    print(doc_system.get_quick_summary())

    # Health check
    health = doc_system.health_check()
    print(f"Health: {json.dumps(health, indent=2)}")
