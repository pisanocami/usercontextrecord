#!/usr/bin/env python3
"""
Create Complete UCR with Gemini - Demo Script
=============================================

This script creates a complete User Context Record using Gemini AI
and saves it so it appears as a selected UCR in the Streamlit app.
"""

import sys
import asyncio
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / '.env')
    print("✅ Loaded .env file")
except ImportError:
    print("⚠️ python-dotenv not available")

import streamlit as st
from brand_intel.core.models import (
    Configuration, Brand, CategoryDefinition, Competitors,
    NegativeScope, Governance, Competitor, Evidence, CompetitorTier
)
from brand_intel.services import UCRService
from streamlit_app.services.ai_service import get_ai_service
from streamlit_app.services.session_manager import SessionManager
from streamlit_app.services.data_service import DataService
from streamlit_app.config.settings import Settings


async def create_ucr_with_gemini():
    """Create a complete UCR using Gemini AI."""

    print("🚀 Starting UCR Creation with Gemini...")
    print()

    # Initialize services
    settings = Settings()
    ai_service = get_ai_service()
    session = SessionManager()
    data_service = DataService(settings)
    ucr_service = UCRService()

    # Step 1: Domain and Brand Input
    print("1️⃣ Step 1: Domain & Brand Input")
    domain = "oofos.com"
    brand_name = "Oofos"

    print(f"   📍 Domain: {domain}")
    print(f"   📍 Brand: {brand_name}")
    print()

    # Step 2: AI Analysis with Gemini
    print("2️⃣ Step 2: AI Analysis with Gemini")
    print("   🤖 Using Gemini for analysis...")

    try:
        # Analyze domain with Gemini
        analysis_result = await ai_service.analyze_domain(domain, brand_name, "gemini")
        print("   ✅ Domain analysis completed")
        print(f"   📊 Analysis keys: {list(analysis_result.keys())}")

        # Search competitors with Gemini
        primary_category = analysis_result.get("category", {}).get("primary_category", "Technology")
        competitors_data = await ai_service.search_competitors(domain, primary_category, brand_name, "gemini")
        print("   ✅ Competitor search completed")
        print(f"   👥 Competitors found: {len(competitors_data) if competitors_data else 0}")

        analysis_result["competitors"] = competitors_data

    except Exception as e:
        print(f"   ⚠️ AI analysis encountered an issue: {str(e)}")
        print("   📝 Using fallback data for demo...")

        # Fallback data for demo
        analysis_result = {
            "brand": {
                "name": brand_name,
                "description": "Comfort footwear brand",
                "target_audience": "Active individuals seeking comfort"
            },
            "category": {
                "primary_category": "Footwear",
                "subcategories": ["Athletic Shoes", "Comfort Footwear"],
                "market_size": "Growing comfort footwear market"
            },
            "competitors": [
                {"name": "Birkenstock", "domain": "birkenstock.com", "tier": "primary"},
                {"name": "Allbirds", "domain": "allbirds.com", "tier": "primary"},
                {"name": "Vionic", "domain": "vionic.com", "tier": "secondary"}
            ]
        }

    print()

    # Step 3: Build Complete Configuration
    print("3️⃣ Step 3: Building Complete UCR Configuration")

    try:
        # Create Brand
        brand_data = analysis_result.get("brand", {})
        brand = Brand(
            name=brand_data.get("name", brand_name),
            domain=domain,  # Required field
            description=brand_data.get("description", ""),
            target_market=brand_data.get("target_audience", "")
        )
        print("   ✅ Brand section created")

        # Create Category
        category_data = analysis_result.get("category", {})
        category = CategoryDefinition(
            primary_category=category_data.get("primary_category", "Technology"),
            subcategories=category_data.get("subcategories", []),
            market_context=category_data.get("market_size", "")
        )
        print("   ✅ Category section created")

        # Create Competitors
        competitors_list = []
        competitors_data = analysis_result.get("competitors", [])

        for comp_data in competitors_data[:5]:  # Limit to 5 competitors
            if isinstance(comp_data, dict):
                # Map tier values to valid CompetitorTier enum values
                tier_value = comp_data.get("tier", "secondary")
                if tier_value == "primary":
                    tier_value = "tier1"
                elif tier_value == "secondary":
                    tier_value = "tier2"
                elif tier_value == "tertiary":
                    tier_value = "tier3"
                elif tier_value not in ["tier1", "tier2", "tier3"]:
                    tier_value = "tier2"  # Default to secondary

                competitor = Competitor(
                    name=comp_data.get("name", "Unknown"),
                    domain=comp_data.get("domain", ""),
                    tier=CompetitorTier(tier_value),
                    evidence=Evidence(  # Single Evidence object, not list
                        type="market_presence",
                        description=f"Competitor in {category.primary_category} market",
                        strength="medium"
                    )
                )
                competitors_list.append(competitor)

        competitors = Competitors(competitors=competitors_list)
        print("   ✅ Competitors section created")

        # Create Negative Scope (Guardrails)
        negative_scope = NegativeScope(
            excluded_categories=["Adult Content", "Gambling", "Weapons"],
            excluded_keywords=["Misinformation", "Hate Speech"],
            excluded_use_cases=[],
            excluded_competitors=[]
        )
        print("   ✅ Negative Scope (Guardrails) created")

        # Create Governance
        governance = Governance(
            model_suggested=True,
            human_verified=False,
            validation_status="needs_review",
            context_status="DRAFT_AI",
            cmo_safe=False
        )
        print("   ✅ Governance section created")

        # Build final configuration
        config = Configuration(
            domain=domain,
            brand=brand,
            category=category,
            competitors=competitors,
            negative_scope=negative_scope,
            governance=governance
        )

        print("   ✅ Complete UCR Configuration built")
        print()

        # Step 4: Calculate Quality Score
        print("4️⃣ Step 4: Quality Score Calculation")
        quality_score = ucr_service.calculate_quality_score(config)
        print("   ✅ Quality Score calculated")
        print(f"   📊 Overall Grade: {quality_score.grade}")
        print(f"   📈 Completeness: {quality_score.completeness:.1f}%")
        print()

        # Step 5: Save UCR
        print("5️⃣ Step 5: Saving UCR")
        try:
            # Save to data service
            saved_config = await data_service.save_configuration(config)
            print("   ✅ UCR saved to database")

            # Set as current UCR in session
            session.set_current_ucr(saved_config)
            print("   ✅ UCR set as current/selected UCR")

            print()
            print("🎉 SUCCESS: Complete UCR created with Gemini and saved!")
            print()
            print("📋 UCR Details:")
            print(f"   🏢 Domain: {config.domain}")
            print(f"   📍 Brand: {config.brand.name}")
            print(f"   🏷️ Category: {config.category.primary_category}")
            print(f"   👥 Competitors: {len(config.competitors.competitors)}")
            print(f"   🛡️ Guardrails: {len(config.negative_scope.excluded_categories)}")
            print(f"   📊 Quality Score: {quality_score.grade}")
            print()
            print("🚀 UCR is now available as 'Selected UCR' in the Streamlit app!")

            return config, quality_score

        except Exception as e:
            print(f"   ❌ Error saving UCR: {str(e)}")
            return None, None

    except Exception as e:
        print(f"❌ Error building configuration: {str(e)}")
        return None, None


async def main():
    """Main execution function."""
    print("=" * 60)
    print("🤖 CREATE COMPLETE UCR WITH GEMINI")
    print("=" * 60)
    print()

    try:
        config, quality_score = await create_ucr_with_gemini()

        if config:
            print("=" * 60)
            print("✅ DEMO COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print()
            print("🔄 You can now:")
            print("   1. Open the Streamlit app")
            print("   2. See the UCR in the sidebar as 'Selected UCR'")
            print("   3. Use all modules with this UCR context")
            print("   4. View the complete UCR in the UCR Editor")
        else:
            print("❌ Demo failed - check the error messages above")

    except Exception as e:
        print(f"💥 Critical error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
