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
    db = new Database(userDataPath);
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
}

// IPC Handlers para comunicación con el renderer
ipcMain.handle('db-query', async (event, query, params = []) => {
  try {
    return db.query(query, params);
  } catch (error) {
    console.error('Error en query:', error);
    throw error;
  }
});

ipcMain.handle('db-run', async (event, query, params = []) => {
  try {
    return db.run(query, params);
  } catch (error) {
    console.error('Error en run:', error);
    throw error;
  }
});

ipcMain.handle('db-get', async (event, query, params = []) => {
  try {
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
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'GodGaijin',
    repo: 'Barberos-management'
  });
  console.log('✅ Auto-updater configurado para: GodGaijin/Barberos-management');
} catch (error) {
  console.error('❌ Error al configurar auto-updater:', error);
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
  console.log('📋 Versión actual instalada:', info.version || app.getVersion());
  console.log('📋 Versión más reciente en GitHub:', info.version || 'N/A');
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
    const result = await autoUpdater.checkForUpdates();
    return { success: true, result };
  } catch (error) {
    console.error('Error al verificar actualizaciones:', error);
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

// Cuando Electron esté listo, crear la ventana
app.whenReady().then(() => {
  initializeDatabase();
  createWindow();
  
  // Verificar actualizaciones después de que la ventana esté lista (solo en producción)
  if (mainWindow && !process.argv.includes('--dev')) {
    mainWindow.webContents.once('did-finish-load', () => {
      // Verificar actualizaciones al iniciar con un pequeño delay
      setTimeout(() => {
        console.log('🚀 Iniciando verificación de actualizaciones...');
        console.log('📦 Versión actual de la app:', app.getVersion());
        console.log('🔗 Repositorio configurado: GodGaijin/Barberos-management');
        autoUpdater.checkForUpdates().catch(err => {
          console.error('❌ Error al verificar actualizaciones:', err);
          console.error('📋 Mensaje:', err.message);
        });
      }, 3000);
    });
  } else {
    console.log('⚠️ Modo desarrollo detectado (--dev), no se verificarán actualizaciones');
    console.log('💡 Para probar actualizaciones, ejecuta la versión compilada sin --dev');
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

