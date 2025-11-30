# Guía de Depuración: Sistema de Actualizaciones

## 🔍 Pasos para Diagnosticar el Problema

### 1. Verificar que estás ejecutando la versión COMPILADA

**IMPORTANTE:** El sistema de actualizaciones **NO funciona** si ejecutas la app con:
```bash
npm start
# o
npm run dev
```

**Debes ejecutar la versión compilada:**
- Instala la aplicación desde el archivo `.exe` que generaste
- O ejecuta directamente desde `dist/win-unpacked/Barberos Management.exe`

### 2. Verificar la Consola de Electron

1. Abre la consola de desarrollador en Electron:
   - Presiona `Ctrl + Shift + I` (o `F12`)
   - O agrega `mainWindow.webContents.openDevTools()` temporalmente en el código

2. Busca estos mensajes en la consola:
   - `🚀 Iniciando verificación de actualizaciones...`
   - `📦 Versión actual de la app: X.X.X`
   - `🔍 Buscando actualizaciones...`
   - `✅ Actualización disponible: X.X.X` (si encuentra una)
   - `ℹ️ No hay actualizaciones disponibles` (si no encuentra)
   - `❌ Error en auto-updater:` (si hay un error)

### 3. Verificar que la Versión Instalada sea ANTERIOR

**Para que detecte una actualización:**
- La versión instalada debe ser **menor** que la versión en GitHub
- Ejemplo:
  - Instalada: `1.0.5`
  - GitHub: `1.0.6`
  - ✅ Debería detectar la actualización

Si ambas son `1.0.6`, no detectará nada porque ya está actualizada.

### 4. Verificar el Nombre del Archivo en latest.yml

**Problema común:** El nombre del archivo en `latest.yml` debe coincidir EXACTAMENTE con el nombre del archivo en el release.

**En tu latest.yml actual:**
```yaml
path: Barberos-Management-Setup-1.0.6.exe
url: Barberos-Management-Setup-1.0.6.exe
```

**En GitHub Release (según la imagen):**
- El archivo se llama: `Barberos.Management.Setup.1.0.6.exe` (con **puntos**)

**Esto es un problema de coincidencia.** GitHub puede cambiar espacios por puntos o guiones.

**Solución:** Verifica que el nombre en `latest.yml` coincida exactamente con el nombre que GitHub muestra en el release.

### 5. Verificar la URL del latest.yml

Abre en tu navegador:
```
https://github.com/GodGaijin/Barberos-management/releases/latest/download/latest.yml
```

**Deberías ver:**
- Si el release está publicado correctamente, verás el contenido del `latest.yml`
- Si da error 404, el archivo no está accesible o el release no está publicado

### 6. Verificar el Tag del Release

El tag del release debe ser exactamente `v1.0.6` (con la "v" al inicio) si tu versión es `1.0.6`.

### 7. Verificar que el Release esté PUBLICADO

- El release NO debe estar en "Draft" (borrador)
- Debe estar "Published" (publicado)
- Debe ser el "Latest" release

## 🛠️ Soluciones Comunes

### Problema: "No detecta actualización aunque hay una nueva versión"

**Causas posibles:**
1. Estás ejecutando en modo desarrollo (`npm start`)
2. La versión instalada es igual o mayor que la del release
3. El nombre del archivo en `latest.yml` no coincide con el del release
4. El release está en borrador (Draft)

**Solución:**
1. Instala la versión anterior (ej: 1.0.5)
2. Compila la nueva versión (1.0.6)
3. Publica el release con el tag `v1.0.6`
4. Verifica que `latest.yml` tenga el nombre correcto del archivo
5. Ejecuta la versión instalada (1.0.5) y espera 3 segundos

### Problema: "Error al verificar actualizaciones"

**Causas posibles:**
1. No hay conexión a internet
2. El repositorio no es público o no existe
3. El nombre del repositorio está mal configurado

**Solución:**
1. Verifica tu conexión a internet
2. Verifica que el repositorio `GodGaijin/Barberos-management` sea público
3. Verifica la configuración en `package.json` y `main.js`

### Problema: "El nombre del archivo no coincide"

**Solución:**
1. Abre `dist/latest.yml` después de compilar
2. Verifica el nombre del archivo en la línea `path:` y `url:`
3. Cuando subas el archivo a GitHub, GitHub puede cambiar el nombre
4. Si GitHub cambia el nombre, edita el `latest.yml` manualmente antes de subirlo
5. O renombra el archivo en GitHub para que coincida con el `latest.yml`

## 📝 Checklist de Verificación

Antes de reportar un problema, verifica:

- [ ] Estoy ejecutando la versión COMPILADA (no `npm start`)
- [ ] La versión instalada es MENOR que la del release
- [ ] El release está PUBLICADO (no en Draft)
- [ ] El tag del release es correcto (`v1.0.6` para versión `1.0.6`)
- [ ] El archivo `latest.yml` está en el release
- [ ] El archivo `.exe` está en el release
- [ ] El nombre del archivo en `latest.yml` coincide con el del release
- [ ] Puedo acceder a `https://github.com/GodGaijin/Barberos-management/releases/latest/download/latest.yml`
- [ ] Hay conexión a internet
- [ ] El repositorio es público
- [ ] He esperado al menos 3 segundos después de iniciar la app

## 🔧 Comando para Verificar Manualmente

Puedes agregar un botón temporal en la UI para verificar actualizaciones manualmente:

```javascript
// En cualquier parte del código del renderer
window.verificarActualizacionesManual = async function() {
    if (window.updaterAPI) {
        try {
            const result = await window.updaterAPI.checkForUpdates();
            console.log('Resultado:', result);
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Verificación completada. Revisa la consola.', 'info', 3000);
            }
        } catch (error) {
            console.error('Error:', error);
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Error al verificar: ' + error.message, 'error', 5000);
            }
        }
    }
};
```

Luego en la consola del navegador ejecuta:
```javascript
window.verificarActualizacionesManual()
```

## 📞 Información para Reportar Problemas

Si el problema persiste, proporciona:

1. Versión instalada actual
2. Versión del release en GitHub
3. Mensajes de la consola (especialmente errores)
4. Contenido del `latest.yml` del release
5. Nombre exacto del archivo `.exe` en el release
6. Si el release está publicado o en borrador
7. El tag del release

