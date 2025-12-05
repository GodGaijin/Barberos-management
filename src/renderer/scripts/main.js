// Estado de la aplicación
let isAuthenticated = false;
let inactivityTimer = null;
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos en milisegundos

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const navLinks = document.querySelectorAll('.nav-menu a');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay sesión activa (se puede mejorar con localStorage)
    checkAuth();
    
    // Event listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Inicializar sistema de detección de inactividad
    initInactivityDetection();
    
    // Navegación
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateToPage(page);
        });
    });
    
    // Inicializar reloj de fecha y hora
    initDateTime();
    
    // Inicializar sistema de actualizaciones (solo si está autenticado)
    if (isAuthenticated || localStorage.getItem('sessionActive') === 'true') {
        initUpdater();
    }
    
    // Inicializar sistema de tutoriales
    if (typeof window.initTutoriales === 'function') {
        window.initTutoriales();
    }
    
    // Listener para cuando la ventana recupera el foco (desde Electron)
    if (window.electronAPI && window.electronAPI.on) {
        window.electronAPI.on('window-focused', () => {
            // Forzar que los campos editables se mantengan editables
            if (typeof window.forzarCamposEditables === 'function') {
                setTimeout(() => {
                    window.forzarCamposEditables();
                }, 50);
            }
        });
    }
    
    // También usar el evento nativo de window focus como respaldo
    window.addEventListener('focus', () => {
        if (typeof window.forzarCamposEditables === 'function') {
            setTimeout(() => {
                window.forzarCamposEditables();
            }, 100);
        }
    });
    
    // Listener para cuando la página se vuelve visible (útil para ALT+TAB)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && typeof window.forzarCamposEditables === 'function') {
            setTimeout(() => {
                window.forzarCamposEditables();
            }, 100);
        }
    });
});

// Inicializar y actualizar fecha/hora
function initDateTime() {
    updateDateTime();
    // Actualizar cada segundo
    setInterval(updateDateTime, 1000);
}

// Actualizar fecha y hora
function updateDateTime() {
    const datetimeElement = document.getElementById('datetime-display');
    if (datetimeElement) {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        const dateStr = now.toLocaleDateString('es-ES', options);
        datetimeElement.textContent = dateStr;
    }
}

// Verificar autenticación
async function checkAuth() {
    // Mantener sesión iniciada siempre (no expira)
    // Solo mostrar login si no hay sesión activa en localStorage
    const sessionActive = localStorage.getItem('sessionActive');
    if (sessionActive === 'true') {
        // Verificar si cambió la fecha
        verificarCambioFecha();
        showMainScreen();
    } else {
        showLoginScreen();
    }
}

// Verificar si cambió la fecha desde la última sesión
function verificarCambioFecha() {
    const hoy = new Date();
    const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
    
    const ultimaFecha = localStorage.getItem('ultimaFechaSesion');
    
    // Verificar si es un nuevo día (para lógica adicional si es necesario)
    if (ultimaFecha && ultimaFecha !== fechaHoy) {
        // La fecha cambió, es un nuevo día
    } else if (!ultimaFecha) {
        // Primera vez que se inicia, guardar la fecha
    }
    
    // Actualizar la fecha de sesión
    localStorage.setItem('ultimaFechaSesion', fechaHoy);
}

// Mostrar pantalla de login
function showLoginScreen() {
    loginScreen.classList.add('active');
    mainScreen.classList.remove('active');
    isAuthenticated = false;
}

// Mostrar pantalla principal
function showMainScreen() {
    loginScreen.classList.remove('active');
    mainScreen.classList.add('active');
    isAuthenticated = true;
    // Reiniciar timer de inactividad al mostrar la pantalla principal
    resetInactivityTimer();
}

