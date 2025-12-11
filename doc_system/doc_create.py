"""
Document Create System - Creates and generates documents

Supports:
- Template-based document creation
- Automated content generation
- Multi-format output
- Content scaffolding
- Batch document creation
"""

import json
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class DocTemplate:
    """Document template"""
    template_id: str
    name: str
    description: str
    structure: Dict[str, Any]
    required_fields: List[str]
    optional_fields: List[str]
    format: str = "markdown"
    created_at: str = ""
    category: str = ""


class DocCreateSystem:
    """Creates and generates documents"""
    
    def __init__(self, templates_dir: str = "doc_templates", 
                 output_dir: str = "docs_created"):
        """Initialize create system"""
        self.templates_dir = Path(templates_dir)
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.templates: Dict[str, DocTemplate] = self._load_templates()
        self.created_docs = []
    
    def _load_templates(self) -> Dict[str, DocTemplate]:
        """Load templates from directory"""
        templates = {}
        for template_file in self.templates_dir.glob("*.json"):
            try:
                with open(template_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    template = DocTemplate(**data)
                    templates[template.template_id] = template
            except Exception as e:
                logger.error(f"Failed to load template {template_file}: {e}")
        return templates
    
    def create_template(self, template_id: str, name: str, description: str,
                       structure: Dict[str, Any], required_fields: List[str],
                       optional_fields: List[str] = None, 
                       category: str = "") -> bool:
        """
        Create a new document template
        
        Args:
            template_id: Unique template ID
            name: Template name
            description: Template description
            structure: Template structure
            required_fields: Required fields
            optional_fields: Optional fields
            category: Template category
            
        Returns:
            Success status
        """
        try:
            template = DocTemplate(
                template_id=template_id,
                name=name,
                description=description,
                structure=structure,
                required_fields=required_fields,
                optional_fields=optional_fields or [],
                format="markdown",
                created_at=datetime.now().isoformat(),
                category=category
            )
            
            # Save template
            template_file = self.templates_dir / f"{template_id}.json"
            with open(template_file, 'w', encoding='utf-8') as f:
                json.dump(asdict(template), f, indent=2)
            
            self.templates[template_id] = template
            logger.info(f"Created template: {template_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create template: {e}")
            return False
    
    def _validate_fields(self, data: Dict[str, Any], 
                        required_fields: List[str]) -> Tuple[bool, List[str]]:
        """Validate required fields"""
        missing = []
        for field in required_fields:
            if field not in data or not data[field]:
                missing.append(field)
        return len(missing) == 0, missing
    
    def create_from_template(self, template_id: str, 
                            data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Create document from template
        
        Args:
            template_id: Template ID
            data: Data to fill template
            
        Returns:
            (success, document_content)
        """
        try:
            if template_id not in self.templates:
                return False, f"Template not found: {template_id}"
            
            template = self.templates[template_id]
            
            # Validate required fields
            valid, missing = self._validate_fields(data, template.required_fields)
            if not valid:
                return False, f"Missing required fields: {', '.join(missing)}"
            
            # Build document
            content = self._build_from_structure(
                template.structure,
                data,
                template.format
            )
            
            return True, content
            
        except Exception as e:
            logger.error(f"Failed to create document from template: {e}")
            return False, str(e)
    
    def _build_from_structure(self, structure: Dict[str, Any],
                             data: Dict[str, Any], 
                             format_type: str = "markdown") -> str:
        """Build document from structure"""
        if format_type == "markdown":
            return self._build_markdown(structure, data)
        elif format_type == "json":
            return json.dumps(self._build_json(structure, data), indent=2)
        else:
            return self._build_plaintext(structure, data)
    
    def _build_markdown(self, structure: Dict[str, Any],
                       data: Dict[str, Any]) -> str:
        """Build markdown document"""
        lines = []
        
        for key, value in structure.items():
            if isinstance(value, dict):
                # Section
                lines.append(f"## {value.get('title', key)}\n")
                
                content = value.get('content', '')
                if isinstance(content, list):
                    for item in content:
                        if item.startswith('{{') and item.endswith('}}'):
                            field = item[2:-2]
                            lines.append(f"* {data.get(field, f'[{field}]')}")
                        else:
                            lines.append(f"* {item}")
                else:
                    # Replace placeholders
                    content = re.sub(r'\{\{(\w+)\}\}', 
                                    lambda m: str(data.get(m.group(1), f"[{m.group(1)}]")),
                                    content)
                    lines.append(content)
                
                lines.append("")
            
            elif isinstance(value, str):
                # Replace placeholders
                if value.startswith('{{') and value.endswith('}}'):
                    field = value[2:-2]
                    lines.append(f"* {key}: {data.get(field, f'[{field}]')}")
                else:
                    value = re.sub(r'\{\{(\w+)\}\}',
                                  lambda m: str(data.get(m.group(1), f"[{m.group(1)}]")),
                                  value)
                    if key.lower() == 'title':
                        lines.insert(0, f"# {value}\n")
                    else:
                        lines.append(value)
                
                lines.append("")
        
        return '\n'.join(lines)
    
    def _build_json(self, structure: Dict[str, Any],
                   data: Dict[str, Any]) -> Dict[str, Any]:
        """Build JSON document"""
        result = {}
        
        for key, value in structure.items():
            if isinstance(value, dict):
                result[key] = self._build_json(value, data)
            elif isinstance(value, str):
                # Replace placeholders
                result[key] = re.sub(r'\{\{(\w+)\}\}',
                                    lambda m: str(data.get(m.group(1), f"[{m.group(1)}]")),
                                    value)
            else:
                result[key] = value
        
        return result
    
    def _build_plaintext(self, structure: Dict[str, Any],
                        data: Dict[str, Any]) -> str:
        """Build plaintext document"""
        lines = []
        
        for key, value in structure.items():
            if isinstance(value, dict):
                lines.append(f"{value.get('title', key).upper()}")
                lines.append("-" * 40)
                
                content = value.get('content', '')
                if isinstance(content, list):
                    for item in content:
                        lines.append(f"  * {item}")
                else:
                    lines.append(content)
                
                lines.append("")
            
            elif isinstance(value, str):
                value = re.sub(r'\{\{(\w+)\}\}',
                              lambda m: str(data.get(m.group(1), f"[{m.group(1)}]")),
                              value)
                lines.append(f"{key}: {value}")
        
        return '\n'.join(lines)
    
    def save_document(self, doc_id: str, content: str, 
                     format_type: str = "md") -> Tuple[bool, str]:
        """
        Save created document
        
        Args:
            doc_id: Document ID
            content: Document content
            format_type: File format (md, json, txt)
            
        Returns:
            (success, file_path)
        """
        try:
            extension = format_type if format_type.startswith('.') else f".{format_type}"
            file_path = self.output_dir / f"{doc_id}{extension}"
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            self.created_docs.append({
                "doc_id": doc_id,
                "path": str(file_path),
                "created_at": datetime.now().isoformat()
            })
            
            logger.info(f"Saved document: {doc_id} -> {file_path}")
            return True, str(file_path)
            
        except Exception as e:
            logger.error(f"Failed to save document: {e}")
            return False, str(e)
    
    def create_readme(self, project_name: str, description: str,
                     features: List[str], installation: str = "",
                     usage: str = "") -> str:
        """Generate a README"""
        template_structure = {
            "title": {"title": "Title", "content": "{{project_name}}"},
            "description": {"title": "Description", "content": "{{description}}"},
            "features": {"title": "Features", "content": ["{{features}}"]},
            "installation": {"title": "Installation", "content": "{{installation}}"},
            "usage": {"title": "Usage", "content": "{{usage}}"}
        }
        
        data = {
            "project_name": project_name,
            "description": description,
            "features": '\n'.join([f"* {f}" for f in features]),
            "installation": installation,
            "usage": usage
        }
        
        success, content = self.create_from_template("readme", data)
        if success:
            return content
        
        # Fallback
        return self._build_markdown(template_structure, data)
    
    def batch_create(self, template_id: str, 
                    data_list: List[Dict[str, Any]]) -> List[Tuple[bool, str]]:
        """
        Create multiple documents from same template
        
        Args:
            template_id: Template ID
            data_list: List of data dictionaries
            
        Returns:
            List of (success, content)
        """
        results = []
        for data in data_list:
            success, content = self.create_from_template(template_id, data)
            results.append((success, content))
        
        logger.info(f"Batch created {len([r for r in results if r[0]])} documents")
        return results
    
    def list_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """List available templates"""
        templates = []
        for template in self.templates.values():
            if category is None or template.category == category:
                templates.append({
                    "id": template.template_id,
                    "name": template.name,
                    "description": template.description,
                    "category": template.category
                })
        return templates
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get creation statistics"""
        return {
            "total_templates": len(self.templates),
            "total_created": len(self.created_docs),
            "templates_by_category": {}
        }


if __name__ == "__main__":
    # Example usage
    creator = DocCreateSystem()
    
    # Create a template
    readme_template = {
        "title": "# {{project_name}}",
        "description": {
            "title": "Description",
            "content": "{{description}}"
        },
        "features": {
            "title": "Features",
            "content": ["{{features}}"]
        }
    }
    
    creator.create_template(
        "readme",
        "README Template",
        "Standard README template",
        readme_template,
        ["project_name", "description"],
        ["features"]
    )
    
    # Create document
    success, content = creator.create_from_template("readme", {
        "project_name": "My Project",
        "description": "A cool project",
        "features": "* Feature 1\n* Feature 2"
    })
    
    print(f"Success: {success}")
    print(f"Content:\n{content}")
