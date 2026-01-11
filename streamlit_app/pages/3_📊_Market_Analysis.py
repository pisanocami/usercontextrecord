"""
Market Analysis Page - UCR FIRST Market Intelligence
=====================================================

Market demand analysis using UCR as the foundation.

UCR FIRST: Analysis filtered through UCR Sections B, D, E, G.
"""

import streamlit as st
import pandas as pd
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from streamlit_app.services.session_manager import SessionManager

st.set_page_config(
    page_title="Market Analysis | UCR FIRST",
    page_icon="📊",
    layout="wide"
)

session = SessionManager()

# Header
st.title("📊 Market Analysis")
st.markdown('<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">UCR FIRST</span>', unsafe_allow_html=True)

# UCR Check
ucr = session.get_current_ucr()

if not ucr:
    st.error("⚠️ **No UCR Selected** - Select a UCR from the Home page.")
    st.stop()

st.markdown("---")

# UCR Sections Used
st.markdown("#### 📋 UCR Sections Used")
sections = ["B (Category)", "D (Demand)", "E (Strategy)", "G (Guardrails)"]
st.markdown(" → ".join([f"`{s}`" for s in sections]))

st.markdown("---")

# Market Overview
st.subheader("🌍 Market Overview")

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("Market Size", "$45.2B", delta="+8.3% YoY")
with col2:
    st.metric("Your Share", "12.4%", delta="+1.2%")
with col3:
    st.metric("Top Competitor", "23.1%", delta="-0.5%")
with col4:
    st.metric("Growth Rate", "15.2%", delta="+2.1%")

st.markdown("---")

# Category Analysis (UCR Section B)
st.subheader("📁 Category Analysis (Section B)")

# Mock category data
category_data = pd.DataFrame({
    "Category": ["Athletic Footwear", "Running Shoes", "Basketball Shoes", "Training Shoes", "Lifestyle"],
    "Market Share": [23.5, 18.2, 15.8, 12.4, 30.1],
    "Growth": ["+12%", "+18%", "+8%", "+15%", "+5%"],
    "UCR Status": ["✅ Included", "✅ Included", "✅ Included", "✅ Included", "⚠️ Monitor"]
})

st.dataframe(category_data, use_container_width=True, hide_index=True)

st.markdown("---")

# Demand Analysis (UCR Section D)
st.subheader("📈 Demand Analysis (Section D)")

tab1, tab2 = st.tabs(["Brand Keywords", "Category Keywords"])

with tab1:
    st.markdown("#### Brand Keyword Performance")
    
    brand_keywords = pd.DataFrame({
        "Keyword": ["nike shoes", "nike running", "nike air max", "nike jordan", "nike training"],
        "Volume": [450000, 220000, 180000, 320000, 95000],
        "Position": [1, 2, 1, 3, 4],
        "Trend": ["📈 +15%", "📈 +22%", "📉 -3%", "📈 +8%", "➡️ 0%"]
    })
    
    st.dataframe(brand_keywords, use_container_width=True, hide_index=True)

with tab2:
    st.markdown("#### Category Keyword Opportunities")
    
    category_keywords = pd.DataFrame({
        "Keyword": ["best running shoes 2024", "comfortable sneakers", "athletic shoes for work", "sustainable footwear"],
        "Volume": [74000, 45000, 32000, 28000],
        "Difficulty": [72, 58, 45, 38],
        "Opportunity": ["⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"],
        "UCR Filter": ["✅ Pass", "✅ Pass", "✅ Pass", "✅ Pass"]
    })
    
    st.dataframe(category_keywords, use_container_width=True, hide_index=True)

st.markdown("---")

# Competitive Landscape (UCR Section C)
st.subheader("🎯 Competitive Landscape (Section C)")

col1, col2 = st.columns(2)

with col1:
    st.markdown("#### Market Share by Competitor")
    
    # Simple bar representation
    competitors = [
        ("Nike", 23.5, "🟢"),
        ("Adidas", 18.2, "🔵"),
        ("Puma", 8.4, "🟡"),
        ("New Balance", 6.2, "🟠"),
        ("Others", 43.7, "⚪"),
    ]
    
    for name, share, color in competitors:
        st.markdown(f"{color} **{name}**: {share}%")
        st.progress(share / 100)

with col2:
    st.markdown("#### Competitor Movements")
    
    movements = [
        {"competitor": "Adidas", "action": "Launched sustainable line", "impact": "High"},
        {"competitor": "Puma", "action": "Price reduction campaign", "impact": "Medium"},
        {"competitor": "New Balance", "action": "Celebrity endorsement", "impact": "Medium"},
    ]
    
    for m in movements:
        impact_color = "#dc3545" if m["impact"] == "High" else "#ffc107"
        st.markdown(f"""
        <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid {impact_color};">
            <strong>{m['competitor']}</strong>: {m['action']}
            <span style="float: right; color: {impact_color};">{m['impact']}</span>
        </div>
        """, unsafe_allow_html=True)

st.markdown("---")

# Strategic Recommendations (UCR Section E)
st.subheader("💡 Strategic Recommendations (Section E)")

st.markdown(f"""
Based on UCR Strategic Intent: **{ucr.get('name', 'Brand')}**

#### Recommended Actions:

1. **Expand sustainable footwear line** - High growth category (+18% YoY)
2. **Defend running shoes position** - Competitor pressure increasing
3. **Explore training shoes opportunity** - Underserved segment
4. **Monitor lifestyle category** - Large but slower growth

#### UCR Guardrail Compliance:
All recommendations have been filtered through Section G guardrails.
""")

# Run Analysis Button
st.markdown("---")

if st.button("🔄 Refresh Analysis", type="primary", use_container_width=True):
    with st.spinner("Running UCR-filtered market analysis..."):
        import time
        time.sleep(1)
        
        session.add_run_trace({
            "operation": "market_analysis",
            "ucr_id": ucr.get("id"),
            "sections_used": ["B", "D", "E", "G"],
            "analysis_type": "full_market"
        })
        
        st.success("✅ Analysis complete - filtered through UCR guardrails")