// Manejar login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Ocultar error anterior
    loginError.style.display = 'none';
    
    try {
        // Autenticar usando la API de Electron
        const result = await window.electronAPI.login(username, password);
        
        if (!result.success) {
            showError(result.message);
            return;
        }
        
        // Login exitoso
        localStorage.setItem('sessionActive', 'true');
        localStorage.setItem('currentUsername', username); // Guardar username para operaciones críticas
        // Verificar cambio de fecha al iniciar sesión
        verificarCambioFecha();
        showMainScreen();
        // Reiniciar timer de inactividad
        resetInactivityTimer();
        // Inicializar actualizaciones después del login
        initUpdater();
        
    } catch (error) {
        console.error('Error en login:', error);
        showError('Error al iniciar sesión. Por favor, intenta de nuevo.');
    }
}

// Manejar logout
function handleLogout() {
    localStorage.removeItem('sessionActive');
    clearInactivityTimer();
    clearUpdateCheckInterval();
    showLoginScreen();
    loginForm.reset();
}

// Inicializar detección de inactividad
function initInactivityDetection() {
    // Eventos que indican actividad del usuario
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
    // También detectar cuando la ventana recupera el foco
    window.addEventListener('focus', resetInactivityTimer);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            resetInactivityTimer();
        }
    });
}

// Reiniciar timer de inactividad
function resetInactivityTimer() {
    // Solo si el usuario está autenticado
    if (!isAuthenticated && localStorage.getItem('sessionActive') !== 'true') {
        return;
    }
    
    // Limpiar timer anterior
    clearInactivityTimer();
    
    // Establecer nuevo timer
    inactivityTimer = setTimeout(() => {
        handleInactivityTimeout();
    }, INACTIVITY_TIMEOUT);
}

// Limpiar timer de inactividad
function clearInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
}

// Manejar timeout de inactividad
function handleInactivityTimeout() {
    console.log('⏱️ Timeout de inactividad alcanzado. Cerrando sesión...');
    
    // Limpiar sesión
    localStorage.removeItem('sessionActive');
    clearInactivityTimer();
    clearUpdateCheckInterval();
    
    // Mostrar mensaje al usuario
    if (typeof window.mostrarNotificacion === 'function') {
        window.mostrarNotificacion('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.', 'warning', 5000);
    }
    
    // Cerrar sesión
    showLoginScreen();
    loginForm.reset();
    
    // Mostrar mensaje en el campo de error
    showError('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.');
}

// Mostrar error
function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

// Navegar a una página
async function navigateToPage(page) {
    // Actualizar navegación activa
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        }
    });
    
    // Cargar contenido de la página
    const content = document.getElementById('page-content');
    
    // Mapeo de páginas a archivos
    const pageMap = {
        'dashboard': 'pages/dashboard.html',
        'clientes': 'pages/clientes.html',
        'productos': 'pages/productos.html',
        'servicios': 'pages/servicios.html',
        'empleados': 'pages/empleados.html',
        'consumos-empleados': 'pages/consumos-empleados.html',
        'transacciones': 'pages/transacciones.html',
        'nominas': 'pages/nominas.html',
        'tasas': 'pages/tasas.html',
        'reportes': 'pages/reportes.html',
        'ajustes': 'pages/ajustes.html',
        'citas': 'pages/citas.html'
    };
    
    const pageFile = pageMap[page];
    
    if (pageFile) {
        try {
            // Cargar HTML de la página
            const response = await fetch(pageFile);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            content.innerHTML = html;
            
            // Pequeño delay para asegurar que el DOM esté actualizado
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Inicializar módulo correspondiente (los scripts ya están cargados)
            initPageModule(page);
        } catch (error) {
            console.error('❌ Error al cargar la página:', error);
            content.innerHTML = `<h3>${getPageTitle(page)}</h3><p class="error-message">Error al cargar la página: ${error.message}</p>`;
        }
    } else {
        // Página no implementada aún
        content.innerHTML = `<h3>${getPageTitle(page)}</h3><p>Esta sección estará disponible próximamente.</p>`;
    }
}

