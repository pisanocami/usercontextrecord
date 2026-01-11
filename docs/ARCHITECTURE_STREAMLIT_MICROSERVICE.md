# 🏢 Brand Intelligence Platform - Streamlit Microservice Architecture

## Executive Summary

Este documento define la arquitectura de un microservicio Streamlit de nivel Fortune 500 para la plataforma Brand Intelligence. El microservicio opera de forma aislada pero comparte lógica de negocio con la aplicación principal a través de una biblioteca compartida.

---

## 📐 Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BRAND INTELLIGENCE PLATFORM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐         ┌─────────────────────────────────────┐   │
│  │   React App (Main)  │         │     Streamlit Microservice          │   │
│  │   Port: 3001        │         │     Port: 8501                       │   │
│  │                     │         │                                      │   │
│  │  • UCR Editor       │         │  • Competitive Intelligence         │   │
│  │  • Configuration    │         │  • Real-time Signal Detection       │   │
│  │  • Governance       │         │  • Market Analysis Dashboards       │   │
│  │  • Manual Review    │         │  • AI-Powered Insights              │   │
│  └──────────┬──────────┘         └──────────────┬──────────────────────┘   │
│             │                                    │                          │
│             │         ┌──────────────────┐      │                          │
│             └────────►│  Shared Library  │◄─────┘                          │
│                       │  (brand_intel)   │                                 │
│                       │                  │                                 │
│                       │  • Domain Models │                                 │
│                       │  • Business Logic│                                 │
│                       │  • Validators    │                                 │
│                       │  • AI Clients    │                                 │
│                       └────────┬─────────┘                                 │
│                                │                                            │
│             ┌──────────────────┼──────────────────┐                        │
│             │                  │                  │                        │
│             ▼                  ▼                  ▼                        │
│  ┌──────────────────┐ ┌──────────────┐ ┌─────────────────┐                │
│  │   PostgreSQL     │ │   Redis      │ │  External APIs  │                │
│  │   (Shared DB)    │ │   (Cache)    │ │  • OpenAI       │                │
│  │                  │ │              │ │  • Claude       │                │
│  │  • brands        │ │  • Sessions  │ │  • DataForSEO   │                │
│  │  • configs       │ │  • Cache     │ │  • Ahrefs       │                │
│  │  • analyses      │ │  • Queues    │ │  • Gemini       │                │
│  └──────────────────┘ └──────────────┘ └─────────────────┘                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Carpetas del Monorepo

