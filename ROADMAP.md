# Roadmap y Estado del Proyecto Rankeon

Este documento describe el estado actual de la aplicación Rankeon, las funcionalidades que faltan por implementar y las posibles áreas de mejora.

## ✅ Estado Actual: Funcionalidades Implementadas

Hemos construido una base sólida y funcional para la plataforma. Lo que ya está en marcha:

### 1. **Núcleo de la Plataforma (LFG - Looking for Group)**
- **Perfiles de Usuario:** Creación y edición de perfiles con información detallada (bio, país, rango, roles, etc.).
- **Mercado de Jugadores y Equipos:** Un sistema de búsqueda con filtros avanzados (rango, rol, país) para encontrar equipos que reclutan o jugadores disponibles.
- **Sistema de Aplicación:** Los jugadores pueden solicitar unirse a equipos.

### 2. **Gestión de Equipos**
- **Creación y Edición:** Los usuarios con el rol de "Founder" pueden crear y personalizar el perfil de su equipo (logo, banner, descripción, redes sociales).
- **Gestión de Miembros:** Los fundadores y coaches pueden invitar, expulsar y gestionar los roles de los miembros del equipo (IGL, roles de juego específicos).
- **Sistema de Reclutamiento:** Los equipos pueden abrir o cerrar su reclutamiento y especificar los roles que necesitan.

### 3. **Roles y Permisos**
- **Sistema de Roles:** Implementado un sistema seguro basado en roles (`Admin`, `Moderator`, `Founder`, `Player`, `Coach`) mediante Firebase Custom Claims.
- **Paneles de Administración:** Páginas dedicadas para `Admin` y `Moderator` con acceso restringido a herramientas de gestión.

### 4. **Funcionalidades Sociales**
- **Sistema de Amistad:** Flujo completo para enviar, aceptar, rechazar y eliminar amigos.
- **Mensajería Directa:** Chat en tiempo real y privado entre amigos.
- **Sistema de Honores:** Los jugadores pueden otorgar honores a otros para fomentar el buen comportamiento.

### 5. **Sistema de Competición (Básico)**
- **Salas de Juego:** Creación de salas temporales para partidas rápidas.
- **Scrims:** Funcionalidad completa para crear, aceptar, cancelar y seguir el estado de las partidas de práctica.
- **Torneos (Fase Inicial):** Los usuarios pueden ver la lista de torneos. Los `Streamers Certificados` y el personal pueden proponer torneos para su aprobación.

### 6. **Tecnología y Arquitectura**
- **Internacionalización (i18n):** La aplicación está preparada para soportar múltiples idiomas.
- **Asistente de IA:** Un chatbot básico está disponible para ayudar a los usuarios con preguntas frecuentes.
- **PWA (Progressive Web App):** La aplicación está configurada para poder ser instalada en dispositivos.

---

## 🚧 Próximos Pasos: Funcionalidades Críticas Faltantes

Estas son las prioridades para llevar Rankeon al siguiente nivel.

### 1. **Sistema de Torneos Avanzado**
- **Brackets Dinámicos:** La visualización actual es estática. Es crucial implementar la lógica para:
    - Generar emparejamientos automáticamente cuando se llenen los cupos.
    - Permitir que los equipos o moderadores reporten los resultados de cada partida.
    - Actualizar el bracket en tiempo real para que los equipos avancen a la siguiente ronda.
- **Notificaciones de Torneos:** Informar a los equipos sobre el inicio de sus partidas, cambios en el bracket, etc.

### 2. **Integración de Pagos (Monetización)**
- **Planes de Suscripción:** La página de precios es solo informativa. Se debe integrar un proveedor de pagos como **Stripe** para gestionar las suscripciones de los roles `Founder` y `Coach`.
- **Webhooks:** Configurar webhooks para que Stripe notifique a nuestro backend sobre pagos exitosos o fallidos y asignar los roles correspondientes automáticamente.

### 3. **Completar Paneles de Staff**
- **Dashboard de Analíticas:** Desarrollar las visualizaciones de métricas clave (registros de usuarios, ingresos, actividad de la plataforma) en el panel de administrador.
- **Gestión de Equipos (Admin):** Crear la interfaz para que los administradores puedan supervisar y gestionar todos los equipos de la plataforma.
- **Gestión de Tickets de Soporte:** Finalizar la interfaz para que los moderadores puedan ver, responder y cerrar tickets de soporte de manera eficiente.

### 4. **Sistema de Notificaciones Ampliado**
- **Central de Notificaciones:** Aunque existen notificaciones para mensajes y amigos, se debe crear un sistema más robusto que alerte sobre:
    - Estado de las solicitudes a equipos.
    - Invitaciones a equipos.
    - Próximas partidas de scrims y torneos.
    - Resultados de partidas.

---

## ✨ Mejoras y Refinamientos Sugeridos

Funcionalidades que mejorarán enormemente la experiencia del usuario y la calidad de la plataforma.

- **Página de Detalles de Partida:** Crear una vista detallada post-partida (tanto para scrims como torneos) que muestre estadísticas avanzadas para cada jugador (K/D/A, headshot %, etc.), en lugar de solo el resultado final.
- **Experiencia en Salas de Juego:**
    - Añadir un chat en tiempo real dentro de cada sala.
    - Mostrar la lista de participantes actualizada en tiempo real.
- **Perfiles de Equipo Mejorados:**
    - Añadir una pestaña de "Historial de Partidas" en el perfil de cada equipo, mostrando sus resultados en scrims y torneos.
- **Integración con Discord (Avanzado):**
    - Explorar la posibilidad de crear canales de voz/texto automáticamente en un servidor de Discord cuando se confirma un scrim o una partida de torneo.
- **Reputación y "Karma":** Desarrollar un sistema de puntuación de reputación basado en los honores recibidos (y reportes) para dar más visibilidad a los jugadores positivos.
- **Optimización del Rendimiento:** A medida que la plataforma crezca, será necesario revisar y optimizar las consultas a Firestore, especialmente en el mercado y las clasificaciones.