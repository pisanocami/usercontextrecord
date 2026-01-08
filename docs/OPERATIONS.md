# Guía de Operaciones Técnicas

Esta guía describe los procedimientos para el despliegue, mantenimiento y monitoreo de la plataforma.

## Variables de Entorno

El sistema requiere las siguientes variables de entorno principales:

| Variable | Propósito | Obligatorio |
|----------|-----------|-------------|
| `DATABASE_URL` | Conexión a PostgreSQL (Neon) | Sí |
| `DATAFORSEO_LOGIN` | Credenciales de API para Keyword Gap | Sí |
| `DATAFORSEO_PASSWORD` | Credenciales de API para Keyword Gap | Sí |
| `SESSION_SECRET` | Secreto para firmas de cookies | Sí |

## Mantenimiento de Base de Datos

Utilizamos **Drizzle ORM** para la gestión del esquema.

### Empujar cambios al esquema
Si modificas `shared/schema.ts`, sincroniza la base de datos con:
```bash
npx drizzle-kit push
```

### Inspección visual
Para ver y editar datos directamente:
```bash
npx drizzle-kit studio
```

## Gestión de Módulos (UCR Contracts)

Para añadir un nuevo módulo de análisis:
1. Define el contrato en `shared/module.contract.ts`.
2. Añádelo al `CONTRACT_REGISTRY`.
3. Implementa la lógica de ejecución en `server/execution-gateway.ts`.
4. Ejecuta `npx tsx docs/generate-documentation.ts` para actualizar la documentación técnica.

## Despliegue en Producción

El proyecto está diseñado para ejecutarse en Replit, pero puede ser portado:

1. **Build Frontend**:
   ```bash
   npm run build
   ```
2. **Start Server**:
   ```bash
   npm start
   ```

## Resolución de Problemas Comunes

### Errores de Autenticación
- Verifica que el `active_session` en PostgreSQL no haya expirado.
- En desarrollo, asegúrate de que el middleware de bypass esté habilitado si no hay Replit Auth.

### Fallos en Keyword Gap
- Verifica el balance de la cuenta en DataForSEO.
- Limpia la cache si los datos parecen obsoletos: `DELETE /api/keyword-gap-lite/cache`.
