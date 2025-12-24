"""
Document Index System - Comprehensive Document, Todo, and Roadmap Indexing
Provides advanced search, tagging, and cross-referencing capabilities
Version: 1.0.0
"""

import hashlib
import json
import os
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


class DocumentType(Enum):
    """Document type enumeration"""

    MARKDOWN = "markdown"
    JSON = "json"
    PLAINTEXT = "plaintext"
    CODE = "code"
    CONFIG = "config"
    UNKNOWN = "unknown"


class DocumentStatus(Enum):
    """Document status enumeration"""

    ACTIVE = "active"
    ARCHIVED = "archived"
    DRAFT = "draft"
    REVIEW = "review"
    DEPRECATED = "deprecated"


class TodoStatus(Enum):
    """Todo status enumeration"""

    NOT_STARTED = "not-started"
    IN_PROGRESS = "in-progress"
    BLOCKED = "blocked"
    IN_REVIEW = "in-review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TodoPriority(Enum):
    """Todo priority enumeration"""

    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class IndexedDocument:
    """Represents an indexed document"""

    doc_id: str
    name: str
    path: str
    doc_type: str
    status: str
    description: str
    tags: List[str]
    related_docs: List[str]  # doc_ids of related documents
    roadmap_items: List[str]  # roadmap section references
    todos: List[str]  # linked todo ids
    word_count: int
    created_at: str
    updated_at: str
    content_hash: str
    file_size_bytes: int
    keywords: List[str]
    metadata: Dict


@dataclass
class RoadmapItem:
    """Represents a roadmap item"""

    item_id: str
    section: str  # A-Z section
    title: str
    description: str
    status: str  # planned, in-progress, completed
    linked_docs: List[str]  # doc_ids
    linked_todos: List[str]  # todo_ids
    priority: int
    estimated_effort: float  # hours
    actual_effort: float
    dependencies: List[str]  # other item_ids
    created_at: str
    updated_at: str
    completed_at: Optional[str]


@dataclass
class LinkedTodo:
    """Represents a todo item with roadmap linkage"""

    todo_id: str
    title: str
    description: str
    status: str
    priority: int
    assigned_to: str
    linked_documents: List[str]  # doc_ids
    linked_roadmap_items: List[str]  # roadmap item_ids
    subtasks: List[str]  # todo_ids
    dependencies: List[str]  # todo_ids
    due_date: Optional[str]
    estimated_hours: float
    actual_hours: float
    progress_percent: int
    created_at: str
    updated_at: str
    completed_at: Optional[str]
    tags: List[str]
    notes: List[str]


