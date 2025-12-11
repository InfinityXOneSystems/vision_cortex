# Vision Cortex - Complete Indexing System Documentation

**Version**: 1.0.0  
**Status**: PRODUCTION READY  
**Last Updated**: December 11, 2025

---

## 📖 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [Usage Guide](#usage-guide)
5. [API Reference](#api-reference)
6. [Examples](#examples)
7. [Advanced Features](#advanced-features)
8. [Integration Guide](#integration-guide)

---

## 🎯 SYSTEM OVERVIEW

The Vision Cortex Indexing System is a **unified platform** that integrates:

- **Document Management**: Index, search, and link documents
- **Roadmap Tracking**: Plan and track roadmap items with progress
- **Interactive Todos**: Manage todos linked to roadmap and documents
- **Code Validation**: Automated validation with commit integration
- **Complete Cross-Referencing**: Full linkage between all system components

### Key Capabilities

✅ **Full Document Indexing**: Support for markdown, JSON, code, plaintext  
✅ **Semantic Search**: Find documents by content, tags, keywords  
✅ **Roadmap Management**: Track A-Z roadmap sections with effort metrics  
✅ **Todo Integration**: Interactive todos linked to roadmap and documents  
✅ **Automatic Validation**: Code validation tied to roadmap/todo items  
✅ **Intelligent Commits**: Auto-generate commit messages based on validation  
✅ **Cross-System Linking**: Full bidirectional relationships  
✅ **Progress Tracking**: Real-time progress metrics for roadmap and todos  
✅ **Comprehensive Reports**: System-wide reporting and analytics  

---

## 🏗️ ARCHITECTURE

### Component Structure

```
Vision Cortex System
├── doc_index.py                    # Document indexing and search
├── unified_orchestrator.py         # Central orchestrator
├── code_validation_agent.py        # Code validation and commits
├── vision_cortex_cli.py            # Interactive CLI
└── data/                           # Data storage
    ├── doc_index.json              # Indexed documents
    ├── roadmap_index.json          # Roadmap items
    ├── todos_index.json            # Todo items
    ├── cross_references.json       # Document links
    └── search_index.json           # Search index
```

### Data Flow

```
User Input (CLI)
    ↓
Unified Orchestrator
    ├─→ Document Index System
    ├─→ Roadmap Manager
    ├─→ Todo Manager
    └─→ Code Validation Agent
        ↓
    Data Storage (JSON)
    ↓
Reports & Analytics
```

---

## 🔧 CORE COMPONENTS

### 1. Document Index System (`doc_index.py`)

**Responsibility**: Manage document indexing, searching, and cross-referencing

**Key Classes**:
- `DocIndexSystem`: Main indexing engine
- `IndexedDocument`: Document data structure
- `RoadmapItem`: Roadmap item data structure
- `LinkedTodo`: Todo data structure

**Key Methods**:

```python
# Index a document
index_document(doc_id, name, path, content, doc_type, description, tags, status)

# Search documents
search_documents(query, tag_filter, doc_type_filter, status_filter)

# Link documents
link_documents(doc_id_1, doc_id_2, relationship)

# Roadmap operations
create_roadmap_item(item_id, section, title, description, priority, estimated_effort)
link_document_to_roadmap(doc_id, roadmap_item_id)

# Todo operations
create_todo(todo_id, title, description, priority, assigned_to, due_date, estimated_hours)
link_document_to_todo(doc_id, todo_id)
update_todo(todo_id, status, progress_percent, actual_hours, notes)

# Progress tracking
get_roadmap_progress() → Dict with completion metrics
get_todo_progress() → Dict with completion metrics
get_system_status() → Complete system status

# Reporting
export_markdown_report(filepath)
```

### 2. Code Validation Agent (`code_validation_agent.py`)

**Responsibility**: Validate code and integrate with git for automatic commits

**Key Classes**:
- `CodeValidationAgent`: Main validation engine
- `ValidationResult`: Validation check result

**Key Methods**:

```python
# File/directory validation
validate_file(file_path, roadmap_item_id, todo_id)
validate_directory(directory, recursive, roadmap_item_id, todo_id)

# Validation by type
_validate_python(file_path)
_validate_javascript(file_path)
_validate_json(file_path)
_validate_markdown(file_path)

# Git integration
git_stage_changes(file_paths)
git_commit(message)
git_push(branch, delay_seconds)
validate_and_commit(file_paths, roadmap_item_id, todo_id, auto_push)

# Reporting
generate_commit_message(roadmap_item_id, todo_id)
get_validation_report() → Comprehensive validation report
```

### 3. Unified Orchestrator (`unified_orchestrator.py`)

**Responsibility**: Central interface for all system operations

**Key Methods**:

```python
# Document operations
index_document(...)
search_documents(...)
link_documents(...)

# Roadmap operations
create_roadmap_item(...)
update_roadmap_item(...)
link_document_to_roadmap(...)
get_roadmap_progress()

# Todo operations
create_todo(...)
update_todo(...)
link_document_to_todo(...)
get_todo_progress()

# Validation operations
validate_file(...)
validate_directory(...)
validate_and_commit(...)
get_validation_report()

# Integrated workflows
create_roadmap_work_item(...)
complete_work_item(...)
get_work_item_status(...)

# Reporting
generate_system_report()
export_complete_report()
health_check()
```

### 4. Interactive CLI (`vision_cortex_cli.py`)

**Responsibility**: User-friendly command-line interface

**Features**:
- Interactive menu system
- All system operations accessible
- Real-time feedback
- Error handling and validation

---

## 📘 USAGE GUIDE

### Starting the CLI

```bash
cd vision_cortex/doc_system
python vision_cortex_cli.py
```

### Basic Workflows

#### 1. Index a Document

```
Menu → 1. Index a document
→ Enter document ID, name, path
→ Document indexed and searchable
```

**Programmatically**:
```python
from unified_orchestrator import UnifiedOrchestrator

orchestrator = UnifiedOrchestrator()
success, msg = orchestrator.index_document(
    "doc1",
    "My Document",
    "path/to/doc.md",
    content,
    description="Important document",
    tags=["important", "reference"]
)
```

#### 2. Create a Roadmap Item

```
Menu → 4. Create roadmap item
→ Enter item ID, section, title, description
→ Roadmap item created
```

**Programmatically**:
```python
success, msg = orchestrator.create_roadmap_item(
    "A-1",
    "A",
    "Automated Systems",
    "Implement auto code validator",
    priority=3,
    estimated_effort=8.0
)
```

#### 3. Create a Todo Linked to Roadmap

```
Menu → 7. Create todo
→ Enter todo ID, title, description
→ Link to roadmap item
→ Todo created and linked
```

**Programmatically**:
```python
success, msg = orchestrator.create_todo(
    "todo-1",
    "Implement validator",
    priority=3,
    estimated_hours=8.0,
    linked_roadmap_items=["A-1"]
)
```

#### 4. Create Complete Work Item

```
Menu → 15. Create complete work item
→ Enter roadmap ID, todo ID, document ID
→ System creates all linkages
→ Work item ready to execute
```

**Programmatically**:
```python
success, msg = orchestrator.create_roadmap_work_item(
    roadmap_item_id="A-1",
    section="A",
    title="Automated Systems",
    description="Build auto validator",
    todo_id="todo-1",
    doc_id="doc-validator",
    priority=3,
    estimated_hours=8.0
)
```

#### 5. Validate and Commit

```
Menu → 13. Validate and commit
→ Enter file paths, roadmap/todo IDs
→ System validates and auto-commits
→ Optional auto-push to remote
```

**Programmatically**:
```python
success, msg = orchestrator.validate_and_commit(
    file_paths=["src/validator.py", "src/utils.py"],
    roadmap_item_id="A-1",
    todo_id="todo-1",
    auto_push=True
)
```

#### 6. Complete Work Item

```
Menu → 16. Complete work item
→ Enter roadmap and todo IDs
→ Enter actual hours spent
→ System validates, commits, and marks complete
```

**Programmatically**:
```python
success, msg = orchestrator.complete_work_item(
    roadmap_item_id="A-1",
    todo_id="todo-1",
    actual_hours=7.5,
    file_paths=["src/validator.py"],
    validate_before_complete=True,
    auto_push=True
)
```

#### 7. View Progress

```
Menu → 5. View roadmap progress
Menu → 9. View todo progress
→ System displays comprehensive progress metrics
```

**Programmatically**:
```python
roadmap_progress = orchestrator.get_roadmap_progress()
todo_progress = orchestrator.get_todo_progress()

print(f"Roadmap: {roadmap_progress['completion_percent']}% complete")
print(f"Todos: {todo_progress['completion_percent']}% complete")
```

---

## 🔗 API REFERENCE

### DocIndexSystem

#### Document Operations

```python
def index_document(
    doc_id: str,
    name: str,
    path: str,
    content: str,
    doc_type: str = "markdown",
    description: str = "",
    tags: List[str] = None,
    status: str = "active"
) -> Tuple[bool, str]
```

```python
def search_documents(
    query: str,
    tag_filter: Optional[str] = None,
    doc_type_filter: Optional[str] = None,
    status_filter: Optional[str] = None
) -> List[Dict]
```

```python
def link_documents(
    doc_id_1: str,
    doc_id_2: str,
    relationship: str = "related"
) -> Tuple[bool, str]
```

#### Roadmap Operations

```python
def create_roadmap_item(
    item_id: str,
    section: str,
    title: str,
    description: str,
    priority: int = 2,
    estimated_effort: float = 0.0,
    dependencies: List[str] = None
) -> Tuple[bool, str]
```

```python
def link_document_to_roadmap(
    doc_id: str,
    roadmap_item_id: str
) -> Tuple[bool, str]
```

#### Todo Operations

```python
def create_todo(
    todo_id: str,
    title: str,
    description: str = "",
    priority: int = 2,
    assigned_to: str = "",
    due_date: Optional[str] = None,
    estimated_hours: float = 0.0,
    tags: List[str] = None,
    linked_roadmap_items: List[str] = None
) -> Tuple[bool, str]
```

```python
def update_todo(
    todo_id: str,
    status: Optional[str] = None,
    progress_percent: Optional[int] = None,
    actual_hours: Optional[float] = None,
    notes: Optional[str] = None
) -> Tuple[bool, str]
```

```python
def link_document_to_todo(
    doc_id: str,
    todo_id: str
) -> Tuple[bool, str]
```

#### Progress Tracking

```python
def get_roadmap_progress() -> Dict
# Returns: {
#     'total_items': int,
#     'completed': int,
#     'in_progress': int,
#     'planned': int,
#     'completion_percent': float,
#     'by_section': Dict,
#     'total_estimated_hours': float,
#     'total_actual_hours': float,
#     'efficiency': float
# }
```

```python
def get_todo_progress() -> Dict
# Returns: {
#     'total_todos': int,
#     'completed': int,
#     'in_progress': int,
#     'blocked': int,
#     'completion_percent': float,
#     'by_priority': Dict,
#     'by_assignee': Dict,
#     'overdue_count': int,
#     'total_estimated_hours': float,
#     'total_actual_hours': float,
#     'efficiency': float
# }
```

### CodeValidationAgent

```python
def validate_file(
    file_path: str,
    roadmap_item_id: str = None,
    todo_id: str = None
) -> Tuple[bool, str]
```

```python
def validate_directory(
    directory: str = ".",
    recursive: bool = True,
    roadmap_item_id: str = None,
    todo_id: str = None
) -> Tuple[int, int]
# Returns: (files_validated, issues_found)
```

```python
def validate_and_commit(
    file_paths: List[str] = None,
    roadmap_item_id: str = None,
    todo_id: str = None,
    auto_push: bool = False
) -> Tuple[bool, str]
```

```python
def git_stage_changes(file_paths: List[str] = None) -> Tuple[bool, str]
```

```python
def git_commit(message: str) -> Tuple[bool, str]
```

```python
def git_push(branch: str = 'main', delay_seconds: int = 2) -> Tuple[bool, str]
```

```python
def get_validation_report() -> Dict
```

---

## 💡 EXAMPLES

### Example 1: Complete Development Workflow

```python
from unified_orchestrator import UnifiedOrchestrator

# Initialize
orchestrator = UnifiedOrchestrator(".")

# 1. Create roadmap item
roadmap_id = "feature-1"
success, _ = orchestrator.create_roadmap_item(
    roadmap_id, "F", "New Feature", 
    "Implement new feature X",
    priority=3, estimated_effort=16.0
)

# 2. Create document
success, _ = orchestrator.index_document(
    "doc-feature-1",
    "Feature Design",
    "docs/feature-1.md",
    content="...",
    tags=["feature", "design"]
)

# 3. Create todo
todo_id = "task-1"
success, _ = orchestrator.create_todo(
    todo_id, "Implement Feature X",
    priority=3, estimated_hours=16.0,
    linked_roadmap_items=[roadmap_id]
)

# 4. Link document
success, _ = orchestrator.link_document_to_todo("doc-feature-1", todo_id)
success, _ = orchestrator.link_document_to_roadmap("doc-feature-1", roadmap_id)

# 5. Work on code
# ... edit and create src/feature.py ...

# 6. Validate and commit
success, msg = orchestrator.validate_and_commit(
    ["src/feature.py"],
    roadmap_item_id=roadmap_id,
    todo_id=todo_id,
    auto_push=True
)

# 7. Update progress
success, _ = orchestrator.update_todo(
    todo_id, 
    status="in-progress",
    progress_percent=50
)

# 8. Complete when done
success, msg = orchestrator.complete_work_item(
    roadmap_id, todo_id, 
    actual_hours=15.5,
    file_paths=["src/feature.py"],
    auto_push=True
)

# 9. View progress
progress = orchestrator.get_roadmap_progress()
print(f"Overall completion: {progress['completion_percent']}%")
```

### Example 2: Multi-Feature Project Planning

```python
# Create roadmap items for entire project
features = [
    ("feature-1", "F", "Core Features", 16.0),
    ("feature-2", "F", "UI/UX", 12.0),
    ("feature-3", "T", "Testing", 20.0),
]

for item_id, section, title, hours in features:
    orchestrator.create_roadmap_item(
        item_id, section, title, 
        f"Implement {title}",
        estimated_effort=hours
    )

# Link documents to each
for i, (item_id, _, _, _) in enumerate(features):
    orchestrator.link_document_to_roadmap(
        f"doc-feature-{i}",
        item_id
    )

# Create todos
for i, (item_id, _, title, hours) in enumerate(features):
    orchestrator.create_todo(
        f"todo-{i}", title,
        estimated_hours=hours,
        linked_roadmap_items=[item_id]
    )

# View overall progress
roadmap_progress = orchestrator.get_roadmap_progress()
todo_progress = orchestrator.get_todo_progress()

print(f"Roadmap: {roadmap_progress['completion_percent']:.1f}%")
print(f"Todos: {todo_progress['completion_percent']:.1f}%")
```

### Example 3: Search and Link Documents

```python
# Index multiple documents
documents = [
    ("doc1", "Requirements", "requirements.md", "...content..."),
    ("doc2", "Design", "design.md", "...content..."),
    ("doc3", "Architecture", "architecture.md", "...content..."),
]

for doc_id, name, path, content in documents:
    orchestrator.index_document(doc_id, name, path, content)

# Search for related documents
results = orchestrator.search_documents("architecture design")

# Link related documents
orchestrator.link_documents("doc2", "doc3", "depends-on")
orchestrator.link_documents("doc1", "doc2", "referenced-by")

# Link to roadmap
orchestrator.link_document_to_roadmap("doc1", "roadmap-1")
orchestrator.link_document_to_roadmap("doc2", "roadmap-1")
```

---

## 🚀 ADVANCED FEATURES

### 1. Custom Validation Rules

Extend `CodeValidationAgent` to add custom rules:

```python
class CustomValidationAgent(CodeValidationAgent):
    def _validate_python(self, file_path):
        results = super()._validate_python(file_path)
        
        # Add custom rules
        with open(file_path, 'r') as f:
            content = f.read()
        
        if "TODO" in content:
            results.append(ValidationResult(
                check_type='custom',
                file_path=str(file_path),
                status='warning',
                message="Contains TODO comments",
                severity='warning'
            ))
        
        return results
```

### 2. Automated Workflow Triggers

```python
def auto_process_roadmap_item(orchestrator, roadmap_id):
    """Auto-process when roadmap item created"""
    
    # Get roadmap item
    item = orchestrator.index.roadmap.get(roadmap_id)
    
    # Create corresponding todo
    todo_id = f"todo-{roadmap_id}"
    orchestrator.create_todo(
        todo_id,
        item['title'],
        item['description'],
        priority=item['priority'],
        estimated_hours=item['estimated_effort'],
        linked_roadmap_items=[roadmap_id]
    )
    
    # Create tracking document
    doc_id = f"doc-{roadmap_id}"
    orchestrator.index_document(
        doc_id,
        f"Tracking: {item['title']}",
        f"tracking/{roadmap_id}.md",
        f"# {item['title']}\n\n{item['description']}",
        tags=['tracking', item['section']]
    )
    
    # Link all together
    orchestrator.link_document_to_roadmap(doc_id, roadmap_id)
    orchestrator.link_document_to_todo(doc_id, todo_id)
```

### 3. Progress Webhooks

```python
def on_progress_change(orchestrator, callback):
    """Trigger callback when progress changes"""
    
    prev_progress = 0
    while True:
        current = orchestrator.get_todo_progress()['completion_percent']
        
        if current != prev_progress:
            callback(prev_progress, current)
            prev_progress = current
        
        time.sleep(30)  # Check every 30 seconds
```

---

## 🔌 INTEGRATION GUIDE

### With Existing Document Management

```python
# Import existing documents
from pathlib import Path

docs_dir = Path("docs")
for doc_file in docs_dir.glob("*.md"):
    with open(doc_file) as f:
        content = f.read()
    
    orchestrator.index_document(
        doc_file.stem,
        doc_file.name,
        str(doc_file),
        content
    )
```

### With Git Workflows

```python
# On commit hook:
import subprocess

diff = subprocess.check_output(['git', 'diff', '--name-only'])
changed_files = diff.decode().split('\n')

# Validate and auto-commit
orchestrator.validate_and_commit(
    changed_files,
    auto_push=True
)
```

### With CI/CD Pipelines

```bash
#!/bin/bash
# GitHub Actions example

python doc_system/vision_cortex_cli.py << EOF
13
src/
roadmap-1
todo-1
y
20
EOF
```

---

## 📊 Data Storage

All data is stored as JSON in `doc_system/data/`:

```json
{
  "doc1": {
    "doc_id": "doc1",
    "name": "My Document",
    "path": "path/to/doc.md",
    "doc_type": "markdown",
    "status": "active",
    "description": "Important document",
    "tags": ["important"],
    "related_docs": ["doc2"],
    "roadmap_items": ["roadmap-1"],
    "todos": ["todo-1"],
    "word_count": 1500,
    "created_at": "2025-12-11T...",
    "updated_at": "2025-12-11T...",
    "content_hash": "abc123...",
    "file_size_bytes": 5000,
    "keywords": ["key", "terms"]
  }
}
```

---

## ✅ Summary

The Vision Cortex Indexing System provides:

✅ **Complete document management** with full-text search  
✅ **Roadmap tracking** with A-Z organization  
✅ **Interactive todos** with progress tracking  
✅ **Automatic code validation** with git integration  
✅ **Full cross-referencing** between all components  
✅ **Comprehensive reporting** and analytics  
✅ **Easy-to-use CLI** for all operations  
✅ **Programmable API** for custom workflows  

Perfect for managing complex projects with multiple documents, roadmap items, and tasks all working in harmony.

---

**Version**: 1.0.0  
**Status**: PRODUCTION READY  
**Last Updated**: December 11, 2025
