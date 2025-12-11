# AUTO-COMMIT, PUSH & WORKFLOW SYSTEM DOCUMENTATION
## Complete Workflow Automation with Mandatory System Requirements

**Version**: 1.0.0  
**Status**: PRODUCTION READY  
**Date**: December 11, 2025

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Details](#component-details)
4. [Workflow System](#workflow-system)
5. [Auto-Commit & Push](#auto-commit--push)
6. [Configuration](#configuration)
7. [Usage Examples](#usage-examples)
8. [Integration Guide](#integration-guide)
9. [Troubleshooting](#troubleshooting)

---

## OVERVIEW

The Vision Cortex Auto-Commit & Workflow System provides:

- **Automatic Git Operations**: Intelligent staging, committing, and pushing
- **Workflow Orchestration**: Multi-stage workflows with agent coordination
- **Mandatory Requirements**: Every agent always knows system specs
- **Complete Integration**: All subsystems work together seamlessly
- **Full Automation**: From code validation to remote push in one command

### Key Features

✅ **Auto-Commit with Conventional Messages**
- Automatic commit message generation following conventional format
- Smart message composition based on changes made
- Support for breaking changes, issue closing, footers

✅ **Intelligent Push Strategy**
- Immediate push on validation success
- Batching for multiple commits
- Retry logic with exponential backoff
- Force push capability

✅ **Complete Workflow Orchestration**
- 7+ predefined workflows (feature, bugfix, documentation, etc.)
- Custom workflow creation at runtime
- Stage dependencies and parallel execution
- Comprehensive logging and reporting

✅ **Mandatory System Requirements**
- Every agent receives system specs at initialization
- Git configuration enforcement
- Code language requirements
- AI/ML stack specifications
- Validation rules binding

✅ **Agent Coordination**
- Central configuration loader
- Unified agent context
- Cross-agent communication
- Shared operation logging

---

## SYSTEM ARCHITECTURE

```
Vision Cortex System Architecture
│
├─ SYSTEM_REQUIREMENTS.yaml (mandatory config)
│  ├─ System specifications
│  ├─ Git configuration
│  ├─ Code language specs
│  ├─ Agent requirements
│  ├─ Workflow definitions
│  └─ Validation rules
│
├─ AutoGitAgent (auto_git_agent.py)
│  ├─ Git status checking
│  ├─ File staging
│  ├─ Commit creation with conventional format
│  ├─ Push execution with retry logic
│  └─ Operation logging
│
├─ WorkflowOrchestrator (workflow_orchestrator.py)
│  ├─ Workflow execution
│  ├─ Stage management
│  ├─ Agent coordination
│  ├─ Dependency handling
│  └─ Execution reporting
│
├─ AgentConfigurationLoader (agent_config_loader.py)
│  ├─ Configuration loading
│  ├─ Agent context building
│  ├─ System validation
│  └─ Requirement enforcement
│
└─ EnhancedUnifiedOrchestrator (enhanced_unified_orchestrator.py)
   ├─ Complete workflow execution
   ├─ Multi-stage coordination
   ├─ Integration management
   └─ System reporting
```

---

## COMPONENT DETAILS

### 1. SYSTEM_REQUIREMENTS.yaml

**Purpose**: Single source of truth for all system specifications

**Mandatory Sections**:

```yaml
system:
  name: "Vision Cortex"
  version: "1.0.0"
  paths: {...}  # All project paths
  
git:
  required: true
  auto_push: true
  commit_format: "conventional"
  templates: {...}  # Message templates
  
code:
  languages:  # Python, JavaScript, JSON, Markdown
    python: {...}
    javascript: {...}
    
ai_stack:
  enabled: true
  models: {...}
  providers: {...}
  
agents:
  code_validation: {...}
  auto_git: {...}
  doc_indexing: {...}
  task_management: {...}
  
workflows:
  feature_development: {...}
  bug_fix: {...}
  documentation: {...}
  complete_work_item: {...}
  
validation:
  required_checks: {...}
  fail_conditions: [...]
  warning_conditions: [...]
```

### 2. AutoGitAgent

**Purpose**: Automated git operations with validation

**Key Classes**:

```python
class AutoGitAgent:
    def get_status() -> (bool, GitStatus)
    def stage_files(files: List[str]) -> (bool, str)
    def stage_all() -> (bool, str)
    def commit(config: CommitConfig) -> (bool, str, sha)
    def push(config: PushConfig) -> (bool, str)
    def commit_and_push() -> (bool, str)
    def validate_commit_message(msg: str) -> (bool, str)
    def get_git_log(count: int) -> List[Dict]
```

**Usage**:

```python
from auto_git_agent import AutoGitAgent, CommitConfig, CommitType

# Initialize agent
agent = AutoGitAgent(repo_root=".")

# Check status
success, status = agent.get_status()
print(f"Modified files: {status.modified_files}")

# Create commit
config = CommitConfig(
    type=CommitType.FEAT,
    component="api",
    description="Add user authentication",
    auto_push=True
)

success, msg, sha = agent.commit(config)
```

### 3. WorkflowOrchestrator

**Purpose**: Manage multi-stage workflows with agent coordination

**Key Classes**:

```python
class WorkflowOrchestrator:
    def list_workflows() -> List[str]
    def get_workflow_definition(name: str) -> List[WorkflowStage]
    def execute_workflow(name: str, triggered_by: str) -> (bool, WorkflowExecution)
    def execute_with_validation(name: str, validator) -> (bool, WorkflowExecution)
    def execute_with_git(name: str, git_agent) -> (bool, WorkflowExecution)
    def execute_integrated_workflow(...) -> (bool, WorkflowExecution)
    def create_custom_workflow(name: str, stages: List[Dict]) -> bool
    def get_execution_history(workflow_name: str) -> List[Dict]
```

**Built-in Workflows**:

| Workflow | Stages | Use Case |
|----------|--------|----------|
| feature_development | plan → design → implement → validate → review → merge → document → complete | New features |
| bug_fix | identify → implement → test → deploy → verify | Bug fixes |
| documentation | update → validate → commit | Doc updates |
| complete_work_item | validate → commit → update_docs → mark_complete → push | Finish work |

### 4. AgentConfigurationLoader

**Purpose**: Load and manage system requirements for all agents

**Key Classes**:

```python
class AgentConfigurationLoader:
    def get_agent_config(agent_name: str) -> AgentConfig
    def get_all_agent_configs() -> Dict[str, AgentConfig]
    def get_required_agents() -> List[str]
    def validate_agent_setup(agent_name: str) -> (bool, List[str])
    def get_agent_context(agent_name: str) -> Dict
    def get_mandatory_requirements() -> Dict
    def validate_environment() -> (bool, List[str])
```

**Usage**:

```python
from agent_config_loader import AgentConfigurationLoader

# Initialize loader
loader = AgentConfigurationLoader("SYSTEM_REQUIREMENTS.yaml")

# Get agent context (includes all system specs)
context = loader.get_agent_context("code_validation")

# Validate setup
is_valid, errors = loader.validate_environment()

# Get mandatory requirements
reqs = loader.get_mandatory_requirements()
```

### 5. EnhancedUnifiedOrchestrator

**Purpose**: Central orchestration of all systems

**Key Methods**:

```python
class EnhancedUnifiedOrchestrator:
    def initialize_all_components() -> (bool, str)
    def validate_system_setup() -> (bool, List[str])
    def execute_feature_workflow(name: str, component: str) -> (bool, workflow_id)
    def execute_bug_fix_workflow(bug_id: str, component: str) -> (bool, workflow_id)
    def execute_complete_work_item_workflow(...) -> (bool, workflow_id)
    def validate_and_commit_all(component: str, message: str) -> (bool, sha)
    def get_system_status() -> Dict
    def get_required_agents_context() -> Dict
    def export_system_report(filepath: str) -> bool
```

---

## WORKFLOW SYSTEM

### Predefined Workflows

#### 1. Feature Development

```
Stage 1: Plan
  - Create roadmap item
  - Create design document
  - Create todo
  ↓
Stage 2: Design
  - Index design document
  - Create architecture doc
  ↓
Stage 3: Implement
  - Write code
  - Auto-validate
  - Stage changes
  ↓
Stage 4: Validate
  - Run code validation
  - Check tests
  - Verify syntax
  ↓
Stage 5: Review
  - Code review (manual)
  - Update documentation
  ↓
Stage 6: Merge
  - Create commit
  - Push to main
  ↓
Stage 7: Document
  - Update documentation
  - Commit docs
  ↓
Stage 8: Complete
  - Mark roadmap item complete
  - Mark todo complete
  - Push final changes
```

**Execution**:
```python
success, execution = orchestrator.execute_feature_workflow(
    feature_name="user_authentication",
    component="api"
)
```

#### 2. Bug Fix

```
Stage 1: Identify
  - Document bug
  - Create issue
  - Create todo
  ↓
Stage 2: Implement
  - Fix bug
  - Auto-validate
  ↓
Stage 3: Test
  - Run tests
  - Verify fix
  ↓
Stage 4: Deploy
  - Create commit
  - Push to main
  ↓
Stage 5: Verify
  - Test in environment
  - Close issue
  - Mark complete
```

#### 3. Complete Work Item

```
Stage 1: Validate
  - Code validation (REQUIRED)
  ↓
Stage 2: Commit
  - Create conventional commit
  - Auto-generated message
  ↓
Stage 3: Push
  - Push to remote (REQUIRED)
  ↓
Stage 4: Update Docs
  - Update documentation
  - Re-index docs
  ↓
Stage 5: Mark Complete
  - Update roadmap status
  - Update todo status
  - Close tracking items
```

---

## AUTO-COMMIT & PUSH

### Commit Configuration

```python
from auto_git_agent import CommitConfig, CommitType

config = CommitConfig(
    type=CommitType.FEAT,              # feat, fix, refactor, docs, style, test, chore
    component="api",                   # Component being modified
    description="Add user auth",       # Short description
    body="Added JWT authentication...", # Optional detailed body
    footer="Closes #123",              # Optional footer
    breaking_change=False,             # Is breaking change?
    closes_issue="123",                # Issue it closes
    validates_before=True,             # Run validation first?
    auto_push=True                     # Auto-push after commit?
)

success, msg, sha = agent.commit(config)
```

### Push Configuration

```python
from auto_git_agent import PushConfig, PushStrategy

config = PushConfig(
    strategy=PushStrategy.IMMEDIATE,   # immediate, batch, scheduled, manual
    branch="main",                     # Target branch
    remote="origin",                   # Remote name
    force=False,                       # Force push?
    tags=True,                         # Push tags?
    set_upstream=False,                # Set upstream?
    retry_on_failure=True,             # Retry on failure?
    max_retries=3                      # Max retries
)

success, msg = agent.push(config)
```

### Commit Message Format

Vision Cortex uses **Conventional Commits** format:

```
<type>(<component>): <description>

[optional body]

[optional footer]
```

**Examples**:

```
feat(api): add user authentication endpoint

Added JWT-based authentication with refresh tokens.
Validates user credentials and returns JWT.

Closes #123
Breaking change: Authentication now required
```

```
fix(database): resolve connection pooling issue

Database connections now properly released on close.
Fixes memory leak causing server crashes.

Closes #456
```

```
docs(readme): update installation instructions

Updated Python version requirement to 3.8+
Added new environment variables to .env example.
```

---

## CONFIGURATION

### System Requirements File

**Location**: `vision_cortex/SYSTEM_REQUIREMENTS.yaml`

**Mandatory Sections**:

```yaml
system:
  name: "Vision Cortex"
  version: "1.0.0"
  status: "production"
  environment: "development"  # or staging, production
  
git:
  required: true
  auto_push: true
  push_after_commit: true
  commit_format: "conventional"
  require_validation: true
  
code:
  languages:
    python:
      required: true
      version: "3.8+"
    javascript:
      required: true
      version: "ES2020+"

agents:
  code_validation:
    required: true
  auto_git:
    required: true
  doc_indexing:
    required: true
  task_management:
    required: true

workflows:
  feature_development:
    stages: [...]
  bug_fix:
    stages: [...]
  # ... more workflows
```

### Agent Configuration

Each agent automatically receives:

1. **System Requirements**
   - Git configuration (auto-push, commit format)
   - Code language requirements
   - Validation rules

2. **Capabilities**
   - What the agent can do
   - Constraints and limits
   - Available methods

3. **Constraints**
   - Timeout values
   - Max file sizes
   - Retry policies

4. **AI/ML Stack**
   - Available models
   - API keys
   - Provider information

---

## USAGE EXAMPLES

### Example 1: Simple Auto-Commit and Push

```python
from auto_git_agent import AutoGitAgent, CommitConfig, CommitType

# Initialize
agent = AutoGitAgent()

# Create and push
config = CommitConfig(
    type=CommitType.FEAT,
    component="core",
    description="Implement new feature",
    auto_push=True
)

success, msg, sha = agent.commit(config)
if success:
    print(f"Committed: {sha}")
else:
    print(f"Error: {msg}")
```

### Example 2: Workflow Execution

```python
from workflow_orchestrator import WorkflowOrchestrator

# Initialize
orchestrator = WorkflowOrchestrator()

# Register agents (from your system)
orchestrator.register_agent("code_validation", validator)
orchestrator.register_agent("auto_git", git_agent)

# Execute workflow
success, execution = orchestrator.execute_workflow(
    workflow_name="feature_development",
    triggered_by="manual"
)

# Check results
print(f"Status: {execution.status}")
print(f"Stages completed: {execution.completed_stages}/{execution.total_stages}")
for stage in execution.stages:
    print(f"  {stage.stage_name}: {stage.status}")
```

### Example 3: Get Agent Context

```python
from agent_config_loader import AgentConfigurationLoader

loader = AgentConfigurationLoader("SYSTEM_REQUIREMENTS.yaml")

# Get complete context for an agent
context = loader.get_agent_context("auto_git")

print(f"Agent: {context['agent']['name']}")
print(f"Required: {context['agent']['required']}")
print(f"Capabilities: {context['agent']['capabilities']}")

# All agent now knows git configuration
git_config = context['system_requirements']['git']
print(f"Auto push: {git_config['auto_push']}")
print(f"Commit format: {git_config['commit_format']}")
```

### Example 4: Complete Work Item Workflow

```python
from enhanced_unified_orchestrator import EnhancedUnifiedOrchestrator

orchestrator = EnhancedUnifiedOrchestrator()

# Execute complete workflow
success, workflow_id = orchestrator.execute_complete_work_item_workflow(
    work_item_id="TASK-123",
    component="authentication",
    description="Implement JWT auth"
)

if success:
    print(f"Workflow completed: {workflow_id}")
else:
    print(f"Workflow failed: {workflow_id}")

# Export report
orchestrator.export_system_report("workflow_report.json")
```

### Example 5: Custom Workflow

```python
from workflow_orchestrator import WorkflowOrchestrator

orchestrator = WorkflowOrchestrator()

# Create custom workflow
stages = [
    {
        "name": "validate",
        "description": "Validate changes",
        "agents": ["code_validation"],
        "validation": "required"
    },
    {
        "name": "commit",
        "description": "Commit changes",
        "agents": ["auto_git"],
        "validation": "optional",
        "auto_commit": True
    },
    {
        "name": "notify",
        "description": "Send notification",
        "agents": ["notification_agent"],
        "validation": "optional"
    }
]

success = orchestrator.create_custom_workflow("custom_deploy", stages)

if success:
    # Execute custom workflow
    success, execution = orchestrator.execute_workflow("custom_deploy")
```

---

## INTEGRATION GUIDE

### Adding a New Agent

```python
from auto_git_agent import AutoGitAgent
from agent_config_loader import AgentConfigurationLoader
from workflow_orchestrator import WorkflowOrchestrator

# Step 1: Create agent
agent = AutoGitAgent()

# Step 2: Load configuration
loader = AgentConfigurationLoader("SYSTEM_REQUIREMENTS.yaml")
context = loader.get_agent_context("auto_git")

# Step 3: Initialize with system requirements
agent.system_config = context['system_requirements']
agent.capabilities = context['agent']['capabilities']
agent.constraints = context['agent']['constraints']

# Step 4: Register with orchestrator
orchestrator = WorkflowOrchestrator()
orchestrator.register_agent("auto_git", agent)

# Step 5: Use in workflows
success, execution = orchestrator.execute_workflow("feature_development")
```

### Integrating with Validation

```python
from auto_git_agent import AutoGitAgent
from code_validation_agent import CodeValidationAgent
from workflow_orchestrator import WorkflowOrchestrator

# Create agents
code_validator = CodeValidationAgent()
git_agent = AutoGitAgent()

# Create orchestrator
orchestrator = WorkflowOrchestrator()

# Execute with validation
success, execution = orchestrator.execute_with_validation(
    workflow_name="feature_development",
    validator_agent=code_validator
)
```

### Full Integration Example

```python
from enhanced_unified_orchestrator import EnhancedUnifiedOrchestrator

# Single initialization handles all integration
orchestrator = EnhancedUnifiedOrchestrator()

# Validate system
is_valid, issues = orchestrator.validate_system_setup()
assert is_valid, f"System validation failed: {issues}"

# Initialize all components
success, msg = orchestrator.initialize_all_components()
assert success, f"Component init failed: {msg}"

# Execute workflow
success, workflow_id = orchestrator.execute_feature_workflow(
    feature_name="new_api_endpoint",
    component="api"
)

# Get status
status = orchestrator.get_system_status()
print(f"System: {status['system_name']} v{status['system_version']}")
print(f"Workflows executed: {status['workflows_executed']}")

# Export report
orchestrator.export_system_report("system_report.json")
```

---

## TROUBLESHOOTING

### Problem: "Git is not available"

**Solution**:
```python
from auto_git_agent import AutoGitAgent

try:
    agent = AutoGitAgent()
except ValueError as e:
    print(f"Error: {e}")
    # Install git or check PATH
```

### Problem: "Nothing to commit"

**Solution**:
```python
success, status = agent.get_status()
if not status.modified_files and not status.untracked_files:
    print("No changes to commit")
else:
    agent.stage_all()
    config = CommitConfig(...)
    agent.commit(config)
```

### Problem: "Push failed"

**Solution**:
```python
# Check remote
success, status = agent.get_status()
print(f"Remote: {status.remote}")
print(f"Branch: {status.branch}")

# Manual push with retry
push_config = PushConfig(
    strategy=PushStrategy.IMMEDIATE,
    branch="main",
    remote="origin",
    retry_on_failure=True,
    max_retries=5
)

success, msg = agent.push(push_config)
```

### Problem: "Validation failed before commit"

**Solution**:
```python
# Check what failed
from code_validation_agent import CodeValidationAgent

validator = CodeValidationAgent()
success, report = validator.validate_directory("src/")

# View failures
if not success:
    for issue in report.get('issues', []):
        print(f"{issue['file']}: {issue['message']}")
```

### Problem: "Workflow stage failed"

**Solution**:
```python
# Check execution history
execution = orchestrator.get_execution_history(limit=1)[0]

print(f"Status: {execution['status']}")
for stage in execution['stages']:
    if stage['status'] == 'FAILED':
        print(f"Failed stage: {stage['stage_name']}")
        print(f"Error: {stage['error']}")
        print(f"Message: {stage['message']}")
```

---

## SUMMARY

The Auto-Commit & Workflow System provides:

✅ **Automatic Operations**
- Auto-validate before commit
- Auto-stage changes
- Auto-commit with smart messages
- Auto-push to remote

✅ **Mandatory Requirements**
- Every agent knows system specs
- Configuration is centralized
- Requirements are enforced
- Nothing is left to guesswork

✅ **Complete Workflows**
- Multi-stage execution
- Agent coordination
- Dependency management
- Full reporting

✅ **Production Ready**
- Error handling
- Retry logic
- Operation logging
- Status reporting

**Next Steps**:
1. Review `SYSTEM_REQUIREMENTS.yaml` for your environment
2. Start with Example 1 (simple auto-commit)
3. Progress to workflows and integration
4. Customize workflows for your needs

---

**Status**: ✅ PRODUCTION READY  
**Version**: 1.0.0  
**Last Updated**: December 11, 2025
