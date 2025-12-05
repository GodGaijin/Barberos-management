(function() {
    'use strict';

    let initialized = false;

    // Función de inicialización
    // Inicializa el módulo del dashboard cuando se carga la página
    window.initDashboard = function() {
        // Event listeners - usar setTimeout para asegurar que el DOM esté listo
        setTimeout(() => {
            const refreshBtn = document.getElementById('refresh-dashboard');
            if (refreshBtn) {
                refreshBtn.onclick = () => {
                    cargarDashboard();
                };
            }

            // Configurar event listeners para modales de productos sin stock
            const cerrarSinStockBtn = document.getElementById('cerrar-sin-stock');
            const closeSinStockBtn = document.getElementById('close-sin-stock-modal');
            const irProductosSinStockBtn = document.getElementById('ir-productos-sin-stock');
            const modalSinStock = document.getElementById('productos-sin-stock-modal');
            
            if (cerrarSinStockBtn && modalSinStock) {
                cerrarSinStockBtn.addEventListener('click', () => {
                    modalSinStock.classList.remove('active');
                });
            }
            if (closeSinStockBtn && modalSinStock) {
                closeSinStockBtn.addEventListener('click', () => {
                    modalSinStock.classList.remove('active');
                });
            }
            if (irProductosSinStockBtn && modalSinStock) {
                irProductosSinStockBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    modalSinStock.classList.remove('active');
                    if (window.navigateToPage) {
                        window.navigateToPage('productos');
                    } else {
                        console.error('window.navigateToPage no está disponible');
                    }
                });
            }
            
            // Cerrar modal al hacer clic fuera
            if (modalSinStock) {
                modalSinStock.addEventListener('click', (e) => {
                    if (e.target === modalSinStock) {
                        modalSinStock.classList.remove('active');
                    }
                });
            }

            // Navegación desde links - usar delegación de eventos para elementos dinámicos
            const pageContent = document.getElementById('page-content');
            if (pageContent) {
                pageContent.addEventListener('click', (e) => {
                    // Buscar el elemento clickeado o su padre que tenga data-page
                    let target = e.target;
                    while (target && target !== pageContent) {
                        if (target.hasAttribute && target.hasAttribute('data-page')) {
                            const page = target.getAttribute('data-page');
                            if (page && window.navigateToPage) {
                                e.preventDefault();
                                e.stopPropagation();
                                window.navigateToPage(page);
                                return;
                            }
                        }
                        target = target.parentElement;
                    }
                });
            }

            // Navegación desde links estáticos
            document.querySelectorAll('a[data-page]').forEach(link => {
                link.onclick = (e) => {
                    const page = link.getAttribute('data-page');
                    if (page && window.navigateToPage) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.navigateToPage(page);
                    }
                };
            });
        }, 100);

        // Cargar datos iniciales
        cargarDashboard();

        initialized = true;
    };

    // Cargar todos los datos del dashboard
    async function cargarDashboard() {
        try {
            // Cargar en paralelo
            await Promise.all([
                cargarEstadisticas(),
                cargarTransaccionesPendientes(),
                cargarCitasProximas(),
                cargarNominasPendientes(),
                cargarAdvertencias()
            ]);
        } catch (error) {
            console.error('Error al cargar dashboard:', error);
        }
    }

    // Obtener fecha de hoy en formato DD/MM/YYYY
    function obtenerFechaHoy() {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const año = hoy.getFullYear();
        return `${dia}/${mes}/${año}`;
    }

    // Cargar estadísticas generales
    async function cargarEstadisticas() {
        try {
            const fechaHoy = obtenerFechaHoy();
            
            // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD para comparación ISO
            const [dia, mes, año] = fechaHoy.split('/');
            const fechaISO = `${año}-${mes}-${dia}`;

            // Ingresos del día - buscar todas las transacciones cerradas del día actual
            // La fecha puede estar en formato DD/MM/YYYY HH:MM:SS o ISO
            // Usar pagado_bs y pagado_dolares en lugar de total_en_bs
            const transaccionesHoy = await window.electronAPI.dbQuery(
                `SELECT COALESCE(pagado_bs, 0) as pagado_bs, 
                        COALESCE(pagado_dolares, 0) as pagado_dolares
                 FROM Transacciones 
                 WHERE estado = 'cerrada'
                 AND (
                     -- Si la fecha está en formato DD/MM/YYYY HH:MM:SS
                     fecha_cierre LIKE ? || '%'
                     OR
                     -- Si la fecha está en formato ISO (YYYY-MM-DD)
                     strftime('%Y-%m-%d', fecha_cierre) = ?
                 )`,
                [fechaHoy, fechaISO]
            );
            const ingresosBs = transaccionesHoy.reduce((sum, t) => sum + (parseFloat(t.pagado_bs) || 0), 0);
            const ingresosDolares = transaccionesHoy.reduce((sum, t) => sum + (parseFloat(t.pagado_dolares) || 0), 0);
            
            // Mostrar ingresos en bolívares (si hay dólares, se pueden mostrar por separado si se desea)
            let textoIngresos = `Bs. ${ingresosBs.toFixed(2)}`;
            if (ingresosDolares > 0) {
                textoIngresos += ` / $${ingresosDolares.toFixed(2)}`;
            }
            document.getElementById('ingresos-hoy').textContent = textoIngresos;

            // Transacciones pendientes
            const transPendientes = await window.electronAPI.dbQuery(
                `SELECT COUNT(*) as count FROM Transacciones WHERE estado = 'abierta'`
            );
            document.getElementById('transacciones-pendientes').textContent = 
                transPendientes[0]?.count || 0;

            // Citas hoy - usar LIKE para comparar fechas
            const citasHoy = await window.electronAPI.dbQuery(
                `SELECT COUNT(*) as count FROM Citas 
                 WHERE fecha_hora LIKE ? 
                 AND estado IN ('pendiente', 'confirmada')`,
                [`${fechaHoy}%`]
            );
            document.getElementById('citas-hoy').textContent = citasHoy[0]?.count || 0;

            // Empleados activos
            const empleados = await window.electronAPI.dbQuery(
                `SELECT COUNT(*) as count FROM Empleados`
            );
            document.getElementById('empleados-activos').textContent = empleados[0]?.count || 0;

        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    }

    // Cargar transacciones pendientes
    async function cargarTransaccionesPendientes() {
        const container = document.getElementById('transacciones-list');
        if (!container) return;

        try {
            const transacciones = await window.electronAPI.dbQuery(
                `SELECT t.id, t.fecha_apertura, t.total_en_bs, 
                        c.nombre || ' ' || c.apellido as cliente_nombre
                 FROM Transacciones t
                 LEFT JOIN Clientes c ON t.id_cliente = c.id
                 WHERE t.estado = 'abierta'
                 ORDER BY t.id DESC
                 LIMIT 5`
            );

            if (transacciones.length === 0) {
                container.innerHTML = '<p class="empty-state">No hay transacciones pendientes</p>';
                return;
            }

            container.innerHTML = transacciones.map(t => {
                return `
                    <div class="dashboard-item" data-page="transacciones" style="cursor: pointer;">
                        <div class="item-main">
                            <span class="item-title">${t.cliente_nombre || 'Cliente Contado'}</span>
                            <span class="item-date">${formatearFechaHora(t.fecha_apertura)}</span>
                        </div>
                        <div class="item-amount">Bs. ${parseFloat(t.total_en_bs || 0).toFixed(2)}</div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error al cargar transacciones:', error);
            container.innerHTML = '<p class="error-state">Error al cargar transacciones</p>';
        }
    }

    // Función auxiliar para parsear fecha en cualquier formato
    function parsearFecha(fechaStr) {
        if (!fechaStr) return null;
        
        try {
            // Si está en formato DD/MM/YYYY HH:MM:SS o DD/MM/YYYY HH:MM
            if (fechaStr.includes('/')) {
                const partes = fechaStr.split(' ');
                const fechaParte = partes[0]; // DD/MM/YYYY
                const horaParte = partes[1] || '00:00:00'; // HH:MM:SS o HH:MM
                
                const [dia, mes, año] = fechaParte.split('/');
                const [hora, minuto, segundo = '00'] = horaParte.split(':');
                
                // Crear fecha en formato ISO para poder parsearla
                const fechaISO = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${hora.padStart(2, '0')}:${minuto.padStart(2, '0')}:${segundo.padStart(2, '0')}`;
                return new Date(fechaISO);
            } else {
                // Formato ISO o estándar
                return new Date(fechaStr);
            }
        } catch (e) {
            console.error('Error al parsear fecha:', fechaStr, e);
            return null;
        }
    }

    // Cargar citas próximas
    async function cargarCitasProximas() {
        const container = document.getElementById('citas-list');
        if (!container) return;

        try {
            // Obtener todas las citas pendientes/confirmadas y filtrar en JavaScript
            const todasCitas = await window.electronAPI.dbQuery(
                `SELECT c.id, c.fecha_hora, c.estado, c.notas,
                        cl.nombre || ' ' || cl.apellido as cliente_nombre
                 FROM Citas c
                 LEFT JOIN Clientes cl ON c.id_cliente = cl.id
                 WHERE c.estado IN ('pendiente', 'confirmada')
                 ORDER BY c.fecha_hora ASC`
            );

            // Filtrar citas futuras usando la función de parseo
            const ahora = new Date();
            const citas = todasCitas
                .filter(c => {
                    const fechaCita = parsearFecha(c.fecha_hora);
                    return fechaCita && fechaCita >= ahora;
                })
                .sort((a, b) => {
                    // Ordenar por fecha
                    const fechaA = parsearFecha(a.fecha_hora);
                    const fechaB = parsearFecha(b.fecha_hora);
                    if (!fechaA || !fechaB) return 0;
                    return fechaA - fechaB;
                })
                .slice(0, 5);

            if (citas.length === 0) {
                container.innerHTML = '<p class="empty-state">No hay citas próximas</p>';
                return;
            }

            container.innerHTML = citas.map(c => {
                const estadoClass = `estado-${c.estado}`;
                const estadoText = {
                    'pendiente': 'Pendiente',
                    'confirmada': 'Confirmada',
                    'completada': 'Completada',
                    'cancelada': 'Cancelada',
                    'no_show': 'No se presentó'
                }[c.estado] || c.estado;

                return `
                    <div class="dashboard-item" data-page="citas" style="cursor: pointer;">
                        <div class="item-main">
                            <span class="item-title">${c.cliente_nombre || 'Sin cliente'}</span>
                            <span class="item-date">${formatearFechaHora(c.fecha_hora)}</span>
                        </div>
                        <span class="badge ${estadoClass}">${estadoText}</span>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error al cargar citas:', error);
            container.innerHTML = '<p class="error-state">Error al cargar citas</p>';
        }
    }

    // Cargar nóminas pendientes
    async function cargarNominasPendientes() {
        const container = document.getElementById('nominas-list');
        if (!container) return;

        try {
            const fechaHoy = obtenerFechaHoy();

            // Obtener nóminas marcadas como pendientes (estado_pago = 'pendiente')
            const nominasPendientes = await window.electronAPI.dbQuery(
                `SELECT n.id, n.fecha_pago, n.total_pagado_bs, n.total_pagado_dolares, n.moneda_pago,
                        e.nombre || ' ' || e.apellido as nombre_empleado
                 FROM Nominas n
                 JOIN Empleados e ON n.id_empleado = e.id
                 WHERE n.estado_pago = 'pendiente'
                 ORDER BY n.fecha_pago DESC, n.id DESC
                 LIMIT 10`
            );

            // Obtener empleados con servicios o consumos pendientes que no tienen nómina pagada
            const empleadosSinNomina = await window.electronAPI.dbQuery(
                `SELECT DISTINCT e.id, e.nombre || ' ' || e.apellido as nombre_empleado,
                        (SELECT COUNT(*) FROM ServiciosRealizados sr 
                         WHERE sr.id_empleado = e.id 
                         AND sr.estado = 'completado'
                         AND NOT EXISTS (
                             SELECT 1 FROM Nominas n2 
                             WHERE n2.id_empleado = sr.id_empleado 
                             AND n2.estado_pago = 'pagado'
                             AND n2.fecha_pago <= sr.fecha
                         )) as servicios_pendientes,
                        (SELECT COUNT(*) FROM ConsumosEmpleados ce 
                         WHERE ce.id_empleado = e.id 
                         AND ce.estado = 'pendiente') as consumos_pendientes
                 FROM Empleados e
                 WHERE EXISTS (
                     SELECT 1 FROM ServiciosRealizados sr 
                     WHERE sr.id_empleado = e.id 
                     AND sr.estado = 'completado'
                     AND NOT EXISTS (
                         SELECT 1 FROM Nominas n2 
                         WHERE n2.id_empleado = sr.id_empleado 
                         AND n2.estado_pago = 'pagado'
                         AND n2.fecha_pago <= sr.fecha
                     )
                 )
                 OR EXISTS (
                     SELECT 1 FROM ConsumosEmpleados ce 
                     WHERE ce.id_empleado = e.id 
                     AND ce.estado = 'pendiente'
                 )`
            );

            // Combinar ambas listas
            const items = [];

            // Agregar nóminas pendientes
            nominasPendientes.forEach(n => {
                const totalBs = parseFloat(n.total_pagado_bs || 0);
                const totalDolares = parseFloat(n.total_pagado_dolares || 0);
                let totalTexto = '';
                
                if (n.moneda_pago === 'dolares') {
                    totalTexto = `$${totalDolares.toFixed(2)}`;
                } else if (n.moneda_pago === 'mixto') {
                    totalTexto = `Bs. ${totalBs.toFixed(2)} / $${totalDolares.toFixed(2)}`;
                } else {
                    totalTexto = `Bs. ${totalBs.toFixed(2)}`;
                }

                items.push({
                    tipo: 'nomina_pendiente',
                    id: n.id,
                    nombre: n.nombre_empleado,
                    fecha: n.fecha_pago,
                    total: totalTexto,
                    moneda: n.moneda_pago
                });
            });

            // Agregar empleados sin nómina pagada (solo si no tienen nómina pendiente ya)
            empleadosSinNomina.forEach(emp => {
                const tieneNominaPendiente = nominasPendientes.some(n => 
                    n.nombre_empleado === emp.nombre_empleado
                );
                
                if (!tieneNominaPendiente && (emp.servicios_pendientes > 0 || emp.consumos_pendientes > 0)) {
                    items.push({
                        tipo: 'sin_nomina',
                        nombre: emp.nombre_empleado,
                        servicios: emp.servicios_pendientes,
                        consumos: emp.consumos_pendientes
                    });
                }
            });

            if (items.length === 0) {
                container.innerHTML = '<p class="empty-state">✅ Todas las nóminas están al día</p>';
                return;
            }

            container.innerHTML = items.map(item => {
                if (item.tipo === 'nomina_pendiente') {
                    return `
                        <div class="dashboard-item warning-item" data-page="nominas" style="cursor: pointer;">
                            <div class="item-main">
                                <span class="item-title">⏳ ${item.nombre}</span>
                                <span class="item-subtitle">Nómina pendiente - ${item.fecha}</span>
                            </div>
                            <div class="item-amount" style="color: #ff9800; font-weight: 600;">
                                ${item.total}
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="dashboard-item warning-item" data-page="nominas" style="cursor: pointer;">
                            <div class="item-main">
                                <span class="item-title">⚠️ ${item.nombre}</span>
                                <span class="item-subtitle">Sin nómina pagada</span>
                            </div>
                            <div class="item-details">
                                <span>Servicios pendientes: ${item.servicios || 0}</span>
                                <span>Consumos pendientes: ${item.consumos || 0}</span>
                            </div>
                        </div>
                    `;
                }
            }).join('');

        } catch (error) {
            console.error('Error al cargar nóminas:', error);
            container.innerHTML = '<p class="error-state">Error al cargar nóminas</p>';
        }
    }

    // Cargar advertencias
    async function cargarAdvertencias() {
        const container = document.getElementById('dashboard-warnings');
        if (!container) return;

        const warnings = [];

        try {
            const fechaHoy = obtenerFechaHoy();
            
            // Verificar si hay tasa del día
            const tasaHoy = await window.electronAPI.dbGet(
                `SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1`,
                [fechaHoy]
            );

            // Guardar referencias a productos para los modales
            let productosBajoStock = [];
            let productosSinStock = [];
            
            if (!tasaHoy) {
                warnings.push({
                    type: 'error',
                    message: '⚠️ No se ha establecido la tasa de cambio del día. Esto afectará el cálculo de precios.',
                    action: 'Establecer Tasa',
                    page: 'tasas',
                    actionType: 'tasa'
                });
            }

            // Verificar productos con stock bajo
            productosBajoStock = await window.electronAPI.dbQuery(
                `SELECT nombre, cantidad FROM Productos WHERE cantidad < 10 AND cantidad > 0 ORDER BY nombre ASC`
            );
            if (productosBajoStock.length > 0) {
                warnings.push({
                    type: 'warning',
                    message: `📦 ${productosBajoStock.length} producto(s) con stock bajo (< 10 unidades)`,
                    action: 'Ver Productos',
                    page: 'productos',
                    actionType: 'stockBajo',
                    productos: productosBajoStock
                });
            }

            // Verificar productos sin stock
            productosSinStock = await window.electronAPI.dbQuery(
                `SELECT nombre FROM Productos WHERE cantidad = 0 ORDER BY nombre ASC`
            );
            if (productosSinStock.length > 0) {
                warnings.push({
                    type: 'error',
                    message: `❌ ${productosSinStock.length} producto(s) sin stock`,
                    action: 'Ver Productos',
                    page: 'productos',
                    actionType: 'sinStock',
                    productos: productosSinStock
                });
            }
            
            // Guardar referencias globales para acceso desde los botones
            window.dashboardProductosBajoStock = productosBajoStock;
            window.dashboardProductosSinStock = productosSinStock;

            // Mostrar advertencias
            if (warnings.length === 0) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = warnings.map((w, index) => {
                const banner = document.createElement('div');
                banner.className = `warning-banner ${w.type}`;
                const span = document.createElement('span');
                span.textContent = w.message;
                const btn = document.createElement('button');
                btn.className = 'btn btn-small';
                btn.textContent = w.action;
                
                // Asignar función según el tipo de advertencia
                if (w.actionType === 'tasa') {
                    // Botón para establecer tasa del día
                    btn.addEventListener('click', () => {
                        abrirModalTasaDashboard();
                    });
                } else if (w.actionType === 'stockBajo') {
                    // Botón para ver productos con stock bajo
                    btn.addEventListener('click', () => {
                        mostrarProductosStockBajo(w.productos || window.dashboardProductosBajoStock || []);
                    });
                } else if (w.actionType === 'sinStock') {
                    // Botón para ver productos sin stock
                    btn.addEventListener('click', () => {
                        mostrarProductosSinStock(w.productos || window.dashboardProductosSinStock || []);
                    });
                } else {
                    // Navegar a la página correspondiente
                    btn.addEventListener('click', () => {
                        if (window.navigateToPage) {
                            window.navigateToPage(w.page);
                        }
                    });
                }
                
                banner.appendChild(span);
                banner.appendChild(btn);
                return banner.outerHTML;
            }).join('');

        } catch (error) {
            console.error('Error al cargar advertencias:', error);
        }
    }

    // Funciones auxiliares
    function formatearFechaHora(fechaHora) {
        if (!fechaHora) return '';
        try {
            // Usar la función parsearFecha para manejar ambos formatos
            const d = parsearFecha(fechaHora);
            if (!d || isNaN(d.getTime())) {
                return fechaHora;
            }
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const año = d.getFullYear();
            const hora = String(d.getHours()).padStart(2, '0');
            const minuto = String(d.getMinutes()).padStart(2, '0');
            return `${dia}/${mes}/${año} ${hora}:${minuto}`;
        } catch (e) {
            return fechaHora;
        }
    }
    
    // Mostrar productos con stock bajo
    function mostrarProductosStockBajo(productos) {
        const modal = document.getElementById('productos-stock-bajo-modal');
        const lista = document.getElementById('productos-stock-bajo-lista');
        
        if (!modal || !lista) return;
        
        if (productos.length === 0) {
            lista.innerHTML = '<p>No hay productos con stock bajo</p>';
        } else {
            lista.innerHTML = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color);">
                            <th style="text-align: left; padding: 10px;">Producto</th>
                            <th style="text-align: right; padding: 10px;">Stock Actual</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productos.map(p => `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 10px;">${p.nombre}</td>
                                <td style="text-align: right; padding: 10px; color: #ff9800; font-weight: 600;">${p.cantidad} unidades</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        modal.classList.add('active');
        
        // Configurar botones del modal
        const cerrarBtn = document.getElementById('cerrar-stock-bajo');
        const closeBtn = document.getElementById('close-stock-bajo-modal');
        const irProductosBtn = document.getElementById('ir-productos-stock-bajo');
        
        if (cerrarBtn) {
            cerrarBtn.onclick = () => modal.classList.remove('active');
        }
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('active');
        }
        if (irProductosBtn) {
            irProductosBtn.onclick = () => {
                modal.classList.remove('active');
                if (window.navigateToPage) {
                    window.navigateToPage('productos');
                }
            };
        }
        
        // Cerrar al hacer clic fuera del modal
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        };
    }
    
    // Mostrar productos sin stock
    function mostrarProductosSinStock(productos) {
        const modal = document.getElementById('productos-sin-stock-modal');
        const contenido = document.getElementById('productos-sin-stock-contenido');
        
        if (!modal || !contenido) {
            console.error('Modal de productos sin stock no encontrado');
            return;
        }
        
        if (productos.length === 0) {
            contenido.innerHTML = `
                <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; text-align: center;">
                    <p style="margin: 0; color: var(--text-secondary);">No hay productos sin stock</p>
                </div>
            `;
        } else {
            // Estilo similar a los reportes
            contenido.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Resumen</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Total Productos sin Stock:</strong> ${productos.length}</p>
                            <p><strong>Estado:</strong> <span style="color: #dc3545; font-weight: 600;">Requiere Atención</span></p>
                        </div>
                    </div>

                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Lista de Productos sin Stock (${productos.length})</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px;">#</th>
                                    <th style="text-align: left; padding: 8px;">Nombre del Producto</th>
                                    <th style="text-align: center; padding: 8px;">Stock Actual</th>
                                    <th style="text-align: center; padding: 8px;">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productos.map((p, index) => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${index + 1}</td>
                                        <td style="padding: 8px;">${p.nombre || 'Sin nombre'}</td>
                                        <td style="text-align: center; padding: 8px; color: #dc3545; font-weight: 600;">0</td>
                                        <td style="text-align: center; padding: 8px;">
                                            <span style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">Sin Stock</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        
        modal.classList.add('active');
        
        // Los event listeners ya están configurados en initDashboard
        // pero los reconfiguramos aquí para asegurar que funcionen
        setTimeout(() => {
            const cerrarBtn = document.getElementById('cerrar-sin-stock');
            const closeBtn = document.getElementById('close-sin-stock-modal');
            const irProductosBtn = document.getElementById('ir-productos-sin-stock');
            
            if (cerrarBtn) {
                cerrarBtn.onclick = () => modal.classList.remove('active');
            }
            
            if (closeBtn) {
                closeBtn.onclick = () => modal.classList.remove('active');
            }
            
            if (irProductosBtn) {
                // Usar addEventListener en lugar de onclick para evitar conflictos
                irProductosBtn.onclick = null; // Limpiar primero
                irProductosBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    modal.classList.remove('active');
                    if (window.navigateToPage) {
                        window.navigateToPage('productos');
                    } else {
                        console.error('window.navigateToPage no está disponible');
                        alert('Error: No se puede navegar a la página de productos');
                    }
                }, { once: false });
            }
        }, 50);
    }
    
    // Abrir modal para establecer tasa del día desde dashboard
    function abrirModalTasaDashboard() {
        const modal = document.getElementById('tasa-dashboard-modal');
        if (!modal) return;
        
        // Establecer fecha de hoy
        const fechaInput = document.getElementById('tasa-dashboard-fecha');
        if (fechaInput) {
            if (window.obtenerFechaLocalInput) {
                fechaInput.value = window.obtenerFechaLocalInput();
            } else {
                const hoy = new Date();
                fechaInput.value = hoy.toISOString().split('T')[0];
            }
        }
        
        // Limpiar campo de tasa
        const tasaInput = document.getElementById('tasa-dashboard-valor');
        if (tasaInput) {
            tasaInput.value = '';
            // Aplicar formateo si está disponible
            setTimeout(() => {
                if (typeof formatearInputPrecio === 'function') {
                    formatearInputPrecio(tasaInput);
                }
            }, 100);
        }
        
        modal.classList.add('active');
        
        // Configurar botones del modal
        const cerrarBtn = document.getElementById('cancel-tasa-dashboard');
        const closeBtn = document.getElementById('close-tasa-dashboard-modal');
        const form = document.getElementById('tasa-dashboard-form');
        
        if (cerrarBtn) {
            cerrarBtn.onclick = () => modal.classList.remove('active');
        }
        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.remove('active');
        }
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await guardarTasaDesdeDashboard();
            };
        }
        
        // Cerrar al hacer clic fuera del modal
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        };
        
        // Enfocar el campo de tasa después de un pequeño delay
        setTimeout(() => {
            if (tasaInput) {
                tasaInput.focus();
            }
        }, 200);
    }
    
    // Guardar tasa desde dashboard
    async function guardarTasaDesdeDashboard() {
        const fechaInput = document.getElementById('tasa-dashboard-fecha');
        const tasaInput = document.getElementById('tasa-dashboard-valor');
        
        if (!fechaInput || !tasaInput) {
            mostrarError('Error: Campos no encontrados');
            return;
        }
        
        const fecha = fechaInput.value;
        if (!fecha) {
            mostrarError('La fecha es requerida');
            return;
        }
        
        // Obtener valor numérico de la tasa
        let tasaValor = 0;
        if (typeof window.obtenerValorNumerico === 'function' && tasaInput._formateadoPrecio) {
            tasaValor = window.obtenerValorNumerico(tasaInput) || 0;
        } else {
            tasaValor = parseFloat(tasaInput.value.replace(/[^\d.]/g, '')) || 0;
        }
        
        if (tasaValor <= 0) {
            mostrarError('La tasa debe ser mayor a 0');
            return;
        }
        
        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
        const [year, month, day] = fecha.split('-');
        const fechaFormato = `${day}/${month}/${year}`;
        
        try {
            // Verificar si ya existe una tasa para esta fecha
            const tasaExistente = await window.electronAPI.dbGet(
                'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                [fechaFormato]
            );
            
            if (tasaExistente) {
                // Actualizar tasa existente
                await window.electronAPI.dbRun(
                    'UPDATE TasasCambio SET tasa_bs_por_dolar = ? WHERE id = ?',
                    [tasaValor, tasaExistente.id]
                );
                mostrarExito('Tasa actualizada correctamente');
            } else {
                // Crear nueva tasa
                await window.electronAPI.dbRun(
                    'INSERT INTO TasasCambio (fecha, tasa_bs_por_dolar) VALUES (?, ?)',
                    [fechaFormato, tasaValor]
                );
                mostrarExito('Tasa establecida correctamente');
            }
            
            // Cerrar modal
            document.getElementById('tasa-dashboard-modal').classList.remove('active');
            
            // Recargar dashboard para actualizar advertencias
            await cargarDashboard();
            
        } catch (error) {
            console.error('Error al guardar tasa:', error);
            mostrarError('Error al guardar la tasa: ' + (error.message || 'Error desconocido'));
        }
    }
    
    // Funciones auxiliares para mostrar mensajes
    function mostrarError(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Error: ' + mensaje, 'error', 5000);
        } else {
            console.error('Error: ' + mensaje);
            alert('Error: ' + mensaje);
        }
    }
    
    function mostrarExito(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Éxito: ' + mensaje, 'success', 3000);
        } else {
            console.log('Éxito: ' + mensaje);
            alert('Éxito: ' + mensaje);
        }
    }

})();

