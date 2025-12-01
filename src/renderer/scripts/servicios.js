// Gestión de Servicios - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.serviciosModule) {
        window.serviciosModule = {
            servicios: [],
            servicioEditando: null,
            servicioAEliminar: null,
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var servicios = window.serviciosModule.servicios;
    var servicioEditando = window.serviciosModule.servicioEditando;
    var servicioAEliminar = window.serviciosModule.servicioAEliminar;
    var initialized = window.serviciosModule.initialized;

    // Inicialización - función exportada para ser llamada desde main.js
    window.initServicios = function() {
        console.log('initServicios llamado');
        // Siempre reconfigurar los event listeners porque el DOM se recrea al navegar
        // Pequeño delay para asegurar que el DOM esté completamente cargado
        setTimeout(() => {
            try {
                console.log('Configurando event listeners...');
                setupEventListeners();
                console.log('Cargando servicios...');
                cargarServicios();
                window.serviciosModule.initialized = true;
                console.log('Servicios inicializados correctamente');
            } catch (error) {
                console.error('Error al inicializar servicios:', error);
                const tbody = document.getElementById('servicios-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

    // Event Listeners
    function setupEventListeners() {
        try {
            // Botón nuevo servicio
            const btnNuevo = document.getElementById('btn-nuevo-servicio');
            if (btnNuevo) {
                btnNuevo.onclick = () => {
                    abrirModalNuevo();
                };
            }

            // Cerrar modales
            const closeModal = document.getElementById('close-modal');
            if (closeModal) closeModal.onclick = cerrarModal;
            
            const closeDeleteModal = document.getElementById('close-delete-modal');
            if (closeDeleteModal) closeDeleteModal.onclick = cerrarModalEliminar;
            
            const cancelServicio = document.getElementById('cancel-servicio');
            if (cancelServicio) cancelServicio.onclick = cerrarModal;
            
            const cancelDelete = document.getElementById('cancel-delete');
            if (cancelDelete) cancelDelete.onclick = cerrarModalEliminar;

            // Formulario servicio
            const servicioForm = document.getElementById('servicio-form');
            if (servicioForm) {
                servicioForm.onsubmit = (e) => {
                    e.preventDefault();
                    guardarServicio(e);
                };
            }
            
            // Formatear inputs de precio (esperar a que utils.js esté cargado)
            setTimeout(() => {
                const precioDolares = document.getElementById('servicio-precio-dolares');
                const precioBs = document.getElementById('servicio-precio-bs');
                
                if (precioDolares && typeof formatearInputPrecio === 'function') {
                    // Guardar handlers de cálculo antes de formatear
                    precioDolares._originalBlur = calcularPrecioBs;
                    precioDolares._originalInput = async () => {
                        // Calcular en tiempo real mientras escribe
                        await calcularPrecioBs();
                    };
                    // Aplicar formateo (que preservará los handlers originales)
                    formatearInputPrecio(precioDolares);
                }
                // precioBs es readonly, no necesita formateo
            }, 200);

            // Búsqueda
            const searchServicio = document.getElementById('search-servicio');
            if (searchServicio) {
                searchServicio.oninput = filtrarServicios;
            }

            // Confirmar eliminación
            const confirmDelete = document.getElementById('confirm-delete');
            if (confirmDelete) {
                confirmDelete.onclick = eliminarServicioConfirmado;
            }

            // Cerrar modal al hacer clic fuera - SOLO en el fondo, no en el contenido
            const servicioModal = document.getElementById('servicio-modal');
            if (servicioModal) {
                // Remover listener anterior si existe
                servicioModal.onclick = null;
                // Agregar nuevo listener que solo cierra si se hace clic en el fondo
                servicioModal.onclick = (e) => {
                    // Solo cerrar si el clic fue directamente en el modal (fondo), no en ningún hijo
                    if (e.target === e.currentTarget) {
                        cerrarModal();
                    }
                };
            }

            const deleteModal = document.getElementById('delete-modal');
            if (deleteModal) {
                deleteModal.onclick = (e) => {
                    if (e.target.id === 'delete-modal') {
                        cerrarModalEliminar();
                    }
                };
            }
        } catch (error) {
            console.error('Error al configurar event listeners:', error);
        }
    }

    // Cargar servicios desde la base de datos
    async function cargarServicios() {
        try {
            console.log('Iniciando carga de servicios...');
            const tbody = document.getElementById('servicios-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading">Cargando servicios...</td></tr>';
            }
            
            // Verificar que electronAPI esté disponible
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            console.log('Consultando base de datos...');
            // Ordenar alfabéticamente por nombre
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Servicios ORDER BY nombre ASC');
            console.log('Servicios obtenidos:', resultados);
            
            window.serviciosModule.servicios = resultados || [];
            // Actualizar referencia local
            servicios.length = 0;
            if (window.serviciosModule.servicios.length > 0) {
                servicios.push(...window.serviciosModule.servicios);
            }
            mostrarServicios(servicios);
        } catch (error) {
            console.error('Error al cargar servicios:', error);
            const tbody = document.getElementById('servicios-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="error-message">Error al cargar los servicios: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar los servicios: ' + (error.message || error));
        }
    }

    // Mostrar servicios en la tabla
    function mostrarServicios(listaServicios) {
        const tbody = document.getElementById('servicios-table-body');
        
        if (!tbody) return;
        
        if (listaServicios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay servicios registrados</td></tr>';
            return;
        }

        tbody.innerHTML = listaServicios.map((servicio, index) => {
            const descripcion = servicio.descripcion || '-';
            
            return `
                <tr>
                    <td>#${index + 1}</td>
                    <td>${servicio.nombre}</td>
                    <td>${descripcion}</td>
                    <td>$${parseFloat(servicio.referencia_en_dolares).toFixed(2)}</td>
                    <td>${servicio.precio_bs ? parseFloat(servicio.precio_bs).toFixed(2) + ' Bs' : 'N/A'}</td>
                    <td class="actions">
                        <button class="btn-icon btn-edit" onclick="window.editarServicio(${servicio.id})" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="window.eliminarServicio(${servicio.id})" title="Eliminar">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Exponer función para uso externo
    window.mostrarServicios = mostrarServicios;

    // Filtrar servicios
    function filtrarServicios() {
        const searchTerm = document.getElementById('search-servicio').value.toLowerCase();

        let serviciosFiltrados = servicios;

        // Filtrar por búsqueda
        if (searchTerm) {
            serviciosFiltrados = serviciosFiltrados.filter(servicio => {
                const nombre = servicio.nombre.toLowerCase();
                const descripcion = (servicio.descripcion || '').toLowerCase();
                return nombre.includes(searchTerm) || descripcion.includes(searchTerm);
            });
        }

        mostrarServicios(serviciosFiltrados);
    }

    // Abrir modal para nuevo servicio
    async function abrirModalNuevo() {
        servicioEditando = null;
        document.getElementById('modal-title').textContent = 'Nuevo Servicio';
        document.getElementById('servicio-form').reset();
        document.getElementById('servicio-id').value = '';
        
        // Obtener referencias a los campos y asegurar que sean editables
        const nombreInput = document.getElementById('servicio-nombre');
        const descripcionInput = document.getElementById('servicio-descripcion');
        const precioDolaresInput = document.getElementById('servicio-precio-dolares');
        
        if (nombreInput) {
            nombreInput.disabled = false;
            nombreInput.removeAttribute('readonly');
            nombreInput.style.pointerEvents = 'auto';
            nombreInput.style.cursor = 'text';
        }
        if (descripcionInput) {
            descripcionInput.disabled = false;
            descripcionInput.removeAttribute('readonly');
            descripcionInput.style.pointerEvents = 'auto';
            descripcionInput.style.cursor = 'text';
        }
        if (precioDolaresInput) {
            precioDolaresInput.disabled = false;
            precioDolaresInput.removeAttribute('readonly');
            precioDolaresInput.style.pointerEvents = 'auto';
            precioDolaresInput.style.cursor = 'text';
            
            // Guardar handlers de cálculo
            precioDolaresInput._originalBlur = calcularPrecioBs;
            precioDolaresInput._originalInput = async () => {
                await calcularPrecioBs();
            };
        }
        
        // Aplicar formateo
        if (typeof formatearInputPrecio === 'function' && precioDolaresInput) {
            formatearInputPrecio(precioDolaresInput);
        }
        
        // Calcular precio en Bs automáticamente
        await calcularPrecioBs();
        
        document.getElementById('servicio-modal').classList.add('active');
        
        // Focus en el primer campo
        setTimeout(() => {
            if (nombreInput) nombreInput.focus();
        }, 100);
    }
    
    // Calcular precio en Bs según la tasa del día
    async function calcularPrecioBs() {
        try {
            const precioDolaresInput = document.getElementById('servicio-precio-dolares');
            const precioBsInput = document.getElementById('servicio-precio-bs');
            
            if (!precioDolaresInput || !precioBsInput) return;
            
            const precioDolares = obtenerValorNumerico ? obtenerValorNumerico(precioDolaresInput) : parseFloat(precioDolaresInput.value) || 0;
            
            if (precioDolares > 0) {
                // Obtener tasa del día actual
                const hoy = new Date();
                const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
                
                const tasaHoy = await window.electronAPI.dbGet(
                    'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                    [fechaHoy]
                );
                
                if (tasaHoy) {
                    const precioBs = precioDolares * tasaHoy.tasa_bs_por_dolar;
                    precioBsInput.value = typeof formatearDecimales === 'function' 
                        ? formatearDecimales(precioBs) 
                        : precioBs.toFixed(2);
                } else {
                    precioBsInput.value = 'No disponible';
                    precioBsInput.placeholder = 'Establece la tasa del día primero';
                }
            } else {
                precioBsInput.value = '';
            }
        } catch (error) {
            console.error('Error al calcular precio en Bs:', error);
        }
    }

    // Editar servicio
    window.editarServicio = async function(id) {
        try {
            const servicio = await window.electronAPI.dbGet('SELECT * FROM Servicios WHERE id = ?', [id]);
            
            if (!servicio) {
                mostrarError('Servicio no encontrado');
                return;
            }

            servicioEditando = servicio;
            document.getElementById('modal-title').textContent = 'Editar Servicio';
            document.getElementById('servicio-id').value = servicio.id;
            
            // Obtener referencias a los campos
            const nombreInput = document.getElementById('servicio-nombre');
            const descripcionInput = document.getElementById('servicio-descripcion');
            const precioDolaresInput = document.getElementById('servicio-precio-dolares');
            const precioBsInput = document.getElementById('servicio-precio-bs');
            
            if (!nombreInput || !precioDolaresInput) {
                mostrarError('Error: Campos del formulario no encontrados');
                return;
            }
            
            // Asegurar que los campos estén habilitados (excepto precioBs que es readonly)
            nombreInput.disabled = false;
            descripcionInput.disabled = false;
            precioDolaresInput.disabled = false;
            
            // Remover atributo readonly si existe (excepto precioBs)
            nombreInput.removeAttribute('readonly');
            descripcionInput.removeAttribute('readonly');
            precioDolaresInput.removeAttribute('readonly');
            
            // Resetear flags de formateo para permitir re-aplicar
            precioDolaresInput._formateadoPrecio = false;
            precioDolaresInput._originalBlurSaved = false;
            precioDolaresInput._originalInputSaved = false;
            
            // Llenar los campos con los valores
            nombreInput.value = servicio.nombre;
            descripcionInput.value = servicio.descripcion || '';
            // Formatear precio en dólares a 2 decimales
            precioDolaresInput.value = typeof formatearDecimales === 'function' 
                ? formatearDecimales(servicio.referencia_en_dolares) 
                : parseFloat(servicio.referencia_en_dolares).toFixed(2);
            
            // Asegurar que los campos sean completamente interactivos ANTES de aplicar formateo
            nombreInput.style.pointerEvents = 'auto';
            nombreInput.style.cursor = 'text';
            descripcionInput.style.pointerEvents = 'auto';
            descripcionInput.style.cursor = 'text';
            precioDolaresInput.style.pointerEvents = 'auto';
            precioDolaresInput.style.cursor = 'text';
            
            // Guardar handlers de cálculo ANTES de formatear
            precioDolaresInput._originalBlur = calcularPrecioBs;
            precioDolaresInput._originalInput = async () => {
                await calcularPrecioBs();
            };
            
            // Re-aplicar formateo a los inputs
            if (typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(precioDolaresInput);
            }
            
            // Calcular precio en Bs automáticamente
            await calcularPrecioBs();

            document.getElementById('servicio-modal').classList.add('active');
            
            // Pequeño delay para asegurar que el DOM esté actualizado
            setTimeout(() => {
                // Forzar focus y selección para verificar que es editable
                nombreInput.focus();
                nombreInput.select();
                
                // Verificación adicional: intentar escribir en el campo
                console.log('Campo nombre editable:', !nombreInput.disabled && !nombreInput.readOnly && nombreInput.style.pointerEvents !== 'none');
                console.log('Campo descripción editable:', !descripcionInput.disabled && !descripcionInput.readOnly && descripcionInput.style.pointerEvents !== 'none');
                console.log('Campo precio editable:', !precioDolaresInput.disabled && !precioDolaresInput.readOnly && precioDolaresInput.style.pointerEvents !== 'none');
            }, 150);
        } catch (error) {
            console.error('Error al cargar servicio:', error);
            mostrarError('Error al cargar el servicio');
        }
    };

    // Guardar servicio
    async function guardarServicio(e) {
        e.preventDefault();

        const id = document.getElementById('servicio-id').value;
        const nombre = document.getElementById('servicio-nombre').value.trim();
        const descripcion = document.getElementById('servicio-descripcion').value.trim();
        
        // Obtener valores numéricos formateados
        const precioDolaresInput = document.getElementById('servicio-precio-dolares');
        const precioBsInput = document.getElementById('servicio-precio-bs');
        
        const precioDolares = obtenerValorNumerico ? obtenerValorNumerico(precioDolaresInput) : parseFloat(precioDolaresInput.value) || 0;
        
        // Calcular precio_bs automáticamente si no está disponible
        let precioBs = null;
        if (precioBsInput.value && precioBsInput.value !== 'No disponible' && precioBsInput.value !== '') {
            precioBs = obtenerValorNumerico ? obtenerValorNumerico(precioBsInput) : parseFloat(precioBsInput.value);
        } else {
            // Calcular según la tasa del día
            const hoy = new Date();
            const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
            const tasaHoy = await window.electronAPI.dbGet(
                'SELECT * FROM TasasCambio WHERE fecha = ?',
                [fechaHoy]
            );
            if (tasaHoy && precioDolares > 0) {
                precioBs = precioDolares * tasaHoy.tasa_bs_por_dolar;
            }
        }

        if (!nombre) {
            mostrarError('El nombre es requerido');
            return;
        }

        try {
            // Si precioBs es null, calcularlo según la tasa del día
            if (precioBs === null || precioBs === undefined) {
                const hoy = new Date();
                const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
                const tasaHoy = await window.electronAPI.dbGet(
                    'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                    [fechaHoy]
                );
                if (tasaHoy && precioDolares > 0) {
                    precioBs = precioDolares * tasaHoy.tasa_bs_por_dolar;
                } else {
                    mostrarError('No hay tasa de cambio establecida para hoy. Por favor, establece la tasa del día primero.');
                    return;
                }
            }
            
            if (id) {
                // Actualizar
                await window.electronAPI.dbRun(
                    'UPDATE Servicios SET nombre = ?, descripcion = ?, referencia_en_dolares = ?, precio_bs = ? WHERE id = ?',
                    [nombre, descripcion || null, precioDolares, precioBs, id]
                );
            } else {
                // Crear nuevo
                await window.electronAPI.dbRun(
                    'INSERT INTO Servicios (nombre, descripcion, referencia_en_dolares, precio_bs) VALUES (?, ?, ?, ?)',
                    [nombre, descripcion || null, precioDolares, precioBs]
                );
            }

            cerrarModal();
            cargarServicios();
            mostrarExito(id ? 'Servicio actualizado correctamente' : 'Servicio creado correctamente');
        } catch (error) {
            console.error('Error al guardar servicio:', error);
            mostrarError('Error al guardar el servicio: ' + (error.message || 'Error desconocido'));
        }
    }

    // Eliminar servicio
    window.eliminarServicio = function(id) {
        servicioAEliminar = id;
        document.getElementById('delete-modal').classList.add('active');
    };

    // Confirmar eliminación
    async function eliminarServicioConfirmado() {
        if (!servicioAEliminar) return;

        try {
            await window.electronAPI.dbRun('DELETE FROM Servicios WHERE id = ?', [servicioAEliminar]);
            cerrarModalEliminar();
            cargarServicios();
            mostrarExito('Servicio eliminado correctamente');
            servicioAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar servicio:', error);
            mostrarError('Error al eliminar el servicio. Puede que tenga transacciones asociadas.');
            servicioAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModal() {
        document.getElementById('servicio-modal').classList.remove('active');
        servicioEditando = null;
        
        // Resetear flags de formateo para permitir re-aplicar en la próxima apertura
        const precioDolares = document.getElementById('servicio-precio-dolares');
        if (precioDolares) {
            precioDolares._formateadoPrecio = false;
            precioDolares._originalBlurSaved = false;
            precioDolares._originalInputSaved = false;
        }
    }

    function cerrarModalEliminar() {
        document.getElementById('delete-modal').classList.remove('active');
        servicioAEliminar = null;
    }

    // Mostrar mensajes
    function mostrarError(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Error: ' + mensaje, 'error', 5000);
        } else {
            console.error('Error: ' + mensaje);
        }
    }

    function mostrarExito(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Éxito: ' + mensaje, 'success', 3000);
        } else {
            console.log('Éxito: ' + mensaje);
        }
    }
})();

