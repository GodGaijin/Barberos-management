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

    // Inicialización - función exportada para ser llamada desde main.js
    window.initNominas = function() {
        console.log('initNominas llamado');
        setTimeout(() => {
            try {
                console.log('Configurando event listeners...');
                setupEventListeners();
                console.log('Cargando datos...');
                cargarDatos();
                window.nominasModule.initialized = true;
                console.log('Nóminas inicializadas correctamente');
            } catch (error) {
                console.error('Error al inicializar nóminas:', error);
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

            // Calcular cuando cambia el porcentaje
            const porcentajeInput = document.getElementById('nomina-porcentaje');
            if (porcentajeInput) {
                porcentajeInput.oninput = () => {
                    // Validar que esté entre 1 y 100
                    let valor = parseInt(porcentajeInput.value) || 100;
                    if (valor < 1) valor = 1;
                    if (valor > 100) valor = 100;
                    if (valor !== parseInt(porcentajeInput.value)) {
                        porcentajeInput.value = valor;
                    }
                    recalcularTotalConPorcentaje();
                };
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

    // Cargar nóminas desde la base de datos
    async function cargarNominas() {
        try {
            console.log('Iniciando carga de nóminas...');
            const tbody = document.getElementById('nominas-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="loading">Cargando nóminas...</td></tr>';
            }
            
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            console.log('Consultando base de datos...');
            const resultados = await window.electronAPI.dbQuery(`
                SELECT 
                    n.*,
                    e.nombre || ' ' || e.apellido as nombre_empleado
                FROM Nominas n
                JOIN Empleados e ON n.id_empleado = e.id
                ORDER BY n.fecha_pago DESC, n.id DESC
            `);
            console.log('Nóminas obtenidas:', resultados);
            
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
                tbody.innerHTML = '<tr><td colspan="10" class="error-message">Error al cargar las nóminas: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar las nóminas: ' + (error.message || error));
        }
    }

    // Mostrar nóminas en la tabla
    function mostrarNominas(listaNominas) {
        const tbody = document.getElementById('nominas-table-body');
        
        if (!tbody) return;
        
            if (listaNominas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No hay nóminas registradas</td></tr>';
                return;
            }

        tbody.innerHTML = listaNominas.map((nomina, index) => {
            // Formatear fecha
            let fechaPago = nomina.fecha_pago;
            if (fechaPago.includes('-')) {
                const [year, month, day] = fechaPago.split('-');
                fechaPago = `${day}/${month}/${year}`;
            }
            
            return `
                <tr>
                    <td>#${index + 1}</td>
                    <td>${nomina.nombre_empleado}</td>
                    <td>${fechaPago}</td>
                    <td>$${parseFloat(nomina.comisiones_referencia_en_dolares || 0).toFixed(2)}</td>
                    <td>${parseFloat(nomina.comisiones_bs || 0).toFixed(2)} Bs</td>
                    <td>$${parseFloat(nomina.propina_en_dolares || 0).toFixed(2)}</td>
                    <td>${parseFloat(nomina.propina_bs || 0).toFixed(2)} Bs</td>
                    <td>${parseFloat(nomina.descuentos_consumos_bs || 0).toFixed(2)} Bs</td>
                    <td><strong>${parseFloat(nomina.total_pagado_bs || 0).toFixed(2)} Bs</strong></td>
                    <td class="actions">
                        <button class="btn-icon btn-view" onclick="window.verNomina(${nomina.id})" title="Ver Detalles">
                            👁️
                        </button>
                        <button class="btn-icon btn-delete" onclick="window.eliminarNomina(${nomina.id})" title="Eliminar">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
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

        mostrarNominas(nominasFiltradas);
    }

    // Validar si ya existe una nómina para este empleado en esta fecha
    async function validarNominaExistente(idEmpleado, fechaFormato) {
        if (!idEmpleado || !fechaFormato) {
            return false;
        }

        try {
            const nominaExistente = await window.electronAPI.dbGet(
                'SELECT * FROM Nominas WHERE id_empleado = ? AND fecha_pago = ?',
                [idEmpleado, fechaFormato]
            );
            return !!nominaExistente;
        } catch (error) {
            console.error('Error al validar nómina existente:', error);
            return false;
        }
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

        // Validar si ya existe una nómina
        const existeNomina = await validarNominaExistente(idEmpleado, fechaFormato);
        
        if (existeNomina) {
            mostrarAdvertencia();
            limpiarCamposNomina();
            return;
        } else {
            ocultarAdvertencia();
        }

        try {
            // Obtener servicios realizados del empleado en esa fecha
            // La fecha en ServiciosRealizados puede estar en formato DD/MM/YYYY HH:MM:SS o ISO
            // Convertir fechaInput (YYYY-MM-DD) a formato DD/MM/YYYY para comparar
            const [year, month, day] = fechaInput.split('-');
            const fechaFormatoComparar = `${day}/${month}/${year}`;
            
            const servicios = await window.electronAPI.dbQuery(`
                SELECT 
                    sr.*,
                    s.nombre as nombre_servicio,
                    t.fecha_apertura
                FROM ServiciosRealizados sr
                JOIN Servicios s ON sr.id_servicio = s.id
                JOIN Transacciones t ON sr.id_transaccion = t.id
                WHERE sr.id_empleado = ? 
                AND sr.estado = 'completado'
                AND (
                    -- Si la fecha está en formato DD/MM/YYYY HH:MM:SS
                    sr.fecha LIKE ? || '%'
                    OR
                    -- Si la fecha está en formato ISO (YYYY-MM-DD)
                    strftime('%Y-%m-%d', sr.fecha) = ?
                )
            `, [idEmpleado, fechaFormatoComparar, fechaInput]);
            
            // Obtener consumos pendientes del empleado
            const consumos = await window.electronAPI.dbQuery(`
                SELECT 
                    ce.*,
                    p.nombre as nombre_producto
                FROM ConsumosEmpleados ce
                JOIN Productos p ON ce.id_producto = p.id
                WHERE ce.id_empleado = ? 
                AND ce.estado = 'pendiente'
            `, [idEmpleado]);

            window.nominasModule.serviciosRealizados = servicios || [];
            window.nominasModule.consumosPendientes = consumos || [];
            
            serviciosRealizados.length = 0;
            consumosPendientes.length = 0;
            
            if (window.nominasModule.serviciosRealizados.length > 0) {
                serviciosRealizados.push(...window.nominasModule.serviciosRealizados);
            }
            if (window.nominasModule.consumosPendientes.length > 0) {
                consumosPendientes.push(...window.nominasModule.consumosPendientes);
            }

            // Mostrar resúmenes
            mostrarResumenServicios(servicios);
            mostrarResumenConsumos(consumos);

            // Calcular totales
            calcularTotales(servicios, consumos, fechaFormato);
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
            return `<p><strong>${s.nombre_servicio}</strong> - Precio: ${parseFloat(s.precio_cobrado).toFixed(2)} Bs - Propina: ${parseFloat(s.propina || 0).toFixed(2)} Bs</p>`;
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

    // Calcular totales
    async function calcularTotales(servicios, consumos, fechaFormato) {
        // Calcular comisiones y propinas en Bs
        let comisionesBs = 0;
        let propinasBs = 0;
        
        servicios.forEach(servicio => {
            comisionesBs += parseFloat(servicio.precio_cobrado || 0);
            propinasBs += parseFloat(servicio.propina || 0);
        });

        // Calcular descuentos por consumos
        let descuentosBs = 0;
        consumos.forEach(consumo => {
            descuentosBs += parseFloat(consumo.precio_total || 0);
        });

        // Obtener tasa del día para calcular en dólares
        const tasaHoy = await window.electronAPI.dbGet(
            'SELECT * FROM TasasCambio WHERE fecha = ?',
            [fechaFormato]
        );

        let comisionesDolares = 0;
        let propinasDolares = 0;

        if (tasaHoy && tasaHoy.tasa_bs_por_dolar) {
            comisionesDolares = comisionesBs / tasaHoy.tasa_bs_por_dolar;
            propinasDolares = propinasBs / tasaHoy.tasa_bs_por_dolar;
        }

        // Calcular subtotal (antes de aplicar porcentaje)
        const subtotal = comisionesBs + propinasBs - descuentosBs;

        // Llenar campos
        document.getElementById('nomina-comisiones-dolares').value = comisionesDolares.toFixed(2);
        document.getElementById('nomina-comisiones-bs').value = comisionesBs.toFixed(2);
        document.getElementById('nomina-propinas-dolares').value = propinasDolares.toFixed(2);
        document.getElementById('nomina-propinas-bs').value = propinasBs.toFixed(2);
        document.getElementById('nomina-descuentos').value = descuentosBs.toFixed(2);
        document.getElementById('nomina-subtotal').value = subtotal.toFixed(2);
        
        // Aplicar porcentaje al total
        recalcularTotalConPorcentaje();
    }

    // Recalcular total aplicando el porcentaje
    function recalcularTotalConPorcentaje() {
        const subtotalInput = document.getElementById('nomina-subtotal');
        const porcentajeInput = document.getElementById('nomina-porcentaje');
        const totalInput = document.getElementById('nomina-total');
        
        if (!subtotalInput || !porcentajeInput || !totalInput) return;
        
        const subtotal = parseFloat(subtotalInput.value.replace(/[^\d.]/g, '')) || 0;
        const porcentaje = parseInt(porcentajeInput.value) || 100;
        
        // Validar que el porcentaje esté entre 1 y 100
        const porcentajeValido = Math.max(1, Math.min(100, porcentaje));
        if (porcentajeValido !== porcentaje) {
            porcentajeInput.value = porcentajeValido;
        }
        
        // Calcular total aplicando porcentaje: subtotal * (porcentaje / 100)
        const totalPagado = subtotal * (porcentajeValido / 100);
        totalInput.value = totalPagado.toFixed(2);
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
        document.getElementById('nomina-porcentaje').value = '100';
        document.getElementById('nomina-total').value = '';
    }

    // Mostrar advertencia de nómina existente
    function mostrarAdvertencia() {
        const advertencia = document.getElementById('nomina-advertencia');
        const btnGuardar = document.getElementById('guardar-nomina');
        if (advertencia) {
            advertencia.style.display = 'block';
        }
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.style.opacity = '0.5';
            btnGuardar.style.cursor = 'not-allowed';
        }
    }

    // Ocultar advertencia de nómina existente
    function ocultarAdvertencia() {
        const advertencia = document.getElementById('nomina-advertencia');
        const btnGuardar = document.getElementById('guardar-nomina');
        if (advertencia) {
            advertencia.style.display = 'none';
        }
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.style.opacity = '1';
            btnGuardar.style.cursor = 'pointer';
        }
    }

    // Abrir modal para nueva nómina
    function abrirModalNuevo() {
        nominaEditando = null;
        document.getElementById('modal-title').textContent = 'Nueva Nómina';
        document.getElementById('nomina-form').reset();
        document.getElementById('nomina-id').value = '';
        
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

        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
        const [year, month, day] = fechaInput.split('-');
        const fechaFormato = `${day}/${month}/${year}`;

        // Obtener valores calculados
        const comisionesDolares = parseFloat(document.getElementById('nomina-comisiones-dolares').value) || 0;
        const comisionesBs = parseFloat(document.getElementById('nomina-comisiones-bs').value) || 0;
        const propinasDolares = parseFloat(document.getElementById('nomina-propinas-dolares').value) || 0;
        const propinasBs = parseFloat(document.getElementById('nomina-propinas-bs').value) || 0;
        const descuentosBs = parseFloat(document.getElementById('nomina-descuentos').value) || 0;
        const porcentaje = parseInt(document.getElementById('nomina-porcentaje').value) || 100;
        const totalPagado = parseFloat(document.getElementById('nomina-total').value) || 0;

        if (totalPagado < 0) {
            mostrarError('El total a pagar no puede ser negativo');
            return;
        }

        // Verificar si ya existe una nómina para este empleado en esta fecha
        const existeNomina = await validarNominaExistente(idEmpleado, fechaFormato);

        if (existeNomina) {
            mostrarError('Ya existe una nómina para este empleado en esta fecha');
            mostrarAdvertencia();
            return;
        }

        try {
            // Crear nómina
            const resultado = await window.electronAPI.dbRun(
                `INSERT INTO Nominas 
                (id_empleado, comisiones_referencia_en_dolares, comisiones_bs, propina_en_dolares, propina_bs, descuentos_consumos_bs, total_pagado_bs, fecha_pago, porcentaje_pagado) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [idEmpleado, comisionesDolares, comisionesBs, propinasDolares, propinasBs, descuentosBs, totalPagado, fechaFormato, porcentaje]
            );
            
            const idNomina = resultado.lastInsertRowid;
            
            // Marcar consumos como pagados
            for (const consumo of consumosPendientes) {
                await window.electronAPI.dbRun(
                    'UPDATE ConsumosEmpleados SET estado = ?, id_nomina = ? WHERE id = ?',
                    ['pagado', idNomina, consumo.id]
                );
            }

            cerrarModal();
            await cargarDatos();
            mostrarExito('Nómina creada correctamente');
        } catch (error) {
            console.error('Error al guardar nómina:', error);
            mostrarError('Error al guardar la nómina: ' + (error.message || 'Error desconocido'));
        }
    }

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
            `, [id]);

            // Calcular subtotal
            const subtotal = parseFloat(nomina.comisiones_bs || 0) + parseFloat(nomina.propina_bs || 0) - parseFloat(nomina.descuentos_consumos_bs || 0);
            const porcentaje = parseInt(nomina.porcentaje_pagado || 100);
            
            // Formatear fecha
            let fechaPago = nomina.fecha_pago;
            if (fechaPago.includes('-')) {
                const [year, month, day] = fechaPago.split('-');
                fechaPago = `${day}/${month}/${year}`;
            }
            
            document.getElementById('ver-nomina-titulo').textContent = `Nómina #${nomina.id}`;
            
            const contenido = document.getElementById('ver-nomina-contenido');
            contenido.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Información General</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Empleado:</strong> ${nomina.nombre_empleado}</p>
                            <p><strong>Fecha de Pago:</strong> ${fechaPago}</p>
                        </div>
                    </div>

                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Comisiones</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Referencia:</strong> $${parseFloat(nomina.comisiones_referencia_en_dolares || 0).toFixed(2)}</p>
                            <p><strong>Bolívares:</strong> ${parseFloat(nomina.comisiones_bs || 0).toFixed(2)} Bs</p>
                        </div>
                    </div>

                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Propinas</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Referencia:</strong> $${parseFloat(nomina.propina_en_dolares || 0).toFixed(2)}</p>
                            <p><strong>Bolívares:</strong> ${parseFloat(nomina.propina_bs || 0).toFixed(2)} Bs</p>
                        </div>
                    </div>

                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Descuentos</h4>
                        <p><strong>Descuentos por Consumos:</strong> ${parseFloat(nomina.descuentos_consumos_bs || 0).toFixed(2)} Bs</p>
                    </div>

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

                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Resumen de Pago</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Subtotal:</strong> ${subtotal.toFixed(2)} Bs</p>
                            <p><strong>Porcentaje Pagado:</strong> ${porcentaje}%</p>
                            <p style="grid-column: 1 / -1;"><strong>Total Pagado:</strong> <span style="font-size: 18px; font-weight: 600;">${parseFloat(nomina.total_pagado_bs || 0).toFixed(2)} Bs</span></p>
                        </div>
                    </div>
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
        alert('Error: ' + mensaje);
    }

    function mostrarExito(mensaje) {
        alert('Éxito: ' + mensaje);
    }
})();

