# Análisis de Integración MCP con tu Proyecto UCR

## 📊 Estado Actual del Proyecto

### Arquitectura Existente
Tu proyecto tiene:
- **Backend**: Python con Streamlit microservice
- **AI Integration**: Soporte para Claude, OpenAI y Gemini
- **Core Services**: 
  - `AIService` - Orquestación de proveedores AI
  - `UCRService` - Gestión de User Context Records
  - `DataService` - Persistencia de datos
  - `SessionManager` - Gestión de sesiones

### Flujo Actual de UCR Creation
```
Domain Input → AI Analysis (Gemini/Claude) → Build Config → Calculate Quality Score → Save UCR
```

---

## 🎯 Oportunidades de MCP Integration

### 1. **MCP como Capa de Herramientas Externas**

**Caso de Uso**: Reemplazar/complementar llamadas directas a APIs externas

#### Opción A: MCP para Búsqueda de Competidores
```
Actual: AIService.search_competitors() → Llamadas directas a APIs
Propuesto: MCP Client → MCP Server (Ahrefs/DataForSEO) → Herramientas especializadas
```

**Ventajas**:
- Abstracción de APIs externas
- Reutilizable en múltiples clientes
- Mejor manejo de errores y timeouts
- Caché de resultados

**Implementación**:
```python
# mcp_competitor_server.py (MCP Server)
class CompetitorSearchServer:
    async def search_competitors(self, domain: str, category: str) -> List[Competitor]:
        # Usa Ahrefs API, DataForSEO, etc.
        # Retorna herramientas que el cliente puede usar
        pass

# En AIService
async def search_competitors_via_mcp(self, domain: str, category: str):
    # Conecta a MCP server
    # Usa herramientas disponibles
    # Procesa resultados
    pass
```

#### Opción B: MCP para Análisis de Dominio
```
Actual: analyze_domain() → Llamadas a Gemini/Claude
Propuesto: MCP Client → MCP Server (Web Scraping + AI) → Análisis completo
```

**Herramientas MCP potenciales**:
- `fetch_domain_metadata` - Obtiene metadatos del sitio
- `analyze_content` - Analiza contenido con AI
- `extract_schema` - Extrae Schema.org
- `get_social_profiles` - Busca perfiles sociales

---

### 2. **MCP como Orquestador de Múltiples Proveedores AI**

**Caso de Uso**: Usar MCP para coordinar Claude + Gemini + OpenAI

#### Arquitectura Propuesta
```
Streamlit App
    ↓
MCP Client (en AIService)
    ↓
MCP Server (Orquestador)
    ├→ Claude Tools
    ├→ Gemini Tools
    └→ OpenAI Tools
```

**Ventajas**:
- Fallback automático entre proveedores
- Logging centralizado
- Rate limiting unificado
- Caché de resultados

**Implementación**:
```python
# mcp_ai_orchestrator_server.py
class AIOrchestrator(MCPServer):
    async def analyze_domain(self, domain: str, brand_name: str):
        """Herramienta MCP para análisis de dominio"""
        # Intenta con Claude
        # Si falla, intenta con Gemini
        # Si falla, intenta con OpenAI
        pass
    
    async def search_competitors(self, domain: str, category: str):
        """Herramienta MCP para búsqueda de competidores"""
        # Usa el mejor proveedor disponible
        pass
```

---

### 3. **MCP para Validación y Guardrails**

**Caso de Uso**: Usar MCP para validar contenido contra guardrails

#### Herramientas MCP
- `validate_content` - Valida contra guardrails
- `check_compliance` - Verifica cumplimiento regulatorio
- `analyze_sentiment` - Análisis de sentimiento
- `detect_brand_safety_issues` - Detecta problemas de brand safety

---

## 🔧 Plan de Implementación

### Fase 1: MCP Server para Búsqueda de Competidores (Semana 1)

**Objetivo**: Crear servidor MCP que encapsule búsqueda de competidores

```python
# server/mcp_competitor_server.py
from mcp.server import Server
from mcp.types import Tool, TextContent

class CompetitorSearchServer(Server):
    def __init__(self):
        super().__init__("competitor-search")
        self.register_tool(self.search_competitors)
        self.register_tool(self.analyze_competitor)
    
    async def search_competitors(self, domain: str, category: str) -> TextContent:
        """Busca competidores para un dominio"""
        # Implementación
        pass
    
    async def analyze_competitor(self, competitor_domain: str) -> TextContent:
        """Analiza un competidor específico"""
        # Implementación
        pass
```

**Integración con AIService**:
```python
# En streamlit_app/services/ai_service.py
async def search_competitors_mcp(self, domain: str, category: str):
    # Conecta a MCP server
    async with MCPClient("competitor-search") as client:
        result = await client.call_tool("search_competitors", {
            "domain": domain,
            "category": category
        })
        return self._parse_competitor_results(result)
```

