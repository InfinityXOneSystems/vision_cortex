"""Tests for the vision module."""

import pytest

from vision import __version__, process_image


def test_version():
    """Test that version is defined."""
    assert __version__ == "0.1.0"


def test_process_image():
    """Test the process_image function."""
    result = process_image("test_image.jpg")
    assert result["status"] == "success"
    assert result["image_path"] == "test_image.jpg"
    assert "message" in result


def test_process_image_empty_path():
    """Test that process_image raises error for empty path."""
    with pytest.raises(ValueError, match="image_path cannot be empty"):
        process_image("")
