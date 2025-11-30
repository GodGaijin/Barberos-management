# Sistema de Actualizaciones - Diagrama de Flujo

## 📋 Resumen

El sistema de actualizaciones utiliza `electron-updater` para verificar, descargar e instalar nuevas versiones de la aplicación automáticamente desde GitHub Releases.

## 🎯 Resumen Visual Rápido

```
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: App inicia → Verifica actualizaciones (auto)      │
│           (después de 3 segundos)                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 2: ¿Hay actualización?                               │
│           ├─ NO → No pasa nada                               │
│           └─ SÍ → Muestra notificación                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 3: Usuario ve notificación                            │
│           "Actualización disponible v1.0.6"                 │
│           [Actualizar Ahora] [Más Tarde]                    │
└─────────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │           │
                    ▼           ▼
        ┌───────────────┐  ┌───────────────┐
        │ Actualizar    │  │ Más Tarde     │
        │ Ahora         │  │ (cierra)      │
        └───────────────┘  └───────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 4: Descarga en progreso                              │
│           Barra de progreso: ████████░░ 80%                 │
│           Usuario puede seguir usando la app                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 5: Descarga completada                               │
│           Nueva notificación:                                │
│           "Actualización descargada"                         │
│           [Instalar y Reiniciar] [Más Tarde]                │
└─────────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │           │
                    ▼           ▼
        ┌───────────────┐  ┌───────────────┐
        │ Instalar y    │  │ Más Tarde     │
        │ Reiniciar     │  │ (cierra)      │
        └───────────────┘  └───────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  PASO 6: Instalación automática                            │
│           1. App se cierra                                   │
│           2. Instalador se ejecuta                          │
│           3. Nueva versión se instala                        │
│           4. App se reinicia automáticamente                 │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    INICIO DE LA APLICACIÓN                      │
│                                                                  │
│  1. App se inicia (app.whenReady())                             │
│  2. Se crea la ventana principal                                │
│  3. Se carga el contenido (did-finish-load)                     │
│  4. ⏱️ Espera 3 segundos (solo en producción, no en --dev)     │
│  5. 🔍 autoUpdater.checkForUpdates() se ejecuta automáticamente │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              VERIFICACIÓN DE ACTUALIZACIONES                     │
│                                                                  │
│  autoUpdater consulta:                                            │
│  - GitHub Releases del repositorio configurado                   │
│  - Compara versiones (package.json vs latest release)           │
│  - Lee el archivo latest.yml para información de actualización  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐  ┌───────────────────┐
        │  ACTUALIZACIÓN    │  │  NO HAY            │
        │  DISPONIBLE       │  │  ACTUALIZACIÓN     │
        │                   │  │                    │
        │  Evento:          │  │  Evento:           │
        │  'update-         │  │  'update-not-      │
        │   available'      │  │   available'       │
        └───────────────────┘  └───────────────────┘
                    │                   │
                    │                   └──► (No se hace nada)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│         NOTIFICACIÓN: ACTUALIZACIÓN DISPONIBLE                  │
│                                                                  │
│  main.js (Proceso Principal):                                   │
│  - autoUpdater emite evento 'update-available'                  │
│  - Envía mensaje IPC: 'update-available' → renderer            │
│                                                                  │
│  main.js (Renderer):                                             │
│  - Recibe evento 'update-available'                              │
│  - Llama a showUpdateNotification(info, 'available')             │
│  - Muestra notificación en la UI con:                           │
│    • Versión disponible                                          │
│    • Botón "Actualizar Ahora"                                   │
│    • Botón "Más Tarde"                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐  ┌───────────────────┐
        │  USUARIO ELIGE:    │  │  USUARIO ELIGE:   │
        │  "Actualizar Ahora"│  │  "Más Tarde"      │
        └───────────────────┘  └───────────────────┘
                    │                   │
                    │                   └──► Notificación se cierra
                    │                        (Puede volver a verificar más tarde)
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              INICIO DE DESCARGA                                 │
│                                                                  │
│  Renderer:                                                       │
│  - Usuario hace clic en "Actualizar Ahora"                      │
│  - Se llama a downloadUpdate()                                  │
│  - Llama a updaterAPI.downloadUpdate()                          │
│                                                                  │
│  Main Process (IPC):                                             │
│  - Handler 'download-update' recibe la solicitud                │
│  - Ejecuta autoUpdater.downloadUpdate()                         │
│                                                                  │
│  autoUpdater:                                                   │
│  - Descarga el instalador desde GitHub Releases                 │
│  - Emite eventos 'download-progress' durante la descarga        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         PROGRESO DE DESCARGA (Eventos en tiempo real)           │
│                                                                  │
│  Durante la descarga:                                            │
│  - autoUpdater emite 'download-progress'                        │
│  - Main process envía progreso al renderer vía IPC               │
│  - Renderer actualiza la UI:                                     │
│    • Barra de progreso visual                                   │
│    • Porcentaje de descarga (0-100%)                             │
│    • Texto: "Descargando actualización... X%"                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  DESCARGA         │
                    │  COMPLETADA       │
                    └───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         NOTIFICACIÓN: ACTUALIZACIÓN DESCARGADA                  │
│                                                                  │
│  autoUpdater:                                                   │
│  - Emite evento 'update-downloaded'                             │
│  - Incluye información de la versión descargada                  │
│                                                                  │
│  Main Process:                                                  │
│  - Envía mensaje IPC: 'update-downloaded' → renderer           │
│                                                                  │
│  Renderer:                                                       │
│  - Recibe evento 'update-downloaded'                            │
│  - Llama a showUpdateNotification(info, 'downloaded')            │
│  - Muestra nueva notificación con:                              │
│    • Mensaje de éxito                                            │
│    • Versión descargada                                          │
│    • Botón "Instalar y Reiniciar"                               │
│    • Botón "Más Tarde"                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐  ┌───────────────────┐
        │  USUARIO ELIGE:    │  │  USUARIO ELIGE:   │
        │  "Instalar y       │  │  "Más Tarde"      │
        │   Reiniciar"        │  │                    │
        └───────────────────┘  └───────────────────┘
                    │                   │
                    │                   └──► Notificación se cierra
                    │                        (La actualización queda lista
                    │                         para instalar más tarde)
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              INSTALACIÓN Y REINICIO                              │
│                                                                  │
│  Renderer:                                                       │
│  - Usuario hace clic en "Instalar y Reiniciar"                  │
│  - Se muestra confirmación (modal personalizado)                 │
│  - Si confirma, llama a updaterAPI.quitAndInstall()            │
│                                                                  │
│  Main Process (IPC):                                            │
│  - Handler 'quit-and-install' recibe la solicitud                │
│  - Ejecuta autoUpdater.quitAndInstall(false, true)              │
│    • false = no es silencioso                                   │
│    • true = reiniciar después de instalar                        │
│                                                                  │
│  autoUpdater:                                                   │
│  - Cierra la aplicación                                          │
│  - Ejecuta el instalador descargado                             │
│  - Instala la nueva versión                                     │
│  - Reinicia la aplicación automáticamente                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  APLICACIÓN       │
                    │  REINICIADA       │
                    │  CON NUEVA        │
                    │  VERSIÓN          │
                    └───────────────────┘
```