```
usercontextrecord/
├── client/                          # React App (existente)
├── server/                          # Express Backend (existente)
├── shared/                          # TypeScript shared (existente)
│
├── brand_intel/                     # 🆕 Python Shared Library
│   ├── __init__.py
│   ├── pyproject.toml              # Poetry/pip config
│   │
│   ├── core/                       # Core Domain Models
│   │   ├── __init__.py
│   │   ├── models.py               # Pydantic models (Brand, Config, etc.)
│   │   ├── enums.py                # Enumerations
│   │   └── exceptions.py           # Custom exceptions
│   │
│   ├── services/                   # Business Logic Services
│   │   ├── __init__.py
│   │   ├── competitor_analyzer.py  # Competitor analysis logic
│   │   ├── signal_detector.py      # Competitive signal detection
│   │   ├── quality_scorer.py       # Quality score calculation
│   │   ├── guardrail_validator.py  # Negative scope validation
│   │   └── market_analyzer.py      # Market demand analysis
│   │
│   ├── ai/                         # AI Client Abstractions
│   │   ├── __init__.py
│   │   ├── base.py                 # Abstract AI client
│   │   ├── claude_client.py        # Claude/Anthropic client
│   │   ├── openai_client.py        # OpenAI client
│   │   ├── gemini_client.py        # Google Gemini client
│   │   └── prompts/                # Prompt templates
│   │       ├── __init__.py
│   │       ├── competitor_search.py
│   │       ├── insight_generation.py
│   │       └── strategy_analysis.py
│   │
│   ├── data/                       # Data Access Layer
│   │   ├── __init__.py
│   │   ├── database.py             # Database connection
│   │   ├── repositories/           # Repository pattern
│   │   │   ├── __init__.py
│   │   │   ├── brand_repository.py
│   │   │   ├── config_repository.py
│   │   │   ├── analysis_repository.py
│   │   │   └── signal_repository.py
│   │   └── cache.py                # Redis cache client
│   │
│   └── utils/                      # Utilities
│       ├── __init__.py
│       ├── domain_normalizer.py    # Domain normalization
│       ├── validators.py           # Input validators
│       └── formatters.py           # Output formatters
│
├── streamlit_app/                   # 🆕 Streamlit Microservice
│   ├── __init__.py
│   ├── app.py                      # Main Streamlit entry point
│   ├── requirements.txt            # Dependencies
│   ├── Dockerfile                  # Container config
│   ├── docker-compose.yml          # Local dev setup
│   │
│   ├── config/                     # Configuration
│   │   ├── __init__.py
│   │   ├── settings.py             # App settings (Pydantic)
│   │   └── logging.py              # Logging configuration
│   │
│   ├── pages/                      # Streamlit Pages (Multi-page app)
│   │   ├── __init__.py
│   │   ├── 1_🏠_Home.py            # Dashboard home
│   │   ├── 2_🎯_Competitive_Signals.py
│   │   ├── 3_📊_Market_Analysis.py
│   │   ├── 4_🔍_Keyword_Gap.py
│   │   ├── 5_🧠_AI_Insights.py
│   │   ├── 6_📈_Trend_Analyzer.py
│   │   ├── 7_🛡️_Guardrail_Monitor.py
│   │   └── 8_⚙️_Settings.py
│   │
│   ├── components/                 # Reusable UI Components
│   │   ├── __init__.py
│   │   ├── competitor_card.py      # Competitor display card
│   │   ├── signal_alert.py         # Signal alert component
│   │   ├── quality_gauge.py        # Quality score gauge
│   │   ├── evidence_pack.py        # Evidence pack display
│   │   ├── tier_badge.py           # Tier classification badge
│   │   └── charts/                 # Chart components
│   │       ├── __init__.py
│   │       ├── serp_overlap.py
│   │       ├── market_share.py
│   │       └── trend_line.py
│   │
│   ├── services/                   # Streamlit-specific services
│   │   ├── __init__.py
│   │   ├── session_manager.py      # Session state management
│   │   ├── cache_manager.py        # Streamlit caching
│   │   └── auth_service.py         # Authentication
│   │
│   ├── pipelines/                  # Data Processing Pipelines
│   │   ├── __init__.py
│   │   ├── signal_detection.py     # Real-time signal pipeline
│   │   ├── market_analysis.py      # Market analysis pipeline
│   │   └── insight_generation.py   # AI insight pipeline
│   │
│   └── assets/                     # Static assets
│       ├── css/
│       │   └── custom.css
│       └── images/
│
├── tests/                          # 🆕 Comprehensive Test Suite
│   ├── __init__.py
│   ├── conftest.py                 # Pytest fixtures
│   │
│   ├── unit/                       # Unit tests
│   │   ├── test_models.py
│   │   ├── test_services.py
│   │   └── test_validators.py
│   │
│   ├── integration/                # Integration tests
│   │   ├── test_database.py
│   │   ├── test_ai_clients.py
│   │   └── test_pipelines.py
│   │
│   └── e2e/                        # End-to-end tests
│       └── test_streamlit_app.py
│
├── scripts/                        # 🆕 DevOps Scripts
│   ├── setup_dev.sh               # Development setup
│   ├── run_streamlit.sh           # Run Streamlit locally
│   ├── run_tests.sh               # Run test suite
│   └── deploy.sh                  # Deployment script
│
└── docs/                           # Documentation (existente + nuevo)
    ├── ARCHITECTURE_STREAMLIT_MICROSERVICE.md  # Este documento
    ├── API_REFERENCE.md
    ├── DEVELOPER_GUIDE.md
    └── DEPLOYMENT_GUIDE.md
```

---

## 🔧 Componentes Principales

### 1. Shared Library (`brand_intel/`)

La biblioteca compartida contiene toda la lógica de negocio reutilizable entre la app React y Streamlit.

#### Core Models (`brand_intel/core/models.py`)

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class FundingStage(str, Enum):
    UNKNOWN = "unknown"
    BOOTSTRAP = "bootstrap"
    SEED = "seed"
    SERIES_A = "series_a"
    SERIES_B = "series_b"
    SERIES_C_PLUS = "series_c_plus"
    PUBLIC = "public"

class CompetitorTier(str, Enum):
    TIER1 = "tier1"  # Direct
    TIER2 = "tier2"  # Adjacent
    TIER3 = "tier3"  # Aspirational

class CompetitorStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"

class Evidence(BaseModel):
    why_selected: str = ""
    top_overlap_keywords: List[str] = Field(default_factory=list)
    serp_examples: List[str] = Field(default_factory=list)

class Competitor(BaseModel):
    name: str
    domain: str
    tier: CompetitorTier
    status: CompetitorStatus = CompetitorStatus.PENDING_REVIEW
    similarity_score: int = 50
    serp_overlap: int = 0
    size_proximity: int = 50
    revenue_range: str = ""
    employee_count: str = ""
    funding_stage: FundingStage = FundingStage.UNKNOWN
    geo_overlap: List[str] = Field(default_factory=list)
    evidence: Evidence = Field(default_factory=Evidence)
    added_by: str = "ai"
    added_at: datetime = Field(default_factory=datetime.utcnow)
    rejected_reason: str = ""

class Brand(BaseModel):
    name: str
    domain: str
    industry: str = ""
    business_model: str = "B2B"
    primary_geography: List[str] = Field(default_factory=list)
    revenue_band: str = ""
    target_market: str = ""
    funding_stage: FundingStage = FundingStage.UNKNOWN

class QualityScore(BaseModel):
    completeness: int = 0
    competitor_confidence: int = 0
    negative_strength: int = 0
    evidence_coverage: int = 0
    overall: int = 0
    grade: str = "low"  # low, medium, high
    breakdown: Dict[str, str] = Field(default_factory=dict)
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
```

#### Signal Detector Service (`brand_intel/services/signal_detector.py`)

```python
from typing import List, Optional
from brand_intel.core.models import Competitor, Brand, SignalType, Signal
from brand_intel.ai.claude_client import ClaudeClient
from brand_intel.data.repositories import AnalysisRepository

class SignalDetector:
    """
    Detects competitive intelligence signals from market data.
    Implements the Real-Time Competitive Signal Detection Engine.
    """
    
    def __init__(
        self,
        ai_client: ClaudeClient,
        analysis_repo: AnalysisRepository
    ):
        self.ai_client = ai_client
        self.analysis_repo = analysis_repo
    
    async def detect_signals(
        self,
        brand: Brand,
        competitors: List[Competitor],
        signal_types: Optional[List[SignalType]] = None,
        lookback_days: int = 30
    ) -> List[Signal]:
        """
        Detect competitive signals for a brand.
        
        Args:
            brand: The brand to analyze
            competitors: List of competitors to monitor
            signal_types: Types of signals to detect
            lookback_days: How far back to look for changes
            
        Returns:
            List of detected signals with severity and recommendations
        """
        signals = []
        
        # 1. Detect ranking shifts
        if not signal_types or SignalType.RANKING_SHIFT in signal_types:
            ranking_signals = await self._detect_ranking_shifts(
                brand, competitors, lookback_days
            )
            signals.extend(ranking_signals)
        
        # 2. Detect new keywords
        if not signal_types or SignalType.NEW_KEYWORD in signal_types:
            keyword_signals = await self._detect_new_keywords(
                brand, competitors, lookback_days
            )
            signals.extend(keyword_signals)
        
        # 3. Detect SERP entrants
        if not signal_types or SignalType.SERP_ENTRANT in signal_types:
            entrant_signals = await self._detect_serp_entrants(
                brand, competitors, lookback_days
            )
            signals.extend(entrant_signals)
        
        # 4. Use AI to prioritize and enrich signals
        enriched_signals = await self._enrich_with_ai(signals, brand)
        
        return enriched_signals
```

### 2. Streamlit App (`streamlit_app/`)

#### Main Entry Point (`streamlit_app/app.py`)

```python
"""
Brand Intelligence Platform - Streamlit Microservice
Fortune 500 Grade Competitive Intelligence Dashboard
"""

import streamlit as st
from config.settings import Settings
from config.logging import setup_logging
from services.session_manager import SessionManager
from services.auth_service import AuthService

# Initialize
settings = Settings()
setup_logging(settings)
session = SessionManager()
auth = AuthService()

# Page config
st.set_page_config(
    page_title="Brand Intelligence Platform",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'Get Help': 'https://docs.brandintel.io',
        'Report a bug': 'https://github.com/brandintel/issues',
        'About': '# Brand Intelligence Platform\nFortune 500 Grade Competitive Intelligence'
    }
)

