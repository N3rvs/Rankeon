# Documentación de Rankeon

¡Bienvenido a la documentación de Rankeon! Esta guía te ayudará a entender la estructura del proyecto, las tecnologías utilizadas y las características clave de la aplicación.

## 🚀 Stack Tecnológico

Rankeon está construido con un stack moderno y robusto, diseñado para escalabilidad y una gran experiencia de desarrollo.

-   **Framework Frontend**: [Next.js](https://nextjs.org/) con App Router
-   **Librería UI**: [React](https://react.dev/)
-   **Lenguaje**: [TypeScript](https://www.typescriptlang.org/)
-   **Backend y Base de Datos**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Cloud Functions, Storage)
-   **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
-   **Componentes UI**: [ShadCN UI](https://ui.shadcn.com/)
-   **Inteligencia Artificial**: [Genkit (Google AI)](https://firebase.google.com/docs/genkit)
-   **Formularios**: [React Hook Form](https://react-hook-form.com/) con [Zod](https://zod.dev/) para validación.
-   **Internacionalización (i18n)**: Contexto de React con archivos JSON.

## 📁 Estructura del Proyecto

El proyecto está organizado para separar claramente las responsabilidades y facilitar la navegación.

```
rankeon/
├── src/
│   ├── app/                # Enrutador de Next.js (páginas y layouts)
│   │   ├── (public)/       # Rutas públicas (landing, about, etc.)
│   │   ├── (app)/          # Rutas protegidas (dashboard, perfil, etc.)
│   │   ├── (admin)/        # Panel de administración
│   │   ├── (moderator)/    # Panel de moderación
│   │   └── layout.tsx      # Layout raíz
│   ├── components/         # Componentes de React reutilizables
│   │   ├── ui/             # Componentes base de ShadCN
│   │   ├── auth/           # Componentes de autenticación
│   │   ├── teams/          # Componentes relacionados con equipos
│   │   └── ...
│   ├── contexts/           # Contextos de React (Auth, i18n, etc.)
│   ├── lib/                # Utilidades, acciones y configuración de Firebase
│   │   ├── actions/        # Funciones cliente para llamar a Cloud Functions
│   │   ├── firebase/       # Configuración del cliente de Firebase
│   │   └── types.ts        # Definiciones de tipos de TypeScript
│   ├── functions/          # Código del backend (Cloud Functions for Firebase)
│   │   └── src/
│   │       ├── chat.ts     # Lógica de chat
│   │       ├── teams.ts    # Lógica de equipos
│   │       └── ...
│   ├── hooks/              # Hooks personalizados de React
│   ├── messages/           # Archivos de traducción (i18n)
│   └── ai/                 # Flujos y configuración de Genkit para IA
├── public/                 # Archivos estáticos (imágenes, iconos, manifest.json)
└── ...
```

-   **`src/app`**: Contiene todas las rutas de la aplicación, siguiendo la convención de Next.js App Router. Los grupos de rutas `(public)`, `(app)`, etc., se utilizan para organizar layouts sin afectar a la URL.
-   **`src/components`**: Almacena todos los componentes de React. Los componentes de UI base generados por ShadCN se encuentran en `ui/`, mientras que los componentes más complejos y específicos de una característica se organizan en subdirectorios.
-   **`src/contexts`**: Gestiona el estado global de la aplicación, como la sesión del usuario (`AuthContext`) y el idioma actual (`I18nContext`).
-   **`src/lib`**: Es el núcleo de la lógica del lado del cliente. `actions/` contiene funciones _client-safe_ que llaman a las Cloud Functions. `firebase/` inicializa la conexión con Firebase. `types.ts` es crucial, ya que define todas las interfaces de datos (UserProfile, Team, etc.).
-   **`src/functions`**: Es el backend de la aplicación. Cada archivo corresponde a una o más Cloud Functions que gestionan la lógica de negocio segura (ej. crear un equipo, enviar una solicitud de amistad).
-   **`src/ai`**: Contiene los flujos de Genkit para las funcionalidades de IA, como el "Asistente Rankeon".

## ✨ Características Principales

### 1. Autenticación y Roles de Usuario
-   **Sistema de Roles**: Los usuarios pueden tener roles como `player`, `founder`, `coach`, `moderator`, y `admin`.
-   **Gestión de Sesión**: Se utiliza Firebase Authentication para gestionar el registro, inicio de sesión y sesión de los usuarios.
-   **Rutas Protegidas**: Los `AuthGuard`, `AdminGuard`, y `ModeratorGuard` protegen las rutas según el rol del usuario.

### 2. Gestión de Equipos
-   **Creación y Edición**: Los usuarios con el rol `founder` pueden crear y personalizar sus equipos.
-   **Gestión de Miembros**: Los fundadores y coaches pueden invitar, expulsar y gestionar los roles de los miembros del equipo.
-   **Solicitudes**: Los jugadores pueden solicitar unirse a equipos que estén reclutando.

### 3. Mercado de Jugadores y Equipos
-   **Filtros Avanzados**: Los usuarios pueden buscar jugadores o equipos filtrando por rango, rol, país, etc.
-   **Visibilidad**: Los jugadores pueden marcarse como "buscando equipo" para aparecer en el mercado. Los equipos pueden abrir o cerrar su reclutamiento.

### 4. Partidas de Práctica (Scrims) y Torneos
-   **Creación de Scrims**: Los equipos pueden publicar ofertas de scrims para que otros equipos las acepten.
-   **Gestión de Torneos**: Los usuarios con permisos pueden proponer torneos, que luego son revisados por los moderadores. Se genera un bracket visual para seguir el progreso.

### 5. Chat y Notificaciones en Tiempo Real
-   **Chat Directo**: Los amigos pueden enviarse mensajes directos en tiempo real.
-   **Notificaciones**: Un sistema de notificaciones en la bandeja de entrada alerta a los usuarios sobre solicitudes de amistad, invitaciones a equipos, etc.

### 6. Internacionalización (i18n)
-   La aplicación soporta múltiples idiomas (`en`, `es`, `fr`, `de`, `it`, `pt`).
-   El contenido se gestiona a través de archivos JSON en la carpeta `src/messages`.

### 7. Asistente de IA
-   Un chatbot de ayuda (widget flotante) construido con **Genkit** responde a las preguntas de los usuarios sobre cómo funciona la plataforma.

## 🔥 Backend con Firebase

-   **Firestore**: Base de datos NoSQL para almacenar todos los datos de la aplicación (usuarios, equipos, chats, etc.).
-   **Cloud Functions**: Funciones serverless escritas en TypeScript que ejecutan toda la lógica de negocio segura, como la creación de documentos, validación de permisos y envío de notificaciones.
-   **Authentication**: Gestiona la autenticación de usuarios y los Custom Claims para el control de roles.
-   **Storage**: Almacena archivos subidos por los usuarios, como avatares y banners de equipo.

## 💻 Cómo Empezar

1.  **Clona el repositorio.**
2.  **Instala las dependencias**:
    ```bash
    npm install
    ```
3.  **Configura tus variables de entorno**:
    -   Crea un archivo `.env` en la raíz del proyecto.
    -   Añade las credenciales de tu proyecto de Firebase. Las necesitarás de la consola de Firebase.
4.  **Ejecuta el entorno de desarrollo**:
    ```bash
    npm run dev
    ```
    Esto iniciará el frontend de Next.js.
