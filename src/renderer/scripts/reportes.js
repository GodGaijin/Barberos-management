// Gestión de Reportes Diarios - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.reportesModule) {
        window.reportesModule = {
            reportes: [],
            reporteAEliminar: null,
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var reportes = window.reportesModule.reportes;
    var reporteAEliminar = window.reportesModule.reporteAEliminar;
    var initialized = window.reportesModule.initialized;
    
    // Variables de paginación
    let currentPageReportes = 1;
    const itemsPerPage = 15;
    let reportesFiltrados = [];

    // Inicialización - función exportada para ser llamada desde main.js
    window.initReportes = function() {
        // Inicializa el módulo de reportes cuando se carga la página
        setTimeout(() => {
            try {
                setupEventListeners();
                cargarReportes();
                
                // Listener para generación automática de reportes
                if (window.electronAPI && window.electronAPI.onGenerarReporteAutomatico) {
                    window.electronAPI.onGenerarReporteAutomatico((fechaFormato) => {
                        console.log(`📊 Generando reporte automático para: ${fechaFormato}`);
                        generarReporteParaFecha(fechaFormato);
                    });
                }
                
                window.reportesModule.initialized = true;
                console.log('✅ Módulo de reportes inicializado correctamente');
            } catch (error) {
                console.error('❌ Error al inicializar reportes:', error);
                const tbody = document.getElementById('reportes-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="7" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };
    
    // Generar reporte para una fecha específica (para reportes automáticos)
    async function generarReporteParaFecha(fechaFormato) {
        try {
            // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD para el input
            const [day, month, year] = fechaFormato.split('/');
            const fechaInput = `${year}-${month}-${day}`;
            
            // Verificar si ya existe un reporte para esta fecha
            const reporteExistente = await window.electronAPI.dbGet(
                'SELECT * FROM ReportesDiarios WHERE fecha_reporte = ?',
                [fechaFormato]
            );

            // Si ya existe un reporte para esta fecha, no generar otro
            if (reporteExistente) {
                console.log(`ℹ️ Ya existe un reporte para ${fechaFormato}, omitiendo generación`);
                return;
            }

            // Establecer la fecha en el input si existe
            const fechaInputElement = document.getElementById('reporte-fecha');
            if (fechaInputElement) {
                fechaInputElement.value = fechaInput;
            }

            // Llamar a generarReporte pero saltando la verificación de contraseña
            // Usando una variable de contexto
            window._generarReporteSinContraseña = true;
            try {
                await generarReporte();
            } finally {
                window._generarReporteSinContraseña = false;
            }
            
            console.log(`✅ Reporte automático generado exitosamente para ${fechaFormato}`);
        } catch (error) {
            console.error('❌ Error al generar reporte automático:', error);
        }
    }

    // Event Listeners
    function setupEventListeners() {
        try {
            // Botón generar reporte
            const btnGenerar = document.getElementById('btn-generar-reporte');
            if (btnGenerar) {
                btnGenerar.onclick = () => {
                    abrirModalGenerar();
                };
            }

            // Cerrar modales
            const closeModal = document.getElementById('close-modal');
            if (closeModal) closeModal.onclick = cerrarModal;
            
            const closeVerModal = document.getElementById('close-ver-modal');
            if (closeVerModal) closeVerModal.onclick = cerrarModalVer;
            
            const cerrarVerReporte = document.getElementById('cerrar-ver-reporte');
            if (cerrarVerReporte) cerrarVerReporte.onclick = cerrarModalVer;
            
            const closeDeleteModal = document.getElementById('close-delete-modal');
            if (closeDeleteModal) closeDeleteModal.onclick = cerrarModalEliminar;
            
            const cancelReporte = document.getElementById('cancel-reporte');
            if (cancelReporte) cancelReporte.onclick = cerrarModal;
            
            const cancelDelete = document.getElementById('cancel-delete');
            if (cancelDelete) cancelDelete.onclick = cerrarModalEliminar;

            // Generar reporte
            const btnGenerarReporte = document.getElementById('generar-reporte');
            if (btnGenerarReporte) {
                btnGenerarReporte.onclick = (e) => {
                    e.preventDefault();
                    generarReporte();
                };
            }

            // Búsqueda y filtros
            const searchReporte = document.getElementById('search-reporte');
            if (searchReporte) {
                searchReporte.oninput = filtrarReportes;
            }
            
            const filterFecha = document.getElementById('filter-fecha');
            if (filterFecha) {
                filterFecha.onchange = filtrarReportes;
            }

            // Confirmar eliminación
            const confirmDelete = document.getElementById('confirm-delete');
            if (confirmDelete) {
                confirmDelete.onclick = eliminarReporteConfirmado;
            }

            // Cerrar modal al hacer clic fuera
            const reporteModal = document.getElementById('reporte-modal');
            if (reporteModal) {
                reporteModal.onclick = (e) => {
                    if (e.target === e.currentTarget) {
                        cerrarModal();
                    }
                };
            }

            const verReporteModal = document.getElementById('ver-reporte-modal');
            if (verReporteModal) {
                verReporteModal.onclick = (e) => {
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

    // Cargar reportes desde la base de datos
    async function cargarReportes() {
        try {
            // Obtiene todos los reportes de la base de datos y los muestra en la tabla
            const tbody = document.getElementById('reportes-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">Cargando reportes...</td></tr>';
            }
            
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            // Consultar todos los reportes ordenados por fecha más reciente
            const resultados = await window.electronAPI.dbQuery(`
                SELECT * FROM ReportesDiarios
                ORDER BY id DESC
            `);
            
            console.log(`📄 Reportes cargados: ${resultados?.length || 0} registros`);
            window.reportesModule.reportes = resultados || [];
            reportes.length = 0;
            if (window.reportesModule.reportes.length > 0) {
                reportes.push(...window.reportesModule.reportes);
            }
            mostrarReportes(reportes);
        } catch (error) {
            console.error('Error al cargar reportes:', error);
            const tbody = document.getElementById('reportes-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="error-message">Error al cargar los reportes: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar los reportes: ' + (error.message || error));
        }
    }

    // Mostrar reportes en la tabla
    function mostrarReportes(listaReportes) {
        const tbody = document.getElementById('reportes-table-body');
        
        if (!tbody) return;
        
        // Guardar lista filtrada para paginación
        reportesFiltrados = listaReportes;
        
        if (listaReportes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay reportes generados</td></tr>';
            window.renderPagination('pagination-reportes', 1, 1, 'window.cambiarPaginaReportes');
            return;
        }
        
        // Calcular paginación
        const totalPages = Math.ceil(listaReportes.length / itemsPerPage);
        const startIndex = (currentPageReportes - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const reportesPagina = listaReportes.slice(startIndex, endIndex);

        tbody.innerHTML = reportesPagina.map((reporte, index) => {
            // Formatear fechas
            let fechaReporte = reporte.fecha_reporte;
            if (fechaReporte.includes('/')) {
                // Ya está en formato DD/MM/YYYY
            } else if (fechaReporte.includes('-')) {
                const [year, month, day] = fechaReporte.split('-');
                fechaReporte = `${day}/${month}/${year}`;
            }
            
            let fechaCreacion = reporte.fecha_creacion;
            if (fechaCreacion.includes('T')) {
                const [datePart, timePart] = fechaCreacion.split('T');
                const [year, month, day] = datePart.split('-');
                const [hours, minutes] = timePart.split(':');
                fechaCreacion = `${day}/${month}/${year} ${hours}:${minutes}`;
            }
            
            const globalIndex = startIndex + index + 1;
            
            return `
                <tr>
                    <td>#${globalIndex}</td>
                    <td>${fechaReporte}</td>
                    <td>${fechaCreacion}</td>
                    <td>${reporte.tasa_cambio ? parseFloat(reporte.tasa_cambio).toFixed(2) + ' Bs/$' : 'N/A'}</td>
                    <td>${parseInt(reporte.total_transacciones || 0)}</td>
                    <td><strong>${parseFloat(reporte.total_ingresos_bs || 0).toFixed(2)} Bs</strong></td>
                    <td class="actions">
                        <button class="btn-icon btn-view" onclick="window.verReporte(${reporte.id})" title="Ver Detalles">
                            👁️
                        </button>
                        <button class="btn-icon btn-delete" onclick="window.eliminarReporte(${reporte.id})" title="Eliminar">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Renderizar paginación
        window.renderPagination('pagination-reportes', currentPageReportes, totalPages, 'window.cambiarPaginaReportes');
    }
    
    // Función para cambiar página de reportes
    function cambiarPaginaReportes(page) {
        currentPageReportes = page;
        mostrarReportes(reportesFiltrados);
    }
    
    // Exponer funciones para uso externo
    window.mostrarReportes = mostrarReportes;
    window.cambiarPaginaReportes = cambiarPaginaReportes;

    // Filtrar reportes
    function filtrarReportes() {
        const searchTerm = document.getElementById('search-reporte').value.toLowerCase();
        const filterFecha = document.getElementById('filter-fecha').value;

        let reportesFiltradosTemp = reportes;

        // Filtrar por fecha
        if (filterFecha) {
            const [year, month, day] = filterFecha.split('-');
            const fechaFormato = `${day}/${month}/${year}`;
            reportesFiltradosTemp = reportesFiltradosTemp.filter(r => r.fecha_reporte === fechaFormato);
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            reportesFiltradosTemp = reportesFiltradosTemp.filter(reporte => {
                const fecha = (reporte.fecha_reporte || '').toLowerCase();
                return fecha.includes(searchTerm);
            });
        }

        // Resetear página al filtrar
        currentPageReportes = 1;
        
        mostrarReportes(reportesFiltradosTemp);
    }

    // Abrir modal para generar reporte
    function abrirModalGenerar() {
        document.getElementById('reporte-form').reset();
        
        // Establecer fecha por defecto a hoy (zona horaria local)
        const fechaInput = document.getElementById('reporte-fecha');
        if (fechaInput) {
            if (window.obtenerFechaLocalInput) {
                fechaInput.value = window.obtenerFechaLocalInput();
            } else {
                const hoy = new Date();
                fechaInput.value = hoy.toISOString().split('T')[0];
            }
        }
        
        document.getElementById('reporte-modal').classList.add('active');
        
        setTimeout(() => {
            if (fechaInput) fechaInput.focus();
        }, 100);
    }

    // Generar reporte del día
    async function generarReporte() {
        const fechaInput = document.getElementById('reporte-fecha').value;
        
        if (!fechaInput) {
            mostrarError('Debe seleccionar una fecha');
            return;
        }

        // Verificar contraseña para operación crítica (saltar si es reporte automático)
        if (!window._generarReporteSinContraseña) {
            try {
                if (window.verificarContraseñaOperacionCritica) {
                    await window.verificarContraseñaOperacionCritica();
                }
            } catch (error) {
                // Si el usuario cancela o la contraseña es incorrecta, no continuar
                return;
            }
        }

        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
        const [year, month, day] = fechaInput.split('-');
        const fechaFormato = `${day}/${month}/${year}`;

        // Verificar si ya existe un reporte para esta fecha
        const reporteExistente = await window.electronAPI.dbGet(
            'SELECT * FROM ReportesDiarios WHERE fecha_reporte = ?',
            [fechaFormato]
        );

        if (reporteExistente) {
            if (typeof window.mostrarConfirmacion === 'function') {
                const confirmado = await window.mostrarConfirmacion('Ya existe un reporte para esta fecha. ¿Desea regenerarlo?', 'Confirmar Regeneración');
                if (!confirmado) {
                    return;
                }
            } else {
                // Fallback si no está disponible
                if (!confirm('Ya existe un reporte para esta fecha. ¿Desea regenerarlo?')) {
                    return;
                }
            }
            // Eliminar reporte existente
            await window.electronAPI.dbRun(
                'DELETE FROM ReportesDiarios WHERE fecha_reporte = ?',
                [fechaFormato]
            );
        }

        try {
            // Obtener tasa del día
            const tasa = await window.electronAPI.dbGet(
                'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                [fechaFormato]
            );

            // Obtener nóminas pagadas ese día (solo las marcadas como pagadas)
            const nominas = await window.electronAPI.dbQuery(`
                SELECT 
                    n.*,
                    e.nombre || ' ' || e.apellido as nombre_empleado
                FROM Nominas n
                JOIN Empleados e ON n.id_empleado = e.id
                WHERE n.fecha_pago = ?
                AND n.estado_pago = 'pagado'
            `, [fechaFormato]);

            // Obtener transacciones cerradas ese día
            // La fecha puede estar en formato DD/MM/YYYY HH:MM:SS o ISO
            const transacciones = await window.electronAPI.dbQuery(`
                SELECT 
                    t.*,
                    c.nombre || ' ' || c.apellido as nombre_cliente
                FROM Transacciones t
                JOIN Clientes c ON t.id_cliente = c.id
                WHERE t.estado = 'cerrada'
                AND (
                    -- Si la fecha está en formato DD/MM/YYYY HH:MM:SS
                    t.fecha_cierre LIKE ? || '%'
                    OR
                    -- Si la fecha está en formato ISO (YYYY-MM-DD)
                    strftime('%Y-%m-%d', t.fecha_cierre) = ?
                )
            `, [fechaFormato, fechaInput]);

            // Obtener servicios realizados ese día
            // La fecha puede estar en formato DD/MM/YYYY HH:MM:SS o ISO
            // Incluir información de la transacción para saber la moneda de pago
            // Incluir propinas independientes (id_servicio NULL o 0) incluso si la transacción está abierta
            const servicios = await window.electronAPI.dbQuery(`
                SELECT 
                    sr.*,
                    COALESCE(s.nombre, 'Propina Independiente') as nombre_servicio,
                    COALESCE(s.referencia_en_dolares, 0) as servicio_referencia_dolares,
                    e.nombre || ' ' || e.apellido as nombre_empleado,
                    COALESCE(t.pagado_bs, 0) as pagado_bs,
                    COALESCE(t.pagado_dolares, 0) as pagado_dolares,
                    COALESCE(t.total_en_bs, 0) as transaccion_total_bs,
                    COALESCE(t.total_en_dolares, 0) as transaccion_total_dolares,
                    t.estado as transaccion_estado
                FROM ServiciosRealizados sr
                LEFT JOIN Servicios s ON sr.id_servicio = s.id
                JOIN Empleados e ON sr.id_empleado = e.id
                JOIN Transacciones t ON sr.id_transaccion = t.id
                WHERE sr.estado = 'completado'
                AND (
                    -- Si la fecha está en formato DD/MM/YYYY HH:MM:SS
                    sr.fecha LIKE ? || '%'
                    OR
                    -- Si la fecha está en formato ISO (YYYY-MM-DD)
                    strftime('%Y-%m-%d', sr.fecha) = ?
                )
                AND (
                    -- Incluir servicios de transacciones cerradas
                    (t.estado = 'cerrada')
                    OR
                    -- Incluir propinas independientes incluso si la transacción está abierta
                    (sr.id_servicio IS NULL OR sr.id_servicio = 0)
                )
                ORDER BY e.nombre, e.apellido, sr.id DESC
            `, [fechaFormato, fechaInput]);

            // Obtener productos vendidos ese día
            // La fecha puede estar en formato DD/MM/YYYY HH:MM:SS o ISO
            const productos = await window.electronAPI.dbQuery(`
                SELECT 
                    pv.*,
                    p.nombre as nombre_producto
                FROM ProductosVendidos pv
                JOIN Productos p ON pv.id_producto = p.id
                WHERE (
                    -- Si la fecha está en formato DD/MM/YYYY HH:MM:SS
                    pv.fecha LIKE ? || '%'
                    OR
                    -- Si la fecha está en formato ISO (YYYY-MM-DD)
                    strftime('%Y-%m-%d', pv.fecha) = ?
                )
                ORDER BY pv.id DESC
            `, [fechaFormato, fechaInput]);

            // Calcular totales
            // Separar nóminas por moneda de pago
            const totalNominasBs = nominas
                .filter(n => n.moneda_pago === 'bs' || n.moneda_pago === 'mixto')
                .reduce((sum, n) => sum + parseFloat(n.total_pagado_bs || 0), 0);
            // IMPORTANTE: Aplicar redondeo hacia abajo (floor) a cada nómina en dólares antes de sumar
            // Cualquier cantidad decimal se redondea hacia abajo a favor del comercio
            const totalNominasDolares = nominas
                .filter(n => n.moneda_pago === 'dolares' || n.moneda_pago === 'mixto')
                .reduce((sum, n) => sum + Math.floor(parseFloat(n.total_pagado_dolares || 0)), 0);
            const totalNominas = totalNominasBs; // Mantener para compatibilidad
            
            const totalServicios = servicios.length;
            const totalProductos = productos.reduce((sum, p) => sum + parseInt(p.cantidad || 0), 0);
            const totalTransacciones = transacciones.length;
            
            // Calcular ingresos SIN propinas
            // IMPORTANTE: Para transacciones cerradas, calcular la proporción de servicios vs productos
            // y distribuir el pago (pagado_bs y pagado_dolares) según esa proporción
            let totalIngresosBs = 0;
            let totalIngresosDolares = 0;
            
            // Calcular total de propinas del día (tanto de servicios como independientes)
            let totalPropinasBs = 0;
            let totalPropinasDolares = 0;
            
            servicios.forEach(s => {
                // Sumar propinas de servicios regulares e independientes
                totalPropinasBs += parseFloat(s.propina || 0);
                totalPropinasDolares += parseFloat(s.propina_en_dolares || 0);
            });
            
            // Agrupar transacciones para evitar duplicados
            const transaccionesProcesadas = new Set();
            
            // Para transacciones cerradas, calcular ingresos basados en lo que se pagó
            transacciones.forEach(t => {
                if (t.estado === 'cerrada' && !transaccionesProcesadas.has(t.id)) {
                    const pagadoBs = parseFloat(t.pagado_bs || 0);
                    const pagadoDolares = parseFloat(t.pagado_dolares || 0);
                    
                    // Obtener total de servicios y productos de la transacción (sin propinas)
                    const totalServiciosTransaccionBs = servicios
                        .filter(s => s.id_transaccion === t.id && s.id_servicio && s.id_servicio !== 0)
                        .reduce((sum, s) => sum + parseFloat(s.precio_cobrado || 0), 0);
                    
                    const totalProductosTransaccionBs = productos
                        .filter(p => p.id_transaccion === t.id)
                        .reduce((sum, p) => sum + parseFloat(p.precio_total || 0), 0);
                    
                    const totalServiciosYProductosBs = totalServiciosTransaccionBs + totalProductosTransaccionBs;
                    
                    if (totalServiciosYProductosBs > 0) {
                        // Calcular proporción de servicios vs productos
                        const proporcionServicios = totalServiciosTransaccionBs / totalServiciosYProductosBs;
                        const proporcionProductos = totalProductosTransaccionBs / totalServiciosYProductosBs;
                        
                        // Distribuir el pago según la proporción de servicios/productos
                        if (pagadoBs > 0 && pagadoDolares > 0) {
                            // Pago mixto: distribuir proporcionalmente
                            // La parte de servicios se distribuye entre Bs y $ según lo que se pagó
                            // Ejemplo: Si se pagó 2500 Bs + 10$ y servicios son 83.33% del total:
                            // - Servicios en Bs: 2500 * 0.8333 = 2083.33 Bs
                            // - Servicios en $: 10 * 0.8333 = 8.33$
                            // - Productos en Bs: 2500 * 0.1667 = 416.67 Bs
                            // NOTA: proporcionServicios + proporcionProductos = 1, así que:
                            // totalIngresosBs = pagadoBs * (proporcionServicios + proporcionProductos) = pagadoBs
                            totalIngresosBs += pagadoBs; // Equivale a (pagadoBs * proporcionServicios) + (pagadoBs * proporcionProductos)
                            totalIngresosDolares += (pagadoDolares * proporcionServicios);
                            
                        } else if (pagadoBs > 0) {
                            // Solo bolívares: servicios y productos van a bolívares
                            totalIngresosBs += pagadoBs;
                        } else if (pagadoDolares > 0) {
                            // Solo dólares: solo servicios van a dólares, productos se convierten a Bs
                            const tasaValor = tasa ? parseFloat(tasa.tasa_bs_por_dolar) : 1;
                            totalIngresosDolares += (pagadoDolares * proporcionServicios);
                            // Productos: convertir a bolívares
                            totalIngresosBs += (pagadoDolares * proporcionProductos * tasaValor);
                        }
                    } else {
                        // Si no hay servicios ni productos, asignar todo a bolívares por defecto
                        totalIngresosBs += pagadoBs;
                    }
                    
                    transaccionesProcesadas.add(t.id);
                }
            });
            
            // Para transacciones abiertas o servicios sin transacción cerrada, calcular proporcionalmente
            servicios.forEach(s => {
                const esPropinaIndependiente = !s.id_servicio || s.id_servicio === 0;
                const transaccionEstado = s.transaccion_estado || 'cerrada';
                
                // Solo procesar si la transacción no está cerrada o no fue procesada
                if (!esPropinaIndependiente && transaccionEstado !== 'cerrada' && !transaccionesProcesadas.has(s.id_transaccion)) {
                    const precioServicioBs = parseFloat(s.precio_cobrado || 0);
                    const precioServicioDolares = parseFloat(s.servicio_referencia_dolares || 0);
                    const totalBs = parseFloat(s.transaccion_total_bs || 0);
                    const totalDolares = parseFloat(s.transaccion_total_dolares || 0);
                    
                    if (totalBs > 0 && totalDolares === 0) {
                        // Solo bolívares
                        totalIngresosBs += precioServicioBs;
                    } else if (totalDolares > 0 && totalBs === 0) {
                        // Solo dólares
                        if (precioServicioDolares > 0) {
                            totalIngresosDolares += precioServicioDolares;
                        }
                    } else if (totalBs > 0 && totalDolares > 0) {
                        // Mixto: calcular proporción
                        const tasaValor = tasa ? parseFloat(tasa.tasa_bs_por_dolar) : 1;
                        const totalEquivalenteBs = totalBs + (totalDolares * tasaValor);
                        if (totalEquivalenteBs > 0) {
                            const proporcionBs = totalBs / totalEquivalenteBs;
                            const proporcionDolares = (totalDolares * tasaValor) / totalEquivalenteBs;
                            totalIngresosBs += precioServicioBs * proporcionBs;
                            if (precioServicioDolares > 0) {
                                totalIngresosDolares += precioServicioDolares * proporcionDolares;
                            }
                        }
                    } else {
                        // Sin información, asignar a bolívares
                        totalIngresosBs += precioServicioBs;
                    }
                }
            });
            
            // Sumar productos vendidos de transacciones abiertas (siempre en bolívares)
            productos.forEach(p => {
                if (!transaccionesProcesadas.has(p.id_transaccion)) {
                    totalIngresosBs += parseFloat(p.precio_total || 0);
                }
            });
            
            // Calcular balance/neto (Ingresos - Nóminas)
            const balanceBs = totalIngresosBs - totalNominasBs;
            const balanceDolares = totalIngresosDolares - totalNominasDolares;
            
            // Contar movimientos por método de pago y entidad
            const movimientosPorMetodo = {};
            const movimientosPorEntidad = {};
            
            transacciones.forEach(t => {
                if (t.metodos_pago) {
                    const metodos = t.metodos_pago.split(',');
                    metodos.forEach(m => {
                        m = m.trim();
                        movimientosPorMetodo[m] = (movimientosPorMetodo[m] || 0) + 1;
                    });
                }
                
                if (t.entidades_pago) {
                    const entidades = t.entidades_pago.split(',');
                    entidades.forEach(e => {
                        e = e.trim();
                        movimientosPorEntidad[e] = (movimientosPorEntidad[e] || 0) + 1;
                    });
                }
            });

            // Crear resumen JSON
            const resumen = JSON.stringify({
                tasa: tasa ? {
                    fecha: tasa.fecha,
                    tasa_bs_por_dolar: tasa.tasa_bs_por_dolar
                } : null,
                nominas: nominas.map(n => ({
                    empleado: n.nombre_empleado,
                    comisiones_bs: n.comisiones_bs,
                    comisiones_dolares: n.comisiones_referencia_en_dolares || 0,
                    propinas_dolares: n.propina_en_dolares,
                    propinas_bs: n.propina_bs,
                    descuentos_bs: n.descuentos_consumos_bs,
                    total_pagado_bs: n.total_pagado_bs,
                    total_pagado_dolares: n.total_pagado_dolares || 0,
                    moneda_pago: n.moneda_pago || 'bs'
                })),
                totales: {
                    ingresos_bs: totalIngresosBs,
                    ingresos_dolares: totalIngresosDolares,
                    nominas_bs: totalNominasBs,
                    nominas_dolares: totalNominasDolares,
                    balance_bs: balanceBs,
                    balance_dolares: balanceDolares
                },
                transacciones: transacciones.map(t => ({
                    cliente: t.nombre_cliente,
                    total_bs: t.total_en_bs,
                    total_dolares: t.total_en_dolares,
                    metodos_pago: t.metodos_pago,
                    entidades_pago: t.entidades_pago,
                    numero_referencia: t.numero_referencia,
                    pagado_bs: t.pagado_bs || 0,
                    pagado_dolares: t.pagado_dolares || 0
                })),
                movimientosPorMetodo: movimientosPorMetodo,
                movimientosPorEntidad: movimientosPorEntidad,
                servicios: servicios.map(s => ({
                    nombre: s.nombre_servicio,
                    empleado: s.nombre_empleado,
                    precio: s.precio_cobrado,
                    precio_dolares: tasa ? (parseFloat(s.precio_cobrado || 0) / parseFloat(tasa.tasa_bs_por_dolar)).toFixed(2) : '0.00',
                    propina: s.propina,
                    propina_dolares: s.propina_en_dolares || 0,
                    pagado_bs: s.pagado_bs || 0,
                    pagado_dolares: s.pagado_dolares || 0
                })),
                productos: productos.map(p => ({
                    nombre: p.nombre_producto,
                    cantidad: p.cantidad,
                    precio_total: p.precio_total,
                    precio_total_dolares: tasa ? (parseFloat(p.precio_total || 0) / parseFloat(tasa.tasa_bs_por_dolar)).toFixed(2) : '0.00'
                }))
            });

            // Fecha de creación - usar zona horaria local en formato DD/MM/YYYY HH:MM:SS
            const fechaCreacion = window.obtenerFechaHoraLocal ? window.obtenerFechaHoraLocal() : new Date().toISOString();

            // Guardar reporte
            await window.electronAPI.dbRun(
                `INSERT INTO ReportesDiarios 
                (fecha_reporte, fecha_creacion, tasa_cambio, total_nominas_pagadas, total_servicios, total_productos_vendidos, total_transacciones, total_ingresos_bs, total_ingresos_dolares, resumen) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [fechaFormato, fechaCreacion, tasa ? tasa.tasa_bs_por_dolar : null, totalNominas, totalServicios, totalProductos, totalTransacciones, totalIngresosBs, totalIngresosDolares, resumen]
            );

            cerrarModal();
            await cargarReportes();
            mostrarExito('Reporte generado correctamente');
        } catch (error) {
            console.error('Error al generar reporte:', error);
            mostrarError('Error al generar el reporte: ' + (error.message || 'Error desconocido'));
        }
    }

    // Ver detalles del reporte
    window.verReporte = async function(id) {
        try {
            const reporte = await window.electronAPI.dbGet(
                'SELECT * FROM ReportesDiarios WHERE id = ?',
                [id]
            );
            
            if (!reporte) {
                mostrarError('Reporte no encontrado');
                return;
            }

            const resumen = JSON.parse(reporte.resumen || '{}');
            
            // Obtener tasa de cambio del reporte para calcular precios en dólares si no están guardados
            const tasaCambio = reporte.tasa_cambio ? parseFloat(reporte.tasa_cambio) : null;
            
            // Formatear fecha
            let fechaReporte = reporte.fecha_reporte;
            
            document.getElementById('ver-reporte-titulo').textContent = `Reporte del ${fechaReporte}`;
            
            const contenido = document.getElementById('ver-reporte-contenido');
            contenido.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Resumen General</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Tasa del Día:</strong> ${reporte.tasa_cambio ? parseFloat(reporte.tasa_cambio).toFixed(2) + ' Bs/$' : 'No establecida'}</p>
                            <p><strong>Total Servicios:</strong> ${parseInt(reporte.total_servicios || 0)}</p>
                            <p><strong>Total Productos Vendidos:</strong> ${parseInt(reporte.total_productos_vendidos || 0)}</p>
                            <p><strong>Total Transacciones:</strong> ${parseInt(reporte.total_transacciones || 0)}</p>
                        </div>
                    </div>

                    ${resumen.totales ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Subtotales</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                            <div style="border: 1px solid var(--border-color); padding: 10px; border-radius: 6px;">
                                <h5 style="margin-top: 0; margin-bottom: 10px; color: var(--text-primary);">Ingresos</h5>
                                <p style="margin: 5px 0;"><strong>Total Ingresos (Bs):</strong> ${parseFloat(resumen.totales.ingresos_bs || 0).toFixed(2)} Bs</p>
                                <p style="margin: 5px 0;"><strong>Total Ingresos ($):</strong> $${parseFloat(resumen.totales.ingresos_dolares || 0).toFixed(2)}</p>
                            </div>
                            <div style="border: 1px solid var(--border-color); padding: 10px; border-radius: 6px;">
                                <h5 style="margin-top: 0; margin-bottom: 10px; color: var(--text-primary);">Nóminas Pagadas</h5>
                                <p style="margin: 5px 0;"><strong>Total Nóminas (Bs):</strong> ${parseFloat(resumen.totales.nominas_bs || 0).toFixed(2)} Bs</p>
                                <p style="margin: 5px 0;"><strong>Total Nóminas ($):</strong> $${parseFloat(resumen.totales.nominas_dolares || 0).toFixed(2)}</p>
                            </div>
                        </div>
                        <div style="margin-top: 15px; padding: 15px; background: var(--bg-primary); border: 2px solid var(--border-color); border-radius: 6px;">
                            <h5 style="margin-top: 0; margin-bottom: 10px; color: var(--text-primary);">Balance Neto (Ingresos - Nóminas)</h5>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                <p style="margin: 5px 0; font-size: 18px;"><strong>Balance (Bs):</strong> <span style="color: ${parseFloat(resumen.totales.balance_bs || 0) >= 0 ? '#4caf50' : '#f44336'}">${parseFloat(resumen.totales.balance_bs || 0).toFixed(2)} Bs</span></p>
                                <p style="margin: 5px 0; font-size: 18px;"><strong>Balance ($):</strong> <span style="color: ${parseFloat(resumen.totales.balance_dolares || 0) >= 0 ? '#4caf50' : '#f44336'}">$${parseFloat(resumen.totales.balance_dolares || 0).toFixed(2)}</span></p>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${resumen.nominas && resumen.nominas.length > 0 ? (() => {
                        // Separar nóminas por moneda de pago
                        const nominasBs = resumen.nominas.filter(n => n.moneda_pago === 'bs');
                        const nominasDolares = resumen.nominas.filter(n => n.moneda_pago === 'dolares');
                        const nominasMixto = resumen.nominas.filter(n => n.moneda_pago === 'mixto');
                        
                        let html = '';
                        
                        // Nóminas pagadas en Bolívares
                        if (nominasBs.length > 0) {
                            html += `
                            <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                                <h4 style="margin-top: 0; color: var(--text-primary);">Nóminas Pagadas en Bolívares (${nominasBs.length})</h4>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid var(--border-color);">
                                            <th style="text-align: left; padding: 8px;">Empleado</th>
                                            <th style="text-align: right; padding: 8px;">Comisiones (Bs)</th>
                                            <th style="text-align: right; padding: 8px;">Propinas (Bs)</th>
                                            <th style="text-align: right; padding: 8px;">Descuentos</th>
                                            <th style="text-align: right; padding: 8px;">Total (Bs)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${nominasBs.map(n => `
                                            <tr style="border-bottom: 1px solid var(--border-color);">
                                                <td style="padding: 8px;">${n.empleado}</td>
                                                <td style="text-align: right; padding: 8px;">${parseFloat(n.comisiones_bs || 0).toFixed(2)} Bs</td>
                                                <td style="text-align: right; padding: 8px;">${parseFloat(n.propinas_bs || 0).toFixed(2)} Bs</td>
                                                <td style="text-align: right; padding: 8px;">${parseFloat(n.descuentos_bs || 0).toFixed(2)} Bs</td>
                                                <td style="text-align: right; padding: 8px;"><strong>${parseFloat(n.total_pagado_bs || 0).toFixed(2)} Bs</strong></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            `;
                        }
                        
                        // Nóminas pagadas en Dólares
                        if (nominasDolares.length > 0) {
                            // Calcular totales usando el mismo método que las filas individuales
                            let totalComisionesDolares = 0;
                            let totalPropinasDolares = 0;
                            let totalPagadoDolares = 0;
                            
                            nominasDolares.forEach(n => {
                                const comisiones = parseFloat(n.comisiones_dolares || 0);
                                const propinas = parseFloat(n.propinas_dolares || 0);
                                const total = parseFloat(n.total_pagado_dolares || 0) || (comisiones + propinas);
                                
                                totalComisionesDolares += comisiones;
                                totalPropinasDolares += propinas;
                                totalPagadoDolares += total;
                            });
                            
                            html += `
                            <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                                <h4 style="margin-top: 0; color: var(--text-primary);">Nóminas Pagadas en Dólares (${nominasDolares.length})</h4>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid var(--border-color);">
                                            <th style="text-align: left; padding: 8px;">Empleado</th>
                                            <th style="text-align: right; padding: 8px;">Comisiones ($)</th>
                                            <th style="text-align: right; padding: 8px;">Propinas ($)</th>
                                            <th style="text-align: right; padding: 8px;">Total ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${nominasDolares.map(n => {
                                            // Calcular total si no está guardado (suma de comisiones + propinas)
                                            const totalDolares = parseFloat(n.total_pagado_dolares || 0) || 
                                                                (parseFloat(n.comisiones_dolares || 0) + parseFloat(n.propinas_dolares || 0));
                                            return `
                                            <tr style="border-bottom: 1px solid var(--border-color);">
                                                <td style="padding: 8px;">${n.empleado}</td>
                                                <td style="text-align: right; padding: 8px;">$${parseFloat(n.comisiones_dolares || 0).toFixed(2)}</td>
                                                <td style="text-align: right; padding: 8px;">$${parseFloat(n.propinas_dolares || 0).toFixed(2)}</td>
                                                <td style="text-align: right; padding: 8px;"><strong>$${totalDolares.toFixed(2)}</strong></td>
                                            </tr>
                                        `;
                                        }).join('')}
                                        <tr style="border-top: 2px solid var(--border-color); font-weight: bold; background: var(--bg-primary);">
                                            <td style="padding: 8px;"><strong>Total</strong></td>
                                            <td style="text-align: right; padding: 8px;"><strong>$${totalComisionesDolares.toFixed(2)}</strong></td>
                                            <td style="text-align: right; padding: 8px;"><strong>$${totalPropinasDolares.toFixed(2)}</strong></td>
                                            <td style="text-align: right; padding: 8px;"><strong>$${totalPagadoDolares.toFixed(2)}</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            `;
                        }
                        
                        // Nóminas pagadas Mixto
                        if (nominasMixto.length > 0) {
                            html += `
                            <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                                <h4 style="margin-top: 0; color: var(--text-primary);">Nóminas Pagadas Mixto (${nominasMixto.length})</h4>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid var(--border-color);">
                                            <th style="text-align: left; padding: 8px;">Empleado</th>
                                            <th style="text-align: right; padding: 8px;">Comisiones (Bs)</th>
                                            <th style="text-align: right; padding: 8px;">Comisiones Ref. ($)</th>
                                            <th style="text-align: right; padding: 8px;">Propinas (Bs)</th>
                                            <th style="text-align: right; padding: 8px;">Propinas Ref. ($)</th>
                                            <th style="text-align: right; padding: 8px;">Descuentos</th>
                                            <th style="text-align: right; padding: 8px;">Total (Bs)</th>
                                            <th style="text-align: right; padding: 8px;">Total ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${nominasMixto.map(n => `
                                            <tr style="border-bottom: 1px solid var(--border-color);">
                                                <td style="padding: 8px;">${n.empleado}</td>
                                                <td style="text-align: right; padding: 8px;">${parseFloat(n.comisiones_bs || 0).toFixed(2)} Bs</td>
                                                <td style="text-align: right; padding: 8px;">$${parseFloat(n.comisiones_dolares || 0).toFixed(2)}</td>
                                                <td style="text-align: right; padding: 8px;">${parseFloat(n.propinas_bs || 0).toFixed(2)} Bs</td>
                                                <td style="text-align: right; padding: 8px;">$${parseFloat(n.propinas_dolares || 0).toFixed(2)}</td>
                                                <td style="text-align: right; padding: 8px;">${parseFloat(n.descuentos_bs || 0).toFixed(2)} Bs</td>
                                                <td style="text-align: right; padding: 8px;"><strong>${parseFloat(n.total_pagado_bs || 0).toFixed(2)} Bs</strong></td>
                                                <td style="text-align: right; padding: 8px;"><strong>$${parseFloat(n.total_pagado_dolares || 0).toFixed(2)}</strong></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            `;
                        }
                        
                        return html;
                    })() : ''}

                    ${resumen.movimientosPorMetodo && Object.keys(resumen.movimientosPorMetodo).length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Movimientos por Método de Pago</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px;">Método de Pago</th>
                                    <th style="text-align: right; padding: 8px;">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(resumen.movimientosPorMetodo).map(([metodo, cantidad]) => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${metodo}</td>
                                        <td style="text-align: right; padding: 8px;"><strong>${cantidad}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}

                    ${resumen.movimientosPorEntidad && Object.keys(resumen.movimientosPorEntidad).length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Movimientos por Entidad</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px;">Entidad</th>
                                    <th style="text-align: right; padding: 8px;">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(resumen.movimientosPorEntidad).map(([entidad, cantidad]) => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${entidad}</td>
                                        <td style="text-align: right; padding: 8px;"><strong>${cantidad}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}

                    ${resumen.transacciones && resumen.transacciones.length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Transacciones Cerradas (${resumen.transacciones.length})</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px;">Cliente</th>
                                    <th style="text-align: right; padding: 8px;">Pagado (Bs)</th>
                                    <th style="text-align: right; padding: 8px;">Pagado ($)</th>
                                    <th style="text-align: left; padding: 8px;">Método de Pago</th>
                                    <th style="text-align: left; padding: 8px;">Entidad</th>
                                    <th style="text-align: left; padding: 8px;">Referencia</th>
                                    <th style="text-align: left; padding: 8px;">Moneda Pago</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${resumen.transacciones.map(t => {
                                    const pagadoBs = parseFloat(t.pagado_bs || 0);
                                    const pagadoDolares = parseFloat(t.pagado_dolares || 0);
                                    let monedaPago = 'No especificado';
                                    if (pagadoBs > 0 && pagadoDolares > 0) {
                                        monedaPago = 'Mixto (Bs y $)';
                                    } else if (pagadoBs > 0) {
                                        monedaPago = 'Bolívares (Bs)';
                                    } else if (pagadoDolares > 0) {
                                        monedaPago = 'Dólares ($)';
                                    }
                                    
                                    // Formatear métodos de pago para mostrar
                                    let metodosPagoTexto = 'N/A';
                                    if (t.metodos_pago) {
                                        metodosPagoTexto = t.metodos_pago.split(',').map(m => m.trim()).join(', ');
                                    }
                                    
                                    return `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${t.cliente}</td>
                                        <td style="text-align: right; padding: 8px;">${pagadoBs.toFixed(2)} Bs</td>
                                        <td style="text-align: right; padding: 8px;">$${pagadoDolares.toFixed(2)}</td>
                                        <td style="padding: 8px;">${metodosPagoTexto}</td>
                                        <td style="padding: 8px;">${t.entidades_pago || 'N/A'}</td>
                                        <td style="padding: 8px;">${t.numero_referencia || 'N/A'}</td>
                                        <td style="padding: 8px;">${monedaPago}</td>
                                    </tr>
                                `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}

                    ${resumen.servicios && resumen.servicios.length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Servicios Realizados por Empleado</h4>
                        ${(() => {
                            // Agrupar servicios por empleado
                            const serviciosPorEmpleado = {};
                            resumen.servicios.forEach(s => {
                                if (!serviciosPorEmpleado[s.empleado]) {
                                    serviciosPorEmpleado[s.empleado] = {
                                        empleado: s.empleado,
                                        servicios: [],
                                        totalServicios: 0,
                                        pagadoBs: s.pagado_bs || 0,
                                        pagadoDolares: s.pagado_dolares || 0
                                    };
                                }
                                serviciosPorEmpleado[s.empleado].servicios.push(s);
                                serviciosPorEmpleado[s.empleado].totalServicios++;
                            });
                            
                            // Determinar moneda de pago para cada empleado
                            Object.values(serviciosPorEmpleado).forEach(emp => {
                                const pagadoBs = emp.pagadoBs;
                                const pagadoDolares = emp.pagadoDolares;
                                if (pagadoBs > 0 && pagadoDolares > 0) {
                                    emp.monedaPago = 'Mixto (Bs y $)';
                                } else if (pagadoBs > 0) {
                                    emp.monedaPago = 'Bolívares (Bs)';
                                } else if (pagadoDolares > 0) {
                                    emp.monedaPago = 'Dólares ($)';
                                } else {
                                    emp.monedaPago = 'No especificado';
                                }
                            });
                            
                            return Object.values(serviciosPorEmpleado).map(emp => `
                                <div style="margin-bottom: 20px; border-bottom: 2px solid var(--border-color); padding-bottom: 15px;">
                                    <h5 style="margin-top: 0; margin-bottom: 10px; color: var(--text-primary);">
                                        ${emp.empleado} - ${emp.totalServicios} servicio(s) - Moneda: ${emp.monedaPago}
                                    </h5>
                                    <table style="width: 100%; border-collapse: collapse; margin-left: 20px;">
                                        <thead>
                                            <tr style="border-bottom: 1px solid var(--border-color);">
                                                <th style="text-align: left; padding: 8px;">Servicio</th>
                                                <th style="text-align: right; padding: 8px;">Precio (Bs)</th>
                                                <th style="text-align: right; padding: 8px;">Precio ($)</th>
                                                <th style="text-align: right; padding: 8px;">Propina (Bs)</th>
                                                <th style="text-align: right; padding: 8px;">Propina ($)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${emp.servicios.map(s => {
                                                const esPropinaIndependiente = s.nombre === 'Propina Independiente';
                                                const precioTexto = esPropinaIndependiente ? 'N/A' : `${parseFloat(s.precio || 0).toFixed(2)} Bs`;
                                                // Calcular precio en dólares si no está guardado (para reportes antiguos)
                                                let precioDolares = parseFloat(s.precio_dolares || 0);
                                                if (precioDolares === 0 && !esPropinaIndependiente && tasaCambio && parseFloat(s.precio || 0) > 0) {
                                                    precioDolares = parseFloat(s.precio || 0) / tasaCambio;
                                                }
                                                const precioDolaresTexto = esPropinaIndependiente ? 'N/A' : `$${precioDolares.toFixed(2)}`;
                                                return `
                                                <tr style="border-bottom: 1px solid var(--border-color);">
                                                    <td style="padding: 8px;">${s.nombre}</td>
                                                    <td style="text-align: right; padding: 8px;">${precioTexto}</td>
                                                    <td style="text-align: right; padding: 8px;">${precioDolaresTexto}</td>
                                                    <td style="text-align: right; padding: 8px;">${parseFloat(s.propina || 0).toFixed(2)} Bs</td>
                                                    <td style="text-align: right; padding: 8px;">$${parseFloat(s.propina_dolares || 0).toFixed(2)}</td>
                                                </tr>
                                            `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `).join('');
                        })()}
                    </div>
                    ` : ''}

                    ${resumen.productos && resumen.productos.length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Productos Vendidos (${resumen.productos.length})</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px;">Producto</th>
                                    <th style="text-align: right; padding: 8px;">Cantidad</th>
                                    <th style="text-align: right; padding: 8px;">Total (Bs)</th>
                                    <th style="text-align: right; padding: 8px;">Total ($)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${resumen.productos.map(p => {
                                    // Calcular precio en dólares si no está guardado (para reportes antiguos)
                                    let precioTotalDolares = parseFloat(p.precio_total_dolares || 0);
                                    if (precioTotalDolares === 0 && tasaCambio && parseFloat(p.precio_total || 0) > 0) {
                                        precioTotalDolares = parseFloat(p.precio_total || 0) / tasaCambio;
                                    }
                                    return `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${p.nombre}</td>
                                        <td style="text-align: right; padding: 8px;">${p.cantidad}</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(p.precio_total).toFixed(2)} Bs</td>
                                        <td style="text-align: right; padding: 8px;">$${precioTotalDolares.toFixed(2)}</td>
                                    </tr>
                                `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}
                </div>
            `;

            document.getElementById('ver-reporte-modal').classList.add('active');
        } catch (error) {
            console.error('Error al cargar reporte:', error);
            mostrarError('Error al cargar el reporte');
        }
    };

    // Eliminar reporte
    window.eliminarReporte = function(id) {
        reporteAEliminar = id;
        document.getElementById('delete-modal').classList.add('active');
    };

    // Confirmar eliminación
    async function eliminarReporteConfirmado() {
        if (!reporteAEliminar) return;

        try {
            await window.electronAPI.dbRun('DELETE FROM ReportesDiarios WHERE id = ?', [reporteAEliminar]);
            cerrarModalEliminar();
            await cargarReportes();
            mostrarExito('Reporte eliminado correctamente');
            reporteAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar reporte:', error);
            mostrarError('Error al eliminar el reporte');
            reporteAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModal() {
        document.getElementById('reporte-modal').classList.remove('active');
    }

    function cerrarModalVer() {
        document.getElementById('ver-reporte-modal').classList.remove('active');
    }

    function cerrarModalEliminar() {
        document.getElementById('delete-modal').classList.remove('active');
        reporteAEliminar = null;
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

