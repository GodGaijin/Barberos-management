// Gestión de Tasas de Cambio - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.tasasModule) {
        window.tasasModule = {
            tasas: [],
            tasaEditando: null,
            tasaAEliminar: null,
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var tasas = window.tasasModule.tasas;
    var tasaEditando = window.tasasModule.tasaEditando;
    var tasaAEliminar = window.tasasModule.tasaAEliminar;
    var initialized = window.tasasModule.initialized;

    // Inicialización - función exportada para ser llamada desde main.js
    // Inicializa el módulo de tasas cuando se carga la página
    window.initTasas = function() {
        // Verificar que estamos en la página de tasas
        const tbody = document.getElementById('tasas-table-body');
        if (!tbody) {
            return;
        }
        
        // Siempre reconfigurar los event listeners porque el DOM se recrea al navegar
        // Pequeño delay para asegurar que el DOM esté completamente cargado
        setTimeout(() => {
            try {
                setupEventListeners();
                cargarTasas();
                actualizarTasaActual();
                window.tasasModule.initialized = true;
                console.log('✅ Módulo de tasas inicializado correctamente');
            } catch (error) {
                console.error('❌ Error al inicializar tasas:', error);
                const tbody = document.getElementById('tasas-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="4" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

    // No auto-inicializar - main.js se encarga de la inicialización cuando se navega a la página

    // Event Listeners
    function setupEventListeners() {
        // Remover listeners anteriores si existen (clonar elementos para limpiar)
        const btnNuevaTasa = document.getElementById('btn-nueva-tasa');
        const btnTasaHoy = document.getElementById('btn-tasa-hoy');
        const closeModal = document.getElementById('close-modal');
        const closeDeleteModal = document.getElementById('close-delete-modal');
        const cancelTasa = document.getElementById('cancel-tasa');
        const cancelDelete = document.getElementById('cancel-delete');
        const tasaForm = document.getElementById('tasa-form');
        const searchFecha = document.getElementById('search-fecha');
        const confirmDelete = document.getElementById('confirm-delete');
        const tasaModal = document.getElementById('tasa-modal');
        const deleteModal = document.getElementById('delete-modal');

        if (!btnNuevaTasa || !btnTasaHoy || !tasaForm) {
            console.error('Elementos necesarios no encontrados en setupEventListeners');
            return;
        }

        // Botón nueva tasa
        btnNuevaTasa.onclick = () => {
            abrirModalNuevo();
        };

        // Botón tasa de hoy
        btnTasaHoy.onclick = () => {
            establecerTasaHoy();
        };

        // Cerrar modales
        if (closeModal) closeModal.onclick = cerrarModal;
        if (closeDeleteModal) closeDeleteModal.onclick = cerrarModalEliminar;
        if (cancelTasa) cancelTasa.onclick = cerrarModal;
        if (cancelDelete) cancelDelete.onclick = cerrarModalEliminar;

        // Formulario tasa
        tasaForm.onsubmit = (e) => {
            e.preventDefault();
            guardarTasa(e);
        };
        
        // Formatear input de tasa (esperar a que utils.js esté cargado)
        setTimeout(() => {
            const tasaValor = document.getElementById('tasa-valor');
            if (tasaValor && typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(tasaValor);
            }
        }, 200);

        // Búsqueda por fecha
        if (searchFecha) {
            searchFecha.onchange = filtrarTasas;
        }

        // Confirmar eliminación
        if (confirmDelete) {
            confirmDelete.onclick = eliminarTasaConfirmado;
        }

        // Cerrar modal al hacer clic fuera - SOLO en el fondo, no en el contenido
        if (tasaModal) {
            // Remover listener anterior si existe
            tasaModal.onclick = null;
            // Agregar nuevo listener que solo cierra si se hace clic en el fondo
            tasaModal.onclick = (e) => {
                // Solo cerrar si el clic fue directamente en el modal (fondo), no en ningún hijo
                if (e.target === e.currentTarget) {
                    cerrarModal();
                }
            };
        }

        if (deleteModal) {
            deleteModal.onclick = (e) => {
                if (e.target.id === 'delete-modal') {
                    cerrarModalEliminar();
                }
            };
        }
    }

    // Cargar tasas desde la base de datos
    async function cargarTasas() {
        try {
            // Verificar que estamos en la página de tasas
            const tbody = document.getElementById('tasas-table-body');
            if (!tbody) {
                console.warn('cargarTasas: tbody no encontrado. No estamos en la página de tasas.');
                return;
            }
            
            console.log('Iniciando carga de tasas...');
            tbody.innerHTML = '<tr><td colspan="4" class="loading">Cargando tasas...</td></tr>';
            
            // Verificar que electronAPI esté disponible
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            // Consultar todas las tasas ordenadas por ID descendente (más recientes primero)
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM TasasCambio ORDER BY id DESC');
            
            console.log(`💱 Tasas cargadas: ${resultados?.length || 0} registros`);
            
            window.tasasModule.tasas = resultados || [];
            // Actualizar referencia local
            tasas.length = 0;
            if (window.tasasModule.tasas.length > 0) {
                tasas.push(...window.tasasModule.tasas);
            }
            mostrarTasas(tasas);
            actualizarTasaActual();
        } catch (error) {
            console.error('Error al cargar tasas:', error);
            const tbody = document.getElementById('tasas-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" class="error-message">Error al cargar las tasas: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar las tasas: ' + (error.message || error));
        }
    }

    // Mostrar tasas en la tabla
    function mostrarTasas(listaTasas) {
        const tbody = document.getElementById('tasas-table-body');
        
        if (!tbody) {
            console.warn('mostrarTasas: tbody no encontrado. No estamos en la página de tasas.');
            return;
        }
        
        if (listaTasas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay tasas registradas</td></tr>';
            return;
        }

        tbody.innerHTML = listaTasas.map((tasa, index) => {
            // Convertir fecha de formato "DD/MM/YYYY" a formato legible
            const fechaFormateada = formatearFecha(tasa.fecha);
            const esHoy = esFechaHoy(tasa.fecha);
            
            // Asegurar que la función esté disponible
            const editarFunc = typeof window.editarTasa === 'function' ? 'window.editarTasa' : 'null';
            const eliminarFunc = typeof window.eliminarTasa === 'function' ? 'window.eliminarTasa' : 'null';
            
            return `
                <tr ${esHoy ? 'class="tasa-hoy"' : ''}>
                    <td>#${index + 1}</td>
                    <td>${fechaFormateada} ${esHoy ? '<span class="badge-hoy">HOY</span>' : ''}</td>
                    <td>${parseFloat(tasa.tasa_bs_por_dolar).toFixed(2)} Bs</td>
                    <td class="actions">
                        <button class="btn-icon btn-edit" onclick="if(${editarFunc}) ${editarFunc}(${tasa.id})" title="Editar" data-tasa-id="${tasa.id}">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="if(${eliminarFunc}) ${eliminarFunc}(${tasa.id})" title="Eliminar" data-tasa-id="${tasa.id}">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Agregar event listeners después de renderizar (método alternativo)
        setTimeout(() => {
            const editButtons = tbody.querySelectorAll('.btn-edit[data-tasa-id]');
            editButtons.forEach(btn => {
                const tasaId = btn.getAttribute('data-tasa-id');
                btn.onclick = () => {
                    if (window.editarTasa) {
                        window.editarTasa(parseInt(tasaId));
                    } else {
                        console.error('window.editarTasa no está disponible');
                        if (typeof window.mostrarNotificacion === 'function') {
                            window.mostrarNotificacion('Error: Función de edición no disponible. Por favor, recarga la página.', 'error', 5000);
                        } else {
                            console.error('Error: Función de edición no disponible');
                        }
                    }
                };
            });
            
            const deleteButtons = tbody.querySelectorAll('.btn-delete[data-tasa-id]');
            deleteButtons.forEach(btn => {
                const tasaId = btn.getAttribute('data-tasa-id');
                btn.onclick = () => {
                    if (window.eliminarTasa) {
                        window.eliminarTasa(parseInt(tasaId));
                    } else {
                        console.error('window.eliminarTasa no está disponible');
                        if (typeof window.mostrarNotificacion === 'function') {
                            window.mostrarNotificacion('Error: Función de eliminación no disponible. Por favor, recarga la página.', 'error', 5000);
                        } else {
                            console.error('Error: Función de eliminación no disponible');
                        }
                    }
                };
            });
        }, 100);
    }

    // Formatear fecha de "DD/MM/YYYY" a formato legible
    function formatearFecha(fechaStr) {
        // Si la fecha está en formato "DD/MM/YYYY"
        if (fechaStr.includes('/')) {
            return fechaStr;
        }
        // Si está en formato ISO (YYYY-MM-DD), convertir
        if (fechaStr.includes('-')) {
            const [year, month, day] = fechaStr.split('-');
            return `${day}/${month}/${year}`;
        }
        return fechaStr;
    }

    // Verificar si una fecha es hoy
    function esFechaHoy(fechaStr) {
        const hoy = new Date();
        const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
        
        // Convertir fechaStr a formato DD/MM/YYYY si está en formato ISO
        let fechaComparar = fechaStr;
        if (fechaStr.includes('-')) {
            const [year, month, day] = fechaStr.split('-');
            fechaComparar = `${day}/${month}/${year}`;
        }
        
        return fechaComparar === fechaHoy;
    }

    // Actualizar tasa actual del día (la más reciente)
    async function actualizarTasaActual() {
        try {
            const fechaElement = document.getElementById('tasa-actual-fecha');
            const valorElement = document.getElementById('tasa-actual-valor');
            
            // Verificar que los elementos existan (solo si estamos en la página de tasas)
            if (!fechaElement || !valorElement) {
                // No estamos en la página de tasas, salir silenciosamente
                return;
            }
            
            const hoy = new Date();
            const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
            
            // Buscar la tasa más reciente de hoy (ordenada por ID descendente)
            const tasaHoy = await window.electronAPI.dbGet(
                'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                [fechaHoy]
            );
            
            if (tasaHoy) {
                fechaElement.textContent = fechaHoy;
                valorElement.textContent = parseFloat(tasaHoy.tasa_bs_por_dolar).toFixed(2);
            } else {
                fechaElement.textContent = 'No establecida';
                valorElement.textContent = '-';
            }
        } catch (error) {
            console.error('Error al actualizar tasa actual:', error);
        }
    }

    // Establecer tasa de hoy
    async function establecerTasaHoy() {
        try {
            console.log('Estableciendo tasa de hoy...');
            const hoy = new Date();
            const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
            // Usar función auxiliar para obtener fecha local en formato YYYY-MM-DD
            const fechaHoyISO = window.obtenerFechaLocalInput ? window.obtenerFechaLocalInput() : hoy.toISOString().split('T')[0];
            
            console.log('Buscando tasa más reciente para fecha:', fechaHoy);
            // Obtener la tasa más reciente de hoy (si existe)
            const tasaMasReciente = await window.electronAPI.dbGet(
                'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                [fechaHoy]
            );
            
            console.log('Tasa más reciente:', tasaMasReciente);
            
            const modalTitle = document.getElementById('modal-title');
            const tasaId = document.getElementById('tasa-id');
            const tasaFecha = document.getElementById('tasa-fecha');
            const tasaValor = document.getElementById('tasa-valor');
            const tasaModal = document.getElementById('tasa-modal');
            
            if (!modalTitle || !tasaId || !tasaFecha || !tasaValor || !tasaModal) {
                console.error('Elementos del modal no encontrados');
                mostrarError('Error al abrir el modal');
                return;
            }
            
            // Siempre abrir modal para crear nueva tasa (se permiten múltiples por día)
            console.log('Creando nueva tasa para hoy');
            abrirModalNuevo();
            tasaFecha.value = fechaHoyISO;
            tasaFecha.disabled = true; // Bloquear fecha (ya está establecida)
            
            // Si hay una tasa reciente, sugerir su valor
            if (tasaMasReciente) {
                tasaValor.value = typeof formatearDecimales === 'function' 
                    ? formatearDecimales(tasaMasReciente.tasa_bs_por_dolar) 
                    : parseFloat(tasaMasReciente.tasa_bs_por_dolar).toFixed(2);
            }
        } catch (error) {
            console.error('Error al establecer tasa de hoy:', error);
            mostrarError('Error al establecer la tasa de hoy: ' + (error.message || error));
        }
    }

    // Filtrar tasas
    function filtrarTasas() {
        const fechaBusqueda = document.getElementById('search-fecha').value;
        
        if (!fechaBusqueda) {
            mostrarTasas(tasas);
            return;
        }
        
        // Convertir fecha ISO (YYYY-MM-DD) a formato DD/MM/YYYY
        const [year, month, day] = fechaBusqueda.split('-');
        const fechaFormato = `${day}/${month}/${year}`;
        
        const tasasFiltradas = tasas.filter(tasa => {
            // Comparar fechas en ambos formatos
            return tasa.fecha === fechaFormato || tasa.fecha === fechaBusqueda;
        });
        
        mostrarTasas(tasasFiltradas);
    }

    // Abrir modal para nueva tasa
    function abrirModalNuevo() {
        tasaEditando = null;
        window.tasasModule.tasaEditando = null;
        document.getElementById('modal-title').textContent = 'Nueva Tasa de Cambio';
        document.getElementById('tasa-form').reset();
        document.getElementById('tasa-id').value = '';
        
        // Obtener referencias a los campos y asegurar que sean editables
        const tasaFecha = document.getElementById('tasa-fecha');
        const tasaValor = document.getElementById('tasa-valor');
        
        if (tasaFecha) {
            tasaFecha.disabled = false;
            tasaFecha.removeAttribute('readonly');
            tasaFecha.style.pointerEvents = 'auto';
            tasaFecha.style.cursor = 'pointer';
        }
        
        if (tasaValor) {
            tasaValor.disabled = false;
            tasaValor.removeAttribute('readonly');
            tasaValor.style.pointerEvents = 'auto';
            tasaValor.style.cursor = 'text';
            tasaValor._formateadoPrecio = false;
            tasaValor._originalBlurSaved = false;
            tasaValor._originalInputSaved = false;
            
            // Aplicar formateo
            if (typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(tasaValor);
            }
        }
        
        document.getElementById('tasa-modal').classList.add('active');
        
        // Focus en el campo de valor
        setTimeout(() => {
            if (tasaValor) tasaValor.focus();
        }, 100);
    }

    // Editar tasa
    window.editarTasa = async function(id) {
        try {
            console.log('Editando tasa con ID:', id);
            const tasa = await window.electronAPI.dbGet('SELECT * FROM TasasCambio WHERE id = ?', [id]);
            
            if (!tasa) {
                mostrarError('Tasa no encontrada');
                return;
            }

            console.log('Tasa encontrada:', tasa);
            tasaEditando = tasa;
            window.tasasModule.tasaEditando = tasa;
            
            const modalTitle = document.getElementById('modal-title');
            const tasaId = document.getElementById('tasa-id');
            const tasaFecha = document.getElementById('tasa-fecha');
            const tasaValor = document.getElementById('tasa-valor');
            
            if (!modalTitle || !tasaId || !tasaFecha || !tasaValor) {
                console.error('Elementos del modal no encontrados');
                mostrarError('Error al abrir el modal de edición');
                return;
            }
            
            modalTitle.textContent = 'Editar Tasa de Cambio';
            tasaId.value = tasa.id;
            
            // Asegurar que los campos estén habilitados y sean completamente interactivos
            tasaFecha.disabled = false;
            tasaValor.disabled = false;
            
            // Remover atributo readonly si existe
            tasaFecha.removeAttribute('readonly');
            tasaValor.removeAttribute('readonly');
            
            // Asegurar estilos inline para garantizar interactividad
            tasaFecha.style.pointerEvents = 'auto';
            tasaFecha.style.cursor = 'pointer';
            tasaValor.style.pointerEvents = 'auto';
            tasaValor.style.cursor = 'text';
            
            // Resetear flags de formateo
            tasaValor._formateadoPrecio = false;
            tasaValor._originalBlurSaved = false;
            tasaValor._originalInputSaved = false;
            
            // Convertir fecha DD/MM/YYYY a formato ISO para input date
            let fechaISO = tasa.fecha;
            if (tasa.fecha.includes('/')) {
                const [day, month, year] = tasa.fecha.split('/');
                fechaISO = `${year}-${month}-${day}`;
            }
            
            tasaFecha.value = fechaISO;
            // Formatear tasa a 2 decimales
            tasaValor.value = typeof formatearDecimales === 'function' 
                ? formatearDecimales(tasa.tasa_bs_por_dolar) 
                : parseFloat(tasa.tasa_bs_por_dolar).toFixed(2);
            
            // Aplicar formateo
            if (typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(tasaValor);
            }

            const tasaModal = document.getElementById('tasa-modal');
            if (tasaModal) {
                tasaModal.classList.add('active');
                
                // Pequeño delay para asegurar que el DOM esté actualizado
                setTimeout(() => {
                    // Forzar focus y selección para verificar que es editable
                    tasaValor.focus();
                    tasaValor.select();
                }, 150);
            } else {
                console.error('Modal no encontrado');
                mostrarError('Error al abrir el modal');
            }
        } catch (error) {
            console.error('Error al cargar tasa:', error);
            mostrarError('Error al cargar la tasa: ' + (error.message || error));
        }
    };

    // Guardar tasa
    async function guardarTasa(e) {
        e.preventDefault();

        const id = document.getElementById('tasa-id').value;
        const fechaISO = document.getElementById('tasa-fecha').value;
        
        // Obtener valor numérico formateado
        const tasaValorInput = document.getElementById('tasa-valor');
        const tasaValor = obtenerValorNumerico ? obtenerValorNumerico(tasaValorInput) : parseFloat(tasaValorInput.value) || 0;

        if (!fechaISO) {
            mostrarError('La fecha es requerida');
            return;
        }

        if (tasaValor <= 0) {
            mostrarError('La tasa debe ser mayor a 0');
            return;
        }

        // Convertir fecha ISO (YYYY-MM-DD) a formato DD/MM/YYYY
        const [year, month, day] = fechaISO.split('-');
        const fechaFormato = `${day}/${month}/${year}`;

        try {
            if (id) {
                // Actualizar
                await window.electronAPI.dbRun(
                    'UPDATE TasasCambio SET fecha = ?, tasa_bs_por_dolar = ? WHERE id = ?',
                    [fechaFormato, tasaValor, id]
                );
            } else {
                // Crear nuevo (se permiten múltiples tasas por día)
                await window.electronAPI.dbRun(
                    'INSERT INTO TasasCambio (fecha, tasa_bs_por_dolar) VALUES (?, ?)',
                    [fechaFormato, tasaValor]
                );
            }

            cerrarModal();
            // Recargar tasas y actualizar tasa actual
            await cargarTasas();
            await actualizarTasaActual();
            
            // Si la tasa guardada es para hoy, actualizar precios de productos
            const hoy = new Date();
            const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
            
            if (fechaFormato === fechaHoy) {
                console.log('Tasa del día actualizada, recalculando precios de productos...');
                await actualizarPreciosProductos(tasaValor);
                await actualizarPreciosServicios(tasaValor);
                await actualizarProductosEnConsumos();
                await actualizarPreciosConsumosPendientes(tasaValor);
            }
            
            mostrarExito(id ? 'Tasa actualizada correctamente' : 'Tasa creada correctamente');
        } catch (error) {
            console.error('Error al guardar tasa:', error);
            mostrarError('Error al guardar la tasa: ' + (error.message || 'Error desconocido'));
        }
    }
    
    // Actualizar precios en bolívares de todos los productos
    async function actualizarPreciosProductos(tasa) {
        try {
            // Obtener todos los productos
            const productos = await window.electronAPI.dbQuery('SELECT * FROM Productos ORDER BY nombre ASC');
            
            if (!productos || productos.length === 0) {
                console.log('No hay productos para actualizar');
                return;
            }
            
            console.log(`Actualizando precios de ${productos.length} productos con tasa ${tasa}...`);
            
            // Actualizar cada producto
            for (const producto of productos) {
                if (producto.referencia_en_dolares && producto.referencia_en_dolares > 0) {
                    const nuevoPrecioBs = producto.referencia_en_dolares * tasa;
                    await window.electronAPI.dbRun(
                        'UPDATE Productos SET precio_bs = ? WHERE id = ?',
                        [nuevoPrecioBs, producto.id]
                    );
                }
            }
            
            console.log('Precios de productos actualizados correctamente');
            
            // Si el módulo de productos está cargado, recargar la tabla
            if (window.productosModule && window.productosModule.initialized) {
                // Recargar productos para mostrar los nuevos precios
                setTimeout(async () => {
                    try {
                        const productos = await window.electronAPI.dbQuery('SELECT * FROM Productos ORDER BY nombre ASC');
                        window.productosModule.productos = productos;
                        
                        // Actualizar la tabla si está visible usando la función expuesta
                        if (typeof window.mostrarProductos === 'function') {
                            window.mostrarProductos(productos);
                        } else if (typeof window.initProductos === 'function') {
                            // Si mostrarProductos no está disponible, recargar completamente
                            window.initProductos();
                        }
                    } catch (error) {
                        console.error('Error al recargar productos:', error);
                    }
                }, 300);
            }
        } catch (error) {
            console.error('Error al actualizar precios de productos:', error);
            // No mostrar error al usuario, solo loguear
        }
    }
    
    // Actualizar precios en bolívares de todos los servicios
    async function actualizarPreciosServicios(tasa) {
        try {
            // Obtener todos los servicios
            const servicios = await window.electronAPI.dbQuery('SELECT * FROM Servicios ORDER BY nombre ASC');
            
            if (!servicios || servicios.length === 0) {
                console.log('No hay servicios para actualizar');
                return;
            }
            
            console.log(`Actualizando precios de ${servicios.length} servicios con tasa ${tasa}...`);
            
            // Actualizar cada servicio
            for (const servicio of servicios) {
                if (servicio.referencia_en_dolares && servicio.referencia_en_dolares > 0) {
                    const nuevoPrecioBs = servicio.referencia_en_dolares * tasa;
                    await window.electronAPI.dbRun(
                        'UPDATE Servicios SET precio_bs = ? WHERE id = ?',
                        [nuevoPrecioBs, servicio.id]
                    );
                }
            }
            
            console.log('Precios de servicios actualizados correctamente');
            
            // Si el módulo de servicios está cargado, recargar la tabla
            if (window.serviciosModule && window.serviciosModule.initialized) {
                // Recargar servicios para mostrar los nuevos precios
                setTimeout(async () => {
                    try {
                        const servicios = await window.electronAPI.dbQuery('SELECT * FROM Servicios ORDER BY nombre ASC');
                        window.serviciosModule.servicios = servicios;
                        
                        // Actualizar la tabla si está visible usando la función expuesta
                        if (typeof window.mostrarServicios === 'function') {
                            window.mostrarServicios(servicios);
                        } else if (typeof window.initServicios === 'function') {
                            // Si mostrarServicios no está disponible, recargar completamente
                            window.initServicios();
                        }
                    } catch (error) {
                        console.error('Error al recargar servicios:', error);
                    }
                }, 300);
            }
        } catch (error) {
            console.error('Error al actualizar precios de servicios:', error);
            // No mostrar error al usuario, solo loguear
        }
    }
    
    // Actualizar productos en el módulo de consumos de empleados
    async function actualizarProductosEnConsumos() {
        try {
            // Si el módulo de consumos está inicializado, recargar productos
            if (window.consumosModule && window.consumosModule.initialized) {
                console.log('Actualizando productos en módulo de consumos...');
                
                // Recargar productos desde la base de datos
                const productos = await window.electronAPI.dbQuery('SELECT * FROM Productos ORDER BY nombre ASC');
                window.consumosModule.productos = productos || [];
                
                // Actualizar también el array local (limpiar y rellenar)
                if (window.consumosModule.productos && window.consumosModule.productos.length > 0) {
                    // Limpiar el array local y rellenarlo con los nuevos datos
                    const productosLocal = window.consumosModule.productos;
                    productosLocal.length = 0;
                    productosLocal.push(...productos);
                }
                
                // Actualizar los selects de productos en el modal si está abierto
                const productoSelects = document.querySelectorAll('.producto-select');
                if (productoSelects.length > 0) {
                    productoSelects.forEach(select => {
                        const valorActual = select.value;
                        select.innerHTML = '<option value="">Seleccione un producto...</option>' +
                            productos.map(p => `<option value="${p.id}" data-precio="${p.precio_bs || 0}" data-stock="${p.cantidad}">${p.nombre} (Stock: ${p.cantidad}${p.precio_bs ? ` - ${parseFloat(p.precio_bs).toFixed(2)} Bs` : ''})</option>`).join('');
                        // Restaurar el valor seleccionado si existía
                        if (valorActual) {
                            select.value = valorActual;
                            // Recalcular precio de la fila disparando el evento change
                            setTimeout(() => {
                                if (filaId) {
                                    select.dispatchEvent(new Event('change'));
                                }
                            }, 100);
                        }
                    });
                }
                
                console.log('Productos actualizados en módulo de consumos');
            }
        } catch (error) {
            console.error('Error al actualizar productos en consumos:', error);
            // No mostrar error al usuario, solo loguear
        }
    }
    
    // Actualizar precios de consumos pendientes cuando cambia la tasa
    async function actualizarPreciosConsumosPendientes(tasa) {
        try {
            // Obtener todos los consumos pendientes
            const consumosPendientes = await window.electronAPI.dbQuery(
                'SELECT * FROM ConsumosEmpleados WHERE estado = ?',
                ['pendiente']
            );
            
            if (!consumosPendientes || consumosPendientes.length === 0) {
                console.log('No hay consumos pendientes para actualizar');
                return;
            }
            
            console.log(`Actualizando precios de ${consumosPendientes.length} consumos pendientes...`);
            
            // Para cada consumo pendiente, recalcular el precio según el producto actual
            for (const consumo of consumosPendientes) {
                // Obtener el producto actualizado
                const producto = await window.electronAPI.dbGet(
                    'SELECT * FROM Productos WHERE id = ?',
                    [consumo.id_producto]
                );
                
                if (producto && producto.precio_bs) {
                    const nuevoPrecioUnitario = parseFloat(producto.precio_bs);
                    const nuevoPrecioTotal = nuevoPrecioUnitario * consumo.cantidad;
                    
                    // Actualizar el consumo con los nuevos precios
                    await window.electronAPI.dbRun(
                        'UPDATE ConsumosEmpleados SET precio_unitario = ?, precio_total = ? WHERE id = ?',
                        [nuevoPrecioUnitario, nuevoPrecioTotal, consumo.id]
                    );
                }
            }
            
            console.log('Precios de consumos pendientes actualizados correctamente');
            
            // Si el módulo de consumos está cargado, recargar la tabla
            if (window.consumosModule && window.consumosModule.initialized) {
                setTimeout(async () => {
                    try {
                        const consumos = await window.electronAPI.dbQuery(`
                            SELECT 
                                ce.*,
                                e.nombre || ' ' || e.apellido as nombre_empleado,
                                p.nombre as nombre_producto
                            FROM ConsumosEmpleados ce
                            JOIN Empleados e ON ce.id_empleado = e.id
                            JOIN Productos p ON ce.id_producto = p.id
                            ORDER BY ce.id DESC
                        `);
                        window.consumosModule.consumos = consumos || [];
                        
                        // Actualizar la tabla si está visible
                        if (typeof window.mostrarConsumos === 'function') {
                            window.mostrarConsumos(consumos);
                        } else if (typeof window.initConsumosEmpleados === 'function') {
                            window.initConsumosEmpleados();
                        }
                    } catch (error) {
                        console.error('Error al recargar consumos:', error);
                    }
                }, 300);
            }
        } catch (error) {
            console.error('Error al actualizar precios de consumos pendientes:', error);
            // No mostrar error al usuario, solo loguear
        }
    }

    // Eliminar tasa
    window.eliminarTasa = function(id) {
        tasaAEliminar = id;
        document.getElementById('delete-modal').classList.add('active');
    };

    // Confirmar eliminación
    async function eliminarTasaConfirmado() {
        if (!tasaAEliminar) return;

        try {
            // Obtener la tasa que se va a eliminar para verificar si es de hoy
            const tasaAEliminarObj = await window.electronAPI.dbGet('SELECT * FROM TasasCambio WHERE id = ?', [tasaAEliminar]);
            
            if (!tasaAEliminarObj) {
                mostrarError('Tasa no encontrada');
                return;
            }
            
            const esTasaDeHoy = esFechaHoy(tasaAEliminarObj.fecha);
            
            // Eliminar la tasa
            await window.electronAPI.dbRun('DELETE FROM TasasCambio WHERE id = ?', [tasaAEliminar]);
            cerrarModalEliminar();
            cargarTasas();
            await actualizarTasaActual();
            
            // Si la tasa eliminada era de hoy, actualizar precios con la nueva tasa más reciente
            if (esTasaDeHoy) {
                const hoy = new Date();
                const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
                
                // Obtener la nueva tasa más reciente de hoy (si existe)
                const nuevaTasaHoy = await window.electronAPI.dbGet(
                    'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                    [fechaHoy]
                );
                
                if (nuevaTasaHoy) {
                    console.log('Tasa de hoy eliminada, actualizando precios con la nueva tasa más reciente:', nuevaTasaHoy.tasa_bs_por_dolar);
                    await actualizarPreciosProductos(nuevaTasaHoy.tasa_bs_por_dolar);
                    await actualizarPreciosServicios(nuevaTasaHoy.tasa_bs_por_dolar);
                    await actualizarProductosEnConsumos();
                    await actualizarPreciosConsumosPendientes(nuevaTasaHoy.tasa_bs_por_dolar);
                } else {
                    console.log('Tasa de hoy eliminada, pero no hay más tasas para hoy. Los precios no se actualizarán.');
                }
            }
            
            mostrarExito('Tasa eliminada correctamente');
            tasaAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar tasa:', error);
            mostrarError('Error al eliminar la tasa');
            tasaAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModal() {
        const tasaModal = document.getElementById('tasa-modal');
        if (tasaModal) {
            tasaModal.classList.remove('active');
        }
        tasaEditando = null;
        window.tasasModule.tasaEditando = null;
        const tasaFecha = document.getElementById('tasa-fecha');
        if (tasaFecha) {
            tasaFecha.disabled = false;
        }
        
        // Resetear flags de formateo para permitir re-aplicar en la próxima apertura
        const tasaValor = document.getElementById('tasa-valor');
        if (tasaValor) {
            tasaValor._formateadoPrecio = false;
            tasaValor._originalBlurSaved = false;
            tasaValor._originalInputSaved = false;
        }
    }

    function cerrarModalEliminar() {
        document.getElementById('delete-modal').classList.remove('active');
        tasaAEliminar = null;
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
