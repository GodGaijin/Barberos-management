# Comandos Git con Token de GitHub

## 🔐 Configurar Remote con Token

### Opción 1: Agregar Token a la URL del Remote (Recomendado)

**Para HTTPS:**

```bash
# Ver el remote actual
git remote -v

# Configurar el remote con token (reemplaza TU_TOKEN con tu token real)
git remote set-url origin https://TU_TOKEN@github.com/GodGaijin/Barberos-management.git

# O si es la primera vez configurando:
git remote add origin https://TU_TOKEN@github.com/GodGaijin/Barberos-management.git
```

**Ejemplo:**
```bash
git remote set-url origin https://ghp_xxxxxxxxxxxxxxxxxxxx@github.com/GodGaijin/Barberos-management.git
```

### Opción 2: Usar Username:Token (Más Seguro)

```bash
# Usar formato username:token
git remote set-url origin https://GodGaijin:TU_TOKEN@github.com/GodGaijin/Barberos-management.git
```

### Opción 3: Usar Git Credential Manager (Más Seguro - Recomendado)

**Windows (Git Credential Manager):**

```bash
# Configurar el remote normalmente (sin token)
git remote set-url origin https://github.com/GodGaijin/Barberos-management.git

# Al hacer push/pull, Git te pedirá credenciales
# Usa tu username de GitHub
# Como contraseña, usa el token (no tu contraseña de GitHub)
```

**O configurar el token globalmente:**
```bash
# Configurar el token para todas las operaciones
git config --global credential.helper manager-core

# Luego al hacer push, ingresa:
# Username: GodGaijin
# Password: tu_token_aqui
```

### Opción 4: Guardar Token en Git Config (No Recomendado para Producción)

```bash
# Guardar token en la configuración (se guarda en texto plano)
git config --global credential.helper store

# O para este repositorio solamente:
git config credential.helper store

# Luego al hacer push, ingresa el token una vez y se guardará
```

## 📋 Comandos Completos para Configurar

### Paso 1: Verificar Remote Actual
```bash
git remote -v
```

### Paso 2: Configurar Remote con Token
```bash
# Reemplaza TU_TOKEN con tu token real
git remote set-url origin https://TU_TOKEN@github.com/GodGaijin/Barberos-management.git
```

### Paso 3: Verificar que Funcionó
```bash
git remote -v
# Deberías ver la URL con el token (aunque aparecerá como asteriscos por seguridad)
```

### Paso 4: Probar con Push
```bash
git push origin main
# O
git push origin master
```

## 🔑 Obtener un Token de GitHub

Si no tienes un token:

1. Ve a: https://github.com/settings/tokens
2. Click en "Generate new token" → "Generate new token (classic)"
3. Dale un nombre: `Git Operations`
4. Selecciona los scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (si usas GitHub Actions)
5. Click en "Generate token"
6. **COPIA EL TOKEN** (solo se muestra una vez)

## ⚠️ Seguridad

**IMPORTANTE:**
- ❌ **NUNCA** subas el token al repositorio
- ❌ **NUNCA** compartas el token públicamente
- ✅ Usa Git Credential Manager cuando sea posible
- ✅ Si usas el token en la URL, ten cuidado con los logs de Git
- ✅ Revoca el token si se compromete

## 🐛 Solución de Problemas

### Error: "remote: Invalid username or password"

**Causa:** El token es inválido o expiró.

**Solución:**
1. Genera un nuevo token
2. Actualiza el remote con el nuevo token

### Error: "fatal: could not read Username"

**Causa:** El formato de la URL está incorrecto.

**Solución:**
```bash
# Verifica el formato correcto
git remote set-url origin https://TU_TOKEN@github.com/GodGaijin/Barberos-management.git
```

### El token aparece en los logs de Git

**Problema:** Si usas `git log` o `git reflog`, el token puede aparecer en la URL.

**Solución:** Usa Git Credential Manager en lugar de poner el token en la URL.

## 📝 Ejemplo Completo

```bash
# 1. Ver remote actual
git remote -v

# 2. Configurar con token (reemplaza ghp_xxx con tu token real)
git remote set-url origin https://ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@github.com/GodGaijin/Barberos-management.git

# 3. Verificar
git remote -v

# 4. Hacer push
git add .
git commit -m "Mensaje del commit"
git push origin main
```

## 🔄 Cambiar de Token en la URL

Si necesitas actualizar el token:

```bash
# Ver el remote actual
git remote -v

# Actualizar con nuevo token
git remote set-url origin https://NUEVO_TOKEN@github.com/GodGaijin/Barberos-management.git
```

## 💡 Recomendación

**Para mayor seguridad, usa Git Credential Manager:**
- No expone el token en la URL
- Se guarda de forma segura
- Funciona automáticamente después de la primera vez

```bash
# Configurar Git Credential Manager
git config --global credential.helper manager-core

# Configurar remote sin token
git remote set-url origin https://github.com/GodGaijin/Barberos-management.git

# Al hacer push, ingresa:
# Username: GodGaijin
# Password: tu_token_aqui
```

