# Sistema de Actualizaciones Remotas

Este proyecto utiliza `electron-updater` para gestionar actualizaciones automáticas desde GitHub Releases.

## Configuración Inicial

### 1. Configurar GitHub en package.json

Edita el archivo `package.json` y actualiza la sección `build.publish` con tu información de GitHub:

```json
"publish": {
  "provider": "github",
  "owner": "TU_USUARIO_GITHUB",
  "repo": "TU_REPOSITORIO"
}
```

**Ejemplo:**
```json
"publish": {
  "provider": "github",
  "owner": "juanp",
  "repo": "barberos-management"
}
```

### 2. Crear un Token de Acceso Personal (PAT) en GitHub

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Genera un nuevo token con los siguientes permisos:
   - `repo` (acceso completo a repositorios privados)
3. Copia el token generado

### 3. Configurar el Token como Variable de Entorno

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN="tu_token_aqui"
```

**Windows (CMD):**
```cmd
set GH_TOKEN=tu_token_aqui
```

**Linux/Mac:**
```bash
export GH_TOKEN="tu_token_aqui"
```

**Nota:** Para hacerlo permanente, agrega la variable de entorno en la configuración del sistema.

### 4. Publicar una Versión

Cuando quieras publicar una nueva versión:

1. **Actualiza la versión en `package.json`:**
   ```json
   "version": "1.0.1"
   ```

2. **Crea un commit y tag:**
   ```bash
   git add .
   git commit -m "Versión 1.0.1"
   git tag v1.0.1
   git push origin main
   git push origin v1.0.1
   ```

3. **Compila y publica:**
   ```bash
   npm run build
   ```

   Esto creará automáticamente un release en GitHub con los archivos compilados.

## Cómo Funciona

1. **Al iniciar la aplicación:**
   - Se verifica automáticamente si hay actualizaciones disponibles (solo en modo producción, no en `--dev`)

2. **Si hay una actualización disponible:**
   - Se muestra una notificación en la esquina superior derecha
   - El usuario puede elegir:
     - **"Actualizar Ahora"**: Descarga la actualización inmediatamente
     - **"Más Tarde"**: Cierra la notificación

3. **Durante la descarga:**
   - Se muestra una barra de progreso
   - El usuario puede seguir usando la aplicación

4. **Cuando la descarga termina:**
   - Se muestra otra notificación
   - El usuario puede elegir:
     - **"Instalar y Reiniciar"**: Instala la actualización y reinicia la app
     - **"Más Tarde"**: Instala la actualización la próxima vez que cierre la app

## Verificación Manual de Actualizaciones

Los usuarios también pueden verificar manualmente si hay actualizaciones (esto se puede agregar como un botón en el menú si lo deseas).

## Notas Importantes

- Las actualizaciones solo funcionan en modo producción (no en `--dev`)
- El sistema requiere conexión a internet para verificar actualizaciones
- Las actualizaciones se descargan desde GitHub Releases
- El token de GitHub debe tener permisos de `repo` para funcionar con repositorios privados

## Solución de Problemas

### Error: "No se pueden verificar actualizaciones"
- Verifica que el token `GH_TOKEN` esté configurado correctamente
- Verifica que el repositorio y el owner en `package.json` sean correctos
- Asegúrate de que hay releases publicados en GitHub

### Error: "No se puede descargar la actualización"
- Verifica tu conexión a internet
- Verifica que el release en GitHub tenga los archivos necesarios (`.exe` para Windows)
- Revisa la consola para más detalles del error

