#!/usr/bin/env python3
"""
INFINITY X AI - Auto Folder Check & Auto Folder Correct
Purpose: Verify and auto-repair folder structures across all core repos
Features: Auto-detection, auto-repair, todo list integration, validation, auto-routing
Runs in background, stays in vision_cortex folder, includes intelligent folder router
"""

import json
import logging
import os
import subprocess
import sys
import threading
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ============================================================================
# CONFIGURATION
# ============================================================================


@dataclass
class FolderStructure:
    """Define expected folder structure for each repo"""

    name: str
    required_dirs: List[str]
    required_files: List[str]
    critical: bool = True


# Core repos expected structures
CORE_REPOS_STRUCTURE = {
    "vision_cortex": FolderStructure(
        name="vision_cortex",
        required_dirs=[
            "src",
            "src/core",
            "src/modules",
            "src/utils",
            "tests",
            "tests/unit",
            "tests/integration",
            "docs",
            ".github",
            ".github/workflows",
        ],
        required_files=[
            "pyproject.toml",
            "requirements.txt",
            "README.md",
            ".gitignore",
        ],
        critical=True,
    ),
    "taxonomy": FolderStructure(
        name="taxonomy",
        required_dirs=[
            "src",
            "src/core",
            "src/modules",
            "src/utils",
            "tests",
            "tests/unit",
            "tests/integration",
            "docs",
            ".github",
            ".github/workflows",
        ],
        required_files=[
            "pyproject.toml",
            "requirements.txt",
            "README.md",
            ".gitignore",
        ],
        critical=True,
    ),
    "auto_builder": FolderStructure(
        name="auto_builder",
        required_dirs=[
            "src",
            "src/core",
            "src/modules",
            "src/utils",
            "tests",
            "tests/unit",
            "tests/integration",
            "docs",
            ".github",
            ".github/workflows",
        ],
        required_files=[
            "pyproject.toml",
            "requirements.txt",
            "README.md",
            ".gitignore",
        ],
        critical=True,
    ),
    "index": FolderStructure(
        name="index",
        required_dirs=["src", "src/core", "src/modules", "config", "docs", ".github"],
        required_files=[
            "pyproject.toml",
            "requirements.txt",
            "README.md",
            ".gitignore",
            "config/repos.yaml",
            "config/workspace.yaml",
        ],
        critical=True,
    ),
}

# ============================================================================
# LOGGING SETUP
# ============================================================================


class ColoredFormatter(logging.Formatter):
    """Colored formatter for console output"""

    COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[37m",
        "CHECK": "\033[94m",
        "CORRECT": "\033[92m",
        "WARNING": "\033[93m",
        "ERROR": "\033[91m",
    }
    RESET = "\033[0m"

    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.COLORS["INFO"])
        record.levelname = f"{log_color}{record.levelname}{self.RESET}"
        return super().format(record)


# ============================================================================
# AUTO FOLDER ROUTER
# ============================================================================