class DocIndexSystem:
    """Comprehensive document indexing and cross-referencing system"""

    def __init__(self, data_dir: str = "doc_system/data"):
        """Initialize the document index system"""
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # Storage paths
        self.documents_index_path = self.data_dir / "doc_index.json"
        self.roadmap_index_path = self.data_dir / "roadmap_index.json"
        self.todos_index_path = self.data_dir / "todos_index.json"
        self.cross_ref_path = self.data_dir / "cross_references.json"
        self.search_index_path = self.data_dir / "search_index.json"

        # Load or initialize indexes
        self.documents: Dict[str, IndexedDocument] = self._load_json(
            self.documents_index_path, {}
        )
        self.roadmap: Dict[str, RoadmapItem] = self._load_json(
            self.roadmap_index_path, {}
        )
        self.todos: Dict[str, LinkedTodo] = self._load_json(self.todos_index_path, {})
        self.cross_references: Dict[str, List[str]] = self._load_json(
            self.cross_ref_path, {}
        )
        self.search_index: Dict[str, List[str]] = self._load_json(
            self.search_index_path, {}
        )

    def _load_json(self, path: Path, default: any) -> dict:
        """Load JSON file with error handling"""
        try:
            if path.exists():
                with open(path, "r") as f:
                    return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load {path}: {e}")
        return default

    def _save_json(self, path: Path, data: dict) -> bool:
        """Save JSON file with error handling"""
        try:
            with open(path, "w") as f:
                # Custom encoder for dataclass objects
                json.dump(
                    data,
                    f,
                    indent=2,
                    default=lambda x: (
                        asdict(x) if hasattr(x, "__dataclass_fields__") else str(x)
                    ),
                )
            return True
        except Exception as e:
            print(f"Error saving {path}: {e}")
            return False

    def _compute_hash(self, content: str) -> str:
        """Compute MD5 hash of content"""
        return hashlib.md5(content.encode()).hexdigest()

    def _extract_keywords(self, content: str) -> List[str]:
        """Extract keywords from content"""
        # Simple keyword extraction: capitalized words, code identifiers
        keywords = set()

        # Capitalized words
        for word in re.findall(r"\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b", content):
            if len(word) > 2:
                keywords.add(word.lower())

        # Code identifiers (snake_case, camelCase)
        for word in re.findall(r"\b[a-z_]+[a-z0-9_]*\b", content):
            if len(word) > 3 and word not in ["the", "and", "for", "with"]:
                keywords.add(word)

        return sorted(list(keywords))[:20]  # Limit to 20

    def index_document(
        self,
        doc_id: str,
        name: str,
        path: str,
        content: str,
        doc_type: str = "markdown",
        description: str = "",
        tags: List[str] = None,
        status: str = "active",
    ) -> Tuple[bool, str]:
        """Index a new or updated document"""
        try:
            tags = tags or []

            # Calculate metadata
            word_count = len(content.split())
            content_hash = self._compute_hash(content)
            file_size = len(content.encode())
            keywords = self._extract_keywords(content)

            # Create indexed document
            doc = IndexedDocument(
                doc_id=doc_id,
                name=name,
                path=path,
                doc_type=doc_type,
                status=status,
                description=description,
                tags=tags,
                related_docs=[],
                roadmap_items=[],
                todos=[],
                word_count=word_count,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                content_hash=content_hash,
                file_size_bytes=file_size,
                keywords=keywords,
                metadata={"indexed_by": "doc_index_system", "index_version": "1.0"},
            )

            # Store in indexes
            self.documents[doc_id] = asdict(doc)

            # Update search index
            self._update_search_index(doc_id, name, description, tags, keywords)

            # Save indexes
            self._save_json(self.documents_index_path, self.documents)
            self._save_json(self.search_index_path, self.search_index)

            return True, f"Document '{name}' indexed successfully"

        except Exception as e:
            return False, f"Error indexing document: {str(e)}"

    def _update_search_index(
        self,
        doc_id: str,
        name: str,
        description: str,
        tags: List[str],
        keywords: List[str],
    ):
        """Update search index for a document"""
        # Build searchable text
        searchable = (
            f"{name} {description} {' '.join(tags)} {' '.join(keywords)}".lower()
        )

        # Index by individual words
        for word in set(searchable.split()):
            if len(word) > 2:
                if word not in self.search_index:
                    self.search_index[word] = []
                if doc_id not in self.search_index[word]:
                    self.search_index[word].append(doc_id)

    def link_documents(
        self, doc_id_1: str, doc_id_2: str, relationship: str = "related"
    ) -> Tuple[bool, str]:
        """Create a bidirectional link between two documents"""
        try:
            if doc_id_1 not in self.documents or doc_id_2 not in self.documents:
                return False, "One or both documents not found"

            # Create or get cross-reference key
            key = f"{doc_id_1}::{doc_id_2}"
            if key not in self.cross_references:
                self.cross_references[key] = []

            if relationship not in self.cross_references[key]:
                self.cross_references[key].append(relationship)

            # Update document relationships
            doc1 = self.documents[doc_id_1]
            doc2 = self.documents[doc_id_2]

            if doc_id_2 not in doc1.get("related_docs", []):
                if "related_docs" not in doc1:
                    doc1["related_docs"] = []
                doc1["related_docs"].append(doc_id_2)

            if doc_id_1 not in doc2.get("related_docs", []):
                if "related_docs" not in doc2:
                    doc2["related_docs"] = []
                doc2["related_docs"].append(doc_id_1)

            self._save_json(self.documents_index_path, self.documents)
            self._save_json(self.cross_ref_path, self.cross_references)

            return True, f"Documents linked: {relationship}"

        except Exception as e:
            return False, f"Error linking documents: {str(e)}"

    def create_roadmap_item(
        self,
        item_id: str,
        section: str,
        title: str,
        description: str,
        priority: int = 2,
        estimated_effort: float = 0.0,
        dependencies: List[str] = None,
    ) -> Tuple[bool, str]:
        """Create a new roadmap item"""
        try:
            item = RoadmapItem(
                item_id=item_id,
                section=section,
                title=title,
                description=description,
                status="planned",
                linked_docs=[],
                linked_todos=[],
                priority=priority,
                estimated_effort=estimated_effort,
                actual_effort=0.0,
                dependencies=dependencies or [],
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                completed_at=None,
            )

            self.roadmap[item_id] = asdict(item)
            self._save_json(self.roadmap_index_path, self.roadmap)

            return True, f"Roadmap item '{title}' created"

        except Exception as e:
            return False, f"Error creating roadmap item: {str(e)}"

    def link_document_to_roadmap(
        self, doc_id: str, roadmap_item_id: str
    ) -> Tuple[bool, str]:
        """Link a document to a roadmap item"""
        try:
            if doc_id not in self.documents:
                return False, f"Document {doc_id} not found"

            if roadmap_item_id not in self.roadmap:
                return False, f"Roadmap item {roadmap_item_id} not found"

            # Update document
            doc = self.documents[doc_id]
            if "roadmap_items" not in doc:
                doc["roadmap_items"] = []
            if roadmap_item_id not in doc["roadmap_items"]:
                doc["roadmap_items"].append(roadmap_item_id)

            # Update roadmap item
            item = self.roadmap[roadmap_item_id]
            if "linked_docs" not in item:
                item["linked_docs"] = []
            if doc_id not in item["linked_docs"]:
                item["linked_docs"].append(doc_id)

            self._save_json(self.documents_index_path, self.documents)
            self._save_json(self.roadmap_index_path, self.roadmap)

            return True, "Document linked to roadmap item"

        except Exception as e:
            return False, f"Error linking document to roadmap: {str(e)}"

    def create_todo(
        self,
        todo_id: str,
        title: str,
        description: str = "",
        priority: int = 2,
        assigned_to: str = "",
        due_date: Optional[str] = None,
        estimated_hours: float = 0.0,
        tags: List[str] = None,
        linked_roadmap_items: List[str] = None,
    ) -> Tuple[bool, str]:
        """Create a new todo item"""
        try:
            todo = LinkedTodo(
                todo_id=todo_id,
                title=title,
                description=description,
                status="not-started",
                priority=priority,
                assigned_to=assigned_to,
                linked_documents=[],
                linked_roadmap_items=linked_roadmap_items or [],
                subtasks=[],
                dependencies=[],
                due_date=due_date,
                estimated_hours=estimated_hours,
                actual_hours=0.0,
                progress_percent=0,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                completed_at=None,
                tags=tags or [],
                notes=[],
            )

            self.todos[todo_id] = asdict(todo)

            # Link to roadmap items
            for roadmap_item_id in linked_roadmap_items or []:
                if roadmap_item_id in self.roadmap:
                    item = self.roadmap[roadmap_item_id]
                    if "linked_todos" not in item:
                        item["linked_todos"] = []
                    if todo_id not in item["linked_todos"]:
                        item["linked_todos"].append(todo_id)

            self._save_json(self.todos_index_path, self.todos)
            self._save_json(self.roadmap_index_path, self.roadmap)

            return True, f"Todo '{title}' created"

        except Exception as e:
            return False, f"Error creating todo: {str(e)}"

    def link_document_to_todo(self, doc_id: str, todo_id: str) -> Tuple[bool, str]:
        """Link a document to a todo item"""
        try:
            if doc_id not in self.documents:
                return False, f"Document {doc_id} not found"

            if todo_id not in self.todos:
                return False, f"Todo {todo_id} not found"

            # Update document
            doc = self.documents[doc_id]
            if "todos" not in doc:
                doc["todos"] = []
            if todo_id not in doc["todos"]:
                doc["todos"].append(todo_id)

            # Update todo
            todo = self.todos[todo_id]
            if "linked_documents" not in todo:
                todo["linked_documents"] = []
            if doc_id not in todo["linked_documents"]:
                todo["linked_documents"].append(doc_id)

            self._save_json(self.documents_index_path, self.documents)
            self._save_json(self.todos_index_path, self.todos)

            return True, "Document linked to todo"

        except Exception as e:
            return False, f"Error linking document to todo: {str(e)}"

    def update_todo(
        self,
        todo_id: str,
        status: Optional[str] = None,
        progress_percent: Optional[int] = None,
        actual_hours: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Update a todo item"""
        try:
            if todo_id not in self.todos:
                return False, f"Todo {todo_id} not found"

            todo = self.todos[todo_id]

            if status:
                todo["status"] = status
                if status == "completed":
                    todo["completed_at"] = datetime.now().isoformat()
                    todo["progress_percent"] = 100

            if progress_percent is not None:
                todo["progress_percent"] = progress_percent

            if actual_hours is not None:
                todo["actual_hours"] = actual_hours

            if notes:
                if "notes" not in todo:
                    todo["notes"] = []
                todo["notes"].append(f"[{datetime.now().isoformat()}] {notes}")

            todo["updated_at"] = datetime.now().isoformat()

            self._save_json(self.todos_index_path, self.todos)

            return True, "Todo updated"

        except Exception as e:
            return False, f"Error updating todo: {str(e)}"

    def search_documents(
        self,
        query: str,
        tag_filter: Optional[str] = None,
        doc_type_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
    ) -> List[Dict]:
        """Search documents by query and filters"""
        results = []
        query_lower = query.lower().split()

        for doc_id, doc in self.documents.items():
            # Check filters
            if tag_filter and tag_filter not in doc.get("tags", []):
                continue
            if doc_type_filter and doc.get("doc_type") != doc_type_filter:
                continue
            if status_filter and doc.get("status") != status_filter:
                continue

            # Check query match in name, description, keywords, tags
            searchable = f"{doc.get('name', '')} {doc.get('description', '')} {' '.join(doc.get('keywords', []))} {' '.join(doc.get('tags', []))}".lower()

            match_count = sum(1 for q in query_lower if q in searchable)
            if match_count > 0:
                results.append(
                    {
                        "doc_id": doc_id,
                        "name": doc.get("name"),
                        "description": doc.get("description"),
                        "tags": doc.get("tags", []),
                        "match_score": (
                            match_count / len(query_lower) if query_lower else 0
                        ),
                    }
                )

        # Sort by match score
        return sorted(results, key=lambda x: x["match_score"], reverse=True)

    def get_roadmap_progress(self) -> Dict:
        """Get comprehensive roadmap progress report"""
        total = len(self.roadmap)
        completed = sum(
            1 for item in self.roadmap.values() if item.get("status") == "completed"
        )
        in_progress = sum(
            1 for item in self.roadmap.values() if item.get("status") == "in-progress"
        )
        planned = sum(
            1 for item in self.roadmap.values() if item.get("status") == "planned"
        )

        # Group by section
        by_section = {}
        for item_id, item in self.roadmap.items():
            section = item.get("section", "Unknown")
            if section not in by_section:
                by_section[section] = {"planned": 0, "in_progress": 0, "completed": 0}

            status = item.get("status", "planned")
            if status == "completed":
                by_section[section]["completed"] += 1
            elif status == "in-progress":
                by_section[section]["in_progress"] += 1
            else:
                by_section[section]["planned"] += 1

        # Calculate effort metrics
        total_estimated = sum(
            item.get("estimated_effort", 0) for item in self.roadmap.values()
        )
        total_actual = sum(
            item.get("actual_effort", 0) for item in self.roadmap.values()
        )

        return {
            "total_items": total,
            "completed": completed,
            "in_progress": in_progress,
            "planned": planned,
            "completion_percent": (completed / total * 100) if total > 0 else 0,
            "by_section": by_section,
            "total_estimated_hours": total_estimated,
            "total_actual_hours": total_actual,
            "efficiency": (
                (total_actual / total_estimated * 100) if total_estimated > 0 else 0
            ),
        }

    def get_todo_progress(self) -> Dict:
        """Get comprehensive todo progress report"""
        total = len(self.todos)
        completed = sum(
            1 for todo in self.todos.values() if todo.get("status") == "completed"
        )
        in_progress = sum(
            1 for todo in self.todos.values() if todo.get("status") == "in-progress"
        )
        blocked = sum(
            1 for todo in self.todos.values() if todo.get("status") == "blocked"
        )

        # By priority
        by_priority = {1: 0, 2: 0, 3: 0, 4: 0}
        for todo in self.todos.values():
            priority = todo.get("priority", 2)
            if priority in by_priority:
                by_priority[priority] += 1

        # By assignee
        by_assignee = {}
        for todo in self.todos.values():
            assignee = todo.get("assigned_to", "Unassigned")
            if assignee not in by_assignee:
                by_assignee[assignee] = 0
            by_assignee[assignee] += 1

        # Time metrics
        total_estimated = sum(
            todo.get("estimated_hours", 0) for todo in self.todos.values()
        )
        total_actual = sum(todo.get("actual_hours", 0) for todo in self.todos.values())

        # Overdue
        now = datetime.now().isoformat()
        overdue = sum(
            1
            for todo in self.todos.values()
            if todo.get("due_date")
            and todo.get("due_date") < now
            and todo.get("status") != "completed"
        )

        return {
            "total_todos": total,
            "completed": completed,
            "in_progress": in_progress,
            "blocked": blocked,
            "completion_percent": (completed / total * 100) if total > 0 else 0,
            "by_priority": by_priority,
            "by_assignee": by_assignee,
            "overdue_count": overdue,
            "total_estimated_hours": total_estimated,
            "total_actual_hours": total_actual,
            "efficiency": (
                (total_actual / total_estimated * 100) if total_estimated > 0 else 0
            ),
        }

    def get_system_status(self) -> Dict:
        """Get complete system status report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "documents": {
                "total": len(self.documents),
                "by_type": self._count_by_key("documents", "doc_type"),
                "by_status": self._count_by_key("documents", "status"),
                "by_tag": self._count_by_tag(),
            },
            "roadmap": self.get_roadmap_progress(),
            "todos": self.get_todo_progress(),
            "cross_references": len(self.cross_references),
            "search_index_terms": len(self.search_index),
        }

    def _count_by_key(self, collection: str, key: str) -> Dict:
        """Count items by a specific key"""
        counts = {}
        items = (
            self.documents
            if collection == "documents"
            else (self.roadmap if collection == "roadmap" else self.todos)
        )

        for item in items.values():
            value = item.get(key, "unknown")
            if isinstance(value, list):
                for v in value:
                    counts[v] = counts.get(v, 0) + 1
            else:
                counts[value] = counts.get(value, 0) + 1

        return counts

    def _count_by_tag(self) -> Dict:
        """Count documents by tag"""
        tag_counts = {}
        for doc in self.documents.values():
            for tag in doc.get("tags", []):
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        return tag_counts

    def export_markdown_report(self, filepath: str) -> Tuple[bool, str]:
        """Export a comprehensive markdown report"""
        try:
            status = self.get_system_status()
            roadmap_progress = self.get_roadmap_progress()
            todo_progress = self.get_todo_progress()

            report = f"""# Vision Cortex - Complete System Report

**Generated**: {datetime.now().isoformat()}

## Executive Summary

### System Statistics
- **Total Documents**: {status['documents']['total']}
- **Roadmap Items**: {status['roadmap']['total_items']}
- **Todo Items**: {status['todos']['total_todos']}

### Progress
- **Roadmap Completion**: {status['roadmap']['completion_percent']:.1f}%
- **Todo Completion**: {status['todos']['completion_percent']:.1f}%

---

## Documents Index

### By Type
{self._format_dict_table(status['documents']['by_type'])}

### By Status
{self._format_dict_table(status['documents']['by_status'])}

### By Tag
{self._format_dict_table(status['documents']['by_tag'])}

---

## Roadmap Progress

### Overall Status
- **Total Items**: {roadmap_progress['total_items']}
- **Completed**: {roadmap_progress['completed']}
- **In Progress**: {roadmap_progress['in_progress']}
- **Planned**: {roadmap_progress['planned']}
- **Completion**: {roadmap_progress['completion_percent']:.1f}%

### By Section
{self._format_section_table(roadmap_progress['by_section'])}

### Effort Metrics
- **Estimated Hours**: {roadmap_progress['total_estimated_hours']:.1f}
- **Actual Hours**: {roadmap_progress['total_actual_hours']:.1f}
- **Efficiency**: {roadmap_progress['efficiency']:.1f}%

---

## Todo Progress

### Overall Status
- **Total Todos**: {todo_progress['total_todos']}
- **Completed**: {todo_progress['completed']}
- **In Progress**: {todo_progress['in_progress']}
- **Blocked**: {todo_progress['blocked']}
- **Completion**: {todo_progress['completion_percent']:.1f}%
- **Overdue**: {todo_progress['overdue_count']}

### By Priority
{self._format_priority_table(todo_progress['by_priority'])}

### By Assignee
{self._format_assignee_table(todo_progress['by_assignee'])}

### Time Metrics
- **Estimated Hours**: {todo_progress['total_estimated_hours']:.1f}
- **Actual Hours**: {todo_progress['total_actual_hours']:.1f}
- **Efficiency**: {todo_progress['efficiency']:.1f}%

---

## Document Links

### Total Cross-References
{len(self.cross_references)}

### Search Index Terms
{len(self.search_index)}

---

**Report Generated**: {datetime.now().isoformat()}
"""

            with open(filepath, "w") as f:
                f.write(report)

            return True, f"Report exported to {filepath}"

        except Exception as e:
            return False, f"Error exporting report: {str(e)}"

    def _format_dict_table(self, data: Dict) -> str:
        """Format dictionary as markdown table"""
        if not data:
            return "No data"

        lines = ["| Item | Count |", "|------|-------|"]
        for key, value in sorted(data.items()):
            lines.append(f"| {key} | {value} |")

        return "\n".join(lines)

    def _format_section_table(self, data: Dict) -> str:
        """Format section data as markdown table"""
        lines = [
            "| Section | Planned | In Progress | Completed |",
            "|---------|---------|-------------|-----------|",
        ]
        for section in sorted(data.keys()):
            counts = data[section]
            lines.append(
                f"| {section} | {counts['planned']} | {counts['in_progress']} | {counts['completed']} |"
            )

        return "\n".join(lines)

    def _format_priority_table(self, data: Dict) -> str:
        """Format priority data as markdown table"""
        priority_names = {1: "Low", 2: "Medium", 3: "High", 4: "Critical"}
        lines = ["| Priority | Count |", "|----------|-------|"]
        for priority in sorted(data.keys()):
            lines.append(
                f"| {priority_names.get(priority, 'Unknown')} | {data[priority]} |"
            )

        return "\n".join(lines)

    def _format_assignee_table(self, data: Dict) -> str:
        """Format assignee data as markdown table"""
        lines = ["| Assignee | Count |", "|----------|-------|"]
        for assignee in sorted(data.keys()):
            lines.append(f"| {assignee} | {data[assignee]} |")

        return "\n".join(lines)
