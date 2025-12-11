# Vision Cortex - Quick Reference Guide

**Complete System at a Glance**  
**Version**: 1.0.0

---

## 🚀 QUICK START

### Install & Run
```bash
cd vision_cortex/doc_system
python vision_cortex_cli.py
```

### First 5 Minutes

1. **Index a Document**
   ```
   Menu → 1 → Enter ID, name, path
   ```

2. **Create Roadmap Item**
   ```
   Menu → 4 → Enter ID, section, title
   ```

3. **Create Todo**
   ```
   Menu → 7 → Enter ID, title, link to roadmap
   ```

4. **View Progress**
   ```
   Menu → 5 & 9 → See completion %
   ```

5. **Validate & Commit**
   ```
   Menu → 13 → Files → auto validates and commits
   ```

---

## 📋 COMMAND QUICK REFERENCE

### Documents (1-3)
| # | Command | Purpose |
|---|---------|---------|
| 1 | Index document | Add document to system |
| 2 | Search documents | Find by content/tags |
| 3 | Link documents | Create relationships |

### Roadmap (4-6)
| # | Command | Purpose |
|---|---------|---------|
| 4 | Create roadmap item | Add A-Z roadmap section |
| 5 | View roadmap progress | See completion metrics |
| 6 | Link doc to roadmap | Connect document |

### Todos (7-10)
| # | Command | Purpose |
|---|---------|---------|
| 7 | Create todo | Add task linked to roadmap |
| 8 | Update todo | Change status/progress |
| 9 | View todo progress | See completion metrics |
| 10 | Get todos by status | Filter by status |

### Validation (11-14)
| # | Command | Purpose |
|---|---------|---------|
| 11 | Validate file | Check single file |
| 12 | Validate directory | Check all files |
| 13 | Validate & commit | Validate + auto-commit |
| 14 | View validation report | See issues |

### Integration (15-17)
| # | Command | Purpose |
|---|---------|---------|
| 15 | Create work item | Roadmap + Todo + Doc |
| 16 | Complete work item | Mark done + commit |
| 17 | Get work item status | See alignment |

### Reports (18-21)
| # | Command | Purpose |
|---|---------|---------|
| 18 | System status | Quick health check |
| 19 | Full system report | Complete JSON report |
| 20 | Export report | Save to markdown |
| 21 | Health check | Component status |

---

## 🐍 PYTHON API QUICK REFERENCE

### Import
```python
from unified_orchestrator import UnifiedOrchestrator
orchestrator = UnifiedOrchestrator(".")
```

### Documents
```python
# Index
success, msg = orchestrator.index_document(
    "doc1", "Name", "path.md", content, 
    doc_type="markdown", description="...", tags=[]
)

# Search
results = orchestrator.search_documents("query", tag_filter="important")

# Link
success, msg = orchestrator.link_documents("doc1", "doc2", "related")
```

### Roadmap
```python
# Create
success, msg = orchestrator.create_roadmap_item(
    "A-1", "A", "Title", "Description",
    priority=2, estimated_effort=8.0
)

# Link document
success, msg = orchestrator.link_document_to_roadmap("doc1", "A-1")

# Progress
progress = orchestrator.get_roadmap_progress()
print(f"Progress: {progress['completion_percent']}%")
```

### Todos
```python
# Create
success, msg = orchestrator.create_todo(
    "todo1", "Title", "Description",
    priority=2, estimated_hours=8.0,
    linked_roadmap_items=["A-1"]
)

# Update
success, msg = orchestrator.update_todo(
    "todo1", status="in-progress",
    progress_percent=50, actual_hours=4.0
)

# Progress
progress = orchestrator.get_todo_progress()
```

### Validation
```python
# Validate file
success, msg = orchestrator.validate_file(
    "src/file.py", 
    roadmap_item_id="A-1",
    todo_id="todo1"
)

# Validate & commit
success, msg = orchestrator.validate_and_commit(
    ["src/file.py"], "A-1", "todo1", auto_push=True
)

# Report
report = orchestrator.get_validation_report()
```

### Integrated Workflows
```python
# Create complete work item
success, msg = orchestrator.create_roadmap_work_item(
    "A-1", "A", "Title", "Description",
    "todo1", "doc1", priority=2, estimated_hours=8.0
)

# Complete work item
success, msg = orchestrator.complete_work_item(
    "A-1", "todo1", actual_hours=7.5,
    file_paths=["src/file.py"], auto_push=True
)

# Status
status = orchestrator.get_work_item_status("A-1", "todo1")
```

### Reports
```python
# System report
report = orchestrator.generate_system_report()

# Export
success, msg = orchestrator.export_complete_report("report.md")

# Health
health = orchestrator.health_check()
```

---

## 📊 DATA STRUCTURES

### Document
```json
{
  "doc_id": "string",
  "name": "string",
  "path": "string",
  "doc_type": "markdown|json|plaintext|code",
  "status": "active|archived|draft|review|deprecated",
  "description": "string",
  "tags": ["string"],
  "related_docs": ["doc_id"],
  "roadmap_items": ["item_id"],
  "todos": ["todo_id"],
  "word_count": "int",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "content_hash": "string",
  "file_size_bytes": "int",
  "keywords": ["string"]
}
```

