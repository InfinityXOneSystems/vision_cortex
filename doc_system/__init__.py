"""
Vision Cortex - Complete Document, Roadmap, and Validation System

Production-ready integrated system for:
- Document indexing and semantic search
- Roadmap management with A-Z organization
- Interactive todo tracking linked to roadmap
- Automated code validation with git integration
- Complete cross-referencing and linking
- Comprehensive reporting and analytics

Components:
- doc_index: Document indexing and cross-referencing
- code_validation_agent: Code validation with git integration
- unified_orchestrator: Central orchestration interface
- vision_cortex_cli: Interactive command-line interface

Legacy Components (v0.9):
- doc_ingest: Load documents from multiple sources
- doc_transform: Convert between formats
- doc_evolve: Version control and improvement
- doc_create: Template-based generation
- doc_sync: Multi-location synchronization
- interactive_todo: Project management
- doc_orchestrator: Unified interface

Usage (v1.0 - Recommended):
    from doc_system import get_system

    system = get_system(".")
    success, msg = system.index_document("doc1", "Title", "path.md", content)
    success, msg = system.create_roadmap_item("A-1", "A", "Feature", "Desc")
    success, msg = system.create_todo("todo1", "Task", priority=2)
    success, msg = system.validate_and_commit(["src/"], auto_push=True)
    report = system.generate_system_report()

Usage (v0.9 - Legacy):
    from doc_system import DocSystemOrchestrator

    orchestrator = DocSystemOrchestrator()
    success, doc_id = orchestrator.ingest.ingest_file("document.md")
"""

__version__ = "1.0.0"
__status__ = "Production Ready"
__author__ = "Vision Cortex Team"

# v1.0 - New Components
try:
    from code_validation_agent import CodeValidationAgent, ValidationResult
    from doc_index import (DocIndexSystem, DocumentStatus, DocumentType,
                           IndexedDocument, LinkedTodo, RoadmapItem,
                           TodoPriority, TodoStatus)
    from unified_orchestrator import UnifiedOrchestrator
    from vision_cortex_cli import VisionCortexCLI

    _NEW_COMPONENTS_AVAILABLE = True
except ImportError:
    _NEW_COMPONENTS_AVAILABLE = False

# v0.9 - Legacy Components
try:
    from doc_create import DocCreateSystem, DocTemplate
    from doc_evolve import DocEvolveSystem, DocVersion
    from doc_ingest import DocIngestSystem, DocMetadata
    from doc_orchestrator import DocSystemOrchestrator
    from doc_sync import DocSyncSystem, SyncLocation, SyncRecord
    from doc_transform import DocTransformSystem, TransformConfig
    from interactive_todo import (InteractiveTodoSystem, TodoItem,
                                  TodoPriority, TodoStatus)

    _LEGACY_COMPONENTS_AVAILABLE = True
except ImportError:
    _LEGACY_COMPONENTS_AVAILABLE = False

__all__ = [
    # v1.0 - New
    "DocIndexSystem",
    "DocumentType",
    "DocumentStatus",
    "TodoStatus",
    "TodoPriority",
    "IndexedDocument",
    "RoadmapItem",
    "LinkedTodo",
    "CodeValidationAgent",
    "ValidationResult",
    "UnifiedOrchestrator",
    "VisionCortexCLI",
    "get_system",
    "get_cli",
    # v0.9 - Legacy
    "DocSystemOrchestrator",
    "DocIngestSystem",
    "DocTransformSystem",
    "DocEvolveSystem",
    "DocCreateSystem",
    "DocSyncSystem",
    "InteractiveTodoSystem",
]


def get_system(workspace_root: str = "."):
    """
    Quick start: Get a fully initialized v1.0 system

    Usage:
        from doc_system import get_system
        system = get_system(".")
        success, msg = system.index_document(...)
    """
    if not _NEW_COMPONENTS_AVAILABLE:
        raise ImportError(
            "v1.0 components not available. Check doc_system installation."
        )
    return UnifiedOrchestrator(workspace_root)


def get_cli(workspace_root: str = "."):
    """
    Quick start: Get the interactive CLI

    Usage:
        from doc_system import get_cli
        cli = get_cli(".")
        cli.run_interactive()
    """
    if not _NEW_COMPONENTS_AVAILABLE:
        raise ImportError(
            "v1.0 components not available. Check doc_system installation."
        )
    return VisionCortexCLI(workspace_root)


__doc__ = """
Vision Cortex Document System

A complete, production-ready system for:
- Document ingestion from multiple sources
- Format transformation and normalization
- Version control and document evolution
- Template-based document creation
- Multi-location synchronization
- Interactive project management
- Automated code validation

System Status: PRODUCTION READY
Version: 1.0.0
"""
