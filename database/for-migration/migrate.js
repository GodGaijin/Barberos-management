const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Rutas de las bases de datos
const oldDbPath = path.join(__dirname, 'barberia.db');
const newDbPath = path.join(__dirname, 'barberia-nuevo.db');
const schemaPath = path.join(__dirname, '../barberos_bdd.sql');

console.log('🔄 Iniciando migración de base de datos...\n');

// Verificar que existe la base de datos antigua
if (!fs.existsSync(oldDbPath)) {
  console.error('❌ Error: No se encontró la base de datos antigua en:', oldDbPath);
  process.exit(1);
}

// Conectar a la base de datos antigua
console.log('📂 Conectando a la base de datos antigua...');
const oldDb = new Database(oldDbPath);

// Crear la nueva base de datos
console.log('🆕 Creando nueva base de datos...');
if (fs.existsSync(newDbPath)) {
  console.log('⚠️  La base de datos nueva ya existe. Eliminándola...');
  fs.unlinkSync(newDbPath);
}

const newDb = new Database(newDbPath);

// Ejecutar el esquema nuevo
console.log('📝 Aplicando esquema nuevo...');
const schema = fs.readFileSync(schemaPath, 'utf8');
newDb.exec(schema);
console.log('✅ Esquema aplicado correctamente\n');

// Habilitar foreign keys
newDb.pragma('foreign_keys = ON');

// Función auxiliar para parsear cédula
function parseCedula(cedulaText) {
  if (!cedulaText || cedulaText === '') {
    return { tipo: 'V', numero: 0 };
  }
  
  // Intentar extraer tipo y número
  const match = cedulaText.match(/^([VEGJ])(\d+)$/i);
  if (match) {
    return { tipo: match[1].toUpperCase(), numero: parseInt(match[2]) || 0 };
  }
  
  // Si solo hay números, asumir tipo V
  const num = parseInt(cedulaText.replace(/\D/g, ''));
  return { tipo: 'V', numero: num || 0 };
}

