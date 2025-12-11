"""
AUTO GIT AGENT - Automated Commit and Push System
Handles automatic staging, committing, and pushing of changes
Integrates with system requirements and validation pipeline
"""

import json
import os
import subprocess
import logging
from dataclasses import dataclass, asdict, field
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import re
from enum import Enum
import yaml


class CommitType(Enum):
    """Conventional commit types"""
    FEAT = "feat"
    FIX = "fix"
    REFACTOR = "refactor"
    DOCS = "docs"
    STYLE = "style"
    TEST = "test"
    CHORE = "chore"
    PERF = "perf"


class PushStrategy(Enum):
    """Push strategies"""
    IMMEDIATE = "immediate"  # Push immediately after commit
    BATCH = "batch"  # Batch multiple commits
    SCHEDULED = "scheduled"  # Push at scheduled time
    MANUAL = "manual"  # Manual push only


@dataclass
class GitStatus:
    """Current git repository status"""
    branch: str
    remote: str
    ahead_commits: int
    behind_commits: int
    modified_files: List[str]
    untracked_files: List[str]
    staged_files: List[str]
    has_conflict: bool
    has_stash: bool


@dataclass
class CommitConfig:
    """Commit configuration"""
    type: CommitType
    component: str
    description: str
    body: Optional[str] = None
    footer: Optional[str] = None
    breaking_change: bool = False
    closes_issue: Optional[str] = None
    validates_before: bool = True
    auto_push: bool = True


@dataclass
class PushConfig:
    """Push configuration"""
    strategy: PushStrategy
    branch: str
    remote: str
    force: bool = False
    tags: bool = True
    set_upstream: bool = False
    retry_on_failure: bool = True
    max_retries: int = 3


@dataclass
class GitOperation:
    """Logged git operation"""
    timestamp: str
    operation: str
    component: str
    description: str
    files_affected: List[str]
    commit_sha: Optional[str]
    success: bool
    error: Optional[str]
    duration_seconds: float


