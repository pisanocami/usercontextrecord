"""
Dynamic Modules System
======================

Sistema de módulos dinámicos para análisis competitivo.
Cada módulo implementa lógica específica basada en contratos de módulo.
"""

from .base_module import BaseModule, ModulePreflightResult, ModuleRunResult
from .registry import get_module, get_all_modules

__all__ = [
    "BaseModule",
    "ModulePreflightResult",
    "ModuleRunResult",
    "get_module",
    "get_all_modules"
]
