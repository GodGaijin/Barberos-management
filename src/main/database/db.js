const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DB {
  constructor(userDataPath) {
    // Ruta de la base de datos
    const dbPath = path.join(userDataPath, 'barberos.db');
    
    // Inicializar la base de datos
    this.db = new Database(dbPath);
    
    // Verificar si la base de datos es nueva (no tiene tablas)
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    if (tables.length === 0) {
      // Es una base de datos nueva, ejecutar el esquema
      this.initializeDatabase();
    } else {
      // Base de datos existente, verificar usuario admin y cliente contado
      this.ensureAdminUser();
      this.ensureClienteContado();
      // Actualizar tablas si es necesario
      this.updateProductosServiciosPrecioBs();
      // Migrar tablas de consumos y nóminas
      this.migrateConsumosEmpleados();
      this.migrateNominas();
      this.migrateTransacciones();
      this.migrateReportesDiarios();
      this.migrateCitas();
      // Migrar TasasCambio para permitir múltiples tasas por día
      this.migrateTasasCambio();
      // Migrar ServiciosRealizados para permitir propinas independientes
      this.migrateServiciosRealizados();
      // Migrar tabla de tutoriales
      this.migrateTutoriales();
      // Migrar tablas de respaldo y configuración
      this.migrateBackups();
      this.migrateConfiguracion();
    }
    
    // Habilitar foreign keys
    this.db.pragma('foreign_keys = ON');
  }

  initializeDatabase() {
    try {
      const schemaPath = path.join(__dirname, '../../../database/barberos_bdd.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Ejecutar el esquema
      this.db.exec(schema);
      console.log('Base de datos inicializada con el esquema');
      
      // Verificar y crear usuario admin si no existe
      this.ensureAdminUser();
      
      // Verificar y crear cliente contado si no existe
      this.ensureClienteContado();
      
      // Actualizar tablas si es necesario (para bases de datos existentes)
      this.updateProductosServiciosPrecioBs();
    } catch (error) {
      console.error('Error al inicializar la base de datos:', error);
      throw error;
    }
  }

  ensureAdminUser() {
    try {
      const bcrypt = require('bcryptjs');
      const adminUser = this.get('SELECT * FROM Usuarios WHERE username = ?', ['admin']);
      
      if (!adminUser) {
        console.log('Usuario admin no encontrado, creándolo...');
        const password = 'barberosadmin2025';
        const hash = bcrypt.hashSync(password, 10);
        
        this.run(
          'INSERT INTO Usuarios (username, password_hash) VALUES (?, ?)',
          ['admin', hash]
        );
        console.log('Usuario admin creado exitosamente');
      } else {
        console.log('Usuario admin ya existe');
      }
    } catch (error) {
      console.error('Error al verificar/crear usuario admin:', error);
    }
  }

  ensureClienteContado() {
    try {
      // Primero verificar si necesitamos actualizar el constraint
      this.updateClientesConstraint();
      
      const clienteContado = this.get('SELECT * FROM Clientes WHERE tipo_cedula = ? AND cedula = ?', ['NA', 0]);
      
      if (!clienteContado) {
        console.log('Cliente contado no encontrado, creándolo...');
        this.run(
          'INSERT INTO Clientes (nombre, apellido, tipo_cedula, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
          ['CLIENTE CONTADO', 'CLIENTE CONTADO', 'NA', 0, null]
        );
        console.log('Cliente contado creado exitosamente');
      } else {
        console.log('Cliente contado ya existe');
      }
    } catch (error) {
      console.error('Error al verificar/crear cliente contado:', error);
    }
  }

  updateClientesConstraint() {
    try {
      // Verificar si el constraint ya permite 'NA'
      // Intentamos insertar un registro temporal para verificar
      const testResult = this.db.prepare(`
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name='Clientes'
      `).get();
      
      if (testResult && testResult.sql) {
        const sql = testResult.sql;
        // Si el constraint no incluye 'NA', necesitamos recrear la tabla
        if (!sql.includes("'NA'")) {
          console.log('Actualizando constraint de tabla Clientes para permitir NA...');
          
          // Crear tabla temporal con el nuevo constraint
          this.db.exec(`
            CREATE TABLE Clientes_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nombre TEXT NOT NULL,
              apellido TEXT NOT NULL,
              tipo_cedula TEXT NOT NULL CHECK(tipo_cedula IN ('V', 'E', 'G', 'J', 'NA')),
              cedula INTEGER NOT NULL,
              telefono TEXT,
              UNIQUE(tipo_cedula, cedula)
            );
          `);
          
          // Copiar datos existentes
          this.db.exec(`
            INSERT INTO Clientes_new (id, nombre, apellido, tipo_cedula, cedula, telefono)
            SELECT id, nombre, apellido, tipo_cedula, cedula, telefono FROM Clientes;
          `);
          
          // Eliminar tabla antigua
          this.db.exec('DROP TABLE Clientes;');
          
          // Renombrar tabla nueva
          this.db.exec('ALTER TABLE Clientes_new RENAME TO Clientes;');
          
          // Recrear índices
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_clientes_cedula ON Clientes(tipo_cedula, cedula);');
          
          console.log('Constraint de tabla Clientes actualizado exitosamente');
        }
      }
    } catch (error) {
      console.error('Error al actualizar constraint de Clientes:', error);
      // Si falla, no es crítico, solo intentará crear el cliente contado
    }
  }

  migrateConsumosEmpleados() {
    try {
      // Verificar si la tabla ConsumosEmpleados ya existe
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='ConsumosEmpleados'
      `).get();

      if (!tableExists) {
        console.log('Creando tabla ConsumosEmpleados...');
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS ConsumosEmpleados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_empleado INTEGER NOT NULL,
            id_producto INTEGER NOT NULL,
            cantidad INTEGER NOT NULL CHECK(cantidad > 0),
            fecha TEXT NOT NULL,
            precio_unitario REAL NOT NULL,
            precio_total REAL NOT NULL,
            estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'pagado')) DEFAULT 'pendiente',
            id_nomina INTEGER,
            FOREIGN KEY (id_empleado) REFERENCES Empleados(id) ON DELETE CASCADE,
            FOREIGN KEY (id_producto) REFERENCES Productos(id) ON DELETE CASCADE,
            FOREIGN KEY (id_nomina) REFERENCES Nominas(id) ON DELETE SET NULL
          );
        `);
        
        // Crear índices
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_consumos_empleados_empleado ON ConsumosEmpleados(id_empleado);
          CREATE INDEX IF NOT EXISTS idx_consumos_empleados_estado ON ConsumosEmpleados(estado);
          CREATE INDEX IF NOT EXISTS idx_consumos_empleados_nomina ON ConsumosEmpleados(id_nomina);
        `);
        
        console.log('Tabla ConsumosEmpleados creada exitosamente');
      }
    } catch (error) {
      console.error('Error al migrar tabla ConsumosEmpleados:', error);
    }
  }

  migrateNominas() {
    try {
      // Verificar si la tabla Nominas tiene los nuevos campos
      const tableInfo = this.db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='Nominas'
      `).get();

      if (tableInfo && tableInfo.sql) {
        const sql = tableInfo.sql;
        
        // Verificar si faltan los nuevos campos
        if (!sql.includes('descuentos_consumos_bs') || !sql.includes('total_pagado_bs')) {
          console.log('Actualizando tabla Nominas para incluir descuentos y total pagado...');
          
          // Agregar nuevas columnas si no existen
          try {
            this.db.exec('ALTER TABLE Nominas ADD COLUMN descuentos_consumos_bs REAL NOT NULL DEFAULT 0;');
            console.log('Columna descuentos_consumos_bs agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar descuentos_consumos_bs:', e);
            }
          }
          
          try {
            this.db.exec('ALTER TABLE Nominas ADD COLUMN total_pagado_bs REAL NOT NULL DEFAULT 0;');
            console.log('Columna total_pagado_bs agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar total_pagado_bs:', e);
            }
          }
          
          // Actualizar registros existentes para calcular total_pagado_bs
          this.db.exec(`
            UPDATE Nominas 
            SET total_pagado_bs = (comisiones_bs + propina_bs - COALESCE(descuentos_consumos_bs, 0))
            WHERE total_pagado_bs = 0 OR total_pagado_bs IS NULL;
          `);
          
          console.log('Tabla Nominas actualizada exitosamente');
        }
        
        // Verificar si falta la columna porcentaje_pagado
        if (!sql.includes('porcentaje_pagado')) {
          console.log('Actualizando tabla Nominas para incluir porcentaje_pagado...');
          
          try {
            this.db.exec('ALTER TABLE Nominas ADD COLUMN porcentaje_pagado INTEGER NOT NULL DEFAULT 60;');
            console.log('Columna porcentaje_pagado agregada');
            
            // Actualizar registros existentes para establecer porcentaje en 60%
            this.db.exec(`
              UPDATE Nominas 
              SET porcentaje_pagado = 60
              WHERE porcentaje_pagado IS NULL;
            `);
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar porcentaje_pagado:', e);
            }
          }
        }
        
        // Verificar si faltan los nuevos campos: total_pagado_dolares, moneda_pago, estado_pago
        if (!sql.includes('total_pagado_dolares')) {
          console.log('Actualizando tabla Nominas para incluir total_pagado_dolares, moneda_pago y estado_pago...');
          
          try {
            this.db.exec('ALTER TABLE Nominas ADD COLUMN total_pagado_dolares REAL DEFAULT 0;');
            console.log('Columna total_pagado_dolares agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar total_pagado_dolares:', e);
            }
          }
          
          try {
            this.db.exec('ALTER TABLE Nominas ADD COLUMN moneda_pago TEXT DEFAULT "bs";');
            console.log('Columna moneda_pago agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar moneda_pago:', e);
            }
          }
          
          try {
            this.db.exec('ALTER TABLE Nominas ADD COLUMN estado_pago TEXT DEFAULT "pendiente";');
            console.log('Columna estado_pago agregada');
            
            // Actualizar registros existentes
            this.db.exec(`
              UPDATE Nominas 
              SET estado_pago = 'pendiente'
              WHERE estado_pago IS NULL;
            `);
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar estado_pago:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al migrar tabla Nominas:', error);
    }
  }

  migrateTransacciones() {
    try {
      // Verificar si la tabla Transacciones tiene los nuevos campos
      const tableInfo = this.db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='Transacciones'
      `).get();

      if (tableInfo && tableInfo.sql) {
        const sql = tableInfo.sql;
        
        // Verificar si faltan los nuevos campos
        if (!sql.includes('metodos_pago') || !sql.includes('entidades_pago') || !sql.includes('numero_referencia') || !sql.includes('tasa_cambio')) {
          console.log('Actualizando tabla Transacciones para incluir métodos de pago, entidades, número de referencia y tasa de cambio...');
          
          // Agregar nuevas columnas si no existen
          try {
            this.db.exec('ALTER TABLE Transacciones ADD COLUMN metodos_pago TEXT;');
            console.log('Columna metodos_pago agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar metodos_pago:', e);
            }
          }
          
          try {
            this.db.exec('ALTER TABLE Transacciones ADD COLUMN entidades_pago TEXT;');
            console.log('Columna entidades_pago agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar entidades_pago:', e);
            }
          }
          
          try {
            this.db.exec('ALTER TABLE Transacciones ADD COLUMN numero_referencia TEXT;');
            console.log('Columna numero_referencia agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar numero_referencia:', e);
            }
          }
          
          try {
            this.db.exec('ALTER TABLE Transacciones ADD COLUMN tasa_cambio REAL;');
            console.log('Columna tasa_cambio agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar tasa_cambio:', e);
            }
          }
          
          console.log('Tabla Transacciones actualizada exitosamente');
        }
        
        // Verificar si faltan los campos pagado_bs y pagado_dolares
        if (!sql.includes('pagado_bs')) {
          console.log('Actualizando tabla Transacciones para incluir pagado_bs y pagado_dolares...');
          
          try {
            this.db.exec('ALTER TABLE Transacciones ADD COLUMN pagado_bs REAL DEFAULT 0;');
            console.log('Columna pagado_bs agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar pagado_bs:', e);
            }
          }
          
          try {
            this.db.exec('ALTER TABLE Transacciones ADD COLUMN pagado_dolares REAL DEFAULT 0;');
            console.log('Columna pagado_dolares agregada');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar pagado_dolares:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al migrar tabla Transacciones:', error);
    }
  }

  migrateReportesDiarios() {
    try {
      // Verificar si la tabla ReportesDiarios existe
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='ReportesDiarios'
      `).get();

      if (!tableExists) {
        console.log('Creando tabla ReportesDiarios...');
        this.db.exec(`
          CREATE TABLE ReportesDiarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_reporte TEXT NOT NULL UNIQUE,
            fecha_creacion TEXT NOT NULL,
            tasa_cambio REAL,
            total_nominas_pagadas REAL DEFAULT 0,
            total_servicios REAL DEFAULT 0,
            total_productos_vendidos REAL DEFAULT 0,
            total_transacciones REAL DEFAULT 0,
            total_ingresos_bs REAL DEFAULT 0,
            total_ingresos_dolares REAL DEFAULT 0,
            resumen TEXT
          );
        `);
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_reportes_diarios_fecha ON ReportesDiarios(fecha_reporte);');
        console.log('Tabla ReportesDiarios creada exitosamente.');
      }
    } catch (error) {
      console.error('Error al migrar tabla ReportesDiarios:', error);
    }
  }

  migrateCitas() {
    try {
      // Verificar si la tabla Citas tiene el campo id_cliente
      const tableInfo = this.db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='Citas'
      `).get();

      if (tableInfo && tableInfo.sql) {
        const sql = tableInfo.sql;
        
        // Verificar si falta el campo id_cliente
        if (!sql.includes('id_cliente')) {
          console.log('Actualizando tabla Citas para incluir id_cliente...');
          
          try {
            this.db.exec('ALTER TABLE Citas ADD COLUMN id_cliente INTEGER;');
            this.db.exec('CREATE INDEX IF NOT EXISTS idx_citas_cliente ON Citas(id_cliente);');
            console.log('Columna id_cliente agregada a Citas');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar id_cliente a Citas:', e);
            }
          }
          
          // Agregar foreign key si no existe
          try {
            // SQLite no permite agregar foreign keys directamente con ALTER TABLE
            // Pero podemos verificar si existe el índice
            const indexExists = this.db.prepare(`
              SELECT name FROM sqlite_master 
              WHERE type='index' AND name='idx_citas_cliente'
            `).get();
            
            if (!indexExists) {
              this.db.exec('CREATE INDEX IF NOT EXISTS idx_citas_cliente ON Citas(id_cliente);');
            }
          } catch (e) {
            console.error('Error al crear índice en Citas:', e);
          }
          
          console.log('Tabla Citas actualizada exitosamente');
        }
      }
    } catch (error) {
      console.error('Error al migrar tabla Citas:', error);
    }
  }

  migrateServiciosRealizados() {
    try {
      // Verificar si la tabla ServiciosRealizados tiene el campo propina_en_dolares
      const tableInfo = this.db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='ServiciosRealizados'
      `).get();

      if (tableInfo && tableInfo.sql) {
        const sql = tableInfo.sql;
        
        // Verificar si falta el campo propina_en_dolares
        if (!sql.includes('propina_en_dolares')) {
          console.log('Agregando campo propina_en_dolares a ServiciosRealizados...');
          
          try {
            this.db.exec('ALTER TABLE ServiciosRealizados ADD COLUMN propina_en_dolares REAL DEFAULT 0;');
            console.log('Columna propina_en_dolares agregada a ServiciosRealizados');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar propina_en_dolares:', e);
            }
          }
        }
        
        // Verificar si faltan los campos pagado_bs y pagado_dolares (para saber cómo se pagó cada servicio)
        if (!sql.includes('pagado_bs')) {
          console.log('Agregando campos pagado_bs y pagado_dolares a ServiciosRealizados...');
          
          try {
            this.db.exec('ALTER TABLE ServiciosRealizados ADD COLUMN pagado_bs REAL DEFAULT 0;');
            console.log('Columna pagado_bs agregada a ServiciosRealizados');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar pagado_bs:', e);
            }
          }
        }
        
        if (!sql.includes('pagado_dolares')) {
          try {
            this.db.exec('ALTER TABLE ServiciosRealizados ADD COLUMN pagado_dolares REAL DEFAULT 0;');
            console.log('Columna pagado_dolares agregada a ServiciosRealizados');
          } catch (e) {
            if (!e.message.includes('duplicate column')) {
              console.error('Error al agregar pagado_dolares:', e);
            }
          }
        }
        
        // Verificar si id_servicio permite NULL (necesario para propinas independientes)
        // Si tiene NOT NULL, necesitamos recrear la tabla sin esa restricción
        if (sql.includes('id_servicio INTEGER NOT NULL')) {
          console.log('Migrando tabla ServiciosRealizados para permitir NULL en id_servicio (propinas independientes)...');
          
          try {
            // Crear tabla temporal sin NOT NULL en id_servicio
            this.db.exec(`
              CREATE TABLE ServiciosRealizados_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_transaccion INTEGER NOT NULL,
                id_empleado INTEGER NOT NULL,
                id_servicio INTEGER,
                fecha TEXT NOT NULL,
                precio_cobrado REAL NOT NULL,
                propina REAL NOT NULL DEFAULT 0,
                propina_en_dolares REAL DEFAULT 0,
                estado TEXT NOT NULL CHECK(estado IN ('completado', 'cancelado', 'pendiente')) DEFAULT 'completado',
                FOREIGN KEY (id_transaccion) REFERENCES Transacciones(id) ON DELETE CASCADE,
                FOREIGN KEY (id_empleado) REFERENCES Empleados(id) ON DELETE CASCADE,
                FOREIGN KEY (id_servicio) REFERENCES Servicios(id) ON DELETE CASCADE
              );
            `);
            
            // Copiar datos existentes
            this.db.exec(`
              INSERT INTO ServiciosRealizados_new 
              (id, id_transaccion, id_empleado, id_servicio, fecha, precio_cobrado, propina, propina_en_dolares, estado)
              SELECT id, id_transaccion, id_empleado, id_servicio, fecha, precio_cobrado, propina, COALESCE(propina_en_dolares, 0), estado
              FROM ServiciosRealizados;
            `);
            
            // Eliminar tabla antigua
            this.db.exec('DROP TABLE ServiciosRealizados;');
            
            // Renombrar tabla nueva
            this.db.exec('ALTER TABLE ServiciosRealizados_new RENAME TO ServiciosRealizados;');
            
            // Recrear índices
            this.db.exec('CREATE INDEX IF NOT EXISTS idx_servicios_realizados_transaccion ON ServiciosRealizados(id_transaccion);');
            this.db.exec('CREATE INDEX IF NOT EXISTS idx_servicios_realizados_empleado ON ServiciosRealizados(id_empleado);');
            
            console.log('Tabla ServiciosRealizados migrada exitosamente para permitir propinas independientes');
          } catch (e) {
            console.error('Error al migrar ServiciosRealizados:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error al migrar tabla ServiciosRealizados:', error);
    }
  }

  migrateTasasCambio() {
    try {
      // Verificar si la tabla TasasCambio tiene la restricción UNIQUE en fecha
      const tableInfo = this.db.prepare(`
        SELECT sql FROM sqlite_master
        WHERE type='table' AND name='TasasCambio'
      `).get();

      if (tableInfo && tableInfo.sql) {
        const sql = tableInfo.sql;
        
        // Verificar si tiene la restricción UNIQUE(fecha)
        if (sql.includes('UNIQUE(fecha)') || sql.includes('UNIQUE (fecha)')) {
          console.log('Migrando tabla TasasCambio para permitir múltiples tasas por día...');
          
          // Crear tabla temporal sin la restricción UNIQUE
          this.db.exec(`
            CREATE TABLE TasasCambio_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              fecha TEXT NOT NULL,
              tasa_bs_por_dolar REAL NOT NULL
            );
          `);
          
          // Copiar datos existentes
          this.db.exec(`
            INSERT INTO TasasCambio_new (id, fecha, tasa_bs_por_dolar)
            SELECT id, fecha, tasa_bs_por_dolar FROM TasasCambio;
          `);
          
          // Eliminar tabla antigua
          this.db.exec('DROP TABLE TasasCambio;');
          
          // Renombrar tabla nueva
          this.db.exec('ALTER TABLE TasasCambio_new RENAME TO TasasCambio;');
          
          // Recrear índice (sin UNIQUE)
          this.db.exec('CREATE INDEX IF NOT EXISTS idx_tasas_cambio_fecha ON TasasCambio(fecha);');
          
          console.log('✅ Tabla TasasCambio migrada exitosamente - ahora permite múltiples tasas por día');
        } else {
          console.log('Tabla TasasCambio ya permite múltiples tasas por día');
        }
      }
    } catch (error) {
      console.error('Error al migrar tabla TasasCambio:', error);
      // No lanzar el error para que la aplicación pueda continuar
    }
  }

  updateProductosServiciosPrecioBs() {
    try {
      // Actualizar tablas Productos y Servicios para permitir NULL en precio_bs
      const productosResult = this.db.prepare(`
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name='Productos'
      `).get();
      
      if (productosResult && productosResult.sql) {
        const sql = productosResult.sql;
        // Si precio_bs tiene NOT NULL, necesitamos actualizar
        if (sql.includes('precio_bs REAL NOT NULL')) {
          console.log('Actualizando tabla Productos para permitir NULL en precio_bs...');
          
          // Crear tabla temporal
          this.db.exec(`
            CREATE TABLE Productos_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nombre TEXT NOT NULL,
              cantidad INTEGER NOT NULL CHECK(cantidad >= 0),
              referencia_en_dolares REAL NOT NULL,
              precio_bs REAL
            );
          `);
          
          // Copiar datos existentes
          this.db.exec(`
            INSERT INTO Productos_new (id, nombre, cantidad, referencia_en_dolares, precio_bs)
            SELECT id, nombre, cantidad, referencia_en_dolares, precio_bs FROM Productos;
          `);
          
          // Eliminar tabla antigua
          this.db.exec('DROP TABLE Productos;');
          
          // Renombrar tabla nueva
          this.db.exec('ALTER TABLE Productos_new RENAME TO Productos;');
          
          console.log('Tabla Productos actualizada exitosamente');
        }
      }
      
      // Hacer lo mismo para Servicios
      const serviciosResult = this.db.prepare(`
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name='Servicios'
      `).get();
      
      if (serviciosResult && serviciosResult.sql) {
        const sql = serviciosResult.sql;
        if (sql.includes('precio_bs REAL NOT NULL')) {
          console.log('Actualizando tabla Servicios para permitir NULL en precio_bs...');
          
          // Crear tabla temporal
          this.db.exec(`
            CREATE TABLE Servicios_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nombre TEXT NOT NULL,
              descripcion TEXT,
              referencia_en_dolares REAL NOT NULL,
              precio_bs REAL
            );
          `);
          
          // Copiar datos existentes
          this.db.exec(`
            INSERT INTO Servicios_new (id, nombre, descripcion, referencia_en_dolares, precio_bs)
            SELECT id, nombre, descripcion, referencia_en_dolares, precio_bs FROM Servicios;
          `);
          
          // Eliminar tabla antigua
          this.db.exec('DROP TABLE Servicios;');
          
          // Renombrar tabla nueva
          this.db.exec('ALTER TABLE Servicios_new RENAME TO Servicios;');
          
          console.log('Tabla Servicios actualizada exitosamente');
        }
      }
    } catch (error) {
      console.error('Error al actualizar tablas Productos/Servicios:', error);
    }
  }

  query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(params);
    } catch (error) {
      console.error('Error en query:', error);
      throw error;
    }
  }

  run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);
      return {
        lastInsertRowid: result.lastInsertRowid,
        changes: result.changes
      };
    } catch (error) {
      console.error('Error en run:', error);
      throw error;
    }
  }

  get(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(params);
    } catch (error) {
      console.error('Error en get:', error);
      throw error;
    }
  }

  migrateTutoriales() {
    try {
      // Verificar si la tabla TutorialesProgreso existe
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='TutorialesProgreso'
      `).get();

      if (!tableExists) {
        console.log('Creando tabla TutorialesProgreso...');
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS TutorialesProgreso (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tutorial_id TEXT NOT NULL UNIQUE,
            etapa_actual INTEGER NOT NULL DEFAULT 0,
            completado INTEGER NOT NULL DEFAULT 0,
            fecha_completado TEXT,
            datos_adicionales TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('Tabla TutorialesProgreso creada exitosamente');
      }
    } catch (error) {
      console.error('Error al migrar tabla TutorialesProgreso:', error);
    }
  }

  migrateBackups() {
    try {
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='Backups'
      `).get();

      if (!tableExists) {
        console.log('Creando tabla Backups...');
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS Backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_archivo TEXT NOT NULL,
            ruta_completa TEXT NOT NULL,
            fecha_creacion TEXT NOT NULL,
            tamano_bytes INTEGER NOT NULL,
            descripcion TEXT
          )
        `);
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_backups_fecha ON Backups(fecha_creacion DESC);');
        console.log('Tabla Backups creada exitosamente');
      }
    } catch (error) {
      console.error('Error al migrar tabla Backups:', error);
    }
  }

  migrateConfiguracion() {
    try {
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='Configuracion'
      `).get();

      if (!tableExists) {
        console.log('Creando tabla Configuracion...');
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS Configuracion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clave TEXT NOT NULL UNIQUE,
            valor TEXT,
            fecha_actualizacion TEXT DEFAULT (datetime('now', 'localtime'))
          )
        `);
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON Configuracion(clave);');
        console.log('Tabla Configuracion creada exitosamente');
      }
    } catch (error) {
      console.error('Error al migrar tabla Configuracion:', error);
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DB;

