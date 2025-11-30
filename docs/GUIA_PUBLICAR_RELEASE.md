# Guía: Cómo Publicar un Release en GitHub

## 📦 Archivos que DEBES Subir al Release

Cuando compilas tu aplicación con `npm run build`, electron-builder genera varios archivos en la carpeta `dist/`. Para que el sistema de actualizaciones funcione correctamente, debes subir estos archivos al GitHub Release:

### ✅ Archivos OBLIGATORIOS (Debes subirlos SIEMPRE)

1. **El Instalador Principal (.exe)**
   - Nombre: `Barberos Management Setup X.X.X.exe`
   - Ejemplo: `Barberos Management Setup 1.0.6.exe`
   - **Este es el archivo que los usuarios descargarán e instalarán**

2. **El archivo latest.yml** ⚠️ **CRÍTICO**
   - Nombre: `latest.yml`
   - **Este archivo es ESENCIAL** - electron-updater lo lee para:
     - Saber qué versión está disponible
     - Dónde descargar el instalador
     - Verificar la integridad del archivo (SHA512)
   - **Sin este archivo, el sistema de actualizaciones NO funcionará**

### 📋 Archivos OPCIONALES (Recomendados pero no obligatorios)

3. **El archivo .blockmap** (Opcional pero recomendado)
   - Nombre: `Barberos Management Setup X.X.X.exe.blockmap`
   - Ejemplo: `Barberos Management Setup 1.0.6.exe.blockmap`
   - Permite actualizaciones delta (solo descarga las partes que cambiaron)
   - Reduce el tamaño de descarga para usuarios que ya tienen una versión anterior

4. **El archivo .nupkg** (Opcional)
   - Solo si quieres habilitar actualizaciones delta avanzadas
   - Generalmente no es necesario para la mayoría de casos

## ❌ Archivos que NO debes subir

- ❌ **NO subas un .rar o .zip** con los archivos dentro
- ❌ **NO subas la carpeta `win-unpacked/`** completa
- ❌ **NO subas archivos de debug** como `builder-debug.yml`
- ❌ **NO subas archivos de versiones anteriores** (solo la versión actual)

## 📝 Proceso Paso a Paso

### Paso 1: Compilar la Aplicación

```bash
npm run build
```

Esto generará los archivos en la carpeta `dist/`

### Paso 2: Verificar los Archivos Generados

Después de compilar, deberías ver en `dist/`:

```
dist/
├── Barberos Management Setup 1.0.6.exe          ← SUBIR
├── Barberos Management Setup 1.0.6.exe.blockmap ← SUBIR (opcional)
└── latest.yml                                    ← SUBIR (OBLIGATORIO)
```

### Paso 3: Crear el Release en GitHub

1. Ve a tu repositorio en GitHub: `https://github.com/GodGaijin/Barberos-management`
2. Haz clic en **"Releases"** (en el menú lateral derecho)
3. Haz clic en **"Draft a new release"** o **"Create a new release"**

### Paso 4: Llenar los Datos del Release

**Tag version:**
- Debe coincidir con la versión en `package.json`
- Formato: `v1.0.6` (con la "v" al inicio)
- Ejemplo: Si tu `package.json` dice `"version": "1.0.6"`, el tag debe ser `v1.0.6`

**Release title:**
- Puede ser el mismo que el tag: `v1.0.6`
- O algo más descriptivo: `v1.0.6 - Mejoras en actualizaciones`

**Description:**
- Describe los cambios de esta versión
- Ejemplo:
  ```
  ## Cambios en v1.0.6
  
  - Sistema de actualizaciones mejorado
  - Corrección de bugs en campos de entrada
  - Mejoras en la interfaz de notificaciones
  ```

### Paso 5: Subir los Archivos Binarios

En la sección **"Attach binaries by dropping them here or selecting them"**:

1. **Arrastra y suelta** o **selecciona** estos archivos (uno por uno o todos a la vez):
   - `Barberos Management Setup 1.0.6.exe` (o el nombre que tenga en tu carpeta `dist/`)
   - `latest.yml` ⚠️ **CRÍTICO - Sin este archivo no funcionará**
   - `Barberos Management Setup 1.0.6.exe.blockmap` (opcional)

