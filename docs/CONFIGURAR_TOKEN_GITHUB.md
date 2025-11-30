# Configurar Token de GitHub para Repositorio Privado

## 📋 Situación

Tu repositorio es **privado** y electron-updater necesita autenticación para acceder a los releases.

## ✅ Opción 1: Hacer el Repositorio Público (Recomendado)

**Esta es la opción más simple y recomendada para aplicaciones de actualización automática.**

### Pasos:
1. Ve a tu repositorio en GitHub
2. Settings → General → Danger Zone
3. Haz clic en "Change visibility" → "Make public"
4. Confirma

**Ventajas:**
- ✅ No necesitas configurar tokens
- ✅ Más simple de mantener
- ✅ Los releases públicos son estándar para aplicaciones

**Desventajas:**
- ❌ El código fuente será visible (pero puedes usar releases sin exponer el código)

## 🔐 Opción 2: Mantener Privado con Token (Más Complejo)

Si necesitas mantener el repositorio privado, necesitas configurar un token de GitHub.

### Paso 1: Crear un Token de GitHub

1. Ve a: https://github.com/settings/tokens
2. Haz clic en "Generate new token" → "Generate new token (classic)"
3. Dale un nombre descriptivo: `Barberos Management Auto-Updater`
4. Selecciona el scope: **`repo`** (Full control of private repositories)
5. Haz clic en "Generate token"
6. **COPIA EL TOKEN INMEDIATAMENTE** (solo se muestra una vez)

### Paso 2: Configurar el Token

#### Opción A: Variable de Entorno (Recomendado para desarrollo)

**Windows (PowerShell):**
```powershell
$env:GITHUB_TOKEN="tu_token_aqui"
```

**Windows (CMD):**
```cmd
set GITHUB_TOKEN=tu_token_aqui
```

**Linux/Mac:**
```bash
export GITHUB_TOKEN="tu_token_aqui"
```

#### Opción B: Archivo .env (No recomendado para producción)

Crea un archivo `.env` en la raíz del proyecto:
```
GITHUB_TOKEN=tu_token_aqui
```

**⚠️ IMPORTANTE:** No subas el archivo `.env` a GitHub. Agrégalo a `.gitignore`.

#### Opción C: Hardcodear en el código (NO RECOMENDADO)

**Solo para pruebas, nunca para producción:**
```javascript
feedURL.token = 'tu_token_aqui';
```

### Paso 3: Verificar que Funciona

1. Configura el token
2. Recompila la aplicación: `npm run build`
3. Ejecuta la aplicación
4. Ejecuta `window.verificarActualizacionesManual()` en la consola
5. Debería funcionar sin error 404

## 🔒 Seguridad del Token

**⚠️ IMPORTANTE:**
- El token tiene acceso completo a tus repositorios privados
- **NUNCA** lo subas a GitHub
- Si el token se compromete, revócalo inmediatamente
- Considera usar un token con permisos limitados si es posible

### Revocar un Token

1. Ve a: https://github.com/settings/tokens
2. Encuentra el token
3. Haz clic en "Revoke"

## 💡 Recomendación Final

**Para aplicaciones de escritorio con actualizaciones automáticas, es común y recomendado hacer el repositorio público** porque:

1. Los releases son públicos de todas formas
2. No expones el código fuente completo (solo lo que está en el release)
3. Es más simple y seguro
4. Es la práctica estándar en la industria

El código fuente puede seguir siendo privado si solo publicas releases compilados.

## 🐛 Solución de Problemas

### Error: "404" después de configurar el token

**Causas posibles:**
1. El token no tiene el scope `repo`
2. El token expiró o fue revocado
3. La variable de entorno no se configuró correctamente
4. El token no se está leyendo en la aplicación compilada

**Solución:**
1. Verifica que el token tenga el scope `repo`
2. Genera un nuevo token
3. Verifica que la variable de entorno esté configurada
4. Para la aplicación compilada, el token debe estar en las variables de entorno del sistema, no solo en la terminal

### Error: "Bad credentials"

**Causa:** El token es inválido o fue revocado.

**Solución:** Genera un nuevo token.

## 📝 Nota sobre Aplicaciones Compiladas

**Problema:** Las variables de entorno configuradas en la terminal no están disponibles en la aplicación compilada.

**Solución:** Para aplicaciones compiladas que se distribuyen a usuarios:
- **Opción 1:** Hacer el repositorio público (recomendado)
- **Opción 2:** Configurar el token en el sistema operativo del usuario (complejo)
- **Opción 3:** Usar un servidor proxy que maneje la autenticación (muy complejo)

**Por esta razón, para aplicaciones distribuidas, hacer el repositorio público es la mejor opción.**

