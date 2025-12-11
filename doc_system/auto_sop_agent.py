"""
AUTO SOP AGENT - Standard Operating Procedure Tracking and Execution
Tracks everything that is built, enables rebuilding, and refines through validation
"""

import json
import logging
import subprocess
from dataclasses import dataclass, asdict, field
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
from enum import Enum
import hashlib


class SOPStatus(Enum):
    """SOP execution status"""
    DRAFT = "draft"
    VALIDATED = "validated"
    IN_USE = "in_use"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


class StepStatus(Enum):
    """Individual step status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class ValidationLevel(Enum):
    """Validation strictness levels"""
    PERMISSIVE = "permissive"  # 1+ successful execution
    MODERATE = "moderate"      # 3+ successful executions
    STRICT = "strict"          # 10+ successful executions, 95%+ success rate
    CERTIFIED = "certified"    # 50+ successful executions, 99%+ success rate


@dataclass
class SOPStep:
    """Individual step in a SOP"""
    step_number: int
    name: str
    description: str
    command: str
    component: str
    expected_output: Optional[str] = None
    validation_check: Optional[str] = None
    rollback_command: Optional[str] = None
    timeout_seconds: int = 300
    retry_on_failure: bool = True
    max_retries: int = 3
    dependencies: List[int] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)


@dataclass
class SOPExecution:
    """Record of a SOP execution"""
    execution_id: str
    sop_id: str
    sop_version: str
    start_time: str
    end_time: Optional[str]
    duration_seconds: float
    status: StepStatus
    steps_completed: int
    steps_total: int
    success_rate: float
    failed_steps: List[int] = field(default_factory=list)
    output: Dict[int, str] = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class SOPDefinition:
    """Complete SOP definition"""
    sop_id: str
    name: str
    version: str
    status: SOPStatus
    description: str
    component: str
    purpose: str
    created_date: str
    last_modified: str
    created_by: str
    last_modified_by: str
    steps: List[SOPStep] = field(default_factory=list)
    prerequisites: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    validation_level: ValidationLevel = ValidationLevel.PERMISSIVE
    execution_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    average_duration: float = 0.0
    content_hash: str = ""


class AutoSOPAgent:
    """Automatic SOP tracking and execution agent"""
    
    def __init__(self, repo_root: str = ".", sop_dir: str = None):
        """Initialize SOP agent
        
        Args:
            repo_root: Root directory of project
            sop_dir: Directory for SOP storage
        """
        self.repo_root = Path(repo_root)
        self.sop_dir = Path(sop_dir) if sop_dir else Path(repo_root) / "doc_system" / "sops"
        self.sop_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger = self._setup_logging()
        self.sops: Dict[str, SOPDefinition] = {}
        self.execution_history: List[SOPExecution] = []
        self.operations_log: List[Dict] = []
        
        self._load_sops()
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging"""
        logger = logging.getLogger("AutoSOPAgent")
        logger.setLevel(logging.INFO)
        
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        return logger
    
    def _load_sops(self):
        """Load all SOPs from disk"""
        try:
            sop_files = list(self.sop_dir.glob("*.json"))
            for sop_file in sop_files:
                try:
                    with open(sop_file, 'r') as f:
                        sop_data = json.load(f)
                    
                    # Reconstruct SOP
                    steps = [
                        SOPStep(
                            step_number=s["step_number"],
                            name=s["name"],
                            description=s["description"],
                            command=s["command"],
                            component=s["component"],
                            expected_output=s.get("expected_output"),
                            validation_check=s.get("validation_check"),
                            rollback_command=s.get("rollback_command"),
                            timeout_seconds=s.get("timeout_seconds", 300),
                            retry_on_failure=s.get("retry_on_failure", True),
                            max_retries=s.get("max_retries", 3),
                            dependencies=s.get("dependencies", []),
                            tags=s.get("tags", [])
                        )
                        for s in sop_data.get("steps", [])
                    ]
                    
                    sop = SOPDefinition(
                        sop_id=sop_data["sop_id"],
                        name=sop_data["name"],
                        version=sop_data["version"],
                        status=SOPStatus[sop_data["status"]],
                        description=sop_data["description"],
                        component=sop_data["component"],
                        purpose=sop_data["purpose"],
                        created_date=sop_data["created_date"],
                        last_modified=sop_data["last_modified"],
                        created_by=sop_data["created_by"],
                        last_modified_by=sop_data["last_modified_by"],
                        steps=steps,
                        prerequisites=sop_data.get("prerequisites", []),
                        tags=sop_data.get("tags", []),
                        validation_level=ValidationLevel[sop_data.get("validation_level", "PERMISSIVE")],
                        execution_count=sop_data.get("execution_count", 0),
                        success_count=sop_data.get("success_count", 0),
                        failure_count=sop_data.get("failure_count", 0),
                        average_duration=sop_data.get("average_duration", 0.0),
                        content_hash=sop_data.get("content_hash", "")
                    )
                    
                    self.sops[sop.sop_id] = sop
                    self.logger.info(f"Loaded SOP: {sop.sop_id} v{sop.version}")
                
                except Exception as e:
                    self.logger.error(f"Failed to load SOP {sop_file}: {e}")
        
        except Exception as e:
            self.logger.error(f"Failed to load SOPs: {e}")
    
    def create_sop_from_operations(self, sop_id: str, name: str, description: str,
                                  component: str, purpose: str, 
                                  operations: List[Dict], created_by: str = "agent") -> Tuple[bool, str]:
        """Create SOP from recorded operations
        
        Args:
            sop_id: Unique SOP identifier
            name: Human-readable name
            description: SOP description
            component: Component this SOP applies to
            purpose: Why this SOP exists
            operations: List of operation dicts with command, description, etc.
            created_by: Who created this SOP
            
        Returns:
            (success, message)
        """
        try:
            if sop_id in self.sops:
                return False, f"SOP already exists: {sop_id}"
            
            steps = []
            for i, op in enumerate(operations, 1):
                step = SOPStep(
                    step_number=i,
                    name=op.get("name", f"Step {i}"),
                    description=op.get("description", ""),
                    command=op.get("command", ""),
                    component=component,
                    expected_output=op.get("expected_output"),
                    validation_check=op.get("validation_check"),
                    rollback_command=op.get("rollback_command"),
                    timeout_seconds=op.get("timeout_seconds", 300),
                    retry_on_failure=op.get("retry_on_failure", True),
                    dependencies=op.get("dependencies", []),
                    tags=op.get("tags", [])
                )
                steps.append(step)
            
            now = datetime.now().isoformat()
            
            sop = SOPDefinition(
                sop_id=sop_id,
                name=name,
                version="1.0.0",
                status=SOPStatus.DRAFT,
                description=description,
                component=component,
                purpose=purpose,
                created_date=now,
                last_modified=now,
                created_by=created_by,
                last_modified_by=created_by,
                steps=steps,
                prerequisites=[],
                tags=[component],
                content_hash=self._compute_hash(steps)
            )
            
            self.sops[sop_id] = sop
            self._save_sop(sop)
            
            self.logger.info(f"Created SOP: {sop_id} with {len(steps)} steps")
            self._log_operation("create_sop", sop_id, f"Created with {len(steps)} steps")
            
            return True, f"SOP created: {sop_id}"
        
        except Exception as e:
            msg = f"Failed to create SOP: {e}"
            self.logger.error(msg)
            return False, msg
    
    def execute_sop(self, sop_id: str, dry_run: bool = False) -> Tuple[bool, SOPExecution]:
        """Execute a complete SOP
        
        Args:
            sop_id: ID of SOP to execute
            dry_run: If True, don't actually execute commands
            
        Returns:
            (success, SOPExecution record)
        """
        if sop_id not in self.sops:
            return False, None
        
        sop = self.sops[sop_id]
        start_time = datetime.now()
        execution_id = f"{sop_id}_{int(start_time.timestamp())}"
        
        self.logger.info(f"Executing SOP: {sop_id} v{sop.version}")
        
        execution = SOPExecution(
            execution_id=execution_id,
            sop_id=sop_id,
            sop_version=sop.version,
            start_time=start_time.isoformat(),
            end_time=None,
            duration_seconds=0.0,
            status=StepStatus.RUNNING,
            steps_completed=0,
            steps_total=len(sop.steps),
            success_rate=0.0
        )
        
        failed_steps = []
        step_outputs = {}
        
        for step in sop.steps:
            self.logger.info(f"Step {step.step_number}: {step.name}")
            
            # Check dependencies
            if step.dependencies:
                deps_met = all(dep in execution.output for dep in step.dependencies)
                if not deps_met:
                    self.logger.warning(f"Dependencies not met for step {step.step_number}")
                    failed_steps.append(step.step_number)
                    continue
            
            # Execute step
            success, output = self._execute_step(step, dry_run)
            
            step_outputs[step.step_number] = output
            
            if success:
                execution.steps_completed += 1
                self.logger.info(f"  ✓ Step {step.step_number} completed")
            else:
                failed_steps.append(step.step_number)
                self.logger.error(f"  ✗ Step {step.step_number} failed")
                
                if not step.retry_on_failure:
                    break
        
        # Calculate metrics
        execution.output = step_outputs
        execution.failed_steps = failed_steps
        execution.success_rate = (execution.steps_completed / execution.steps_total * 100) if execution.steps_total > 0 else 0.0
        execution.status = StepStatus.COMPLETED if len(failed_steps) == 0 else StepStatus.FAILED
        execution.end_time = datetime.now().isoformat()
        execution.duration_seconds = (datetime.now() - start_time).total_seconds()
        
        # Update SOP metrics
        sop.execution_count += 1
        if execution.status == StepStatus.COMPLETED:
            sop.success_count += 1
        else:
            sop.failure_count += 1
        
        # Update average duration
        total_duration = (sop.average_duration * (sop.execution_count - 1)) + execution.duration_seconds
        sop.average_duration = total_duration / sop.execution_count
        
        # Save updated SOP
        self._save_sop(sop)
        
        # Record execution
        self.execution_history.append(execution)
        
        status_str = "✓ COMPLETED" if execution.status == StepStatus.COMPLETED else "✗ FAILED"
        self.logger.info(f"{status_str} - {execution.steps_completed}/{execution.steps_total} steps ({execution.success_rate:.1f}%)")
        
        self._log_operation("execute_sop", sop_id, f"{execution.status.value} - {execution.success_rate:.1f}% success")
        
        return execution.status == StepStatus.COMPLETED, execution
    
    def _execute_step(self, step: SOPStep, dry_run: bool = False) -> Tuple[bool, str]:
        """Execute a single step
        
        Args:
            step: Step to execute
            dry_run: If True, don't actually execute
            
        Returns:
            (success, output)
        """
        try:
            if dry_run:
                self.logger.info(f"    [DRY RUN] Would execute: {step.command}")
                return True, f"[DRY RUN] {step.command}"
            
            # Execute command
            result = subprocess.run(
                step.command,
                shell=True,
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                timeout=step.timeout_seconds
            )
            
            # Check validation if specified
            if step.validation_check and result.returncode == 0:
                validation_result = subprocess.run(
                    step.validation_check,
                    shell=True,
                    cwd=self.repo_root,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if validation_result.returncode != 0:
                    return False, f"Validation failed: {validation_result.stderr}"
            
            if result.returncode == 0:
                return True, result.stdout
            else:
                return False, f"Command failed: {result.stderr}"
        
        except subprocess.TimeoutExpired:
            return False, f"Command timeout after {step.timeout_seconds}s"
        except Exception as e:
            return False, f"Execution error: {e}"
    
    def validate_sop(self, sop_id: str, validator_agent: any = None) -> Tuple[bool, Dict]:
        """Validate SOP through execution
        
        Args:
            sop_id: SOP to validate
            validator_agent: Optional external validator
            
        Returns:
            (is_valid, validation_report)
        """
        if sop_id not in self.sops:
            return False, {"error": f"SOP not found: {sop_id}"}
        
        sop = self.sops[sop_id]
        
        self.logger.info(f"Validating SOP: {sop_id}")
        
        report = {
            "sop_id": sop_id,
            "validation_time": datetime.now().isoformat(),
            "checks": {
                "structure": self._validate_structure(sop),
                "syntax": self._validate_syntax(sop),
                "dependencies": self._validate_dependencies(sop),
                "completeness": self._validate_completeness(sop)
            },
            "execution_test": None,
            "validation_level": sop.validation_level.value
        }
        
        # Run test execution
        success, execution = self.execute_sop(sop_id, dry_run=True)
        report["execution_test"] = {
            "success": success,
            "steps_completed": execution.steps_completed if execution else 0,
            "success_rate": execution.success_rate if execution else 0.0
        }
        
        # Overall validation
        all_checks_pass = all(report["checks"].values())
        is_valid = all_checks_pass and report["execution_test"]["success"]
        
        if is_valid:
            sop.status = SOPStatus.VALIDATED
            self._save_sop(sop)
            self.logger.info(f"✓ SOP validated: {sop_id}")
        else:
            self.logger.warning(f"✗ SOP validation failed: {sop_id}")
        
        self._log_operation("validate_sop", sop_id, "valid" if is_valid else "invalid")
        
        return is_valid, report
    
    def refine_sop(self, sop_id: str, updates: Dict, refined_by: str = "validator") -> Tuple[bool, str]:
        """Refine SOP based on validation feedback
        
        Args:
            sop_id: SOP to refine
            updates: Dictionary of updates (step_number -> changes)
            refined_by: Who refined the SOP
            
        Returns:
            (success, message)
        """
        if sop_id not in self.sops:
            return False, f"SOP not found: {sop_id}"
        
        sop = self.sops[sop_id]
        
        try:
            self.logger.info(f"Refining SOP: {sop_id}")
            
            # Apply updates
            for step_num, changes in updates.items():
                step = next((s for s in sop.steps if s.step_number == step_num), None)
                if step:
                    for key, value in changes.items():
                        if hasattr(step, key):
                            setattr(step, key, value)
                            self.logger.info(f"  Updated step {step_num}.{key}")
            
            # Increment version
            version_parts = sop.version.split('.')
            version_parts[2] = str(int(version_parts[2]) + 1)
            sop.version = '.'.join(version_parts)
            
            # Update metadata
            sop.last_modified = datetime.now().isoformat()
            sop.last_modified_by = refined_by
            sop.content_hash = self._compute_hash(sop.steps)
            
            # Save refined SOP
            self._save_sop(sop)
            
            msg = f"SOP refined to v{sop.version}"
            self.logger.info(msg)
            self._log_operation("refine_sop", sop_id, msg)
            
            return True, msg
        
        except Exception as e:
            msg = f"Failed to refine SOP: {e}"
            self.logger.error(msg)
            return False, msg
    
    def rebuild_from_sop(self, sop_id: str) -> Tuple[bool, str]:
        """Rebuild component from SOP (complete rebuild)
        
        Args:
            sop_id: SOP to execute for rebuild
            
        Returns:
            (success, rebuild_summary)
        """
        if sop_id not in self.sops:
            return False, f"SOP not found: {sop_id}"
        
        sop = self.sops[sop_id]
        
        self.logger.info(f"Starting rebuild from SOP: {sop_id}")
        
        # Execute SOP
        success, execution = self.execute_sop(sop_id, dry_run=False)
        
        if success:
            summary = f"Rebuild successful: {execution.steps_completed}/{execution.steps_total} steps"
        else:
            summary = f"Rebuild failed at step {execution.failed_steps[0] if execution.failed_steps else 'unknown'}"
        
        self.logger.info(summary)
        return success, summary
    
    def _validate_structure(self, sop: SOPDefinition) -> bool:
        """Validate SOP structure"""
        # Check required fields
        if not sop.sop_id or not sop.name or not sop.steps:
            return False
        
        # Check steps are numbered correctly
        for i, step in enumerate(sop.steps, 1):
            if step.step_number != i:
                return False
        
        return True
    
    def _validate_syntax(self, sop: SOPDefinition) -> bool:
        """Validate SOP syntax"""
        for step in sop.steps:
            if not step.command or not step.name:
                return False
        
        return True
    
    def _validate_dependencies(self, sop: SOPDefinition) -> bool:
        """Validate SOP dependencies"""
        step_numbers = {s.step_number for s in sop.steps}
        
        for step in sop.steps:
            for dep in step.dependencies:
                if dep not in step_numbers or dep >= step.step_number:
                    return False
        
        return True
    
    def _validate_completeness(self, sop: SOPDefinition) -> bool:
        """Validate SOP completeness"""
        # All steps should have description
        for step in sop.steps:
            if not step.description:
                return False
        
        # SOP should have prerequisites or be simple
        if len(sop.steps) > 1 and not sop.prerequisites:
            # It's okay, some SOPs don't need prerequisites
            pass
        
        return True
    
    def _compute_hash(self, steps: List[SOPStep]) -> str:
        """Compute hash of SOP content"""
        content = json.dumps([asdict(s) for s in steps], sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _save_sop(self, sop: SOPDefinition):
        """Save SOP to disk"""
        try:
            sop_data = asdict(sop)
            sop_data["status"] = sop.status.value
            sop_data["validation_level"] = sop.validation_level.value
            
            filepath = self.sop_dir / f"{sop.sop_id}.json"
            
            with open(filepath, 'w') as f:
                json.dump(sop_data, f, indent=2)
            
            self.logger.info(f"Saved SOP: {sop.sop_id}")
        
        except Exception as e:
            self.logger.error(f"Failed to save SOP: {e}")
    
    def _log_operation(self, operation: str, sop_id: str, details: str):
        """Log operation"""
        self.operations_log.append({
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "sop_id": sop_id,
            "details": details
        })
    
    def get_sop(self, sop_id: str) -> Optional[Dict]:
        """Get SOP definition
        
        Args:
            sop_id: ID of SOP
            
        Returns:
            SOP dict or None
        """
        sop = self.sops.get(sop_id)
        if sop:
            return asdict(sop)
        return None
    
    def list_sops(self, component: str = None, status: str = None) -> List[Dict]:
        """List SOPs with optional filtering
        
        Args:
            component: Filter by component
            status: Filter by status
            
        Returns:
            List of SOP summaries
        """
        sops = list(self.sops.values())
        
        if component:
            sops = [s for s in sops if s.component == component]
        
        if status:
            sops = [s for s in sops if s.status.value == status]
        
        return [
            {
                "sop_id": s.sop_id,
                "name": s.name,
                "version": s.version,
                "status": s.status.value,
                "component": s.component,
                "steps": len(s.steps),
                "execution_count": s.execution_count,
                "success_rate": (s.success_count / s.execution_count * 100) if s.execution_count > 0 else 0.0
            }
            for s in sops
        ]
    
    def get_execution_history(self, sop_id: str = None, limit: int = 10) -> List[Dict]:
        """Get execution history
        
        Args:
            sop_id: Filter by SOP ID
            limit: Maximum results
            
        Returns:
            List of execution records
        """
        history = self.execution_history
        
        if sop_id:
            history = [e for e in history if e.sop_id == sop_id]
        
        return [asdict(e) for e in history[-limit:]]
    
    def export_sop_report(self, sop_id: str, filepath: str) -> bool:
        """Export SOP report
        
        Args:
            sop_id: SOP to export
            filepath: Output path
            
        Returns:
            True if successful
        """
        try:
            sop = self.sops.get(sop_id)
            if not sop:
                return False
            
            report = {
                "sop": asdict(sop),
                "execution_history": [
                    asdict(e) for e in self.execution_history 
                    if e.sop_id == sop_id
                ],
                "metrics": {
                    "total_executions": sop.execution_count,
                    "success_count": sop.success_count,
                    "failure_count": sop.failure_count,
                    "success_rate": (sop.success_count / sop.execution_count * 100) if sop.execution_count > 0 else 0.0,
                    "average_duration_seconds": sop.average_duration
                }
            }
            
            with open(filepath, 'w') as f:
                json.dump(report, f, indent=2)
            
            self.logger.info(f"Exported report to {filepath}")
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to export report: {e}")
            return False


if __name__ == "__main__":
    # Example usage
    agent = AutoSOPAgent()
    
    # Create an example SOP
    operations = [
        {
            "name": "Check git status",
            "description": "Verify repository is clean",
            "command": "git status --porcelain",
            "expected_output": ""
        },
        {
            "name": "Stage changes",
            "description": "Stage all changes",
            "command": "git add .",
            "dependencies": [1]
        },
        {
            "name": "Commit changes",
            "description": "Create commit",
            "command": 'git commit -m "automated commit"',
            "dependencies": [2]
        }
    ]
    
    success, msg = agent.create_sop_from_operations(
        sop_id="git_commit_workflow",
        name="Git Commit Workflow",
        description="Standard git commit workflow",
        component="git",
        purpose="Automate common git operations",
        operations=operations
    )
    
    print(f"Create SOP: {msg}")
    
    # List SOPs
    sops = agent.list_sops()
    print(f"\nAvailable SOPs: {len(sops)}")
    for sop in sops:
        print(f"  - {sop['name']} ({sop['steps']} steps)")