## 🔧 Configuración Técnica

### Archivos Clave

1. **`src/main/main.js`** (Proceso Principal)
   - Configura `autoUpdater`
   - Maneja eventos de actualización
   - IPC handlers para comunicación con renderer

2. **`src/main/preload.js`**
   - Expone `updaterAPI` de forma segura al renderer
   - Bridge entre main y renderer processes

3. **`src/renderer/scripts/main.js`** (Proceso Renderer)
   - Inicializa listeners de actualizaciones
   - Maneja la UI de notificaciones
   - Funciones: `downloadUpdate()`, `installUpdate()`

4. **`package.json`**
   - Configuración de `electron-builder`
   - Configuración de publicación en GitHub

### Configuración Actual

```javascript
// main.js
autoUpdater.autoDownload = false;  // No descargar automáticamente
autoUpdater.autoInstallOnAppQuit = false;  // No instalar automáticamente
```

**Esto significa:**
- ✅ El usuario tiene control total sobre cuándo descargar e instalar
- ✅ No se descarga nada sin permiso
- ✅ No se instala nada sin confirmación

### Publicación en GitHub

El sistema está configurado para buscar actualizaciones en:
- **Repositorio:** `GodGaijin/Barberos-management`
- **Provider:** GitHub Releases
- **Archivo de metadatos:** `latest.yml` (generado automáticamente por electron-builder)

