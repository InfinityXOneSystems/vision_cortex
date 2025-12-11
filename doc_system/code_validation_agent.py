"""
Code Validation Agent - Intelligent validation tied to roadmap and todos
Ensures code quality while tracking progress through roadmap items
Version: 1.0.0
"""

import subprocess
import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """Result of a validation check"""
    check_type: str
    file_path: str
    status: str  # 'passed', 'warning', 'error'
    message: str
    line_number: Optional[int] = None
    severity: str = 'info'  # 'info', 'warning', 'error', 'critical'


class CodeValidationAgent:
    """
    Intelligent code validation agent that:
    - Validates code quality (syntax, imports, style, docstrings)
    - Tracks validation against roadmap items
    - Links validation results to todos
    - Provides intelligent commit messages
    - Integrates with git for automatic commits and pushes
    """
    
    def __init__(
        self,
        workspace_root: str = ".",
        index_system=None,
        config: Dict = None
    ):
        """Initialize the validation agent"""
        self.workspace_root = Path(workspace_root)
        self.index_system = index_system
        self.config = config or {}
        
        # Validation configuration
        self.max_line_length = self.config.get('max_line_length', 120)
        self.required_docstring_types = self.config.get('required_docstrings', ['function', 'class'])
        self.skip_patterns = self.config.get('skip_patterns', [
            '__pycache__', '.git', 'node_modules', '.venv', 'venv'
        ])
        
        # Results tracking
        self.validation_results: List[ValidationResult] = []
        self.roadmap_validation_map: Dict[str, List[ValidationResult]] = {}
        self.todo_validation_map: Dict[str, List[ValidationResult]] = {}
    
    def validate_file(self, file_path: str, roadmap_item_id: str = None, todo_id: str = None) -> Tuple[bool, str]:
        """
        Validate a single file with optional roadmap/todo linkage
        
        Args:
            file_path: Path to file to validate
            roadmap_item_id: Optional roadmap item this validates for
            todo_id: Optional todo this validates for
        
        Returns:
            Tuple of (success: bool, message: str)
        """
        try:
            file_path = Path(file_path)
            
            if not file_path.exists():
                return False, f"File not found: {file_path}"
            
            results = []
            
            # Run validation checks based on file type
            if file_path.suffix == '.py':
                results.extend(self._validate_python(file_path))
            elif file_path.suffix in ['.js', '.ts']:
                results.extend(self._validate_javascript(file_path))
            elif file_path.suffix == '.json':
                results.extend(self._validate_json(file_path))
            elif file_path.suffix == '.md':
                results.extend(self._validate_markdown(file_path))
            
            # Track results
            self.validation_results.extend(results)
            
            if roadmap_item_id:
                if roadmap_item_id not in self.roadmap_validation_map:
                    self.roadmap_validation_map[roadmap_item_id] = []
                self.roadmap_validation_map[roadmap_item_id].extend(results)
            
            if todo_id:
                if todo_id not in self.todo_validation_map:
                    self.todo_validation_map[todo_id] = []
                self.todo_validation_map[todo_id].extend(results)
            
            # Check for critical errors
            errors = [r for r in results if r.severity == 'critical']
            
            if errors:
                error_msg = f"Validation failed with {len(errors)} critical error(s):\n"
                for error in errors[:5]:  # Show first 5
                    error_msg += f"  - {error.file_path}:{error.line_number} {error.message}\n"
                return False, error_msg
            
            return True, f"File validated: {len(results)} issues found"
        
        except Exception as e:
            return False, f"Error validating file: {str(e)}"
    
    def _validate_python(self, file_path: Path) -> List[ValidationResult]:
        """Validate Python file"""
        results = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
            
            # 1. Syntax validation
            try:
                compile(content, str(file_path), 'exec')
            except SyntaxError as e:
                results.append(ValidationResult(
                    check_type='syntax',
                    file_path=str(file_path),
                    status='error',
                    message=f"Syntax error: {e.msg}",
                    line_number=e.lineno,
                    severity='critical'
                ))
            
            # 2. Import validation
            import_pattern = r'^(?:from|import)\s+[\w\.]+'
            for i, line in enumerate(lines, 1):
                if re.match(import_pattern, line.strip()):
                    # Check if import is used (simple heuristic)
                    import_name = line.split()[1].split('.')[0]
                    if import_name not in content and import_name not in ['*']:
                        results.append(ValidationResult(
                            check_type='imports',
                            file_path=str(file_path),
                            status='warning',
                            message=f"Unused import: {import_name}",
                            line_number=i,
                            severity='warning'
                        ))
            
            # 3. Line length validation
            for i, line in enumerate(lines, 1):
                if len(line) > self.max_line_length:
                    results.append(ValidationResult(
                        check_type='style',
                        file_path=str(file_path),
                        status='warning',
                        message=f"Line too long: {len(line)} chars (max {self.max_line_length})",
                        line_number=i,
                        severity='warning'
                    ))
            
            # 4. Docstring validation
            class_pattern = r'^\s*class\s+(\w+)'
            func_pattern = r'^\s*def\s+(\w+)'
            
            for i, line in enumerate(lines, 1):
                if re.match(class_pattern, line):
                    # Check if next non-empty line is a docstring
                    next_idx = i
                    while next_idx < len(lines) and not lines[next_idx].strip():
                        next_idx += 1
                    
                    if next_idx < len(lines) and '"""' not in lines[next_idx] and "'''" not in lines[next_idx]:
                        results.append(ValidationResult(
                            check_type='docstring',
                            file_path=str(file_path),
                            status='warning',
                            message="Missing class docstring",
                            line_number=i,
                            severity='warning'
                        ))
                
                elif re.match(func_pattern, line) and not line.strip().startswith('_'):
                    next_idx = i
                    while next_idx < len(lines) and not lines[next_idx].strip():
                        next_idx += 1
                    
                    if next_idx < len(lines) and '"""' not in lines[next_idx] and "'''" not in lines[next_idx]:
                        results.append(ValidationResult(
                            check_type='docstring',
                            file_path=str(file_path),
                            status='warning',
                            message="Missing function docstring",
                            line_number=i,
                            severity='warning'
                        ))
        
        except Exception as e:
            results.append(ValidationResult(
                check_type='general',
                file_path=str(file_path),
                status='error',
                message=f"Error reading file: {str(e)}",
                severity='error'
            ))
        
        return results
    
    def _validate_javascript(self, file_path: Path) -> List[ValidationResult]:
        """Validate JavaScript/TypeScript file"""
        results = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
            
            # 1. Check for console.log in non-test files
            if 'test' not in str(file_path).lower() and '.spec.' not in str(file_path):
                for i, line in enumerate(lines, 1):
                    if 'console.log' in line and not line.strip().startswith('//'):
                        results.append(ValidationResult(
                            check_type='code_quality',
                            file_path=str(file_path),
                            status='warning',
                            message="Remove console.log in production code",
                            line_number=i,
                            severity='warning'
                        ))
            
            # 2. Line length validation
            for i, line in enumerate(lines, 1):
                if len(line) > self.max_line_length:
                    results.append(ValidationResult(
                        check_type='style',
                        file_path=str(file_path),
                        status='warning',
                        message=f"Line too long: {len(line)} chars",
                        line_number=i,
                        severity='warning'
                    ))
            
            # 3. Check for missing error handling
            for i, line in enumerate(lines, 1):
                if '.then(' in line or '.catch(' not in '\n'.join(lines[i:min(i+3, len(lines))]):
                    if '.catch' not in '\n'.join(lines[max(0, i-1):min(i+3, len(lines))]):
                        results.append(ValidationResult(
                            check_type='code_quality',
                            file_path=str(file_path),
                            status='warning',
                            message="Promise missing catch block",
                            line_number=i,
                            severity='warning'
                        ))
        
        except Exception as e:
            results.append(ValidationResult(
                check_type='general',
                file_path=str(file_path),
                status='error',
                message=f"Error reading file: {str(e)}",
                severity='error'
            ))
        
        return results
    
    def _validate_json(self, file_path: Path) -> List[ValidationResult]:
        """Validate JSON file"""
        results = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                json.load(f)
        except json.JSONDecodeError as e:
            results.append(ValidationResult(
                check_type='syntax',
                file_path=str(file_path),
                status='error',
                message=f"Invalid JSON: {str(e)}",
                line_number=e.lineno,
                severity='critical'
            ))
        except Exception as e:
            results.append(ValidationResult(
                check_type='general',
                file_path=str(file_path),
                status='error',
                message=f"Error reading file: {str(e)}",
                severity='error'
            ))
        
        return results
    
    def _validate_markdown(self, file_path: Path) -> List[ValidationResult]:
        """Validate Markdown file"""
        results = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            # Check for broken links
            link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
            for i, line in enumerate(lines, 1):
                for match in re.finditer(link_pattern, line):
                    url = match.group(2)
                    if url.startswith('#'):
                        continue  # Skip anchors
                    
                    if url.startswith('/') or url.startswith('./'):
                        # Local file link
                        target = Path(file_path.parent) / url.lstrip('./')
                        if not target.exists() and not url.endswith('/'):
                            results.append(ValidationResult(
                                check_type='links',
                                file_path=str(file_path),
                                status='warning',
                                message=f"Broken link: {url}",
                                line_number=i,
                                severity='warning'
                            ))
        
        except Exception as e:
            results.append(ValidationResult(
                check_type='general',
                file_path=str(file_path),
                status='error',
                message=f"Error reading file: {str(e)}",
                severity='error'
            ))
        
        return results
    
    def validate_directory(
        self,
        directory: str = ".",
        recursive: bool = True,
        roadmap_item_id: str = None,
        todo_id: str = None
    ) -> Tuple[int, int]:
        """
        Validate all files in a directory
        
        Returns:
            Tuple of (files_validated: int, issues_found: int)
        """
        dir_path = Path(directory)
        validated = 0
        issues = 0
        
        if recursive:
            file_patterns = ['**/*.py', '**/*.js', '**/*.ts', '**/*.json', '**/*.md']
        else:
            file_patterns = ['*.py', '*.js', '*.ts', '*.json', '*.md']
        
        for pattern in file_patterns:
            for file_path in dir_path.glob(pattern):
                # Skip excluded patterns
                if any(skip in str(file_path) for skip in self.skip_patterns):
                    continue
                
                success, message = self.validate_file(str(file_path), roadmap_item_id, todo_id)
                validated += 1
                issues += len([r for r in self.validation_results if r.file_path == str(file_path)])
        
        return validated, issues
    
    def generate_commit_message(self, roadmap_item_id: str = None, todo_id: str = None) -> str:
        """
        Generate intelligent commit message based on validation results
        """
        message_parts = []
        
        # Get relevant validation results
        results = []
        if roadmap_item_id and roadmap_item_id in self.roadmap_validation_map:
            results.extend(self.roadmap_validation_map[roadmap_item_id])
        if todo_id and todo_id in self.todo_validation_map:
            results.extend(self.todo_validation_map[todo_id])
        
        if not results:
            results = self.validation_results[-10:] if self.validation_results else []
        
        # Count issues by type
        issue_counts = {}
        for result in results:
            issue_type = result.check_type
            issue_counts[issue_type] = issue_counts.get(issue_type, 0) + 1
        
        # Build message
        if not issue_counts:
            message_parts.append("✅ Code validation passed")
        else:
            message_parts.append("🔍 Code quality improvements")
            
            for issue_type, count in sorted(issue_counts.items()):
                if issue_type == 'syntax':
                    message_parts.append(f"fix: {count} syntax issue(s)")
                elif issue_type == 'style':
                    message_parts.append(f"style: {count} style issue(s)")
                elif issue_type == 'docstring':
                    message_parts.append(f"docs: {count} missing docstring(s)")
                elif issue_type == 'imports':
                    message_parts.append(f"refactor: {count} import(s)")
                else:
                    message_parts.append(f"chore: {count} {issue_type} issue(s)")
        
        # Add roadmap reference
        if roadmap_item_id:
            message_parts.append(f"Roadmap: {roadmap_item_id}")
        
        # Add todo reference
        if todo_id:
            message_parts.append(f"Todo: {todo_id}")
        
        return "\n".join(message_parts)
    
    def git_stage_changes(self, file_paths: List[str] = None) -> Tuple[bool, str]:
        """Stage changes in git"""
        try:
            if file_paths:
                for file_path in file_paths:
                    subprocess.run(['git', 'add', file_path], check=True, cwd=self.workspace_root)
            else:
                subprocess.run(['git', 'add', '-A'], check=True, cwd=self.workspace_root)
            
            return True, "Changes staged"
        except subprocess.CalledProcessError as e:
            return False, f"Git stage failed: {str(e)}"
    
    def git_commit(self, message: str) -> Tuple[bool, str]:
        """Create a git commit"""
        try:
            subprocess.run(
                ['git', 'commit', '-m', message],
                check=True,
                cwd=self.workspace_root,
                capture_output=True
            )
            return True, f"Commit created: {message}"
        except subprocess.CalledProcessError as e:
            return False, f"Git commit failed: {str(e)}"
    
    def git_push(self, branch: str = 'main', delay_seconds: int = 2) -> Tuple[bool, str]:
        """Push changes to remote"""
        try:
            import time
            time.sleep(delay_seconds)
            
            subprocess.run(
                ['git', 'push', 'origin', branch],
                check=True,
                cwd=self.workspace_root,
                capture_output=True
            )
            return True, f"Changes pushed to {branch}"
        except subprocess.CalledProcessError as e:
            return False, f"Git push failed: {str(e)}"
    
    def validate_and_commit(
        self,
        file_paths: List[str] = None,
        roadmap_item_id: str = None,
        todo_id: str = None,
        auto_push: bool = False
    ) -> Tuple[bool, str]:
        """
        Complete workflow: validate, stage, commit, optionally push
        """
        # Validate
        if file_paths:
            for file_path in file_paths:
                success, msg = self.validate_file(file_path, roadmap_item_id, todo_id)
                if not success:
                    return False, f"Validation failed: {msg}"
        
        # Stage
        success, msg = self.git_stage_changes(file_paths)
        if not success:
            return False, msg
        
        # Generate message
        commit_msg = self.generate_commit_message(roadmap_item_id, todo_id)
        
        # Commit
        success, msg = self.git_commit(commit_msg)
        if not success:
            return False, msg
        
        # Push if requested
        if auto_push:
            success, msg = self.git_push()
            if not success:
                return False, msg
        
        return True, "Validation and commit completed successfully"
    
    def get_validation_report(self) -> Dict:
        """Generate comprehensive validation report"""
        total = len(self.validation_results)
        critical = len([r for r in self.validation_results if r.severity == 'critical'])
        errors = len([r for r in self.validation_results if r.severity == 'error'])
        warnings = len([r for r in self.validation_results if r.severity == 'warning'])
        
        by_type = {}
        by_file = {}
        
        for result in self.validation_results:
            # By type
            if result.check_type not in by_type:
                by_type[result.check_type] = 0
            by_type[result.check_type] += 1
            
            # By file
            if result.file_path not in by_file:
                by_file[result.file_path] = []
            by_file[result.file_path].append(result)
        
        return {
            'total_issues': total,
            'critical': critical,
            'errors': errors,
            'warnings': warnings,
            'by_type': by_type,
            'by_file': by_file,
            'timestamp': datetime.now().isoformat()
        }
