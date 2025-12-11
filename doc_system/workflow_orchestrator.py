"""
WORKFLOW ORCHESTRATOR - Complete Workflow Management System
Orchestrates multi-stage workflows with agent coordination
Integrates code validation, git operations, and task tracking
"""

import json
import logging
from dataclasses import dataclass, asdict, field
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Callable
from pathlib import Path
from enum import Enum
import yaml
import time


class WorkflowStatus(Enum):
    """Workflow execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StageStatus(Enum):
    """Individual stage status"""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    BLOCKED = "blocked"


@dataclass
class StageResult:
    """Result of a stage execution"""
    stage_name: str
    status: StageStatus
    start_time: str
    end_time: str
    duration_seconds: float
    success: bool
    message: str
    error: Optional[str]
    artifacts: Dict[str, any] = field(default_factory=dict)
    agent_used: Optional[str] = None
    validation_passed: bool = True


@dataclass
class WorkflowExecution:
    """Complete workflow execution record"""
    workflow_id: str
    workflow_name: str
    status: WorkflowStatus
    start_time: str
    end_time: Optional[str]
    duration_seconds: float
    triggered_by: str
    stages: List[StageResult] = field(default_factory=list)
    total_stages: int = 0
    completed_stages: int = 0
    failed_stages: int = 0
    artifacts: Dict[str, any] = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class WorkflowStage:
    """Definition of a workflow stage"""
    name: str
    description: str
    agents: List[str]
    validation: str  # optional, required
    auto_commit: bool = False
    auto_push: bool = False
    skip_on_failure: bool = True
    parallel: bool = False
    timeout_seconds: int = 300
    retry_on_failure: bool = False
    max_retries: int = 1
    dependencies: List[str] = field(default_factory=list)


class WorkflowOrchestrator:
    """Manages workflow execution and stage coordination"""
    
    def __init__(self, repo_root: str = ".", config_path: str = None):
        """Initialize the workflow orchestrator
        
        Args:
            repo_root: Root directory of project
            config_path: Path to SYSTEM_REQUIREMENTS.yaml
        """
        self.repo_root = Path(repo_root)
        self.config_path = Path(config_path) if config_path else Path(repo_root) / "SYSTEM_REQUIREMENTS.yaml"
        self.logger = self._setup_logging()
        self.config = self._load_config()
        self.workflows_def = self._load_workflows()
        self.execution_history: List[WorkflowExecution] = []
        self.agents: Dict[str, any] = {}  # Will hold agent instances
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging"""
        logger = logging.getLogger("WorkflowOrchestrator")
        logger.setLevel(logging.INFO)
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        return logger
    
    def _load_config(self) -> Dict:
        """Load system requirements"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    return yaml.safe_load(f)
            return {}
        except Exception as e:
            self.logger.warning(f"Failed to load config: {e}")
            return {}
    
    def _load_workflows(self) -> Dict[str, List[WorkflowStage]]:
        """Load workflow definitions from config"""
        workflows = {}
        
        workflows_config = self.config.get("workflows", {})
        
        for workflow_name, workflow_def in workflows_config.items():
            stages = []
            for stage_def in workflow_def.get("stages", []):
                stage = WorkflowStage(
                    name=stage_def.get("stage"),
                    description=stage_def.get("description"),
                    agents=stage_def.get("agents", []),
                    validation=stage_def.get("validation", "optional"),
                    auto_commit=stage_def.get("auto_commit", False),
                    auto_push=stage_def.get("auto_push", False),
                    skip_on_failure=stage_def.get("skip_on_failure", True),
                    timeout_seconds=stage_def.get("timeout_seconds", 300)
                )
                stages.append(stage)
            
            workflows[workflow_name] = stages
        
        return workflows
    
    def register_agent(self, agent_name: str, agent_instance: any):
        """Register an agent for use in workflows
        
        Args:
            agent_name: Name of the agent
            agent_instance: Agent instance (must have required methods)
        """
        self.agents[agent_name] = agent_instance
        self.logger.info(f"Registered agent: {agent_name}")
    
    def list_workflows(self) -> List[str]:
        """List all available workflows"""
        return list(self.workflows_def.keys())
    
    def get_workflow_definition(self, workflow_name: str) -> Optional[List[WorkflowStage]]:
        """Get definition of a workflow
        
        Args:
            workflow_name: Name of the workflow
            
        Returns:
            List of WorkflowStage objects or None
        """
        return self.workflows_def.get(workflow_name)
    
    def execute_workflow(self, workflow_name: str, triggered_by: str = "manual",
                        context: Dict = None) -> Tuple[bool, WorkflowExecution]:
        """Execute a complete workflow
        
        Args:
            workflow_name: Name of workflow to execute
            triggered_by: What triggered this workflow
            context: Additional context data
            
        Returns:
            (success, WorkflowExecution record)
        """
        workflow_id = f"{workflow_name}_{int(time.time())}"
        start_time = datetime.now()
        
        self.logger.info(f"Starting workflow: {workflow_name} (ID: {workflow_id})")
        
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            workflow_name=workflow_name,
            status=WorkflowStatus.RUNNING,
            start_time=start_time.isoformat(),
            end_time=None,
            duration_seconds=0.0,
            triggered_by=triggered_by,
            total_stages=0,
            completed_stages=0,
            failed_stages=0
        )
        
        stages = self.get_workflow_definition(workflow_name)
        if not stages:
            msg = f"Workflow not found: {workflow_name}"
            self.logger.error(msg)
            execution.status = WorkflowStatus.FAILED
            execution.error = msg
            self.execution_history.append(execution)
            return False, execution
        
        execution.total_stages = len(stages)
        
        # Execute stages
        stage_results = []
        for i, stage in enumerate(stages):
            self.logger.info(f"[{i+1}/{len(stages)}] Executing stage: {stage.name}")
            
            # Check dependencies
            if stage.dependencies:
                deps_met = all(
                    any(r.stage_name == dep and r.status == StageStatus.PASSED for r in stage_results)
                    for dep in stage.dependencies
                )
                if not deps_met:
                    result = StageResult(
                        stage_name=stage.name,
                        status=StageStatus.BLOCKED,
                        start_time=datetime.now().isoformat(),
                        end_time=datetime.now().isoformat(),
                        duration_seconds=0.0,
                        success=False,
                        message=f"Dependencies not met: {', '.join(stage.dependencies)}",
                        error="Blocked by unmet dependencies"
                    )
                    stage_results.append(result)
                    execution.failed_stages += 1
                    
                    if stage.skip_on_failure:
                        self.logger.warning(f"Skipping {stage.name} due to failed dependencies")
                        continue
                    else:
                        break
            
            # Execute stage
            success, result = self._execute_stage(stage, context or {})
            stage_results.append(result)
            
            if success:
                execution.completed_stages += 1
            else:
                execution.failed_stages += 1
                
                if stage.validation == "required" and not success:
                    self.logger.error(f"Required stage failed: {stage.name}")
                    execution.status = WorkflowStatus.FAILED
                    self.execution_history.append(execution)
                    return False, execution
        
        # Finalize execution
        execution.stages = stage_results
        execution.status = WorkflowStatus.COMPLETED if execution.failed_stages == 0 else WorkflowStatus.FAILED
        execution.end_time = datetime.now().isoformat()
        execution.duration_seconds = (datetime.now() - start_time).total_seconds()
        
        self.execution_history.append(execution)
        
        status_str = "COMPLETED" if execution.status == WorkflowStatus.COMPLETED else "FAILED"
        self.logger.info(f"Workflow {status_str}: {workflow_name} ({execution.completed_stages}/{execution.total_stages} stages)")
        
        return execution.status == WorkflowStatus.COMPLETED, execution
    
    def _execute_stage(self, stage: WorkflowStage, context: Dict) -> Tuple[bool, StageResult]:
        """Execute a single stage
        
        Args:
            stage: WorkflowStage to execute
            context: Workflow context
            
        Returns:
            (success, StageResult)
        """
        start_time = datetime.now()
        
        try:
            self.logger.info(f"Stage {stage.name}: {stage.description}")
            self.logger.info(f"  Agents: {', '.join(stage.agents)}")
            self.logger.info(f"  Validation: {stage.validation}")
            
            # Track which agent executes
            agent_used = None
            
            # Execute agent operations
            success = True
            messages = []
            
            for agent_name in stage.agents:
                if agent_name not in self.agents:
                    self.logger.warning(f"Agent not registered: {agent_name}")
                    continue
                
                agent = self.agents[agent_name]
                agent_used = agent_name
                
                # Call agent's execute method
                if hasattr(agent, 'execute'):
                    try:
                        agent_result = agent.execute(stage, context)
                        if isinstance(agent_result, tuple):
                            agent_success, agent_msg = agent_result
                        else:
                            agent_success = agent_result
                            agent_msg = "Executed"
                        
                        if agent_success:
                            messages.append(f"{agent_name}: {agent_msg}")
                        else:
                            success = False
                            messages.append(f"{agent_name}: FAILED - {agent_msg}")
                    except Exception as e:
                        success = False
                        messages.append(f"{agent_name}: ERROR - {str(e)}")
                        self.logger.error(f"Agent {agent_name} error: {e}")
                else:
                    self.logger.warning(f"Agent {agent_name} doesn't have execute method")
            
            duration = (datetime.now() - start_time).total_seconds()
            message = "; ".join(messages) if messages else "No agents executed"
            
            result = StageResult(
                stage_name=stage.name,
                status=StageStatus.PASSED if success else StageStatus.FAILED,
                start_time=start_time.isoformat(),
                end_time=datetime.now().isoformat(),
                duration_seconds=duration,
                success=success,
                message=message,
                error=None if success else "Stage execution failed",
                agent_used=agent_used,
                validation_passed=success if stage.validation == "required" else True
            )
            
            status = "✓ PASSED" if success else "✗ FAILED"
            self.logger.info(f"  {status} ({duration:.2f}s)")
            
            return success, result
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            
            result = StageResult(
                stage_name=stage.name,
                status=StageStatus.FAILED,
                start_time=start_time.isoformat(),
                end_time=datetime.now().isoformat(),
                duration_seconds=duration,
                success=False,
                message="Exception during stage execution",
                error=str(e),
                validation_passed=False
            )
            
            self.logger.error(f"  ✗ FAILED - {e}")
            
            return False, result
    
    def execute_with_validation(self, workflow_name: str, validator_agent: any,
                               triggered_by: str = "manual") -> Tuple[bool, WorkflowExecution]:
        """Execute workflow with built-in validation
        
        Args:
            workflow_name: Workflow to execute
            validator_agent: Validation agent instance
            triggered_by: Trigger source
            
        Returns:
            (success, WorkflowExecution)
        """
        self.logger.info(f"Executing {workflow_name} with validation")
        
        # Register validator
        self.register_agent("code_validation", validator_agent)
        
        # Execute workflow
        success, execution = self.execute_workflow(workflow_name, triggered_by)
        
        return success, execution
    
    def execute_with_git(self, workflow_name: str, git_agent: any,
                        triggered_by: str = "manual") -> Tuple[bool, WorkflowExecution]:
        """Execute workflow with git agent
        
        Args:
            workflow_name: Workflow to execute
            git_agent: Git agent instance
            triggered_by: Trigger source
            
        Returns:
            (success, WorkflowExecution)
        """
        self.logger.info(f"Executing {workflow_name} with git integration")
        
        # Register git agent
        self.register_agent("auto_git", git_agent)
        
        # Execute workflow
        success, execution = self.execute_workflow(workflow_name, triggered_by)
        
        return success, execution
    
    def execute_integrated_workflow(self, workflow_name: str,
                                   code_validator: any,
                                   git_agent: any,
                                   doc_indexer: any = None,
                                   task_manager: any = None,
                                   triggered_by: str = "manual") -> Tuple[bool, WorkflowExecution]:
        """Execute workflow with all agents integrated
        
        Args:
            workflow_name: Workflow to execute
            code_validator: Code validation agent
            git_agent: Git agent
            doc_indexer: Document indexer (optional)
            task_manager: Task manager (optional)
            triggered_by: Trigger source
            
        Returns:
            (success, WorkflowExecution)
        """
        self.logger.info(f"Executing integrated workflow: {workflow_name}")
        
        # Register all agents
        self.register_agent("code_validation", code_validator)
        self.register_agent("auto_git", git_agent)
        if doc_indexer:
            self.register_agent("doc_indexing", doc_indexer)
        if task_manager:
            self.register_agent("task_management", task_manager)
        
        # Execute workflow
        success, execution = self.execute_workflow(workflow_name, triggered_by)
        
        return success, execution
    
    def get_execution_history(self, workflow_name: str = None, limit: int = 10) -> List[Dict]:
        """Get execution history
        
        Args:
            workflow_name: Filter by workflow (None for all)
            limit: Maximum number of results
            
        Returns:
            List of execution records
        """
        history = self.execution_history
        
        if workflow_name:
            history = [e for e in history if e.workflow_name == workflow_name]
        
        return [asdict(e) for e in history[-limit:]]
    
    def get_workflow_status(self, workflow_id: str) -> Optional[Dict]:
        """Get status of a specific workflow execution
        
        Args:
            workflow_id: Workflow execution ID
            
        Returns:
            Workflow execution record or None
        """
        for execution in self.execution_history:
            if execution.workflow_id == workflow_id:
                return asdict(execution)
        
        return None
    
    def get_stage_results(self, workflow_id: str) -> List[Dict]:
        """Get all stage results for a workflow
        
        Args:
            workflow_id: Workflow execution ID
            
        Returns:
            List of stage results
        """
        for execution in self.execution_history:
            if execution.workflow_id == workflow_id:
                return [asdict(s) for s in execution.stages]
        
        return []
    
    def create_custom_workflow(self, name: str, stages: List[Dict]) -> bool:
        """Create a custom workflow at runtime
        
        Args:
            name: Workflow name
            stages: List of stage definitions
            
        Returns:
            True if created successfully
        """
        try:
            workflow_stages = []
            
            for stage_def in stages:
                stage = WorkflowStage(
                    name=stage_def.get("name"),
                    description=stage_def.get("description", ""),
                    agents=stage_def.get("agents", []),
                    validation=stage_def.get("validation", "optional"),
                    auto_commit=stage_def.get("auto_commit", False),
                    auto_push=stage_def.get("auto_push", False)
                )
                workflow_stages.append(stage)
            
            self.workflows_def[name] = workflow_stages
            self.logger.info(f"Created custom workflow: {name} with {len(stages)} stages")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create workflow: {e}")
            return False
    
    def export_execution_report(self, workflow_id: str, filepath: str) -> bool:
        """Export workflow execution report
        
        Args:
            workflow_id: Workflow execution ID
            filepath: Output file path
            
        Returns:
            True if exported successfully
        """
        try:
            for execution in self.execution_history:
                if execution.workflow_id == workflow_id:
                    with open(filepath, 'w') as f:
                        json.dump(asdict(execution), f, indent=2)
                    
                    self.logger.info(f"Exported report to {filepath}")
                    return True
            
            self.logger.error(f"Workflow not found: {workflow_id}")
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to export report: {e}")
            return False
    
    def get_system_requirements(self) -> Dict:
        """Get system requirements and specifications
        
        Returns:
            System requirements dictionary
        """
        return {
            "workflows": list(self.workflows_def.keys()),
            "agents": list(self.agents.keys()),
            "git_config": self.config.get("git", {}),
            "code_config": self.config.get("code", {}),
            "ai_stack": self.config.get("ai_stack", {}),
            "validation_rules": self.config.get("validation", {})
        }


if __name__ == "__main__":
    # Example usage
    orchestrator = WorkflowOrchestrator()
    
    # List available workflows
    workflows = orchestrator.list_workflows()
    print(f"Available workflows: {workflows}")
    
    # Get workflow definition
    if "feature_development" in workflows:
        stages = orchestrator.get_workflow_definition("feature_development")
        print(f"\nFeature development workflow:")
        for stage in stages:
            print(f"  - {stage.name}: {stage.description}")
