#!/usr/bin/env python
"""
Setup script for themissingsemester package.

This file is kept for backward compatibility. 
Modern installations should use pyproject.toml instead.
"""

from setuptools import setup, find_packages

setup(
    name="themissingsemester",
    version="0.1.0",
    packages=find_packages(),
    python_requires=">=3.9",
)
