"""
Session Manager - UCR FIRST State Management
=============================================

Manages Streamlit session state with UCR as the central entity.
Every session operation is UCR-centric.
"""

import streamlit as st
from typing import Dict, Any, List, Optional
from datetime import datetime


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
    
    def __init__(self):
        """Initialize session state if needed."""
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
    
    def get_available_ucrs(self) -> List[Dict[str, Any]]:
        """Get list of available UCRs."""
        return st.session_state.get(self.KEY_UCR_LIST, [])
    
    def load_ucr(self, ucr_name: str) -> Optional[Dict[str, Any]]:
        """
        Load a UCR by name and set as current.
        
        Args:
            ucr_name: Name of UCR to load
            
        Returns:
            UCR data if found, None otherwise
        """
        ucrs = self.get_available_ucrs()
        for ucr in ucrs:
            if ucr["name"] == ucr_name:
                st.session_state[self.KEY_CURRENT_UCR] = ucr
                return ucr
        return None
    
    def get_current_ucr(self) -> Optional[Dict[str, Any]]:
        """Get currently loaded UCR."""
        return st.session_state.get(self.KEY_CURRENT_UCR)
    
    def set_current_ucr(self, ucr: Dict[str, Any]):
        """Set current UCR."""
        st.session_state[self.KEY_CURRENT_UCR] = ucr
    
    def has_valid_ucr(self) -> bool:
        """Check if a valid UCR is loaded."""
        ucr = self.get_current_ucr()
        return ucr is not None and ucr.get("quality_score", 0) >= 50
    
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
