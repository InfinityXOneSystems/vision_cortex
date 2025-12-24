"""
AGENT CONFIGURATION LOADER - System Requirements & Agent Setup
Loads and manages system requirements for all agents
Ensures every agent knows what they can/must use
"""

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml


@dataclass
class AgentConfig:
    """Configuration for a single agent"""

    name: str
    type: str  # code_validation, auto_git, doc_indexing, task_management
    required: bool
    enabled: bool
    version: str
    languages: List[str]
    required_packages: List[str]
    capabilities: List[str]
    constraints: Dict[str, Any]
    system_requirements: Dict[str, Any]


@dataclass
class SystemEnvironment:
    """System environment specifications"""

    python_version: str
    node_version: str
    git_version: str
    available_languages: List[str]
    available_models: List[str]
    available_tools: List[str]


class AgentConfigurationLoader:
    """Loads and manages system configuration for agents"""

    def __init__(self, config_path: str = "SYSTEM_REQUIREMENTS.yaml"):
        """Initialize configuration loader

        Args:
            config_path: Path to system requirements file
        """
        self.config_path = Path(config_path)
        self.logger = self._setup_logging()
        self.config = self._load_config()
        self.agent_configs: Dict[str, AgentConfig] = {}
        self._load_agent_configs()

    def _setup_logging(self) -> logging.Logger:
        """Setup logging"""
        logger = logging.getLogger("AgentConfigLoader")
        logger.setLevel(logging.INFO)

        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        formatter = logging.Formatter("[%(asctime)s] %(levelname)s - %(message)s")
        ch.setFormatter(formatter)
        logger.addHandler(ch)

        return logger

    def _load_config(self) -> Dict:
        """Load system requirements configuration"""
        try:
            if not self.config_path.exists():
                self.logger.error(f"Config file not found: {self.config_path}")
                return {}

            with open(self.config_path, "r") as f:
                config = yaml.safe_load(f)

            self.logger.info(f"Loaded configuration from {self.config_path}")
            return config

        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
            return {}

    def _load_agent_configs(self):
        """Load agent configurations from system config"""
        agents_config = self.config.get("agents", {})

        # Define agent specs
        agent_specs = {
            "code_validation": {
                "type": "code_validation",
                "languages": self.config.get("code", {}).get("languages", {}).keys(),
                "required": True,
                "version": "1.0.0",
                "capabilities": [
                    "syntax_checking",
                    "import_validation",
                    "style_checking",
                    "docstring_validation",
                    "git_integration",
                ],
            },
            "auto_git": {
                "type": "auto_git",
                "languages": ["bash"],
                "required": True,
                "version": "1.0.0",
                "capabilities": [
                    "git_status_check",
                    "file_staging",
                    "commit_creation",
                    "push_execution",
                    "message_generation",
                ],
            },
            "doc_indexing": {
                "type": "doc_indexing",
                "languages": ["markdown", "json"],
                "required": True,
                "version": "1.0.0",
                "capabilities": [
                    "document_indexing",
                    "semantic_search",
                    "cross_referencing",
                    "metadata_extraction",
                    "progress_tracking",
                ],
            },
            "task_management": {
                "type": "task_management",
                "languages": ["json"],
                "required": True,
                "version": "1.0.0",
                "capabilities": [
                    "roadmap_management",
                    "todo_tracking",
                    "progress_calculation",
                    "status_updates",
                    "priority_management",
                ],
            },
        }

        # Create agent configs
        for agent_name, spec in agent_specs.items():
            agent_req = agents_config.get(agent_name, {})

            config = AgentConfig(
                name=agent_name,
                type=spec["type"],
                required=agent_req.get("required", spec.get("required", True)),
                enabled=True,
                version=spec.get("version", "1.0.0"),
                languages=list(spec.get("languages", [])),
                required_packages=agent_req.get("required_packages", []),
                capabilities=spec.get("capabilities", []),
                constraints=self._get_agent_constraints(agent_name),
                system_requirements=self._get_agent_requirements(agent_name),
            )

            self.agent_configs[agent_name] = config
            self.logger.info(f"Loaded agent config: {agent_name}")

    def _get_agent_constraints(self, agent_name: str) -> Dict[str, Any]:
        """Get constraints for an agent"""
        constraints = {}

        if agent_name == "code_validation":
            constraints = {
                "max_file_size_mb": 50,
                "max_files_per_batch": 100,
                "timeout_seconds": self.config.get("defaults", {}).get(
                    "timeout_seconds", 300
                ),
                "required_before_commit": True,
                "required_before_push": True,
            }

        elif agent_name == "auto_git":
            constraints = {
                "timeout_seconds": self.config.get("defaults", {}).get(
                    "timeout_seconds", 300
                ),
                "require_validation": self.config.get("git", {}).get(
                    "require_validation", True
                ),
                "auto_push": self.config.get("git", {}).get("auto_push", True),
                "commit_format": self.config.get("git", {}).get(
                    "commit_format", "conventional"
                ),
                "max_retries": 3,
            }

        elif agent_name == "doc_indexing":
            constraints = {
                "max_docs": 1000,
                "timeout_seconds": 300,
                "require_tags": False,
                "auto_extract_metadata": True,
            }

        elif agent_name == "task_management":
            constraints = {
                "max_todos": 5000,
                "timeout_seconds": 300,
                "auto_update_progress": True,
                "require_linked_items": False,
            }

        return constraints

    def _get_agent_requirements(self, agent_name: str) -> Dict[str, Any]:
        """Get system requirements for an agent"""
        requirements = {
            "system": {
                "python_version": self.config.get("system", {}).get("version", "1.0.0"),
                "paths": self.config.get("system", {}).get("paths", {}),
            },
            "git": self.config.get("git", {}),
            "code": self.config.get("code", {}),
            "ai_stack": self.config.get("ai_stack", {}),
            "logging": self.config.get("logging", {}),
            "security": self.config.get("security", {}),
        }

        return requirements

    def get_agent_config(self, agent_name: str) -> Optional[AgentConfig]:
        """Get configuration for a specific agent

        Args:
            agent_name: Name of the agent

        Returns:
            AgentConfig object or None
        """
        return self.agent_configs.get(agent_name)

    def get_all_agent_configs(self) -> Dict[str, AgentConfig]:
        """Get all agent configurations

        Returns:
            Dictionary of agent configs
        """
        return self.agent_configs

    def get_required_agents(self) -> List[str]:
        """Get list of required agents

        Returns:
            List of required agent names
        """
        return [name for name, cfg in self.agent_configs.items() if cfg.required]

    def validate_agent_setup(self, agent_name: str) -> Tuple[bool, List[str]]:
        """Validate that agent is properly configured

        Args:
            agent_name: Name of the agent

        Returns:
            (is_valid, list of error messages)
        """
        errors = []

        agent_config = self.get_agent_config(agent_name)
        if not agent_config:
            return False, [f"Agent not found: {agent_name}"]

        # Check required packages
        for package in agent_config.required_packages:
            try:
                __import__(package)
            except ImportError:
                errors.append(f"Missing required package: {package}")

        # Check language support
        system_languages = [
            lang
            for lang_config in self.config.get("code", {}).values()
            if lang_config.get("required")
        ]
        for lang in agent_config.languages:
            if lang not in system_languages:
                # Only warn for non-critical languages
                self.logger.warning(f"Language not fully configured: {lang}")

        # Check constraints
        constraints = agent_config.constraints
        if "timeout_seconds" in constraints:
            if constraints["timeout_seconds"] <= 0:
                errors.append("Invalid timeout configuration")

        return len(errors) == 0, errors

    def get_agent_context(self, agent_name: str) -> Dict[str, Any]:
        """Get complete context for an agent
        Includes all system requirements and specs

        Args:
            agent_name: Name of the agent

        Returns:
            Complete agent context dictionary
        """
        agent_config = self.get_agent_config(agent_name)
        if not agent_config:
            return {}

        return {
            "agent": asdict(agent_config),
            "system_requirements": agent_config.system_requirements,
            "code_languages": self.config.get("code", {}),
            "ai_stack": self.config.get("ai_stack", {}),
            "workflows": self.config.get("workflows", {}),
            "validation_rules": self.config.get("validation", {}),
            "defaults": self.config.get("defaults", {}),
            "environment": self.config.get("environments", {}).get(
                self.config.get("system", {}).get("environment", "development"), {}
            ),
        }

    def get_mandatory_requirements(self) -> Dict[str, Any]:
        """Get all mandatory system requirements

        Returns:
            Dictionary of mandatory requirements
        """
        return {
            "system_name": self.config.get("system", {}).get("name"),
            "system_version": self.config.get("system", {}).get("version"),
            "required_agents": self.get_required_agents(),
            "git_required": self.config.get("git", {}).get("required", True),
            "auto_push": self.config.get("git", {}).get("auto_push", True),
            "validation_required": self.config.get("git", {}).get(
                "require_validation", True
            ),
            "code_languages": list(self.config.get("code", {}).keys()),
            "logging_enabled": self.config.get("logging", {}).get("enabled", True),
            "security_requirements": self.config.get("security", {}),
        }

    def validate_environment(self) -> Tuple[bool, List[str]]:
        """Validate that entire environment is set up correctly

        Returns:
            (is_valid, list of errors/warnings)
        """
        issues = []

        # Check required agents
        required = self.get_required_agents()
        for agent_name in required:
            is_valid, errors = self.validate_agent_setup(agent_name)
            if not is_valid:
                issues.extend(errors)

        # Check git
        if self.config.get("git", {}).get("required"):
            try:
                import subprocess

                result = subprocess.run(["git", "--version"], capture_output=True)
                if result.returncode != 0:
                    issues.append("Git is required but not available")
            except Exception:
                issues.append("Git is required but not available")

        # Check Python version
        python_req = (
            self.config.get("code", {}).get("python", {}).get("version", "3.8+")
        )
        import sys

        if sys.version_info < (3, 8):
            issues.append(f"Python {python_req} required, but found {sys.version}")

        return len(issues) == 0, issues

    def print_system_info(self):
        """Print system information and requirements"""
        print("\n" + "=" * 60)
        print("VISION CORTEX SYSTEM CONFIGURATION")
        print("=" * 60)

        # System info
        system = self.config.get("system", {})
        print(f"\nSystem: {system.get('name')} v{system.get('version')}")
        print(f"Status: {system.get('status')}")
        print(f"Environment: {system.get('environment')}")

        # Required agents
        print(f"\nRequired Agents:")
        for agent_name in self.get_required_agents():
            agent = self.agent_configs[agent_name]
            print(f"  ✓ {agent_name} v{agent.version}")
            print(f"    Languages: {', '.join(agent.languages)}")
            print(f"    Capabilities: {len(agent.capabilities)}")

        # Code languages
        print(f"\nCode Languages:")
        for lang, config in self.config.get("code", {}).items():
            required = config.get("required", False)
            indicator = "✓" if required else "○"
            print(f"  {indicator} {lang}: {config.get('version', 'N/A')}")

        # Git config
        print(f"\nGit Configuration:")
        git = self.config.get("git", {})
        print(f"  Auto Push: {git.get('auto_push', False)}")
        print(f"  Commit Format: {git.get('commit_format', 'conventional')}")
        print(f"  Require Validation: {git.get('require_validation', False)}")

        # AI Stack
        print(f"\nAI/ML Stack:")
        ai = self.config.get("ai_stack", {})
        models = ai.get("models", {}).get("available", [])
        print(f"  Available Models: {', '.join(models[:3])}...")

        # Validation
        print(f"\nValidation Rules:")
        val = self.config.get("validation", {})
        checks = val.get("required_checks", {})
        print(f"  Required Checks: {', '.join(k for k, v in checks.items() if v)}")

        print("\n" + "=" * 60 + "\n")


from typing import Tuple

if __name__ == "__main__":
    # Example usage
    loader = AgentConfigurationLoader("SYSTEM_REQUIREMENTS.yaml")

    # Print system info
    loader.print_system_info()

    # Get agent config
    code_val_config = loader.get_agent_config("code_validation")
    if code_val_config:
        print(f"Code Validation Agent:")
        print(f"  Required: {code_val_config.required}")
        print(f"  Languages: {', '.join(code_val_config.languages)}")
        print(f"  Capabilities: {len(code_val_config.capabilities)}")

    # Validate environment
    is_valid, issues = loader.validate_environment()
    print(f"\nEnvironment Valid: {is_valid}")
    if issues:
        print("Issues found:")
        for issue in issues:
            print(f"  - {issue}")