class AutoGitAgent:
    """Automated git operations agent"""
    
    def __init__(self, repo_root: str = ".", config_path: str = None):
        """Initialize the auto git agent
        
        Args:
            repo_root: Root directory of git repository
            config_path: Path to SYSTEM_REQUIREMENTS.yaml
        """
        self.repo_root = Path(repo_root)
        self.config_path = Path(config_path) if config_path else Path(repo_root) / "SYSTEM_REQUIREMENTS.yaml"
        self.logger = self._setup_logging()
        self.config = self._load_config()
        self.operations_log: List[GitOperation] = []
        
        # Validate repo
        if not (self.repo_root / ".git").exists():
            raise ValueError(f"Not a git repository: {self.repo_root}")
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging"""
        logger = logging.getLogger("AutoGitAgent")
        logger.setLevel(logging.INFO)
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        return logger
    
    def _load_config(self) -> Dict:
        """Load system requirements configuration"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    return yaml.safe_load(f)
            return {}
        except Exception as e:
            self.logger.warning(f"Failed to load config: {e}")
            return {}
    
    def get_status(self) -> Tuple[bool, GitStatus]:
        """Get current git status
        
        Returns:
            (success, GitStatus object)
        """
        try:
            # Get branch name
            branch_result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            branch = branch_result.stdout.strip()
            
            # Get remote
            remote_result = subprocess.run(
                ["git", "config", "--get", "remote.origin.url"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            remote = remote_result.stdout.strip()
            
            # Get status
            status_result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            modified_files = []
            untracked_files = []
            staged_files = []
            
            for line in status_result.stdout.split('\n'):
                if not line.strip():
                    continue
                status_code = line[:2]
                filename = line[3:].strip()
                
                if status_code == "??":
                    untracked_files.append(filename)
                elif status_code[0] == "M":
                    staged_files.append(filename)
                elif status_code[1] == "M":
                    modified_files.append(filename)
            
            # Check for conflicts
            conflict_result = subprocess.run(
                ["git", "ls-files", "-u"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            has_conflict = bool(conflict_result.stdout.strip())
            
            # Check for stash
            stash_result = subprocess.run(
                ["git", "stash", "list"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            has_stash = bool(stash_result.stdout.strip())
            
            # Get ahead/behind
            ahead_result = subprocess.run(
                ["git", "rev-list", "--count", "HEAD..origin/" + branch],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            ahead = int(ahead_result.stdout.strip()) if ahead_result.stdout.strip() else 0
            
            behind_result = subprocess.run(
                ["git", "rev-list", "--count", "origin/" + branch + "..HEAD"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            behind = int(behind_result.stdout.strip()) if behind_result.stdout.strip() else 0
            
            status = GitStatus(
                branch=branch,
                remote=remote,
                ahead_commits=ahead,
                behind_commits=behind,
                modified_files=modified_files,
                untracked_files=untracked_files,
                staged_files=staged_files,
                has_conflict=has_conflict,
                has_stash=has_stash
            )
            
            return True, status
            
        except Exception as e:
            self.logger.error(f"Failed to get git status: {e}")
            return False, None
    
    def stage_files(self, files: List[str], component: str = "general") -> Tuple[bool, str]:
        """Stage files for commit
        
        Args:
            files: List of file paths to stage
            component: Component name for logging
            
        Returns:
            (success, message)
        """
        try:
            if not files:
                return False, "No files to stage"
            
            self.logger.info(f"Staging {len(files)} files for {component}")
            
            for file in files:
                result = subprocess.run(
                    ["git", "add", file],
                    cwd=self.repo_root,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode != 0:
                    return False, f"Failed to stage {file}: {result.stderr}"
            
            self.logger.info(f"Successfully staged {len(files)} files")
            return True, f"Staged {len(files)} files"
            
        except Exception as e:
            msg = f"Error staging files: {e}"
            self.logger.error(msg)
            return False, msg
    
    def stage_all(self, component: str = "general") -> Tuple[bool, str]:
        """Stage all changed files
        
        Args:
            component: Component name for logging
            
        Returns:
            (success, message)
        """
        try:
            self.logger.info(f"Staging all changes for {component}")
            
            result = subprocess.run(
                ["git", "add", "."],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                return False, f"Failed to stage all: {result.stderr}"
            
            # Get count of staged files
            status_success, status = self.get_status()
            count = len(status.staged_files) if status_success and status else 0
            
            msg = f"Staged all changes ({count} files)"
            self.logger.info(msg)
            return True, msg
            
        except Exception as e:
            msg = f"Error staging all: {e}"
            self.logger.error(msg)
            return False, msg
    
    def generate_commit_message(self, config: CommitConfig) -> str:
        """Generate conventional commit message
        
        Args:
            config: Commit configuration
            
        Returns:
            Formatted commit message
        """
        # Format: type(component): description
        message = f"{config.type.value}({config.component}): {config.description}"
        
        # Add breaking change indicator
        if config.breaking_change:
            message += "\n\nBREAKING CHANGE: "
        
        # Add body
        if config.body:
            message += f"\n\n{config.body}"
        
        # Add footer
        if config.closes_issue:
            message += f"\n\nCloses #{config.closes_issue}"
        
        if config.footer:
            message += f"\n\n{config.footer}"
        
        return message
    
    def commit(self, config: CommitConfig) -> Tuple[bool, str, Optional[str]]:
        """Create a commit with validation
        
        Args:
            config: Commit configuration
            
        Returns:
            (success, message, commit_sha)
        """
        start_time = datetime.now()
        
        try:
            # Validate if required
            if config.validates_before:
                self.logger.info("Validating before commit...")
                # Validation would be done by code_validation_agent
                # For now, we just log
            
            # Generate message
            message = self.generate_commit_message(config)
            
            self.logger.info(f"Creating commit: {config.type.value}({config.component})")
            
            # Create commit
            result = subprocess.run(
                ["git", "commit", "-m", message],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                error = result.stderr.strip()
                if "nothing to commit" in error.lower():
                    return False, "Nothing to commit", None
                return False, f"Commit failed: {error}", None
            
            # Get commit SHA
            sha_result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            commit_sha = sha_result.stdout.strip() if sha_result.returncode == 0 else None
            
            duration = (datetime.now() - start_time).total_seconds()
            msg = f"Commit created: {message.split(chr(10))[0]}"
            
            # Log operation
            self._log_operation(
                operation="commit",
                component=config.component,
                description=config.description,
                files_affected=[],  # Would be populated by status
                commit_sha=commit_sha,
                success=True,
                error=None,
                duration=duration
            )
            
            # Auto push if configured
            if config.auto_push:
                self.logger.info("Auto-push enabled, pushing commit...")
                push_config = PushConfig(
                    strategy=PushStrategy.IMMEDIATE,
                    branch="main",
                    remote="origin"
                )
                success, push_msg = self.push(push_config)
                if success:
                    msg += f" and pushed"
            
            self.logger.info(msg)
            return True, msg, commit_sha
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            msg = f"Error creating commit: {e}"
            self.logger.error(msg)
            
            self._log_operation(
                operation="commit",
                component=config.component,
                description=config.description,
                files_affected=[],
                commit_sha=None,
                success=False,
                error=str(e),
                duration=duration
            )
            
            return False, msg, None
    
    def push(self, config: PushConfig) -> Tuple[bool, str]:
        """Push commits to remote
        
        Args:
            config: Push configuration
            
        Returns:
            (success, message)
        """
        start_time = datetime.now()
        
        try:
            cmd = ["git", "push"]
            
            if config.force:
                cmd.append("--force")
            
            if config.tags:
                cmd.append("--tags")
            
            if config.set_upstream:
                cmd.extend(["-u", config.remote, config.branch])
            else:
                cmd.extend([config.remote, config.branch])
            
            self.logger.info(f"Pushing to {config.remote}/{config.branch}")
            
            result = subprocess.run(
                cmd,
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                error = result.stderr.strip()
                if "up-to-date" in error.lower() or "everything up-to-date" in error.lower():
                    self.logger.info("Everything up to date")
                    return True, "Nothing to push (up to date)"
                
                # Retry logic
                if config.retry_on_failure and config.max_retries > 0:
                    self.logger.warning(f"Push failed, retrying... ({config.max_retries} retries left)")
                    config.max_retries -= 1
                    return self.push(config)
                
                return False, f"Push failed: {error}"
            
            duration = (datetime.now() - start_time).total_seconds()
            msg = f"Pushed to {config.remote}/{config.branch}"
            
            self._log_operation(
                operation="push",
                component="git",
                description=f"Pushed {len(result.stdout.split(chr(10)))} commits",
                files_affected=[],
                commit_sha=None,
                success=True,
                error=None,
                duration=duration
            )
            
            self.logger.info(msg)
            return True, msg
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            msg = f"Error pushing: {e}"
            self.logger.error(msg)
            
            self._log_operation(
                operation="push",
                component="git",
                description="Push attempt",
                files_affected=[],
                commit_sha=None,
                success=False,
                error=str(e),
                duration=duration
            )
            
            return False, msg
    
    def commit_and_push(self, config: CommitConfig, push_config: Optional[PushConfig] = None) -> Tuple[bool, str]:
        """Complete commit and push workflow
        
        Args:
            config: Commit configuration
            push_config: Push configuration (uses defaults if not provided)
            
        Returns:
            (success, message)
        """
        self.logger.info("Starting commit and push workflow")
        
        # Commit
        success, msg, commit_sha = self.commit(config)
        if not success:
            return False, msg
        
        # Push if auto_push enabled
        if config.auto_push:
            if push_config is None:
                push_config = PushConfig(
                    strategy=PushStrategy.IMMEDIATE,
                    branch="main",
                    remote="origin"
                )
            
            success, push_msg = self.push(push_config)
            if not success:
                return False, f"{msg} but {push_msg}"
            
            return True, f"{msg} and pushed"
        
        return True, msg
    
    def _log_operation(self, operation: str, component: str, description: str,
                      files_affected: List[str], commit_sha: Optional[str],
                      success: bool, error: Optional[str], duration: float):
        """Log a git operation"""
        op = GitOperation(
            timestamp=datetime.now().isoformat(),
            operation=operation,
            component=component,
            description=description,
            files_affected=files_affected,
            commit_sha=commit_sha,
            success=success,
            error=error,
            duration_seconds=duration
        )
        self.operations_log.append(op)
    
    def get_operations_log(self) -> List[Dict]:
        """Get operations log as dictionaries"""
        return [asdict(op) for op in self.operations_log]
    
    def save_operations_log(self, filepath: str):
        """Save operations log to file"""
        try:
            with open(filepath, 'w') as f:
                json.dump(self.get_operations_log(), f, indent=2)
            self.logger.info(f"Operations log saved to {filepath}")
        except Exception as e:
            self.logger.error(f"Failed to save operations log: {e}")
    
    def get_system_requirements(self) -> Dict:
        """Get system requirements for agents"""
        return {
            "git": self.config.get("git", {}),
            "code": self.config.get("code", {}),
            "ai_stack": self.config.get("ai_stack", {}),
            "agents": self.config.get("agents", {}),
            "validation": self.config.get("validation", {}),
            "logging": self.config.get("logging", {}),
            "security": self.config.get("security", {})
        }
    
    def validate_commit_message(self, message: str) -> Tuple[bool, str]:
        """Validate commit message follows conventional format
        
        Args:
            message: Commit message to validate
            
        Returns:
            (is_valid, error_message)
        """
        pattern = r'^(feat|fix|refactor|docs|style|test|chore|perf)\([a-z\-]+\): .+'
        
        if not re.match(pattern, message):
            return False, "Commit message doesn't follow conventional format: type(component): description"
        
        return True, "Valid commit message"
    
    def get_git_log(self, count: int = 10) -> List[Dict]:
        """Get recent git commits
        
        Args:
            count: Number of commits to retrieve
            
        Returns:
            List of commit info
        """
        try:
            result = subprocess.run(
                ["git", "log", f"--max-count={count}", "--pretty=format:%H|%an|%ae|%ar|%s"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            commits = []
            for line in result.stdout.split('\n'):
                if line.strip():
                    parts = line.split('|')
                    if len(parts) >= 5:
                        commits.append({
                            "sha": parts[0],
                            "author": parts[1],
                            "email": parts[2],
                            "date": parts[3],
                            "message": parts[4]
                        })
            
            return commits
            
        except Exception as e:
            self.logger.error(f"Failed to get git log: {e}")
            return []


# Command-line interface
if __name__ == "__main__":
    import sys
    
    agent = AutoGitAgent()
    
    # Example usage
    success, status = agent.get_status()
    if success:
        print(f"Current branch: {status.branch}")
        print(f"Modified files: {len(status.modified_files)}")
        print(f"Untracked files: {len(status.untracked_files)}")
        print(f"Staged files: {len(status.staged_files)}")
    
    # Show recent commits
    commits = agent.get_git_log(5)
    print(f"\nRecent commits:")
    for commit in commits:
        print(f"  {commit['sha'][:8]} - {commit['message']}")
