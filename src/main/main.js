const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const Database = require('./database/db');

// Mantener una referencia global de la ventana
let mainWindow;
let db;
let backupInterval = null;
let reportInterval = null;

function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#1a1a1a', // Fondo oscuro
    titleBarStyle: 'default',
    show: false // No mostrar hasta que esté listo
  });

  // Cargar el archivo HTML
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Mostrar la ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Abrir DevTools en modo desarrollo
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Detectar cuando la ventana recupera el foco y forzar campos editables
  mainWindow.on('focus', () => {
    if (mainWindow && mainWindow.webContents) {
      // Enviar mensaje al renderer para forzar campos editables
      mainWindow.webContents.send('window-focused');
    }
  });

  // También detectar cuando la ventana se muestra
  mainWindow.on('show', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('window-focused');
    }
  });
}

// Inicializar la base de datos
function initializeDatabase() {
  try {
    const userDataPath = app.getPath('userData');
    db = new Database(userDataPath);
    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error crítico al inicializar la base de datos:', error);
    if (error.stack) {
      console.error('📋 Stack:', error.stack);
    }
    db = null;
  }
}

// IPC Handlers para comunicación con el renderer
ipcMain.handle('db-query', async (event, query, params = []) => {
  try {
    if (!db) {
      console.error('❌ Base de datos no inicializada en db-query');
      throw new Error('Base de datos no inicializada');
    }
    return db.query(query, params);
  } catch (error) {
    console.error('❌ Error en consulta a base de datos:', error.message);
    throw error;
  }
});

ipcMain.handle('db-run', async (event, query, params = []) => {
  try {
    if (!db) {
      console.error('❌ Base de datos no inicializada en db-run');
      throw new Error('Base de datos no inicializada');
    }
    return db.run(query, params);
  } catch (error) {
    console.error('❌ Error al ejecutar comando en base de datos:', error.message);
    throw error;
  }
});

ipcMain.handle('db-get', async (event, query, params = []) => {
  try {
    if (!db) {
      console.error('❌ Base de datos no inicializada en db-get');
      throw new Error('Base de datos no inicializada');
    }
    return db.get(query, params);
  } catch (error) {
    console.error('❌ Error al obtener registro de base de datos:', error.message);
    throw error;
  }
});

// Handler para autenticación
ipcMain.handle('auth-login', async (event, username, password) => {
  try {
    if (!db) {
      console.error('Base de datos no inicializada');
      return { success: false, message: 'Error: Base de datos no disponible' };
    }
    
    const bcrypt = require('bcryptjs');
    const user = db.get('SELECT * FROM Usuarios WHERE username = ?', [username]);
    
    if (!user) {
      console.warn('⚠️ Intento de login fallido: usuario no encontrado');
      return { success: false, message: 'Usuario o contraseña incorrectos' };
    }
    
    const isValid = bcrypt.compareSync(password, user.password_hash);
    
    if (!isValid) {
      console.warn('⚠️ Intento de login fallido: contraseña incorrecta');
      return { success: false, message: 'Usuario o contraseña incorrectos' };
    }
    
    console.log('✅ Login exitoso para usuario:', username);
    return { success: true, user: { id: user.id, username: user.username } };
  } catch (error) {
    console.error('❌ Error crítico en autenticación:', error);
    return { success: false, message: 'Error al iniciar sesión' };
  }
});

// Configurar auto-updater
autoUpdater.autoDownload = false; // No descargar automáticamente, pedir confirmación
autoUpdater.autoInstallOnAppQuit = false; // No instalar automáticamente al cerrar

// Configurar provider y repositorio explícitamente
// Esto es necesario para que electron-updater sepa dónde buscar las actualizaciones
try {
  const feedURL = {
    provider: 'github',
    owner: 'GodGaijin',
    repo: 'Barberos-management'
  };
  
  // Para repositorios privados, necesitamos un token de GitHub
  // El token se puede obtener de: https://github.com/settings/tokens
  // Necesita permisos: repo (para acceder a repositorios privados)
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (githubToken) {
    feedURL.token = githubToken;
    console.log('✅ Token de GitHub configurado (repositorio privado)');
  } else {
    console.log('⚠️ No se encontró GITHUB_TOKEN en variables de entorno');
    console.log('💡 Para repositorios privados, necesitas configurar un token:');
    console.log('   1. Ve a https://github.com/settings/tokens');
    console.log('   2. Genera un token con permisos "repo"');
    console.log('   3. Configura la variable de entorno GITHUB_TOKEN');
    console.log('   O haz el repositorio público (más simple)');
  }
  
  // Configurar el feed URL
  autoUpdater.setFeedURL(feedURL);
  console.log('✅ Auto-updater configurado correctamente');
  
} catch (error) {
  console.error('❌ Error crítico al configurar auto-updater:', error);
}

