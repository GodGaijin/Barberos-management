@echo off
echo Ejecutando compilacion como administrador...
echo.
echo Por favor, acepta el prompt de UAC si aparece.
echo.

REM Establecer variable de entorno para deshabilitar firma de codigo
set CSC_IDENTITY_AUTO_DISCOVERY=false

REM Ejecutar electron-builder
call npm run build:unsigned

pause

