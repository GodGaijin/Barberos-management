// Gestión de Transacciones - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.transaccionesModule) {
        window.transaccionesModule = {
            transacciones: [],
            transaccionEditando: null,
            transaccionAEliminar: null,
            clientes: [],
            servicios: [],
            productos: [],
            empleados: [],
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var transacciones = window.transaccionesModule.transacciones;
    var transaccionEditando = window.transaccionesModule.transaccionEditando;
    var transaccionAEliminar = window.transaccionesModule.transaccionAEliminar;
    var clientes = window.transaccionesModule.clientes;
    var servicios = window.transaccionesModule.servicios;
    var productos = window.transaccionesModule.productos;
    var empleados = window.transaccionesModule.empleados;
    var initialized = window.transaccionesModule.initialized;

    // Contadores para IDs únicos de filas
    let contadorFilaServicio = 0;
    let contadorFilaProducto = 0;

    // Inicialización - función exportada para ser llamada desde main.js
    window.initTransacciones = function() {
        console.log('initTransacciones llamado');
        setTimeout(() => {
            try {
                console.log('Configurando event listeners...');
                setupEventListeners();
                console.log('Cargando datos...');
                cargarDatos();
                window.transaccionesModule.initialized = true;
                console.log('Transacciones inicializadas correctamente');
            } catch (error) {
                console.error('Error al inicializar transacciones:', error);
                const tbody = document.getElementById('transacciones-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="7" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

    // Event Listeners
    function setupEventListeners() {
        try {
            // Botón nueva transacción
            const btnNuevo = document.getElementById('btn-nueva-transaccion');
            if (btnNuevo) {
                btnNuevo.onclick = () => {
                    abrirModalNuevo();
                };
            }

            // Botones agregar servicio/producto
            const btnAgregarServicio = document.getElementById('btn-agregar-servicio');
            if (btnAgregarServicio) {
                btnAgregarServicio.onclick = agregarFilaServicio;
            }

            const btnAgregarProducto = document.getElementById('btn-agregar-producto');
            if (btnAgregarProducto) {
                btnAgregarProducto.onclick = agregarFilaProducto;
            }

            // Cerrar modales
            const closeModal = document.getElementById('close-modal');
            if (closeModal) closeModal.onclick = cerrarModal;
            
            const closeCerrarModal = document.getElementById('close-cerrar-modal');
            if (closeCerrarModal) closeCerrarModal.onclick = cerrarModalCerrar;
            
            const closeVerTransaccionModal = document.getElementById('close-ver-transaccion-modal');
            if (closeVerTransaccionModal) closeVerTransaccionModal.onclick = cerrarModalVer;
            
            const cerrarVerTransaccion = document.getElementById('cerrar-ver-transaccion');
            if (cerrarVerTransaccion) cerrarVerTransaccion.onclick = cerrarModalVer;
            
            const closeDeleteModal = document.getElementById('close-delete-modal');
            if (closeDeleteModal) closeDeleteModal.onclick = cerrarModalEliminar;
            
            const cancelTransaccion = document.getElementById('cancel-transaccion');
            if (cancelTransaccion) cancelTransaccion.onclick = cerrarModal;
            
            const cancelCerrar = document.getElementById('cancel-cerrar');
            if (cancelCerrar) cancelCerrar.onclick = cerrarModalCerrar;
            
            const cancelDelete = document.getElementById('cancel-delete');
            if (cancelDelete) cancelDelete.onclick = cerrarModalEliminar;

            // Guardar transacción (abierta)
            const guardarTransaccion = document.getElementById('guardar-transaccion');
            if (guardarTransaccion) {
                guardarTransaccion.onclick = (e) => {
                    e.preventDefault();
                    guardarTransaccionAbierta();
                };
            }

            // Cerrar transacción
            const cerrarTransaccionForm = document.getElementById('cerrar-transaccion-form');
            if (cerrarTransaccionForm) {
                cerrarTransaccionForm.onsubmit = (e) => {
                    e.preventDefault();
                    cerrarTransaccion();
                };
            }

            // Validar métodos de pago que requieren entidad
            const metodoPagoCheckboxes = document.querySelectorAll('.metodo-pago-checkbox');
            metodoPagoCheckboxes.forEach(checkbox => {
                checkbox.onchange = validarMetodosPago;
            });

            // Búsqueda y filtros
            const searchTransaccion = document.getElementById('search-transaccion');
            if (searchTransaccion) {
                searchTransaccion.oninput = filtrarTransacciones;
            }
            
            const filterEstado = document.getElementById('filter-estado');
            if (filterEstado) {
                filterEstado.onchange = filtrarTransacciones;
            }

            // Confirmar eliminación
            const confirmDelete = document.getElementById('confirm-delete');
            if (confirmDelete) {
                confirmDelete.onclick = eliminarTransaccionConfirmado;
            }

            // Cerrar modal al hacer clic fuera
            const transaccionModal = document.getElementById('transaccion-modal');
            if (transaccionModal) {
                transaccionModal.onclick = (e) => {
                    if (e.target === e.currentTarget) {
                        cerrarModal();
                    }
                };
            }

            const cerrarTransaccionModal = document.getElementById('cerrar-transaccion-modal');
            if (cerrarTransaccionModal) {
                cerrarTransaccionModal.onclick = (e) => {
                    if (e.target === e.currentTarget) {
                        cerrarModalCerrar();
                    }
                };
            }

            const verTransaccionModal = document.getElementById('ver-transaccion-modal');
            if (verTransaccionModal) {
                verTransaccionModal.onclick = (e) => {
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
                cargarTransacciones(),
                cargarClientes(),
                cargarServicios(),
                cargarProductos(),
                cargarEmpleados()
            ]);
        } catch (error) {
            console.error('Error al cargar datos:', error);
            mostrarError('Error al cargar los datos: ' + (error.message || error));
        }
    }

    // Cargar clientes
    async function cargarClientes() {
        try {
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Clientes ORDER BY nombre ASC, apellido ASC');
            window.transaccionesModule.clientes = resultados || [];
            clientes.length = 0;
            if (window.transaccionesModule.clientes.length > 0) {
                clientes.push(...window.transaccionesModule.clientes);
            }
            
            // Llenar select de clientes
            const clienteSelect = document.getElementById('transaccion-cliente');
            if (clienteSelect) {
                clienteSelect.innerHTML = '<option value="">Seleccione un cliente...</option>' +
                    clientes.map(c => {
                        let cedulaCompleta;
                        if (c.tipo_cedula === 'NA' || c.cedula === 0) {
                            cedulaCompleta = 'NA';
                        } else {
                            cedulaCompleta = `${c.tipo_cedula}-${c.cedula}`;
                        }
                        return `<option value="${c.id}">${c.nombre} ${c.apellido} (${cedulaCompleta})</option>`;
                    }).join('');
            }
        } catch (error) {
            console.error('Error al cargar clientes:', error);
        }
    }

    // Cargar servicios
    async function cargarServicios() {
        try {
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Servicios ORDER BY nombre ASC');
            window.transaccionesModule.servicios = resultados || [];
            servicios.length = 0;
            if (window.transaccionesModule.servicios.length > 0) {
                servicios.push(...window.transaccionesModule.servicios);
            }
        } catch (error) {
            console.error('Error al cargar servicios:', error);
        }
    }

    // Cargar productos
    async function cargarProductos() {
        try {
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Productos ORDER BY nombre ASC');
            window.transaccionesModule.productos = resultados || [];
            productos.length = 0;
            if (window.transaccionesModule.productos.length > 0) {
                productos.push(...window.transaccionesModule.productos);
            }
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    }

    // Cargar empleados
    async function cargarEmpleados() {
        try {
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Empleados ORDER BY nombre ASC, apellido ASC');
            window.transaccionesModule.empleados = resultados || [];
            empleados.length = 0;
            if (window.transaccionesModule.empleados.length > 0) {
                empleados.push(...window.transaccionesModule.empleados);
            }
        } catch (error) {
            console.error('Error al cargar empleados:', error);
        }
    }

    // Cargar transacciones desde la base de datos
    async function cargarTransacciones() {
        try {
            console.log('Iniciando carga de transacciones...');
            const tbody = document.getElementById('transacciones-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">Cargando transacciones...</td></tr>';
            }
            
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            console.log('Consultando base de datos...');
            const resultados = await window.electronAPI.dbQuery(`
                SELECT 
                    t.*,
                    c.nombre || ' ' || c.apellido as nombre_cliente
                FROM Transacciones t
                JOIN Clientes c ON t.id_cliente = c.id
                ORDER BY t.fecha_apertura DESC, t.id DESC
            `);
            console.log('Transacciones obtenidas:', resultados);
            
            window.transaccionesModule.transacciones = resultados || [];
            transacciones.length = 0;
            if (window.transaccionesModule.transacciones.length > 0) {
                transacciones.push(...window.transaccionesModule.transacciones);
            }
            mostrarTransacciones(transacciones);
        } catch (error) {
            console.error('Error al cargar transacciones:', error);
            const tbody = document.getElementById('transacciones-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="error-message">Error al cargar las transacciones: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar las transacciones: ' + (error.message || error));
        }
    }

    // Mostrar transacciones en la tabla
    function mostrarTransacciones(listaTransacciones) {
        const tbody = document.getElementById('transacciones-table-body');
        
        if (!tbody) return;
        
        if (listaTransacciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay transacciones registradas</td></tr>';
            return;
        }

        tbody.innerHTML = listaTransacciones.map((transaccion, index) => {
            const estadoClass = transaccion.estado === 'cerrada' ? 'estado-pagado' : 'estado-pendiente';
            const estadoText = transaccion.estado === 'cerrada' ? 'Cerrada' : 'Abierta';
            
            // Formatear fechas
            let fechaApertura = transaccion.fecha_apertura;
            // Si viene en formato ISO (YYYY-MM-DD o con T)
            if (fechaApertura && fechaApertura.includes('-')) {
                if (fechaApertura.includes('T')) {
                    // Formato ISO completo: 2025-11-29T10:30:00.000Z
                    const fecha = new Date(fechaApertura);
                    const dia = String(fecha.getDate()).padStart(2, '0');
                    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                    const año = fecha.getFullYear();
                    fechaApertura = `${dia}/${mes}/${año}`;
                } else {
                    // Formato YYYY-MM-DD
                    const [year, month, day] = fechaApertura.split('-');
                    fechaApertura = `${day}/${month}/${year}`;
                }
            }
            
            let fechaCierre = transaccion.fecha_cierre || '-';
            if (fechaCierre !== '-' && fechaCierre.includes('-')) {
                if (fechaCierre.includes('T')) {
                    // Formato ISO completo
                    const fecha = new Date(fechaCierre);
                    const dia = String(fecha.getDate()).padStart(2, '0');
                    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                    const año = fecha.getFullYear();
                    fechaCierre = `${dia}/${mes}/${año}`;
                } else {
                    // Formato YYYY-MM-DD
                    const [year, month, day] = fechaCierre.split('-');
                    fechaCierre = `${day}/${month}/${year}`;
                }
            }
            
            return `
                <tr class="${estadoClass}">
                    <td>#${index + 1}</td>
                    <td>${transaccion.nombre_cliente}</td>
                    <td>${fechaApertura}</td>
                    <td>${fechaCierre}</td>
                    <td>${parseFloat(transaccion.total_en_bs || 0).toFixed(2)} Bs</td>
                    <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                    <td class="actions">
                        ${transaccion.estado === 'abierta' ? `
                            <button class="btn-icon btn-edit" onclick="window.cerrarTransaccion(${transaccion.id})" title="Cerrar Transacción">
                                💰
                            </button>
                            <button class="btn-icon btn-edit" onclick="window.editarTransaccion(${transaccion.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.eliminarTransaccion(${transaccion.id})" title="Eliminar">
                                🗑️
                            </button>
                        ` : `
                            <button class="btn-icon btn-view" onclick="window.verTransaccion(${transaccion.id})" title="Ver Detalles">
                                👁️
                            </button>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Exponer función para uso externo
    window.mostrarTransacciones = mostrarTransacciones;

    // Filtrar transacciones
    function filtrarTransacciones() {
        const searchTerm = document.getElementById('search-transaccion').value.toLowerCase();
        const filterEstado = document.getElementById('filter-estado').value;

        let transaccionesFiltradas = transacciones;

        // Filtrar por estado
        if (filterEstado !== 'all') {
            transaccionesFiltradas = transaccionesFiltradas.filter(t => t.estado === filterEstado);
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            transaccionesFiltradas = transaccionesFiltradas.filter(transaccion => {
                const cliente = (transaccion.nombre_cliente || '').toLowerCase();
                return cliente.includes(searchTerm);
            });
        }

        mostrarTransacciones(transaccionesFiltradas);
    }

    // Agregar una nueva fila de servicio
    function agregarFilaServicio() {
        contadorFilaServicio++;
        const filaId = `servicio-fila-${contadorFilaServicio}`;
        const serviciosLista = document.getElementById('servicios-lista');
        
        if (!serviciosLista) return;
        
        const filaHTML = `
            <div class="servicio-fila" id="${filaId}" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 6px; background: var(--bg-secondary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: var(--text-primary);">Servicio ${contadorFilaServicio}</strong>
                    <button type="button" class="btn-icon btn-delete" onclick="eliminarFilaServicio('${filaId}')" title="Eliminar servicio" style="background: transparent; border: none; color: var(--text-danger); cursor: pointer; font-size: 18px;">🗑️</button>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label>Servicio *</label>
                        <select class="servicio-select" data-fila="${filaId}" required>
                            <option value="">Seleccione un servicio...</option>
                            ${servicios.map(s => `<option value="${s.id}" data-precio="${s.precio_bs || 0}">${s.nombre}${s.precio_bs ? ` - ${parseFloat(s.precio_bs).toFixed(2)} Bs` : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="flex: 2;">
                        <label>Empleado *</label>
                        <select class="servicio-empleado" data-fila="${filaId}" required>
                            <option value="">Seleccione un empleado...</option>
                            ${empleados.map(e => `<option value="${e.id}">${e.nombre} ${e.apellido}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label>Precio (Bs)</label>
                        <input type="text" class="servicio-precio" data-fila="${filaId}" placeholder="0.00" readonly>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Propina (Bs)</label>
                        <input type="text" class="servicio-propina" data-fila="${filaId}" placeholder="0.00" inputmode="decimal">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Propina Ref. ($)</label>
                        <input type="text" class="servicio-propina-dolares" data-fila="${filaId}" placeholder="0.00" readonly>
                    </div>
                </div>
            </div>
        `;
        
        serviciosLista.insertAdjacentHTML('beforeend', filaHTML);
        
        // Configurar event listeners para la nueva fila
        const filaElement = document.getElementById(filaId);
        const servicioSelect = filaElement.querySelector('.servicio-select');
        
        if (servicioSelect) {
            servicioSelect.onchange = () => calcularPrecioServicio(filaId);
        }
        
        const propinaInput = filaElement.querySelector('.servicio-propina');
        if (propinaInput) {
            if (typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(propinaInput);
            }
            propinaInput.oninput = async () => {
                await calcularPropinaDolares(filaId);
                actualizarTotalGeneral();
            };
        }
        
        // Actualizar total general
        actualizarTotalGeneral();
    }

    // Eliminar una fila de servicio
    window.eliminarFilaServicio = function(filaId) {
        const fila = document.getElementById(filaId);
        if (fila) {
            fila.remove();
            actualizarTotalGeneral();
        }
    };

    // Calcular precio de un servicio
    function calcularPrecioServicio(filaId) {
        const fila = document.getElementById(filaId);
        if (!fila) return;
        
        const servicioSelect = fila.querySelector('.servicio-select');
        const precioInput = fila.querySelector('.servicio-precio');
        
        if (!servicioSelect || !precioInput) return;
        
        const servicioId = servicioSelect.value;
        
        if (servicioId) {
            const servicio = servicios.find(s => s.id == servicioId);
            if (servicio && servicio.precio_bs) {
                precioInput.value = parseFloat(servicio.precio_bs).toFixed(2);
            } else {
                precioInput.value = 'No disponible';
            }
        } else {
            precioInput.value = '';
        }
        
        actualizarTotalGeneral();
    }

    // Calcular propina en dólares basándose en la tasa del día
    async function calcularPropinaDolares(filaId) {
        const fila = document.getElementById(filaId);
        if (!fila) return;
        
        const propinaInput = fila.querySelector('.servicio-propina');
        const propinaDolaresInput = fila.querySelector('.servicio-propina-dolares');
        
        if (!propinaInput || !propinaDolaresInput) return;
        
        const propinaBs = parseFloat(propinaInput.value.replace(/[^\d.]/g, '')) || 0;
        
        if (propinaBs === 0) {
            propinaDolaresInput.value = '0.00';
            return;
        }
        
        try {
            // Obtener fecha de hoy
            const hoy = new Date();
            const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
            
            // Obtener tasa del día
            const tasaHoy = await window.electronAPI.dbGet(
                'SELECT * FROM TasasCambio WHERE fecha = ?',
                [fechaHoy]
            );
            
            if (!tasaHoy) {
                propinaDolaresInput.value = '0.00';
                return;
            }
            
            // Calcular propina en dólares
            const propinaDolares = propinaBs / tasaHoy.tasa_bs_por_dolar;
            propinaDolaresInput.value = propinaDolares.toFixed(2);
        } catch (error) {
            console.error('Error al calcular propina en dólares:', error);
            propinaDolaresInput.value = '0.00';
        }
    }

    // Agregar una nueva fila de producto
    function agregarFilaProducto() {
        contadorFilaProducto++;
        const filaId = `producto-fila-${contadorFilaProducto}`;
        const productosLista = document.getElementById('productos-lista');
        
        if (!productosLista) return;
        
        const filaHTML = `
            <div class="producto-fila" id="${filaId}" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 6px; background: var(--bg-secondary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: var(--text-primary);">Producto ${contadorFilaProducto}</strong>
                    <button type="button" class="btn-icon btn-delete" onclick="eliminarFilaProducto('${filaId}')" title="Eliminar producto" style="background: transparent; border: none; color: var(--text-danger); cursor: pointer; font-size: 18px;">🗑️</button>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label>Producto *</label>
                        <select class="producto-select" data-fila="${filaId}" required>
                            <option value="">Seleccione un producto...</option>
                            ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio_bs || 0}" data-stock="${p.cantidad}">${p.nombre} (Stock: ${p.cantidad}${p.precio_bs ? ` - ${parseFloat(p.precio_bs).toFixed(2)} Bs` : ''})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Cantidad *</label>
                        <input type="text" class="producto-cantidad" data-fila="${filaId}" required placeholder="0" inputmode="numeric">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label>Precio Unit. (Bs)</label>
                        <input type="text" class="producto-precio-unitario" data-fila="${filaId}" placeholder="0.00" readonly>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Total (Bs)</label>
                        <input type="text" class="producto-total" data-fila="${filaId}" placeholder="0.00" readonly>
                    </div>
                </div>
            </div>
        `;
        
        productosLista.insertAdjacentHTML('beforeend', filaHTML);
        
        // Configurar event listeners para la nueva fila
        const filaElement = document.getElementById(filaId);
        const productoSelect = filaElement.querySelector('.producto-select');
        const cantidadInput = filaElement.querySelector('.producto-cantidad');
        
        if (productoSelect) {
            productoSelect.onchange = () => calcularPrecioProducto(filaId);
        }
        
        if (cantidadInput) {
            cantidadInput.oninput = () => calcularPrecioProducto(filaId);
            if (typeof formatearInputCantidad === 'function') {
                formatearInputCantidad(cantidadInput);
            }
        }
        
        // Actualizar total general
        actualizarTotalGeneral();
    }

    // Eliminar una fila de producto
    window.eliminarFilaProducto = function(filaId) {
        const fila = document.getElementById(filaId);
        if (fila) {
            fila.remove();
            actualizarTotalGeneral();
        }
    };

    // Calcular precio de un producto
    function calcularPrecioProducto(filaId) {
        const fila = document.getElementById(filaId);
        if (!fila) return;
        
        const productoSelect = fila.querySelector('.producto-select');
        const cantidadInput = fila.querySelector('.producto-cantidad');
        const precioUnitarioInput = fila.querySelector('.producto-precio-unitario');
        const precioTotalInput = fila.querySelector('.producto-total');
        
        if (!productoSelect || !cantidadInput || !precioUnitarioInput || !precioTotalInput) return;
        
        const productoId = productoSelect.value;
        const cantidad = parseInt(cantidadInput.value.replace(/[^\d]/g, '')) || 0;
        
        if (productoId && cantidad > 0) {
            const optionSeleccionado = productoSelect.options[productoSelect.selectedIndex];
            let precioUnitario = 0;
            
            if (optionSeleccionado && optionSeleccionado.dataset.precio) {
                precioUnitario = parseFloat(optionSeleccionado.dataset.precio) || 0;
            } else {
                const producto = productos.find(p => p.id == productoId);
                if (producto && producto.precio_bs) {
                    precioUnitario = parseFloat(producto.precio_bs) || 0;
                }
            }
            
            if (precioUnitario > 0) {
                const precioTotal = precioUnitario * cantidad;
                precioUnitarioInput.value = precioUnitario.toFixed(2);
                precioTotalInput.value = precioTotal.toFixed(2);
            } else {
                precioUnitarioInput.value = 'No disponible';
                precioTotalInput.value = 'No disponible';
            }
        } else {
            precioUnitarioInput.value = '';
            precioTotalInput.value = '';
        }
        
        actualizarTotalGeneral();
    }

    // Actualizar total general sumando todos los servicios y productos
    function actualizarTotalGeneral() {
        const totalGeneralInput = document.getElementById('transaccion-total-general');
        if (!totalGeneralInput) return;
        
        let totalGeneral = 0;
        
        // Sumar servicios
        const filasServicios = document.querySelectorAll('.servicio-fila');
        filasServicios.forEach(fila => {
            const precioInput = fila.querySelector('.servicio-precio');
            const propinaInput = fila.querySelector('.servicio-propina');
            
            if (precioInput && precioInput.value && precioInput.value !== 'No disponible') {
                const precio = parseFloat(precioInput.value.replace(/[^\d.]/g, '')) || 0;
                totalGeneral += precio;
            }
            
            if (propinaInput && propinaInput.value) {
                const propina = parseFloat(propinaInput.value.replace(/[^\d.]/g, '')) || 0;
                totalGeneral += propina;
            }
        });
        
        // Sumar productos
        const filasProductos = document.querySelectorAll('.producto-fila');
        filasProductos.forEach(fila => {
            const totalInput = fila.querySelector('.producto-total');
            if (totalInput && totalInput.value && totalInput.value !== 'No disponible') {
                const valor = parseFloat(totalInput.value.replace(/[^\d.]/g, '')) || 0;
                totalGeneral += valor;
            }
        });
        
        totalGeneralInput.value = totalGeneral.toFixed(2);
    }

    // Validar métodos de pago que requieren entidad
    function validarMetodosPago() {
        const entidadesGroup = document.getElementById('entidades-group');
        const metodoCheckboxes = document.querySelectorAll('.metodo-pago-checkbox:checked');
        
        let requiereEntidad = false;
        metodoCheckboxes.forEach(checkbox => {
            if (checkbox.dataset.requiereEntidad === 'true') {
                requiereEntidad = true;
            }
        });
        
        if (entidadesGroup) {
            entidadesGroup.style.display = requiereEntidad ? 'block' : 'none';
        }
    }

    // Abrir modal para nueva transacción
    async function abrirModalNuevo() {
        transaccionEditando = null;
        document.getElementById('modal-title').textContent = 'Nueva Transacción';
        document.getElementById('transaccion-form').reset();
        document.getElementById('transaccion-id').value = '';
        
        // Limpiar listas
        const serviciosLista = document.getElementById('servicios-lista');
        const productosLista = document.getElementById('productos-lista');
        if (serviciosLista) serviciosLista.innerHTML = '';
        if (productosLista) productosLista.innerHTML = '';
        
        // Resetear contadores
        contadorFilaServicio = 0;
        contadorFilaProducto = 0;
        
        // Asegurar que los campos estén habilitados
        const clienteSelect = document.getElementById('transaccion-cliente');
        if (clienteSelect) {
            clienteSelect.disabled = false;
            clienteSelect.style.pointerEvents = 'auto';
            clienteSelect.style.cursor = 'pointer';
        }
        
        document.getElementById('transaccion-modal').classList.add('active');
        
        setTimeout(() => {
            if (clienteSelect) clienteSelect.focus();
        }, 100);
    }

    // Cerrar modal y limpiar estado
    function cerrarModal() {
        document.getElementById('transaccion-modal').classList.remove('active');
        transaccionEditando = null;
        
        // Habilitar cliente select si estaba deshabilitado
        const clienteSelect = document.getElementById('transaccion-cliente');
        if (clienteSelect) {
            clienteSelect.disabled = false;
        }
    }

    // Guardar transacción (abierta) - funciona para crear y editar
    async function guardarTransaccionAbierta() {
        let idTransaccion = parseInt(document.getElementById('transaccion-id').value);
        const esEdicion = idTransaccion > 0;
        const idCliente = parseInt(document.getElementById('transaccion-cliente').value);
        
        if (!idCliente) {
            mostrarError('Debe seleccionar un cliente');
            return;
        }

        // Si es edición, obtener productos vendidos originales para devolver stock
        let productosOriginales = [];
        if (esEdicion) {
            productosOriginales = await window.electronAPI.dbQuery(
                'SELECT * FROM ProductosVendidos WHERE id_transaccion = ?',
                [idTransaccion]
            );
        }

        // Obtener servicios
        const filasServicios = document.querySelectorAll('.servicio-fila');
        const serviciosData = [];
        
        for (const fila of filasServicios) {
            const servicioSelect = fila.querySelector('.servicio-select');
            const empleadoSelect = fila.querySelector('.servicio-empleado');
            const precioInput = fila.querySelector('.servicio-precio');
            const propinaInput = fila.querySelector('.servicio-propina');
            
            if (!servicioSelect || !empleadoSelect) continue;
            
            const idServicio = parseInt(servicioSelect.value);
            const idEmpleado = parseInt(empleadoSelect.value);
            
            if (!idServicio || !idEmpleado) {
                mostrarError('Todos los servicios deben tener servicio y empleado seleccionados');
                return;
            }
            
            const precio = parseFloat(precioInput.value.replace(/[^\d.]/g, '')) || 0;
            const propina = parseFloat(propinaInput.value.replace(/[^\d.]/g, '')) || 0;
            
            serviciosData.push({
                id_servicio: idServicio,
                id_empleado: idEmpleado,
                precio: precio,
                propina: propina
            });
        }

        // Obtener productos
        const filasProductos = document.querySelectorAll('.producto-fila');
        const productosData = [];
        
        for (const fila of filasProductos) {
            const productoSelect = fila.querySelector('.producto-select');
            const cantidadInput = fila.querySelector('.producto-cantidad');
            const precioTotalInput = fila.querySelector('.producto-total');
            
            if (!productoSelect || !cantidadInput) continue;
            
            const idProducto = parseInt(productoSelect.value);
            const cantidad = parseInt(cantidadInput.value.replace(/[^\d]/g, '')) || 0;
            
            if (!idProducto || !cantidad) {
                mostrarError('Todos los productos deben tener producto y cantidad seleccionados');
                return;
            }
            
            if (cantidad <= 0) {
                mostrarError('La cantidad debe ser mayor a 0');
                return;
            }
            
            // Verificar stock (considerando productos originales si es edición)
            const producto = productos.find(p => p.id == idProducto);
            if (!producto) {
                mostrarError('Producto no encontrado');
                return;
            }
            
            // Si es edición, calcular stock disponible considerando productos originales
            let stockDisponible = producto.cantidad;
            if (esEdicion) {
                const productoOriginal = productosOriginales.find(p => p.id_producto == idProducto);
                if (productoOriginal) {
                    // Si es el mismo producto, el stock disponible incluye la cantidad original
                    stockDisponible += productoOriginal.cantidad;
                }
            }
            
            if (cantidad > stockDisponible) {
                mostrarError(`No hay suficiente stock de ${producto.nombre}. Stock disponible: ${stockDisponible}`);
                return;
            }
            
            const precioTotal = parseFloat(precioTotalInput.value.replace(/[^\d.]/g, '')) || 0;
            
            productosData.push({
                id_producto: idProducto,
                cantidad: cantidad,
                precio_total: precioTotal
            });
        }

        if (serviciosData.length === 0 && productosData.length === 0) {
            mostrarError('Debe agregar al menos un servicio o producto');
            return;
        }

        // Calcular totales
        const totalGeneralInput = document.getElementById('transaccion-total-general');
        const totalBs = parseFloat(totalGeneralInput.value.replace(/[^\d.]/g, '')) || 0;
        
        // Calcular total en dólares (necesitamos la tasa del día)
        const hoy = new Date();
        const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
        const tasaHoy = await window.electronAPI.dbGet(
            'SELECT * FROM TasasCambio WHERE fecha = ?',
            [fechaHoy]
        );
        
        if (!tasaHoy) {
            mostrarError('No hay tasa de cambio establecida para hoy. Por favor, establece la tasa del día primero.');
            return;
        }
        
        const totalDolares = totalBs / tasaHoy.tasa_bs_por_dolar;

        // Generar resúmenes
        const serviciosNombres = serviciosData.map(s => {
            const servicio = servicios.find(serv => serv.id == s.id_servicio);
            return servicio ? servicio.nombre : '';
        }).filter(n => n).join(', ');
        
        const productosNombres = productosData.map(p => {
            const producto = productos.find(prod => prod.id == p.id_producto);
            return producto ? producto.nombre : '';
        }).filter(n => n).join('\n');
        
        const productosCantidades = productosData.map(p => p.cantidad).join('\n');

        // Fecha de apertura (mantener la original si es edición)
        let fechaAperturaStr;
        if (esEdicion && transaccionEditando) {
            fechaAperturaStr = transaccionEditando.fecha_apertura;
        } else {
            // Usar formato DD/MM/YYYY HH:MM:SS para consistencia
            const fechaApertura = new Date();
            const dia = String(fechaApertura.getDate()).padStart(2, '0');
            const mes = String(fechaApertura.getMonth() + 1).padStart(2, '0');
            const año = fechaApertura.getFullYear();
            const hora = String(fechaApertura.getHours()).padStart(2, '0');
            const minuto = String(fechaApertura.getMinutes()).padStart(2, '0');
            const segundo = String(fechaApertura.getSeconds()).padStart(2, '0');
            fechaAperturaStr = `${dia}/${mes}/${año} ${hora}:${minuto}:${segundo}`;
        }

        try {
            if (esEdicion) {
                // Actualizar transacción existente
                await window.electronAPI.dbRun(
                    `UPDATE Transacciones 
                    SET servicios_consumidos = ?, productos_comprados_nombres = ?, productos_comprados_cantidad = ?, total_en_dolares = ?, total_en_bs = ?
                    WHERE id = ?`,
                    [serviciosNombres, productosNombres, productosCantidades, totalDolares, totalBs, idTransaccion]
                );
                
                // Eliminar servicios realizados antiguos
                await window.electronAPI.dbRun(
                    'DELETE FROM ServiciosRealizados WHERE id_transaccion = ?',
                    [idTransaccion]
                );
                
                // Devolver productos al stock
                for (const productoOriginal of productosOriginales) {
                    await window.electronAPI.dbRun(
                        'UPDATE Productos SET cantidad = cantidad + ? WHERE id = ?',
                        [productoOriginal.cantidad, productoOriginal.id_producto]
                    );
                }
                
                // Eliminar productos vendidos antiguos
                await window.electronAPI.dbRun(
                    'DELETE FROM ProductosVendidos WHERE id_transaccion = ?',
                    [idTransaccion]
                );
            } else {
                // Crear nueva transacción
                const resultado = await window.electronAPI.dbRun(
                    `INSERT INTO Transacciones 
                    (id_cliente, fecha_apertura, estado, servicios_consumidos, productos_comprados_nombres, productos_comprados_cantidad, total_en_dolares, total_en_bs) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [idCliente, fechaAperturaStr, 'abierta', serviciosNombres, productosNombres, productosCantidades, totalDolares, totalBs]
                );
                
                idTransaccion = resultado.lastInsertRowid;
            }
            
            // Crear servicios realizados
            for (const servicioData of serviciosData) {
                await window.electronAPI.dbRun(
                    `INSERT INTO ServiciosRealizados 
                    (id_transaccion, id_empleado, id_servicio, fecha, precio_cobrado, propina, estado) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [idTransaccion, servicioData.id_empleado, servicioData.id_servicio, fechaAperturaStr, servicioData.precio, servicioData.propina, 'completado']
                );
            }
            
            // Crear productos vendidos y descontar stock
            for (const productoData of productosData) {
                const producto = productos.find(p => p.id == productoData.id_producto);
                const precioUnitario = productoData.precio_total / productoData.cantidad;
                
                await window.electronAPI.dbRun(
                    `INSERT INTO ProductosVendidos 
                    (id_transaccion, id_producto, cantidad, fecha, precio_unitario, precio_total) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [idTransaccion, productoData.id_producto, productoData.cantidad, fechaAperturaStr, precioUnitario, productoData.precio_total]
                );
                
                // Descontar del stock
                await window.electronAPI.dbRun(
                    'UPDATE Productos SET cantidad = cantidad - ? WHERE id = ?',
                    [productoData.cantidad, productoData.id_producto]
                );
            }

            cerrarModal();
            await cargarDatos(); // Recargar transacciones y productos
            mostrarExito(esEdicion ? 'Transacción actualizada correctamente' : 'Transacción creada correctamente');
        } catch (error) {
            console.error('Error al guardar transacción:', error);
            mostrarError('Error al guardar la transacción: ' + (error.message || 'Error desconocido'));
        }
    }

    // Cerrar transacción
    window.cerrarTransaccion = async function(id) {
        try {
            const transaccion = await window.electronAPI.dbGet(`
                SELECT 
                    t.*,
                    c.nombre || ' ' || c.apellido as nombre_cliente
                FROM Transacciones t
                JOIN Clientes c ON t.id_cliente = c.id
                WHERE t.id = ?
            `, [id]);
            
            if (!transaccion) {
                mostrarError('Transacción no encontrada');
                return;
            }

            if (transaccion.estado === 'cerrada') {
                mostrarError('Esta transacción ya está cerrada');
                return;
            }

            transaccionEditando = transaccion;
            document.getElementById('cerrar-transaccion-id').value = transaccion.id;
            
            // Llenar resumen
            const resumen = document.getElementById('resumen-transaccion');
            if (resumen) {
                resumen.innerHTML = `
                    <p><strong>Cliente:</strong> ${transaccion.nombre_cliente}</p>
                    <p><strong>Total:</strong> ${parseFloat(transaccion.total_en_bs).toFixed(2)} Bs</p>
                    <p><strong>Servicios:</strong> ${transaccion.servicios_consumidos || 'Ninguno'}</p>
                    <p><strong>Productos:</strong> ${transaccion.productos_comprados_nombres || 'Ninguno'}</p>
                `;
            }
            
            // Limpiar formulario
            document.querySelectorAll('.metodo-pago-checkbox').forEach(cb => cb.checked = false);
            document.querySelectorAll('.entidad-pago-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('numero-referencia').value = '';
            document.getElementById('entidades-group').style.display = 'none';
            
            document.getElementById('cerrar-transaccion-modal').classList.add('active');
        } catch (error) {
            console.error('Error al cargar transacción:', error);
            mostrarError('Error al cargar la transacción');
        }
    };

    // Cerrar transacción (guardar métodos de pago)
    async function cerrarTransaccion() {
        const id = parseInt(document.getElementById('cerrar-transaccion-id').value);
        
        if (!id) {
            mostrarError('Error: ID de transacción no encontrado');
            return;
        }

        // Obtener métodos de pago seleccionados
        const metodosSeleccionados = Array.from(document.querySelectorAll('.metodo-pago-checkbox:checked'))
            .map(cb => cb.value);
        
        if (metodosSeleccionados.length === 0) {
            mostrarError('Debe seleccionar al menos un método de pago');
            return;
        }

        // Verificar si algún método requiere entidad
        const metodosConEntidad = metodosSeleccionados.filter(m => {
            const checkbox = document.querySelector(`.metodo-pago-checkbox[value="${m}"]`);
            return checkbox && checkbox.dataset.requiereEntidad === 'true';
        });

        // Obtener entidades seleccionadas
        const entidadesSeleccionadas = Array.from(document.querySelectorAll('.entidad-pago-checkbox:checked'))
            .map(cb => cb.value);
        
        if (metodosConEntidad.length > 0 && entidadesSeleccionadas.length === 0) {
            mostrarError('Debe seleccionar al menos una entidad de pago para los métodos seleccionados');
            return;
        }

        // Obtener número de referencia
        const numeroReferencia = document.getElementById('numero-referencia').value.trim();

        const metodosPagoStr = metodosSeleccionados.join(',');
        const entidadesPagoStr = entidadesSeleccionadas.join(',');

        // Fecha de cierre - usar formato DD/MM/YYYY HH:MM:SS
        const fechaCierre = new Date();
        const dia = String(fechaCierre.getDate()).padStart(2, '0');
        const mes = String(fechaCierre.getMonth() + 1).padStart(2, '0');
        const año = fechaCierre.getFullYear();
        const hora = String(fechaCierre.getHours()).padStart(2, '0');
        const minuto = String(fechaCierre.getMinutes()).padStart(2, '0');
        const segundo = String(fechaCierre.getSeconds()).padStart(2, '0');
        const fechaCierreStr = `${dia}/${mes}/${año} ${hora}:${minuto}:${segundo}`;

        try {
            await window.electronAPI.dbRun(
                `UPDATE Transacciones 
                SET fecha_cierre = ?, estado = ?, metodos_pago = ?, entidades_pago = ?, numero_referencia = ? 
                WHERE id = ?`,
                [fechaCierreStr, 'cerrada', metodosPagoStr, entidadesPagoStr, numeroReferencia || null, id]
            );

            cerrarModalCerrar();
            await cargarDatos();
            mostrarExito('Transacción cerrada correctamente');
        } catch (error) {
            console.error('Error al cerrar transacción:', error);
            mostrarError('Error al cerrar la transacción: ' + (error.message || 'Error desconocido'));
        }
    }

    // Editar transacción (solo si está abierta)
    window.editarTransaccion = async function(id) {
        try {
            // Recargar productos para tener stock actualizado
            await cargarProductos();
            
            const transaccion = await window.electronAPI.dbGet(`
                SELECT 
                    t.*,
                    c.nombre || ' ' || c.apellido as nombre_cliente
                FROM Transacciones t
                JOIN Clientes c ON t.id_cliente = c.id
                WHERE t.id = ?
            `, [id]);
            
            if (!transaccion) {
                mostrarError('Transacción no encontrada');
                return;
            }

            if (transaccion.estado === 'cerrada') {
                mostrarError('No se puede editar una transacción cerrada');
                return;
            }

            transaccionEditando = transaccion;
            document.getElementById('modal-title').textContent = 'Editar Transacción';
            document.getElementById('transaccion-id').value = transaccion.id;
            document.getElementById('transaccion-cliente').value = transaccion.id_cliente;
            
            // Deshabilitar cambio de cliente al editar
            const clienteSelect = document.getElementById('transaccion-cliente');
            if (clienteSelect) {
                clienteSelect.disabled = true;
            }

            // Cargar servicios realizados
            const serviciosRealizados = await window.electronAPI.dbQuery(`
                SELECT 
                    sr.*,
                    s.nombre as nombre_servicio
                FROM ServiciosRealizados sr
                JOIN Servicios s ON sr.id_servicio = s.id
                WHERE sr.id_transaccion = ? AND sr.estado = 'completado'
            `, [id]);

            // Cargar productos vendidos
            const productosVendidos = await window.electronAPI.dbQuery(`
                SELECT 
                    pv.*,
                    p.nombre as nombre_producto,
                    p.precio_bs
                FROM ProductosVendidos pv
                JOIN Productos p ON pv.id_producto = p.id
                WHERE pv.id_transaccion = ?
            `, [id]);

            // Limpiar listas
            const serviciosLista = document.getElementById('servicios-lista');
            const productosLista = document.getElementById('productos-lista');
            if (serviciosLista) serviciosLista.innerHTML = '';
            if (productosLista) productosLista.innerHTML = '';

            // Resetear contadores
            contadorFilaServicio = 0;
            contadorFilaProducto = 0;

            // Agregar servicios
            for (const servicio of serviciosRealizados) {
                agregarFilaServicio();
                const filaId = `servicio-fila-${contadorFilaServicio}`;
                const fila = document.getElementById(filaId);
                
                if (fila) {
                    const servicioSelect = fila.querySelector('.servicio-select');
                    const empleadoSelect = fila.querySelector('.servicio-empleado');
                    const precioInput = fila.querySelector('.servicio-precio');
                    const propinaInput = fila.querySelector('.servicio-propina');
                    
                    if (servicioSelect) servicioSelect.value = servicio.id_servicio;
                    if (empleadoSelect) empleadoSelect.value = servicio.id_empleado;
                    if (precioInput) precioInput.value = parseFloat(servicio.precio_cobrado).toFixed(2);
                    if (propinaInput) {
                        propinaInput.value = parseFloat(servicio.propina || 0).toFixed(2);
                        if (typeof formatearInputPrecio === 'function') {
                            formatearInputPrecio(propinaInput);
                        }
                        // Configurar evento para calcular propina en dólares
                        propinaInput.oninput = async () => {
                            await calcularPropinaDolares(filaId);
                            actualizarTotalGeneral();
                        };
                        // Calcular propina en dólares con el valor actual
                        await calcularPropinaDolares(filaId);
                    }
                    
                    // Calcular precio y propina en dólares si es necesario
                    if (servicioSelect) {
                        calcularPrecioServicio(filaId);
                    } else {
                        calcularPropinaDolares(filaId);
                    }
                }
            }

            // Agregar productos
            for (const producto of productosVendidos) {
                agregarFilaProducto();
                const filaId = `producto-fila-${contadorFilaProducto}`;
                const fila = document.getElementById(filaId);
                
                if (fila) {
                    const productoSelect = fila.querySelector('.producto-select');
                    const cantidadInput = fila.querySelector('.producto-cantidad');
                    const precioUnitarioInput = fila.querySelector('.producto-precio-unitario');
                    const precioTotalInput = fila.querySelector('.producto-total');
                    
                    if (productoSelect) productoSelect.value = producto.id_producto;
                    if (cantidadInput) {
                        cantidadInput.value = producto.cantidad;
                        if (typeof formatearInputCantidad === 'function') {
                            formatearInputCantidad(cantidadInput);
                        }
                    }
                    if (precioUnitarioInput) precioUnitarioInput.value = parseFloat(producto.precio_unitario).toFixed(2);
                    if (precioTotalInput) precioTotalInput.value = parseFloat(producto.precio_total).toFixed(2);
                    
                    // Calcular precio si es necesario
                    if (productoSelect && cantidadInput) {
                        calcularPrecioProducto(filaId);
                    }
                }
            }

            // Actualizar total general
            actualizarTotalGeneral();

            document.getElementById('transaccion-modal').classList.add('active');
        } catch (error) {
            console.error('Error al cargar transacción para editar:', error);
            mostrarError('Error al cargar la transacción: ' + (error.message || 'Error desconocido'));
        }
    };

    // Ver detalles de transacción
    window.verTransaccion = async function(id) {
        try {
            const transaccion = await window.electronAPI.dbGet(`
                SELECT 
                    t.*,
                    c.nombre || ' ' || c.apellido as nombre_cliente
                FROM Transacciones t
                JOIN Clientes c ON t.id_cliente = c.id
                WHERE t.id = ?
            `, [id]);
            
            if (!transaccion) {
                mostrarError('Transacción no encontrada');
                return;
            }

            // Obtener servicios realizados
            const serviciosRealizados = await window.electronAPI.dbQuery(`
                SELECT 
                    sr.*,
                    s.nombre as nombre_servicio,
                    e.nombre || ' ' || e.apellido as nombre_empleado
                FROM ServiciosRealizados sr
                JOIN Servicios s ON sr.id_servicio = s.id
                JOIN Empleados e ON sr.id_empleado = e.id
                WHERE sr.id_transaccion = ? AND sr.estado = 'completado'
            `, [id]);

            // Obtener productos vendidos
            const productosVendidos = await window.electronAPI.dbQuery(`
                SELECT 
                    pv.*,
                    p.nombre as nombre_producto
                FROM ProductosVendidos pv
                JOIN Productos p ON pv.id_producto = p.id
                WHERE pv.id_transaccion = ?
            `, [id]);

            // Formatear fecha
            let fechaApertura = transaccion.fecha_apertura;
            let fechaCierre = transaccion.fecha_cierre || '-';
            
            document.getElementById('ver-transaccion-titulo').textContent = `Transacción #${transaccion.id}`;
            
            const contenido = document.getElementById('ver-transaccion-contenido');
            contenido.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Información General</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Cliente:</strong> ${transaccion.nombre_cliente}</p>
                            <p><strong>Estado:</strong> <span class="badge ${transaccion.estado === 'cerrada' ? 'estado-pagado' : 'estado-pendiente'}">${transaccion.estado === 'cerrada' ? 'Cerrada' : 'Abierta'}</span></p>
                            <p><strong>Fecha Apertura:</strong> ${fechaApertura}</p>
                            ${transaccion.fecha_cierre ? `<p><strong>Fecha Cierre:</strong> ${fechaCierre}</p>` : ''}
                            <p><strong>Total:</strong> ${parseFloat(transaccion.total_en_bs || 0).toFixed(2)} Bs ($${parseFloat(transaccion.total_en_dolares || 0).toFixed(2)})</p>
                        </div>
                    </div>

                    ${serviciosRealizados && serviciosRealizados.length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Servicios Realizados (${serviciosRealizados.length})</h4>
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
                                ${serviciosRealizados.map(s => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${s.nombre_servicio}</td>
                                        <td style="padding: 8px;">${s.nombre_empleado}</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(s.precio_cobrado).toFixed(2)} Bs</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(s.propina || 0).toFixed(2)} Bs</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}

                    ${productosVendidos && productosVendidos.length > 0 ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Productos Vendidos (${productosVendidos.length})</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <th style="text-align: left; padding: 8px;">Producto</th>
                                    <th style="text-align: right; padding: 8px;">Cantidad</th>
                                    <th style="text-align: right; padding: 8px;">Precio Unit.</th>
                                    <th style="text-align: right; padding: 8px;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productosVendidos.map(p => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">${p.nombre_producto}</td>
                                        <td style="text-align: right; padding: 8px;">${p.cantidad}</td>
                                        <td style="text-align: right; padding: 8px;">${parseFloat(p.precio_unitario).toFixed(2)} Bs</td>
                                        <td style="text-align: right; padding: 8px;"><strong>${parseFloat(p.precio_total).toFixed(2)} Bs</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}

                    ${transaccion.estado === 'cerrada' ? `
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px;">
                        <h4 style="margin-top: 0; color: var(--text-primary);">Información de Pago</h4>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <p><strong>Métodos de Pago:</strong> ${transaccion.metodos_pago || 'No especificado'}</p>
                            <p><strong>Entidades:</strong> ${transaccion.entidades_pago || 'No especificado'}</p>
                            ${transaccion.numero_referencia ? `<p><strong>Número de Referencia:</strong> ${transaccion.numero_referencia}</p>` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;

            document.getElementById('ver-transaccion-modal').classList.add('active');
        } catch (error) {
            console.error('Error al cargar transacción:', error);
            mostrarError('Error al cargar la transacción');
        }
    };

    // Eliminar transacción
    window.eliminarTransaccion = function(id) {
        transaccionAEliminar = id;
        document.getElementById('delete-modal').classList.add('active');
    };

    // Confirmar eliminación
    async function eliminarTransaccionConfirmado() {
        if (!transaccionAEliminar) return;

        try {
            // Verificar que la transacción esté abierta
            const transaccion = await window.electronAPI.dbGet(
                'SELECT * FROM Transacciones WHERE id = ?',
                [transaccionAEliminar]
            );

            if (!transaccion) {
                mostrarError('Transacción no encontrada');
                cerrarModalEliminar();
                return;
            }

            if (transaccion.estado === 'cerrada') {
                mostrarError('No se puede eliminar una transacción cerrada');
                cerrarModalEliminar();
                return;
            }

            // Obtener productos vendidos para devolver al stock
            const productosVendidos = await window.electronAPI.dbQuery(
                'SELECT * FROM ProductosVendidos WHERE id_transaccion = ?',
                [transaccionAEliminar]
            );

            // Devolver productos al stock
            for (const productoVendido of productosVendidos) {
                await window.electronAPI.dbRun(
                    'UPDATE Productos SET cantidad = cantidad + ? WHERE id = ?',
                    [productoVendido.cantidad, productoVendido.id_producto]
                );
            }

            // Eliminar transacción (las tablas relacionadas se eliminan por CASCADE)
            await window.electronAPI.dbRun('DELETE FROM Transacciones WHERE id = ?', [transaccionAEliminar]);
            cerrarModalEliminar();
            await cargarDatos();
            mostrarExito('Transacción eliminada correctamente');
            transaccionAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar transacción:', error);
            mostrarError('Error al eliminar la transacción');
            transaccionAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModalCerrar() {
        document.getElementById('cerrar-transaccion-modal').classList.remove('active');
    }

    function cerrarModalVer() {
        document.getElementById('ver-transaccion-modal').classList.remove('active');
    }

    function cerrarModalEliminar() {
        document.getElementById('delete-modal').classList.remove('active');
        transaccionAEliminar = null;
    }

    // Mostrar mensajes
    function mostrarError(mensaje) {
        alert('Error: ' + mensaje);
    }

    function mostrarExito(mensaje) {
        alert('Éxito: ' + mensaje);
    }
})();