// Eventos del auto-updater
autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Buscando actualizaciones...');
});

autoUpdater.on('update-available', (info) => {
  console.log('✅ Actualización disponible:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('ℹ️ No hay actualizaciones disponibles (versión actual:', app.getVersion() + ')');
});

autoUpdater.on('error', (err) => {
  console.error('❌ Error en auto-updater:', err.message);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Actualización descargada:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

// IPC handlers para actualizaciones
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, result };
  } catch (error) {
    console.error('❌ Error al verificar actualizaciones:', error.message);
    
    // Si es un error 404, dar sugerencias específicas
    if (error.message && error.message.includes('404')) {
      console.error('💡 Error 404: Verifica que el repositorio sea público y tenga releases publicados');
    }
    
    if (error.stack) {
      console.error('📋 Stack:', error.stack);
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate();
});

// Handler para forzar el foco de la ventana (solución a campos bloqueados)
// Handlers para tutoriales
ipcMain.handle('tutorial-get-progress', async (event, tutorialId) => {
  try {
    if (!db) return { success: false, error: 'Base de datos no disponible' };
    const progress = db.get('SELECT * FROM TutorialesProgreso WHERE tutorial_id = ?', [tutorialId]);
    return { success: true, progress: progress || null };
  } catch (error) {
    console.error('Error al obtener progreso de tutorial:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tutorial-save-progress', async (event, tutorialId, etapa, completado, datosAdicionales = null) => {
  try {
    if (!db) return { success: false, error: 'Base de datos no disponible' };
    
    const fechaCompletado = completado ? new Date().toISOString() : null;
    const datosJson = datosAdicionales ? JSON.stringify(datosAdicionales) : null;
    
    // Verificar si existe
    const existing = db.get('SELECT * FROM TutorialesProgreso WHERE tutorial_id = ?', [tutorialId]);
    
    if (existing) {
      // Actualizar
      db.run(
        'UPDATE TutorialesProgreso SET etapa_actual = ?, completado = ?, fecha_completado = ?, datos_adicionales = ?, updated_at = CURRENT_TIMESTAMP WHERE tutorial_id = ?',
        [etapa, completado ? 1 : 0, fechaCompletado, datosJson, tutorialId]
      );
    } else {
      // Insertar
      db.run(
        'INSERT INTO TutorialesProgreso (tutorial_id, etapa_actual, completado, fecha_completado, datos_adicionales) VALUES (?, ?, ?, ?, ?)',
        [tutorialId, etapa, completado ? 1 : 0, fechaCompletado, datosJson]
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al guardar progreso de tutorial:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('tutorial-get-all-progress', async () => {
  try {
    if (!db) return { success: false, error: 'Base de datos no disponible' };
    const allProgress = db.query('SELECT * FROM TutorialesProgreso');
    return { success: true, progress: allProgress };
  } catch (error) {
    console.error('Error al obtener todos los progresos:', error);
    return { success: false, error: error.message };
  }
});

// ==================== HANDLERS PARA RESPALDO Y CONFIGURACIÓN ====================

// Obtener lista de backups desde archivos físicos
ipcMain.handle('listar-backups-fisicos', async (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const backupsDir = path.join(userDataPath, 'backups');
    
    if (!fs.existsSync(backupsDir)) {
      return { success: true, backups: [] };
    }
    
    const archivos = fs.readdirSync(backupsDir);
    const backups = [];
    
    for (const archivo of archivos) {
      if (archivo.endsWith('.db')) {
        const rutaCompleta = path.join(backupsDir, archivo);
        const stats = fs.statSync(rutaCompleta);
        
        backups.push({
          nombre_archivo: archivo,
          ruta_completa: rutaCompleta,
          fecha_creacion: stats.birthtime.toISOString(),
          tamano_bytes: stats.size,
          descripcion: archivo.includes('pre_formateo') ? 'Backup antes de formatear' : 
                       archivo.includes('automatico') ? 'Backup automático' : 
                       archivo.includes('pre_restauracion') ? 'Backup antes de restaurar' : 
                       'Backup manual'
        });
      }
    }
    
    // Ordenar por fecha (más recientes primero)
    backups.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    
    return { success: true, backups: backups };
  } catch (error) {
    console.error('Error al listar backups físicos:', error);
    return { success: false, error: error.message, backups: [] };
  }
});

// Crear backup de la base de datos
ipcMain.handle('crear-backup', async (event, nombre = null) => {
  try {
    if (!db) {
      return { success: false, mensaje: 'Base de datos no disponible' };
    }

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'barberos.db');
    const backupsDir = path.join(userDataPath, 'backups');

    // Crear directorio de backups si no existe
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Verificar que el archivo de BD existe
    if (!fs.existsSync(dbPath)) {
      return { success: false, mensaje: 'Archivo de base de datos no encontrado' };
    }

    // Generar nombre de archivo
    const fecha = new Date();
    const fechaStr = fecha.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const nombreArchivo = nombre 
      ? `backup_${nombre}_${fechaStr}.db`
      : `backup_${fechaStr}.db`;
    
    const rutaBackup = path.join(backupsDir, nombreArchivo);

    // Copiar archivo
    fs.copyFileSync(dbPath, rutaBackup);

    // Obtener tamaño
    const stats = fs.statSync(rutaBackup);
    const tamano = stats.size;

    // Guardar registro en BD
    const fechaCreacion = fecha.toISOString();
    db.run(
      `INSERT INTO Backups (nombre_archivo, ruta_completa, fecha_creacion, tamano_bytes, descripcion)
       VALUES (?, ?, ?, ?, ?)`,
      [nombreArchivo, rutaBackup, fechaCreacion, tamano, nombre || 'Backup automático']
    );

    // Limpiar backups antiguos (mantener solo 20)
    await limpiarBackupsAntiguos();

    console.log(`✅ Backup creado: ${nombreArchivo} (${(tamano / (1024 * 1024)).toFixed(2)} MB)`);
    return { success: true, ruta: rutaBackup, tamano: tamano };
  } catch (error) {
    console.error('Error al crear backup:', error);
    return { success: false, mensaje: error.message };
  }
});

// Limpiar backups antiguos (mantener solo 20)
async function limpiarBackupsAntiguos() {
  try {
    if (!db) return;

    const maxBackups = 20;
    const backups = db.query(`
      SELECT * FROM Backups 
      ORDER BY fecha_creacion DESC
    `);

    if (backups.length > maxBackups) {
      // Eliminar los más antiguos
      const backupsAEliminar = backups.slice(maxBackups);
      
      for (const backup of backupsAEliminar) {
        // Eliminar archivo físico
        if (fs.existsSync(backup.ruta_completa)) {
          try {
            fs.unlinkSync(backup.ruta_completa);
            console.log(`🗑️ Backup eliminado: ${backup.nombre_archivo}`);
          } catch (error) {
            console.error(`Error al eliminar archivo ${backup.nombre_archivo}:`, error);
          }
        }
        
        // Eliminar registro de BD
        db.run('DELETE FROM Backups WHERE id = ?', [backup.id]);
      }
    }
  } catch (error) {
    console.error('Error al limpiar backups antiguos:', error);
  }
}

// Restaurar backup
ipcMain.handle('restaurar-backup', async (event, ruta) => {
  try {
    if (!db) {
      return { success: false, mensaje: 'Base de datos no disponible' };
    }

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'barberos.db');
    const backupsDir = path.join(userDataPath, 'backups');

    // Verificar que el backup existe
    if (!fs.existsSync(ruta)) {
      return { success: false, mensaje: 'El archivo de backup no existe' };
    }

    // Crear backup de seguridad antes de restaurar
    const fechaSeguridad = new Date();
    const fechaStrSeguridad = fechaSeguridad.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupSeguridad = path.join(backupsDir, `backup_pre_restauracion_${fechaStrSeguridad}.db`);
    
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupSeguridad);
      console.log(`✅ Backup de seguridad creado: ${path.basename(backupSeguridad)}`);
    }

    // Cerrar conexión a BD
    db.close();
    db = null;

    // Copiar backup sobre BD actual
    fs.copyFileSync(ruta, dbPath);

    // Reiniciar conexión a BD
    initializeDatabase();

    console.log('✅ Backup restaurado correctamente');
    return { success: true, mensaje: 'Backup restaurado correctamente' };
  } catch (error) {
    console.error('Error al restaurar backup:', error);
    
    // Intentar reiniciar la conexión si falló
    if (!db) {
      try {
        initializeDatabase();
      } catch (e) {
        console.error('Error al reiniciar conexión a BD:', e);
      }
    }
    
    return { success: false, mensaje: error.message };
  }
});

// Formatear base de datos
ipcMain.handle('formatear-base-datos', async (event) => {
  try {
    if (!db) {
      return { success: false, mensaje: 'Base de datos no disponible' };
    }

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'barberos.db');
    const schemaPath = path.join(__dirname, '../../database/barberos_bdd.sql');

    // Crear backup antes de formatear
    console.log('📦 Creando backup antes de formatear...');
    const backupsDir = path.join(userDataPath, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const fecha = new Date();
    const fechaStr = fecha.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPreFormateo = path.join(backupsDir, `backup_pre_formateo_${fechaStr}.db`);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPreFormateo);
      // Registrar en BD
      const stats = fs.statSync(backupPreFormateo);
      db.run(
        `INSERT INTO Backups (nombre_archivo, ruta_completa, fecha_creacion, tamano_bytes, descripcion)
         VALUES (?, ?, ?, ?, ?)`,
        [path.basename(backupPreFormateo), backupPreFormateo, fecha.toISOString(), stats.size, 'Backup antes de formatear']
      );
    }

    // Cerrar conexión a BD
    db.close();
    db = null;

    // Eliminar archivo de BD
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Ejecutar script SQL inicial
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Archivo de esquema SQL no encontrado');
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Reiniciar conexión a BD (esto ejecutará el esquema automáticamente)
    initializeDatabase();

    // Ejecutar el esquema si la BD está vacía
    if (db) {
      db.db.exec(schema);
    }

    console.log('✅ Base de datos formateada correctamente');
    return { success: true, mensaje: 'Base de datos formateada correctamente' };
  } catch (error) {
    console.error('Error al formatear base de datos:', error);
    
    // Intentar reiniciar la conexión si falló
    if (!db) {
      try {
        initializeDatabase();
      } catch (e) {
        console.error('Error al reiniciar conexión a BD:', e);
      }
    }
    
    return { success: false, mensaje: error.message };
  }
});

ipcMain.on('fix-focus', () => {
  if (mainWindow) {
    // Primero desenfocamos, luego enfocamos para simular el Alt+Tab
    mainWindow.blur();
    setTimeout(() => {
      mainWindow.focus();
      // También forzar el foco del contenido web
      if (mainWindow.webContents) {
        mainWindow.webContents.focus();
      }
    }, 10);
  }
});

// ==================== FUNCIONES DE PROGRAMACIÓN ====================

// Programar respaldo automático
async function programarRespaldoAutomatico() {
  try {
    if (!db) {
      console.log('⚠️ BD no disponible para programar respaldos');
      return;
    }

    // Limpiar intervalo anterior
    if (backupInterval) {
      clearInterval(backupInterval);
      backupInterval = null;
    }

    // Leer configuración
    const configRespaldo = db.get('SELECT valor FROM Configuracion WHERE clave = ?', ['respaldo_automatico']);
    const configFrecuencia = db.get('SELECT valor FROM Configuracion WHERE clave = ?', ['frecuencia_respaldo']);

    const respaldoActivo = configRespaldo ? configRespaldo.valor === 'true' : false;
    const frecuencia = configFrecuencia ? configFrecuencia.valor : 'diario';

    if (!respaldoActivo) {
      console.log('ℹ️ Respaldo automático desactivado');
      return;
    }

    console.log(`📦 Programando respaldos automáticos: ${frecuencia}`);

    // Calcular intervalo en milisegundos
    let intervaloMs = 0;
    switch (frecuencia) {
      case 'cada-hora':
        intervaloMs = 60 * 60 * 1000; // 1 hora
        break;
      case 'cada-6-horas':
        intervaloMs = 6 * 60 * 60 * 1000; // 6 horas
        break;
      case 'diario':
        intervaloMs = 24 * 60 * 60 * 1000; // 24 horas
        break;
      case 'semanal':
        intervaloMs = 7 * 24 * 60 * 60 * 1000; // 7 días
        break;
      default:
        intervaloMs = 24 * 60 * 60 * 1000; // Por defecto diario
    }

    // Crear backup inmediatamente
    crearBackupAutomatico();

    // Programar backups periódicos
    backupInterval = setInterval(() => {
      crearBackupAutomatico();
    }, intervaloMs);

    console.log(`✅ Respaldo automático programado cada ${frecuencia}`);
  } catch (error) {
    console.error('Error al programar respaldo automático:', error);
  }
}

// Crear backup automático (función interna, no handler)
async function crearBackupAutomatico() {
  try {
    if (!db) return;

    console.log('📦 Creando backup automático...');
    
    // Limpiar backups antiguos primero
    await limpiarBackupsAntiguos();

    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'barberos.db');
    const backupsDir = path.join(userDataPath, 'backups');

    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    if (!fs.existsSync(dbPath)) {
      throw new Error('Archivo de base de datos no encontrado');
    }

    // Generar nombre de archivo
    const fecha = new Date();
    const fechaStr = fecha.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const nombreArchivo = `backup_automatico_${fechaStr}.db`;
    const rutaBackup = path.join(backupsDir, nombreArchivo);

    // Copiar archivo
    fs.copyFileSync(dbPath, rutaBackup);

    // Obtener tamaño
    const stats = fs.statSync(rutaBackup);
    const tamano = stats.size;

    // Guardar registro en BD
    const fechaCreacion = fecha.toISOString();
    db.run(
      `INSERT INTO Backups (nombre_archivo, ruta_completa, fecha_creacion, tamano_bytes, descripcion)
       VALUES (?, ?, ?, ?, ?)`,
      [nombreArchivo, rutaBackup, fechaCreacion, tamano, 'Backup automático']
    );

    console.log(`✅ Backup automático creado: ${nombreArchivo} (${(tamano / (1024 * 1024)).toFixed(2)} MB)`);
  } catch (error) {
    console.error('❌ Error al crear backup automático:', error);
    
    // Notificar al frontend
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('backup-error', {
        mensaje: `Error al crear backup automático: ${error.message}`
      });
    }
  }
}

