// Estado de la aplicación
let isAuthenticated = false;

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
    
    if (ultimaFecha && ultimaFecha !== fechaHoy) {
        // La fecha cambió, es un nuevo día
        console.log('Nuevo día detectado:', fechaHoy);
        // Aquí puedes agregar lógica adicional si es necesario
    } else if (!ultimaFecha) {
        // Primera vez que se inicia, guardar la fecha
        console.log('Primera sesión del día:', fechaHoy);
    } else {
        // Mismo día, no es un nuevo día
        console.log('Misma fecha, no es un nuevo día:', fechaHoy);
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
        // Verificar cambio de fecha al iniciar sesión
        verificarCambioFecha();
        showMainScreen();
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
    showLoginScreen();
    loginForm.reset();
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
        'citas': 'pages/citas.html'
    };
    
    const pageFile = pageMap[page];
    
    if (pageFile) {
        try {
            console.log(`Cargando página: ${pageFile}`);
            // Cargar HTML de la página
            const response = await fetch(pageFile);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            console.log(`HTML cargado, insertando en DOM...`);
            content.innerHTML = html;
            
            // Pequeño delay para asegurar que el DOM esté actualizado
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Inicializar módulo correspondiente (los scripts ya están cargados)
            console.log(`Inicializando módulo para página: ${page}`);
            initPageModule(page);
        } catch (error) {
            console.error('Error al cargar la página:', error);
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
        if (page === 'clientes' && typeof window.initClientes === 'function') {
            console.log('Inicializando clientes...');
            window.initClientes();
        } else if (page === 'productos' && typeof window.initProductos === 'function') {
            console.log('Inicializando productos...');
            window.initProductos();
        } else if (page === 'servicios' && typeof window.initServicios === 'function') {
            console.log('Inicializando servicios...');
            window.initServicios();
        } else if (page === 'empleados' && typeof window.initEmpleados === 'function') {
            console.log('Inicializando empleados...');
            window.initEmpleados();
        } else if (page === 'consumos-empleados' && typeof window.initConsumosEmpleados === 'function') {
            console.log('Inicializando consumos de empleados...');
            window.initConsumosEmpleados();
        } else if (page === 'transacciones' && typeof window.initTransacciones === 'function') {
            console.log('Inicializando transacciones...');
            window.initTransacciones();
        } else if (page === 'nominas' && typeof window.initNominas === 'function') {
            console.log('Inicializando nóminas...');
            window.initNominas();
        } else if (page === 'reportes' && typeof window.initReportes === 'function') {
            console.log('Inicializando reportes...');
            window.initReportes();
        } else if (page === 'citas' && typeof window.initCitas === 'function') {
            console.log('Inicializando citas...');
            window.initCitas();
        } else if (page === 'tasas' && typeof window.initTasas === 'function') {
            console.log('Inicializando tasas...');
            window.initTasas();
        } else if (page === 'dashboard' && typeof window.initDashboard === 'function') {
            console.log('Inicializando dashboard...');
            window.initDashboard();
        } else {
            console.warn(`Función de inicialización no encontrada para ${page}`);
        }
    }, 100);
}

// Obtener título de página
function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard',
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
function initUpdater() {
    if (!window.updaterAPI) {
        console.warn('⚠️ updaterAPI no está disponible');
        return;
    }
    
    console.log('✅ Sistema de actualizaciones inicializado');
    
    // Escuchar eventos de actualizaciones
    window.updaterAPI.onUpdateAvailable((info) => {
        console.log('📦 Evento: Actualización disponible recibido:', info);
        showUpdateNotification(info, 'available');
    });
    
    window.updaterAPI.onDownloadProgress((progress) => {
        console.log('📥 Progreso de descarga:', progress.percent + '%');
        updateDownloadProgress(progress);
    });
    
    window.updaterAPI.onUpdateDownloaded((info) => {
        console.log('✅ Evento: Actualización descargada recibido:', info);
        showUpdateNotification(info, 'downloaded');
    });
    
    // Función global para verificar manualmente desde la consola
    window.verificarActualizacionesManual = async function() {
        console.log('🔍 Verificación manual de actualizaciones iniciada...');
        console.log('📦 Versión actual según package.json:', '1.0.6'); // Esto debería venir del package.json
        
        if (!window.updaterAPI) {
            console.error('❌ updaterAPI no está disponible');
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Error: Sistema de actualizaciones no disponible', 'error', 5000);
            }
            return;
        }
        
        console.log('✅ updaterAPI disponible, iniciando verificación...');
        
        try {
            const result = await window.updaterAPI.checkForUpdates();
            console.log('📋 Resultado completo de verificación:', result);
            console.log('📋 Resultado parseado:', JSON.stringify(result, null, 2));
            
            if (typeof window.mostrarNotificacion === 'function') {
                if (result && result.success) {
                    window.mostrarNotificacion('Verificación completada. Revisa la consola para detalles.', 'info', 3000);
                } else {
                    const errorMsg = result?.error || 'Desconocido';
                    console.error('❌ Error en resultado:', errorMsg);
                    window.mostrarNotificacion('Error al verificar: ' + errorMsg, 'error', 5000);
                }
            }
        } catch (error) {
            console.error('❌ Excepción al verificar actualizaciones:', error);
            console.error('📋 Tipo:', error.constructor.name);
            console.error('📋 Mensaje:', error.message);
            if (error.stack) {
                console.error('📋 Stack:', error.stack);
            }
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Error al verificar: ' + error.message, 'error', 5000);
            }
        }
    };
    
    console.log('💡 Para verificar actualizaciones manualmente, ejecuta: window.verificarActualizacionesManual()');
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

