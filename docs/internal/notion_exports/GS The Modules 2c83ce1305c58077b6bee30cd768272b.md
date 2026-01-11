# GS | The Modules

- The Modules | .md template
    - Modules Database
        
        ```json
        # 🧩 Modules — Database Instructions  
        **Force of Nature Growth Operating System**
        
        ---
        
        ## Purpose
        
        The **Modules** database is the canonical registry of what the Growth OS can do.
        
        Each module represents a **repeatable growth capability** that:
        - Answers a specific executive question
        - Is governed by a council
        - Produces decisions or decision-support
        - Can be reused across reports, agents, and workflows
        
        This database does **not** contain logic, prompts, or calculations.  
        It defines **what exists**, **who owns it**, and **how it’s used**.
        
        Think of this as the OS **capability index**.
        
        ---
        
        ## Core Rules
        
        - One row = one module
        - Every module must have **one owner council**
        - Modules may support multiple narrative sections
        - Logic and prompts live in **Module Playbooks**, not here
        - Modules must answer a **real executive question**
        - If a module does not drive a decision, it does not belong here
        
        ---
        
        ## Required Properties
        
        ### 🆔 Identity & Status
        
        | Property | Type | Description |
        |--------|------|-------------|
        | **Module Name** | Title | Canonical module name |
        | **Active** | Checkbox | Is this module currently usable? |
        | **Module Version** | Text | v1, v1.1, v2 (semantic versioning encouraged) |
        | **Owner Council** | Relation → Councils | Primary governing council |
        | **Supporting Councils** | Relation → Councils | Optional secondary lenses |
        
        ---
        
        ### 🧠 Strategic Role
        
        | Property | Type | Description |
        |--------|------|-------------|
        | **Module Layer** | Select | Signal / Pulse / Analysis |
        | **Narrative Section** | Select | Market Context / Brand Positioning / Execution Signals / Strategic Actions |
        | **Primary Question Answered** | Text | Executive framing (e.g. “Where are we leaking demand?”) |
        | **Decision Type** | Select | Diagnose / Reallocate / Prioritize / Deprioritize |
        
        ---
        
        ### 🔗 System Integration
        
        | Property | Type | Description |
        |--------|------|-------------|
        | **Module Playbook** | Relation → Module Playbooks | Where the execution logic lives |
        | **Upstream Data Sets** | Multi-select | Data sources (Ahrefs, Trends, SERPAPI, BrightData, etc.) |
        | **Downstream Outputs** | Multi-select | Action Cards, Executive Summary, Priority Scores |
        | **Reusable Dataset** | Checkbox | Does this module create a persistent asset? |
        
        ---
        
        ### 🎯 Governance & Confidence
        
        | Property | Type | Description |
        |--------|------|-------------|
        | **Inference Type** | Select | External / Internal / Hybrid |
        | **Confidence Level** | Select | High / Medium / Inferred |
        | **Risk if Wrong** | Select | Low / Medium / High |
        | **Last Reviewed** | Date | Prevents logic drift |
        
        ---
        
        ## Optional (Advanced)
        
        | Property | Type | Use Case |
        |--------|------|----------|
        | **Dependencies** | Relation → Modules | Modules this one relies on |
        | **Supersedes** | Relation → Modules | Older modules replaced |
        | **Known Limitations** | Text | Edge cases or caveats |
        | **Notes** | Text | Internal context |
        
        ---
        
        ## Usage Guidelines
        
        - Every module must link to **exactly one Module Playbook**
        - Modules with **Inference Type = External** must clearly state limits in outputs
        - Use **Supporting Councils** to signal cross-functional influence
        - Review modules quarterly for relevance and accuracy
        - Deactivate modules rather than deleting them
        
        ---
        
        ## Example (Well-Formed Module)
        
        **Module Name:** Keyword Gap & Visibility  
        **Owner Council:** SEO Visibility & Demand  
        **Supporting Councils:** Strategic Intelligence  
        **Module Layer:** Signal  
        **Narrative Section:** Brand Positioning  
        **Primary Question Answered:** “What search demand are we missing today?”  
        **Decision Type:** Prioritize  
        **Inference Type:** External  
        **Confidence Level:** Medium  
        **Risk if Wrong:** Medium  
        **Reusable Dataset:** ✅  
        
        This is a valid, OS-ready module.
        
        ---
        
        ## What This Database Enables
        
        - Programmatic report assembly
        - Agent routing and tool selection
        - Council-governed reasoning
        - Versioned growth capabilities
        - Clean Supabase migration
        
        ---
        
        ## Final Principle
        
        If **Councils define judgment** and **Playbooks define logic**,  
        then **Modules define capability**.
        
        This database is the **map of what the OS can do**.
        ```
        
    
    [GS | Modules | Playbook](GS%20The%20Modules/GS%20Modules%20Playbook%202c83ce1305c580059391cbae93f804b7.csv)
    

[Modules | Playbooks](GS%20The%20Modules/Modules%20Playbooks%202c83ce1305c58099b462d7b5de799a10.csv)

[GS | Modules](GS%20The%20Modules/GS%20Modules%202c83ce1305c5805886bdf8145e847428.csv)

[GS | Product | Modules | Archive](GS%20The%20Modules/GS%20Product%20Modules%20Archive%202be3ce1305c580f4a6eac6701536bfec.csv)