### Roadmap Item
```json
{
  "item_id": "string",
  "section": "A-Z",
  "title": "string",
  "description": "string",
  "status": "planned|in-progress|completed",
  "linked_docs": ["doc_id"],
  "linked_todos": ["todo_id"],
  "priority": 1-4,
  "estimated_effort": "float",
  "actual_effort": "float",
  "dependencies": ["item_id"],
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "completed_at": "ISO8601|null"
}
```

### Todo
```json
{
  "todo_id": "string",
  "title": "string",
  "description": "string",
  "status": "not-started|in-progress|blocked|in-review|completed",
  "priority": 1-4,
  "assigned_to": "string",
  "linked_documents": ["doc_id"],
  "linked_roadmap_items": ["item_id"],
  "subtasks": ["todo_id"],
  "dependencies": ["todo_id"],
  "due_date": "ISO8601|null",
  "estimated_hours": "float",
  "actual_hours": "float",
  "progress_percent": 0-100,
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "completed_at": "ISO8601|null",
  "tags": ["string"],
  "notes": ["string"]
}
```

---

## ✨ COMMON WORKFLOWS

### Workflow 1: Feature Development
```
1. Create roadmap item
2. Create corresponding todo
3. Index design document
4. Link all three together
5. Work on code
6. Validate and auto-commit
7. Update progress
8. Complete work item with final commit
```

### Workflow 2: Documentation Update
```
1. Search for related documents
2. Update content
3. Re-index document
4. Link to relevant roadmap/todos
5. Validate markdown
6. Auto-commit changes
```

### Workflow 3: Project Planning
```
1. Create multiple roadmap items
2. Index planning documents
3. Create todos for each item
4. Link documents to roadmap/todos
5. Monitor progress in dashboard
6. Export reports
```

### Workflow 4: Code Review
```
1. Validate entire directory
2. Review validation report
3. Fix issues
4. Validate and commit with roadmap reference
5. Update todo progress
6. Check work item alignment
```

---

## 🎯 TIPS & TRICKS

### Tip 1: Bulk Indexing
```python
from pathlib import Path
for file in Path("docs").glob("*.md"):
    with open(file) as f:
        orchestrator.index_document(
            file.stem, file.name, str(file), f.read()
        )
```

### Tip 2: Automated Commits
```python
# Validate, commit, and push in one command
success, msg = orchestrator.validate_and_commit(
    ["src/"], auto_push=True
)
```

### Tip 3: Progress Monitoring
```python
roadmap = orchestrator.get_roadmap_progress()
todos = orchestrator.get_todo_progress()

if roadmap['completion_percent'] >= 50:
    print("Halfway there!")
```

### Tip 4: Search with Tags
```python
# Find all "important" documents
results = orchestrator.search_documents(
    "", tag_filter="important"
)
```

### Tip 5: Work Item Alignment
```python
# Check if roadmap and todo are in sync
status = orchestrator.get_work_item_status("A-1", "todo1")
if status['status'] == 'aligned':
    print("Systems aligned!")
```

---

## 🔍 TROUBLESHOOTING

### Issue: File not found during indexing
```python
# Make sure path is absolute or relative to workspace
from pathlib import Path
path = Path("docs/file.md").resolve()
```

### Issue: Git commit fails
```python
# Check if git is initialized and configured
import subprocess
subprocess.run(['git', 'status'], check=True)
```

### Issue: Validation shows false positives
```python
# Customize validation by extending CodeValidationAgent
# See INDEXING_SYSTEM_DOCUMENTATION.md for examples
```

### Issue: Search returns no results
```python
# Try simpler query or use tag_filter
results = orchestrator.search_documents("simple", tag_filter="tag")
```

---

## 📈 PROGRESSION PATH

### Level 1: Basic Usage (Day 1)
- Index documents
- Create roadmap items
- Create todos
- View progress

### Level 2: Integration (Day 2)
- Link documents to roadmap
- Link documents to todos
- Create complete work items
- Validate files

### Level 3: Automation (Week 1)
- Automated validation
- Auto-commits
- Auto-push
- Batch operations

### Level 4: Advanced (Week 2+)
- Custom validation rules
- Workflow automation
- Performance optimization
- Report customization

---

## 📚 DOCUMENTATION MAP

| Document | Purpose |
|----------|---------|
| **INDEXING_SYSTEM_DOCUMENTATION.md** | Complete detailed guide |
| **This file** | Quick reference |
| **DOC_SYSTEM_README.md** | Document system overview |
| **COMPLETE_ROADMAP_A_TO_Z.md** | Full roadmap reference |

---

## 💡 KEY CONCEPTS

**Document**: Any text file (markdown, code, JSON, plaintext)  
**Roadmap Item**: A-Z organized planning item with effort tracking  
**Todo**: Task item linked to roadmap and documents  
**Work Item**: Complete integration of roadmap + todo + document  
**Validation**: Automated code quality checks  
**Cross-Linking**: Bidirectional relationships between all items  

---

**Status**: PRODUCTION READY ✅  
**Version**: 1.0.0  
**Last Updated**: December 11, 2025
