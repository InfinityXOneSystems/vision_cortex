#!/usr/bin/env python3
"""
INFINITY X AI - Auto Folder Check & Correct (Background Edition)
Runs in background, stays in vision_cortex folder, includes auto-routing
"""

import json
import logging
import os
import sys
import threading
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Set UTF-8 encoding for output
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"

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


# ============================================================================
# LOGGING
# ============================================================================


def setup_logging(log_file: str) -> logging.Logger:
    """Setup logging with UTF-8 support"""
    logger = logging.getLogger("FolderChecker")
    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()

    # File handler with UTF-8
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s")
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    return logger


# ============================================================================
# FOLDER STRUCTURES
# ============================================================================


@dataclass
class FolderStructure:
    """Define expected folder structure for each repo"""

    name: str
    required_dirs: List[str]
    required_files: List[str]


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
    ),
}

# ============================================================================
# FOLDER CHECKER
# ============================================================================


@dataclass
class CheckResult:
    """Result of folder structure check"""

    repo_name: str
    is_valid: bool
    missing_dirs: List[str] = field(default_factory=list)
    missing_files: List[str] = field(default_factory=list)
    issues: int = 0


class FolderChecker:
    """Check folder structures"""

    def __init__(
        self, logger: logging.Logger, project_root: Path, router: AutoFolderRouter
    ):
        self.logger = logger
        self.project_root = project_root
        self.router = router

    def check_all_repos(self) -> Dict[str, CheckResult]:
        """Check all core repos"""
        self.logger.info("=" * 80)
        self.logger.info("[CHECK] Starting folder structure verification")
        self.logger.info("=" * 80)

        results = {}
        for repo_name, structure in CORE_REPOS_STRUCTURE.items():
            repo_path = self.project_root / repo_name
            if repo_path.exists():
                result = self.check_repo(repo_path, structure)
                results[repo_name] = result
            else:
                self.logger.warning(f"[CHECK] Repo not found: {repo_name}")
                results[repo_name] = CheckResult(
                    repo_name=repo_name, is_valid=False, issues=1
                )

        return results

    def check_repo(self, repo_path: Path, structure: FolderStructure) -> CheckResult:
        """Check single repo"""
        result = CheckResult(repo_name=structure.name, is_valid=True)

        # Check dirs
        for required_dir in structure.required_dirs:
            dir_path = repo_path / required_dir
            if not dir_path.exists():
                result.missing_dirs.append(required_dir)
                result.is_valid = False

        # Check files
        for required_file in structure.required_files:
            file_path = repo_path / required_file
            if not file_path.exists():
                result.missing_files.append(required_file)
                result.is_valid = False

        result.issues = len(result.missing_dirs) + len(result.missing_files)

        status = "VALID" if result.is_valid else f"ISSUES ({result.issues})"
        self.logger.info(f"[CHECK] {structure.name}: {status}")

        return result


# ============================================================================
# FOLDER CORRECTOR
# ============================================================================


class FolderCorrector:
    """Auto-correct folder structures"""

    def __init__(
        self, logger: logging.Logger, project_root: Path, router: AutoFolderRouter
    ):
        self.logger = logger
        self.project_root = project_root
        self.router = router

    def correct_all_repos(self, results: Dict[str, CheckResult]) -> Dict[str, bool]:
        """Correct all repos with issues"""
        self.logger.info("\n" + "=" * 80)
        self.logger.info("[CORRECT] Starting auto-correction")
        self.logger.info("=" * 80)

        corrections = {}
        for repo_name, result in results.items():
            if not result.is_valid:
                success = self.correct_repo(repo_name, result)
                corrections[repo_name] = success
            else:
                corrections[repo_name] = True

        return corrections

    def correct_repo(self, repo_name: str, result: CheckResult) -> bool:
        """Correct single repo"""
        repo_path = self.project_root / repo_name

        try:
            # Create missing dirs
            for missing_dir in result.missing_dirs:
                dir_path = repo_path / missing_dir
                dir_path.mkdir(parents=True, exist_ok=True)
                self.logger.info(f"[CORRECT] Created: {repo_name}/{missing_dir}")

            # Create missing files
            for missing_file in result.missing_files:
                self._create_file_template(repo_path, missing_file, repo_name)
                self.logger.info(f"[CORRECT] Created: {repo_name}/{missing_file}")

            return True
        except Exception as e:
            self.logger.error(f"[CORRECT] Failed: {repo_name}: {str(e)}")
            return False

    def _create_file_template(
        self, repo_path: Path, file_name: str, repo_name: str
    ) -> None:
        """Create file with template"""
        file_path = repo_path / file_name
        if file_path.exists():
            return

        templates = {
            "pyproject.toml": f"""[build-system]
requires = ["setuptools>=65", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "{repo_name}"
version = "1.0.0"
description = "Part of Infinity X AI System"
requires-python = ">=3.9"
""",
            "requirements.txt": "openai>=1.0\ngroq>=0.0.1\nanthropic>=0.7\npydantic>=2.0\npython-dotenv>=1.0\nrequests>=2.31\n",
            "README.md": f"# {repo_name}\n\nPart of Infinity X AI System\n",
            ".gitignore": "__pycache__/\n*.pyc\n.pytest_cache/\nvenv/\nENV/\n.env\n",
            "config/repos.yaml": "repositories:\n  status: active\n",
            "config/workspace.yaml": "workspace:\n  name: Infinity X AI\n  status: active\n",
        }

        content = templates.get(file_name, "# Auto-generated\n")
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content)


# ============================================================================
# BACKGROUND RUNNER
# ============================================================================


def run_background_check():
    """Run folder check in background thread"""
    project_root = Path(r"C:\Users\JARVIS\OneDrive\Documents")

    logger = setup_logging(
        str(project_root / "vision_cortex" / "auto_folder_check.log")
    )
    logger.info("[BACKGROUND] Starting auto folder check & correct")

    try:
        # Setup routing
        router = AutoFolderRouter(project_root)
        router.build_routing_map()
        logger.info(f"[ROUTER] Active repos: {list(router.routing_map.keys())}")

        # Check
        checker = FolderChecker(logger, project_root, router)
        results = checker.check_all_repos()

        # Correct
        corrector = FolderCorrector(logger, project_root, router)
        corrections = corrector.correct_all_repos(results)

        # Validate
        results_after = checker.check_all_repos()
        all_valid = all(r.is_valid for r in results_after.values())

        # Summary
        logger.info("\n" + "=" * 80)
        logger.info("[SUMMARY] Operation Complete")
        logger.info("=" * 80)

        for repo_name, result in results_after.items():
            status = "VALID" if result.is_valid else f"ISSUES ({result.issues})"
            logger.info(f"[SUMMARY] {repo_name}: {status}")

        if all_valid:
            logger.info("[RESULT] All folders valid - operation successful!")
        else:
            logger.info("[RESULT] Some issues remain")

        logger.info("[BACKGROUND] Complete - running in background")

    except Exception as e:
        logger.error(f"[ERROR] Fatal: {str(e)}")


# ============================================================================
# EXECUTION
# ============================================================================

if __name__ == "__main__":
    # Run in background thread
    bg_thread = threading.Thread(target=run_background_check, daemon=True)
    bg_thread.start()

    # Keep main thread alive
    print("[BACKGROUND] Auto folder check running in background...")
    print("[LOG] Check progress in: vision_cortex/auto_folder_check.log")

    bg_thread.join(timeout=60)  # Max 60 seconds
