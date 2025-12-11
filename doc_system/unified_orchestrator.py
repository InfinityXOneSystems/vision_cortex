"""
Unified System Orchestrator - Integrates documents, roadmap, todos, and code validation
Provides a single interface for managing the entire Vision Cortex system
Version: 1.0.0
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from doc_index import DocIndexSystem
from code_validation_agent import CodeValidationAgent


class UnifiedOrchestrator:
    """
    Central orchestrator for Vision Cortex system:
    - Document indexing and management
    - Roadmap tracking and progress
    - Interactive todo management
    - Code validation with automatic commits
    - Complete cross-referencing
    """
    
    def __init__(self, workspace_root: str = "."):
        """Initialize the unified orchestrator"""
        self.workspace_root = Path(workspace_root)
        self.data_dir = self.workspace_root / "doc_system" / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize subsystems
        self.index = DocIndexSystem(str(self.workspace_root / "doc_system" / "data"))
        self.validator = CodeValidationAgent(
            workspace_root=str(self.workspace_root),
            index_system=self.index,
            config={
                'max_line_length': 120,
                'required_docstrings': ['function', 'class'],
                'skip_patterns': ['__pycache__', '.git', 'node_modules', '.venv']
            }
        )
        
        # Session tracking
        self.session_start = datetime.now()
        self.operations_log: List[Dict] = []
    
    # ==================== DOCUMENT OPERATIONS ====================
    
    def index_document(
        self,
        doc_id: str,
        name: str,
        path: str,
        content: str,
        doc_type: str = "markdown",
        description: str = "",
        tags: List[str] = None,
        status: str = "active"
    ) -> Tuple[bool, str]:
        """Index a document and log the operation"""
        success, message = self.index.index_document(
            doc_id, name, path, content, doc_type, description, tags, status
        )
        self._log_operation("index_document", {"doc_id": doc_id, "success": success})
        return success, message
    
    def search_documents(
        self,
        query: str,
        tag_filter: Optional[str] = None,
        doc_type_filter: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> List[Dict]:
        """Search documents across the system"""
        results = self.index.search_documents(query, tag_filter, doc_type_filter, status_filter)
        self._log_operation("search_documents", {"query": query, "results": len(results)})
        return results
    
    def link_documents(self, doc_id_1: str, doc_id_2: str, relationship: str = "related") -> Tuple[bool, str]:
        """Create a link between two documents"""
        success, message = self.index.link_documents(doc_id_1, doc_id_2, relationship)
        self._log_operation("link_documents", {"doc1": doc_id_1, "doc2": doc_id_2})
        return success, message
    
    # ==================== ROADMAP OPERATIONS ====================
    
    def create_roadmap_item(
        self,
        item_id: str,
        section: str,
        title: str,
        description: str,
        priority: int = 2,
        estimated_effort: float = 0.0,
        dependencies: List[str] = None
    ) -> Tuple[bool, str]:
        """Create a roadmap item"""
        success, message = self.index.create_roadmap_item(
            item_id, section, title, description, priority, estimated_effort, dependencies
        )
        self._log_operation("create_roadmap_item", {"item_id": item_id})
        return success, message
    
    def update_roadmap_item(
        self,
        item_id: str,
        status: Optional[str] = None,
        actual_effort: Optional[float] = None
    ) -> Tuple[bool, str]:
        """Update a roadmap item"""
        try:
            if item_id not in self.index.roadmap:
                return False, f"Roadmap item {item_id} not found"
            
            item = self.index.roadmap[item_id]
            
            if status:
                item['status'] = status
                if status == 'completed':
                    item['completed_at'] = datetime.now().isoformat()
            
            if actual_effort is not None:
                item['actual_effort'] = actual_effort
            
            item['updated_at'] = datetime.now().isoformat()
            
            self.index._save_json(self.index.roadmap_index_path, self.index.roadmap)
            self._log_operation("update_roadmap_item", {"item_id": item_id, "status": status})
            
            return True, "Roadmap item updated"
        
        except Exception as e:
            return False, f"Error updating roadmap item: {str(e)}"
    
    def link_document_to_roadmap(self, doc_id: str, roadmap_item_id: str) -> Tuple[bool, str]:
        """Link a document to a roadmap item"""
        success, message = self.index.link_document_to_roadmap(doc_id, roadmap_item_id)
        self._log_operation("link_document_to_roadmap", {"doc_id": doc_id, "roadmap_id": roadmap_item_id})
        return success, message
    
    def get_roadmap_progress(self) -> Dict:
        """Get complete roadmap progress"""
        progress = self.index.get_roadmap_progress()
        self._log_operation("get_roadmap_progress", {"completion": progress['completion_percent']})
        return progress
    
    # ==================== TODO OPERATIONS ====================
    
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
        linked_roadmap_items: List[str] = None
    ) -> Tuple[bool, str]:
        """Create a new todo item"""
        success, message = self.index.create_todo(
            todo_id, title, description, priority, assigned_to, due_date,
            estimated_hours, tags, linked_roadmap_items
        )
        self._log_operation("create_todo", {"todo_id": todo_id, "priority": priority})
        return success, message
    
    def update_todo(
        self,
        todo_id: str,
        status: Optional[str] = None,
        progress_percent: Optional[int] = None,
        actual_hours: Optional[float] = None,
        notes: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Update a todo item"""
        success, message = self.index.update_todo(
            todo_id, status, progress_percent, actual_hours, notes
        )
        self._log_operation("update_todo", {"todo_id": todo_id, "status": status})
        return success, message
    
    def link_document_to_todo(self, doc_id: str, todo_id: str) -> Tuple[bool, str]:
        """Link a document to a todo item"""
        success, message = self.index.link_document_to_todo(doc_id, todo_id)
        self._log_operation("link_document_to_todo", {"doc_id": doc_id, "todo_id": todo_id})
        return success, message
    
    def get_todo_progress(self) -> Dict:
        """Get complete todo progress"""
        progress = self.index.get_todo_progress()
        self._log_operation("get_todo_progress", {"completion": progress['completion_percent']})
        return progress
    
    def get_todos_by_status(self, status: str) -> List[Dict]:
        """Get all todos with a specific status"""
        todos = [t for t in self.index.todos.values() if t.get('status') == status]
        return todos
    
    def get_todos_by_roadmap_item(self, roadmap_item_id: str) -> List[Dict]:
        """Get all todos linked to a roadmap item"""
        todos = []
        for todo in self.index.todos.values():
            if roadmap_item_id in todo.get('linked_roadmap_items', []):
                todos.append(todo)
        return todos
    
    # ==================== VALIDATION OPERATIONS ====================
    
    def validate_file(
        self,
        file_path: str,
        roadmap_item_id: str = None,
        todo_id: str = None
    ) -> Tuple[bool, str]:
        """Validate a file with optional roadmap/todo linkage"""
        success, message = self.validator.validate_file(file_path, roadmap_item_id, todo_id)
        self._log_operation("validate_file", {"file": file_path, "success": success})
        return success, message
    
    def validate_directory(
        self,
        directory: str = ".",
        recursive: bool = True,
        roadmap_item_id: str = None,
        todo_id: str = None
    ) -> Tuple[int, int]:
        """Validate all files in a directory"""
        validated, issues = self.validator.validate_directory(
            directory, recursive, roadmap_item_id, todo_id
        )
        self._log_operation("validate_directory", {"directory": directory, "files": validated, "issues": issues})
        return validated, issues
    
    def validate_and_commit(
        self,
        file_paths: List[str] = None,
        roadmap_item_id: str = None,
        todo_id: str = None,
        auto_push: bool = False
    ) -> Tuple[bool, str]:
        """Validate files and commit changes"""
        success, message = self.validator.validate_and_commit(
            file_paths, roadmap_item_id, todo_id, auto_push
        )
        self._log_operation("validate_and_commit", {"roadmap_id": roadmap_item_id, "todo_id": todo_id})
        return success, message
    
    def get_validation_report(self) -> Dict:
        """Get code validation report"""
        report = self.validator.get_validation_report()
        self._log_operation("get_validation_report", {"total_issues": report['total_issues']})
        return report
    
    # ==================== CROSS-SYSTEM OPERATIONS ====================
    
    def create_roadmap_work_item(
        self,
        roadmap_item_id: str,
        section: str,
        title: str,
        description: str,
        todo_id: str,
        doc_id: str,
        priority: int = 2,
        estimated_hours: float = 0.0
    ) -> Tuple[bool, str]:
        """
        Create a complete work item with roadmap, todo, and document all linked
        """
        try:
            # Create roadmap item
            success, msg = self.create_roadmap_item(
                roadmap_item_id, section, title, description, priority, estimated_hours
            )
            if not success:
                return False, f"Failed to create roadmap item: {msg}"
            
            # Create todo
            success, msg = self.create_todo(
                todo_id, title, description, priority, estimated_hours=estimated_hours,
                linked_roadmap_items=[roadmap_item_id]
            )
            if not success:
                return False, f"Failed to create todo: {msg}"
            
            # Link document to roadmap
            if doc_id:
                success, msg = self.link_document_to_roadmap(doc_id, roadmap_item_id)
                if not success:
                    return False, f"Failed to link document to roadmap: {msg}"
                
                # Link document to todo
                success, msg = self.link_document_to_todo(doc_id, todo_id)
                if not success:
                    return False, f"Failed to link document to todo: {msg}"
            
            return True, f"Work item '{title}' created with all linkages"
        
        except Exception as e:
            return False, f"Error creating work item: {str(e)}"
    
    def complete_work_item(
        self,
        roadmap_item_id: str,
        todo_id: str,
        actual_hours: float,
        file_paths: List[str] = None,
        validate_before_complete: bool = True,
        auto_push: bool = False
    ) -> Tuple[bool, str]:
        """
        Complete a work item with validation and commit
        """
        try:
            # Validate and commit if files provided
            if validate_before_complete and file_paths:
                success, msg = self.validate_and_commit(
                    file_paths, roadmap_item_id, todo_id, auto_push
                )
                if not success:
                    return False, f"Validation failed: {msg}"
            
            # Update roadmap item
            success, msg = self.update_roadmap_item(roadmap_item_id, "completed", actual_hours)
            if not success:
                return False, f"Failed to update roadmap item: {msg}"
            
            # Update todo
            success, msg = self.update_todo(todo_id, "completed", 100, actual_hours)
            if not success:
                return False, f"Failed to update todo: {msg}"
            
            return True, f"Work item completed: {actual_hours} hours spent"
        
        except Exception as e:
            return False, f"Error completing work item: {str(e)}"
    
    def get_work_item_status(self, roadmap_item_id: str, todo_id: str) -> Dict:
        """Get complete status of a work item"""
        try:
            roadmap_item = self.index.roadmap.get(roadmap_item_id, {})
            todo = self.index.todos.get(todo_id, {})
            
            return {
                'roadmap_item': roadmap_item,
                'todo': todo,
                'linked_documents': list(set(
                    roadmap_item.get('linked_docs', []) +
                    todo.get('linked_documents', [])
                )),
                'status': 'aligned' if roadmap_item.get('status') == todo.get('status') else 'misaligned',
                'progress': {
                    'roadmap_status': roadmap_item.get('status'),
                    'todo_status': todo.get('status'),
                    'roadmap_effort_estimate': roadmap_item.get('estimated_effort'),
                    'roadmap_effort_actual': roadmap_item.get('actual_effort'),
                    'todo_estimate': todo.get('estimated_hours'),
                    'todo_actual': todo.get('actual_hours'),
                    'todo_progress': todo.get('progress_percent', 0)
                }
            }
        
        except Exception as e:
            return {'error': str(e)}
    
    # ==================== REPORTING ====================
    
    def generate_system_report(self) -> Dict:
        """Generate comprehensive system report"""
        return {
            'timestamp': datetime.now().isoformat(),
            'session_duration': (datetime.now() - self.session_start).total_seconds(),
            'operations_count': len(self.operations_log),
            'index_status': self.index.get_system_status(),
            'roadmap_progress': self.get_roadmap_progress(),
            'todo_progress': self.get_todo_progress(),
            'validation_report': self.get_validation_report(),
            'operations_log': self.operations_log[-20:]  # Last 20 operations
        }
    
    def export_complete_report(self, filepath: str) -> Tuple[bool, str]:
        """Export complete system report to markdown"""
        try:
            report = self.generate_system_report()
            
            markdown = f"""# Vision Cortex - Complete System Report

**Generated**: {datetime.now().isoformat()}
**Session Duration**: {report['session_duration']:.1f} seconds
**Operations**: {report['operations_count']}

## Roadmap Progress
- **Total Items**: {report['roadmap_progress']['total_items']}
- **Completed**: {report['roadmap_progress']['completed']}
- **In Progress**: {report['roadmap_progress']['in_progress']}
- **Completion**: {report['roadmap_progress']['completion_percent']:.1f}%

## Todo Progress
- **Total Todos**: {report['todo_progress']['total_todos']}
- **Completed**: {report['todo_progress']['completed']}
- **In Progress**: {report['todo_progress']['in_progress']}
- **Completion**: {report['todo_progress']['completion_percent']:.1f}%

## Code Validation
- **Total Issues**: {report['validation_report']['total_issues']}
- **Critical**: {report['validation_report']['critical']}
- **Errors**: {report['validation_report']['errors']}
- **Warnings**: {report['validation_report']['warnings']}

## System Status

{json.dumps(report['index_status'], indent=2)}
"""
            
            with open(filepath, 'w') as f:
                f.write(markdown)
            
            return True, f"Report exported to {filepath}"
        
        except Exception as e:
            return False, f"Error exporting report: {str(e)}"
    
    # ==================== INTERNAL ====================
    
    def _log_operation(self, operation: str, details: Dict):
        """Log an operation"""
        self.operations_log.append({
            'timestamp': datetime.now().isoformat(),
            'operation': operation,
            'details': details
        })
    
    def health_check(self) -> Dict:
        """Check system health"""
        return {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'components': {
                'documents': len(self.index.documents),
                'roadmap_items': len(self.index.roadmap),
                'todos': len(self.index.todos),
                'validation_results': len(self.validator.validation_results)
            }
        }
