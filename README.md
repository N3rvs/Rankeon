# Rankeon - Plataforma Competitiva de Gaming

Este es el repositorio del proyecto Rankeon, una plataforma LFG (Looking for Group) diseñada para que los jugadores competitivos encuentren compañeros de equipo, creen equipos y compitan en scrims y torneos.

## 🚀 Empezar

Para poner en marcha el proyecto localmente, sigue estos pasos:

1.  **Clona el repositorio**:
    ```bash
    git clone [URL_DEL_REPOSITORIO]
    cd rankeon
    ```

2.  **Instala las dependencias**:
    Asegúrate de tener [Node.js](https://nodejs.org/) instalado.
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno**:
    -   Crea un archivo llamado `.env` en la raíz del proyecto.
    -   Añade las credenciales de tu proyecto de Firebase. Puedes encontrarlas en la configuración de tu proyecto en la [Consola de Firebase](https://console.firebase.google.com/).
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=...
    ```

4.  **Ejecuta el servidor de desarrollo**:
    ```bash
    npm run dev
    ```

La aplicación estará disponible en `http://localhost:3000`.

## 📚 Documentación

Para una guía detallada sobre **qué problema soluciona la plataforma y cómo puedes sacarle el máximo partido**, consulta nuestra documentación para usuarios y clientes:

➡️ **[¿Qué es Rankeon?](./DOCUMENTATION.md)**

Para una guía técnica sobre **las características, los roles de usuario y cómo funciona cada sección**, consulta nuestra guía de la plataforma:

➡️ **[Guía de la Plataforma](./DOCUMENTATION.md)**


## ✨ Características Principales

-   Creación y gestión de equipos
-   Mercado de jugadores y equipos con filtros
-   Sistema de scrims (partidas de práctica)
-   Gestión de torneos con brackets
-   Chat en tiempo real entre amigos
-   Sistema de notificaciones
-   Roles de usuario (Admin, Moderador, Fundador, Coach)
-   Soporte para múltiples idiomas (i18n)
-   Asistente de IA para ayuda al usuario
