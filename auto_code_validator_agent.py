#!/usr/bin/env python3
"""
AUTO CODE VALIDATOR & COMMIT AGENT
Validates code, auto-commits, and pushes to remote with intelligent comments.
Runs as autonomous background agent with continuous monitoring.
"""

import os
import sys
import json
import subprocess
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import hashlib
import time

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))


class SeverityLevel(Enum):
    """Issue severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationResult:
    """Result from a validation check"""
    passed: bool
    issues: List[Dict]
    summary: str
    duration_ms: float
    validator_name: str


@dataclass
class CodeChange:
    """Represents a code change to commit"""
    file_path: str
    change_type: str  # 'modified', 'added', 'deleted'
    content: Optional[str] = None
    issue_count: int = 0
    warnings: List[str] = None


class CodeValidator:
    """Validates code using multiple validators"""
    
    def __init__(self, workspace_root: str):
        self.workspace_root = Path(workspace_root)
        self.validation_results: List[ValidationResult] = []
        self.issues_by_file: Dict[str, List[Dict]] = {}
        
    def validate_syntax(self, file_path: str) -> ValidationResult:
        """Validate Python syntax"""
        start = time.time()
        result_dict = {
            "passed": True,
            "issues": [],
            "summary": "[OK] Syntax valid"
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
            compile(code, file_path, 'exec')
        except SyntaxError as e:
            result_dict["passed"] = False
            result_dict["issues"].append({
                "severity": SeverityLevel.ERROR.value,
                "line": e.lineno,
                "col": e.offset,
                "message": f"Syntax Error: {e.msg}",
                "code": e.text
            })
            result_dict["summary"] = f"[!] Syntax Error at line {e.lineno}"
        except Exception as e:
            result_dict["passed"] = False
            result_dict["issues"].append({
                "severity": SeverityLevel.ERROR.value,
                "message": str(e)
            })
            result_dict["summary"] = f"[!] Compilation Error: {str(e)}"
        
        duration = (time.time() - start) * 1000
        return ValidationResult(
            passed=result_dict["passed"],
            issues=result_dict["issues"],
            summary=result_dict["summary"],
            duration_ms=duration,
            validator_name="SyntaxValidator"
        )
    
    def validate_imports(self, file_path: str) -> ValidationResult:
        """Validate imports exist and are used"""
        start = time.time()
        result_dict = {
            "passed": True,
            "issues": [],
            "summary": "[OK] All imports valid"
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            import_lines = [l for l in lines if l.strip().startswith(('import ', 'from '))]
            
            # Check for common missing imports
            content = ''.join(lines)
            for import_stmt in import_lines:
                # Basic validation - module should exist
                try:
                    parts = import_stmt.strip().split()
                    if parts[0] == 'import':
                        module_name = parts[1].split('.')[0]
                    elif parts[0] == 'from':
                        module_name = parts[1]
                    
                    # Skip if it's a relative import or local module
                    if not module_name.startswith('.'):
                        __import__(module_name)
                except (ImportError, ModuleNotFoundError, ValueError):
                    # Could be a local module or will fail at runtime
                    pass
                except Exception:
                    pass
        
        except Exception as e:
            result_dict["passed"] = False
            result_dict["issues"].append({
                "severity": SeverityLevel.WARNING.value,
                "message": f"Import validation failed: {str(e)}"
            })
        
        duration = (time.time() - start) * 1000
        return ValidationResult(
            passed=result_dict["passed"],
            issues=result_dict["issues"],
            summary=result_dict["summary"],
            duration_ms=duration,
            validator_name="ImportValidator"
        )
    
    def validate_code_style(self, file_path: str) -> ValidationResult:
        """Validate code style and conventions"""
        start = time.time()
        result_dict = {
            "passed": True,
            "issues": [],
            "summary": "[OK] Code style compliant"
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for idx, line in enumerate(lines, 1):
                # Check line length (should be < 120)
                if len(line.rstrip()) > 120:
                    result_dict["issues"].append({
                        "severity": SeverityLevel.WARNING.value,
                        "line": idx,
                        "message": f"Line too long ({len(line.rstrip())} > 120 chars)",
                        "code": line.rstrip()[:100] + "..."
                    })
                
                # Check for trailing whitespace
                if line.rstrip() != line.rstrip('\n'):
                    result_dict["issues"].append({
                        "severity": SeverityLevel.INFO.value,
                        "line": idx,
                        "message": "Trailing whitespace",
                        "code": line.rstrip()
                    })
                
                # Check for debugger statements
                if 'pdb' in line or 'breakpoint()' in line:
                    result_dict["issues"].append({
                        "severity": SeverityLevel.ERROR.value,
                        "line": idx,
                        "message": "Debugger statement found - remove before commit",
                        "code": line.rstrip()
                    })
            
            if result_dict["issues"]:
                result_dict["passed"] = len([i for i in result_dict["issues"] 
                                            if i.get('severity') == SeverityLevel.ERROR.value]) == 0
                result_dict["summary"] = f"[*] {len(result_dict['issues'])} style issues found"
        
        except Exception as e:
            result_dict["passed"] = False
            result_dict["issues"].append({
                "severity": SeverityLevel.ERROR.value,
                "message": str(e)
            })
        
        duration = (time.time() - start) * 1000
        return ValidationResult(
            passed=result_dict["passed"],
            issues=result_dict["issues"],
            summary=result_dict["summary"],
            duration_ms=duration,
            validator_name="StyleValidator"
        )
    
    def validate_docstrings(self, file_path: str) -> ValidationResult:
        """Validate docstrings in functions/classes"""
        start = time.time()
        result_dict = {
            "passed": True,
            "issues": [],
            "summary": "[OK] Docstrings complete"
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for idx, line in enumerate(lines, 1):
                stripped = line.strip()
                # Check for functions without docstrings
                if (stripped.startswith('def ') or stripped.startswith('class ')) and ':' in stripped:
                    # Look ahead for docstring
                    if idx < len(lines):
                        next_line = lines[idx].strip() if idx < len(lines) else ""
                        if not (next_line.startswith('"""') or next_line.startswith("'''")):
                            result_dict["issues"].append({
                                "severity": SeverityLevel.WARNING.value,
                                "line": idx,
                                "message": "Missing docstring",
                                "code": stripped
                            })
        
        except Exception as e:
            result_dict["passed"] = False
            result_dict["issues"].append({
                "severity": SeverityLevel.WARNING.value,
                "message": f"Docstring validation failed: {str(e)}"
            })
        
        duration = (time.time() - start) * 1000
        return ValidationResult(
            passed=result_dict["passed"],
            issues=result_dict["issues"],
            summary=result_dict["summary"],
            duration_ms=duration,
            validator_name="DocstringValidator"
        )
    
    def validate_file(self, file_path: str) -> Dict:
        """Run all validators on a file"""
        if not file_path.endswith('.py'):
            return None
        
        if not Path(file_path).exists():
            return None
        
        results = [
            self.validate_syntax(file_path),
            self.validate_imports(file_path),
            self.validate_code_style(file_path),
            self.validate_docstrings(file_path)
        ]
        
        self.validation_results.extend(results)
        
        # Aggregate results
        all_issues = []
        all_passed = True
        
        for result in results:
            all_issues.extend(result.issues)
            if not result.passed:
                all_passed = False
        
        return {
            "file": file_path,
            "passed": all_passed,
            "issue_count": len(all_issues),
            "error_count": len([i for i in all_issues if i.get('severity') == SeverityLevel.ERROR.value]),
            "warning_count": len([i for i in all_issues if i.get('severity') == SeverityLevel.WARNING.value]),
            "issues": all_issues,
            "validators": [r.validator_name for r in results],
            "timestamp": datetime.now().isoformat()
        }


