# Carpeta de Assets

Esta carpeta contiene los recursos visuales de la aplicación.

## Icono de la Aplicación

Para que la aplicación tenga un icono personalizado, coloca un archivo `icon.ico` en esta carpeta.

### Requisitos del Icono:
- **Formato**: `.ico` (formato de icono de Windows)
- **Tamaños recomendados**: 256x256 píxeles o múltiples tamaños (16x16, 32x32, 48x48, 256x256)
- **Formato de imagen original**: Puede ser `.png` o `.jpg` y convertirlo a `.ico`

### Cómo Crear un Icono:

1. **Usando herramientas online**:
   - https://convertio.co/es/png-ico/
   - https://www.icoconverter.com/
   - https://www.favicon-generator.org/

2. **Usando herramientas de escritorio**:
   - **IcoFX** (Windows)
   - **GIMP** (con plugin)
   - **Photoshop** (con plugin)

3. **Pasos**:
   - Crea o encuentra una imagen cuadrada (preferiblemente 512x512 o 256x256)
   - Conviértela a formato `.ico`
   - Guárdala como `icon.ico` en esta carpeta

### Nota:
Si no proporcionas un icono, electron-builder usará un icono por defecto. La aplicación funcionará correctamente sin icono personalizado.