### Fase 2: MCP Server para Análisis de Dominio (Semana 2)

**Objetivo**: Crear servidor MCP para análisis completo de dominio

```python
# server/mcp_domain_analyzer_server.py
class DomainAnalyzerServer(Server):
    async def analyze_domain(self, domain: str, brand_name: str) -> TextContent:
        """Análisis completo de dominio"""
        # 1. Fetch metadata
        # 2. Analyze content
        # 3. Extract schema
        # 4. Get social profiles
        # 5. Combine with AI analysis
        pass
```

### Fase 3: MCP Server Orquestador de AI (Semana 3)

**Objetivo**: Centralizar lógica de múltiples proveedores AI

```python
# server/mcp_ai_orchestrator_server.py
class AIOrchestrator(Server):
    async def analyze_with_best_provider(self, prompt: str, context: Dict):
        """Usa el mejor proveedor disponible"""
        # Lógica de fallback inteligente
        pass
```

---

## 📋 Comparativa: Con vs Sin MCP

### Sin MCP (Actual)
```
Ventajas:
✅ Implementación directa
✅ Menos capas de abstracción
✅ Debugging más simple

Desventajas:
❌ Acoplamiento a APIs específicas
❌ Difícil de reutilizar en otros clientes
❌ Manejo de errores repetido
❌ No hay caché centralizado
```

### Con MCP
```
Ventajas:
✅ Reutilizable en múltiples clientes (CLI, Web, Mobile)
✅ Abstracción de APIs externas
✅ Manejo centralizado de errores
✅ Caché y rate limiting unificado
✅ Fácil de testear
✅ Escalable a múltiples servidores

Desventajas:
❌ Complejidad adicional
❌ Overhead de comunicación (stdio)
❌ Curva de aprendizaje
```

---

## 🚀 Recomendación para tu Proyecto

### Enfoque Híbrido (RECOMENDADO)

**Mantener**:
- Streamlit app como está
- AIService como orquestador principal
- Integración directa con Gemini/Claude para análisis rápido

**Agregar MCP para**:
1. **Búsqueda de competidores** (Fase 1)
   - Encapsula lógica compleja
   - Reutilizable en otros contextos
   - Mejor manejo de múltiples fuentes

2. **Validación de guardrails** (Fase 2)
   - Centraliza reglas de validación
   - Facilita auditoría
   - Escalable a nuevas reglas

3. **Análisis de dominio avanzado** (Fase 3)
   - Web scraping
   - Extracción de datos
   - Análisis de competencia

### Arquitectura Propuesta
```
┌─────────────────────────────────────────┐
│      Streamlit App (Frontend)           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      AIService (Orquestador)            │
│  - Gemini/Claude para análisis rápido   │
│  - MCP Client para operaciones complejas│
└──────────────┬──────────────────────────┘
               │
       ┌───────┼───────┐
       │       │       │
   ┌───▼──┐ ┌─▼──┐ ┌──▼────┐
   │MCP   │ │MCP │ │MCP    │
   │Comp. │ │Domain│ │Guardr.│
   │Server│ │Analyzer
   │      │ │Server│ │Server │
   └──────┘ └─────┘ └───────┘
```

---

## 💡 Casos de Uso Específicos para tu UCR

### 1. Búsqueda de Competidores
**Actual**: `ai_service.search_competitors()` → Llamadas directas
**Con MCP**: MCP Server que coordina múltiples fuentes (Ahrefs, DataForSEO, web scraping)

### 2. Análisis de Dominio
**Actual**: `ai_service.analyze_domain()` → Gemini/Claude
**Con MCP**: MCP Server que combina:
- Metadata extraction
- Content analysis
- Schema.org parsing
- Social profile discovery
- AI analysis

### 3. Validación de Guardrails
**Actual**: Validación inline en AIService
**Con MCP**: MCP Server centralizado que:
- Valida contra categorías excluidas
- Verifica keywords prohibidas
- Analiza cumplimiento regulatorio
- Genera reportes de auditoría

---

## 📝 Próximos Pasos

1. **Decidir**: ¿Implementar MCP ahora o mantener arquitectura actual?
2. **Si SÍ**: Empezar con Fase 1 (Competitor Search Server)
3. **Si NO**: Documentar por qué y mantener plan de migración futura

---

## 🔗 Referencias

- [MCP Build Client Documentation](https://modelcontextprotocol.io/docs/develop/build-client)
- [MCP Build Server Documentation](https://modelcontextprotocol.io/docs/develop/build-server)
- [MCP SDKs](https://modelcontextprotocol.io/docs/develop/sdks)