// Función auxiliar para convertir fecha
function convertFecha(fechaText) {
  if (!fechaText) return new Date().toISOString();
  
  // Si ya está en formato ISO, retornarlo
  if (fechaText.includes('T') || fechaText.match(/^\d{4}-\d{2}-\d{2}/)) {
    return fechaText;
  }
  
  // Intentar parsear formato DD/MM/YYYY o YYYY-MM-DD HH:MM:SS
  try {
    const date = new Date(fechaText);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (e) {
    // Si falla, retornar la fecha actual
  }
  
  return new Date().toISOString();
}

// Función auxiliar para convertir fecha a formato DD/MM/YYYY
function convertFechaDDMMYYYY(fechaText) {
  if (!fechaText) return '';
  
  try {
    const date = new Date(fechaText);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // Si falla, intentar parsear directamente
    if (fechaText.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [year, month, day] = fechaText.split(' ')[0].split('-');
      return `${day}/${month}/${year}`;
    }
  }
  
  return fechaText;
}

console.log('🚀 Iniciando migración de datos...\n');

// 1. Migrar Clientes
console.log('🔄 Migrando Clientes...');
try {
  const oldClientes = oldDb.prepare('SELECT * FROM clientes').all();
  console.log(`   📊 Registros encontrados: ${oldClientes.length}`);
  
  let migrated = 0;
  let skipped = 0;
  let skippedNoCedula = 0;
  for (const old of oldClientes) {
    try {
      // Obtener nombre completo para verificar si es "CLIENTE CONTADO"
      const nombreCompleto = `${old.nombres || ''} ${old.apellidos || ''}`.trim().toUpperCase();
      const esClienteContado = nombreCompleto === 'CLIENTE CONTADO';
      
      // Verificar si tiene cédula válida
      const tieneCedula = old.cedula && old.cedula.trim() !== '' && old.cedula.trim().toUpperCase() !== 'NA';
      
      // Solo migrar si tiene cédula O es "CLIENTE CONTADO"
      if (!tieneCedula && !esClienteContado) {
        skippedNoCedula++;
        console.log(`   ⚠️  Cliente sin cédula omitido: ${nombreCompleto || 'Sin nombre'} (ID: ${old.id})`);
        continue;
      }
      
      const cedula = parseCedula(old.cedula);
      // Verificar si ya existe un cliente con esa cédula
      const exists = newDb.prepare('SELECT id FROM Clientes WHERE tipo_cedula = ? AND cedula = ?').get(cedula.tipo, cedula.numero);
      if (exists) {
        skipped++;
        continue;
      }
      newDb.prepare(`
        INSERT INTO Clientes (id, nombre, apellido, tipo_cedula, cedula, telefono)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        old.id,
        old.nombres || '',
        old.apellidos || '',
        cedula.tipo,
        cedula.numero,
        old.correo || null
      );
      migrated++;
    } catch (e) {
      console.error(`   ❌ Error migrando cliente ID ${old.id}: ${e.message}`);
    }
  }
  if (skipped > 0) {
    console.log(`   ⚠️  Clientes duplicados omitidos: ${skipped}`);
  }
  if (skippedNoCedula > 0) {
    console.log(`   ⚠️  Clientes sin cédula omitidos: ${skippedNoCedula}`);
  }
  console.log(`   ✅ Migrados: ${migrated}/${oldClientes.length}\n`);
} catch (e) {
  console.error(`   ❌ Error: ${e.message}\n`);
}

// 2. Migrar Empleados
console.log('🔄 Migrando Empleados...');
try {
  const oldEmpleados = oldDb.prepare('SELECT * FROM empleados').all();
  console.log(`   📊 Registros encontrados: ${oldEmpleados.length}`);
  
  let migrated = 0;
  for (const old of oldEmpleados) {
    try {
      const cedula = parseCedula(old.cedula);
      newDb.prepare(`
        INSERT INTO Empleados (id, nombre, apellido, tipo_cedula, cedula, telefono, fecha_de_nacimiento)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        old.id,
        old.nombres || '',
        old.apellidos || '',
        cedula.tipo,
        cedula.numero,
        old.telefono || null,
        old.fecha_nacimiento || '01/01'
      );
      migrated++;
    } catch (e) {
      console.error(`   ❌ Error migrando empleado ID ${old.id}: ${e.message}`);
    }
  }
  console.log(`   ✅ Migrados: ${migrated}/${oldEmpleados.length}\n`);
} catch (e) {
  console.error(`   ❌ Error: ${e.message}\n`);
}

// 3. Migrar Productos
console.log('🔄 Migrando Productos...');
try {
  const oldProductos = oldDb.prepare('SELECT * FROM productos').all();
  console.log(`   📊 Registros encontrados: ${oldProductos.length}`);
  
  let migrated = 0;
  for (const old of oldProductos) {
    try {
      newDb.prepare(`
        INSERT INTO Productos (id, nombre, cantidad, referencia_en_dolares, precio_bs)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        old.id,
        old.nombre || '',
        old.cantidad_disponible || 0,
        old.precio_usd || 0,
        old.precio_ves || null
      );
      migrated++;
    } catch (e) {
      console.error(`   ❌ Error migrando producto ID ${old.id}: ${e.message}`);
    }
  }
  console.log(`   ✅ Migrados: ${migrated}/${oldProductos.length}\n`);
} catch (e) {
  console.error(`   ❌ Error: ${e.message}\n`);
}

// 4. Migrar Servicios
console.log('🔄 Migrando Servicios...');
try {
  const oldServicios = oldDb.prepare('SELECT * FROM servicios').all();
  console.log(`   📊 Registros encontrados: ${oldServicios.length}`);
  
  let migrated = 0;
  for (const old of oldServicios) {
    try {
      newDb.prepare(`
        INSERT INTO Servicios (id, nombre, descripcion, referencia_en_dolares, precio_bs)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        old.id,
        old.nombre || '',
        old.descripcion || null,
        old.precio_usd || 0,
        null // precio_bs se calcula automáticamente
      );
      migrated++;
    } catch (e) {
      console.error(`   ❌ Error migrando servicio ID ${old.id}: ${e.message}`);
    }
  }
  console.log(`   ✅ Migrados: ${migrated}/${oldServicios.length}\n`);
} catch (e) {
  console.error(`   ❌ Error: ${e.message}\n`);
}

// 5. Migrar TasasCambio
console.log('🔄 Migrando TasasCambio...');
try {
  const oldTasas = oldDb.prepare('SELECT * FROM tasas_dia').all();
  console.log(`   📊 Registros encontrados: ${oldTasas.length}`);
  
  let migrated = 0;
  for (const old of oldTasas) {
    try {
      const fecha = convertFechaDDMMYYYY(old.fecha_creacion);
      // Verificar si ya existe una tasa para esa fecha
      const exists = newDb.prepare('SELECT id FROM TasasCambio WHERE fecha = ?').get(fecha);
      if (!exists) {
        newDb.prepare(`
          INSERT INTO TasasCambio (fecha, tasa_bs_por_dolar)
          VALUES (?, ?)
        `).run(fecha, old.tasa || 0);
        migrated++;
      }
    } catch (e) {
      console.error(`   ❌ Error migrando tasa ID ${old.id}: ${e.message}`);
    }
  }
  console.log(`   ✅ Migrados: ${migrated}/${oldTasas.length}\n`);
} catch (e) {
  console.error(`   ❌ Error: ${e.message}\n`);
}

// 6. Migrar Ventas a Transacciones, ServiciosRealizados y ProductosVendidos
// OMITIDO: Los datos de transacciones no concuerdan con la nueva base de datos
console.log('⏭️  Omitiendo migración de Ventas (Transacciones)...');
try {
  const oldVentas = oldDb.prepare('SELECT * FROM ventas').all();
  console.log(`   📊 Registros encontrados: ${oldVentas.length}`);
  console.log(`   ⚠️  Transacciones no migradas: Los datos no concuerdan con la nueva estructura\n`);
} catch (e) {
  console.error(`   ❌ Error: ${e.message}\n`);
}

// 7. Migrar PagosEmpleados a Nominas
// OMITIDO: Los datos de nóminas no concuerdan con la nueva base de datos
console.log('⏭️  Omitiendo migración de PagosEmpleados (Nominas)...');
try {
  const oldPagos = oldDb.prepare('SELECT * FROM pagos_empleados').all();
  console.log(`   📊 Registros encontrados: ${oldPagos.length}`);
  console.log(`   ⚠️  Nóminas no migradas: Los datos no concuerdan con la nueva estructura\n`);
} catch (e) {
  console.error(`   ❌ Error: ${e.message}\n`);
}

// Cerrar conexiones
oldDb.close();
newDb.close();

console.log('✅ Migración completada!');
console.log(`📁 Nueva base de datos guardada en: ${newDbPath}`);
console.log('\n📊 Resumen:');
console.log('   - Base de datos antigua analizada');
console.log('   - Nueva base de datos creada con esquema actualizado');
console.log('   - Datos migrados según correspondencia de campos');
console.log('\n⚠️  IMPORTANTE: Revisa la nueva base de datos antes de usarla en producción.');