// Inicializar módulo de la página (los scripts ya están cargados)
function initPageModule(page) {
    // Pequeño delay para asegurar que el DOM esté completamente cargado
    setTimeout(() => {
        // Llamar a la función de inicialización específica de la página
        // Cada módulo tiene su propio log de inicialización
        if (page === 'clientes' && typeof window.initClientes === 'function') {
            window.initClientes();
        } else if (page === 'productos' && typeof window.initProductos === 'function') {
            window.initProductos();
        } else if (page === 'servicios' && typeof window.initServicios === 'function') {
            window.initServicios();
        } else if (page === 'empleados' && typeof window.initEmpleados === 'function') {
            window.initEmpleados();
        } else if (page === 'consumos-empleados' && typeof window.initConsumosEmpleados === 'function') {
            window.initConsumosEmpleados();
        } else if (page === 'transacciones' && typeof window.initTransacciones === 'function') {
            window.initTransacciones();
        } else if (page === 'nominas' && typeof window.initNominas === 'function') {
            window.initNominas();
        } else if (page === 'reportes' && typeof window.initReportes === 'function') {
            window.initReportes();
        } else if (page === 'citas' && typeof window.initCitas === 'function') {
            window.initCitas();
        } else if (page === 'tasas' && typeof window.initTasas === 'function') {
            window.initTasas();
        } else if (page === 'ajustes' && typeof window.initAjustes === 'function') {
            window.initAjustes();
        } else if (page === 'dashboard' && typeof window.initDashboard === 'function') {
            window.initDashboard();
        } else {
            console.warn(`⚠️ Función de inicialización no encontrada para: ${page}`);
        }
    }, 100);
}

// Obtener título de página
function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard',
        'ajustes': 'Ajustes',
        'clientes': 'Gestión de Clientes',
        'productos': 'Gestión de Productos',
        'servicios': 'Gestión de Servicios',
        'empleados': 'Gestión de Empleados',
        'consumos-empleados': 'Consumos de Empleados',
        'transacciones': 'Transacciones',
        'nominas': 'Nóminas',
        'tasas': 'Tasas de Cambio',
        'reportes': 'Reportes',
        'citas': 'Citas'
    };
    return titles[page] || 'Página';
}

// Sistema de actualizaciones
let updateCheckInterval = null;

function initUpdater() {
    if (!window.updaterAPI) {
        console.warn('⚠️ updaterAPI no está disponible');
        return;
    }
    
    console.log('✅ Sistema de actualizaciones inicializado');
    
    // Escuchar eventos de actualizaciones
    window.updaterAPI.onUpdateAvailable((info) => {
        console.log('📦 Actualización disponible:', info.version);
        showUpdateNotification(info, 'available');
    });
    
    window.updaterAPI.onDownloadProgress((progress) => {
        // Solo mostrar progreso cada 10% para no saturar la consola
        if (progress.percent % 10 === 0) {
            console.log('📥 Descargando actualización:', progress.percent + '%');
        }
        updateDownloadProgress(progress);
    });
    
    window.updaterAPI.onUpdateDownloaded((info) => {
        console.log('✅ Actualización descargada, lista para instalar:', info.version);
        showUpdateNotification(info, 'downloaded');
    });
    
    // Escuchar evento para reprogramar actualizaciones cuando cambie la configuración
    if (window.electronAPI && window.electronAPI.on) {
        window.electronAPI.on('reprogramar-actualizaciones', () => {
            programarVerificacionActualizaciones();
        });
    }
    
    // Verificar actualizaciones al iniciar
    verificarActualizacionesInicial();
    
    // Configurar verificación periódica según la configuración del usuario
    programarVerificacionActualizaciones();
    
    // Función global para verificar manualmente desde la consola
    window.verificarActualizacionesManual = async function() {
        console.log('🔍 Verificando actualizaciones manualmente...');
        
        if (!window.updaterAPI) {
            console.error('❌ Sistema de actualizaciones no disponible');
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Error: Sistema de actualizaciones no disponible', 'error', 5000);
            }
            return;
        }
        
        try {
            const result = await window.updaterAPI.checkForUpdates();
            
            if (typeof window.mostrarNotificacion === 'function') {
                if (result && result.success) {
                    window.mostrarNotificacion('Verificación completada', 'info', 3000);
                } else {
                    const errorMsg = result?.error || 'Desconocido';
                    console.error('❌ Error al verificar actualizaciones:', errorMsg);
                    window.mostrarNotificacion('Error al verificar: ' + errorMsg, 'error', 5000);
                }
            }
        } catch (error) {
            console.error('❌ Error al verificar actualizaciones:', error);
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Error al verificar: ' + error.message, 'error', 5000);
            }
        }
    };
    
    console.log('💡 Para verificar actualizaciones manualmente, ejecuta: window.verificarActualizacionesManual()');
}

