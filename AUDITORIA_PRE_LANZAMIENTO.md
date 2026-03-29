# Auditoría Pre-lanzamiento — Lead Manager SERASAN
> Generado: 29 marzo 2026 | Revisión: Claude Sonnet 4.6

---

## 1. BUG CRÍTICO RESUELTO: Leads del formulario web no aparecen

### Diagnóstico
La query principal en `useLeads.ts` usa `orderBy('createdAt', 'desc')`. En Firestore, **cualquier documento que no tenga el campo `createdAt` es completamente excluido** de queries con `orderBy`. Los formularios web de `reactivatuedificio.es` y `serasanengineering.com` escriben el timestamp con el nombre de campo `fecha` en lugar de `createdAt`, lo que causaba que esos leads simplemente no aparecieran en la app sin ningún error visible.

### Cómo se detectó
El `mapDocToLead` tenía el fallback `data.createdAt || data.fecha` — evidencia de que el desarrollador sabía que existían docs con `fecha`, pero la query de Firestore excluía esos docs antes de que llegaran al mapper.

### Solución implementada (3 capas)

**Capa 1 — Cloud Function `onNewLead` (prevención futura):**
Todos los documentos nuevos de formulario web son normalizados automáticamente. Si un doc llega sin `createdAt`, la función añade ese campo usando el valor de `fecha` si existe, o `serverTimestamp()` en caso contrario.

**Capa 2 — `useLeads.ts` (resiliencia para docs legacy):**
Se añadió una query secundaria `orderBy('fecha', 'desc')` por cada colección. Los resultados de ambas queries se fusionan y deduplican por `doc.id`. Esto garantiza que los docs escritos antes del fix sigan apareciendo.

**Capa 3 — Función callable `backfillCreatedAt` (migración datos existentes):**
Una función de admin en Cloud Functions que recorre todas las colecciones de leads y añade `createdAt` a los docs que no lo tienen. Se ejecuta desde la UI: `Settings > Mantenimiento > Ejecutar migración`.

### ⚠️ ACCIÓN REQUERIDA por el usuario

**Ejecutar la migración de datos existentes:**
1. Ir a la app → **Configuración** → sección **Mantenimiento**
2. Pulsar **"Ejecutar migración"**
3. El proceso añadirá `createdAt` a todos los leads que tienen `fecha` pero no `createdAt`
4. Una vez completado, todos los leads históricos aparecerán en la lista

---

## 2. Índices Firestore (ACCIÓN REQUERIDA)

Se añadieron 9 índices compuestos en `firestore.indexes.json`. Estos índices son necesarios para:
- La query `status + createdAt` usada en `checkUnattendedLeads`
- La query `status + updatedAt` usada en `checkStaleLeads`
- La query `orderBy('fecha')` para docs legacy

**Los índices se despliegan automáticamente** con el CI/CD al hacer push a `main`. Sin embargo, Firestore tarda entre **2 y 10 minutos** en construir cada índice. Puedes verificar el estado en:

> Firebase Console → Firestore → Índices

Si las Cloud Functions de alertas fallaban antes, ahora deberían funcionar correctamente tras la construcción de índices.

---

## 3. Otros bugs corregidos

| Archivo | Bug | Corrección |
|---------|-----|------------|
| `useLeads.ts` | Race condition: `setLoading(false)` se llamaba cuando cualquier colección respondía, no cuando todas habían respondido | Contador de snapshots esperadas (6 = 3 colecciones × 2 queries), espera hasta que todas respondan |
| `useLeads.ts` | `hasMore` solo chequeaba la última snapshot | Acumula con `prev || snapshot.docs.length >= PAGE_SIZE` |
| `useLeads.ts` | `mapDocToLead` no incluía `enrichment`, `enrichedAt`, `assignedTo`, `assignedAt`, `movedToStatusAt` | Añadidos todos los campos al objeto unificado |
| `DashboardPage.tsx` | `handleViewAllStale` abría nueva pestaña con `window.open('/#/')` | Usa `navigate('/')` de React Router |
| `DashboardPage.tsx` | `useFilterLogic(leads)` llamado innecesariamente creando subscripciones extra | Eliminado import y uso |
| `LeadTable.tsx` | Durante carga, `leads = []` mostraba "Sin resultados" inmediatamente | Skeleton de carga con filas animadas mientras `loading = true` |
| `LeadTable.tsx` | Empty state genérico en todos los casos | Diferenciado: "Aún no hay leads" (0 leads total) vs "Sin resultados" (filtros activos) |

---

## 4. Mejoras UX implementadas

- **Loading skeleton en LeadTable**: Mientras los leads cargan, se muestran 6 filas esqueleto animadas (shimmer) en lugar de un estado vacío confuso
- **Empty states diferenciados**: Mensaje diferente cuando no hay ningún lead en absoluto vs cuando los filtros activos no tienen resultados
- **Panel de Mantenimiento en Settings**: Botón accesible para ejecutar la migración de datos, con feedback visual del resultado
- **firebase.ts exporta `app`**: Permite llamadas a Cloud Functions con la instancia correcta de Firebase app

---

## 5. Checklist pre-lanzamiento

### ✅ Completado automáticamente (deploy)
- [x] Bug de leads faltantes del formulario web corregido
- [x] Cloud Function normaliza `createdAt` en todos los docs nuevos
- [x] Índices Firestore definidos (se despliegan con CI/CD)
- [x] Loading skeleton en la lista de leads
- [x] Empty states claros y diferenciados
- [x] Función `backfillCreatedAt` disponible para admins