// Programar generación automática de reportes
async function programarReportesAutomaticos() {
  try {
    if (!db) {
      console.log('⚠️ BD no disponible para programar reportes');
      return;
    }

    // Limpiar intervalo anterior
    if (reportInterval) {
      clearInterval(reportInterval);
      reportInterval = null;
    }

    // Leer configuración
    const configReportes = db.get('SELECT valor FROM Configuracion WHERE clave = ?', ['reportes_automaticos']);
    const configHora = db.get('SELECT valor FROM Configuracion WHERE clave = ?', ['hora_reportes']);

    const reportesActivo = configReportes ? configReportes.valor === 'true' : false;
    const horaReportes = configHora ? configHora.valor : '23:00';

    if (!reportesActivo) {
      console.log('ℹ️ Reportes automáticos desactivados');
      return;
    }

    console.log(`📊 Programando reportes automáticos a las ${horaReportes}`);

    // Calcular tiempo hasta la próxima ejecución
    const [hora, minuto] = horaReportes.split(':').map(Number);
    const ahora = new Date();
    const proximaEjecucion = new Date();
    proximaEjecucion.setHours(hora, minuto, 0, 0);

    // Si la hora ya pasó hoy, programar para mañana
    if (proximaEjecucion <= ahora) {
      proximaEjecucion.setDate(proximaEjecucion.getDate() + 1);
    }

    const tiempoHastaEjecucion = proximaEjecucion.getTime() - ahora.getTime();

    console.log(`⏰ Próximo reporte automático: ${proximaEjecucion.toLocaleString()}`);

    // Ejecutar después del tiempo calculado
    setTimeout(() => {
      generarReporteDiario();
      
      // Programar ejecución diaria
      reportInterval = setInterval(() => {
        generarReporteDiario();
      }, 24 * 60 * 60 * 1000); // 24 horas
    }, tiempoHastaEjecucion);
  } catch (error) {
    console.error('Error al programar reportes automáticos:', error);
  }
}

