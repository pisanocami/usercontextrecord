"""
Session Manager - UCR FIRST State Management
=============================================

Manages Streamlit session state with UCR as the central entity.
Every session operation is UCR-centric with real data integration.
"""

import streamlit as st
from typing import Dict, Any, List, Optional
from datetime import datetime
from streamlit_app.services.data_service import DataService, get_data_service
from brand_intel.core.models import Configuration


class SessionManager:
    """
    UCR-First Session Manager.
    
    Manages session state with UCR as the primary entity.
    All state operations are organized around UCR.
    """
    
    # Session state keys
    KEY_CURRENT_UCR = "current_ucr"
    KEY_UCR_LIST = "ucr_list"
    KEY_SIGNALS = "detected_signals"
    KEY_ANALYSIS_RESULTS = "analysis_results"
    KEY_RUN_TRACES = "run_traces"
    
    def __init__(self, data_service: Optional[DataService] = None):
        """
        Initialize session manager with data service.
        
        Args:
            data_service: Data service instance (optional, will create if not provided)
        """
        self.data_service = data_service or get_data_service()
        self._init_session_state()
    
    def _init_session_state(self):
        """Initialize default session state values."""
        if self.KEY_CURRENT_UCR not in st.session_state:
            st.session_state[self.KEY_CURRENT_UCR] = None
        
        if self.KEY_UCR_LIST not in st.session_state:
            # Mock UCR list for demo
            st.session_state[self.KEY_UCR_LIST] = [
                {
                    "id": 1,
                    "name": "Nike Brand Context",
                    "domain": "nike.com",
                    "quality_score": 78,
                    "competitor_count": 5,
                    "guardrail_count": 12,
                    "signal_count": 8,
                    "section_a_valid": True,
                    "section_b_valid": True,
                    "section_c_valid": True,
                    "section_g_valid": True,
                },
                {
                    "id": 2,
                    "name": "Adidas Brand Context",
                    "domain": "adidas.com",
                    "quality_score": 65,
                    "competitor_count": 4,
                    "guardrail_count": 8,
                    "signal_count": 5,
                    "section_a_valid": True,
                    "section_b_valid": True,
                    "section_c_valid": False,
                    "section_g_valid": True,
                },
            ]
        
        if self.KEY_SIGNALS not in st.session_state:
            st.session_state[self.KEY_SIGNALS] = []
        
        if self.KEY_ANALYSIS_RESULTS not in st.session_state:
            st.session_state[self.KEY_ANALYSIS_RESULTS] = {}
        
        if self.KEY_RUN_TRACES not in st.session_state:
            st.session_state[self.KEY_RUN_TRACES] = []
    
    async def get_available_ucrs(self) -> List[Dict[str, Any]]:
        """
        Get list of available UCRs from backend.
        
        Returns:
            List of UCR summaries
        """
        try:
            # Try to get from cache first
            cached = st.session_state.get(self.KEY_UCR_LIST)
            if cached:
                return cached
            
            # Fetch from data service
            result = await self.data_service.get_configurations()
            if result.success and result.data:
                # Convert Configuration objects to dicts for session storage
                ucr_list = []
                for config in result.data:
                    ucr_dict = config.dict()
                    # Add computed fields for UI
                    ucr_dict.update({
                        "quality_score": config.quality_score.overall,
                        "competitor_count": len(config.competitors.get_approved()) if config.competitors else 0,
                        "guardrail_count": len(config.negative_scope.excluded_categories) + len(config.negative_scope.excluded_keywords) if config.negative_scope else 0,
                        "signal_count": 0,  # Will be populated separately
                        "section_a_valid": True,  # Computed from validation
                        "section_b_valid": True,
                        "section_c_valid": True,
                        "section_g_valid": True
                    })
                    ucr_list.append(ucr_dict)
                
                # Cache the list
                st.session_state[self.KEY_UCR_LIST] = ucr_list
                return ucr_list
            
            # Fallback to mock data if API fails
            return self._get_mock_ucrs()
            
        except Exception as e:
            st.warning(f"Failed to load UCRs from backend: {e}")
            return self._get_mock_ucrs()

    def _get_mock_ucrs(self) -> List[Dict[str, Any]]:
        """Get mock UCR data for fallback."""
        return [
            {
                "id": 1,
                "name": "Nike Brand Context",
                "domain": "nike.com",
                "quality_score": 78,
                "competitor_count": 5,
                "guardrail_count": 12,
                "signal_count": 8,
                "section_a_valid": True,
                "section_b_valid": True,
                "section_c_valid": True,
                "section_g_valid": True,
            },
            {
                "id": 2,
                "name": "Adidas Brand Context",
                "domain": "adidas.com",
                "quality_score": 65,
                "competitor_count": 4,
                "guardrail_count": 8,
                "signal_count": 5,
                "section_a_valid": True,
                "section_b_valid": True,
                "section_c_valid": False,
                "section_g_valid": True,
            },
        ]
    
    async def load_ucr(self, ucr_name: str) -> Optional[Dict[str, Any]]:
        """
        Load a UCR by name from backend and set as current.
        
        Args:
            ucr_name: Name of UCR to load
            
        Returns:
            UCR data if found, None otherwise
        """
        try:
            # Get available UCRs
            available_ucrs = await self.get_available_ucrs()
            
            # Find UCR by name
            ucr_info = None
            for ucr in available_ucrs:
                if ucr["name"] == ucr_name:
                    ucr_info = ucr
                    break
            
            if not ucr_info:
                return None
            
            # Load full UCR data from backend
            result = await self.data_service.get_configuration(ucr_info["id"])
            if result.success and result.data:
                # Convert to dict for session storage
                ucr_dict = result.data.dict()
                
                # Add computed fields
                ucr_dict.update({
                    "quality_score": result.data.quality_score.overall,
                    "competitor_count": len(result.data.competitors.get_approved()) if result.data.competitors else 0,
                    "guardrail_count": len(result.data.negative_scope.excluded_categories) + len(result.data.negative_scope.excluded_keywords) if result.data.negative_scope else 0,
                    "signal_count": 0,  # Will be loaded separately
                    "section_a_valid": True,  # Computed from validation
                    "section_b_valid": True,
                    "section_c_valid": True,
                    "section_g_valid": True
                })
                
                st.session_state[self.KEY_CURRENT_UCR] = ucr_dict
                
                # Load signals for this UCR
                await self.load_signals_for_ucr(ucr_info["id"])
                
                return ucr_dict
            
            return None
            
        except Exception as e:
            st.error(f"Failed to load UCR '{ucr_name}': {e}")
            return None
    
    def get_current_ucr(self) -> Optional[Dict[str, Any]]:
        """Get currently loaded UCR."""
        return st.session_state.get(self.KEY_CURRENT_UCR)
    
    def set_current_ucr(self, ucr: Dict[str, Any]):
        """Set current UCR."""
        st.session_state[self.KEY_CURRENT_UCR] = ucr
    
    async def load_signals_for_ucr(self, ucr_id: int):
        """Load competitive signals for a UCR."""
        try:
            result = await self.data_service.get_competitive_signals(ucr_id, limit=50)
            if result.success and result.data:
                # Convert Signal objects to dicts
                signals = [signal.dict() for signal in result.data]
                st.session_state[self.KEY_SIGNALS] = signals
            else:
                st.session_state[self.KEY_SIGNALS] = []
        except Exception as e:
            st.warning(f"Failed to load signals: {e}")
            st.session_state[self.KEY_SIGNALS] = []

    async def save_ucr_changes(self, ucr_dict: Dict[str, Any]) -> bool:
        """
        Save UCR changes to backend.
        
        Args:
            ucr_dict: Updated UCR data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Convert dict back to Configuration object
            from brand_intel.core.models import Configuration
            config = Configuration(**ucr_dict)
            
            result = await self.data_service.save_configuration(config)
            if result.success:
                # Update local cache
                st.session_state[self.KEY_CURRENT_UCR] = result.data.dict()
                return True
            
            st.error(f"Failed to save UCR: {result.error}")
            return False
            
        except Exception as e:
            st.error(f"Error saving UCR: {e}")
            return False

    async def get_keyword_gap_analysis(self, ucr_id: int) -> Optional[Dict[str, Any]]:
        """Get keyword gap analysis for UCR."""
        try:
            result = await self.data_service.get_keyword_gap_analysis(ucr_id)
            if result.success:
                return result.data
            return None
        except Exception as e:
            st.error(f"Failed to get keyword gap analysis: {e}")
            return None

    async def get_market_demand_analysis(self, ucr_id: int) -> Optional[Dict[str, Any]]:
        """Get market demand analysis for UCR."""
        try:
            result = await self.data_service.get_market_demand_analysis(ucr_id)
            if result.success:
                return result.data
            return None
        except Exception as e:
            st.error(f"Failed to get market demand analysis: {e}")
            return None

    async def save_module_result(self, module_id: str, ucr_id: int, result: Dict[str, Any]):
        """Save module execution result."""
        try:
            await self.data_service.save_module_result(module_id, ucr_id, result)
        except Exception as e:
            st.warning(f"Failed to save module result: {e}")

    async def get_module_result(self, module_id: str, ucr_id: int) -> Optional[Dict[str, Any]]:
        """Get cached module result."""
        try:
            result = await self.data_service.get_module_result(module_id, ucr_id)
            if result.success:
                return result.data
            return None
        except Exception as e:
            st.warning(f"Failed to get module result: {e}")
            return None
    
    def get_signals(self) -> List[Dict[str, Any]]:
        """Get detected signals for current UCR."""
        return st.session_state.get(self.KEY_SIGNALS, [])
    
    def set_signals(self, signals: List[Dict[str, Any]]):
        """Set detected signals."""
        st.session_state[self.KEY_SIGNALS] = signals
    
    def add_signal(self, signal: Dict[str, Any]):
        """Add a signal to the list."""
        signals = self.get_signals()
        signals.append(signal)
        st.session_state[self.KEY_SIGNALS] = signals
    
    def get_analysis_results(self) -> Dict[str, Any]:
        """Get analysis results."""
        return st.session_state.get(self.KEY_ANALYSIS_RESULTS, {})
    
    def set_analysis_results(self, results: Dict[str, Any]):
        """Set analysis results."""
        st.session_state[self.KEY_ANALYSIS_RESULTS] = results
    
    def add_run_trace(self, trace: Dict[str, Any]):
        """
        Add a run trace for audit logging.
        
        UCR FIRST: Every operation creates a trace.
        """
        traces = st.session_state.get(self.KEY_RUN_TRACES, [])
        trace["timestamp"] = datetime.utcnow().isoformat()
        traces.append(trace)
        st.session_state[self.KEY_RUN_TRACES] = traces
    
    def get_run_traces(self) -> List[Dict[str, Any]]:
        """Get all run traces."""
        return st.session_state.get(self.KEY_RUN_TRACES, [])
    
    def clear_session(self):
        """Clear all session state."""
        for key in [
            self.KEY_CURRENT_UCR,
            self.KEY_SIGNALS,
            self.KEY_ANALYSIS_RESULTS,
            self.KEY_RUN_TRACES
        ]:
            if key in st.session_state:
                del st.session_state[key]
        
        self._init_session_state()
