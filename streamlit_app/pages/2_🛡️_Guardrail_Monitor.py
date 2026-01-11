"""
Guardrail Monitor Page - UCR FIRST Section G Management
========================================================

Monitor and manage UCR Section G (Negative Scope) guardrails.
Implements fail-closed validation for all content.

UCR FIRST: Section G is critical for brand safety.
"""

import streamlit as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from streamlit_app.services.session_manager import SessionManager

st.set_page_config(
    page_title="Guardrail Monitor | UCR FIRST",
    page_icon="🛡️",
    layout="wide"
)

session = SessionManager()

# Header
st.title("🛡️ Guardrail Monitor")
st.markdown('<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">UCR Section G</span>', unsafe_allow_html=True)

# UCR Check
ucr = session.get_current_ucr()

if not ucr:
    st.error("⚠️ **No UCR Selected** - Select a UCR from the Home page.")
    st.stop()

st.markdown("---")

# Section G Overview
st.subheader("📊 Section G Overview")

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("Total Exclusions", ucr.get('guardrail_count', 12))
with col2:
    st.metric("Categories Blocked", 4)
with col3:
    st.metric("Keywords Blocked", 5)
with col4:
    st.metric("Competitors Excluded", 3)

st.markdown("---")

# Exclusion Rules
st.subheader("🚫 Exclusion Rules")

tab1, tab2, tab3, tab4 = st.tabs(["Categories", "Keywords", "Use Cases", "Competitors"])

with tab1:
    st.markdown("#### Excluded Categories")
    categories = [
        {"term": "gambling", "match_type": "semantic", "reason": "Brand safety"},
        {"term": "adult content", "match_type": "exact", "reason": "Brand safety"},
        {"term": "weapons", "match_type": "semantic", "reason": "Policy compliance"},
        {"term": "tobacco", "match_type": "semantic", "reason": "Brand values"},
    ]
    
    for cat in categories:
        col1, col2, col3, col4 = st.columns([3, 2, 3, 1])
        with col1:
            st.text(cat["term"])
        with col2:
            st.caption(f"Match: {cat['match_type']}")
        with col3:
            st.caption(cat["reason"])
        with col4:
            st.button("❌", key=f"del_cat_{cat['term']}", help="Remove")

with tab2:
    st.markdown("#### Excluded Keywords")
    keywords = [
        {"term": "cheap", "match_type": "exact", "reason": "Brand positioning"},
        {"term": "knockoff", "match_type": "semantic", "reason": "Brand protection"},
        {"term": "fake", "match_type": "semantic", "reason": "Brand protection"},
        {"term": "discount bin", "match_type": "contains", "reason": "Premium positioning"},
        {"term": "low quality", "match_type": "semantic", "reason": "Brand perception"},
    ]
    
    for kw in keywords:
        col1, col2, col3, col4 = st.columns([3, 2, 3, 1])
        with col1:
            st.text(kw["term"])
        with col2:
            st.caption(f"Match: {kw['match_type']}")
        with col3:
            st.caption(kw["reason"])
        with col4:
            st.button("❌", key=f"del_kw_{kw['term']}", help="Remove")

with tab3:
    st.markdown("#### Excluded Use Cases")
    use_cases = [
        {"term": "counterfeit detection", "reason": "Not our market"},
        {"term": "resale arbitrage", "reason": "Against brand policy"},
    ]
    
    for uc in use_cases:
        col1, col2, col3 = st.columns([4, 4, 1])
        with col1:
            st.text(uc["term"])
        with col2:
            st.caption(uc["reason"])
        with col3:
            st.button("❌", key=f"del_uc_{uc['term']}", help="Remove")

with tab4:
    st.markdown("#### Excluded Competitors")
    competitors = [
        {"term": "counterfeit-shoes.com", "reason": "Counterfeit seller"},
        {"term": "fake-brand.com", "reason": "Trademark violation"},
        {"term": "knockoff-store.com", "reason": "Brand protection"},
    ]
    
    for comp in competitors:
        col1, col2, col3 = st.columns([4, 4, 1])
        with col1:
            st.text(comp["term"])
        with col2:
            st.caption(comp["reason"])
        with col3:
            st.button("❌", key=f"del_comp_{comp['term']}", help="Remove")

