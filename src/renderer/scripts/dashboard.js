(function() {
    'use strict';

    let initialized = false;

    // Función de inicialización
    window.initDashboard = function() {
        console.log('Inicializando Dashboard...');
        
        // Event listeners - usar setTimeout para asegurar que el DOM esté listo
        setTimeout(() => {
            const refreshBtn = document.getElementById('refresh-dashboard');
            if (refreshBtn) {
                refreshBtn.onclick = () => {
                    console.log('Botón actualizar clickeado');
                    cargarDashboard();
                };
            } else {
                console.warn('Botón refresh-dashboard no encontrado');
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
                                console.log('Navegando a:', page);
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
                        console.log('Navegando a:', page);
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
            const transaccionesHoy = await window.electronAPI.dbQuery(
                `SELECT total_en_bs FROM Transacciones 
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
            const ingresosHoy = transaccionesHoy.reduce((sum, t) => sum + (parseFloat(t.total_en_bs) || 0), 0);
            document.getElementById('ingresos-hoy').textContent = `Bs. ${ingresosHoy.toFixed(2)}`;

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
                 ORDER BY t.fecha_apertura DESC
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

            // Obtener empleados con servicios o consumos hoy que no tienen nómina pagada
            const empleadosSinNomina = await window.electronAPI.dbQuery(
                `SELECT e.id, e.nombre || ' ' || e.apellido as nombre_empleado,
                        COALESCE(SUM(CASE WHEN sr.fecha LIKE ? THEN sr.precio_cobrado ELSE 0 END), 0) as total_servicios,
                        COALESCE(SUM(CASE WHEN ce.estado = 'pendiente' THEN ce.precio_total ELSE 0 END), 0) as total_consumos
                 FROM Empleados e
                 LEFT JOIN ServiciosRealizados sr ON sr.id_empleado = e.id
                 LEFT JOIN ConsumosEmpleados ce ON ce.id_empleado = e.id
                 LEFT JOIN Nominas n ON n.id_empleado = e.id AND n.fecha_pago = ?
                 WHERE n.id IS NULL
                 GROUP BY e.id, e.nombre, e.apellido
                 HAVING total_servicios > 0 OR total_consumos > 0`,
                [`${fechaHoy}%`, fechaHoy]
            );

            if (empleadosSinNomina.length === 0) {
                container.innerHTML = '<p class="empty-state">✅ Todas las nóminas están al día</p>';
                return;
            }

            container.innerHTML = empleadosSinNomina.map(emp => {
                return `
                    <div class="dashboard-item warning-item" data-page="nominas" style="cursor: pointer;">
                        <div class="item-main">
                            <span class="item-title">⚠️ ${emp.nombre_empleado}</span>
                            <span class="item-subtitle">Sin nómina pagada hoy</span>
                        </div>
                        <div class="item-details">
                            <span>Servicios: Bs. ${parseFloat(emp.total_servicios || 0).toFixed(2)}</span>
                            <span>Consumos: Bs. ${parseFloat(emp.total_consumos || 0).toFixed(2)}</span>
                        </div>
                    </div>
                `;
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
                `SELECT * FROM TasasCambio WHERE fecha = ?`,
                [fechaHoy]
            );

            if (!tasaHoy) {
                warnings.push({
                    type: 'error',
                    message: '⚠️ No se ha establecido la tasa de cambio del día. Esto afectará el cálculo de precios.',
                    action: 'Establecer Tasa',
                    page: 'tasas'
                });
            }

            // Verificar productos con stock bajo
            const productosBajoStock = await window.electronAPI.dbQuery(
                `SELECT nombre, cantidad FROM Productos WHERE cantidad < 10 AND cantidad > 0`
            );
            if (productosBajoStock.length > 0) {
                warnings.push({
                    type: 'warning',
                    message: `📦 ${productosBajoStock.length} producto(s) con stock bajo (< 10 unidades)`,
                    action: 'Ver Productos',
                    page: 'productos'
                });
            }

            // Verificar productos sin stock
            const productosSinStock = await window.electronAPI.dbQuery(
                `SELECT nombre FROM Productos WHERE cantidad = 0`
            );
            if (productosSinStock.length > 0) {
                warnings.push({
                    type: 'error',
                    message: `❌ ${productosSinStock.length} producto(s) sin stock`,
                    action: 'Ver Productos',
                    page: 'productos'
                });
            }

            // Mostrar advertencias
            if (warnings.length === 0) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = warnings.map(w => {
                const banner = document.createElement('div');
                banner.className = `warning-banner ${w.type}`;
                const span = document.createElement('span');
                span.textContent = w.message;
                const btn = document.createElement('button');
                btn.className = 'btn btn-small';
                btn.textContent = w.action;
                btn.addEventListener('click', () => {
                    if (window.navigateToPage) {
                        window.navigateToPage(w.page);
                    }
                });
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

})();