class AutoFolderRouter:
    """Intelligent routing of folder operations across core repos"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.core_repos = ["vision_cortex", "taxonomy", "auto_builder", "index"]
        self.routing_map = {}

    def build_routing_map(self) -> Dict[str, Path]:
        """Build mapping of repos to their physical paths"""
        for repo in self.core_repos:
            repo_path = self.project_root / repo
            if repo_path.exists():
                self.routing_map[repo] = repo_path
        return self.routing_map

    def get_repo_path(self, repo_name: str) -> Optional[Path]:
        """Get path for specific repo"""
        return self.routing_map.get(repo_name)

    def get_all_repo_paths(self) -> List[Path]:
        """Get all active repo paths"""
        return list(self.routing_map.values())

    def route_operation(self, operation: str, repo_name: str) -> bool:
        """Route operation to correct repo folder"""
        repo_path = self.get_repo_path(repo_name)
        if repo_path:
            return True
        return False


def setup_logging(log_file: str) -> logging.Logger:
    """Setup logging with file and console handlers"""
    logger = logging.getLogger("FolderChecker")
    logger.setLevel(logging.DEBUG)

    # File handler
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )
    file_handler.setFormatter(file_formatter)

    # Console handler - use UTF-8 encoding
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    console_formatter = ColoredFormatter(
        "[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(console_formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


# ============================================================================
# TODO LIST INTEGRATION
# ============================================================================


@dataclass
class TodoItem:
    """Represents a todo item"""

    id: int
    title: str
    status: str = "not-started"  # not-started, in-progress, completed
    folder_path: Optional[str] = None
    check_result: Optional[Dict] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class TodoIntegration:
    """Integrate folder checks with todo list"""

    def __init__(self, todo_file: str = ".todo_list.json"):
        self.todo_file = Path(todo_file)
        self.todos: Dict[int, TodoItem] = {}
        self.load_todos()

    def load_todos(self) -> None:
        """Load todos from file"""
        if self.todo_file.exists():
            data = json.loads(self.todo_file.read_text())
            self.todos = {int(k): TodoItem(**v) for k, v in data.items()}

    def save_todos(self) -> None:
        """Save todos to file"""
        data = {k: asdict(v) for k, v in self.todos.items()}
        self.todo_file.write_text(json.dumps(data, indent=2))

    def add_or_update_todo(
        self,
        repo_name: str,
        status: str,
        folder_path: Optional[str] = None,
        check_result: Optional[Dict] = None,
    ) -> int:
        """Add or update a todo item for a repo"""
        # Find existing or create new
        todo_id = None
        for tid, todo in self.todos.items():
            if repo_name in todo.title:
                todo_id = tid
                break

        if todo_id is None:
            todo_id = max([t.id for t in self.todos.values()], default=0) + 1

        self.todos[todo_id] = TodoItem(
            id=todo_id,
            title=f"Folder check & correct: {repo_name}",
            status=status,
            folder_path=folder_path,
            check_result=check_result,
        )

        self.save_todos()
        return todo_id

    def mark_completed(self, repo_name: str) -> None:
        """Mark repo todo as completed"""
        for todo in self.todos.values():
            if repo_name in todo.title:
                todo.status = "completed"
                todo.timestamp = datetime.now().isoformat()
        self.save_todos()


# ============================================================================
# FOLDER CHECKER
# ============================================================================


@dataclass
class FolderCheckResult:
    """Result of folder structure check"""

    repo_name: str
    is_valid: bool
    missing_dirs: List[str] = field(default_factory=list)
    missing_files: List[str] = field(default_factory=list)
    extra_dirs: List[str] = field(default_factory=list)
    issues_found: int = 0
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class FolderChecker:
    """Check folder structures against expected layouts"""

    def __init__(self, logger: logging.Logger, project_root: Path):
        self.logger = logger
        self.project_root = project_root
        self.results: Dict[str, FolderCheckResult] = {}

    def check_all_repos(self) -> Dict[str, FolderCheckResult]:
        """Check all core repos"""
        self.logger.info("=" * 80)
        self.logger.info("🔍 AUTO FOLDER CHECK - Starting verification")
        self.logger.info("=" * 80)

        for repo_name, structure in CORE_REPOS_STRUCTURE.items():
            repo_path = self.project_root / repo_name
            if repo_path.exists():
                result = self.check_repo(repo_path, structure)
                self.results[repo_name] = result
            else:
                self.logger.warning(f"⚠️  Repo directory not found: {repo_name}")
                self.results[repo_name] = FolderCheckResult(
                    repo_name=repo_name, is_valid=False, issues_found=1
                )

        return self.results

    def check_repo(
        self, repo_path: Path, structure: FolderStructure
    ) -> FolderCheckResult:
        """Check single repository structure"""
        self.logger.info(f"\n📂 Checking: {structure.name}")
        result = FolderCheckResult(repo_name=structure.name, is_valid=True)

        # Check required directories
        for required_dir in structure.required_dirs:
            dir_path = repo_path / required_dir
            if not dir_path.exists():
                result.missing_dirs.append(required_dir)
                result.is_valid = False
                self.logger.warning(f"   ❌ Missing dir: {required_dir}")
            else:
                self.logger.info(f"   ✓ {required_dir}")

        # Check required files
        for required_file in structure.required_files:
            file_path = repo_path / required_file
            if not file_path.exists():
                result.missing_files.append(required_file)
                result.is_valid = False
                self.logger.warning(f"   ❌ Missing file: {required_file}")
            else:
                self.logger.info(f"   ✓ {required_file}")

        result.issues_found = len(result.missing_dirs) + len(result.missing_files)

        if result.is_valid:
            self.logger.info(f"   ✅ {structure.name}: VALID")
        else:
            self.logger.warning(f"   ❌ {structure.name}: {result.issues_found} issues")

        return result


# ============================================================================
# FOLDER CORRECTOR
# ============================================================================


class FolderCorrector:
    """Auto-correct folder structure issues"""

    def __init__(self, logger: logging.Logger, project_root: Path):
        self.logger = logger
        self.project_root = project_root

    def correct_all_repos(
        self, check_results: Dict[str, FolderCheckResult]
    ) -> Dict[str, bool]:
        """Correct all repos with issues"""
        self.logger.info("\n" + "=" * 80)
        self.logger.info("🔧 AUTO FOLDER CORRECT - Starting repairs")
        self.logger.info("=" * 80)

        corrections = {}

        for repo_name, result in check_results.items():
            if not result.is_valid:
                self.logger.info(f"\n🔧 Correcting: {repo_name}")
                success = self.correct_repo(repo_name, result)
                corrections[repo_name] = success
            else:
                self.logger.info(f"\n✅ No correction needed: {repo_name}")
                corrections[repo_name] = True

        return corrections

    def correct_repo(self, repo_name: str, result: FolderCheckResult) -> bool:
        """Correct single repository"""
        repo_path = self.project_root / repo_name

        try:
            # Create missing directories
            for missing_dir in result.missing_dirs:
                dir_path = repo_path / missing_dir
                dir_path.mkdir(parents=True, exist_ok=True)
                self.logger.info(f"   ✅ Created: {missing_dir}")

            # Create missing files with templates
            for missing_file in result.missing_files:
                self._create_file_template(repo_path, missing_file)
                self.logger.info(f"   ✅ Created: {missing_file}")

            self.logger.info(f"   ✅ Correction COMPLETE for {repo_name}")
            return True
        except Exception as e:
            self.logger.error(f"   ❌ Correction FAILED: {str(e)}")
            return False

    def _create_file_template(self, repo_path: Path, file_name: str) -> None:
        """Create file with appropriate template"""
        file_path = repo_path / file_name

        if file_path.exists():
            return

        templates = {
            "pyproject.toml": """[build-system]