# Custom CSS
with open("assets/css/custom.css") as f:
    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# Authentication check
if not auth.is_authenticated():
    auth.show_login_page()
    st.stop()

# Main dashboard
def main():
    st.title("🎯 Brand Intelligence Platform")
    st.markdown("### Real-Time Competitive Intelligence Dashboard")
    
    # Sidebar - Brand selector
    with st.sidebar:
        st.image("assets/images/logo.png", width=200)
        selected_brand = session.get_selected_brand()
        
        brands = session.get_user_brands()
        brand_options = {b.name: b for b in brands}
        
        selected = st.selectbox(
            "Select Brand",
            options=list(brand_options.keys()),
            index=0 if brands else None
        )
        
        if selected:
            session.set_selected_brand(brand_options[selected])
    
    # Main content
    if not selected_brand:
        st.info("👈 Select a brand from the sidebar to get started")
        return
    
    # Dashboard metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="Quality Score",
            value=f"{selected_brand.quality_score.overall}%",
            delta="+5% vs last week"
        )
    
    with col2:
        st.metric(
            label="Active Signals",
            value="12",
            delta="3 new today"
        )
    
    with col3:
        st.metric(
            label="Competitors Tracked",
            value=str(len(selected_brand.competitors)),
            delta=None
        )
    
    with col4:
        st.metric(
            label="Market Coverage",
            value="78%",
            delta="+2%"
        )
    
    # Recent signals
    st.markdown("---")
    st.subheader("🚨 Recent Competitive Signals")
    
    # ... rest of dashboard

if __name__ == "__main__":
    main()
```

#### Competitive Signals Page (`streamlit_app/pages/2_🎯_Competitive_Signals.py`)

```python
"""
Competitive Signals - Real-Time Detection Engine
"""

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from brand_intel.services.signal_detector import SignalDetector
from brand_intel.ai.claude_client import ClaudeClient
from components.signal_alert import SignalAlertCard
from components.charts.trend_line import TrendLineChart
from services.session_manager import SessionManager

st.set_page_config(page_title="Competitive Signals", page_icon="🎯", layout="wide")

session = SessionManager()
brand = session.get_selected_brand()

if not brand:
    st.warning("Please select a brand first")
    st.stop()

st.title("🎯 Competitive Signal Detection Engine")
st.markdown(f"### Monitoring signals for **{brand.name}**")

# Filters
col1, col2, col3 = st.columns(3)

with col1:
    lookback = st.selectbox(
        "Lookback Period",
        options=[7, 14, 30, 60, 90],
        index=2,
        format_func=lambda x: f"{x} days"
    )

with col2:
    signal_types = st.multiselect(
        "Signal Types",
        options=["Ranking Shift", "New Keyword", "SERP Entrant", "Demand Inflection"],
        default=["Ranking Shift", "New Keyword"]
    )

with col3:
    min_severity = st.select_slider(
        "Minimum Severity",
        options=["Low", "Medium", "High", "Critical"],
        value="Medium"
    )

# Run detection
if st.button("🔍 Detect Signals", type="primary"):
    with st.spinner("Analyzing competitive landscape..."):
        detector = SignalDetector(
            ai_client=ClaudeClient(),
            analysis_repo=session.get_analysis_repo()
        )
        
        signals = detector.detect_signals(
            brand=brand,
            competitors=brand.competitors,
            lookback_days=lookback
        )
        
        session.set_signals(signals)

# Display signals
signals = session.get_signals()

if signals:
    st.markdown("---")
    
    # Summary metrics
    col1, col2, col3, col4 = st.columns(4)
    
    critical = len([s for s in signals if s.severity == "critical"])
    high = len([s for s in signals if s.severity == "high"])
    
    with col1:
        st.metric("Total Signals", len(signals))
    with col2:
        st.metric("Critical", critical, delta=None)
    with col3:
        st.metric("High Priority", high, delta=None)
    with col4:
        st.metric("Competitors Active", len(set(s.competitor for s in signals)))
    
    # Signal cards
    st.markdown("---")
    
    for signal in sorted(signals, key=lambda x: x.severity, reverse=True):
        SignalAlertCard(signal).render()
else:
    st.info("Click 'Detect Signals' to analyze your competitive landscape")
```

---

## 🔌 Integración con MCP y BYOK Claude

### Claude Client (`brand_intel/ai/claude_client.py`)

```python
"""
Claude AI Client with BYOK Support
"""

