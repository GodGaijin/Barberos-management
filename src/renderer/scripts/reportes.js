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

    // Inicialización - función exportada para ser llamada desde main.js
    window.initReportes = function() {
        console.log('initReportes llamado');
        setTimeout(() => {
            try {
                console.log('Configurando event listeners...');
                setupEventListeners();
                console.log('Cargando datos...');
                cargarReportes();
                window.reportesModule.initialized = true;
                console.log('Reportes inicializados correctamente');
            } catch (error) {
                console.error('Error al inicializar reportes:', error);
                const tbody = document.getElementById('reportes-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="7" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

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
            console.log('Iniciando carga de reportes...');
            const tbody = document.getElementById('reportes-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">Cargando reportes...</td></tr>';
            }
            
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            console.log('Consultando base de datos...');
            const resultados = await window.electronAPI.dbQuery(`
                SELECT * FROM ReportesDiarios
                ORDER BY id DESC
            `);
            console.log('Reportes obtenidos:', resultados);
            
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
        
        if (listaReportes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay reportes generados</td></tr>';
            return;
        }

        tbody.innerHTML = listaReportes.map((reporte, index) => {
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
            
            return `
                <tr>
                    <td>#${index + 1}</td>
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
    }
    
    // Exponer función para uso externo
    window.mostrarReportes = mostrarReportes;

    // Filtrar reportes
    function filtrarReportes() {
        const searchTerm = document.getElementById('search-reporte').value.toLowerCase();
        const filterFecha = document.getElementById('filter-fecha').value;

        let reportesFiltrados = reportes;

        // Filtrar por fecha
        if (filterFecha) {
            const [year, month, day] = filterFecha.split('-');
            const fechaFormato = `${day}/${month}/${year}`;
            reportesFiltrados = reportesFiltrados.filter(r => r.fecha_reporte === fechaFormato);
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            reportesFiltrados = reportesFiltrados.filter(reporte => {
                const fecha = (reporte.fecha_reporte || '').toLowerCase();
                return fecha.includes(searchTerm);
            });
        }

        mostrarReportes(reportesFiltrados);
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

            // Obtener nóminas pagadas ese día
            const nominas = await window.electronAPI.dbQuery(`
                SELECT 
                    n.*,
                    e.nombre || ' ' || e.apellido as nombre_empleado
                FROM Nominas n
                JOIN Empleados e ON n.id_empleado = e.id
                WHERE n.fecha_pago = ?
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
            const servicios = await window.electronAPI.dbQuery(`
                SELECT 
                    sr.*,
                    s.nombre as nombre_servicio,
                    e.nombre || ' ' || e.apellido as nombre_empleado
                FROM ServiciosRealizados sr
                JOIN Servicios s ON sr.id_servicio = s.id
                JOIN Empleados e ON sr.id_empleado = e.id
                WHERE sr.estado = 'completado'
                AND (
                    -- Si la fecha está en formato DD/MM/YYYY HH:MM:SS
                    sr.fecha LIKE ? || '%'
                    OR
                    -- Si la fecha está en formato ISO (YYYY-MM-DD)
                    strftime('%Y-%m-%d', sr.fecha) = ?
                )
                ORDER BY sr.id DESC
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
            const totalNominas = nominas.reduce((sum, n) => sum + parseFloat(n.total_pagado_bs || 0), 0);
            const totalServicios = servicios.length;
            const totalProductos = productos.reduce((sum, p) => sum + parseInt(p.cantidad || 0), 0);
            const totalTransacciones = transacciones.length;
            const totalIngresosBs = transacciones.reduce((sum, t) => sum + parseFloat(t.total_en_bs || 0), 0);
            const totalIngresosDolares = transacciones.reduce((sum, t) => sum + parseFloat(t.total_en_dolares || 0), 0);

            // Crear resumen JSON
            const resumen = JSON.stringify({
                tasa: tasa ? {
                    fecha: tasa.fecha,
                    tasa_bs_por_dolar: tasa.tasa_bs_por_dolar
                } : null,
                nominas: nominas.map(n => ({
                    empleado: n.nombre_empleado,
                    comisiones_bs: n.comisiones_bs,
                    propinas_dolares: n.propina_en_dolares,
                    propinas_bs: n.propina_bs,
                    descuentos_bs: n.descuentos_consumos_bs,
                    total_pagado_bs: n.total_pagado_bs
                })),
                transacciones: transacciones.map(t => ({
                    cliente: t.nombre_cliente,
                    total_bs: t.total_en_bs,
                    total_dolares: t.total_en_dolares,
                    metodos_pago: t.metodos_pago,
                    entidades_pago: t.entidades_pago
                })),
                servicios: servicios.map(s => ({
                    nombre: s.nombre_servicio,
                    empleado: s.nombre_empleado,
                    precio: s.precio_cobrado,
                    propina: s.propina
                })),
                productos: productos.map(p => ({
                    nombre: p.nombre_producto,
                    cantidad: p.cantidad,
                    precio_total: p.precio_total
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
                            <p><strong>Total Nóminas Pagadas:</strong> ${parseFloat(reporte.total_nominas_pagadas || 0).toFixed(2)} Bs</p>
                            <p><strong>Total Servicios:</strong> ${parseInt(reporte.total_servicios || 0)}</p>
                            <p><strong>Total Productos Vendidos:</strong> ${parseInt(reporte.total_productos_vendidos || 0)}</p>
                            <p><strong>Total Transacciones:</strong> ${parseInt(reporte.total_transacciones || 0)}</p>
                            <p><strong>Total Ingresos:</strong> ${parseFloat(reporte.total_ingresos_bs || 0).toFixed(2)} Bs ($${parseFloat(reporte.total_ingresos_dolares || 0).toFixed(2)})</p>
                        </div>
                    </div>

                    ${resumen.nominas && resumen.nominas.length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Nóminas Pagadas (${resumen.nominas.length})</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px;">Empleado</th>
                                    <th style="text-align: right; padding: 8px;">Comisiones</th>
                                    <th style="text-align: right; padding: 8px;">Propinas Ref. ($)</th>
                                    <th style="text-align: right; padding: 8px;">Propinas (Bs)</th>
                                    <th style="text-align: right; padding: 8px;">Descuentos</th>
                                    <th style="text-align: right; padding: 8px;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${resumen.nominas.map(n => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${n.empleado}</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(n.comisiones_bs).toFixed(2)} Bs</td>
                                        <td style="text-align: right; padding: 8px;">$${parseFloat(n.propinas_dolares || 0).toFixed(2)}</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(n.propinas_bs).toFixed(2)} Bs</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(n.descuentos_bs).toFixed(2)} Bs</td>
                                        <td style="text-align: right; padding: 8px;"><strong>${parseFloat(n.total_pagado_bs).toFixed(2)} Bs</strong></td>
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
                                    <th style="text-align: right; padding: 8px;">Total (Bs)</th>
                                    <th style="text-align: right; padding: 8px;">Total ($)</th>
                                    <th style="text-align: left; padding: 8px;">Métodos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${resumen.transacciones.map(t => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${t.cliente}</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(t.total_bs).toFixed(2)} Bs</td>
                                        <td style="text-align: right; padding: 8px;">$${parseFloat(t.total_dolares).toFixed(2)}</td>
                                        <td style="padding: 8px;">${t.metodos_pago || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}

                    ${resumen.servicios && resumen.servicios.length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Servicios Realizados (${resumen.servicios.length})</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px;">Servicio</th>
                                    <th style="text-align: left; padding: 8px;">Empleado</th>
                                    <th style="text-align: right; padding: 8px;">Precio</th>
                                    <th style="text-align: right; padding: 8px;">Propina</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${resumen.servicios.map(s => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${s.nombre}</td>
                                        <td style="padding: 8px;">${s.empleado}</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(s.precio).toFixed(2)} Bs</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(s.propina).toFixed(2)} Bs</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
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
                                    <th style="text-align: right; padding: 8px;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${resumen.productos.map(p => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${p.nombre}</td>
                                        <td style="text-align: right; padding: 8px;">${p.cantidad}</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(p.precio_total).toFixed(2)} Bs</td>
                                    </tr>
                                `).join('')}
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

