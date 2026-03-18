# Experto en Lead Manager SERASAN

Este archivo contiene las directrices maestras para el desarrollo y mantenimiento del Gestor de Leads.

## 🎯 Propósito
Centralizar la gestión de leads provenientes de la web corporativa y la landing page en una herramienta móvil-first para el equipo de SERASAN.

## 🛠️ Reglas del Proyecto
- **Tecnología:** React + Vite + Tailwind CSS + Firebase.
- **Datos:** Las colecciones de Firestore son `leads`, `leads_descargas` y `solicitudes_contacto`.
- **Diseño:** Siempre mobile-first, limpio y profesional. Usar iconos de `lucide-react`.
- **Despliegues:** Automatizados mediante GitHub Actions al hacer push a la rama `main`.

## 💼 Lógica de Negocio
- Cada lead debe tener un estado: `nuevo`, `contactado`, `en-progreso` o `cerrado`.
- Las notas de seguimiento son cruciales para el equipo de ventas.
- La exportación CSV debe incluir siempre todos los campos de contacto y notas.

## 🚀 Guía de Evolución
- Para añadir una nueva fuente de leads, actualizar el hook `useLeads.ts`.
- Para métricas nuevas, actualizar la sección de Analytics en `App.tsx`.
