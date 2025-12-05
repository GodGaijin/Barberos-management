// Gestión de Ajustes - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.ajustesModule) {
        window.ajustesModule = {
            empleados: [],
            porcentajes: {}, // {empleadoId: porcentaje}
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var empleados = window.ajustesModule.empleados;
    var porcentajes = window.ajustesModule.porcentajes;
    var initialized = window.ajustesModule.initialized;

    // Inicialización - función exportada para ser llamada desde main.js
    // Inicializa el módulo de ajustes cuando se carga la página
    window.initAjustes = function() {
        // Siempre reconfigurar los event listeners porque el DOM se recrea al navegar
        // Usar un delay más largo para asegurar que el DOM esté completamente cargado
        setTimeout(async () => {
            try {
                // Verificar que estamos en la página de ajustes
                const pageContent = document.querySelector('.page-content');
                const btnAbrir = document.getElementById('btn-abrir-ajustes');
                const modal = document.getElementById('ajustes-modal');
                
                if (!pageContent || !btnAbrir) {
                    // Reintentar después de un breve delay si los elementos no están listos
                    setTimeout(() => {
                        const btnAbrirRetry = document.getElementById('btn-abrir-ajustes');
                        const modalRetry = document.getElementById('ajustes-modal');
                        if (btnAbrirRetry && modalRetry) {
                            setupEventListeners();
                            if (modalRetry) {
                                modalRetry.style.display = 'none';
                                modalRetry.classList.remove('active');
                            }
                        } else {
                            console.error('❌ No se pudieron encontrar los elementos de ajustes después del reintento');
                        }
                    }, 200);
                    return;
                }
                
                // Asegurar que el modal esté oculto por defecto
                if (modal) {
                    modal.style.display = 'none';
                    modal.classList.remove('active');
                }
                
                setupEventListeners();
                // Crear tablas si no existen
                await crearTablaSiNoExiste();
                await crearTablasConfiguracion();
                // Cargar configuraciones
                await cargarPorcentajes();
                await cargarModoApariencia();
                window.ajustesModule.initialized = true;
                console.log('✅ Módulo de ajustes inicializado correctamente');
            } catch (error) {
                console.error('❌ Error al inicializar ajustes:', error);
            }
        }, 200);
    };

    // Configurar event listeners
    function setupEventListeners() {
        // Botón para abrir modal
        const btnAbrirAjustes = document.getElementById('btn-abrir-ajustes');
        // Configurar botón para abrir el modal de ajustes
        if (btnAbrirAjustes) {
            btnAbrirAjustes.removeEventListener('click', abrirModal);
            btnAbrirAjustes.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                abrirModal();
            });
        } else {
            console.error('❌ No se encontró el botón btn-abrir-ajustes');
        }

        // Botones del modal
        const closeModal = document.getElementById('close-ajustes-modal');
        if (closeModal) {
            closeModal.removeEventListener('click', cerrarModal);
            closeModal.addEventListener('click', cerrarModal);
        }

        const cancelBtn = document.getElementById('cancel-ajustes');
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', cerrarModal);
            cancelBtn.addEventListener('click', cerrarModal);
        }

        const guardarBtn = document.getElementById('guardar-ajustes');
        if (guardarBtn) {
            guardarBtn.removeEventListener('click', guardarAjustes);
            guardarBtn.addEventListener('click', guardarAjustes);
        }

        // Cerrar modal al hacer clic fuera
        const modal = document.getElementById('ajustes-modal');
        if (modal) {
            modal.removeEventListener('click', cerrarModalAlClicarFuera);
            modal.addEventListener('click', cerrarModalAlClicarFuera);
        }
        
        // Manejo de tabs
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.removeEventListener('click', cambiarTab);
            btn.addEventListener('click', cambiarTab);
        });
        
        // Modo apariencia
        const modoOscuro = document.getElementById('modo-oscuro');
        const modoClaro = document.getElementById('modo-claro');
        if (modoOscuro) {
            modoOscuro.removeEventListener('change', cambiarModoApariencia);
            modoOscuro.addEventListener('change', cambiarModoApariencia);
        }
        if (modoClaro) {
            modoClaro.removeEventListener('change', cambiarModoApariencia);
            modoClaro.addEventListener('change', cambiarModoApariencia);
        }
        
        // Tutoriales
        const tutorialesActivos = document.getElementById('tutoriales-activos');
        if (tutorialesActivos) {
            tutorialesActivos.removeEventListener('change', actualizarConfiguracion);
            tutorialesActivos.addEventListener('change', actualizarConfiguracion);
        }
        
        // Respaldo automático
        const respaldoActivo = document.getElementById('respaldo-automatico-activo');
        const frecuenciaRespaldo = document.getElementById('frecuencia-respaldo');
        if (respaldoActivo) {
            respaldoActivo.removeEventListener('change', actualizarConfiguracion);
            respaldoActivo.addEventListener('change', actualizarConfiguracion);
        }
        if (frecuenciaRespaldo) {
            frecuenciaRespaldo.removeEventListener('change', actualizarConfiguracion);
            frecuenciaRespaldo.addEventListener('change', actualizarConfiguracion);
        }
        
        // Reportes automáticos
        const reportesActivo = document.getElementById('reportes-automaticos-activo');
        const horaReportes = document.getElementById('hora-reportes');
        if (reportesActivo) {
            reportesActivo.removeEventListener('change', actualizarConfiguracion);
            reportesActivo.addEventListener('change', actualizarConfiguracion);
        }
        if (horaReportes) {
            horaReportes.removeEventListener('change', actualizarConfiguracion);
            horaReportes.addEventListener('change', actualizarConfiguracion);
        }
        
        // Frecuencia de actualizaciones
        const frecuenciaActualizaciones = document.getElementById('frecuencia-actualizaciones');
        if (frecuenciaActualizaciones) {
            frecuenciaActualizaciones.removeEventListener('change', actualizarConfiguracion);
            frecuenciaActualizaciones.addEventListener('change', actualizarConfiguracion);
        }
        
        // Botón para verificar actualizaciones manualmente
        const btnVerificarActualizaciones = document.getElementById('btn-verificar-actualizaciones');
        if (btnVerificarActualizaciones) {
            btnVerificarActualizaciones.removeEventListener('click', verificarActualizacionesManual);
            btnVerificarActualizaciones.addEventListener('click', verificarActualizacionesManual);
        }
        
        // Formatear BD
        const btnFormatear = document.getElementById('btn-formatear-bd');
        if (btnFormatear) {
            btnFormatear.removeEventListener('click', formatearBaseDatos);
            btnFormatear.addEventListener('click', formatearBaseDatos);
        }
    }
    
    // Cambiar tab
    function cambiarTab(e) {
        const tabName = e.target.getAttribute('data-tab');
        if (!tabName) return;
        
        // Remover active de todos los tabs y contenidos
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Activar el tab seleccionado
        e.target.classList.add('active');
        const tabContent = document.getElementById(`tab-${tabName}`);
        if (tabContent) {
            tabContent.classList.add('active');
            
            // Cargar datos específicos del tab si es necesario
            if (tabName === 'respaldo') {
                cargarListaBackups();
            }
        }
    }

    // Abrir modal
    async function abrirModal() {
        console.log('abrirModal llamado');
        const modal = document.getElementById('ajustes-modal');
        console.log('Modal encontrado:', modal);
        if (modal) {
            console.log('Abriendo modal...');
            // Usar la clase 'active' como lo hacen otros modales
            modal.classList.add('active');
            modal.style.display = 'flex'; // Asegurar que se muestre
            
            try {
                // Crear tablas si no existen
                await crearTablaSiNoExiste();
                await crearTablasConfiguracion();
                
                // Cargar datos
                await cargarEmpleados();
                await cargarPorcentajes();
                await cargarConfiguracion();
                renderizarEmpleadosConSliders();
            } catch (error) {
                console.error('❌ Error al cargar datos del modal de ajustes:', error);
                mostrarError('Error al cargar datos: ' + (error.message || error));
            }
        } else {
            console.error('❌ No se encontró el modal ajustes-modal');
        }
    }

    // Cerrar modal
    function cerrarModal() {
        const modal = document.getElementById('ajustes-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    // Cerrar modal al hacer clic fuera
    function cerrarModalAlClicarFuera(e) {
        const modal = document.getElementById('ajustes-modal');
        if (modal && e.target === modal) {
            cerrarModal();
        }
    }

    // Cargar empleados
    async function cargarEmpleados() {
        try {
            const empleadosData = await window.electronAPI.dbQuery(`
                SELECT id, nombre, apellido 
                FROM Empleados 
                ORDER BY nombre, apellido
            `);
            window.ajustesModule.empleados = empleadosData || [];
            empleados = window.ajustesModule.empleados;
        } catch (error) {
            console.error('Error al cargar empleados:', error);
            mostrarError('Error al cargar empleados');
        }
    }

    // Cargar porcentajes guardados
    async function cargarPorcentajes() {
        try {
            // Verificar si la tabla existe, si no, crearla
            await crearTablaSiNoExiste();
            
            const porcentajesData = await window.electronAPI.dbQuery(`
                SELECT id_empleado, porcentaje_comision 
                FROM PorcentajesComision
            `);
            
            // Convertir a objeto {empleadoId: porcentaje}
            const porcentajesObj = {};
            if (porcentajesData) {
                porcentajesData.forEach(p => {
                    porcentajesObj[p.id_empleado] = parseFloat(p.porcentaje_comision) || 60;
                });
            }
            window.ajustesModule.porcentajes = porcentajesObj;
            porcentajes = window.ajustesModule.porcentajes;
        } catch (error) {
            console.error('Error al cargar porcentajes:', error);
            // Si la tabla no existe, usar valores por defecto
            window.ajustesModule.porcentajes = {};
            porcentajes = window.ajustesModule.porcentajes;
        }
    }

    // Crear tabla si no existe
    async function crearTablaSiNoExiste() {
        try {
            await window.electronAPI.dbRun(`
                CREATE TABLE IF NOT EXISTS PorcentajesComision (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_empleado INTEGER NOT NULL UNIQUE,
                    porcentaje_comision REAL NOT NULL DEFAULT 60 CHECK(porcentaje_comision >= 0 AND porcentaje_comision <= 100),
                    fecha_actualizacion TEXT DEFAULT (datetime('now', 'localtime')),
                    FOREIGN KEY (id_empleado) REFERENCES Empleados(id) ON DELETE CASCADE
                )
            `);
        } catch (error) {
            console.error('Error al crear tabla PorcentajesComision:', error);
        }
    }

    // Renderizar empleados con sliders
    function renderizarEmpleadosConSliders() {
        const container = document.getElementById('empleados-porcentajes-container');
        if (!container) return;

        if (!empleados || empleados.length === 0) {
            container.innerHTML = '<p class="info-message">No hay empleados registrados.</p>';
            return;
        }

        let html = '<div class="empleados-porcentajes-list">';
        
        empleados.forEach(empleado => {
            const empleadoId = empleado.id;
            const porcentajeActual = porcentajes[empleadoId] || 60; // Por defecto 60%
            
            html += `
                <div class="empleado-porcentaje-item" data-empleado-id="${empleadoId}">
                    <div class="empleado-info">
                        <strong>${empleado.nombre} ${empleado.apellido}</strong>
                    </div>
                    <div class="slider-container">
                        <input 
                            type="range" 
                            id="slider-${empleadoId}" 
                            class="porcentaje-slider" 
                            min="0" 
                            max="100" 
                            step="0.5" 
                            value="${porcentajeActual}"
                            data-empleado-id="${empleadoId}"
                        >
                        <div class="slider-value-display">
                            <span id="valor-${empleadoId}" class="porcentaje-valor">${porcentajeActual.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Configurar event listeners para los sliders
        empleados.forEach(empleado => {
            const slider = document.getElementById(`slider-${empleado.id}`);
            const valorDisplay = document.getElementById(`valor-${empleado.id}`);
            
            if (slider && valorDisplay) {
                slider.addEventListener('input', function() {
                    const valor = parseFloat(this.value);
                    valorDisplay.textContent = valor.toFixed(1) + '%';
                    // Actualizar el objeto porcentajes
                    porcentajes[empleado.id] = valor;
                });
            }
        });
    }

    // Guardar ajustes
    async function guardarAjustes() {
        try {
            await crearTablaSiNoExiste();
            
            // Guardar o actualizar porcentajes para cada empleado
            for (const empleadoId in porcentajes) {
                const porcentaje = porcentajes[empleadoId];
                
                // Verificar si ya existe un registro para este empleado
                const existente = await window.electronAPI.dbGet(
                    'SELECT id FROM PorcentajesComision WHERE id_empleado = ?',
                    [empleadoId]
                );

                if (existente) {
                    // Actualizar
                    await window.electronAPI.dbRun(
                        `UPDATE PorcentajesComision 
                         SET porcentaje_comision = ?, 
                             fecha_actualizacion = datetime('now', 'localtime')
                         WHERE id_empleado = ?`,
                        [porcentaje, empleadoId]
                    );
                } else {
                    // Insertar
                    await window.electronAPI.dbRun(
                        `INSERT INTO PorcentajesComision (id_empleado, porcentaje_comision, fecha_actualizacion)
                         VALUES (?, ?, datetime('now', 'localtime'))`,
                        [empleadoId, porcentaje]
                    );
                }
            }

            // También guardar porcentajes para empleados que no están en el objeto pero tienen slider
            empleados.forEach(empleado => {
                const slider = document.getElementById(`slider-${empleado.id}`);
                if (slider) {
                    const porcentaje = parseFloat(slider.value);
                    porcentajes[empleado.id] = porcentaje;
                    
                    // Guardar en base de datos
                    window.electronAPI.dbGet(
                        'SELECT id FROM PorcentajesComision WHERE id_empleado = ?',
                        [empleado.id]
                    ).then(existente => {
                        if (existente) {
                            window.electronAPI.dbRun(
                                `UPDATE PorcentajesComision 
                                 SET porcentaje_comision = ?, 
                                     fecha_actualizacion = datetime('now', 'localtime')
                                 WHERE id_empleado = ?`,
                                [porcentaje, empleado.id]
                            );
                        } else {
                            window.electronAPI.dbRun(
                                `INSERT INTO PorcentajesComision (id_empleado, porcentaje_comision, fecha_actualizacion)
                                 VALUES (?, ?, datetime('now', 'localtime'))`,
                                [empleado.id, porcentaje]
                            );
                        }
                    });
                }
            });

            mostrarExito('Ajustes guardados correctamente');
            cerrarModal();
        } catch (error) {
            console.error('Error al guardar ajustes:', error);
            mostrarError('Error al guardar ajustes: ' + (error.message || error));
        }
    }

    // Función para obtener el porcentaje de un empleado (para usar en nóminas)
    window.obtenerPorcentajeComision = async function(empleadoId) {
        try {
            // Asegurarse de que la tabla existe antes de leer
            await crearTablaSiNoExiste();
            
            const resultado = await window.electronAPI.dbGet(
                'SELECT porcentaje_comision FROM PorcentajesComision WHERE id_empleado = ?',
                [empleadoId]
            );
            return resultado ? parseFloat(resultado.porcentaje_comision) : 60; // Por defecto 60%
        } catch (error) {
            console.error('Error al obtener porcentaje de comisión:', error);
            // Si hay error, intentar crear la tabla y volver a intentar
            try {
                await crearTablaSiNoExiste();
                const resultado = await window.electronAPI.dbGet(
                    'SELECT porcentaje_comision FROM PorcentajesComision WHERE id_empleado = ?',
                    [empleadoId]
                );
                return resultado ? parseFloat(resultado.porcentaje_comision) : 60;
            } catch (error2) {
                console.error('Error al obtener porcentaje de comisión (segundo intento):', error2);
                return 60; // Por defecto 60%
            }
        }
    };

    // Crear tablas de configuración si no existen
    async function crearTablasConfiguracion() {
        try {
            await window.electronAPI.dbRun(`
                CREATE TABLE IF NOT EXISTS Configuracion (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clave TEXT NOT NULL UNIQUE,
                    valor TEXT,
                    tipo TEXT DEFAULT 'text' CHECK(tipo IN ('text', 'number', 'boolean', 'json')),
                    descripcion TEXT,
                    fecha_actualizacion TEXT DEFAULT (datetime('now', 'localtime'))
                )
            `);
            
            await window.electronAPI.dbRun(`
                CREATE TABLE IF NOT EXISTS Backups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre_archivo TEXT NOT NULL,
                    ruta_completa TEXT NOT NULL,
                    fecha_creacion TEXT DEFAULT (datetime('now', 'localtime')),
                    tamano_bytes INTEGER,
                    descripcion TEXT
                )
            `);
            
            // Insertar configuraciones por defecto si no existen
            const configs = [
                ['modo_oscuro', 'true', 'boolean', 'Modo oscuro activado'],
                ['respaldo_automatico', 'false', 'boolean', 'Respaldo automático activado'],
                ['frecuencia_respaldo', 'diario', 'text', 'Frecuencia de respaldo automático'],
                ['max_backups', '20', 'number', 'Número máximo de backups a mantener'],
                ['reportes_automaticos', 'false', 'boolean', 'Generación automática de reportes'],
                ['hora_reportes', '23:00', 'text', 'Hora para generar reportes automáticos'],
                ['tutoriales_activos', 'true', 'boolean', 'Tutoriales interactivos activados'],
                ['frecuencia_actualizaciones', 'cada-hora', 'text', 'Frecuencia de verificación de actualizaciones']
            ];
            
            for (const [clave, valor, tipo, descripcion] of configs) {
                const existe = await window.electronAPI.dbGet(
                    'SELECT id FROM Configuracion WHERE clave = ?',
                    [clave]
                );
                if (!existe) {
                    await window.electronAPI.dbRun(
                        `INSERT INTO Configuracion (clave, valor, tipo, descripcion) VALUES (?, ?, ?, ?)`,
                        [clave, valor, tipo, descripcion]
                    );
                }
            }
        } catch (error) {
            console.error('Error al crear tablas de configuración:', error);
        }
    }
    
    // Cargar configuración
    async function cargarConfiguracion() {
        try {
            await crearTablasConfiguracion();
            
            // Modo apariencia
            const modoOscuro = await obtenerConfiguracion('modo_oscuro', 'true');
            const modoOscuroRadio = document.getElementById('modo-oscuro');
            const modoClaroRadio = document.getElementById('modo-claro');
            if (modoOscuroRadio && modoClaroRadio) {
                if (modoOscuro === 'true') {
                    modoOscuroRadio.checked = true;
                } else {
                    modoClaroRadio.checked = true;
                }
            }
            
            // Respaldo automático
            const respaldoActivo = await obtenerConfiguracion('respaldo_automatico', 'false');
            const frecuencia = await obtenerConfiguracion('frecuencia_respaldo', 'diario');
            const respaldoCheck = document.getElementById('respaldo-automatico-activo');
            const frecuenciaSelect = document.getElementById('frecuencia-respaldo');
            if (respaldoCheck) respaldoCheck.checked = respaldoActivo === 'true';
            if (frecuenciaSelect) frecuenciaSelect.value = frecuencia;
            
            // Reportes automáticos
            const reportesActivo = await obtenerConfiguracion('reportes_automaticos', 'false');
            const horaReportes = await obtenerConfiguracion('hora_reportes', '23:00');
            const reportesCheck = document.getElementById('reportes-automaticos-activo');
            const horaInput = document.getElementById('hora-reportes');
            if (reportesCheck) reportesCheck.checked = reportesActivo === 'true';
            if (horaInput) horaInput.value = horaReportes;
            
            // Tutoriales
            const tutorialesActivos = await obtenerConfiguracion('tutoriales_activos', 'true');
            const tutorialesCheck = document.getElementById('tutoriales-activos');
            if (tutorialesCheck) tutorialesCheck.checked = tutorialesActivos === 'true';
            
            // Frecuencia de actualizaciones
            const frecuenciaActualizaciones = await obtenerConfiguracion('frecuencia_actualizaciones', 'cada-hora');
            const frecuenciaActualizacionesSelect = document.getElementById('frecuencia-actualizaciones');
            if (frecuenciaActualizacionesSelect) frecuenciaActualizacionesSelect.value = frecuenciaActualizaciones;
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        }
    }
    
    // Obtener configuración
    async function obtenerConfiguracion(clave, valorPorDefecto = null) {
        try {
            const resultado = await window.electronAPI.dbGet(
                'SELECT valor FROM Configuracion WHERE clave = ?',
                [clave]
            );
            return resultado ? resultado.valor : valorPorDefecto;
        } catch (error) {
            console.error(`Error al obtener configuración ${clave}:`, error);
            return valorPorDefecto;
        }
    }
    
    // Guardar configuración
    async function guardarConfiguracion(clave, valor) {
        try {
            const existe = await window.electronAPI.dbGet(
                'SELECT id FROM Configuracion WHERE clave = ?',
                [clave]
            );
            if (existe) {
                await window.electronAPI.dbRun(
                    `UPDATE Configuracion SET valor = ?, fecha_actualizacion = datetime('now', 'localtime') WHERE clave = ?`,
                    [valor, clave]
                );
            } else {
                await window.electronAPI.dbRun(
                    `INSERT INTO Configuracion (clave, valor, fecha_actualizacion) VALUES (?, ?, datetime('now', 'localtime'))`,
                    [clave, valor]
                );
            }
        } catch (error) {
            console.error(`Error al guardar configuración ${clave}:`, error);
            throw error;
        }
    }
    
    // Actualizar configuración desde UI
    async function actualizarConfiguracion(e) {
        const elemento = e.target;
        let clave = '';
        let valor = '';
        let reprogramarRespaldos = false;
        let reprogramarReportes = false;
        
        if (elemento.id === 'respaldo-automatico-activo') {
            clave = 'respaldo_automatico';
            valor = elemento.checked ? 'true' : 'false';
            reprogramarRespaldos = true;
        } else if (elemento.id === 'frecuencia-respaldo') {
            clave = 'frecuencia_respaldo';
            valor = elemento.value;
            reprogramarRespaldos = true;
        } else if (elemento.id === 'reportes-automaticos-activo') {
            clave = 'reportes_automaticos';
            valor = elemento.checked ? 'true' : 'false';
            reprogramarReportes = true;
        } else if (elemento.id === 'hora-reportes') {
            clave = 'hora_reportes';
            valor = elemento.value;
            reprogramarReportes = true;
        } else if (elemento.id === 'tutoriales-activos') {
            clave = 'tutoriales_activos';
            valor = elemento.checked ? 'true' : 'false';
        } else if (elemento.id === 'frecuencia-actualizaciones') {
            clave = 'frecuencia_actualizaciones';
            valor = elemento.value;
            // Reprogramar actualizaciones cuando cambie la frecuencia
            if (window.electronAPI && window.electronAPI.reprogramarActualizaciones) {
                window.electronAPI.reprogramarActualizaciones();
            }
        }
        
        if (clave) {
            await guardarConfiguracion(clave, valor);
            
            // Reprogramar si es necesario
            if (reprogramarRespaldos && window.electronAPI && window.electronAPI.reprogramarRespaldos) {
                window.electronAPI.reprogramarRespaldos();
            }
            if (reprogramarReportes && window.electronAPI && window.electronAPI.reprogramarReportes) {
                window.electronAPI.reprogramarReportes();
            }
        }
    }
    
    // Cambiar modo apariencia
    async function cambiarModoApariencia(e) {
        const modo = e.target.value;
        const esOscuro = modo === 'oscuro';
        await guardarConfiguracion('modo_oscuro', esOscuro ? 'true' : 'false');
        aplicarModoApariencia(esOscuro);
    }
    
    // Aplicar modo apariencia
    function aplicarModoApariencia(esOscuro) {
        const root = document.documentElement;
        if (esOscuro) {
            // Modo oscuro (valores actuales)
            root.style.setProperty('--bg-primary', '#1a1a1a');
            root.style.setProperty('--bg-secondary', '#2d2d2d');
            root.style.setProperty('--bg-tertiary', '#3a3a3a');
            root.style.setProperty('--text-primary', '#e0e0e0');
            root.style.setProperty('--text-secondary', '#b0b0b0');
        } else {
            // Modo claro
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f5f5f5');
            root.style.setProperty('--bg-tertiary', '#e8e8e8');
            root.style.setProperty('--text-primary', '#1a1a1a');
            root.style.setProperty('--text-secondary', '#666666');
        }
    }
    
    // Cargar modo apariencia al iniciar
    async function cargarModoApariencia() {
        const modoOscuro = await obtenerConfiguracion('modo_oscuro', 'true');
        aplicarModoApariencia(modoOscuro === 'true');
    }
    
    // Cargar lista de backups
    async function cargarListaBackups() {
        const container = document.getElementById('backups-lista-container');
        if (!container) return;
        
        try {
            // Primero intentar cargar desde la BD
            let backups = [];
            try {
                const backupsBD = await window.electronAPI.dbQuery(`
                    SELECT * FROM Backups 
                    ORDER BY fecha_creacion DESC
                `);
                backups = backupsBD || [];
            } catch (error) {
                console.warn('No se pudieron cargar backups desde BD:', error);
            }
            
            // También cargar desde archivos físicos y combinar
            if (window.electronAPI && window.electronAPI.listarBackupsFisicos) {
                try {
                    const resultadoFisicos = await window.electronAPI.listarBackupsFisicos();
                    if (resultadoFisicos && resultadoFisicos.success && resultadoFisicos.backups) {
                        // Crear un mapa de backups por ruta para evitar duplicados
                        const backupsMap = new Map();
                        
                        // Agregar backups de BD primero
                        backups.forEach(backup => {
                            if (backup.ruta_completa) {
                                backupsMap.set(backup.ruta_completa, backup);
                            }
                        });
                        
                        // Agregar backups físicos que no estén en BD
                        resultadoFisicos.backups.forEach(backupFisico => {
                            if (!backupsMap.has(backupFisico.ruta_completa)) {
                                // Verificar que el archivo existe
                                if (backupFisico.ruta_completa) {
                                    // Agregar como backup sin ID (no está en BD)
                                    backupsMap.set(backupFisico.ruta_completa, {
                                        id: null,
                                        nombre_archivo: backupFisico.nombre_archivo,
                                        ruta_completa: backupFisico.ruta_completa,
                                        fecha_creacion: backupFisico.fecha_creacion,
                                        tamano_bytes: backupFisico.tamano_bytes,
                                        descripcion: backupFisico.descripcion
                                    });
                                }
                            }
                        });
                        
                        // Convertir mapa a array y ordenar por fecha
                        backups = Array.from(backupsMap.values()).sort((a, b) => {
                            return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
                        });
                    }
                } catch (error) {
                    console.warn('No se pudieron cargar backups físicos:', error);
                }
            }
            
            if (!backups || backups.length === 0) {
                container.innerHTML = '<p class="info-message">No hay backups disponibles.</p>';
                return;
            }
            
            let html = '';
            backups.forEach(backup => {
                const fecha = new Date(backup.fecha_creacion);
                const fechaFormato = fecha.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const tamanoMB = backup.tamano_bytes ? (backup.tamano_bytes / (1024 * 1024)).toFixed(2) : 'N/A';
                const descripcion = backup.descripcion ? ` - ${backup.descripcion}` : '';
                
                html += `
                    <div class="backup-item">
                        <div class="backup-info">
                            <div class="backup-fecha">${fechaFormato}</div>
                            <div class="backup-detalles">${backup.nombre_archivo}${descripcion} - ${tamanoMB} MB</div>
                        </div>
                        <button class="btn-restaurar-backup" data-backup-id="${backup.id || ''}" data-backup-ruta="${backup.ruta_completa}">
                            Restaurar
                        </button>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            
            // Event listeners para botones de restaurar
            container.querySelectorAll('.btn-restaurar-backup').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const backupId = e.target.getAttribute('data-backup-id');
                    const backupRuta = e.target.getAttribute('data-backup-ruta');
                    await restaurarBackup(backupId, backupRuta);
                });
            });
        } catch (error) {
            console.error('Error al cargar backups:', error);
            container.innerHTML = '<p class="error-message">Error al cargar backups.</p>';
        }
    }
    
    // Función para mostrar modal de entrada de texto
    function mostrarPromptModal(mensaje, placeholder = '') {
        return new Promise((resolve, reject) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Confirmación Requerida</h3>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px;">${mensaje}</p>
                        <input type="text" id="prompt-input" class="form-input" placeholder="${placeholder}" style="width: 100%; margin-bottom: 15px;" autofocus>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="prompt-cancel">Cancelar</button>
                        <button class="btn btn-primary" id="prompt-confirm">Confirmar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const input = modal.querySelector('#prompt-input');
            const btnConfirm = modal.querySelector('#prompt-confirm');
            const btnCancel = modal.querySelector('#prompt-cancel');
            
            const cleanup = () => {
                document.body.removeChild(modal);
            };
            
            btnConfirm.onclick = () => {
                const valor = input.value.trim();
                cleanup();
                resolve(valor);
            };
            
            btnCancel.onclick = () => {
                cleanup();
                reject(new Error('Operación cancelada'));
            };
            
            // Cerrar al hacer clic fuera del modal
            modal.onclick = (e) => {
                if (e.target === modal) {
                    cleanup();
                    reject(new Error('Operación cancelada'));
                }
            };
            
            // Enter para confirmar, Escape para cancelar
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    btnConfirm.click();
                } else if (e.key === 'Escape') {
                    btnCancel.click();
                }
            };
            
            // Focus en el input
            setTimeout(() => input.focus(), 100);
        });
    }
    
    // Función para mostrar modal de contraseña
    function mostrarPasswordModal(mensaje, username = null) {
        return new Promise((resolve, reject) => {
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>Verificación de Contraseña</h3>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px;">${mensaje}</p>
                        ${username ? `<p style="margin-bottom: 10px; color: var(--text-secondary);">Usuario: <strong>${username}</strong></p>` : ''}
                        ${!username ? `<input type="text" id="password-username" class="form-input" placeholder="Nombre de usuario" style="width: 100%; margin-bottom: 15px;" autofocus>` : ''}
                        <input type="password" id="password-input" class="form-input" placeholder="Contraseña" style="width: 100%; margin-bottom: 15px;" ${username ? 'autofocus' : ''}>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="password-cancel">Cancelar</button>
                        <button class="btn btn-primary" id="password-confirm">Verificar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            const usernameInput = modal.querySelector('#password-username');
            const passwordInput = modal.querySelector('#password-input');
            const btnConfirm = modal.querySelector('#password-confirm');
            const btnCancel = modal.querySelector('#password-cancel');
            
            const cleanup = () => {
                document.body.removeChild(modal);
            };
            
            btnConfirm.onclick = () => {
                const user = username || (usernameInput ? usernameInput.value.trim() : '');
                const pass = passwordInput.value;
                
                if (!user || !pass) {
                    mostrarError('Usuario y contraseña son requeridos');
                    return;
                }
                
                cleanup();
                resolve({ username: user, password: pass });
            };
            
            btnCancel.onclick = () => {
                cleanup();
                reject(new Error('Operación cancelada'));
            };
            
            // Cerrar al hacer clic fuera del modal
            modal.onclick = (e) => {
                if (e.target === modal) {
                    cleanup();
                    reject(new Error('Operación cancelada'));
                }
            };
            
            // Enter para confirmar, Escape para cancelar
            const handleKeydown = (e) => {
                if (e.key === 'Enter') {
                    btnConfirm.click();
                } else if (e.key === 'Escape') {
                    btnCancel.click();
                }
            };
            
            if (usernameInput) {
                usernameInput.onkeydown = handleKeydown;
            }
            passwordInput.onkeydown = handleKeydown;
            
            // Focus en el input
            setTimeout(() => {
                if (usernameInput) {
                    usernameInput.focus();
                } else {
                    passwordInput.focus();
                }
            }, 100);
        });
    }
    
    // Verificar contraseña para operaciones críticas
    async function verificarContraseñaOperacionCritica() {
        try {
            // Obtener username del usuario actual
            const username = localStorage.getItem('currentUsername');
            
            // Mostrar modal de contraseña
            const credenciales = await mostrarPasswordModal(
                'Ingresa tu contraseña para confirmar esta operación crítica:',
                username
            );
            
            // Verificar contraseña usando la API de login
            if (window.electronAPI && window.electronAPI.login) {
                const result = await window.electronAPI.login(credenciales.username, credenciales.password);
                if (result.success) {
                    return true;
                } else {
                    mostrarError('Contraseña incorrecta');
                    throw new Error('Contraseña incorrecta');
                }
            } else {
                throw new Error('API de autenticación no disponible');
            }
        } catch (error) {
            if (error.message !== 'Operación cancelada') {
                mostrarError('Error al verificar contraseña: ' + (error.message || error));
            }
            throw error;
        }
    }
    
    // Restaurar backup
    async function restaurarBackup(backupId, backupRuta) {
        // Pedir confirmación
        let confirmar = false;
        if (typeof window.mostrarConfirmacion === 'function') {
            confirmar = await window.mostrarConfirmacion(
                '¿Estás seguro de que deseas restaurar este backup? Esta acción reemplazará la base de datos actual.',
                'Confirmar Restauración'
            );
        } else {
            // Fallback
            confirmar = window.confirm('¿Estás seguro de que deseas restaurar este backup? Esta acción reemplazará la base de datos actual.');
        }
        if (!confirmar) return;
        
        try {
            // Verificar contraseña
            await verificarContraseñaOperacionCritica();
            
            // Llamar a función de restauración
            if (window.electronAPI && window.electronAPI.restaurarBackup) {
                const resultado = await window.electronAPI.restaurarBackup(backupRuta);
                if (resultado && resultado.success) {
                    mostrarExito('Backup restaurado correctamente. La aplicación se reiniciará.');
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                } else {
                    mostrarError(resultado ? resultado.mensaje : 'Error al restaurar backup');
                }
            } else {
                mostrarError('Función de restauración no disponible.');
            }
        } catch (error) {
            if (error.message !== 'Contraseña no proporcionada' && error.message !== 'Usuario no proporcionado') {
                console.error('Error al restaurar backup:', error);
                mostrarError('Error al restaurar backup: ' + (error.message || error));
            }
        }
    }
    
    // Formatear base de datos
    async function formatearBaseDatos() {
        try {
            // Confirmación doble
            const confirmarTexto = await mostrarPromptModal(
                'Esta acción eliminará TODOS los datos. Escribe "CONFIRMAR" para continuar:',
                'CONFIRMAR'
            );
            
            if (confirmarTexto !== 'CONFIRMAR') {
                mostrarError('Confirmación incorrecta. Operación cancelada.');
                return;
            }
        } catch (error) {
            // Usuario canceló
            return;
        }
        
        try {
            // Verificar contraseña
            await verificarContraseñaOperacionCritica();
            
            // Crear backup antes de formatear
            mostrarExito('Creando backup automático antes de formatear...');
            if (window.electronAPI && window.electronAPI.crearBackup) {
                await window.electronAPI.crearBackup('backup_pre_formateo');
            }
            
            // Formatear base de datos
            if (window.electronAPI && window.electronAPI.formatearBaseDatos) {
                const resultado = await window.electronAPI.formatearBaseDatos();
                if (resultado && resultado.success) {
                    mostrarExito('Base de datos formateada correctamente. La aplicación se reiniciará.');
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                } else {
                    mostrarError(resultado ? resultado.mensaje : 'Error al formatear base de datos');
                }
            } else {
                mostrarError('Función de formateo no disponible.');
            }
        } catch (error) {
            if (error.message !== 'Contraseña no proporcionada' && error.message !== 'Usuario no proporcionado') {
                console.error('Error al formatear base de datos:', error);
                mostrarError('Error al formatear base de datos: ' + (error.message || error));
            }
        }
    }
    
    // Función global para verificar contraseña en operaciones críticas
    // Esta función puede ser llamada desde otros módulos (transacciones, nóminas, reportes)
    window.verificarContraseñaOperacionCritica = verificarContraseñaOperacionCritica;
    
    // Funciones de utilidad para mostrar mensajes
    function mostrarExito(mensaje) {
        if (window.mostrarExito) {
            window.mostrarExito(mensaje);
        } else {
            alert(mensaje);
        }
    }

    function mostrarError(mensaje) {
        if (window.mostrarError) {
            window.mostrarError(mensaje);
        } else {
            alert(mensaje);
        }
    }
    
    // Función para verificar actualizaciones manualmente desde el botón
    async function verificarActualizacionesManual() {
        const btn = document.getElementById('btn-verificar-actualizaciones');
        if (btn) {
            // Deshabilitar el botón mientras se verifica
            btn.disabled = true;
            btn.textContent = '🔍 Buscando...';
        }
        
        try {
            // Llamar a la función global de verificación manual
            if (typeof window.verificarActualizacionesManual === 'function') {
                await window.verificarActualizacionesManual();
            } else {
                console.error('❌ Función verificarActualizacionesManual no está disponible');
                if (typeof window.mostrarNotificacion === 'function') {
                    window.mostrarNotificacion('Error: Sistema de actualizaciones no disponible', 'error', 5000);
                }
            }
        } catch (error) {
            console.error('❌ Error al verificar actualizaciones:', error);
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Error al verificar actualizaciones: ' + error.message, 'error', 5000);
            }
        } finally {
            // Restaurar el botón
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🔍 Buscar Actualizaciones';
            }
        }
    }
})();