requires = ["setuptools>=65", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "{repo_name}"
version = "1.0.0"
description = "Part of Infinity X AI System"
requires-python = ">=3.9"
""",
            "requirements.txt": """# Core AI/ML dependencies
openai>=1.0
groq>=0.0.1
anthropic>=0.7
pydantic>=2.0
python-dotenv>=1.0
requests>=2.31
redis>=5.0
firebase-admin>=6.0
numpy>=1.24
pandas>=2.0
pytest>=7.0
""",
            "README.md": f"""# {repo_path.name}

Part of Infinity X AI System

## Setup

```bash
pip install -r requirements.txt
```

## Development

```bash
pytest
```
""",
            ".gitignore": """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
venv/
ENV/
env/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Testing
.pytest_cache/
.coverage
htmlcov/

# Logs
*.log

# Config
.env
.env.local
""",
            "config/repos.yaml": """repositories:
  - id: vision-cortex
    name: Vision Cortex
    tier: 0
    status: active
  - id: taxonomy
    name: Infinity Codex
    tier: 0
    status: active
  - id: auto-builder
    name: Quantum X Builder
    tier: 0
    status: active
  - id: index
    name: System Index
    tier: 0
    status: active
""",
            "config/workspace.yaml": """workspace:
  name: Infinity X AI System
  version: "1.0.0"
  created: "2025-12-11"
  status: active
""",
        }

        content = templates.get(file_name, "# Auto-generated file\n")
        repo_name = repo_path.name
        content = content.format(repo_name=repo_name)

        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)


# ============================================================================
# VALIDATION ENGINE
# ============================================================================


class ValidationEngine:
    """Validate corrections were successful"""

    def __init__(self, logger: logging.Logger, project_root: Path):
        self.logger = logger
        self.project_root = project_root
        self.checker = FolderChecker(logger, project_root)

    def validate_corrections(self) -> bool:
        """Re-check all repos to validate corrections"""
        self.logger.info("\n" + "=" * 80)
        self.logger.info("✅ AUTO VALIDATION - Verifying corrections")
        self.logger.info("=" * 80)

        results = self.checker.check_all_repos()

        all_valid = all(r.is_valid for r in results.values())

        if all_valid:
            self.logger.info("\n✅ ALL FOLDERS VALID - Corrections successful!")
        else:
            self.logger.warning("\n⚠️  Some folders still have issues")

        return all_valid


# ============================================================================
# ORCHESTRATION ENGINE
# ============================================================================


class OrchestrationEngine:
    """Main orchestration for folder checking and correction"""

    def __init__(self, project_root: Path, logger: logging.Logger):
        self.project_root = project_root
        self.logger = logger
        self.checker = FolderChecker(logger, project_root)
        self.corrector = FolderCorrector(logger, project_root)
        self.validator = ValidationEngine(logger, project_root)
        self.todo_integration = TodoIntegration()

    async def orchestrate(self) -> None:
        """Execute full check-correct-validate workflow"""
        start_time = datetime.now()

        self.logger.info("\n" * 2)
        self.logger.info("=" * 80)
        self.logger.info("🚀 INFINITY X AI - AUTO FOLDER CHECK & CORRECT")
        self.logger.info("=" * 80)
        self.logger.info(f"Project Root: {self.project_root}")
        self.logger.info(f"Start Time: {start_time.isoformat()}")

        # PHASE 1: CHECK
        check_results = self.checker.check_all_repos()

        # PHASE 2: CORRECT
        corrections = self.corrector.correct_all_repos(check_results)

        # PHASE 3: VALIDATE
        all_valid = self.validator.validate_corrections()

        # PHASE 4: TODO LIST INTEGRATION
        self._update_todo_list(check_results, corrections, all_valid)

        # SUMMARY
        self._print_summary(start_time, check_results, corrections, all_valid)

    def _update_todo_list(
        self,
        check_results: Dict[str, FolderCheckResult],
        corrections: Dict[str, bool],
        all_valid: bool,
    ) -> None:
        """Update todo list with folder check results"""
        self.logger.info("\n📝 Updating todo list...")

        for repo_name, result in check_results.items():
            status = "completed" if all_valid else "in-progress"
            self.todo_integration.add_or_update_todo(
                repo_name=repo_name,
                status=status,
                folder_path=str(self.project_root / repo_name),
                check_result=asdict(result),
            )

        self.logger.info("✅ Todo list updated")

    def _print_summary(
        self,
        start_time: datetime,
        check_results: Dict[str, FolderCheckResult],
        corrections: Dict[str, bool],
        all_valid: bool,
    ) -> None:
        """Print operation summary"""
        duration = (datetime.now() - start_time).total_seconds()

        self.logger.info("\n" + "=" * 80)
        self.logger.info("📊 OPERATION SUMMARY")
        self.logger.info("=" * 80)

        self.logger.info("\nREPO STATUS:")
        for repo_name, result in check_results.items():
            status = "✅ VALID" if result.is_valid else "⚠️  ISSUES"
            self.logger.info(f"  {repo_name}: {status} ({result.issues_found} issues)")

        self.logger.info("\nCORRECTIONS:")
        for repo_name, success in corrections.items():
            status = "✅ SUCCESS" if success else "❌ FAILED"
            self.logger.info(f"  {repo_name}: {status}")

        self.logger.info("\nFINAL VALIDATION:")
        status = "✅ ALL VALID" if all_valid else "⚠️  INCOMPLETE"
        self.logger.info(f"  Status: {status}")

        self.logger.info(f"\nDuration: {duration:.2f} seconds")

        if all_valid:
            self.logger.info("\n🎉 AUTO FOLDER CHECK & CORRECT COMPLETE!")
            self.logger.info("All repositories verified and corrected.")
        else:
            self.logger.warning("\n⚠️  Some issues remain. Manual review needed.")

        self.logger.info("=" * 80)


# ============================================================================
# MAIN EXECUTION
# ============================================================================


async def main():
    """Main entry point"""
    project_root = Path(r"C:\Users\JARVIS\OneDrive\Documents")

    # Create logger
    logger = setup_logging("auto_folder_check_correct.log")

    try:
        orchestrator = OrchestrationEngine(project_root, logger)
        await orchestrator.orchestrate()
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