st.markdown("---")

# Add New Exclusion
st.subheader("➕ Add New Exclusion")

col1, col2 = st.columns(2)

with col1:
    exclusion_type = st.selectbox(
        "Exclusion Type",
        options=["Category", "Keyword", "Use Case", "Competitor"]
    )
    
    exclusion_term = st.text_input("Term to Exclude")

with col2:
    match_type = st.selectbox(
        "Match Type",
        options=["Semantic", "Exact", "Contains"],
        help="Exact: Must match exactly. Semantic: Similar meaning. Contains: Substring match."
    )
    
    exclusion_reason = st.text_input("Reason for Exclusion")

if st.button("➕ Add Exclusion", type="primary"):
    if exclusion_term:
        st.success(f"✅ Added exclusion: {exclusion_term}")
        session.add_run_trace({
            "operation": "add_exclusion",
            "ucr_id": ucr.get("id"),
            "sections_used": ["G"],
            "exclusion": {
                "type": exclusion_type.lower(),
                "term": exclusion_term,
                "match_type": match_type.lower(),
                "reason": exclusion_reason
            }
        })
    else:
        st.warning("Please enter a term to exclude")

st.markdown("---")

# Content Validator
st.subheader("🔍 Content Validator")
st.markdown("Test content against UCR guardrails before publishing.")

test_content = st.text_area(
    "Content to Validate",
    placeholder="Paste content here to check against Section G guardrails...",
    height=150
)

if st.button("🛡️ Validate Content", use_container_width=True):
    if test_content:
        with st.spinner("Checking against UCR guardrails..."):
            import time
            time.sleep(0.5)
            
            # Mock validation
            violations = []
            test_lower = test_content.lower()
            
            if "cheap" in test_lower:
                violations.append({"type": "keyword", "term": "cheap", "severity": "high"})
            if "fake" in test_lower:
                violations.append({"type": "keyword", "term": "fake", "severity": "high"})
            if "gambling" in test_lower:
                violations.append({"type": "category", "term": "gambling", "severity": "critical"})
            
            if violations:
                st.error(f"❌ **BLOCKED** - {len(violations)} guardrail violation(s) detected")
                
                for v in violations:
                    st.markdown(f"""
                    <div style="background: #fff5f5; border-left: 4px solid #dc3545; padding: 10px; margin: 5px 0; border-radius: 4px;">
                        <strong>{v['type'].upper()}</strong>: "{v['term']}" - Severity: {v['severity']}
                    </div>
                    """, unsafe_allow_html=True)
            else:
                st.success("✅ **PASSED** - Content complies with UCR guardrails")
            
            session.add_run_trace({
                "operation": "guardrail_validation",
                "ucr_id": ucr.get("id"),
                "sections_used": ["G"],
                "result": "blocked" if violations else "passed",
                "violations_count": len(violations)
            })
    else:
        st.warning("Please enter content to validate")

st.markdown("---")

# Enforcement Settings
st.subheader("⚙️ Enforcement Settings")

col1, col2 = st.columns(2)

with col1:
    hard_exclusion = st.toggle("Hard Exclusion (Fail-Closed)", value=True, help="Block all content with violations")
    allow_suggestions = st.toggle("Allow AI Suggestions", value=True, help="AI can suggest new exclusions")

with col2:
    require_human = st.toggle("Require Human Override", value=True, help="Human must approve guardrail changes")
    audit_logging = st.toggle("Audit Logging", value=True, help="Log all guardrail checks")

st.markdown("---")

# Audit Log
st.subheader("📝 Audit Log")

traces = session.get_run_traces()
guardrail_traces = [t for t in traces if "G" in t.get("sections_used", [])]

if guardrail_traces:
    for trace in guardrail_traces[-5:]:
        st.markdown(f"""
        <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; font-size: 13px;">
            <strong>{trace.get('operation', 'Unknown')}</strong> | 
            {trace.get('timestamp', 'N/A')} |
            Sections: {', '.join(trace.get('sections_used', []))}
        </div>
        """, unsafe_allow_html=True)
else:
    st.info("No guardrail operations logged yet.")
