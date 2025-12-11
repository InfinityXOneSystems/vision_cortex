# Vision Cortex SOP System Guide

## Table of Contents

1. [Overview](#overview)
2. [SOP Lifecycle](#sop-lifecycle)
3. [Auto SOP Agent](#auto-sop-agent)
4. [Validation System](#validation-system)
5. [Refinement Process](#refinement-process)
6. [Usage Examples](#usage-examples)
7. [Integration with Workflows](#integration-with-workflows)
8. [Metrics and Reporting](#metrics-and-reporting)
9. [Best Practices](#best-practices)

## Overview

The Vision Cortex SOP (Standard Operating Procedure) system provides comprehensive tracking, execution, validation, and refinement of all operations. This creates a complete audit trail and enables reproducible rebuilds from tracked procedures.

### Key Components

**Auto SOP Agent** (`auto_sop_agent.py`)
- Creates SOPs from recorded operations
- Executes SOPs with step tracking
- Maintains execution history and metrics
- Enables complete rebuilds from stored procedures

**SOP Validator & Refiner** (`sop_validator_refiner.py`)
- Validates SOP structure, syntax, logic, efficiency
- Generates quality scores and approval status
- Suggests improvements based on execution results
- Guides refinement process for continuous improvement

### Core Data Structures

```python
# SOP Definition - stores the procedure
SOPDefinition(
    sop_id: str                          # Unique identifier
    name: str                            # Human-readable name
    version: str                         # Semantic versioning (e.g., 1.0.0)
    status: SOPStatus                    # draft, validated, in_use, deprecated
    description: str                     # What the SOP does
    component: str                       # Which system component
    purpose: str                         # Why it exists
    
    steps: List[SOPStep]                 # Procedure steps
    prerequisites: List[str]             # Required conditions
    tags: List[str]                      # Categorization tags
    
    validation_level: ValidationLevel    # PERMISSIVE, MODERATE, STRICT, CERTIFIED
    
    # Metrics
    execution_count: int                 # Total executions
    success_count: int                   # Successful executions
    failure_count: int                   # Failed executions
    average_duration: float              # Avg execution time (seconds)
    
    # Audit
    created_date: str                    # ISO 8601 timestamp
    created_by: str                      # Creator name
    last_modified: str                   # Last modification date
    last_modified_by: str                # Last person to modify
    
    content_hash: str                    # SHA256 of steps for integrity
)

# Individual Step
SOPStep(
    step_number: int                     # Sequential order (1, 2, 3...)
    name: str                            # Step name
    description: str                     # What it does
    command: str                         # Command to execute
    component: str                       # Which component
    
    expected_output: str                 # What success looks like
    validation_check: str                # Command to verify success
    rollback_command: str                # How to undo if failed
    
    timeout_seconds: int = 300           # Max execution time
    retry_on_failure: bool = False       # Auto-retry?
    max_retries: int = 3                 # Max retry attempts
    
    dependencies: List[int]              # Step numbers this depends on
    tags: List[str]                      # Step categorization
)

# Execution Record
SOPExecution(
    execution_id: str                    # Unique execution ID
    sop_id: str                          # Which SOP was executed
    sop_version: str                     # Which version
    
    start_time: str                      # When it started
    end_time: str                        # When it finished
    duration_seconds: float              # Total time
    
    status: StepStatus                   # completed, failed, skipped
    
    steps_completed: int                 # How many steps finished
    success_rate: float                  # Percentage successful
    
    output: Dict[int, str]               # Step outputs
    failed_steps: List[int]              # Which steps failed
    error: Optional[str]                 # Error message if failed
)

# Validation Report
ValidationReport(
    validation_id: str                   # Unique validation ID
    sop_id: str                          # Which SOP
    sop_version: str                     # Which version
    
    validation_date: str                 # When validated
    validator_name: str                  # Who validated
    
    total_findings: int                  # Number of issues found
    errors: int                          # Critical issues
    warnings: int                        # Should review
    infos: int                           # Information
    suggestions: int                     # Could improve
    
    overall_quality_score: float         # 0-100 score
    is_approved: bool                    # Pass/fail validation
    
    findings: List[ValidationFinding]    # Detailed findings
    recommendations: List[str]           # What to do next
    refinement_plan: Dict                # How to fix issues
)
```

## SOP Lifecycle

### 1. Creation Phase

Create SOP from recorded operations:

```python
# Record operations during normal work
operations = [
    {"command": "git status", "output": "..."},
    {"command": "git add src/", "output": "..."},
    {"command": "git commit -m 'feat: new feature'", "output": "..."},
    {"command": "git push", "output": "..."}
]

# Create SOP from operations
agent = AutoSOPAgent(repo_root=".", sop_dir="doc_system/sops")

success, message = agent.create_sop_from_operations(
    sop_id="push_feature_sop",
    name="Push Feature to Remote",
    description="Complete workflow for pushing a new feature",
    component="git",
    purpose="Enable reproducible feature deployment",
    operations=operations
)

# Result: SOP stored with status=DRAFT
```

### 2. Validation Phase

Validate SOP structure and execute test run:

```python
# Run comprehensive validation
validator = SOPValidator(validator_name="qa_validator")

validation_report = validator.validate_sop_comprehensive(sop_data)

print(f"Quality Score: {validation_report.overall_quality_score}%")
print(f"Status: {'APPROVED' if validation_report.is_approved else 'NEEDS WORK'}")
print(f"Errors: {validation_report.errors}")
print(f"Warnings: {validation_report.warnings}")

# Review findings
for finding in validation_report.findings:
    print(f"  - [{finding.finding_type}] {finding.message}")
    print(f"    Recommendation: {finding.recommendation}")
```

### 3. Refinement Phase

Fix issues and improve SOP quality:

```python
# Get refinement suggestions
refiner = SOPRefiner()
improvements = refiner.suggest_improvements(sop_data, validation_report)

for improvement in improvements:
    print(f"Step {improvement['step']}: {improvement['current_issue']}")
    print(f"  Suggested: {improvement['suggested_improvement']}")

# Apply refinements
refined_sop = refiner.refine_from_validation(sop_data, validation_report)

# Update SOP with refinements
success, message = agent.refine_sop(
    sop_id="push_feature_sop",
    updates={0: {"description": "Improved description"}},
    refined_by="developer_name"
)

# Result: Version incremented (1.0.0 → 1.0.1), last_modified updated
```

### 4. Approval Phase

Mark SOP as validated and ready for use:

```python
# After refinement passes validation
sop_data["status"] = "VALIDATED"
sop_data["validation_level"] = "MODERATE"

# Store validated SOP (auto-increments version to next minor: 1.0.1 → 1.1.0)
agent._save_sop(sop_data)
```

### 5. Execution Phase

Execute SOP for operations:

```python
# Execute SOP for actual work
success, execution = agent.execute_sop(
    sop_id="push_feature_sop",
    dry_run=False  # False = actually execute, True = test only
)

# SOP metrics auto-update:
# - execution_count += 1
# - success_count += 1 (if succeeded)
# - average_duration recalculated

print(f"Execution Status: {execution.status}")
print(f"Duration: {execution.duration_seconds}s")
print(f"Success Rate: {execution.success_rate * 100}%")
```

### 6. Refinement Cycle

Continuous improvement based on real-world execution:

```python
# After multiple executions, re-validate
validation_report = validator.validate_sop_comprehensive(
    sop_data,
    execution_results=execution.__dict__
)

# If execution failed, findings include errors
if validation_report.errors > 0:
    # Refine to fix execution issues
    refined_sop = refiner.refine_from_validation(sop_data, validation_report)
    agent.refine_sop(sop_id, updates, refined_by)
```

### 7. Promotion Phase

As SOP matures, increase validation level:

```python
# After reaching validation level thresholds:
# PERMISSIVE (1+ execution) → MODERATE (3+) → STRICT (10+ at 95%+) → CERTIFIED (50+ at 99%+)

if sop_data["execution_count"] >= 3 and sop_data["success_count"] / sop_data["execution_count"] >= 0.95:
    sop_data["validation_level"] = "MODERATE"
    agent._save_sop(sop_data)
```

## Auto SOP Agent

### Core Methods

#### create_sop_from_operations()

Convert recorded operations into a standard procedure:

```python
def create_sop_from_operations(
    self,
    sop_id: str,
    name: str,
    description: str,
    component: str,
    purpose: str,
    operations: List[Dict]
) -> Tuple[bool, str]:
    """
    Args:
        sop_id: Unique identifier (e.g., "git_push_sop")
        name: Human-readable name
        description: What the SOP accomplishes
        component: System component (e.g., "git", "validation", "deployment")
        purpose: Why this SOP exists
        operations: List of operations with commands and outputs
    
    Returns:
        (success: bool, message: str)
    
    Side Effects:
        - Saves SOP to disk as JSON
        - Returns with status=DRAFT
        - Calculates content_hash
        - Sets version=1.0.0
    """
    # Converts each operation to SOPStep with proper numbering
    # Assigns empty dependencies (first run)
    # Computes SHA256 hash of steps
    # Creates SOPDefinition with metadata
    # Saves to doc_system/sops/{sop_id}.json
    pass
```

#### execute_sop()

Execute a complete SOP with step tracking:

```python
def execute_sop(
    self,
    sop_id: str,
    dry_run: bool = False
) -> Tuple[bool, SOPExecution]:
    """
    Args:
        sop_id: Which SOP to execute
        dry_run: True = test without real execution, False = actual execution
    
    Returns:
        (success: bool, execution: SOPExecution)
    
    Process:
        1. Load SOP definition
        2. Validate dependencies
        3. For each step:
           a. Check if dependencies met
           b. Execute command
           c. Run validation_check
           d. Track output
           e. Handle failures (retry if configured)
        4. Calculate metrics
        5. Update SOP statistics
        6. Save execution record
    """
    pass
```

#### validate_sop()

Multi-level SOP validation:

```python
def validate_sop(
    self,
    sop_id: str,
    validator_agent: SOPValidator = None
) -> Tuple[bool, Dict]:
    """
    Multi-level validation:
    
    1. Structure Validation
       - Check required fields
       - Verify step numbering
       - Validate field types
    
    2. Syntax Validation
       - Command syntax
       - Variable references
       - Line endings
    
    3. Logic Validation
       - Dependency relationships
       - No circular dependencies
       - Forward references only
    
    4. Completeness Validation
       - Descriptions present
       - Prerequisites listed
       - Rollback commands
    
    5. Execution Test
       - Dry-run execution
       - Capture any errors
       - Validate outputs
    
    Returns:
        (is_valid: bool, report: Dict with validation details)
    
    Side Effects:
        - Updates SOP status to VALIDATED if all pass
        - Logs all validation errors
        - Records validation_id in SOP metadata
    """
    pass
```

#### refine_sop()

Update SOP with refinements and version bump:

```python
def refine_sop(
    self,
    sop_id: str,
    updates: Dict[int, Dict],  # {step_number: {field: value}}
    refined_by: str
) -> Tuple[bool, str]:
    """
    Args:
        sop_id: Which SOP to refine
        updates: Dict mapping step numbers to field updates
        refined_by: Name of person refining
    
    Returns:
        (success: bool, message: str)
    
    Side Effects:
        - Applies updates to specified steps
        - Increments patch version (1.0.0 → 1.0.1)
        - Updates last_modified and last_modified_by
        - Recomputes content_hash
        - Saves updated SOP
        - Records refinement in history
    """
    pass
```

#### rebuild_from_sop()

Execute SOP for complete rebuild:

```python
def rebuild_from_sop(
    self,
    sop_id: str
) -> Tuple[bool, str]:
    """
    Execute stored SOP from start to finish for complete rebuild.
    
    Returns:
        (success: bool, summary: str)
    
    Example use:
        - Disaster recovery (rebuild system from SOP)
        - New environment setup (use existing SOP)
        - Verification (rerun procedure to validate)
    """
    pass
```

### Other Methods

```python
# List and filter SOPs
list_sops(component: str = None, status: str = None) -> List[SOPDefinition]

# Retrieve SOP
get_sop(sop_id: str) -> Optional[SOPDefinition]

# Get execution history
get_execution_history(sop_id: str, limit: int = 10) -> List[SOPExecution]

# Export detailed report
export_sop_report(sop_id: str, filepath: str) -> Tuple[bool, str]
```

## Validation System

### Validation Categories

**1. Structure Validation**

Checks that SOP has required fields and correct format:

```
✓ Required fields present (sop_id, name, version, steps)
✓ Step numbering is sequential (1, 2, 3...)
✓ All steps properly formatted
✓ Version follows semantic versioning (X.Y.Z)
```

**2. Syntax Validation**

Ensures commands and references are syntactically correct:

```
✓ Every step has a command
✓ Every step has a name
✓ Every step has a description
✓ Command syntax is valid
✓ Variables are properly referenced
```

**3. Logic Validation**

Verifies steps flow logically:

```
✓ Dependencies reference existing steps
✓ No circular dependencies
✓ Forward-only references (step 5 depends on step 1-4, not 6)
✓ Validation checks are valid commands
✓ Rollback commands are valid
```

**4. Efficiency Validation**

Checks SOP can execute efficiently:

```
✓ Not too many steps (>50 suggests breaking up)
✓ Timeout values are reasonable
✓ Dependencies don't create bottlenecks
✓ No redundant steps
```

**5. Clarity Validation**

Ensures SOP is understandable:

```
✓ Description is detailed (>20 chars)
✓ Prerequisites listed
✓ Step descriptions are clear (>10 chars)
✓ Component is specified
✓ Purpose is clear
```

### Quality Scoring

Quality score ranges 0-100:

```
100: Perfect (no findings)
80-99: Approved (no errors, minor issues)
60-79: Needs work (warnings or suggestions)
0-59: Rejected (critical errors)
```

Points deducted:
- Error: -5 to -10 depending on severity
- Warning: -1 to -5
- Suggestion: -0.5

### Approval Criteria

SOP is approved if:
- No errors (errors == 0)
- Quality score >= 80
- All dependencies validated
- Dry-run execution successful

## Refinement Process

### Automatic Refinement

Certain fixes can be applied automatically:

```python
# Examples:
- Fix step numbering (1, 3, 4 → 1, 2, 3)
- Update last_modified timestamp
- Recompute content_hash
- Add missing descriptions (from execution analysis)
```

### Manual Refinement

Complex changes require human review:

```python
# Refiner provides:
- Clear identification of each issue
- Specific recommendation for each finding
- Priority level (based on severity)
- Suggested replacement text/commands
```

### Refinement Workflow

```
1. Execute SOP → get SOPExecution
2. Validate SOP → get ValidationReport
3. Review findings → identify fixes needed
4. Apply refinements → call refine_sop()
5. Re-validate → confirm fixes worked
6. Repeat until is_approved == True
```

## Usage Examples

### Example 1: Create and Execute Feature Deployment SOP

```python
from doc_system.auto_sop_agent import AutoSOPAgent
from doc_system.sop_validator_refiner import SOPValidator

# Initialize
agent = AutoSOPAgent(repo_root=".", sop_dir="doc_system/sops")
validator = SOPValidator(validator_name="qa_team")

# Step 1: Record operations during first deployment
operations = [
    {"command": "git checkout -b feature/new-feature", "output": "..."},
    {"command": "npm run build", "output": "..."},
    {"command": "npm run test", "output": "..."},
    {"command": "git commit -am 'feat: new feature'", "output": "..."},
    {"command": "git push origin feature/new-feature", "output": "..."}
]

# Step 2: Create SOP from operations
success, msg = agent.create_sop_from_operations(
    sop_id="deploy_feature_sop",
    name="Deploy New Feature",
    description="Complete workflow for deploying a new feature to production",
    component="deployment",
    purpose="Enable reproducible feature deployments",
    operations=operations
)
print(f"SOP Created: {msg}")

# Step 3: Validate SOP
validation_report = validator.validate_sop_comprehensive(
    sop_data=agent.get_sop("deploy_feature_sop").__dict__
)

print(f"Quality Score: {validation_report.overall_quality_score}%")
print(f"Status: {'APPROVED' if validation_report.is_approved else 'NEEDS WORK'}")

# Step 4: Execute SOP for real deployment
success, execution = agent.execute_sop("deploy_feature_sop", dry_run=False)

print(f"Execution: {'SUCCESS' if success else 'FAILED'}")
print(f"Duration: {execution.duration_seconds}s")
print(f"Success Rate: {execution.success_rate * 100}%")
```

### Example 2: Refine SOP Based on Validation Feedback

```python
from doc_system.sop_validator_refiner import SOPRefiner

# Get current SOP and validation report
sop_data = agent.get_sop("deploy_feature_sop").__dict__
validation_report = validator.validate_sop_comprehensive(sop_data)

# Step 1: Review suggestions
refiner = SOPRefiner()
suggestions = refiner.suggest_improvements(sop_data, validation_report)

for suggestion in suggestions:
    print(f"Step {suggestion['step']}: {suggestion['suggested_improvement']}")

# Step 2: Apply refinements
success, msg = agent.refine_sop(
    sop_id="deploy_feature_sop",
    updates={
        0: {"description": "Improved description of first step"},
        2: {"timeout_seconds": 600}  # Longer timeout for tests
    },
    refined_by="qa_team"
)

# Step 3: Re-validate refined SOP
refined_sop = agent.get_sop("deploy_feature_sop")
validation_report = validator.validate_sop_comprehensive(refined_sop.__dict__)

print(f"New Quality Score: {validation_report.overall_quality_score}%")
print(f"Approved: {validation_report.is_approved}")
```

### Example 3: Rebuild System from SOP

```python
# Disaster recovery - rebuild system from stored SOP
success, summary = agent.rebuild_from_sop("deploy_feature_sop")

if success:
    print("System successfully rebuilt from SOP")
    print(summary)
else:
    print("Rebuild failed - check logs for details")

# Get execution details
execution_history = agent.get_execution_history("deploy_feature_sop", limit=5)
for execution in execution_history:
    print(f"  {execution.execution_id}: {execution.status} ({execution.duration_seconds}s)")
```

### Example 4: Export SOP Report

```python
# Generate comprehensive SOP report
success, filepath = agent.export_sop_report(
    sop_id="deploy_feature_sop",
    filepath="reports/deploy_feature_report.json"
)

# Report includes:
# - SOP definition and metadata
# - Execution history with timestamps
# - Metrics (success rate, average duration)
# - Validation history
# - Refinement history
```

## Integration with Workflows

### Workflow → SOP Creation

When a workflow completes successfully, it can create an SOP:

```python
from workflow_orchestrator import WorkflowOrchestrator
from auto_sop_agent import AutoSOPAgent

orchestrator = WorkflowOrchestrator()
sop_agent = AutoSOPAgent()

# Execute workflow
success, execution = orchestrator.execute_workflow("feature_development")

# If workflow succeeded, create SOP
if success:
    operations = execution.extract_operations()  # Get recorded ops
    
    sop_agent.create_sop_from_operations(
        sop_id=f"sop_{execution.workflow_id}",
        name=f"SOP for {execution.workflow_name}",
        description=f"Created from {execution.workflow_name} workflow",
        component=execution.component,
        purpose="Enable reproducible execution",
        operations=operations
    )
```

### Workflow → SOP Execution

Instead of defining steps in workflow, execute SOP:

```python
# In workflow definition
{
    "stage_name": "execute_procedure",
    "description": "Execute SOP for known procedure",
    "type": "sop",
    "sop_id": "deploy_feature_sop",
    "dry_run": False
}

# Workflow orchestrator would:
# 1. Load SOP
# 2. Execute via auto_sop_agent.execute_sop()
# 3. Track results
```

## Metrics and Reporting

### Per-SOP Metrics

```python
SOP metrics include:
- execution_count: Total times run (0, 1, 5, 100+...)
- success_count: Successful executions
- failure_count: Failed executions
- average_duration: Average execution time in seconds
- success_rate: success_count / execution_count
- last_execution: Timestamp of most recent run
- validation_level: PERMISSIVE → CERTIFIED
```

### System-Wide Metrics

```python
# Get all SOP metrics
total_sops = agent.list_sops().__len__()
total_executions = sum(sop.execution_count for sop in agent.list_sops())
total_successes = sum(sop.success_count for sop in agent.list_sops())
total_failures = sum(sop.failure_count for sop in agent.list_sops())

# Calculate system reliability
system_success_rate = total_successes / total_executions if total_executions > 0 else 0
```

### Reporting

```python
# Export comprehensive report
agent.export_sop_report(sop_id, filepath)

# Report includes:
{
    "sop_definition": {...},
    "execution_history": [...],
    "metrics": {
        "total_executions": 42,
        "success_count": 40,
        "failure_count": 2,
        "success_rate": 0.952,
        "average_duration_seconds": 45.3,
        "validation_level": "CERTIFIED"
    },
    "validation_history": [...],
    "refinement_history": [...]
}
```

## Best Practices

### 1. SOP Naming Convention

```
{action}_{component}_sop

Examples:
- push_feature_sop
- validate_code_sop
- deploy_service_sop
- backup_database_sop
```

### 2. Step Design

```
✓ One responsibility per step (don't combine operations)
✓ Clear, measurable expected_output
✓ Validation check that verifies success
✓ Reasonable timeout (300s default)
✓ Meaningful step names and descriptions
```

### 3. Error Handling

```
✓ Include rollback_command for critical steps
✓ Set retry_on_failure=True for flaky operations
✓ Include validation_check to verify each step
✓ Use dependencies to prevent out-of-order execution
```

### 4. Documentation

```
✓ Write description (>20 chars) explaining purpose
✓ List prerequisites that must be met
✓ Document component and purpose
✓ Tag related SOPs for easy discovery
```

### 5. Refinement Cycle

```
✓ Validate before marking as in_use
✓ Review execution failures and refine
✓ Increase validation_level as confidence grows
✓ Archive old versions instead of deleting
```

### 6. Integration with Workflows

```
✓ Create SOP after successful workflow execution
✓ Use SOPs to replace manual workflow steps
✓ Update SOP when workflow process changes
✓ Execute via agent.execute_sop() for consistency
```

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintained By**: Vision Cortex Team