2. **IMPORTANTE:** 
   - Sube los archivos **individualmente**, NO dentro de un .rar o .zip
   - El nombre del .exe en el release debe coincidir con el nombre en `latest.yml`
   - Si `latest.yml` dice `Barberos-Management-Setup-1.0.6.exe` (con guiones), GitHub automáticamente convertirá espacios en guiones, así que está bien

3. GitHub mostrará el progreso de subida para cada archivo

### Paso 6: Publicar el Release

1. Verifica que todos los archivos se hayan subido correctamente
2. Si es un borrador, haz clic en **"Publish release"**
3. Si ya está publicado, los cambios se guardan automáticamente

## ✅ Verificación Post-Publicación

Después de publicar, verifica que:

1. El release está publicado (no en borrador)
2. Los archivos están visibles en la sección de "Assets"
3. El archivo `latest.yml` está accesible públicamente
4. La URL del release es: `https://github.com/GodGaijin/Barberos-management/releases/tag/v1.0.6`

## 🔍 Cómo Verificar que Funciona

1. Instala una versión anterior de tu app (ej: 1.0.5)
2. Ejecuta la aplicación
3. Espera 3 segundos (o más)
4. Debería aparecer la notificación de actualización disponible

O verifica manualmente accediendo a:
```
https://github.com/GodGaijin/Barberos-management/releases/latest/download/latest.yml
```

Si puedes ver el contenido del `latest.yml`, el sistema de actualizaciones podrá encontrarlo.

## 📸 Ejemplo Visual de un Release Correcto

```
┌─────────────────────────────────────────────────────────┐
│ Release v1.0.6                                          │
│                                                          │
│ Tag: v1.0.6                                              │
│ Title: v1.0.6 - Mejoras en actualizaciones             │
│                                                          │
│ Description:                                            │
│ - Sistema de actualizaciones mejorado                  │
│ - Corrección de bugs                                    │
│                                                          │
│ Assets (3):                                             │
│ ✅ Barberos Management Setup 1.0.6.exe (80.9 MB)       │
│ ✅ Barberos Management Setup 1.0.6.exe.blockmap (2.1 KB)│
│ ✅ latest.yml (234 bytes)                               │
└─────────────────────────────────────────────────────────┘
```

## ⚠️ Errores Comunes

### ❌ Error: "No se encuentra actualización"
**Causa:** El archivo `latest.yml` no está en el release o el tag no coincide con la versión.

**Solución:**
- Verifica que `latest.yml` esté subido
- Verifica que el tag sea `v1.0.6` si la versión es `1.0.6`
- Verifica que el release esté publicado (no en borrador)

### ❌ Error: "Error al descargar actualización"
**Causa:** El archivo .exe no está accesible o el nombre no coincide con el de `latest.yml`.

**Solución:**
- Verifica que el nombre del .exe en el release coincida exactamente con el nombre en `latest.yml`
- Verifica que el archivo .exe esté completamente subido

### ❌ Error: "Versión no encontrada"
**Causa:** El tag del release no coincide con la versión en `package.json`.

**Solución:**
- Si `package.json` tiene `"version": "1.0.6"`, el tag debe ser `v1.0.6`
- La "v" al inicio es importante

## 🚀 Automatización (Opcional)

Si quieres automatizar este proceso, puedes usar:

```bash
npm run build
# Luego usar electron-builder para publicar automáticamente
npx electron-builder --publish always
```

Esto compilará y publicará automáticamente en GitHub, pero requiere configuración adicional de tokens de GitHub.

## 📚 Resumen Rápido

**Para cada release, sube:**
1. ✅ `Barberos Management Setup X.X.X.exe` (OBLIGATORIO)
2. ✅ `latest.yml` (OBLIGATORIO - CRÍTICO)
3. ✅ `Barberos Management Setup X.X.X.exe.blockmap` (Opcional pero recomendado)

**NO subas:**
- ❌ Archivos comprimidos (.rar, .zip)
- ❌ Carpetas completas
- ❌ Archivos de debug

**Verifica:**
- ✅ Tag coincide con versión (`v1.0.6` para versión `1.0.6`)
- ✅ Release está publicado (no en borrador)
- ✅ Todos los archivos están visibles en Assets

