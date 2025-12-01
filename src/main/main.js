const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const Database = require('./database/db');

// Mantener una referencia global de la ventana
let mainWindow;
let db;

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
    console.log('Inicializando base de datos en:', userDataPath);
    db = new Database(userDataPath);
    console.log('✅ Base de datos inicializada correctamente');
    console.log('📊 Base de datos lista para consultas');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    console.error('📋 Detalles:', error.message);
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
      console.error('Base de datos no inicializada en db-query');
      throw new Error('Base de datos no inicializada');
    }
    return db.query(query, params);
  } catch (error) {
    console.error('Error en query:', error);
    throw error;
  }
});

ipcMain.handle('db-run', async (event, query, params = []) => {
  try {
    if (!db) {
      console.error('Base de datos no inicializada en db-run');
      throw new Error('Base de datos no inicializada');
    }
    return db.run(query, params);
  } catch (error) {
    console.error('Error en run:', error);
    throw error;
  }
});

ipcMain.handle('db-get', async (event, query, params = []) => {
  try {
    if (!db) {
      console.error('Base de datos no inicializada en db-get');
      throw new Error('Base de datos no inicializada');
    }
    return db.get(query, params);
  } catch (error) {
    console.error('Error en get:', error);
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
    
    console.log('Intento de login para usuario:', username);
    console.log('Usuario encontrado:', user ? 'Sí' : 'No');
    
    if (!user) {
      console.log('Usuario no encontrado en la base de datos');
      return { success: false, message: 'Usuario o contraseña incorrectos' };
    }
    
    console.log('Hash almacenado:', user.password_hash);
    console.log('Comparando contraseña...');
    
    const isValid = bcrypt.compareSync(password, user.password_hash);
    
    console.log('Resultado de comparación:', isValid);
    
    if (!isValid) {
      // Intentar verificar si el hash es correcto generando uno nuevo para comparar
      const testHash = bcrypt.hashSync(password, 10);
      console.log('Hash de prueba generado:', testHash);
      console.log('¿Los hashes coinciden?', user.password_hash === testHash);
      
      return { success: false, message: 'Usuario o contraseña incorrectos' };
    }
    
    console.log('Login exitoso');
    return { success: true, user: { id: user.id, username: user.username } };
  } catch (error) {
    console.error('Error en autenticación:', error);
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
  console.log('✅ Auto-updater configurado para:', { ...feedURL, token: githubToken ? '***' : 'no configurado' });
  console.log('🔗 URL esperada: https://github.com/GodGaijin/Barberos-management/releases/latest/download/latest.yml');
  
  // Verificar que la configuración se aplicó correctamente
  const currentFeedURL = autoUpdater.getFeedURL();
  console.log('📋 Feed URL configurado:', currentFeedURL ? 'OK' : 'ERROR');
  
} catch (error) {
  console.error('❌ Error al configurar auto-updater:', error);
  console.error('📋 Detalles:', error.message);
}

// Eventos del auto-updater
autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Buscando actualizaciones...');
});

autoUpdater.on('update-available', (info) => {
  console.log('✅ Actualización disponible:', info.version);
  console.log('📦 Información completa:', JSON.stringify(info, null, 2));
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('ℹ️ No hay actualizaciones disponibles');
  console.log('📋 Versión actual instalada:', app.getVersion());
  console.log('📋 Información recibida:', JSON.stringify(info, null, 2));
  console.log('💡 Esto significa que la versión instalada es igual o mayor que la del release');
  console.log('💡 Para probar, instala una versión anterior (ej: 1.0.5) y luego verifica');
});

autoUpdater.on('error', (err) => {
  console.error('❌ Error en auto-updater:', err);
  console.error('📋 Detalles del error:', err.message);
  console.error('📋 Stack:', err.stack);
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
    console.log('📡 IPC: check-for-updates llamado');
    console.log('🔍 Verificando configuración del autoUpdater...');
    
    const feedURL = autoUpdater.getFeedURL();
    console.log('  - Feed URL:', feedURL);
    console.log('  - Provider:', feedURL?.provider || 'github');
    console.log('  - Owner:', feedURL?.owner || 'GodGaijin');
    console.log('  - Repo:', feedURL?.repo || 'Barberos-management');
    
    // Verificar que el repositorio sea accesible
    const testURL = `https://github.com/${feedURL?.owner || 'GodGaijin'}/${feedURL?.repo || 'Barberos-management'}/releases/latest/download/latest.yml`;
    console.log('🔗 URL de prueba:', testURL);
    
    const result = await autoUpdater.checkForUpdates();
    console.log('✅ Resultado de checkForUpdates:', JSON.stringify(result, null, 2));
    return { success: true, result };
  } catch (error) {
    console.error('❌ Error al verificar actualizaciones:', error);
    console.error('📋 Tipo de error:', error.constructor.name);
    console.error('📋 Mensaje:', error.message);
    
    // Si es un error 404, dar sugerencias específicas
    if (error.message && error.message.includes('404')) {
      console.error('💡 Error 404 detectado. Posibles causas:');
      console.error('   1. El repositorio es privado (necesita token GITHUB_TOKEN)');
      console.error('   2. El nombre del repositorio está incorrecto');
      console.error('   3. El repositorio no tiene releases publicados');
      console.error('   4. El repositorio no existe o no es accesible');
      console.error('💡 Verifica que el repositorio sea público y tenga al menos un release publicado');
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

