# Guía de Compilación a Ejecutable (.exe)

Esta guía te ayudará a compilar tu aplicación Electron en un ejecutable para Windows.

## Requisitos Previos

1. **Node.js** instalado (versión 14 o superior)
2. **npm** o **yarn** instalado
3. **Icono de la aplicación** (opcional pero recomendado)

## Pasos para Compilar

### 1. Instalar Dependencias

Si aún no has instalado las dependencias:

```bash
npm install
```

### 2. Preparar el Icono (Opcional)

El archivo `package.json` está configurado para usar un icono en `assets/icon.ico`.

**Opciones:**
- **Crear tu propio icono**: Necesitas un archivo `.ico` de 256x256 píxeles o múltiples tamaños
- **Usar un generador online**: Puedes usar herramientas como:
  - https://convertio.co/es/png-ico/
  - https://www.icoconverter.com/
- **Si no tienes icono**: electron-builder usará un icono por defecto

**Nota**: Si no tienes icono, puedes comentar temporalmente la línea `"icon": "assets/icon.ico"` en `package.json` o crear un icono simple.

### 3. Compilar la Aplicación

**⚠️ IMPORTANTE: Debes ejecutar el comando como Administrador**

El proceso de compilación requiere privilegios de administrador debido a que electron-builder necesita crear enlaces simbólicos durante el proceso.

**Opción 1: CMD como Administrador (Recomendado)**
1. Abre CMD como administrador:
   - Presiona `Win + X`
   - Selecciona "Símbolo del sistema (Administrador)" o "Windows PowerShell (Administrador)"
2. Navega a tu carpeta del proyecto
3. Ejecuta:
   ```cmd
   npm run build:unsigned
   ```

**Opción 2: PowerShell como Administrador**
```powershell
npm run build:unsigned
```

Este comando:
- Compilará la aplicación
- Creará un instalador NSIS en la carpeta `dist/`
- Generará un archivo `.exe` instalador

### 4. Ubicación del Ejecutable

Después de la compilación, encontrarás:

- **Instalador**: `dist/Barberos Management Setup 1.0.1.exe`
- **Carpeta de distribución**: `dist/win-unpacked/` (versión sin instalar)

## Configuración de Build

La configuración actual en `package.json` incluye:

- **Target**: NSIS (instalador de Windows)
- **Arquitectura**: x64 (64 bits)
- **Instalador personalizado**: Permite elegir directorio de instalación
- **Accesos directos**: Crea accesos directos en escritorio y menú inicio

## Publicar en GitHub Releases (Opcional)

Si quieres que el build se publique automáticamente en GitHub Releases:

1. **Configura el token de GitHub**:
   ```bash
   set GH_TOKEN=tu_token_aqui
   ```

2. **Compila y publica**:
   ```bash
   npm run build
   ```

Esto creará automáticamente un release en GitHub con el instalador.

## Solución de Problemas

### Error: "Cannot create symbolic link: El cliente no dispone de un privilegio requerido"
**Solución:** Este error ocurre cuando no ejecutas el comando como administrador. 
- Abre CMD o PowerShell como administrador y vuelve a ejecutar `npm run build:unsigned`
- O usa el script `build-admin.bat` haciendo clic derecho → "Ejecutar como administrador"

### Error: "Cannot find module"
- Ejecuta `npm install` nuevamente
- Verifica que todas las dependencias estén instaladas

### Error: "Icon not found"
- Crea un archivo `icon.ico` en la carpeta `assets/`
- O comenta la línea del icono en `package.json`
- La aplicación funcionará sin icono personalizado (usará el icono por defecto de Electron)

### Error: "Build failed"
- Verifica que no haya errores en la consola
- Asegúrate de que todas las dependencias nativas estén compiladas:
  ```bash
  npm run rebuild
  ```
- Asegúrate de estar ejecutando como administrador

### El ejecutable es muy grande
- Esto es normal en Electron, las aplicaciones suelen pesar 100-200 MB
- Puedes usar herramientas como `electron-builder` con opciones de compresión

## Comandos Útiles

```bash
# Compilar solo (sin publicar)
npm run build

# Compilar y publicar en GitHub
npm run build -- --publish always

# Compilar para desarrollo (más rápido, menos optimizado)
npm run build -- --dir

# Ver ayuda de electron-builder
npx electron-builder --help
```

## Notas Importantes

- La primera compilación puede tardar varios minutos (descarga de dependencias)
- El instalador generado incluye todas las dependencias necesarias
- Los usuarios no necesitan tener Node.js instalado para ejecutar la aplicación
- La base de datos se creará automáticamente en la carpeta de datos del usuario

