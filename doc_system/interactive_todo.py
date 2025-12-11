"""
Interactive Todo List System - Integrated with Document System

Supports:
- Interactive todo management
- Document linking
- Priority tracking
- Status management
- Team collaboration
- Automated progress reports
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class TodoStatus(Enum):
    """Todo status"""
    NOT_STARTED = "not-started"
    IN_PROGRESS = "in-progress"
    BLOCKED = "blocked"
    REVIEW = "review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TodoPriority(Enum):
    """Todo priority"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class TodoItem:
    """Todo item"""
    todo_id: str
    title: str
    description: str = ""
    status: str = "not-started"
    priority: int = TodoPriority.MEDIUM.value
    assigned_to: str = ""
    due_date: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""
    completed_at: Optional[str] = None
    tags: List[str] = None
    linked_docs: List[str] = None
    subtasks: List[str] = None
    dependencies: List[str] = None
    estimated_hours: float = 0.0
    actual_hours: float = 0.0
    progress_percent: int = 0
    notes: str = ""
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.linked_docs is None:
            self.linked_docs = []
        if self.subtasks is None:
            self.subtasks = []
        if self.dependencies is None:
            self.dependencies = []
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.updated_at:
            self.updated_at = datetime.now().isoformat()


class InteractiveTodoSystem:
    """Interactive todo list management"""
    
    def __init__(self, todos_dir: str = "todos", doc_system=None):
        """Initialize todo system"""
        self.todos_dir = Path(todos_dir)
        self.todos_dir.mkdir(parents=True, exist_ok=True)
        self.todos_file = self.todos_dir / "todos.json"
        self.doc_system = doc_system  # Reference to doc system for linking
        self.todos: Dict[str, TodoItem] = self._load_todos()
    
    def _load_todos(self) -> Dict[str, TodoItem]:
        """Load todos from file"""
        if self.todos_file.exists():
            try:
                with open(self.todos_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return {
                        k: TodoItem(**v) for k, v in data.items()
                    }
            except Exception as e:
                logger.error(f"Failed to load todos: {e}")
        return {}
    
    def _save_todos(self):
        """Save todos to file"""
        try:
            with open(self.todos_file, 'w', encoding='utf-8') as f:
                json.dump(
                    {k: asdict(v) for k, v in self.todos.items()},
                    f,
                    indent=2
                )
        except Exception as e:
            logger.error(f"Failed to save todos: {e}")
    
    def create_todo(self, title: str, description: str = "",
                   priority: int = 2, assigned_to: str = "",
                   due_date: Optional[str] = None,
                   estimated_hours: float = 0.0,
                   tags: List[str] = None) -> str:
        """
        Create a new todo
        
        Args:
            title: Todo title
            description: Detailed description
            priority: Priority level (1-4)
            assigned_to: Person assigned
            due_date: Due date
            estimated_hours: Estimated time to complete
            tags: Tags for organization
            
        Returns:
            Todo ID
        """
        try:
            todo_id = f"todo_{len(self.todos) + 1}_{int(datetime.now().timestamp())}"
            
            todo = TodoItem(
                todo_id=todo_id,
                title=title,
                description=description,
                status=TodoStatus.NOT_STARTED.value,
                priority=priority,
                assigned_to=assigned_to,
                due_date=due_date,
                estimated_hours=estimated_hours,
                tags=tags or []
            )
            
            self.todos[todo_id] = todo
            self._save_todos()
            
            logger.info(f"Created todo: {todo_id} - {title}")
            return todo_id
            
        except Exception as e:
            logger.error(f"Failed to create todo: {e}")
            return ""
    
    def update_todo(self, todo_id: str, **kwargs) -> bool:
        """
        Update todo
        
        Args:
            todo_id: Todo ID
            **kwargs: Fields to update
            
        Returns:
            Success status
        """
        try:
            if todo_id not in self.todos:
                return False
            
            todo = self.todos[todo_id]
            
            # Update allowed fields
            allowed_fields = {
                'title', 'description', 'status', 'priority', 'assigned_to',
                'due_date', 'progress_percent', 'notes', 'actual_hours'
            }
            
            for key, value in kwargs.items():
                if key in allowed_fields and hasattr(todo, key):
                    setattr(todo, key, value)
            
            todo.updated_at = datetime.now().isoformat()
            
            # Mark completed
            if kwargs.get('status') == TodoStatus.COMPLETED.value:
                todo.completed_at = datetime.now().isoformat()
                todo.progress_percent = 100
            
            self._save_todos()
            logger.info(f"Updated todo: {todo_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update todo: {e}")
            return False
    
    def add_subtask(self, todo_id: str, subtask_id: str) -> bool:
        """Add subtask"""
        try:
            if todo_id not in self.todos:
                return False
            
            if subtask_id not in self.todos:
                return False
            
            if subtask_id not in self.todos[todo_id].subtasks:
                self.todos[todo_id].subtasks.append(subtask_id)
                self._save_todos()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to add subtask: {e}")
            return False
    
    def add_dependency(self, todo_id: str, depends_on: str) -> bool:
        """Add dependency"""
        try:
            if todo_id not in self.todos:
                return False
            
            if depends_on not in self.todos:
                return False
            
            if depends_on not in self.todos[todo_id].dependencies:
                self.todos[todo_id].dependencies.append(depends_on)
                self._save_todos()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to add dependency: {e}")
            return False
    
    def link_document(self, todo_id: str, doc_id: str) -> bool:
        """Link a document to a todo"""
        try:
            if todo_id not in self.todos:
                return False
            
            if doc_id not in self.todos[todo_id].linked_docs:
                self.todos[todo_id].linked_docs.append(doc_id)
                self._save_todos()
            
            logger.info(f"Linked document {doc_id} to todo {todo_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to link document: {e}")
            return False
    
    def get_todo(self, todo_id: str) -> Optional[Dict[str, Any]]:
        """Get todo details"""
        if todo_id in self.todos:
            return asdict(self.todos[todo_id])
        return None
    
    def get_todos_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get todos by status"""
        todos = [
            asdict(t) for t in self.todos.values()
            if t.status == status
        ]
        return sorted(todos, key=lambda x: x['priority'], reverse=True)
    
    def get_todos_by_assignee(self, assignee: str) -> List[Dict[str, Any]]:
        """Get todos by assignee"""
        return [
            asdict(t) for t in self.todos.values()
            if t.assigned_to == assignee
        ]
    
    def get_todos_by_tag(self, tag: str) -> List[Dict[str, Any]]:
        """Get todos by tag"""
        return [
            asdict(t) for t in self.todos.values()
            if tag in t.tags
        ]
    
    def get_todos_by_priority(self, priority: int) -> List[Dict[str, Any]]:
        """Get todos by priority"""
        todos = [
            asdict(t) for t in self.todos.values()
            if t.priority == priority
        ]
        return sorted(todos, key=lambda x: x['due_date'] or '')
    
    def get_overdue_todos(self) -> List[Dict[str, Any]]:
        """Get overdue todos"""
        now = datetime.now().isoformat()
        overdue = [
            asdict(t) for t in self.todos.values()
            if t.due_date and t.due_date < now and t.status != TodoStatus.COMPLETED.value
        ]
        return sorted(overdue, key=lambda x: x['priority'], reverse=True)
    
    def get_in_progress(self) -> List[Dict[str, Any]]:
        """Get in-progress todos"""
        return self.get_todos_by_status(TodoStatus.IN_PROGRESS.value)
    
    def get_blocked(self) -> List[Dict[str, Any]]:
        """Get blocked todos"""
        return self.get_todos_by_status(TodoStatus.BLOCKED.value)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get todo statistics"""
        statuses = {}
        total_estimated = 0.0
        total_actual = 0.0
        
        for todo in self.todos.values():
            status = todo.status
            statuses[status] = statuses.get(status, 0) + 1
            total_estimated += todo.estimated_hours
            total_actual += todo.actual_hours
        
        completed = sum(1 for t in self.todos.values() 
                       if t.status == TodoStatus.COMPLETED.value)
        
        return {
            "total_todos": len(self.todos),
            "by_status": statuses,
            "completed_percent": round(completed / len(self.todos) * 100, 1) if self.todos else 0,
            "total_estimated_hours": round(total_estimated, 2),
            "total_actual_hours": round(total_actual, 2),
            "avg_estimated_hours": round(total_estimated / len(self.todos), 2) if self.todos else 0,
            "high_priority_count": sum(1 for t in self.todos.values() 
                                      if t.priority >= TodoPriority.HIGH.value)
        }
    
    def generate_progress_report(self) -> Dict[str, Any]:
        """Generate comprehensive progress report"""
        stats = self.get_statistics()
        
        return {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total": stats['total_todos'],
                "completed": stats['by_status'].get(TodoStatus.COMPLETED.value, 0),
                "in_progress": stats['by_status'].get(TodoStatus.IN_PROGRESS.value, 0),
                "blocked": stats['by_status'].get(TodoStatus.BLOCKED.value, 0),
                "not_started": stats['by_status'].get(TodoStatus.NOT_STARTED.value, 0)
            },
            "progress": {
                "completion_percent": stats['completed_percent'],
                "estimated_hours": stats['total_estimated_hours'],
                "actual_hours": stats['total_actual_hours']
            },
            "priority": {
                "critical": sum(1 for t in self.todos.values() 
                              if t.priority == TodoPriority.CRITICAL.value),
                "high": sum(1 for t in self.todos.values() 
                           if t.priority == TodoPriority.HIGH.value),
                "medium": sum(1 for t in self.todos.values() 
                             if t.priority == TodoPriority.MEDIUM.value),
                "low": sum(1 for t in self.todos.values() 
                          if t.priority == TodoPriority.LOW.value)
            },
            "overdue": len(self.get_overdue_todos()),
            "high_priority_count": stats['high_priority_count']
        }
    
    def list_todos(self, filter_status: Optional[str] = None,
                  sort_by: str = "priority") -> List[Dict[str, Any]]:
        """List todos with optional filtering"""
        todos = list(self.todos.values())
        
        if filter_status:
            todos = [t for t in todos if t.status == filter_status]
        
        # Sort options
        if sort_by == "priority":
            todos.sort(key=lambda x: x.priority, reverse=True)
        elif sort_by == "due_date":
            todos.sort(key=lambda x: x.due_date or "")
        elif sort_by == "created":
            todos.sort(key=lambda x: x.created_at, reverse=True)
        
        return [asdict(t) for t in todos]
    
    def delete_todo(self, todo_id: str) -> bool:
        """Delete a todo"""
        try:
            if todo_id in self.todos:
                del self.todos[todo_id]
                self._save_todos()
                logger.info(f"Deleted todo: {todo_id}")
                return True
        except Exception as e:
            logger.error(f"Failed to delete todo: {e}")
        return False


if __name__ == "__main__":
    # Example usage
    todos = InteractiveTodoSystem()
    
    # Create todos
    todo1 = todos.create_todo(
        "Implement document system",
        "Build ingest, transform, evolve, create systems",
        priority=TodoPriority.HIGH.value,
        assigned_to="developer",
        estimated_hours=8.0,
        tags=["documentation", "system"]
    )
    
    todo2 = todos.create_todo(
        "Create todo system",
        "Build interactive todo list",
        priority=TodoPriority.HIGH.value,
        estimated_hours=4.0,
        tags=["documentation"]
    )
    
    # Update todo
    todos.update_todo(todo1, status=TodoStatus.IN_PROGRESS.value)
    
    # Add dependency
    todos.add_dependency(todo2, todo1)
    
    # Get stats
    stats = todos.get_statistics()
    print(f"Stats: {json.dumps(stats, indent=2)}")
    
    # Generate report
    report = todos.generate_progress_report()
    print(f"Report: {json.dumps(report, indent=2)}")
