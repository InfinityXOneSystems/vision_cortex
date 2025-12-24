#!/usr/bin/env python3
"""
CONTINUOUS CODE VALIDATION MONITOR
Monitors repository for changes and automatically validates/commits/pushes.
Runs as a background daemon service.
"""

import hashlib
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Dict, Optional, Set

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

from auto_code_validator_agent import (AutoValidatorAgent, CodeValidator,
                                       GitCommitAgent)


class ValidationMonitor:
    """Continuous validation monitoring service"""

    def __init__(self, repo_path: str, config_file: str = "validator_config.json"):
        self.repo_path = Path(repo_path)
        self.config_file = Path(config_file)
        self.agent = AutoValidatorAgent(str(self.repo_path), str(self.config_file))
        self.file_hashes: Dict[str, str] = {}
        self.last_validation_time = None
        self.validation_count = 0
        self.commit_count = 0

        # Setup logging
        self.logger = self._setup_logging()
        self.logger.info(f"ValidationMonitor initialized for {self.repo_path}")

    def _setup_logging(self) -> logging.Logger:
        """Setup logging with rotating file handler"""
        log_dir = self.repo_path / "logs"
        log_dir.mkdir(exist_ok=True)

        logger = logging.getLogger("ValidationMonitor")
        logger.setLevel(logging.DEBUG)

        # File handler with rotation
        handler = RotatingFileHandler(
            log_dir / "validation_monitor.log",
            maxBytes=10_000_000,  # 10MB
            backupCount=5,
        )

        formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        # Console handler
        console = logging.StreamHandler()
        console.setLevel(logging.INFO)
        console.setFormatter(formatter)
        logger.addHandler(console)

        return logger

    def _get_python_files(self) -> Set[Path]:
        """Get all Python files in repository"""
        python_files = set()
        for py_file in self.repo_path.rglob("*.py"):
            # Skip skip patterns
            skip_patterns = self.agent.config.get("skip_patterns", [])
            should_skip = False

            for pattern in skip_patterns:
                # Simple pattern matching
                if pattern.endswith("/**"):
                    dir_pattern = pattern[:-3]
                    if dir_pattern in str(py_file):
                        should_skip = True
                        break
                elif py_file.name.endswith(pattern):
                    should_skip = True
                    break

            if not should_skip:
                python_files.add(py_file)

        return python_files

    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate hash of file contents"""
        try:
            with open(file_path, "rb") as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception as e:
            self.logger.error(f"Error calculating hash for {file_path}: {e}")
            return ""

    def _detect_changes(self) -> bool:
        """Detect if any Python files have changed"""
        current_files = self._get_python_files()
        current_hashes = {}

        for file_path in current_files:
            file_hash = self._calculate_file_hash(file_path)
            current_hashes[str(file_path)] = file_hash

        # Check for changes
        changed = False

        # New or modified files
        for file_path, file_hash in current_hashes.items():
            if (
                file_path not in self.file_hashes
                or self.file_hashes[file_path] != file_hash
            ):
                changed = True
                self.logger.debug(f"Change detected: {file_path}")
                break

        # Deleted files
        if not changed:
            for file_path in self.file_hashes:
                if file_path not in current_hashes:
                    changed = True
                    self.logger.debug(f"Deletion detected: {file_path}")
                    break

        self.file_hashes = current_hashes
        return changed

    def _check_git_changes(self) -> bool:
        """Check if there are git changes to commit"""
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=5,
            )

            return bool(result.stdout.strip())
        except Exception as e:
            self.logger.warning(f"Error checking git status: {e}")
            return False

    def validate_and_commit(self) -> bool:
        """Run validation and commit cycle"""
        self.logger.info("🔍 Starting validation cycle")

        try:
            # Run validation and commit
            result = self.agent.run(validate_only=False)

            if result.get("success"):
                self.validation_count += 1
                if result.get("commit_summary", {}).get("committed"):
                    self.commit_count += 1
                    self.logger.info(
                        f"✓ Validation cycle complete: "
                        f"validated, committed, "
                        f"{'pushed' if result.get('commit_summary', {}).get('pushed') else 'not pushed'}"
                    )
                else:
                    self.logger.info(f"✓ Validation cycle complete: validated only")

                self.last_validation_time = datetime.now()
                return True
            else:
                self.logger.warning(
                    f"✗ Validation cycle failed: {result.get('message')}"
                )
                return False

        except Exception as e:
            self.logger.error(f"✗ Validation cycle error: {e}", exc_info=True)
            return False

    def print_status(self):
        """Print current status"""
        uptime = datetime.now()
        if self.last_validation_time:
            time_since_last = (uptime - self.last_validation_time).total_seconds()
            last_validation = f"{int(time_since_last)}s ago"
        else:
            last_validation = "Never"

        status = (
            f"\n{'='*70}\n"
            f"📊 VALIDATION MONITOR STATUS\n"
            f"{'='*70}\n"
            f"Repository: {self.repo_path}\n"
            f"Branch: {self.agent.git_agent.current_branch}\n"
            f"User: {self.agent.git_agent.current_user}\n"
            f"\nValidation Cycles: {self.validation_count}\n"
            f"Auto Commits: {self.commit_count}\n"
            f"Last Validation: {last_validation}\n"
            f"Monitoring Since: {uptime.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
            f"{'='*70}\n"
        )
        print(status)
        self.logger.info(status.replace("\n", " "))

    def run(self, interval_seconds: int = 5, max_iterations: Optional[int] = None):
        """Run continuous monitoring loop"""
        self.logger.info(
            f"🚀 Starting validation monitor (interval: {interval_seconds}s)"
        )
        self.print_status()

        iteration = 0

        try:
            while True:
                iteration += 1

                if max_iterations and iteration > max_iterations:
                    self.logger.info(
                        f"Max iterations ({max_iterations}) reached, stopping"
                    )
                    break

                # Check for changes
                has_changes = self._detect_changes() or self._check_git_changes()

                if has_changes:
                    self.logger.info(f"📝 Changes detected, triggering validation")
                    self.validate_and_commit()
                else:
                    self.logger.debug("No changes detected")

                # Sleep before next check
                time.sleep(interval_seconds)

        except KeyboardInterrupt:
            self.logger.info("🛑 Monitor stopped by user (Ctrl+C)")
            self.print_status()
        except Exception as e:
            self.logger.error(f"✗ Unexpected error: {e}", exc_info=True)
        finally:
            self.logger.info("Monitor shutdown complete")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Continuous Code Validation Monitor")
    parser.add_argument(
        "--repo",
        default=str(Path.cwd()),
        help="Repository path (default: current directory)",
    )
    parser.add_argument(
        "--config",
        default="validator_config.json",
        help="Configuration file (default: validator_config.json)",
    )
    parser.add_argument(
        "--interval", type=int, default=5, help="Check interval in seconds (default: 5)"
    )
    parser.add_argument(
        "--max-iterations",
        type=int,
        help="Maximum iterations before stopping (for testing)",
    )
    parser.add_argument(
        "--validate-once", action="store_true", help="Run validation once and exit"
    )

    args = parser.parse_args()

    # Initialize monitor
    monitor = ValidationMonitor(args.repo, args.config)

    # Run monitor
    if args.validate_once:
        monitor.validate_and_commit()
        monitor.print_status()
    else:
        monitor.run(interval_seconds=args.interval, max_iterations=args.max_iterations)


if __name__ == "__main__":
    main()
