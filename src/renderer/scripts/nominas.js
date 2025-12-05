// Gestión de Nóminas - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.nominasModule) {
        window.nominasModule = {
            nominas: [],
            nominaEditando: null,
            nominaAEliminar: null,
            empleados: [],
            serviciosRealizados: [],
            consumosPendientes: [],
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var nominas = window.nominasModule.nominas;
    var nominaEditando = window.nominasModule.nominaEditando;
    var nominaAEliminar = window.nominasModule.nominaAEliminar;
    var empleados = window.nominasModule.empleados;
    var serviciosRealizados = window.nominasModule.serviciosRealizados;
    var consumosPendientes = window.nominasModule.consumosPendientes;
    var initialized = window.nominasModule.initialized;

    // Inicializa el módulo de nóminas cuando se carga la página
    window.initNominas = function() {
        setTimeout(() => {
            try {
                setupEventListeners();
                cargarDatos();
                window.nominasModule.initialized = true;
                console.log('✅ Módulo de nóminas inicializado correctamente');
            } catch (error) {
                console.error('❌ Error al inicializar nóminas:', error);
                const tbody = document.getElementById('nominas-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="10" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

    // Event Listeners
    function setupEventListeners() {
        try {
            // Botón nueva nómina
            const btnNuevo = document.getElementById('btn-nueva-nomina');
            if (btnNuevo) {
                btnNuevo.onclick = () => {
                    abrirModalNuevo();
                };
            }

            // Cerrar modales
            const closeModal = document.getElementById('close-modal');
            if (closeModal) closeModal.onclick = cerrarModal;
            
            const closeVerNominaModal = document.getElementById('close-ver-nomina-modal');
            if (closeVerNominaModal) closeVerNominaModal.onclick = cerrarModalVer;
            
            const cerrarVerNomina = document.getElementById('cerrar-ver-nomina');
            if (cerrarVerNomina) cerrarVerNomina.onclick = cerrarModalVer;
            
            const closeDeleteModal = document.getElementById('close-delete-modal');
            if (closeDeleteModal) closeDeleteModal.onclick = cerrarModalEliminar;
            
            const cancelNomina = document.getElementById('cancel-nomina');
            if (cancelNomina) cancelNomina.onclick = cerrarModal;
            
            const cancelDelete = document.getElementById('cancel-delete');
            if (cancelDelete) cancelDelete.onclick = cerrarModalEliminar;

            // Guardar nómina
            const btnGuardarNomina = document.getElementById('guardar-nomina');
            if (btnGuardarNomina) {
                btnGuardarNomina.onclick = (e) => {
                    e.preventDefault();
                    guardarNomina();
                };
            }

            // Calcular cuando cambia empleado o fecha
            const empleadoSelect = document.getElementById('nomina-empleado');
            const fechaInput = document.getElementById('nomina-fecha');
            
            if (empleadoSelect) {
                empleadoSelect.onchange = calcularNomina;
            }
            
            if (fechaInput) {
                fechaInput.onchange = calcularNomina;
                // Establecer fecha por defecto a hoy (zona horaria local)
                if (window.obtenerFechaLocalInput) {
                    fechaInput.value = window.obtenerFechaLocalInput();
                } else {
                    const hoy = new Date();
                    fechaInput.value = hoy.toISOString().split('T')[0];
                }
            }

            // Botón pagar nómina
            const btnPagarNomina = document.getElementById('pagar-nomina');
            if (btnPagarNomina) {
                btnPagarNomina.onclick = () => {
                    marcarNominaComoPagada();
                };
            }

            // Cambiar visibilidad de campos según moneda de pago
            const monedaPagoSelect = document.getElementById('nomina-moneda-pago');
            if (monedaPagoSelect) {
                monedaPagoSelect.onchange = actualizarVisibilidadCamposMoneda;
                // Ejecutar al inicio para establecer el estado inicial
                actualizarVisibilidadCamposMoneda();
            }

            // Búsqueda y filtros
            const searchNomina = document.getElementById('search-nomina');
            if (searchNomina) {
                searchNomina.oninput = filtrarNominas;
            }
            
            const filterEmpleado = document.getElementById('filter-empleado');
            if (filterEmpleado) {
                filterEmpleado.onchange = filtrarNominas;
            }
            
            const filterFecha = document.getElementById('filter-fecha');
            if (filterFecha) {
                filterFecha.onchange = filtrarNominas;
            }

            // Confirmar eliminación
            const confirmDelete = document.getElementById('confirm-delete');
            if (confirmDelete) {
                confirmDelete.onclick = eliminarNominaConfirmado;
            }

            // Cerrar modal al hacer clic fuera
            const nominaModal = document.getElementById('nomina-modal');
            if (nominaModal) {
                nominaModal.onclick = (e) => {
                    if (e.target === e.currentTarget) {
                        cerrarModal();
                    }
                };
            }

            const verNominaModal = document.getElementById('ver-nomina-modal');
            if (verNominaModal) {
                verNominaModal.onclick = (e) => {
                    if (e.target === e.currentTarget) {
                        cerrarModalVer();
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

    // Cargar datos iniciales
    async function cargarDatos() {
        try {
            await Promise.all([
                cargarNominas(),
                cargarEmpleados()
            ]);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            mostrarError('Error al cargar los datos: ' + (error.message || error));
        }
    }

    // Cargar empleados
    async function cargarEmpleados() {
        try {
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Empleados ORDER BY nombre ASC, apellido ASC');
            window.nominasModule.empleados = resultados || [];
            empleados.length = 0;
            if (window.nominasModule.empleados.length > 0) {
                empleados.push(...window.nominasModule.empleados);
            }
            
            // Llenar selects de empleados
            const empleadoSelect = document.getElementById('nomina-empleado');
            const filterEmpleado = document.getElementById('filter-empleado');
            
            if (empleadoSelect) {
                empleadoSelect.innerHTML = '<option value="">Seleccione un empleado...</option>' +
                    empleados.map(e => `<option value="${e.id}">${e.nombre} ${e.apellido}</option>`).join('');
            }
            
            if (filterEmpleado) {
                filterEmpleado.innerHTML = '<option value="all">Todos los empleados</option>' +
                    empleados.map(e => `<option value="${e.id}">${e.nombre} ${e.apellido}</option>`).join('');
            }
        } catch (error) {
            console.error('Error al cargar empleados:', error);
        }
    }

    // Obtiene todas las nóminas de la base de datos y las muestra en la tabla
    async function cargarNominas() {
        try {
            const tbody = document.getElementById('nominas-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="12" class="loading">Cargando nóminas...</td></tr>';
            }
            
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            // Consultar todas las nóminas con el nombre del empleado
            const resultados = await window.electronAPI.dbQuery(`
                SELECT 
                    n.*,
                    e.nombre || ' ' || e.apellido as nombre_empleado
                FROM Nominas n
                JOIN Empleados e ON n.id_empleado = e.id
                ORDER BY n.id DESC
            `);
            
            console.log(`📋 Nóminas cargadas: ${resultados?.length || 0} registros`);
            window.nominasModule.nominas = resultados || [];
            nominas.length = 0;
            if (window.nominasModule.nominas.length > 0) {
                nominas.push(...window.nominasModule.nominas);
            }
            mostrarNominas(nominas);
        } catch (error) {
            console.error('Error al cargar nóminas:', error);
            const tbody = document.getElementById('nominas-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="12" class="error-message">Error al cargar las nóminas: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar las nóminas: ' + (error.message || error));
        }
    }

    // Variables de paginación
    let currentPageBs = 1;
    let currentPageDolares = 1;
    const itemsPerPage = 15;

    // Función de paginación genérica
    function renderPagination(containerId, currentPage, totalPages, onPageChangeFunc) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">';
        
        // Botón anterior
        if (currentPage > 1) {
            html += `<button class="btn btn-secondary" onclick="${onPageChangeFunc}(${currentPage - 1})" style="padding: 8px 16px;">« Anterior</button>`;
        }
        
        // Números de página
        html += '<div style="display: flex; gap: 5px; flex-wrap: wrap;">';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="${onPageChangeFunc}(${i})" style="padding: 8px 12px; min-width: 40px;">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += '<span style="padding: 8px; color: var(--text-secondary);">...</span>';
            }
        }
        html += '</div>';
        
        // Botón siguiente
        if (currentPage < totalPages) {
            html += `<button class="btn btn-secondary" onclick="${onPageChangeFunc}(${currentPage + 1})" style="padding: 8px 16px;">Siguiente »</button>`;
        }
        
        html += `<span style="margin-left: 15px; color: var(--text-secondary);">Página ${currentPage} de ${totalPages}</span>`;
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    // Exponer funciones de cambio de página
    window.cambiarPaginaBs = cambiarPaginaBs;
    window.cambiarPaginaDolares = cambiarPaginaDolares;

    // Almacenar listas filtradas para paginación
    let nominasBsFiltradas = [];
    let nominasDolaresFiltradas = [];

    // Mostrar nóminas separadas por moneda con paginación
    function mostrarNominas(listaNominas) {
        // Separar nóminas por moneda (solo Bs y $, no mixto)
        nominasBsFiltradas = listaNominas.filter(n => (n.moneda_pago || 'bs') === 'bs');
        nominasDolaresFiltradas = listaNominas.filter(n => (n.moneda_pago || 'bs') === 'dolares');
        
        // Resetear páginas al cargar nuevas nóminas
        currentPageBs = 1;
        currentPageDolares = 1;
        
        // Mostrar nóminas en bolívares
        mostrarNominasPorMoneda(nominasBsFiltradas, 'nominas-table-body-bs', 'bs', currentPageBs);
        
        // Mostrar nóminas en dólares
        mostrarNominasPorMoneda(nominasDolaresFiltradas, 'nominas-table-body-dolares', 'dolares', currentPageDolares);
    }
    
    // Funciones de cambio de página
    function cambiarPaginaBs(page) {
        currentPageBs = page;
        mostrarNominasPorMoneda(nominasBsFiltradas, 'nominas-table-body-bs', 'bs', currentPageBs);
    }
    
    function cambiarPaginaDolares(page) {
        currentPageDolares = page;
        mostrarNominasPorMoneda(nominasDolaresFiltradas, 'nominas-table-body-dolares', 'dolares', currentPageDolares);
    }
    
    // Mostrar nóminas por moneda con paginación
    function mostrarNominasPorMoneda(listaNominas, tbodyId, tipoMoneda, currentPage) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        
        if (listaNominas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${tipoMoneda === 'bs' ? 9 : tipoMoneda === 'dolares' ? 8 : 12}" class="empty-state">No hay nóminas registradas</td></tr>`;
            renderPagination(`pagination-${tipoMoneda}`, 1, 1, `window.cambiarPagina${tipoMoneda.charAt(0).toUpperCase() + tipoMoneda.slice(1)}`);
            return;
        }
        
        // Calcular paginación
        const totalPages = Math.ceil(listaNominas.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const nominasPagina = listaNominas.slice(startIndex, endIndex);
        
        // Renderizar tabla
        tbody.innerHTML = nominasPagina.map((nomina, index) => {
            // Formatear fecha
            let fechaPago = nomina.fecha_pago;
            if (fechaPago.includes('-')) {
                const [year, month, day] = fechaPago.split('-');
                fechaPago = `${day}/${month}/${year}`;
            }
            
            const estadoPago = nomina.estado_pago || 'pendiente';
            const estadoClass = estadoPago === 'pagado' ? 'estado-pagado' : 'estado-pendiente';
            const estadoText = estadoPago === 'pagado' ? 'Pagado' : 'Pendiente';
            const globalIndex = startIndex + index + 1;
            
            if (tipoMoneda === 'bs') {
                return `
                    <tr>
                        <td>#${globalIndex}</td>
                        <td>${nomina.nombre_empleado}</td>
                        <td>${fechaPago}</td>
                        <td>${parseFloat(nomina.comisiones_bs || 0).toFixed(2)} Bs</td>
                        <td>${parseFloat(nomina.propina_bs || 0).toFixed(2)} Bs</td>
                        <td>${parseFloat(nomina.descuentos_consumos_bs || 0).toFixed(2)} Bs</td>
                        <td><strong>${parseFloat(nomina.total_pagado_bs || 0).toFixed(2)} Bs</strong></td>
                        <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                        <td class="actions">
                            <button class="btn-icon btn-edit" onclick="window.editarNomina(${nomina.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="btn-icon btn-view" onclick="window.verNomina(${nomina.id})" title="Ver Detalles">
                                👁️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.eliminarNomina(${nomina.id})" title="Eliminar">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `;
            } else if (tipoMoneda === 'dolares') {
                return `
                    <tr>
                        <td>#${globalIndex}</td>
                        <td>${nomina.nombre_empleado}</td>
                        <td>${fechaPago}</td>
                        <td>$${parseFloat(nomina.comisiones_referencia_en_dolares || 0).toFixed(2)}</td>
                        <td>$${parseFloat(nomina.propina_en_dolares || 0).toFixed(2)}</td>
                        <td><strong>$${parseFloat(nomina.total_pagado_dolares || 0).toFixed(2)}</strong></td>
                        <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                        <td class="actions">
                            <button class="btn-icon btn-edit" onclick="window.editarNomina(${nomina.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="btn-icon btn-view" onclick="window.verNomina(${nomina.id})" title="Ver Detalles">
                                👁️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.eliminarNomina(${nomina.id})" title="Eliminar">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `;
            } else { // mixto
                return `
                    <tr>
                        <td>#${globalIndex}</td>
                        <td>${nomina.nombre_empleado}</td>
                        <td>${fechaPago}</td>
                        <td>${parseFloat(nomina.comisiones_bs || 0).toFixed(2)} Bs</td>
                        <td>$${parseFloat(nomina.comisiones_referencia_en_dolares || 0).toFixed(2)}</td>
                        <td>${parseFloat(nomina.propina_bs || 0).toFixed(2)} Bs</td>
                        <td>$${parseFloat(nomina.propina_en_dolares || 0).toFixed(2)}</td>
                        <td>${parseFloat(nomina.descuentos_consumos_bs || 0).toFixed(2)} Bs</td>
                        <td><strong>${parseFloat(nomina.total_pagado_bs || 0).toFixed(2)} Bs</strong></td>
                        <td><strong>$${parseFloat(nomina.total_pagado_dolares || 0).toFixed(2)}</strong></td>
                        <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                        <td class="actions">
                            <button class="btn-icon btn-edit" onclick="window.editarNomina(${nomina.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="btn-icon btn-view" onclick="window.verNomina(${nomina.id})" title="Ver Detalles">
                                👁️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.eliminarNomina(${nomina.id})" title="Eliminar">
                                🗑️
                            </button>
                        </td>
                    </tr>
                `;
            }
        }).join('');
        
        // Renderizar paginación
        const funcionCambio = tipoMoneda === 'bs' ? 'cambiarPaginaBs' : 'cambiarPaginaDolares';
        renderPagination(`pagination-${tipoMoneda}`, currentPage, totalPages, `window.${funcionCambio}`);
    }
    
    // Exponer función para uso externo
    window.mostrarNominas = mostrarNominas;

    // Filtrar nóminas
    function filtrarNominas() {
        const searchTerm = document.getElementById('search-nomina').value.toLowerCase();
        const filterEmpleado = document.getElementById('filter-empleado').value;
        const filterFecha = document.getElementById('filter-fecha').value;

        let nominasFiltradas = nominas;

        // Filtrar por empleado
        if (filterEmpleado !== 'all') {
            nominasFiltradas = nominasFiltradas.filter(n => n.id_empleado == filterEmpleado);
        }

        // Filtrar por fecha
        if (filterFecha) {
            nominasFiltradas = nominasFiltradas.filter(n => {
                const fechaNomina = n.fecha_pago.split(' ')[0]; // Solo la fecha, sin hora
                return fechaNomina === filterFecha;
            });
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            nominasFiltradas = nominasFiltradas.filter(nomina => {
                const empleado = (nomina.nombre_empleado || '').toLowerCase();
                return empleado.includes(searchTerm);
            });
        }

        // Resetear páginas al filtrar
        currentPageBs = 1;
        currentPageDolares = 1;

        mostrarNominas(nominasFiltradas);
    }

    // Validar si ya existe una nómina para este empleado en esta fecha (ya no se valida, se permite múltiples)
    async function validarNominaExistente(idEmpleado, fechaFormato) {
        // Ya no validamos, permitimos múltiples nóminas por día
        return false;
    }

    // Calcular nómina basada en servicios realizados y consumos
    async function calcularNomina() {
        const idEmpleado = parseInt(document.getElementById('nomina-empleado').value);
        const fechaInput = document.getElementById('nomina-fecha').value;
        
        if (!idEmpleado || !fechaInput) {
            // Limpiar campos si no hay datos suficientes
            limpiarCamposNomina();
            ocultarAdvertencia();
            return;
        }

        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY para consultas
        const [year, month, day] = fechaInput.split('-');
        const fechaFormato = `${day}/${month}/${year}`;

        // Ya no validamos nóminas existentes, permitimos múltiples por día
        ocultarAdvertencia();

        try {
            // Obtener servicios realizados del empleado PENDIENTES (no incluidos en nóminas anteriores)
            // Buscar servicios que no están asociados a ninguna nómina pagada
            // Usamos LEFT JOIN para incluir servicios sin id_servicio (propinas independientes)
            // Incluir información de cómo se pagó la transacción (pagado_bs y pagado_dolares)
            // Para propinas independientes, incluir incluso si la transacción está abierta
            const servicios = await window.electronAPI.dbQuery(`
                SELECT 
                    sr.id,
                    sr.id_transaccion,
                    sr.id_empleado,
                    sr.id_servicio,
                    sr.fecha,
                    sr.precio_cobrado,
                    sr.propina,
                    COALESCE(sr.propina_en_dolares, 0) as propina_en_dolares,
                    COALESCE(sr.pagado_bs, 0) as servicio_pagado_bs,
                    COALESCE(sr.pagado_dolares, 0) as servicio_pagado_dolares,
                    sr.estado,
                    COALESCE(s.nombre, 'Propina Independiente') as nombre_servicio,
                    COALESCE(s.referencia_en_dolares, 0) as servicio_referencia_dolares,
                    t.fecha_apertura,
                    COALESCE(t.pagado_bs, 0) as transaccion_pagado_bs,
                    COALESCE(t.pagado_dolares, 0) as transaccion_pagado_dolares,
                    COALESCE(t.total_en_bs, 0) as transaccion_total_bs,
                    COALESCE(t.total_en_dolares, 0) as transaccion_total_dolares,
                    t.estado as transaccion_estado,
                    -- Calcular el total de servicios y productos de la transacción (SIN propinas)
                    -- Esto es importante para calcular correctamente la proporción en pagos mixtos (fallback si no hay pagado_bs/pagado_dolares)
                    (SELECT COALESCE(SUM(sr2.precio_cobrado), 0) 
                     FROM ServiciosRealizados sr2 
                     WHERE sr2.id_transaccion = t.id 
                     AND sr2.id_servicio IS NOT NULL 
                     AND sr2.id_servicio != 0
                     AND sr2.estado = 'completado') as total_servicios_transaccion_bs,
                    (SELECT COALESCE(SUM(pv.precio_total), 0) 
                     FROM ProductosVendidos pv 
                     WHERE pv.id_transaccion = t.id) as total_productos_transaccion_bs
                FROM ServiciosRealizados sr
                LEFT JOIN Servicios s ON sr.id_servicio = s.id
                JOIN Transacciones t ON sr.id_transaccion = t.id
                WHERE sr.id_empleado = ? 
                AND sr.estado = 'completado'
                AND (
                    -- Incluir servicios de transacciones cerradas
                    (t.estado = 'cerrada')
                    OR
                    -- Incluir propinas independientes incluso si la transacción está abierta
                    (sr.id_servicio IS NULL OR sr.id_servicio = 0)
                )
                ORDER BY sr.id DESC
            `, [idEmpleado]);
            
            // Obtener todas las nóminas pagadas del empleado para verificar qué servicios ya fueron pagados
            const nominasPagadas = await window.electronAPI.dbQuery(`
                SELECT id, fecha_pago, moneda_pago, estado_pago
                FROM Nominas
                WHERE id_empleado = ? 
                AND estado_pago = 'pagado'
                ORDER BY fecha_pago DESC
            `, [idEmpleado]);
            
            if (nominasPagadas.length > 0) {
                console.log(`💰 Nóminas pagadas encontradas para empleado ${idEmpleado}: ${nominasPagadas.length}`);
            }
            
            // Función auxiliar para convertir fecha a objeto Date para comparación
            const parsearFecha = (fechaStr) => {
                if (!fechaStr) return null;
                
                // Extraer solo la parte de la fecha (sin hora)
                const fechaParte = fechaStr.split(' ')[0];
                
                // Intentar formato DD/MM/YYYY
                if (fechaParte.includes('/')) {
                    const partes = fechaParte.split('/');
                    if (partes.length === 3) {
                        const [dia, mes, año] = partes;
                        return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
                    }
                }
                
                // Intentar formato YYYY-MM-DD
                if (fechaParte.includes('-')) {
                    const partes = fechaParte.split('-');
                    if (partes.length === 3) {
                        const [año, mes, dia] = partes;
                        return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
                    }
                }
                
                return null;
            };
            
            // Filtrar servicios que ya fueron pagados completamente según su moneda de pago
            // La lógica: si hay una nómina pagada en la moneda correspondiente que sea posterior o igual
            // a la fecha del servicio, entonces ese servicio ya fue pagado en esa moneda
            // IMPORTANTE: Para servicios mixtos, necesitamos saber qué parte ya fue pagada
            const serviciosPendientes = servicios.filter(servicio => {
                const transaccionPagadoBs = parseFloat(servicio.transaccion_pagado_bs || 0);
                const transaccionPagadoDolares = parseFloat(servicio.transaccion_pagado_dolares || 0);
                const transaccionEstado = servicio.transaccion_estado || 'cerrada';
                
                // Si la transacción está abierta y es propina independiente, usar totales
                let pagadoBs = transaccionPagadoBs;
                let pagadoDolares = transaccionPagadoDolares;
                if (transaccionEstado !== 'cerrada' && (!servicio.id_servicio || servicio.id_servicio === 0)) {
                    pagadoBs = parseFloat(servicio.transaccion_total_bs || 0);
                    pagadoDolares = parseFloat(servicio.transaccion_total_dolares || 0);
                }
                
                // Determinar cómo se pagó el servicio
                const sePagoSoloEnBs = pagadoBs > 0 && pagadoDolares === 0;
                const sePagoSoloEnDolares = pagadoDolares > 0 && pagadoBs === 0;
                const sePagoMixto = pagadoBs > 0 && pagadoDolares > 0;
                
                // Obtener la fecha del servicio
                let fechaServicio = servicio.fecha || servicio.fecha_apertura;
                const fechaServicioDate = parsearFecha(fechaServicio);
                
                // Si no podemos parsear la fecha del servicio, incluir el servicio por seguridad
                if (!fechaServicioDate) {
                    console.warn('No se pudo parsear la fecha del servicio:', fechaServicio);
                    return true;
                }
                
                // Verificar si ya existe una nómina pagada que incluya este servicio
                // IMPORTANTE: Solo marcar como pagado en la moneda correspondiente de la nómina
                let yaPagadoBs = false;
                let yaPagadoDolares = false;
                
                for (const nomina of nominasPagadas) {
                    const fechaNominaDate = parsearFecha(nomina.fecha_pago);
                    
                    // Si no podemos parsear la fecha de la nómina, continuar con la siguiente
                    if (!fechaNominaDate) {
                        console.warn('No se pudo parsear la fecha de la nómina:', nomina.fecha_pago);
                        continue;
                    }
                    
                    // Si la nómina es posterior o igual a la fecha del servicio, podría haberlo incluido
                    // (las nóminas incluyen todos los servicios pendientes hasta su fecha)
                    if (fechaNominaDate >= fechaServicioDate) {
                        const monedaPago = nomina.moneda_pago || 'bs';
                        
                        // Solo marcar como pagado en Bs si la nómina es en Bs o mixta
                        // Si la nómina es en bolívares, marcar la parte en Bs como pagada
                        if (monedaPago === 'bs') {
                            yaPagadoBs = true;
                        }
                        
                        // Si la nómina es en dólares, marcar la parte en dólares como pagada
                        if (monedaPago === 'dolares') {
                            yaPagadoDolares = true;
                        }
                    }
                }
                
                // Guardar información de qué parte ya fue pagada en el objeto servicio
                // para usarla en el cálculo de comisiones
                servicio._yaPagadoBs = yaPagadoBs;
                servicio._yaPagadoDolares = yaPagadoDolares;
                
                // Determinar si el servicio debe incluirse (pendiente) o excluirse (ya pagado)
                let incluirServicio = true;
                
                // Si el servicio se pagó solo en bolívares, verificar si ya se pagó en Bs
                if (sePagoSoloEnBs) {
                    incluirServicio = !yaPagadoBs; // Incluir solo si NO está pagado en Bs
                }
                // Si el servicio se pagó solo en dólares, verificar si ya se pagó en $
                else if (sePagoSoloEnDolares) {
                    incluirServicio = !yaPagadoDolares; // Incluir solo si NO está pagado en $
                }
                // Si el servicio se pagó mixto, verificar si ambas partes ya fueron pagadas
                else if (sePagoMixto) {
                    // Incluir si NO ambas partes están pagadas
                    // Si solo se pagó en bolívares, la parte en dólares sigue pendiente
                    incluirServicio = !(yaPagadoBs && yaPagadoDolares);
                }
                // Si no hay información de cómo se pagó el servicio, verificar si hay alguna nómina pagada
                else if (nominasPagadas.length > 0) {
                    const tieneNominaPosterior = nominasPagadas.some(n => {
                        const fechaNominaDate = parsearFecha(n.fecha_pago);
                        return fechaNominaDate && fechaNominaDate >= fechaServicioDate;
                    });
                    incluirServicio = !tieneNominaPosterior;
                }
                
                return incluirServicio;
            });
            
            // Obtener consumos pendientes del empleado (todos los pendientes, sin importar fecha)
            const consumos = await window.electronAPI.dbQuery(`
                SELECT 
                    ce.*,
                    p.nombre as nombre_producto
                FROM ConsumosEmpleados ce
                JOIN Productos p ON ce.id_producto = p.id
                WHERE ce.id_empleado = ? 
                AND ce.estado = 'pendiente'
                ORDER BY ce.id DESC
            `, [idEmpleado]);

            window.nominasModule.serviciosRealizados = serviciosPendientes || [];
            window.nominasModule.consumosPendientes = consumos || [];
            
            serviciosRealizados.length = 0;
            consumosPendientes.length = 0;
            
            if (window.nominasModule.serviciosRealizados.length > 0) {
                serviciosRealizados.push(...window.nominasModule.serviciosRealizados);
            }
            if (window.nominasModule.consumosPendientes.length > 0) {
                consumosPendientes.push(...window.nominasModule.consumosPendientes);
            }

            // Mostrar resúmenes (usar serviciosPendientes, no servicios)
            mostrarResumenServicios(serviciosPendientes);
            mostrarResumenConsumos(consumos);

            // Actualizar porcentaje del empleado
            await actualizarPorcentajeEmpleado();
            
            // Calcular totales (usar serviciosPendientes, no servicios)
            await calcularTotales(serviciosPendientes, consumos, fechaFormato);
        } catch (error) {
            console.error('Error al calcular nómina:', error);
            mostrarError('Error al calcular la nómina: ' + (error.message || error));
        }
    }

    // Mostrar resumen de servicios
    function mostrarResumenServicios(servicios) {
        const resumen = document.getElementById('servicios-resumen');
        if (!resumen) return;
        
        if (!servicios || servicios.length === 0) {
            resumen.innerHTML = '<p style="color: var(--text-secondary);">No hay servicios realizados en esta fecha</p>';
            return;
        }
        
        resumen.innerHTML = servicios.map(s => {
            const esPropinaIndependiente = !s.id_servicio || s.id_servicio === 0;
            const precioTexto = esPropinaIndependiente ? 'Propina Independiente' : `Precio: ${parseFloat(s.precio_cobrado).toFixed(2)} Bs`;
            const propinaBs = parseFloat(s.propina || 0).toFixed(2);
            const propinaDolares = parseFloat(s.propina_en_dolares || 0).toFixed(2);
            let propinaTexto = '';
            if (parseFloat(s.propina || 0) > 0) {
                propinaTexto += `Propina (Bs): ${propinaBs} Bs`;
            }
            if (parseFloat(s.propina_en_dolares || 0) > 0) {
                if (propinaTexto) propinaTexto += ' - ';
                propinaTexto += `Propina ($): $${propinaDolares}`;
            }
            return `<p><strong>${s.nombre_servicio}</strong> - ${precioTexto}${propinaTexto ? ' - ' + propinaTexto : ''}</p>`;
        }).join('');
    }

    // Mostrar resumen de consumos
    function mostrarResumenConsumos(consumos) {
        const resumen = document.getElementById('consumos-resumen');
        if (!resumen) return;
        
        if (!consumos || consumos.length === 0) {
            resumen.innerHTML = '<p style="color: var(--text-secondary);">No hay consumos pendientes</p>';
            return;
        }
        
        resumen.innerHTML = consumos.map(c => {
            return `<p><strong>${c.nombre_producto}</strong> - Cantidad: ${c.cantidad} - Total: ${parseFloat(c.precio_total).toFixed(2)} Bs</p>`;
        }).join('');
    }

    // Actualizar porcentaje del empleado en la interfaz
    async function actualizarPorcentajeEmpleado() {
        const empleadoSelect = document.getElementById('nomina-empleado');
        const porcentajeInput = document.getElementById('nomina-porcentaje');
        const porcentajeValor = document.getElementById('nomina-porcentaje-valor');
        
        if (!empleadoSelect || !porcentajeInput || !porcentajeValor) return;
        
        const idEmpleado = parseInt(empleadoSelect.value);
        if (!idEmpleado) {
            porcentajeInput.value = '60';
            porcentajeValor.textContent = '60';
            return;
        }
        
        // Obtener porcentaje personalizado del empleado
        let porcentaje = 60; // Por defecto
        if (window.obtenerPorcentajeComision) {
            porcentaje = await window.obtenerPorcentajeComision(idEmpleado);
        }
        
        porcentajeInput.value = porcentaje.toString();
        porcentajeValor.textContent = porcentaje.toString();
    }

    // Calcular totales
    async function calcularTotales(servicios, consumos, fechaFormato) {
        // Obtener tasa del día para cálculos de conversión si es necesario
        const tasaHoy = await window.electronAPI.dbGet(
            'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
            [fechaFormato]
        );
        
        // Calcular comisiones y propinas separadas por moneda según cómo se pagó la transacción
        let comisionesBs = 0;
        let comisionesDolares = 0;
        let propinasBs = 0;
        let propinasDolares = 0;
        
        servicios.forEach(servicio => {
            const esPropinaIndependiente = !servicio.id_servicio || servicio.id_servicio === 0;
            
            // Obtener información de cómo se pagó la transacción
            const transaccionPagadoBs = parseFloat(servicio.transaccion_pagado_bs || 0);
            const transaccionPagadoDolares = parseFloat(servicio.transaccion_pagado_dolares || 0);
            const transaccionTotalBs = parseFloat(servicio.transaccion_total_bs || 0);
            const transaccionTotalDolares = parseFloat(servicio.transaccion_total_dolares || 0);
            const transaccionEstado = servicio.transaccion_estado || 'cerrada';
            
            // Determinar cómo se pagó la transacción
            // Si la transacción está abierta y es propina independiente, usar los totales como referencia
            let sePagoSoloEnBs = false;
            let sePagoSoloEnDolares = false;
            let sePagoMixto = false;
            
            if (transaccionEstado === 'cerrada') {
                // Transacción cerrada: usar pagado_bs y pagado_dolares
                sePagoSoloEnBs = transaccionPagadoBs > 0 && transaccionPagadoDolares === 0;
                sePagoSoloEnDolares = transaccionPagadoDolares > 0 && transaccionPagadoBs === 0;
                sePagoMixto = transaccionPagadoBs > 0 && transaccionPagadoDolares > 0;
            } else if (esPropinaIndependiente) {
                // Propina independiente en transacción abierta: usar totales como referencia
                sePagoSoloEnBs = transaccionTotalBs > 0 && transaccionTotalDolares === 0;
                sePagoSoloEnDolares = transaccionTotalDolares > 0 && transaccionTotalBs === 0;
                sePagoMixto = transaccionTotalBs > 0 && transaccionTotalDolares > 0;
            } else {
                // Para servicios en transacciones abiertas, usar totales como referencia
                sePagoSoloEnBs = transaccionTotalBs > 0 && transaccionTotalDolares === 0;
                sePagoSoloEnDolares = transaccionTotalDolares > 0 && transaccionTotalBs === 0;
                sePagoMixto = transaccionTotalBs > 0 && transaccionTotalDolares > 0;
            }
            
            if (!esPropinaIndependiente) {
                // Es un servicio real, calcular comisiones según cómo se pagó
                const precioServicioBs = parseFloat(servicio.precio_cobrado || 0);
                const servicioReferenciaDolares = parseFloat(servicio.servicio_referencia_dolares || 0);
                
                if (sePagoSoloEnBs) {
                    // Si se pagó solo en bolívares, la comisión va solo a bolívares
                    comisionesBs += precioServicioBs;
                } else if (sePagoSoloEnDolares) {
                    // Si se pagó solo en dólares, la comisión va solo a dólares
                    // Usar el precio de referencia del servicio en dólares si está disponible
                    if (servicioReferenciaDolares > 0) {
                        comisionesDolares += servicioReferenciaDolares;
                    } else if (tasaHoy && tasaHoy.tasa_bs_por_dolar) {
                        // Si no tenemos precio de referencia, convertir desde bolívares usando la tasa del día
                        const comisionEnDolares = precioServicioBs / tasaHoy.tasa_bs_por_dolar;
                        comisionesDolares += comisionEnDolares;
                    }
                } else if (sePagoMixto) {
                    // Si se pagó mixto, usar los campos pagado_bs y pagado_dolares del servicio si están disponibles
                    // (estos campos se guardan cuando se cierra la transacción)
                    // Si no están disponibles (transacciones antiguas), calcular la proporción como fallback
                    
                    const servicioPagadoBs = parseFloat(servicio.servicio_pagado_bs || 0);
                    const servicioPagadoDolares = parseFloat(servicio.servicio_pagado_dolares || 0);
                    
                    let partePagadaBs = 0;
                    let partePagadaDolares = 0;
                    
                    // Si el servicio tiene campos pagado_bs/pagado_dolares guardados, usarlos directamente
                    if (servicioPagadoBs > 0 || servicioPagadoDolares > 0) {
                        partePagadaBs = servicioPagadoBs;
                        partePagadaDolares = servicioPagadoDolares;
                    } else {
                        // Para transacciones antiguas que no tienen estos campos, calcular la proporción
                        // Usar los valores pagados si la transacción está cerrada, sino usar los totales
                        let pagadoBsParaProporcion = transaccionPagadoBs;
                        let pagadoDolaresParaProporcion = transaccionPagadoDolares;
                        
                        if (transaccionEstado !== 'cerrada') {
                            // Si la transacción está abierta, usar los totales como referencia
                            pagadoBsParaProporcion = transaccionTotalBs;
                            pagadoDolaresParaProporcion = transaccionTotalDolares;
                        }
                        
                        // Obtener el total de servicios y productos de la transacción (sin propinas)
                        const totalServiciosTransaccionBs = parseFloat(servicio.total_servicios_transaccion_bs || 0);
                        const totalProductosTransaccionBs = parseFloat(servicio.total_productos_transaccion_bs || 0);
                        const totalServiciosYProductosBs = totalServiciosTransaccionBs + totalProductosTransaccionBs;
                        
                        if (totalServiciosYProductosBs > 0) {
                            // Calcular proporción
                            const proporcionServicioEnTransaccion = precioServicioBs / totalServiciosYProductosBs;
                            partePagadaBs = pagadoBsParaProporcion * proporcionServicioEnTransaccion;
                            partePagadaDolares = pagadoDolaresParaProporcion * proporcionServicioEnTransaccion;
                        }
                    }
                    
                    // IMPORTANTE: Verificar si alguna parte ya fue pagada en nóminas anteriores
                    // Si ya se pagó en Bs, solo calcular la parte en dólares pendiente
                    // Si ya se pagó en dólares, solo calcular la parte en Bs pendiente
                    const yaPagadoBs = servicio._yaPagadoBs || false;
                    const yaPagadoDolares = servicio._yaPagadoDolares || false;
                    
                    // Tolerancia para considerar si una parte es cero (por errores de redondeo)
                    const tolerancia = 0.01;
                    
                    // Solo agregar a comisionesBs si la parte en Bs es mayor que la tolerancia
                    // y NO se ha pagado ya en Bs por una nómina anterior
                    if (partePagadaBs > tolerancia && !yaPagadoBs) {
                        comisionesBs += partePagadaBs;
                    }
                    
                    // Solo agregar a comisionesDolares si la parte en dólares es mayor que la tolerancia
                    // y NO se ha pagado ya en dólares por una nómina anterior
                    if (partePagadaDolares > tolerancia && !yaPagadoDolares) {
                        comisionesDolares += partePagadaDolares;
                    }
                } else {
                    // Si no hay información de pago, asignar a bolívares por defecto
                    comisionesBs += precioServicioBs;
                }
            }
            
            // Manejar propinas
            // IMPORTANTE: Verificar si las propinas ya fueron pagadas en nóminas anteriores
            const propinaBsValor = parseFloat(servicio.propina || 0);
            const propinaDolaresValor = parseFloat(servicio.propina_en_dolares || 0);
            
            // Obtener información de si ya fue pagado (usando la misma lógica que para servicios)
            const yaPagadoBs = servicio._yaPagadoBs || false;
            const yaPagadoDolares = servicio._yaPagadoDolares || false;
            
            if (esPropinaIndependiente) {
                // Para propinas independientes, asignar según su moneda original
                // Las propinas en dólares van solo a dólares, las propinas en bolívares van solo a bolívares
                // Solo agregar si NO fueron pagadas en nóminas anteriores
                if (propinaDolaresValor > 0 && !yaPagadoDolares) {
                    propinasDolares += propinaDolaresValor;
                }
                if (propinaBsValor > 0 && !yaPagadoBs) {
                    propinasBs += propinaBsValor;
                }
            } else {
                // Para propinas de servicios, usar la lógica basada en cómo se pagó la transacción
                if (sePagoSoloEnBs) {
                    // Si se pagó solo en bolívares, las propinas van solo a bolívares
                    // Solo agregar si NO fue pagada en nóminas anteriores
                    if (propinaBsValor > 0 && !yaPagadoBs) {
                        propinasBs += propinaBsValor;
                    }
                } else if (sePagoSoloEnDolares) {
                    // Si se pagó solo en dólares, las propinas van solo a dólares
                    // Solo agregar si NO fue pagada en nóminas anteriores
                    if (propinaDolaresValor > 0 && !yaPagadoDolares) {
                        propinasDolares += propinaDolaresValor;
                    }
                } else if (sePagoMixto) {
                    // Si se pagó mixto, las propinas van según su moneda original
                    // Solo agregar si NO fueron pagadas en nóminas anteriores
                    if (propinaBsValor > 0 && !yaPagadoBs) {
                        propinasBs += propinaBsValor;
                    }
                    if (propinaDolaresValor > 0 && !yaPagadoDolares) {
                        propinasDolares += propinaDolaresValor;
                    }
                } else {
                    // Si no hay información de pago, asignar propinas según su moneda original
                    // Solo agregar si NO fueron pagadas en nóminas anteriores
                    if (propinaBsValor > 0 && !yaPagadoBs) {
                        propinasBs += propinaBsValor;
                    }
                    if (propinaDolaresValor > 0 && !yaPagadoDolares) {
                        propinasDolares += propinaDolaresValor;
                    }
                }
            }
        });

        // Calcular descuentos por consumos (siempre en bolívares)
        let descuentosBs = 0;
        consumos.forEach(consumo => {
            descuentosBs += parseFloat(consumo.precio_total || 0);
        });

        // Calcular subtotal (propinas NO se descuentan, solo se restan los descuentos de consumos)
        // Las propinas se suman al total final, NO se descuentan
        // IMPORTANTE: El subtotal en Bs solo debe incluir comisiones en Bs (no incluir servicios pagados solo en dólares)
        // El subtotal en Bs se calcula como: comisionesBs - descuentosBs
        // Las comisiones en dólares se manejan por separado y no afectan el subtotal en Bs
        const subtotal = comisionesBs - descuentosBs;
        // Las propinas se suman después de aplicar el porcentaje

        // Llenar campos
        document.getElementById('nomina-comisiones-dolares').value = comisionesDolares.toFixed(2);
        document.getElementById('nomina-comisiones-bs').value = comisionesBs.toFixed(2);
        document.getElementById('nomina-propinas-dolares').value = propinasDolares.toFixed(2);
        document.getElementById('nomina-propinas-bs').value = propinasBs.toFixed(2);
        document.getElementById('nomina-descuentos').value = descuentosBs.toFixed(2);
        document.getElementById('nomina-subtotal').value = subtotal.toFixed(2);
        
        // Aplicar porcentaje personalizado del empleado al total
        await recalcularTotalConPorcentaje();
    }

    // Recalcular total aplicando el porcentaje personalizado del empleado
    async function recalcularTotalConPorcentaje() {
        const subtotalInput = document.getElementById('nomina-subtotal');
        const propinasBsInput = document.getElementById('nomina-propinas-bs');
        const propinasDolaresInput = document.getElementById('nomina-propinas-dolares');
        const totalInput = document.getElementById('nomina-total');
        const totalDolaresInput = document.getElementById('nomina-total-dolares');
        const empleadoSelect = document.getElementById('nomina-empleado');
        
        if (!subtotalInput || !totalInput) return;
        
        const subtotal = parseFloat(subtotalInput.value.replace(/[^\d.]/g, '')) || 0;
        const propinasBs = parseFloat(propinasBsInput ? propinasBsInput.value.replace(/[^\d.]/g, '') : 0) || 0;
        const propinasDolares = parseFloat(propinasDolaresInput ? propinasDolaresInput.value.replace(/[^\d.]/g, '') : 0) || 0;
        
        // Obtener porcentaje personalizado del empleado (por defecto 60%)
        let porcentaje = 60;
        if (empleadoSelect && empleadoSelect.value) {
            const idEmpleado = parseInt(empleadoSelect.value);
            if (idEmpleado && window.obtenerPorcentajeComision) {
                porcentaje = await window.obtenerPorcentajeComision(idEmpleado);
            }
        }
        
        // Calcular total en bolívares: (subtotal * porcentaje) + propinas en Bs (las propinas NO se descuentan)
        // El total en Bs es independiente y solo incluye propinas en Bs
        const totalPagadoBs = (subtotal * (porcentaje / 100)) + propinasBs;
        totalInput.value = totalPagadoBs.toFixed(2);
        
        // Calcular total en dólares (independiente de bolívares)
        // El total en dólares solo incluye comisiones en dólares + propinas en dólares
        // No depende de la tasa del día ni de los bolívares
        const comisionesDolares = parseFloat(document.getElementById('nomina-comisiones-dolares').value) || 0;
        const totalPagadoDolaresCalculado = (comisionesDolares * (porcentaje / 100)) + propinasDolares;
        
        // IMPORTANTE: Redondear hacia abajo (floor) el total en dólares
        // Cualquier cantidad decimal se redondea hacia abajo a favor del comercio
        // Ejemplo: 3.17$ → 3$, 3.5$ → 3$, 3.99$ → 3$
        const totalPagadoDolares = Math.floor(totalPagadoDolaresCalculado);
        
        if (totalDolaresInput) {
            totalDolaresInput.value = totalPagadoDolares.toFixed(2);
        }
        
        // Actualizar el display del porcentaje si existe
        const porcentajeInput = document.getElementById('nomina-porcentaje');
        const porcentajeValor = document.getElementById('nomina-porcentaje-valor');
        if (porcentajeInput) {
            porcentajeInput.value = porcentaje.toString();
        }
        if (porcentajeValor) {
            porcentajeValor.textContent = porcentaje.toString();
        }
    }

    // Actualizar visibilidad de campos según moneda de pago seleccionada
    function actualizarVisibilidadCamposMoneda() {
        const monedaPagoSelect = document.getElementById('nomina-moneda-pago');
        if (!monedaPagoSelect) return;
        
        const monedaPago = monedaPagoSelect.value || 'bs';
        
        // Obtener todos los campos relacionados con dólares y bolívares
        const camposDolares = document.querySelectorAll('.campo-dolares');
        const camposBolivares = document.querySelectorAll('.campo-bolivares');
        
        if (monedaPago === 'dolares') {
            // Si se paga en dólares, ocultar campos de bolívares y mostrar campos de dólares
            camposBolivares.forEach(campo => {
                campo.style.display = 'none';
            });
            camposDolares.forEach(campo => {
                campo.style.display = 'flex';
            });
        } else {
            // Si se paga en bolívares, ocultar campos de dólares y mostrar campos de bolívares
            camposDolares.forEach(campo => {
                campo.style.display = 'none';
            });
            camposBolivares.forEach(campo => {
                campo.style.display = 'flex';
            });
        }
    }

    // Limpiar campos de nómina
    function limpiarCamposNomina() {
        document.getElementById('servicios-resumen').innerHTML = '<p style="color: var(--text-secondary);">Seleccione un empleado y fecha para ver los servicios</p>';
        document.getElementById('consumos-resumen').innerHTML = '<p style="color: var(--text-secondary);">Seleccione un empleado y fecha para ver los consumos</p>';
        document.getElementById('nomina-comisiones-dolares').value = '';
        document.getElementById('nomina-comisiones-bs').value = '';
        document.getElementById('nomina-propinas-dolares').value = '';
        document.getElementById('nomina-propinas-bs').value = '';
        document.getElementById('nomina-descuentos').value = '';
        document.getElementById('nomina-subtotal').value = '';
        const porcentajeInput = document.getElementById('nomina-porcentaje');
        const porcentajeValor = document.getElementById('nomina-porcentaje-valor');
        if (porcentajeInput) {
            porcentajeInput.value = '60';
        }
        if (porcentajeValor) {
            porcentajeValor.textContent = '60';
        }
        document.getElementById('nomina-total').value = '';
        const totalDolaresInput = document.getElementById('nomina-total-dolares');
        if (totalDolaresInput) {
            totalDolaresInput.value = '';
        }
        const monedaPagoSelect = document.getElementById('nomina-moneda-pago');
        if (monedaPagoSelect) {
            monedaPagoSelect.value = 'bs';
            // Actualizar visibilidad de campos
            actualizarVisibilidadCamposMoneda();
        }
        const estadoPagoSelect = document.getElementById('nomina-estado-pago');
        if (estadoPagoSelect) {
            estadoPagoSelect.value = 'pendiente';
        }
    }

    // Mostrar advertencia de nómina existente (ya no se usa, pero mantenemos por compatibilidad)
    function mostrarAdvertencia() {
        // Ya no mostramos advertencia, permitimos múltiples nóminas
    }

    // Ocultar advertencia de nómina existente
    function ocultarAdvertencia() {
        // Ya no hay advertencia que ocultar
    }

    // Abrir modal para nueva nómina
    function abrirModalNuevo() {
        nominaEditando = null;
        document.getElementById('modal-title').textContent = 'Nueva Nómina';
        document.getElementById('nomina-form').reset();
        document.getElementById('nomina-id').value = '';
        
        // Ocultar botón pagar (solo visible al editar)
        const btnPagar = document.getElementById('pagar-nomina');
        if (btnPagar) {
            btnPagar.style.display = 'none';
        }
        
        // Establecer fecha por defecto a hoy (zona horaria local)
        const fechaInput = document.getElementById('nomina-fecha');
        if (fechaInput) {
            if (window.obtenerFechaLocalInput) {
                fechaInput.value = window.obtenerFechaLocalInput();
            } else {
                const hoy = new Date();
                fechaInput.value = hoy.toISOString().split('T')[0];
            }
        }
        
        limpiarCamposNomina();
        
        document.getElementById('nomina-modal').classList.add('active');
        
        setTimeout(() => {
            const empleadoSelect = document.getElementById('nomina-empleado');
            if (empleadoSelect) empleadoSelect.focus();
        }, 100);
    }

    // Guardar nómina
    async function guardarNomina() {
        const idEmpleado = parseInt(document.getElementById('nomina-empleado').value);
        const fechaInput = document.getElementById('nomina-fecha').value;
        
        if (!idEmpleado || !fechaInput) {
            mostrarError('El empleado y la fecha son requeridos');
            return;
        }

        // Verificar contraseña para operación crítica
        try {
            if (window.verificarContraseñaOperacionCritica) {
                await window.verificarContraseñaOperacionCritica();
            }
        } catch (error) {
            // Si el usuario cancela o la contraseña es incorrecta, no continuar
            return;
        }

        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
        const [year, month, day] = fechaInput.split('-');
        const fechaFormato = `${day}/${month}/${year}`;

        // Obtener valores calculados
        const comisionesDolares = parseFloat(document.getElementById('nomina-comisiones-dolares').value) || 0;
        const comisionesBs = parseFloat(document.getElementById('nomina-comisiones-bs').value) || 0;
        const propinasDolares = parseFloat(document.getElementById('nomina-propinas-dolares').value) || 0;
        const propinasBs = parseFloat(document.getElementById('nomina-propinas-bs').value) || 0;
        const descuentosBs = parseFloat(document.getElementById('nomina-descuentos').value) || 0;
        // Obtener porcentaje personalizado del empleado (por defecto 60%)
        let porcentaje = 60;
        if (idEmpleado && window.obtenerPorcentajeComision) {
            porcentaje = await window.obtenerPorcentajeComision(idEmpleado);
        }
        const totalPagadoBs = parseFloat(document.getElementById('nomina-total').value) || 0;
        // IMPORTANTE: Aplicar redondeo hacia abajo (floor) al total en dólares antes de guardar
        // Esto asegura que cualquier cantidad decimal se redondee hacia abajo a favor del comercio
        const totalPagadoDolaresCalculado = parseFloat(document.getElementById('nomina-total-dolares').value) || 0;
        const totalPagadoDolares = Math.floor(totalPagadoDolaresCalculado);
        const monedaPago = document.getElementById('nomina-moneda-pago').value || 'bs';
        const estadoPago = document.getElementById('nomina-estado-pago').value || 'pendiente';

        if (totalPagadoBs < 0) {
            mostrarError('El total a pagar no puede ser negativo');
            return;
        }

        try {
            // Crear o actualizar nómina
            if (nominaEditando) {
                // Actualizar nómina existente
                await window.electronAPI.dbRun(
                    `UPDATE Nominas 
                    SET id_empleado = ?, comisiones_referencia_en_dolares = ?, comisiones_bs = ?, propina_en_dolares = ?, propina_bs = ?, descuentos_consumos_bs = ?, total_pagado_bs = ?, total_pagado_dolares = ?, fecha_pago = ?, porcentaje_pagado = ?, moneda_pago = ?, estado_pago = ?
                    WHERE id = ?`,
                    [idEmpleado, comisionesDolares, comisionesBs, propinasDolares, propinasBs, descuentosBs, totalPagadoBs, totalPagadoDolares, fechaFormato, porcentaje, monedaPago, estadoPago, nominaEditando.id]
                );
                
                const idNomina = nominaEditando.id;
                
                // Marcar consumos como pagados si la nómina está pagada
                if (estadoPago === 'pagado') {
                    for (const consumo of consumosPendientes) {
                        await window.electronAPI.dbRun(
                            'UPDATE ConsumosEmpleados SET estado = ?, id_nomina = ? WHERE id = ?',
                            ['pagado', idNomina, consumo.id]
                        );
                    }
                }
                
                cerrarModal();
                await cargarDatos();
                mostrarExito('Nómina actualizada correctamente');
                return;
            }
            
            // Crear nueva nómina
            const resultado = await window.electronAPI.dbRun(
                `INSERT INTO Nominas 
                (id_empleado, comisiones_referencia_en_dolares, comisiones_bs, propina_en_dolares, propina_bs, descuentos_consumos_bs, total_pagado_bs, total_pagado_dolares, fecha_pago, porcentaje_pagado, moneda_pago, estado_pago) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [idEmpleado, comisionesDolares, comisionesBs, propinasDolares, propinasBs, descuentosBs, totalPagadoBs, totalPagadoDolares, fechaFormato, porcentaje, monedaPago, estadoPago]
            );
            
            const idNomina = resultado.lastInsertRowid;
            
            // Marcar consumos como pagados solo si la nómina está pagada
            if (estadoPago === 'pagado') {
                for (const consumo of consumosPendientes) {
                    await window.electronAPI.dbRun(
                        'UPDATE ConsumosEmpleados SET estado = ?, id_nomina = ? WHERE id = ?',
                        ['pagado', idNomina, consumo.id]
                    );
                }
            }

            cerrarModal();
            await cargarDatos();
            mostrarExito('Nómina creada correctamente');
        } catch (error) {
            console.error('Error al guardar nómina:', error);
            mostrarError('Error al guardar la nómina: ' + (error.message || 'Error desconocido'));
        }
    }

    // Editar nómina
    window.editarNomina = async function(id) {
        try {
            const nomina = await window.electronAPI.dbGet(`
                SELECT 
                    n.*,
                    e.nombre || ' ' || e.apellido as nombre_empleado
                FROM Nominas n
                JOIN Empleados e ON n.id_empleado = e.id
                WHERE n.id = ?
            `, [id]);
            
            if (!nomina) {
                mostrarError('Nómina no encontrada');
                return;
            }

            nominaEditando = nomina;
            document.getElementById('modal-title').textContent = 'Editar Nómina';
            document.getElementById('nomina-id').value = nomina.id;
            document.getElementById('nomina-empleado').value = nomina.id_empleado;
            
            // Formatear fecha
            let fechaPago = nomina.fecha_pago;
            if (fechaPago.includes('/')) {
                const [day, month, year] = fechaPago.split('/');
                fechaPago = `${year}-${month}-${day}`;
            }
            document.getElementById('nomina-fecha').value = fechaPago;
            
            // Llenar campos calculados
            document.getElementById('nomina-comisiones-dolares').value = parseFloat(nomina.comisiones_referencia_en_dolares || 0).toFixed(2);
            document.getElementById('nomina-comisiones-bs').value = parseFloat(nomina.comisiones_bs || 0).toFixed(2);
            document.getElementById('nomina-propinas-dolares').value = parseFloat(nomina.propina_en_dolares || 0).toFixed(2);
            document.getElementById('nomina-propinas-bs').value = parseFloat(nomina.propina_bs || 0).toFixed(2);
            document.getElementById('nomina-descuentos').value = parseFloat(nomina.descuentos_consumos_bs || 0).toFixed(2);
            
            // Calcular subtotal
            const subtotal = parseFloat(nomina.comisiones_bs || 0) - parseFloat(nomina.descuentos_consumos_bs || 0);
            document.getElementById('nomina-subtotal').value = subtotal.toFixed(2);
            
            document.getElementById('nomina-total').value = parseFloat(nomina.total_pagado_bs || 0).toFixed(2);
            const totalDolaresInput = document.getElementById('nomina-total-dolares');
            if (totalDolaresInput) {
                totalDolaresInput.value = parseFloat(nomina.total_pagado_dolares || 0).toFixed(2);
            }
            
            const monedaPagoSelect = document.getElementById('nomina-moneda-pago');
            if (monedaPagoSelect) {
                monedaPagoSelect.value = nomina.moneda_pago || 'bs';
                // Actualizar visibilidad de campos según la moneda guardada
                actualizarVisibilidadCamposMoneda();
            }
            
            const estadoPagoSelect = document.getElementById('nomina-estado-pago');
            if (estadoPagoSelect) {
                estadoPagoSelect.value = nomina.estado_pago || 'pendiente';
            }
            
            // Mostrar botón pagar si está pendiente
            const btnPagar = document.getElementById('pagar-nomina');
            if (btnPagar) {
                if (nomina.estado_pago === 'pendiente') {
                    btnPagar.style.display = 'inline-block';
                } else {
                    btnPagar.style.display = 'none';
                }
            }
            
            // Cargar servicios y consumos asociados
            await calcularNomina();
            
            document.getElementById('nomina-modal').classList.add('active');
        } catch (error) {
            console.error('Error al cargar nómina:', error);
            mostrarError('Error al cargar la nómina');
        }
    };

    // Marcar nómina como pagada
    async function marcarNominaComoPagada() {
        if (!nominaEditando) {
            mostrarError('No hay nómina seleccionada');
            return;
        }

        try {
            await window.electronAPI.dbRun(
                'UPDATE Nominas SET estado_pago = ? WHERE id = ?',
                ['pagado', nominaEditando.id]
            );
            
            // Marcar consumos asociados como pagados
            for (const consumo of consumosPendientes) {
                await window.electronAPI.dbRun(
                    'UPDATE ConsumosEmpleados SET estado = ?, id_nomina = ? WHERE id = ?',
                    ['pagado', nominaEditando.id, consumo.id]
                );
            }
            
            cerrarModal();
            await cargarDatos();
            mostrarExito('Nómina marcada como pagada correctamente');
        } catch (error) {
            console.error('Error al marcar nómina como pagada:', error);
            mostrarError('Error al marcar la nómina como pagada');
        }
    };

    // Ver detalles de nómina
    window.verNomina = async function(id) {
        try {
            const nomina = await window.electronAPI.dbGet(`
                SELECT 
                    n.*,
                    e.nombre || ' ' || e.apellido as nombre_empleado
                FROM Nominas n
                JOIN Empleados e ON n.id_empleado = e.id
                WHERE n.id = ?
            `, [id]);
            
            if (!nomina) {
                mostrarError('Nómina no encontrada');
                return;
            }

            // Obtener consumos asociados
            const consumos = await window.electronAPI.dbQuery(`
                SELECT 
                    ce.*,
                    p.nombre as nombre_producto
                FROM ConsumosEmpleados ce
                JOIN Productos p ON ce.id_producto = p.id
                WHERE ce.id_nomina = ?
                ORDER BY ce.id DESC
            `, [id]);

            const monedaPago = nomina.moneda_pago || 'bs';
            const porcentaje = parseInt(nomina.porcentaje_pagado || 100);
            
            // Formatear fecha
            let fechaPago = nomina.fecha_pago;
            if (fechaPago.includes('-')) {
                const [year, month, day] = fechaPago.split('-');
                fechaPago = `${day}/${month}/${year}`;
            }
            
            document.getElementById('ver-nomina-titulo').textContent = `Nómina #${nomina.id}`;
            
            // Generar HTML según la moneda de pago (solo bs o dolares, no mixto)
            let htmlComisiones = '';
            let htmlPropinas = '';
            let htmlDescuentos = '';
            let htmlResumen = '';
            
            if (monedaPago === 'dolares') {
                // Solo mostrar campos en dólares
                htmlComisiones = `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Comisiones</h4>
                        <p><strong>Comisiones:</strong> $${parseFloat(nomina.comisiones_referencia_en_dolares || 0).toFixed(2)}</p>
                    </div>
                `;
                
                htmlPropinas = `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Propinas</h4>
                        <p><strong>Propinas:</strong> $${parseFloat(nomina.propina_en_dolares || 0).toFixed(2)}</p>
                    </div>
                `;
                
                // Descuentos no aplican en nóminas en dólares
                htmlDescuentos = '';
                
                // Calcular total en dólares
                const totalDolares = parseFloat(nomina.total_pagado_dolares || 0) || 
                                   (parseFloat(nomina.comisiones_referencia_en_dolares || 0) + parseFloat(nomina.propina_en_dolares || 0));
                
                htmlResumen = `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Resumen de Pago</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Porcentaje Pagado:</strong> ${porcentaje}%</p>
                            <p style="grid-column: 1 / -1;"><strong>Total Pagado:</strong> <span style="font-size: 18px; font-weight: 600;">$${totalDolares.toFixed(2)}</span></p>
                        </div>
                    </div>
                `;
            } else {
                // Solo mostrar campos en bolívares (monedaPago === 'bs')
                const subtotal = parseFloat(nomina.comisiones_bs || 0) + parseFloat(nomina.propina_bs || 0) - parseFloat(nomina.descuentos_consumos_bs || 0);
                
                htmlComisiones = `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Comisiones</h4>
                        <p><strong>Comisiones:</strong> ${parseFloat(nomina.comisiones_bs || 0).toFixed(2)} Bs</p>
                    </div>
                `;
                
                htmlPropinas = `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Propinas</h4>
                        <p><strong>Propinas:</strong> ${parseFloat(nomina.propina_bs || 0).toFixed(2)} Bs</p>
                    </div>
                `;
                
                htmlDescuentos = `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Descuentos</h4>
                        <p><strong>Descuentos por Consumos:</strong> ${parseFloat(nomina.descuentos_consumos_bs || 0).toFixed(2)} Bs</p>
                    </div>
                `;
                
                htmlResumen = `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Resumen de Pago</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Subtotal:</strong> ${subtotal.toFixed(2)} Bs</p>
                            <p><strong>Porcentaje Pagado:</strong> ${porcentaje}%</p>
                            <p style="grid-column: 1 / -1;"><strong>Total Pagado:</strong> <span style="font-size: 18px; font-weight: 600;">${parseFloat(nomina.total_pagado_bs || 0).toFixed(2)} Bs</span></p>
                        </div>
                    </div>
                `;
            }
            
            const contenido = document.getElementById('ver-nomina-contenido');
            contenido.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Información General</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Empleado:</strong> ${nomina.nombre_empleado}</p>
                            <p><strong>Fecha de Pago:</strong> ${fechaPago}</p>
                            <p><strong>Moneda de Pago:</strong> ${monedaPago === 'dolares' ? 'Dólares ($)' : 'Bolívares (Bs)'}</p>
                        </div>
                    </div>

                    ${htmlComisiones}
                    ${htmlPropinas}
                    ${htmlDescuentos}

                    ${consumos && consumos.length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Consumos Descontados (${consumos.length})</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px;">Producto</th>
                                    <th style="text-align: right; padding: 8px;">Cantidad</th>
                                    <th style="text-align: right; padding: 8px;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${consumos.map(c => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${c.nombre_producto}</td>
                                        <td style="text-align: right; padding: 8px;">${c.cantidad}</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(c.precio_total).toFixed(2)} Bs</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}

                    ${htmlResumen}
                </div>
            `;

            document.getElementById('ver-nomina-modal').classList.add('active');
        } catch (error) {
            console.error('Error al cargar nómina:', error);
            mostrarError('Error al cargar la nómina');
        }
    };

    // Eliminar nómina
    window.eliminarNomina = function(id) {
        nominaAEliminar = id;
        document.getElementById('delete-modal').classList.add('active');
    };

    // Confirmar eliminación
    async function eliminarNominaConfirmado() {
        if (!nominaAEliminar) return;

        try {
            // Obtener consumos asociados para marcarlos como pendientes
            const consumos = await window.electronAPI.dbQuery(
                'SELECT * FROM ConsumosEmpleados WHERE id_nomina = ?',
                [nominaAEliminar]
            );

            // Marcar consumos como pendientes
            for (const consumo of consumos) {
                await window.electronAPI.dbRun(
                    'UPDATE ConsumosEmpleados SET estado = ?, id_nomina = ? WHERE id = ?',
                    ['pendiente', null, consumo.id]
                );
            }

            // Eliminar nómina
            await window.electronAPI.dbRun('DELETE FROM Nominas WHERE id = ?', [nominaAEliminar]);
            cerrarModalEliminar();
            await cargarDatos();
            mostrarExito('Nómina eliminada correctamente. Los consumos asociados volvieron a estar pendientes.');
            nominaAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar nómina:', error);
            mostrarError('Error al eliminar la nómina');
            nominaAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModal() {
        document.getElementById('nomina-modal').classList.remove('active');
        nominaEditando = null;
        limpiarCamposNomina();
    }

    function cerrarModalVer() {
        document.getElementById('ver-nomina-modal').classList.remove('active');
    }

    function cerrarModalEliminar() {
        document.getElementById('delete-modal').classList.remove('active');
        nominaAEliminar = null;
    }

    // Mostrar mensajes
    function mostrarError(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Error: ' + mensaje, 'error', 5000);
        } else {
            console.error('Error: ' + mensaje);
        }
        // No forzar foco automáticamente para evitar parpadeo
    }

    function mostrarExito(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Éxito: ' + mensaje, 'success', 3000);
        } else {
            console.log('Éxito: ' + mensaje);
        }
    }
})();

