# Verificación Paso a Paso: Detectar Actualización 1.0.6

## 📋 Situación Actual

- ✅ Versión instalada: `1.0.5`
- ✅ Versión en GitHub Release: `1.0.6`
- ✅ Debería detectar la actualización

## 🔍 Pasos para Diagnosticar

### Paso 1: Abrir la Consola de Electron

1. Ejecuta la aplicación (versión 1.0.5 instalada)
2. Presiona `Ctrl + Shift + I` (o `F12`) para abrir DevTools
3. Ve a la pestaña "Console"

### Paso 2: Verificar Mensajes Iniciales

Deberías ver estos mensajes al iniciar:
```
✅ Sistema de actualizaciones inicializado
💡 Para verificar actualizaciones manualmente, ejecuta: window.verificarActualizacionesManual()
```

Si no los ves, el sistema no se inicializó correctamente.

### Paso 3: Ejecutar Verificación Manual

En la consola, escribe y presiona Enter:
```javascript
window.verificarActualizacionesManual()
```

### Paso 4: Revisar los Mensajes

Deberías ver una secuencia como esta:

**En la consola del Renderer (navegador):**
```
🔍 Verificación manual de actualizaciones iniciada...
📦 Versión actual según package.json: 1.0.6
✅ updaterAPI disponible, iniciando verificación...
📡 IPC: check-for-updates llamado
```

**En la consola del Main Process (Electron):**
Para ver esta consola, necesitas ejecutar desde terminal o ver los logs del sistema.

**De vuelta en la consola del Renderer:**
```
📋 Resultado completo de verificación: {success: true, result: {...}}
```

O si hay error:
```
❌ Error al verificar: [mensaje de error]
```

### Paso 5: Verificar el latest.yml

Abre en tu navegador:
```
https://github.com/GodGaijin/Barberos-management/releases/latest/download/latest.yml
```

**Deberías ver:**
```yaml
version: 1.0.6
files:
  - url: Barberos-Management-Setup-1.0.6.exe
    sha512: ...
    size: ...
path: Barberos-Management-Setup-1.0.6.exe
...
```

**Si ves el contenido:** El archivo es accesible ✅
**Si da error 404:** El archivo no está accesible ❌

### Paso 6: Verificar el Nombre del Archivo

**Problema común:** El nombre del archivo en `latest.yml` no coincide con el nombre real en GitHub.

1. Ve a tu release en GitHub
2. Mira el nombre exacto del archivo `.exe`
3. Compara con el nombre en `latest.yml`

**Ejemplo de problema:**
- En `latest.yml`: `Barberos-Management-Setup-1.0.6.exe` (con guiones)
- En GitHub: `Barberos.Management.Setup.1.0.6.exe` (con puntos)
- **No coinciden** → No funcionará

**Solución:** Edita el `latest.yml` antes de subirlo para que coincida exactamente.

## 🐛 Posibles Errores y Soluciones

### Error: "No hay actualizaciones disponibles"

**Causa:** La versión instalada es igual o mayor que la del release.

**Verificación:**
- Abre `package.json` en el código fuente
- Verifica la versión: `"version": "1.0.5"`
- Verifica que la app instalada realmente sea 1.0.5

**Solución:** Asegúrate de que la versión instalada sea menor que la del release.

### Error: "Error al verificar actualizaciones"

**Causa:** Problema de conexión, configuración o acceso al repositorio.

**Verificación:**
1. ¿Tienes conexión a internet?
2. ¿El repositorio es público?
3. ¿El nombre del repositorio es correcto? (`Barberos-management` con mayúscula M)

**Solución:** Revisa el mensaje de error específico en la consola.

### Error: "404 Not Found" al acceder a latest.yml

**Causa:** El archivo no está en el release o el release no está publicado.

**Verificación:**
1. ¿El release está publicado (no en Draft)?
2. ¿El archivo `latest.yml` está en el release?
3. ¿El tag es correcto? (`v1.0.6`)

**Solución:** Publica el release y asegúrate de que `latest.yml` esté incluido.

### No aparece ningún mensaje

**Causa:** La verificación no se está ejecutando.

**Solución:** Ejecuta manualmente `window.verificarActualizacionesManual()` en la consola.

## 📝 Información para Compartir

Si el problema persiste, comparte:

1. **Mensajes completos de la consola** (tanto del renderer como del main process si es posible)
2. **Contenido del latest.yml** del release
3. **Nombre exacto del archivo .exe** en el release
4. **URL del release** en GitHub
5. **Versión exacta instalada** (según el sistema operativo)

## ✅ Checklist Final

- [ ] Versión instalada: 1.0.5
- [ ] Versión en release: 1.0.6
- [ ] Release está publicado (no en Draft)
- [ ] El archivo `latest.yml` es accesible en el navegador
- [ ] El nombre del archivo en `latest.yml` coincide con el del release
- [ ] El tag del release es `v1.0.6`
- [ ] Hay conexión a internet
- [ ] El repositorio es público
- [ ] Ejecuté `window.verificarActualizacionesManual()` en la consola
- [ ] Revisé todos los mensajes de la consola

