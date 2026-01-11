"""
Base AI Client Abstract Class
==============================

Defines the interface for all AI client implementations.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class BaseAIClient(ABC):
    """
    Abstract base class for AI clients.
    All AI providers must implement this interface.
    """
    
    @abstractmethod
    async def analyze_competitors(
        self,
        brand_name: str,
        domain: str,
        category: str,
        existing_competitors: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze and suggest competitors for a brand.
        
        Args:
            brand_name: Name of the brand
            domain: Brand's domain
            category: Primary category
            existing_competitors: List of already known competitors
            
        Returns:
            Dictionary with competitor suggestions and analysis
        """
        pass
    
    @abstractmethod
    async def generate_insights(
        self,
        signals: List[Dict[str, Any]],
        brand_context: Dict[str, Any]
    ) -> str:
        """
        Generate strategic insights from competitive signals.
        
        Args:
            signals: List of competitive signals
            brand_context: Brand context information
            
        Returns:
            Generated insights as markdown text
        """
        pass
    
    @abstractmethod
    async def sequential_reasoning(
        self,
        problem: str,
        context: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Perform multi-step reasoning about a problem.
        
        Args:
            problem: Problem statement
            context: Context information
            
        Returns:
            List of reasoning steps
        """
        pass
    
    @abstractmethod
    async def validate_against_guardrails(
        self,
        content: str,
        negative_scope: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate content against negative scope guardrails.
        
        Args:
            content: Content to validate
            negative_scope: Negative scope configuration
            
        Returns:
            Validation result with violations if any
        """
        pass
    
    @abstractmethod
    async def generate_content_brief(
        self,
        keyword: str,
        brand_context: Dict[str, Any],
        competitor_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate a content brief for a keyword.
        
        Args:
            keyword: Target keyword
            brand_context: Brand context
            competitor_data: Optional competitor analysis data
            
        Returns:
            Content brief with recommendations
        """
        pass
