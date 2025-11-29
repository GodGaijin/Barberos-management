# Barberos Management

Sistema de gestión para barbería desarrollado con Electron y SQLite.

## Características

- Gestión de clientes, productos, servicios y empleados
- Sistema de transacciones y cuentas
- Gestión de nóminas
- Sistema de tasas de cambio
- Reportes diarios
- Sistema de citas/reservas
- Interfaz moderna con tema oscuro

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm start
```

O con DevTools:

```bash
npm run dev
```

## Compilar para producción

```bash
npm run build
```

## Credenciales por defecto

- Usuario: `admin`
- Contraseña: `barberosadmin2025`

## Estructura del proyecto

```
├── database/
│   └── barberos_bdd.sql    # Esquema de la base de datos
├── src/
│   ├── main/                # Proceso principal de Electron
│   │   ├── main.js          # Punto de entrada
│   │   ├── preload.js       # Script de preload
│   │   └── database/
│   │       └── db.js        # Clase de base de datos
│   └── renderer/            # Proceso de renderizado
│       ├── index.html       # HTML principal
│       ├── styles/          # Estilos CSS
│       └── scripts/         # Scripts del frontend
└── package.json
```

