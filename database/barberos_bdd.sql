-- Base de datos para Sistema de Gestión de Barbería
-- SQLite Schema

-- Tabla: Usuarios
CREATE TABLE IF NOT EXISTS Usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);

-- Tabla: Clientes
CREATE TABLE IF NOT EXISTS Clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    tipo_cedula TEXT NOT NULL CHECK(tipo_cedula IN ('V', 'E', 'G', 'J', 'NA')),
    cedula INTEGER NOT NULL,
    telefono TEXT,
    UNIQUE(tipo_cedula, cedula)
);

-- Tabla: Productos
CREATE TABLE IF NOT EXISTS Productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK(cantidad >= 0),
    referencia_en_dolares REAL NOT NULL,
    precio_bs REAL -- Se calcula automáticamente según la tasa del día
);

-- Tabla: Servicios
CREATE TABLE IF NOT EXISTS Servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    referencia_en_dolares REAL NOT NULL,
    precio_bs REAL -- Se calcula automáticamente según la tasa del día
);

-- Tabla: Empleados
CREATE TABLE IF NOT EXISTS Empleados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    tipo_cedula TEXT NOT NULL CHECK(tipo_cedula IN ('V', 'E', 'G', 'J')),
    cedula INTEGER NOT NULL,
    telefono TEXT,
    fecha_de_nacimiento TEXT NOT NULL, -- Formato: "05/09"
    UNIQUE(tipo_cedula, cedula)
);

-- Tabla: TasasCambio
CREATE TABLE IF NOT EXISTS TasasCambio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL, -- Formato: "05/09/2024"
    tasa_bs_por_dolar REAL NOT NULL,
    UNIQUE(fecha)
);

-- Tabla: ConsumosEmpleados
CREATE TABLE IF NOT EXISTS ConsumosEmpleados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_empleado INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    cantidad INTEGER NOT NULL CHECK(cantidad > 0),
    fecha TEXT NOT NULL, -- Formato: "05/09/2024" - Fecha del consumo
    precio_unitario REAL NOT NULL, -- Precio unitario al momento del consumo
    precio_total REAL NOT NULL, -- Precio total (cantidad * precio_unitario)
    estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'pagado')) DEFAULT 'pendiente',
    id_nomina INTEGER, -- ID de la nómina donde se descontó (NULL si está pendiente)
    FOREIGN KEY (id_empleado) REFERENCES Empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES Productos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_nomina) REFERENCES Nominas(id) ON DELETE SET NULL
);

-- Tabla: Nominas
CREATE TABLE IF NOT EXISTS Nominas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_empleado INTEGER NOT NULL,
    comisiones_referencia_en_dolares REAL NOT NULL,
    comisiones_bs REAL NOT NULL,
    propina_en_dolares REAL NOT NULL DEFAULT 0,
    propina_bs REAL NOT NULL DEFAULT 0,
    descuentos_consumos_bs REAL NOT NULL DEFAULT 0, -- Total descontado por consumos de productos
    total_pagado_bs REAL NOT NULL, -- Total final a pagar (comisiones + propina - descuentos) * (porcentaje_pagado / 100)
    porcentaje_pagado INTEGER NOT NULL DEFAULT 100, -- Porcentaje del total que se le paga al empleado (1-100)
    fecha_pago TEXT NOT NULL, -- Formato: "05/09/2024" - Se guarda automáticamente con fecha local del sistema
    FOREIGN KEY (id_empleado) REFERENCES Empleados(id) ON DELETE CASCADE
);

-- Tabla: Transacciones
CREATE TABLE IF NOT EXISTS Transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    fecha_apertura TEXT NOT NULL, -- Fecha/hora de apertura de la cuenta
    fecha_cierre TEXT, -- Fecha/hora de cierre/pago (NULL si está abierta)
    estado TEXT NOT NULL CHECK(estado IN ('abierta', 'cerrada')) DEFAULT 'abierta',
    servicios_consumidos TEXT, -- Resumen de servicios: "corte de pelo, mascarilla, exfoliacion"
    productos_comprados_nombres TEXT, -- Nombres de productos separados (cada línea = un producto)
    productos_comprados_cantidad TEXT, -- Cantidades de productos separadas (cada línea = cantidad del producto correspondiente)
    total_en_dolares REAL NOT NULL DEFAULT 0,
    total_en_bs REAL NOT NULL DEFAULT 0,
    metodos_pago TEXT, -- Métodos de pago separados por coma: "efectivo,transferencia"
    entidades_pago TEXT, -- Entidades de pago separadas por coma: "Banesco,Zelle"
    numero_referencia TEXT, -- Números de referencia separados por coma: "123456,789012"
    FOREIGN KEY (id_cliente) REFERENCES Clientes(id) ON DELETE CASCADE
);