import os
from typing import Optional, List, Dict, Any
from anthropic import Anthropic
from brand_intel.ai.base import BaseAIClient
from brand_intel.ai.prompts import COMPETITOR_ANALYSIS_PROMPT, INSIGHT_GENERATION_PROMPT

class ClaudeClient(BaseAIClient):
    """
    Claude client with BYOK (Bring Your Own Key) support.
    Reads API key from environment variable ANTHROPIC_API_KEY.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")
        
        self.client = Anthropic(api_key=self.api_key)
        self.model = "claude-sonnet-4-20250514"
    
    async def analyze_competitors(
        self,
        brand_name: str,
        domain: str,
        category: str,
        existing_competitors: List[str] = None
    ) -> Dict[str, Any]:
        """
        Use Claude to analyze and suggest competitors.
        """
        prompt = COMPETITOR_ANALYSIS_PROMPT.format(
            brand_name=brand_name,
            domain=domain,
            category=category,
            existing=", ".join(existing_competitors or [])
        )
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return self._parse_competitor_response(response.content[0].text)
    
    async def generate_insights(
        self,
        signals: List[Dict],
        brand_context: Dict
    ) -> str:
        """
        Generate strategic insights from competitive signals.
        """
        prompt = INSIGHT_GENERATION_PROMPT.format(
            signals=signals,
            brand=brand_context
        )
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return response.content[0].text
    
    async def sequential_reasoning(
        self,
        problem: str,
        context: Dict
    ) -> List[Dict[str, str]]:
        """
        Use Claude for multi-step reasoning about competitive strategy.
        """
        prompt = f"""
        Analyze this competitive intelligence problem step by step:
        
        Problem: {problem}
        
        Context:
        - Brand: {context.get('brand_name')}
        - Industry: {context.get('industry')}
        - Competitors: {context.get('competitors')}
        
        Provide your analysis in steps, with each step building on the previous.
        Format as JSON array of steps with 'step', 'reasoning', and 'conclusion' fields.
        """
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=3000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return self._parse_reasoning_steps(response.content[0].text)
```

---

## 🚀 Casos de Uso Implementados

### 1. Real-Time Competitive Signal Detection Engine

**Página**: `pages/2_🎯_Competitive_Signals.py`

**Funcionalidad**:
- Monitoreo de 100+ competidores simultáneamente
- Detección de cambios en SERP, nuevas palabras clave
- Alertas automáticas con severidad
- Análisis de intención con Claude

### 2. Autonomous Brand Strategy Optimizer

**Página**: `pages/5_🧠_AI_Insights.py`

**Funcionalidad**:
- Análisis de posición vs competidores
- Identificación de gaps de mercado
- Sugerencias de pivots estratégicos
- Simulación de escenarios

### 3. Market Analysis Dashboard

**Página**: `pages/3_📊_Market_Analysis.py`

**Funcionalidad**:
- Visualización de market share
- Tendencias de demanda
- Análisis de categorías
- Benchmarking competitivo

### 4. Keyword Gap Analyzer

**Página**: `pages/4_🔍_Keyword_Gap.py`

**Funcionalidad**:
- Análisis de gaps de palabras clave
- Oportunidades de bajo costo
- Estrategias de ataque
- Integración con DataForSEO/Ahrefs

### 5. Guardrail Monitor

**Página**: `pages/7_🛡️_Guardrail_Monitor.py`

**Funcionalidad**:
- Monitoreo de compliance
- Validación contra negative scope
- Audit log de decisiones
- Alertas de violaciones

---

## 📦 Dependencias

### `brand_intel/pyproject.toml`

```toml
[tool.poetry]
name = "brand-intel"
version = "1.0.0"
description = "Brand Intelligence Shared Library"
authors = ["Brand Intel Team"]

[tool.poetry.dependencies]
python = "^3.11"
pydantic = "^2.5.0"
sqlalchemy = "^2.0.0"
asyncpg = "^0.29.0"
redis = "^5.0.0"
anthropic = "^0.18.0"
openai = "^1.12.0"
google-generativeai = "^0.4.0"
httpx = "^0.26.0"
tenacity = "^8.2.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0.0"
pytest-asyncio = "^0.23.0"
pytest-cov = "^4.1.0"
black = "^24.1.0"
ruff = "^0.2.0"
mypy = "^1.8.0"
```

### `streamlit_app/requirements.txt`

```
streamlit>=1.31.0
pandas>=2.2.0
plotly>=5.18.0
altair>=5.2.0
watchdog>=4.0.0

# Shared library (local install)
-e ../brand_intel

# Additional
python-dotenv>=1.0.0
streamlit-authenticator>=0.3.0
streamlit-extras>=0.4.0
```

---

## 🐳 Docker Configuration

### `streamlit_app/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy shared library first
COPY brand_intel/ /app/brand_intel/
RUN pip install -e /app/brand_intel/

# Copy Streamlit app
COPY streamlit_app/ /app/streamlit_app/
WORKDIR /app/streamlit_app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8501

# Health check
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

# Run
ENTRYPOINT ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### `streamlit_app/docker-compose.yml`

```yaml
version: '3.8'

services:
  streamlit:
    build:
      context: ..
      dockerfile: streamlit_app/Dockerfile
    ports:
      - "8501:8501"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./:/app/streamlit_app
      - ../brand_intel:/app/brand_intel
    depends_on:
      - redis
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

---

## 🧪 Testing Strategy

### Unit Tests

```python
# tests/unit/test_signal_detector.py

import pytest
from brand_intel.services.signal_detector import SignalDetector
from brand_intel.core.models import Brand, Competitor, CompetitorTier

@pytest.fixture
def sample_brand():
    return Brand(
        name="Nike",
        domain="nike.com",
        industry="Athletic Footwear"
    )

@pytest.fixture
def sample_competitors():
    return [
        Competitor(
            name="Adidas",
            domain="adidas.com",
            tier=CompetitorTier.TIER1,
            serp_overlap=65
        ),
        Competitor(
            name="Puma",
            domain="puma.com",
            tier=CompetitorTier.TIER2,
            serp_overlap=45
        )
    ]

class TestSignalDetector:
    
    @pytest.mark.asyncio
    async def test_detect_ranking_shifts(
        self, sample_brand, sample_competitors, mock_ai_client
    ):
        detector = SignalDetector(ai_client=mock_ai_client)
        
        signals = await detector.detect_signals(
            brand=sample_brand,
            competitors=sample_competitors,
            signal_types=["ranking_shift"]
        )
        
        assert len(signals) > 0
        assert all(s.signal_type == "ranking_shift" for s in signals)
    
    @pytest.mark.asyncio
    async def test_severity_calculation(self, sample_brand, mock_ai_client):
        detector = SignalDetector(ai_client=mock_ai_client)
        
        # Test that large ranking drops get high severity
        signal = detector._calculate_severity(
            position_change=-15,
            search_volume=10000
        )
        
        assert signal.severity in ["high", "critical"]
```

---

## 📋 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create `brand_intel/` shared library structure
- [ ] Implement core Pydantic models
- [ ] Set up database repositories
- [ ] Create Claude client with BYOK

### Phase 2: Core Services (Week 3-4)
- [ ] Implement SignalDetector service
- [ ] Implement QualityScorer service
- [ ] Implement GuardrailValidator service
- [ ] Create AI prompt templates

### Phase 3: Streamlit App (Week 5-6)
- [ ] Set up Streamlit multi-page app
- [ ] Implement Home dashboard
- [ ] Implement Competitive Signals page
- [ ] Implement Market Analysis page

### Phase 4: Advanced Features (Week 7-8)
- [ ] Implement AI Insights page
- [ ] Implement Keyword Gap page
- [ ] Implement Guardrail Monitor
- [ ] Add real-time updates

### Phase 5: Polish & Deploy (Week 9-10)
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Docker containerization
- [ ] Documentation completion
- [ ] Production deployment

---

## 🔐 Security Considerations

1. **API Keys**: All API keys stored in environment variables, never in code
2. **Authentication**: Streamlit Authenticator with session management
3. **Database**: Connection pooling with SSL
4. **CORS**: Strict origin policies
5. **Rate Limiting**: Redis-based rate limiting
6. **Audit Logging**: All actions logged for compliance

---

## 📊 Monitoring & Observability

1. **Metrics**: Prometheus metrics endpoint
2. **Logging**: Structured JSON logging
3. **Tracing**: OpenTelemetry integration
4. **Alerts**: PagerDuty/Slack integration
5. **Dashboards**: Grafana dashboards

---

*Document Version: 1.0.0*
*Last Updated: January 2026*
*Author: Brand Intelligence Platform Team*