// Generar reporte diario automático
async function generarReporteDiario() {
  try {
    if (!db) return;

    // Obtener fecha de ayer (para generar reporte del día anterior)
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const fechaFormato = ayer.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    console.log(`📊 Generando reporte automático para: ${fechaFormato}`);

    // Verificar si ya existe un reporte para esta fecha
    const reporteExistente = db.get('SELECT * FROM ReportesDiarios WHERE fecha_reporte = ?', [fechaFormato]);
    
    if (reporteExistente) {
      console.log(`ℹ️ Ya existe un reporte para ${fechaFormato}`);
      return;
    }

    // Llamar a función de generación de reportes del frontend
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('generar-reporte-automatico', fechaFormato);
    }
  } catch (error) {
    console.error('Error al generar reporte diario automático:', error);
  }
}

// Handler para re-programar respaldos cuando cambie la configuración
ipcMain.on('reprogramar-respaldos', () => {
  programarRespaldoAutomatico();
});

// Handler para re-programar reportes cuando cambie la configuración
ipcMain.on('reprogramar-reportes', () => {
  programarReportesAutomaticos();
});

// Handler para re-programar actualizaciones cuando cambie la configuración
ipcMain.on('reprogramar-actualizaciones', () => {
  // Enviar mensaje al renderer para reprogramar
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('reprogramar-actualizaciones');
  }
});