// Verificar actualizaciones al iniciar
async function verificarActualizacionesInicial() {
    console.log('🔍 Verificando actualizaciones al iniciar...');
    try {
        if (window.updaterAPI && window.updaterAPI.checkForUpdates) {
            await window.updaterAPI.checkForUpdates();
        }
    } catch (error) {
        console.error('❌ Error al verificar actualizaciones al iniciar:', error);
    }
}

// Verificar actualizaciones periódicamente
async function verificarActualizacionesPeriodica() {
    // Solo verificar si el usuario está autenticado
    if (!isAuthenticated && localStorage.getItem('sessionActive') !== 'true') {
        console.log('⏸️ Usuario no autenticado, omitiendo verificación de actualizaciones');
        return;
    }
    
    console.log('🔄 Verificación periódica de actualizaciones...');
    try {
        if (window.updaterAPI && window.updaterAPI.checkForUpdates) {
            const result = await window.updaterAPI.checkForUpdates();
            console.log('📋 Resultado de verificación periódica:', result);
        }
    } catch (error) {
        console.error('❌ Error en verificación periódica de actualizaciones:', error);
    }
}

// Programar verificación periódica de actualizaciones según la configuración
async function programarVerificacionActualizaciones() {
    // Limpiar intervalo anterior si existe
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
    }
    
    try {
        // Obtener frecuencia de la configuración (por defecto: cada hora)
        let frecuencia = 'cada-hora';
        try {
            const resultado = await window.electronAPI.dbGet(
                'SELECT valor FROM Configuracion WHERE clave = ?',
                ['frecuencia_actualizaciones']
            );
            if (resultado && resultado.valor) {
                frecuencia = resultado.valor;
            }
        } catch (error) {
            console.warn('⚠️ No se pudo obtener la frecuencia de actualizaciones, usando valor por defecto (cada hora)');
        }
        
        // Convertir frecuencia a milisegundos
        let intervaloMs = 60 * 60 * 1000; // Por defecto: 1 hora
        switch (frecuencia) {
            case 'cada-hora':
                intervaloMs = 60 * 60 * 1000; // 1 hora
                break;
            case 'cada-6-horas':
                intervaloMs = 6 * 60 * 60 * 1000; // 6 horas
                break;
            case 'cada-12-horas':
                intervaloMs = 12 * 60 * 60 * 1000; // 12 horas
                break;
            case 'diario':
                intervaloMs = 24 * 60 * 60 * 1000; // 24 horas
                break;
        }
        
        // Programar verificación periódica
        updateCheckInterval = setInterval(() => {
            verificarActualizacionesPeriodica();
        }, intervaloMs);
        
        const frecuenciaTexto = frecuencia.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`✅ Sistema de actualizaciones configurado (verificación ${frecuenciaTexto})`);
    } catch (error) {
        console.error('❌ Error al programar verificación de actualizaciones:', error);
        // Usar valor por defecto si hay error
        updateCheckInterval = setInterval(() => {
            verificarActualizacionesPeriodica();
        }, 60 * 60 * 1000);
        console.log('✅ Sistema de actualizaciones configurado (verificación cada 1 hora - por defecto)');
    }
}

// Limpiar interval de actualizaciones al cerrar sesión
function clearUpdateCheckInterval() {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
        console.log('🛑 Verificación periódica de actualizaciones detenida');
    }
}