### ⚙️ Acciones manuales pendientes (para hacer tú)

#### CRÍTICO — hacer antes de cualquier demo
- [ ] **Ejecutar migración de leads**: Settings → Mantenimiento → "Ejecutar migración"
  - Esto normalizará los leads existentes sin `createdAt` (incluyendo el lead que no aparece)
  - Dura <30 segundos para colecciones pequeñas

#### Firebase Console
- [ ] **Verificar índices Firestore**: Firebase Console → Firestore → Índices → esperar que todos tengan estado "Habilitado"
- [ ] **Verificar reglas de seguridad**: Firebase Console → Firestore → Reglas → asegúrate de que solo usuarios autenticados pueden leer/escribir

#### Cloud Functions
- [ ] **Variables de entorno**: Verificar que estén configurados en GitHub Secrets o en Firebase:
  - `GMAIL_USER` — email de Gmail para alertas
  - `GMAIL_APP_PASS` — App Password de Gmail (no la contraseña normal)
  - `APOLLO_API_KEY` — solo si quieres usar enriquecimiento Apollo
- [ ] **Probar alertas**: Settings → Alertas → activar "Nuevo Lead" con tu email y enviar un lead de prueba

#### Formularios web
- [ ] **Verificar que `reactivatuedificio.es` envía datos correctamente a Firestore**:
  - Enviar formulario de prueba
  - Esperar ~5 segundos (la Cloud Function normaliza createdAt)
  - Abrir la app y verificar que aparece en la lista
- [ ] **Verificar que `serasanengineering.com` envía datos correctamente**:
  - Mismo proceso que arriba

#### Autenticación
- [ ] **Crear usuario(s) adicional(es)**: Settings → Gestión de Usuarios → Añadir Usuario
- [ ] **Verificar que el login funciona en producción**: Abrir la URL de la app en modo incógnito y probar login

#### Limpieza de datos de prueba (opcional pero recomendado antes del lanzamiento)
- [ ] Si hay leads de prueba, hay una función `cleanTestData` en Cloud Functions que puede eliminarlos
  - Se llama via Firebase Console → Functions → "cleanTestData" → Test con `{ "confirm": true }`
  - ⚠️ **ELIMINA TODOS LOS LEADS** — solo hacerlo antes del lanzamiento real

#### Monitoreo post-lanzamiento
- [ ] Activar el **Digest Diario**: Settings → Alertas → Digest Diario (con tu email)
- [ ] Activar **Alertas de Nuevo Lead**: Settings → Alertas → Nuevo Lead (con tu email)
- [ ] Revisar Firebase Console → Functions → Logs el primer día para detectar errores

---

## 6. Arquitectura de datos (para referencia)

### Colecciones de Firestore
| Colección | Origen | Campos principales |
|-----------|--------|-------------------|
| `leads` | Landing pages / Manual | `name`, `email`, `phone`, `createdAt`, `status` |
| `leads_descargas` | Descarga de PDF | `name`, `email`, `recurso`, `createdAt`, `status` |
| `solicitudes_contacto` | Formulario web | `nombre`/`name`, `email`, `mensaje`, `createdAt`/`fecha`, `status` |
| `users/{uid}` | Sistema Auth | `name`, `email`, `role`, `active` |
| `settings/alerts` | Config alertas | Config de las 5 alertas automáticas |
| `settings/emailSequence` | Config emails | Config del drip de onboarding |
| `settings/digest` | Config digest | Config del resumen diario/semanal |
| `tasks` | Top-level + subcollección | Tareas asignadas a leads |

### Cloud Functions activas
| Función | Trigger | Propósito |
|---------|---------|-----------|
| `onNewLead` | onCreate en 3 colecciones | Alerta email nuevo lead + normaliza `createdAt` |
| `checkUnattendedLeads` | Cada hora | Alerta leads sin atender |
| `checkStaleLeads` | Diariamente 10:00 | Alerta leads estancados |
| `dailyDigest` | Diariamente 08:00 | Resumen KPIs por email |
| `backfillCreatedAt` | Callable (admin) | Migración datos legacy |
| `enrichLead` | Callable (autenticado) | Enriquecimiento Apollo.io |
| `autoEnrichNewLead` | onCreate | Auto-enriquecimiento (si Apollo activo) |
| `cleanTestData` | Callable (admin) | Limpieza datos de prueba |
| Secuencia email drip | Scheduled + trigger | Emails automáticos a leads nuevos |

---

## 7. Configuración de CI/CD

El deploy a producción ocurre automáticamente cuando hay push a `main`:
- **Frontend**: Vite build → Firebase Hosting
- **Cloud Functions**: Despliega todas las funciones exportadas de `functions/index.js`
- **Firestore Indexes**: Aplica `firestore.indexes.json`

GitHub Secrets necesarios:
- `FIREBASE_SERVICE_ACCOUNT_*` (o equivalente para Firebase CI)
- `GMAIL_USER`
- `GMAIL_APP_PASS`
- `APOLLO_API_KEY` (opcional)

---

## 8. URLs de producción

- **App**: https://lead-manager-serasan.web.app
- **Firebase Console**: https://console.firebase.google.com/project/[PROJECT_ID]
- **Formulario SERASAN**: https://serasanengineering.com
- **Formulario Reactiva**: https://reactivatuedificio.es

---

*Documento generado automáticamente durante la auditoría pre-lanzamiento.*