## 📦 Proceso de Publicación de Actualización

Para publicar una nueva versión:

1. **Actualizar versión en `package.json`**
   ```json
   "version": "1.0.6"  // Incrementar versión
   ```

2. **Compilar la aplicación**
   ```bash
   npm run build
   ```
   Esto genera:
   - Instalador en `dist/`
   - `latest.yml` con metadatos

3. **Crear Release en GitHub**
   - Ir a GitHub → Releases → Draft a new release
   - Tag: `v1.0.6` (debe coincidir con package.json)
   - Subir los archivos generados en `dist/`:
     - `Barberos Management Setup 1.0.6.exe`
     - `latest.yml`
     - `Barberos Management-1.0.6-full.nupkg` (opcional, para delta updates)

4. **Publicar el Release**
   - Una vez publicado, los usuarios recibirán la notificación automáticamente

## 🎯 Flujo de Usuario (Experiencia)

1. **Usuario inicia la aplicación**
   - La app verifica automáticamente actualizaciones (después de 3 segundos)
   - No interrumpe el uso normal

2. **Si hay actualización disponible:**
   - Aparece notificación en la parte superior
   - Usuario puede elegir:
     - "Actualizar Ahora" → Inicia descarga
     - "Más Tarde" → Cierra notificación

3. **Durante la descarga:**
   - Barra de progreso visible
   - Porcentaje actualizado en tiempo real
   - Usuario puede seguir usando la app

4. **Descarga completada:**
   - Nueva notificación aparece
   - Usuario puede elegir:
     - "Instalar y Reiniciar" → Instala y reinicia
     - "Más Tarde" → Cierra, puede instalar después

5. **Instalación:**
   - App se cierra
   - Instalador se ejecuta
   - Nueva versión se instala
   - App se reinicia automáticamente

## ⚠️ Manejo de Errores

El sistema maneja errores en varios puntos:

1. **Error al verificar actualizaciones:**
   - Evento `error` se emite
   - Se envía mensaje al renderer
   - No se muestra notificación (fallo silencioso)

2. **Error al descargar:**
   - Se muestra notificación de error
   - Usuario puede intentar de nuevo

3. **Error al instalar:**
   - La app no se reinicia
   - El usuario puede intentar manualmente

## 🔍 Verificación Manual

Los usuarios también pueden verificar manualmente (si agregas un botón):

```javascript
// En cualquier parte del renderer
window.updaterAPI.checkForUpdates();
```

## 📝 Notas Importantes

1. **Solo funciona en producción:**
   - No verifica actualizaciones si se ejecuta con `--dev`
   - Solo verifica en builds compilados

2. **Requiere conexión a internet:**
   - Para verificar actualizaciones
   - Para descargar el instalador

3. **GitHub Releases es necesario:**
   - Debe haber al menos un release publicado
   - El tag debe coincidir con el formato de versión

4. **Permisos:**
   - La app necesita permisos para:
     - Escribir en el directorio de instalación
     - Ejecutar el instalador
     - Reiniciar la aplicación

## 🧪 Cómo Probar Sin Segundo Ordenador

Aunque no tengas un segundo ordenador, puedes probar el flujo:

1. **Compilar versión actual** (ej: 1.0.5)
2. **Instalar esa versión** en tu máquina
3. **Incrementar versión** en package.json (ej: 1.0.6)
4. **Compilar nueva versión**
5. **Publicar release en GitHub** con la nueva versión
6. **Ejecutar la versión antigua** (1.0.5)
7. **Debería detectar** la actualización disponible

O simplemente revisar los logs en la consola para ver los eventos que se emiten.