// Mostrar notificación de actualización
function showUpdateNotification(info, status) {
    const notification = document.getElementById('update-notification');
    if (!notification) return;
    
    let content = '';
    
    if (status === 'available') {
        content = `
            <button class="close-btn" onclick="closeUpdateNotification()">×</button>
            <h3>🔄 Actualización Disponible</h3>
            <p>Hay una nueva versión disponible (v${info.version}). ¿Deseas descargarla ahora?</p>
            <div class="update-actions">
                <button class="btn btn-update-now" onclick="downloadUpdate()">Actualizar Ahora</button>
                <button class="btn btn-update-later" onclick="closeUpdateNotification()">Más Tarde</button>
            </div>
        `;
    } else if (status === 'downloaded') {
        content = `
            <button class="close-btn" onclick="closeUpdateNotification()">×</button>
            <h3>✅ Actualización Descargada</h3>
            <p>La actualización (v${info.version}) se ha descargado correctamente. ¿Deseas instalarla ahora? La aplicación se reiniciará.</p>
            <div class="update-actions">
                <button class="btn btn-update-now" onclick="installUpdate()">Instalar y Reiniciar</button>
                <button class="btn btn-update-later" onclick="closeUpdateNotification()">Más Tarde</button>
            </div>
        `;
    }
    
    notification.innerHTML = content;
    notification.style.display = 'block';
}

// Actualizar progreso de descarga
function updateDownloadProgress(progress) {
    const notification = document.getElementById('update-notification');
    if (!notification) return;
    
    // Buscar o crear barra de progreso
    let progressBar = notification.querySelector('.progress-bar');
    if (!progressBar) {
        const actions = notification.querySelector('.update-actions');
        if (actions) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.innerHTML = '<div class="progress-fill"></div>';
            actions.parentNode.insertBefore(progressBar, actions);
        }
    }
    
    const progressFill = progressBar.querySelector('.progress-fill');
    if (progressFill) {
        const percent = Math.round(progress.percent || 0);
        progressFill.style.width = `${percent}%`;
        
        // Actualizar texto si existe
        const p = notification.querySelector('p');
        if (p && status === 'downloading') {
            p.textContent = `Descargando actualización... ${percent}%`;
        }
    }
}

// Cerrar notificación de actualización
window.closeUpdateNotification = function() {
    const notification = document.getElementById('update-notification');
    if (notification) {
        notification.style.display = 'none';
    }
};

// Descargar actualización
window.downloadUpdate = async function() {
    if (!window.updaterAPI) return;
    
    try {
        const notification = document.getElementById('update-notification');
        if (notification) {
            const p = notification.querySelector('p');
            if (p) {
                p.textContent = 'Iniciando descarga...';
            }
            // Agregar barra de progreso
            const actions = notification.querySelector('.update-actions');
            if (actions && !notification.querySelector('.progress-bar')) {
                const progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                progressBar.innerHTML = '<div class="progress-fill"></div>';
                actions.parentNode.insertBefore(progressBar, actions);
            }
        }
        
        await window.updaterAPI.downloadUpdate();
    } catch (error) {
        console.error('Error al descargar actualización:', error);
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Error al descargar la actualización. Por favor, intenta más tarde.', 'error', 5000);
        } else {
            console.error('Error al descargar la actualización');
        }
    }
};

// Instalar actualización
window.installUpdate = async function() {
    if (!window.updaterAPI) return;
    
    if (typeof window.mostrarConfirmacion === 'function') {
        const confirmado = await window.mostrarConfirmacion('¿Estás seguro de que deseas instalar la actualización ahora? La aplicación se reiniciará.', 'Confirmar Instalación');
        if (confirmado) {
            window.updaterAPI.quitAndInstall();
        }
    } else {
        // Fallback si no está disponible
        if (confirm('¿Estás seguro de que deseas instalar la actualización ahora? La aplicación se reiniciará.')) {
            window.updaterAPI.quitAndInstall();
        }
    }
};