-- Tabla: ServiciosRealizados
CREATE TABLE IF NOT EXISTS ServiciosRealizados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_transaccion INTEGER NOT NULL,
    id_empleado INTEGER NOT NULL,
    id_servicio INTEGER NOT NULL,
    fecha TEXT NOT NULL, -- Fecha/hora del servicio
    precio_cobrado REAL NOT NULL,
    propina REAL NOT NULL DEFAULT 0,
    estado TEXT NOT NULL CHECK(estado IN ('completado', 'cancelado', 'pendiente')) DEFAULT 'completado',
    FOREIGN KEY (id_transaccion) REFERENCES Transacciones(id) ON DELETE CASCADE,
    FOREIGN KEY (id_empleado) REFERENCES Empleados(id) ON DELETE CASCADE,
    FOREIGN KEY (id_servicio) REFERENCES Servicios(id) ON DELETE CASCADE
);

-- Tabla: ProductosVendidos
CREATE TABLE IF NOT EXISTS ProductosVendidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_transaccion INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    cantidad INTEGER NOT NULL CHECK(cantidad > 0),
    fecha TEXT NOT NULL, -- Fecha de venta
    precio_unitario REAL NOT NULL, -- Precio unitario al momento de la venta
    precio_total REAL NOT NULL, -- Precio total (cantidad * precio_unitario)
    FOREIGN KEY (id_transaccion) REFERENCES Transacciones(id) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES Productos(id) ON DELETE CASCADE
);

-- Tabla: Citas
CREATE TABLE IF NOT EXISTS Citas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER, -- FK a Clientes (NULL si no se especifica cliente)
    fecha_hora TEXT NOT NULL, -- Fecha y hora de la cita
    estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_show')) DEFAULT 'pendiente',
    notas TEXT,
    FOREIGN KEY (id_cliente) REFERENCES Clientes(id) ON DELETE SET NULL
);

-- Tabla: ReportesDiarios
CREATE TABLE IF NOT EXISTS ReportesDiarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_reporte TEXT NOT NULL UNIQUE, -- Formato: "05/09/2024"
    fecha_creacion TEXT NOT NULL, -- Fecha/hora de creación del reporte
    tasa_cambio REAL, -- Tasa del día
    total_nominas_pagadas REAL DEFAULT 0, -- Total de nóminas pagadas ese día
    total_servicios REAL DEFAULT 0, -- Total de servicios realizados
    total_productos_vendidos REAL DEFAULT 0, -- Total de productos vendidos
    total_transacciones REAL DEFAULT 0, -- Total de transacciones cerradas
    total_ingresos_bs REAL DEFAULT 0, -- Total de ingresos en bolívares
    total_ingresos_dolares REAL DEFAULT 0, -- Total de ingresos en dólares
    resumen TEXT -- JSON con detalles del reporte
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON Usuarios(username);
CREATE INDEX IF NOT EXISTS idx_clientes_cedula ON Clientes(tipo_cedula, cedula);
CREATE INDEX IF NOT EXISTS idx_empleados_cedula ON Empleados(tipo_cedula, cedula);
CREATE INDEX IF NOT EXISTS idx_transacciones_cliente ON Transacciones(id_cliente);
CREATE INDEX IF NOT EXISTS idx_transacciones_estado ON Transacciones(estado);
CREATE INDEX IF NOT EXISTS idx_servicios_realizados_transaccion ON ServiciosRealizados(id_transaccion);
CREATE INDEX IF NOT EXISTS idx_servicios_realizados_empleado ON ServiciosRealizados(id_empleado);
CREATE INDEX IF NOT EXISTS idx_productos_vendidos_transaccion ON ProductosVendidos(id_transaccion);
CREATE INDEX IF NOT EXISTS idx_consumos_empleados_empleado ON ConsumosEmpleados(id_empleado);
CREATE INDEX IF NOT EXISTS idx_consumos_empleados_estado ON ConsumosEmpleados(estado);
CREATE INDEX IF NOT EXISTS idx_consumos_empleados_nomina ON ConsumosEmpleados(id_nomina);
CREATE INDEX IF NOT EXISTS idx_nominas_empleado ON Nominas(id_empleado);
CREATE INDEX IF NOT EXISTS idx_nominas_fecha ON Nominas(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_tasas_cambio_fecha ON TasasCambio(fecha);
CREATE INDEX IF NOT EXISTS idx_reportes_diarios_fecha ON ReportesDiarios(fecha_reporte);

-- Usuario inicial del sistema
-- Username: admin
-- Password: barberosadmin2025
INSERT OR IGNORE INTO Usuarios (username, password_hash) 
VALUES ('admin', '$2b$10$3xDvloJajFTuo6pwc04W7eWBfSD/SZMGVZom.JzhkVRKBqeb8fIAa');

-- Cliente contado inicial (solo puede haber uno)
-- Este cliente se usa para transacciones de clientes que no están registrados
INSERT OR IGNORE INTO Clientes (nombre, apellido, tipo_cedula, cedula, telefono)
VALUES ('CLIENTE CONTADO', 'CLIENTE CONTADO', 'NA', 0, NULL);