// Función para verificar actualizaciones
function verificarActualizaciones() {
  const esModoDesarrollo = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
  
  console.log('🔍 Estado de verificación de actualizaciones:');
  console.log('  - Modo desarrollo:', esModoDesarrollo);
  console.log('  - mainWindow existe:', !!mainWindow);
  console.log('  - Versión actual:', app.getVersion());
  
  if (esModoDesarrollo) {
    console.log('⚠️ Modo desarrollo detectado, no se verificarán actualizaciones');
    console.log('💡 Para probar actualizaciones, ejecuta la versión compilada');
    return;
  }
  
  if (!mainWindow) {
    console.log('⚠️ mainWindow no está disponible aún, reintentando...');
    setTimeout(verificarActualizaciones, 1000);
    return;
  }
  
  console.log('🚀 Iniciando verificación de actualizaciones...');
  console.log('📦 Versión actual de la app:', app.getVersion());
  console.log('🔗 Repositorio configurado: GodGaijin/Barberos-management');
  
  autoUpdater.checkForUpdates().catch(err => {
    console.error('❌ Error al verificar actualizaciones:', err);
    console.error('📋 Mensaje:', err.message);
    if (err.stack) {
      console.error('📋 Stack:', err.stack);
    }
  });
}

// Cuando Electron esté listo, crear la ventana
app.whenReady().then(() => {
  // Inicializar la base de datos primero
  initializeDatabase();
  
  // Verificar que la base de datos se inicializó correctamente
  if (!db) {
    console.error('❌ CRÍTICO: No se pudo inicializar la base de datos');
    dialog.showErrorBox(
      'Error de Base de Datos',
      'No se pudo inicializar la base de datos. La aplicación puede no funcionar correctamente.'
    );
  }
  
  createWindow();
  
  // Inicializar programación de respaldos y reportes automáticos
  setTimeout(() => {
    programarRespaldoAutomatico();
    programarReportesAutomaticos();
  }, 5000); // Esperar 5 segundos para que la BD esté lista
  
  // Verificar actualizaciones después de que la ventana esté lista (solo en producción)
  if (mainWindow) {
    // Usar el evento did-finish-load para asegurar que la ventana esté completamente cargada
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('✅ Ventana cargada completamente, programando verificación de actualizaciones...');
      // Verificar actualizaciones al iniciar con un pequeño delay
      setTimeout(verificarActualizaciones, 3000);
    });
    
    // También intentar si el evento ya se disparó
    if (mainWindow.webContents.isLoading() === false) {
      console.log('✅ Ventana ya está cargada, programando verificación...');
      setTimeout(verificarActualizaciones, 3000);
    }
  } else {
    console.log('⚠️ mainWindow no está disponible, reintentando en 1 segundo...');
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.once('did-finish-load', () => {
          setTimeout(verificarActualizaciones, 3000);
        });
      } else {
        verificarActualizaciones();
      }
    }, 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close();
    }
    app.quit();
  }
});

// Cerrar la base de datos al salir
app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});