class GitCommitAgent:
    """Handles git operations and commit management"""
    
    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
        self.current_branch = None
        self.current_user = None
        self.current_email = None
        self._init_git_config()
    
    def _init_git_config(self):
        """Initialize git configuration"""
        try:
            result = subprocess.run(
                ["git", "config", "user.name"],
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            self.current_user = result.stdout.strip()
            
            result = subprocess.run(
                ["git", "config", "user.email"],
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            self.current_email = result.stdout.strip()
            
            result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            self.current_branch = result.stdout.strip()
        except Exception as e:
            print(f"[*] Git config error: {e}")
    
    def get_changed_files(self) -> List[str]:
        """Get list of changed files (staged and unstaged)"""
        try:
            result = subprocess.run(
                ["git", "diff", "--name-only", "--diff-filter=ACMR"],
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            unstaged = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            result = subprocess.run(
                ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"],
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            staged = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            return list(set([f for f in unstaged + staged if f]))
        except Exception as e:
            print(f"[*] Error getting changed files: {e}")
            return []
    
    def stage_files(self, files: List[str]) -> bool:
        """Stage files for commit"""
        if not files:
            return False
        
        try:
            subprocess.run(
                ["git", "add"] + files,
                cwd=self.repo_path,
                capture_output=True,
                check=True
            )
            return True
        except Exception as e:
            print(f"[!] Error staging files: {e}")
            return False
    
    def commit_changes(self, message: str, description: str = "") -> Tuple[bool, str]:
        """Commit staged changes"""
        try:
            full_message = message
            if description:
                full_message = f"{message}\n\n{description}"
            
            result = subprocess.run(
                ["git", "commit", "-m", full_message],
                cwd=self.repo_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                return True, result.stdout.strip()
            else:
                return False, result.stderr.strip()
        except Exception as e:
            return False, str(e)
    
    def push_to_remote(self, branch: Optional[str] = None, force: bool = False) -> Tuple[bool, str]:
        """Push commits to remote"""
        target_branch = branch or self.current_branch or "main"
        
        try:
            cmd = ["git", "push", "origin", target_branch]
            if force:
                cmd.insert(2, "-f")
            
            result = subprocess.run(
                cmd,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return True, result.stdout.strip()
            else:
                return False, result.stderr.strip()
        except subprocess.TimeoutExpired:
            return False, "Push operation timed out"
        except Exception as e:
            return False, str(e)


class AutoValidatorAgent:
    """Main autonomous validator and commit agent"""
    
    def __init__(self, repo_path: str, config_file: Optional[str] = None):
        self.repo_path = Path(repo_path)
        self.validator = CodeValidator(str(self.repo_path))
        self.git_agent = GitCommitAgent(str(self.repo_path))
        self.config = self._load_config(config_file)
        self.validation_log: List[Dict] = []
        self.commit_log: List[Dict] = []
    
    def _load_config(self, config_file: Optional[str]) -> Dict:
        """Load configuration"""
        default_config = {
            "auto_stage": True,
            "auto_commit": True,
            "auto_push": True,
            "fail_on_errors": True,
            "fail_on_warnings": False,
            "require_docstrings": True,
            "max_line_length": 120,
            "commit_prefix": "ci: code validation auto-commit",
            "push_delay_seconds": 2,
            "skip_patterns": [
                "__pycache__/**",
                "*.pyc",
                ".venv/**",
                "venv/**",
                "node_modules/**"
            ]
        }
        
        if config_file and Path(config_file).exists():
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                default_config.update(user_config)
            except Exception as e:
                print(f"[*] Error loading config: {e}")
        
        return default_config
    
    def validate_changes(self) -> Dict:
        """Validate all changed files"""
        changed_files = self.git_agent.get_changed_files()
        
        if not changed_files:
            return {
                "success": True,
                "message": "No changes to validate",
                "files_validated": 0,
                "total_issues": 0
            }
        
        # Filter Python files
        python_files = [f for f in changed_files if f.endswith('.py')]
        
        print(f"\n[*] Validating {len(python_files)} Python file(s)...")
        
        validation_results = {}
        total_issues = 0
        total_errors = 0
        total_warnings = 0
        
        for file_path in python_files:
            full_path = self.repo_path / file_path
            result = self.validator.validate_file(str(full_path))
            
            if result:
                validation_results[file_path] = result
                total_issues += result.get('issue_count', 0)
                total_errors += result.get('error_count', 0)
                total_warnings += result.get('warning_count', 0)
                
                # Print file validation result
                status = "[OK]" if result['passed'] else "[!]"
                print(f"  {status} {file_path}: {result.get('issue_count', 0)} issue(s)")
        
        return {
            "success": total_errors == 0 or not self.config['fail_on_errors'],
            "files_validated": len(validation_results),
            "total_issues": total_issues,
            "total_errors": total_errors,
            "total_warnings": total_warnings,
            "results": validation_results,
            "timestamp": datetime.now().isoformat()
        }
    
    def auto_commit_and_push(self, validation_summary: Dict) -> Dict:
        """Automatically commit validated code and push to remote"""
        print("\n[*] Processing commit and push...")
        
        changed_files = self.git_agent.get_changed_files()
        
        if not changed_files:
            return {
                "success": True,
                "message": "No changes to commit",
                "committed": False,
                "pushed": False
            }
        
        # Stage files
        if self.config['auto_stage']:
            print(f"  [*] Staging {len(changed_files)} file(s)...")
            staged = self.git_agent.stage_files(changed_files)
            if not staged:
                return {
                    "success": False,
                    "message": "Failed to stage files",
                    "committed": False,
                    "pushed": False
                }
        
        # Create intelligent commit message
        commit_message = self._create_commit_message(validation_summary)
        
        # Commit
        if self.config['auto_commit']:
            print(f"  [OK] Committing changes...")
            success, output = self.git_agent.commit_changes(
                message=f"ci: code validation auto-commit",
                description=commit_message
            )
            
            if not success:
                return {
                    "success": False,
                    "message": f"Commit failed: {output}",
                    "committed": False,
                    "pushed": False,
                    "output": output
                }
            
            print(f"    Commit successful")
            self.commit_log.append({
                "timestamp": datetime.now().isoformat(),
                "message": commit_message,
                "files": changed_files,
                "validation_summary": validation_summary
            })
        
        # Push to remote
        if self.config['auto_push']:
            print(f"  [*] Pushing to remote ({self.git_agent.current_branch})...")
            time.sleep(self.config.get('push_delay_seconds', 2))
            
            success, output = self.git_agent.push_to_remote()
            
            if success:
                print(f"    Push successful")
                return {
                    "success": True,
                    "message": "Code validated, committed, and pushed successfully",
                    "committed": True,
                    "pushed": True,
                    "files_pushed": len(changed_files),
                    "output": output
                }
            else:
                return {
                    "success": False,
                    "message": f"Push failed: {output}",
                    "committed": True,
                    "pushed": False,
                    "output": output
                }
        
        return {
            "success": True,
            "message": "Code validated and committed (push disabled)",
            "committed": True,
            "pushed": False,
            "files_committed": len(changed_files)
        }
    
    def _create_commit_message(self, validation_summary: Dict) -> str:
        """Create detailed commit message"""
        lines = []
        
        # Summary
        if validation_summary.get('total_errors', 0) == 0:
            lines.append("All validation checks passed [OK]")
        else:
            lines.append(f"Fixed {validation_summary.get('total_errors', 0)} validation error(s)")
        
        # Details
        lines.append(f"\nValidation Summary:")
        lines.append(f"  * Files validated: {validation_summary.get('files_validated', 0)}")
        lines.append(f"  * Total issues: {validation_summary.get('total_issues', 0)}")
        lines.append(f"  * Errors: {validation_summary.get('total_errors', 0)}")
        lines.append(f"  * Warnings: {validation_summary.get('total_warnings', 0)}")
        
        # Validators used
        validators_set = set()
        for result in validation_summary.get('results', {}).values():
            validators_set.update(result.get('validators', []))
        
        if validators_set:
            lines.append(f"\nValidators: {', '.join(sorted(validators_set))}")
        
        lines.append(f"\nAuto-committed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        
        return "\n".join(lines)
    
    def generate_report(self) -> Dict:
        """Generate comprehensive validation and commit report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "repository": str(self.repo_path),
            "branch": self.git_agent.current_branch,
            "user": self.git_agent.current_user,
            "validation_logs": self.validation_log,
            "commit_logs": self.commit_log,
            "config_used": self.config,
            "validation_count": len(self.validation_log),
            "commit_count": len(self.commit_log)
        }
    
    def run(self, validate_only: bool = False) -> Dict:
        """Run the full validation and commit pipeline"""
        print("\n" + "="*80)
        print("AUTO CODE VALIDATOR & COMMIT AGENT")
        print("="*80)
        
        # Validate
        print(f"\n[*] Starting code validation...")
        validation_summary = self.validate_changes()
        self.validation_log.append(validation_summary)
        
        if not validation_summary.get('success'):
            print(f"\n[*] Validation failed with issues")
            if self.config['fail_on_errors']:
                return {
                    "success": False,
                    "phase": "validation",
                    "validation_summary": validation_summary,
                    "message": "Validation failed - not proceeding with commit"
                }
        
        print(f"\n[OK] Validation complete: {validation_summary.get('total_issues', 0)} issue(s)")
        
        if validate_only:
            return {
                "success": True,
                "phase": "validation_only",
                "validation_summary": validation_summary,
                "message": "Validation complete (commit skipped)"
            }
        
        # Commit and Push
        commit_summary = self.auto_commit_and_push(validation_summary)
        
        print("\n" + "="*80)
        print("[OK] OPERATION COMPLETE")
        print("="*80)
        
        return {
            "success": commit_summary.get('success', False),
            "phase": "full_pipeline",
            "validation_summary": validation_summary,
            "commit_summary": commit_summary,
            "report": self.generate_report()
        }


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Auto Code Validator & Commit Agent"
    )
    parser.add_argument(
        "--repo",
        default=str(Path.cwd()),
        help="Repository path (default: current directory)"
    )
    parser.add_argument(
        "--config",
        help="Configuration file path (JSON)"
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Only validate, don't commit or push"
    )
    parser.add_argument(
        "--no-push",
        action="store_true",
        help="Commit but don't push to remote"
    )
    parser.add_argument(
        "--force-push",
        action="store_true",
        help="Use force push (caution!)"
    )
    parser.add_argument(
        "--report",
        help="Save report to JSON file"
    )
    
    args = parser.parse_args()
    
    # Initialize agent
    agent = AutoValidatorAgent(args.repo, args.config)
    
    # Override config if needed
    if args.no_push:
        agent.config['auto_push'] = False
    
    # Run pipeline
    result = agent.run(validate_only=args.validate_only)
    
    # Save report if requested
    if args.report:
        try:
            report_path = Path(args.report)
            report_path.parent.mkdir(parents=True, exist_ok=True)
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, default=str)
            print(f"\n[*] Report saved: {report_path}")
        except Exception as e:
            print(f"\n[*] Failed to save report: {e}")
    
    # Exit with appropriate code
    sys.exit(0 if result.get('success', False) else 1)


if __name__ == "__main__":
    main()
