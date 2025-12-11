#!/usr/bin/env python3
"""
Setup script for Infinity X AI autonomous build system
Installs dependencies and configures Python environment
"""

import subprocess
import sys
from pathlib import Path

def run_command(cmd: list, cwd: str = None, description: str = "") -> bool:
    """Execute shell command and return success status"""
    try:
        print(f"\n📦 {description}")
        print(f"  Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, cwd=cwd, capture_output=False, text=True)
        return result.returncode == 0
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False

def setup_environment():
    """Setup Python environment for Infinity X AI"""
    print("=" * 80)
    print("🚀 INFINITY X AI - PYTHON ENVIRONMENT SETUP")
    print("=" * 80)
    
    project_root = Path(r"C:\Users\JARVIS\OneDrive\Documents")
    python_exe = r"C:/Users/JARVIS/OneDrive/Documents/docker_llm/.venv/Scripts/python.exe"
    
    # Verify Python installation
    print("\n✅ Verifying Python environment...")
    result = subprocess.run([python_exe, "--version"], capture_output=True, text=True)
    print(f"  Python: {result.stdout.strip()}")
    
    # Install core dependencies globally to venv
    print("\n📦 Installing core dependencies...")
    deps = [
        "pip>=23.0",
        "setuptools>=65.0",
        "wheel>=0.40.0",
        "pytest>=7.0",
        "pytest-cov>=4.0",
        "mypy>=1.0",
        "pylint>=2.16",
        "black>=23.0",
        "isort>=5.12",
        "bandit>=1.7",
        "requests>=2.31",
        "pydantic>=2.0",
        "python-dotenv>=1.0",
        "openai>=1.0",
        "groq>=0.0.1",
        "anthropic>=0.7",
        "redis>=5.0",
        "firebase-admin>=6.0",
        "numpy>=1.24",
        "pandas>=2.0",
        "pytest-asyncio>=0.21.0",
    ]
    
    for dep in deps:
        cmd = [python_exe, "-m", "pip", "install", dep, "--quiet"]
        subprocess.run(cmd, capture_output=True)
    
    print("  ✅ Core dependencies installed")
    
    # Setup each core repo
    core_repos = ["vision_cortex", "taxonomy", "auto_builder", "index"]
    
    for repo in core_repos:
        repo_path = project_root / repo
        if repo_path.exists():
            print(f"\n📦 Setting up {repo}...")
            
            # Install repo-specific dependencies
            req_file = repo_path / "requirements.txt"
            if req_file.exists():
                cmd = [python_exe, "-m", "pip", "install", "-r", str(req_file), "--quiet"]
                subprocess.run(cmd, capture_output=True)
                print(f"  ✅ Installed requirements for {repo}")
    
    print("\n" + "=" * 80)
    print("✅ ENVIRONMENT SETUP COMPLETE")
    print("=" * 80)
    print("\nNext steps:")
    print(f"  1. Run orchestrator: python {project_root / 'vision_cortex' / 'orchestrator_infinity_ai.py'}")
    print("  2. Check logs: vision_cortex/infinity-ai-orchestrator.log")
    print("  3. Review build results in project directories")
    print("")

if __name__ == "__main__":
    setup_environment()
