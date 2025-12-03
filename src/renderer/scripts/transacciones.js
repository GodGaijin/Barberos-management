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
    
    // Variables de paginación
    let currentPageTransacciones = 1;
    const itemsPerPage = 15;
    let transaccionesFiltradas = [];
    let contadorFilaProducto = 0;
    let contadorFilaPropina = 0;
    
    // Variable para el filtro de fecha actual (por defecto: hoy)
    let filtroFechaActual = 'hoy';

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

            // Botones agregar servicio/producto/propina
            const btnAgregarServicio = document.getElementById('btn-agregar-servicio');
            if (btnAgregarServicio) {
                btnAgregarServicio.onclick = agregarFilaServicio;
            }

            const btnAgregarProducto = document.getElementById('btn-agregar-producto');
            if (btnAgregarProducto) {
                btnAgregarProducto.onclick = agregarFilaProducto;
            }
            
            const btnAgregarPropina = document.getElementById('btn-agregar-propina');
            if (btnAgregarPropina) {
                btnAgregarPropina.onclick = agregarFilaPropina;
            }
            
            // Búsqueda de clientes
            const clienteSearch = document.getElementById('transaccion-cliente-search');
            if (clienteSearch) {
                clienteSearch.oninput = filtrarClientesSelect;
                // Permitir búsqueda con Enter
                clienteSearch.onkeypress = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        buscarClienteEnDB();
                    }
                };
                clienteSearch.onblur = () => {
                    // Cerrar dropdown después de un pequeño delay para permitir clicks
                    setTimeout(() => ocultarDropdown('clientes-results-dropdown'), 200);
                };
            }
            
            // Botón buscar cliente en base de datos
            const btnBuscarClienteDB = document.getElementById('btn-buscar-cliente-db');
            if (btnBuscarClienteDB) {
                btnBuscarClienteDB.onclick = buscarClienteEnDB;
            }
            
            // Botón nuevo cliente desde transacciones
            const btnNuevoCliente = document.getElementById('btn-nuevo-cliente-transaccion');
            if (btnNuevoCliente) {
                btnNuevoCliente.onclick = abrirModalNuevoCliente;
            }
            
            // Modal nuevo cliente
            const closeNuevoClienteModal = document.getElementById('close-nuevo-cliente-modal');
            if (closeNuevoClienteModal) {
                closeNuevoClienteModal.onclick = cerrarModalNuevoCliente;
            }
            
            const cancelNuevoCliente = document.getElementById('cancel-nuevo-cliente');
            if (cancelNuevoCliente) {
                cancelNuevoCliente.onclick = cerrarModalNuevoCliente;
            }
            
            const nuevoClienteForm = document.getElementById('nuevo-cliente-transaccion-form');
            if (nuevoClienteForm) {
                nuevoClienteForm.onsubmit = (e) => {
                    e.preventDefault();
                    guardarNuevoClienteDesdeTransaccion();
                };
            }
            
            // Búsqueda de servicios
            const servicioSearch = document.getElementById('transaccion-servicio-search');
            if (servicioSearch) {
                servicioSearch.oninput = filtrarServiciosSelect;
                servicioSearch.onkeypress = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        buscarServicioEnDB();
                    }
                };
                servicioSearch.onblur = () => {
                    // Cerrar dropdown después de un pequeño delay para permitir clicks
                    setTimeout(() => ocultarDropdown('servicios-results-dropdown'), 200);
                };
            }
            
            const btnBuscarServicioDB = document.getElementById('btn-buscar-servicio-db');
            if (btnBuscarServicioDB) {
                btnBuscarServicioDB.onclick = buscarServicioEnDB;
            }
            
            // Búsqueda de productos
            const productoSearch = document.getElementById('transaccion-producto-search');
            if (productoSearch) {
                productoSearch.oninput = filtrarProductosSelect;
                productoSearch.onkeypress = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        buscarProductoEnDB();
                    }
                };
                productoSearch.onblur = () => {
                    // Cerrar dropdown después de un pequeño delay para permitir clicks
                    setTimeout(() => ocultarDropdown('productos-results-dropdown'), 200);
                };
            }
            
            const btnBuscarProductoDB = document.getElementById('btn-buscar-producto-db');
            if (btnBuscarProductoDB) {
                btnBuscarProductoDB.onclick = buscarProductoEnDB;
            }
            
            // Cerrar dropdowns al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#transaccion-cliente-search') && 
                    !e.target.closest('#clientes-results-dropdown')) {
                    ocultarDropdown('clientes-results-dropdown');
                }
                if (!e.target.closest('#transaccion-servicio-search') && 
                    !e.target.closest('#servicios-results-dropdown')) {
                    ocultarDropdown('servicios-results-dropdown');
                }
                if (!e.target.closest('#transaccion-producto-search') && 
                    !e.target.closest('#productos-results-dropdown')) {
                    ocultarDropdown('productos-results-dropdown');
                }
            });

            // Formato automático para campos de moneda en modal de cerrar transacción
            setTimeout(() => {
                const cerrarPagadoBsInput = document.getElementById('cerrar-pagado-bs');
                const cerrarPagadoDolaresInput = document.getElementById('cerrar-pagado-dolares');
                if (cerrarPagadoBsInput && typeof formatearInputPrecio === 'function') {
                    formatearInputPrecio(cerrarPagadoBsInput);
                }
                if (cerrarPagadoDolaresInput && typeof formatearInputPrecio === 'function') {
                    formatearInputPrecio(cerrarPagadoDolaresInput);
                }
            }, 200);

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
                checkbox.onchange = (e) => {
                    // Agregar/quitar clase checked al contenedor
                    const checkboxItem = checkbox.closest('.checkbox-item');
                    if (checkboxItem) {
                        if (e.target.checked) {
                            checkboxItem.classList.add('checked');
                        } else {
                            checkboxItem.classList.remove('checked');
                        }
                    }
                    validarMetodosPago();
                    // Calcular automáticamente cantidad pagada cuando cambian los métodos
                    calcularCantidadPagadaDesdeMetodos();
                };
            });
            
            // Aplicar estilos y calcular cuando cambian las entidades
            const entidadPagoCheckboxes = document.querySelectorAll('.entidad-pago-checkbox');
            entidadPagoCheckboxes.forEach(checkbox => {
                checkbox.onchange = (e) => {
                    // Agregar/quitar clase checked al contenedor
                    const checkboxItem = checkbox.closest('.checkbox-item');
                    if (checkboxItem) {
                        if (e.target.checked) {
                            checkboxItem.classList.add('checked');
                        } else {
                            checkboxItem.classList.remove('checked');
                        }
                    }
                    // Calcular automáticamente cantidad pagada cuando cambian las entidades
                    calcularCantidadPagadaDesdeMetodos();
                };
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
            
            // Filtro de fecha
            const filterFecha = document.getElementById('filter-fecha');
            if (filterFecha) {
                // Establecer el valor por defecto
                filtroFechaActual = filterFecha.value;
                filterFecha.onchange = () => {
                    filtroFechaActual = filterFecha.value;
                    // Limpiar fecha específica cuando se cambia el filtro predefinido
                    const fechaEspecifica = document.getElementById('filter-fecha-especifica');
                    if (fechaEspecifica) {
                        fechaEspecifica.value = '';
                    }
                    filtrarTransacciones();
                };
            }
            
            // Filtro de fecha específica
            const filterFechaEspecifica = document.getElementById('filter-fecha-especifica');
            if (filterFechaEspecifica) {
                filterFechaEspecifica.onchange = () => {
                    // Si se selecciona una fecha específica, cambiar el desplegable a "todas" para evitar conflictos
                    if (filterFechaEspecifica.value) {
                        if (filterFecha) {
                            filterFecha.value = 'todas';
                            filtroFechaActual = 'todas';
                        }
                    }
                    filtrarTransacciones();
                };
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
            actualizarSelectClientes();
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

    // Actualizar select de clientes
    function actualizarSelectClientes(clientesFiltrados = null) {
        const clienteSelect = document.getElementById('transaccion-cliente');
        if (!clienteSelect) return;
        
        const clientesAMostrar = clientesFiltrados || clientes;
        clienteSelect.innerHTML = '<option value="">Seleccione un cliente...</option>' +
            clientesAMostrar.map(c => {
                let cedulaCompleta;
                if (c.tipo_cedula === 'NA' || c.cedula === 0) {
                    cedulaCompleta = 'NA';
                } else {
                    cedulaCompleta = `${c.tipo_cedula}-${c.cedula}`;
                }
                return `<option value="${c.id}">${c.nombre} ${c.apellido} (${cedulaCompleta})</option>`;
            }).join('');
    }
    
    // Filtrar clientes en el select (búsqueda local)
    // Filtrar servicios en los selects
    function filtrarServiciosSelect() {
        const searchTerm = document.getElementById('transaccion-servicio-search')?.value.toLowerCase() || '';
        
        if (!searchTerm) {
            // Si no hay término, mostrar todos
            const servicioSelects = document.querySelectorAll('.servicio-select');
            servicioSelects.forEach(select => {
                select.querySelectorAll('option').forEach(opt => {
                    opt.style.display = '';
                });
            });
            ocultarDropdown('servicios-results-dropdown');
            return;
        }
        
        // Filtrar servicios localmente
        const serviciosFiltrados = servicios.filter(s => {
            const nombre = (s.nombre || '').toLowerCase();
            const descripcion = (s.descripcion || '').toLowerCase();
            return nombre.includes(searchTerm) || descripcion.includes(searchTerm);
        });
        
        // Mostrar dropdown con resultados
        mostrarDropdownResultados('servicios-results-dropdown', serviciosFiltrados, 'servicio');
        
        // Actualizar todos los selects de servicios en las filas existentes
        const servicioSelects = document.querySelectorAll('.servicio-select');
        servicioSelects.forEach(select => {
            const valorActual = select.value;
            select.querySelectorAll('option').forEach(opt => {
                if (opt.value === '') {
                    opt.style.display = '';
                    return;
                }
                const servicioId = parseInt(opt.value);
                const servicio = serviciosFiltrados.find(s => s.id === servicioId);
                opt.style.display = servicio ? '' : 'none';
            });
            
            // Si el servicio seleccionado no está en los filtrados, limpiar selección
            if (valorActual && !serviciosFiltrados.find(s => s.id === parseInt(valorActual))) {
                select.value = '';
            }
        });
        
        // Si solo hay un resultado y hay al menos un select de servicio, seleccionarlo en el primero
        if (serviciosFiltrados.length === 1 && servicioSelects.length > 0) {
            const primerSelect = servicioSelects[0];
            primerSelect.value = serviciosFiltrados[0].id;
            // Disparar evento change para calcular precio
            if (primerSelect.onchange) {
                primerSelect.onchange();
            }
            const servicioSearch = document.getElementById('transaccion-servicio-search');
            if (servicioSearch) {
                servicioSearch.value = serviciosFiltrados[0].nombre;
            }
            ocultarDropdown('servicios-results-dropdown');
        }
    }
    
    // Buscar servicio en la base de datos
    async function buscarServicioEnDB() {
        const searchTerm = document.getElementById('transaccion-servicio-search')?.value.trim() || '';
        
        if (!searchTerm) {
            await cargarServicios();
            ocultarDropdown('servicios-results-dropdown');
            return;
        }
        
        try {
            const resultados = await window.electronAPI.dbQuery(`
                SELECT * FROM Servicios 
                WHERE 
                    LOWER(nombre) LIKE ? OR
                    LOWER(COALESCE(descripcion, '')) LIKE ?
                ORDER BY nombre ASC
                LIMIT 50
            `, [
                `%${searchTerm.toLowerCase()}%`,
                `%${searchTerm.toLowerCase()}%`
            ]);
            
            if (resultados && resultados.length > 0) {
                window.transaccionesModule.servicios = resultados;
                servicios.length = 0;
                servicios.push(...resultados);
                
                actualizarSelectsServicios();
                mostrarDropdownResultados('servicios-results-dropdown', resultados, 'servicio');
                
                // Si solo hay un resultado, seleccionarlo automáticamente
                if (resultados.length === 1) {
                    const servicioSelects = document.querySelectorAll('.servicio-select');
                    if (servicioSelects.length > 0) {
                        const primerSelect = servicioSelects[0];
                        primerSelect.value = resultados[0].id;
                        if (primerSelect.onchange) {
                            primerSelect.onchange();
                        }
                        const servicioSearch = document.getElementById('transaccion-servicio-search');
                        if (servicioSearch) {
                            servicioSearch.value = resultados[0].nombre;
                        }
                        ocultarDropdown('servicios-results-dropdown');
                    }
                }
                
                mostrarExito(`Se encontraron ${resultados.length} servicio(s)`);
            } else {
                mostrarError('No se encontraron servicios con ese criterio');
                ocultarDropdown('servicios-results-dropdown');
            }
        } catch (error) {
            console.error('Error al buscar servicios:', error);
            mostrarError('Error al buscar servicios: ' + (error.message || error));
            ocultarDropdown('servicios-results-dropdown');
        }
    }
    
    // Filtrar productos en los selects
    function filtrarProductosSelect() {
        const searchTerm = document.getElementById('transaccion-producto-search')?.value.toLowerCase() || '';
        
        if (!searchTerm) {
            // Si no hay término, mostrar todos
            const productoSelects = document.querySelectorAll('.producto-select');
            productoSelects.forEach(select => {
                select.querySelectorAll('option').forEach(opt => {
                    opt.style.display = '';
                });
            });
            ocultarDropdown('productos-results-dropdown');
            return;
        }
        
        // Filtrar productos localmente
        const productosFiltrados = productos.filter(p => {
            const nombre = (p.nombre || '').toLowerCase();
            return nombre.includes(searchTerm);
        });
        
        // Mostrar dropdown con resultados
        mostrarDropdownResultados('productos-results-dropdown', productosFiltrados, 'producto');
        
        // Actualizar todos los selects de productos en las filas existentes
        const productoSelects = document.querySelectorAll('.producto-select');
        productoSelects.forEach(select => {
            const valorActual = select.value;
            select.querySelectorAll('option').forEach(opt => {
                if (opt.value === '') {
                    opt.style.display = '';
                    return;
                }
                const productoId = parseInt(opt.value);
                const producto = productosFiltrados.find(p => p.id === productoId);
                opt.style.display = producto ? '' : 'none';
            });
            
            // Si el producto seleccionado no está en los filtrados, limpiar selección
            if (valorActual && !productosFiltrados.find(p => p.id === parseInt(valorActual))) {
                select.value = '';
            }
        });
        
        // Si solo hay un resultado y hay al menos un select de producto, seleccionarlo en el primero
        if (productosFiltrados.length === 1 && productoSelects.length > 0) {
            const primerSelect = productoSelects[0];
            primerSelect.value = productosFiltrados[0].id;
            // Disparar evento change para calcular precio
            if (primerSelect.onchange) {
                primerSelect.onchange();
            }
            const productoSearch = document.getElementById('transaccion-producto-search');
            if (productoSearch) {
                productoSearch.value = productosFiltrados[0].nombre;
            }
            ocultarDropdown('productos-results-dropdown');
        }
    }
    
    // Buscar producto en la base de datos
    async function buscarProductoEnDB() {
        const searchTerm = document.getElementById('transaccion-producto-search')?.value.trim() || '';
        
        if (!searchTerm) {
            await cargarProductos();
            ocultarDropdown('productos-results-dropdown');
            return;
        }
        
        try {
            const resultados = await window.electronAPI.dbQuery(`
                SELECT * FROM Productos 
                WHERE LOWER(nombre) LIKE ?
                ORDER BY nombre ASC
                LIMIT 50
            `, [`%${searchTerm.toLowerCase()}%`]);
            
            if (resultados && resultados.length > 0) {
                window.transaccionesModule.productos = resultados;
                productos.length = 0;
                productos.push(...resultados);
                
                actualizarSelectsProductos();
                mostrarDropdownResultados('productos-results-dropdown', resultados, 'producto');
                
                // Si solo hay un resultado, seleccionarlo automáticamente
                if (resultados.length === 1) {
                    const productoSelects = document.querySelectorAll('.producto-select');
                    if (productoSelects.length > 0) {
                        const primerSelect = productoSelects[0];
                        primerSelect.value = resultados[0].id;
                        if (primerSelect.onchange) {
                            primerSelect.onchange();
                        }
                        const productoSearch = document.getElementById('transaccion-producto-search');
                        if (productoSearch) {
                            productoSearch.value = resultados[0].nombre;
                        }
                        ocultarDropdown('productos-results-dropdown');
                    }
                }
                
                mostrarExito(`Se encontraron ${resultados.length} producto(s)`);
            } else {
                mostrarError('No se encontraron productos con ese criterio');
                ocultarDropdown('productos-results-dropdown');
            }
        } catch (error) {
            console.error('Error al buscar productos:', error);
            mostrarError('Error al buscar productos: ' + (error.message || error));
            ocultarDropdown('productos-results-dropdown');
        }
    }
    
    // Actualizar todos los selects de servicios
    function actualizarSelectsServicios() {
        const servicioSelects = document.querySelectorAll('.servicio-select');
        servicioSelects.forEach(select => {
            const valorActual = select.value;
            
            // Limpiar opciones excepto la primera
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Añadir servicios
            servicios.forEach(s => {
                const option = document.createElement('option');
                option.value = s.id;
                option.setAttribute('data-precio', s.precio_bs || 0);
                option.textContent = `${s.nombre}${s.precio_bs ? ` - ${parseFloat(s.precio_bs).toFixed(2)} Bs` : ''}`;
                select.appendChild(option);
            });
            
            // Restaurar valor si existe
            if (valorActual) {
                select.value = valorActual;
            }
        });
    }
    
    // Actualizar todos los selects de productos
    function actualizarSelectsProductos() {
        const productoSelects = document.querySelectorAll('.producto-select');
        productoSelects.forEach(select => {
            const valorActual = select.value;
            
            // Limpiar opciones excepto la primera
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Añadir productos
            productos.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id;
                option.setAttribute('data-precio', p.precio_bs || 0);
                option.setAttribute('data-stock', p.cantidad || 0);
                option.textContent = `${p.nombre}${p.precio_bs ? ` - ${parseFloat(p.precio_bs).toFixed(2)} Bs` : ''} (Stock: ${p.cantidad || 0})`;
                select.appendChild(option);
            });
            
            // Restaurar valor si existe
            if (valorActual) {
                select.value = valorActual;
            }
        });
    }
    
    // Mostrar dropdown de resultados
    function mostrarDropdownResultados(dropdownId, resultados, tipo) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;
        
        if (!resultados || resultados.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        
        let html = '';
        resultados.forEach((item, index) => {
            let texto = '';
            if (tipo === 'cliente') {
                let cedulaCompleta = '';
                if (item.tipo_cedula === 'NA' || item.cedula === 0) {
                    cedulaCompleta = 'NA';
                } else {
                    cedulaCompleta = `${item.tipo_cedula}-${item.cedula}`;
                }
                texto = `${item.nombre} ${item.apellido} (${cedulaCompleta})`;
            } else if (tipo === 'servicio') {
                texto = `${item.nombre}${item.precio_bs ? ` - ${parseFloat(item.precio_bs).toFixed(2)} Bs` : ''}`;
            } else if (tipo === 'producto') {
                texto = `${item.nombre}${item.precio_bs ? ` - ${parseFloat(item.precio_bs).toFixed(2)} Bs` : ''} (Stock: ${item.cantidad || 0})`;
            }
            
            html += `<div class="result-item" data-id="${item.id}" data-index="${index}">${texto}</div>`;
        });
        
        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
        
        // Añadir event listeners a los items
        dropdown.querySelectorAll('.result-item').forEach(item => {
            item.onclick = () => {
                const id = parseInt(item.getAttribute('data-id'));
                if (tipo === 'cliente') {
                    seleccionarCliente(id);
                } else if (tipo === 'servicio') {
                    seleccionarServicio(id);
                } else if (tipo === 'producto') {
                    seleccionarProducto(id);
                }
            };
        });
    }
    
    // Seleccionar servicio desde dropdown
    function seleccionarServicio(servicioId) {
        const servicio = servicios.find(s => s.id === servicioId);
        if (!servicio) return;
        
        // Buscar el primer select de servicio disponible o crear una nueva fila
        const servicioSelects = document.querySelectorAll('.servicio-select');
        let selectToUse = null;
        
        if (servicioSelects.length > 0) {
            // Usar el primer select que no tenga valor seleccionado, o el primero disponible
            for (let select of servicioSelects) {
                if (!select.value || select.value === '') {
                    selectToUse = select;
                    break;
                }
            }
            if (!selectToUse) {
                selectToUse = servicioSelects[0];
            }
        } else {
            // No hay filas de servicio, crear una nueva
            agregarFilaServicio();
            setTimeout(() => {
                const nuevoSelect = document.querySelectorAll('.servicio-select');
                if (nuevoSelect.length > 0) {
                    nuevoSelect[0].value = servicioId;
                    if (nuevoSelect[0].onchange) {
                        nuevoSelect[0].onchange();
                    }
                }
            }, 100);
            const servicioSearch = document.getElementById('transaccion-servicio-search');
            if (servicioSearch) {
                servicioSearch.value = servicio.nombre;
            }
            ocultarDropdown('servicios-results-dropdown');
            return;
        }
        
        if (selectToUse) {
            selectToUse.value = servicioId;
            if (selectToUse.onchange) {
                selectToUse.onchange();
            }
        }
        
        const servicioSearch = document.getElementById('transaccion-servicio-search');
        if (servicioSearch) {
            servicioSearch.value = servicio.nombre;
        }
        ocultarDropdown('servicios-results-dropdown');
    }
    
    // Seleccionar producto desde dropdown
    function seleccionarProducto(productoId) {
        const producto = productos.find(p => p.id === productoId);
        if (!producto) return;
        
        // Buscar el primer select de producto disponible o crear una nueva fila
        const productoSelects = document.querySelectorAll('.producto-select');
        let selectToUse = null;
        
        if (productoSelects.length > 0) {
            // Usar el primer select que no tenga valor seleccionado, o el primero disponible
            for (let select of productoSelects) {
                if (!select.value || select.value === '') {
                    selectToUse = select;
                    break;
                }
            }
            if (!selectToUse) {
                selectToUse = productoSelects[0];
            }
        } else {
            // No hay filas de producto, crear una nueva
            agregarFilaProducto();
            setTimeout(() => {
                const nuevoSelect = document.querySelectorAll('.producto-select');
                if (nuevoSelect.length > 0) {
                    nuevoSelect[0].value = productoId;
                    if (nuevoSelect[0].onchange) {
                        nuevoSelect[0].onchange();
                    }
                }
            }, 100);
            const productoSearch = document.getElementById('transaccion-producto-search');
            if (productoSearch) {
                productoSearch.value = producto.nombre;
            }
            ocultarDropdown('productos-results-dropdown');
            return;
        }
        
        if (selectToUse) {
            selectToUse.value = productoId;
            if (selectToUse.onchange) {
                selectToUse.onchange();
            }
        }
        
        const productoSearch = document.getElementById('transaccion-producto-search');
        if (productoSearch) {
            productoSearch.value = producto.nombre;
        }
        ocultarDropdown('productos-results-dropdown');
    }
    
    // Ocultar dropdown
    function ocultarDropdown(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }
    
    // Seleccionar cliente
    function seleccionarCliente(clienteId) {
        const clienteSelect = document.getElementById('transaccion-cliente');
        if (clienteSelect) {
            clienteSelect.value = clienteId;
        }
        const clienteSearch = document.getElementById('transaccion-cliente-search');
        if (clienteSearch) {
            const cliente = clientes.find(c => c.id === clienteId);
            if (cliente) {
                clienteSearch.value = `${cliente.nombre} ${cliente.apellido}`;
            }
        }
        ocultarDropdown('clientes-results-dropdown');
    }
    
    function filtrarClientesSelect() {
        const searchTerm = document.getElementById('transaccion-cliente-search').value.toLowerCase();
        const clienteSelect = document.getElementById('transaccion-cliente');
        
        if (!searchTerm) {
            actualizarSelectClientes();
            ocultarDropdown('clientes-results-dropdown');
            return;
        }
        
        const clientesFiltrados = clientes.filter(c => {
            const nombreCompleto = `${c.nombre} ${c.apellido}`.toLowerCase();
            let cedulaCompleta = '';
            if (c.tipo_cedula === 'NA' || c.cedula === 0) {
                cedulaCompleta = 'na';
            } else {
                cedulaCompleta = `${c.tipo_cedula}-${c.cedula}`;
            }
            return nombreCompleto.includes(searchTerm) || cedulaCompleta.includes(searchTerm);
        });
        
        actualizarSelectClientes(clientesFiltrados);
        mostrarDropdownResultados('clientes-results-dropdown', clientesFiltrados, 'cliente');
        
        // Si solo hay un resultado, seleccionarlo automáticamente
        if (clientesFiltrados.length === 1) {
            seleccionarCliente(clientesFiltrados[0].id);
        }
    }
    
    // Buscar cliente en la base de datos
    async function buscarClienteEnDB() {
        const searchTerm = document.getElementById('transaccion-cliente-search').value.trim();
        
        if (!searchTerm) {
            // Si no hay término de búsqueda, recargar todos los clientes
            await cargarClientes();
            actualizarSelectClientes();
            return;
        }
        
        try {
            // Buscar en la base de datos por nombre, apellido o cédula
            const resultados = await window.electronAPI.dbQuery(`
                SELECT * FROM Clientes 
                WHERE 
                    LOWER(nombre || ' ' || apellido) LIKE ? OR
                    LOWER(apellido || ' ' || nombre) LIKE ? OR
                    CAST(cedula AS TEXT) LIKE ? OR
                    LOWER(tipo_cedula || '-' || CAST(cedula AS TEXT)) LIKE ?
                ORDER BY nombre, apellido ASC
                LIMIT 50
            `, [
                `%${searchTerm.toLowerCase()}%`,
                `%${searchTerm.toLowerCase()}%`,
                `%${searchTerm}%`,
                `%${searchTerm.toLowerCase()}%`
            ]);
            
            if (resultados && resultados.length > 0) {
                // Actualizar la lista de clientes localmente con los resultados
                window.transaccionesModule.clientes = resultados;
                clientes.length = 0;
                clientes.push(...resultados);
                
                // Actualizar el select con los resultados
                actualizarSelectClientes(resultados);
                
                // Mostrar dropdown con resultados
                mostrarDropdownResultados('clientes-results-dropdown', resultados, 'cliente');
                
                // Si solo hay un resultado, seleccionarlo automáticamente
                if (resultados.length === 1) {
                    seleccionarCliente(resultados[0].id);
                }
                
                // Mostrar mensaje de éxito
                if (typeof window.mostrarNotificacion === 'function') {
                    if (resultados.length === 1) {
                        window.mostrarNotificacion(`Cliente encontrado y seleccionado`, 'success', 2000);
                    } else {
                        window.mostrarNotificacion(`Se encontraron ${resultados.length} cliente(s)`, 'success', 2000);
                    }
                }
            } else {
                // No se encontraron resultados
                actualizarSelectClientes([]);
                ocultarDropdown('clientes-results-dropdown');
                if (typeof window.mostrarNotificacion === 'function') {
                    window.mostrarNotificacion('No se encontraron clientes con ese criterio de búsqueda', 'warning', 3000);
                } else {
                    alert('No se encontraron clientes con ese criterio de búsqueda');
                }
            }
        } catch (error) {
            console.error('Error al buscar cliente en la base de datos:', error);
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Error al buscar cliente: ' + (error.message || 'Error desconocido'), 'error', 3000);
            } else {
                alert('Error al buscar cliente: ' + (error.message || 'Error desconocido'));
            }
        }
    }
    
    // Abrir modal nuevo cliente desde transacciones
    function abrirModalNuevoCliente() {
        document.getElementById('nuevo-cliente-transaccion-form').reset();
        document.getElementById('nuevo-cliente-transaccion-modal').classList.add('active');
    }
    
    // Cerrar modal nuevo cliente
    function cerrarModalNuevoCliente() {
        document.getElementById('nuevo-cliente-transaccion-modal').classList.remove('active');
    }
    
    // Guardar nuevo cliente desde transacciones
    async function guardarNuevoClienteDesdeTransaccion() {
        const nombre = document.getElementById('nuevo-cliente-nombre').value.trim();
        const apellido = document.getElementById('nuevo-cliente-apellido').value.trim();
        const tipoCedula = document.getElementById('nuevo-cliente-tipo-cedula').value;
        const cedula = parseInt(document.getElementById('nuevo-cliente-cedula').value);
        const telefono = document.getElementById('nuevo-cliente-telefono').value.trim() || null;
        
        if (!nombre || !apellido || !tipoCedula || !cedula) {
            mostrarError('Todos los campos requeridos deben estar completos');
            return;
        }
        
        try {
            // Verificar si ya existe la cédula
            const existente = await window.electronAPI.dbGet(
                'SELECT * FROM Clientes WHERE tipo_cedula = ? AND cedula = ?',
                [tipoCedula, cedula]
            );
            
            if (existente) {
                mostrarError('Ya existe un cliente con esta cédula');
                // Seleccionar el cliente existente
                document.getElementById('transaccion-cliente').value = existente.id;
                cerrarModalNuevoCliente();
                return;
            }
            
            // Crear nuevo cliente
            const resultado = await window.electronAPI.dbRun(
                'INSERT INTO Clientes (nombre, apellido, tipo_cedula, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
                [nombre, apellido, tipoCedula, cedula, telefono]
            );
            
            // Recargar clientes
            await cargarClientes();
            
            // Seleccionar el nuevo cliente
            document.getElementById('transaccion-cliente').value = resultado.lastInsertRowid;
            
            cerrarModalNuevoCliente();
            mostrarExito('Cliente creado correctamente');
        } catch (error) {
            console.error('Error al guardar cliente:', error);
            mostrarError('Error al guardar el cliente: ' + (error.message || 'Error desconocido'));
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
                ORDER BY t.id DESC
            `);
            console.log('Transacciones obtenidas:', resultados);
            
            window.transaccionesModule.transacciones = resultados || [];
            transacciones.length = 0;
            if (window.transaccionesModule.transacciones.length > 0) {
                transacciones.push(...window.transaccionesModule.transacciones);
            }
            // Aplicar filtro por defecto (hoy) al cargar
            filtrarTransacciones();
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
    // Función de paginación para transacciones
    function renderPaginationTransacciones(currentPage, totalPages) {
        const container = document.getElementById('pagination-transacciones');
        if (!container) return;
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">';
        
        // Botón anterior
        if (currentPage > 1) {
            html += `<button class="btn btn-secondary" onclick="window.cambiarPaginaTransacciones(${currentPage - 1})" style="padding: 8px 16px;">« Anterior</button>`;
        }
        
        // Números de página
        html += '<div style="display: flex; gap: 5px; flex-wrap: wrap;">';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="window.cambiarPaginaTransacciones(${i})" style="padding: 8px 12px; min-width: 40px;">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += '<span style="padding: 8px; color: var(--text-secondary);">...</span>';
            }
        }
        html += '</div>';
        
        // Botón siguiente
        if (currentPage < totalPages) {
            html += `<button class="btn btn-secondary" onclick="window.cambiarPaginaTransacciones(${currentPage + 1})" style="padding: 8px 16px;">Siguiente »</button>`;
        }
        
        html += `<span style="margin-left: 15px; color: var(--text-secondary);">Página ${currentPage} de ${totalPages}</span>`;
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    // Función para cambiar página de transacciones
    function cambiarPaginaTransacciones(page) {
        currentPageTransacciones = page;
        mostrarTransacciones(transaccionesFiltradas);
    }
    
    function mostrarTransacciones(listaTransacciones) {
        const tbody = document.getElementById('transacciones-table-body');
        
        if (!tbody) return;
        
        // Guardar lista filtrada para paginación
        transaccionesFiltradas = listaTransacciones;
        
        if (listaTransacciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay transacciones registradas</td></tr>';
            renderPaginationTransacciones(1, 1);
            return;
        }
        
        // Calcular paginación
        const totalPages = Math.ceil(listaTransacciones.length / itemsPerPage);
        const startIndex = (currentPageTransacciones - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const transaccionesPagina = listaTransacciones.slice(startIndex, endIndex);

        tbody.innerHTML = transaccionesPagina.map((transaccion, index) => {
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
            
            const globalIndex = startIndex + index + 1;
            
            return `
                <tr class="${estadoClass}">
                    <td>#${globalIndex}</td>
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
        
        // Renderizar paginación
        renderPaginationTransacciones(currentPageTransacciones, totalPages);
    }
    
    // Exponer función de cambio de página
    window.cambiarPaginaTransacciones = cambiarPaginaTransacciones;
    
    // Exponer función para uso externo
    window.mostrarTransacciones = mostrarTransacciones;

    // Filtrar transacciones
    // Función auxiliar para convertir fecha a formato DD/MM/YYYY para comparación
    function convertirFechaAComparable(fechaStr) {
        if (!fechaStr) return null;
        
        // Si está en formato DD/MM/YYYY HH:MM:SS (con hora)
        if (fechaStr.includes('/') && fechaStr.includes(' ')) {
            // Extraer solo la parte de la fecha (antes del espacio)
            return fechaStr.split(' ')[0];
        }
        
        // Si ya está en formato DD/MM/YYYY (sin hora)
        if (fechaStr.includes('/') && fechaStr.length === 10) {
            return fechaStr;
        }
        
        // Si está en formato ISO (YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS)
        if (fechaStr.includes('-')) {
            let fechaISO = fechaStr;
            if (fechaStr.includes('T')) {
                fechaISO = fechaStr.split('T')[0];
            } else if (fechaStr.includes(' ')) {
                // Si tiene espacio, tomar solo la parte de la fecha
                fechaISO = fechaStr.split(' ')[0];
            }
            const [year, month, day] = fechaISO.split('-');
            return `${day}/${month}/${year}`;
        }
        
        return null;
    }
    
    // Función auxiliar para obtener la fecha según el filtro seleccionado
    function obtenerFechaFiltro(filtro) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        switch(filtro) {
            case 'hoy':
                return {
                    fecha: `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`,
                    desde: null,
                    hasta: null
                };
            case 'ayer':
                const ayer = new Date(hoy);
                ayer.setDate(ayer.getDate() - 1);
                return {
                    fecha: `${String(ayer.getDate()).padStart(2, '0')}/${String(ayer.getMonth() + 1).padStart(2, '0')}/${ayer.getFullYear()}`,
                    desde: null,
                    hasta: null
                };
            case 'semana':
                const haceSemana = new Date(hoy);
                haceSemana.setDate(haceSemana.getDate() - 7);
                return {
                    fecha: null,
                    desde: `${String(haceSemana.getDate()).padStart(2, '0')}/${String(haceSemana.getMonth() + 1).padStart(2, '0')}/${haceSemana.getFullYear()}`,
                    hasta: `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`
                };
            case 'año':
                const haceAño = new Date(hoy);
                haceAño.setFullYear(haceAño.getFullYear() - 1);
                return {
                    fecha: null,
                    desde: `${String(haceAño.getDate()).padStart(2, '0')}/${String(haceAño.getMonth() + 1).padStart(2, '0')}/${haceAño.getFullYear()}`,
                    hasta: `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`
                };
            case 'todas':
            default:
                return {
                    fecha: null,
                    desde: null,
                    hasta: null
                };
        }
    }
    
    // Función auxiliar para convertir fecha de formato YYYY-MM-DD a DD/MM/YYYY
    function convertirFechaInputADisplay(fechaInput) {
        if (!fechaInput) return null;
        const [año, mes, dia] = fechaInput.split('-');
        return `${dia}/${mes}/${año}`;
    }
    
    // Función auxiliar para comparar fechas en formato DD/MM/YYYY
    function compararFechas(fecha1, fecha2) {
        if (!fecha1 || !fecha2) return 0;
        const [dia1, mes1, año1] = fecha1.split('/').map(Number);
        const [dia2, mes2, año2] = fecha2.split('/').map(Number);
        
        const date1 = new Date(año1, mes1 - 1, dia1);
        const date2 = new Date(año2, mes2 - 1, dia2);
        
        if (date1 < date2) return -1;
        if (date1 > date2) return 1;
        return 0;
    }

    function filtrarTransacciones() {
        const searchTerm = document.getElementById('search-transaccion').value.toLowerCase();
        const filterEstado = document.getElementById('filter-estado').value;
        const filterFechaEspecifica = document.getElementById('filter-fecha-especifica');

        let transaccionesFiltradas = transacciones;

        // Filtrar por fecha - prioridad a fecha específica si está seleccionada
        const fechaEspecifica = filterFechaEspecifica ? filterFechaEspecifica.value : null;
        
        if (fechaEspecifica) {
            // Usar fecha específica seleccionada
            const fechaFiltro = convertirFechaInputADisplay(fechaEspecifica);
            
            transaccionesFiltradas = transaccionesFiltradas.filter(transaccion => {
                const fechaApertura = convertirFechaAComparable(transaccion.fecha_apertura);
                if (!fechaApertura) return false;
                return fechaApertura === fechaFiltro;
            });
        } else if (filtroFechaActual && filtroFechaActual !== 'todas') {
            // Usar filtro predefinido
            const fechaFiltro = obtenerFechaFiltro(filtroFechaActual);
            
            transaccionesFiltradas = transaccionesFiltradas.filter(transaccion => {
                // Usar fecha_apertura para el filtro
                const fechaApertura = convertirFechaAComparable(transaccion.fecha_apertura);
                
                if (!fechaApertura) return false;
                
                // Si es filtro de fecha específica (hoy, ayer)
                if (fechaFiltro.fecha) {
                    return fechaApertura === fechaFiltro.fecha;
                }
                
                // Si es filtro de rango (semana, año)
                if (fechaFiltro.desde && fechaFiltro.hasta) {
                    const comparacionDesde = compararFechas(fechaApertura, fechaFiltro.desde);
                    const comparacionHasta = compararFechas(fechaApertura, fechaFiltro.hasta);
                    // La fecha debe ser >= desde y <= hasta
                    return comparacionDesde >= 0 && comparacionHasta <= 0;
                }
                
                return true;
            });
        }

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

        // Resetear página al filtrar
        currentPageTransacciones = 1;
        
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
                            ${(() => {
                                const searchTerm = document.getElementById('transaccion-servicio-search')?.value.toLowerCase() || '';
                                const serviciosParaMostrar = searchTerm ? 
                                    servicios.filter(s => 
                                        (s.nombre || '').toLowerCase().includes(searchTerm) || 
                                        (s.descripcion || '').toLowerCase().includes(searchTerm)
                                    ) : servicios;
                                return serviciosParaMostrar.map(s => 
                                    `<option value="${s.id}" data-precio="${s.precio_bs || 0}">${s.nombre}${s.precio_bs ? ` - ${parseFloat(s.precio_bs).toFixed(2)} Bs` : ''}</option>`
                                ).join('');
                            })()}
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
                        <input type="text" class="servicio-propina-dolares" data-fila="${filaId}" placeholder="0.00" inputmode="decimal">
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
        const propinaDolaresInput = filaElement.querySelector('.servicio-propina-dolares');
        
        if (propinaInput) {
            if (typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(propinaInput);
            }
            // Guardar handler original si existe
            const originalPropinaInput = propinaInput.oninput;
            propinaInput.oninput = function(e) {
                // Llamar al handler original del formateo si existe
                if (originalPropinaInput && typeof originalPropinaInput === 'function') {
                    originalPropinaInput.call(this, e);
                }
                // Actualizar total general
                actualizarTotalGeneral();
            };
        }
        
        if (propinaDolaresInput) {
            if (typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(propinaDolaresInput);
            }
            // Guardar handler original si existe
            const originalPropinaDolaresInput = propinaDolaresInput.oninput;
            propinaDolaresInput.oninput = function(e) {
                // Llamar al handler original del formateo si existe
                if (originalPropinaDolaresInput && typeof originalPropinaDolaresInput === 'function') {
                    originalPropinaDolaresInput.call(this, e);
                }
                // Actualizar total general (aunque la propina en dólares no se suma al total en Bs)
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
                            ${(() => {
                                const searchTerm = document.getElementById('transaccion-producto-search')?.value.toLowerCase() || '';
                                const productosParaMostrar = searchTerm ? 
                                    productos.filter(p => 
                                        (p.nombre || '').toLowerCase().includes(searchTerm)
                                    ) : productos;
                                return productosParaMostrar.map(p => 
                                    `<option value="${p.id}" data-precio="${p.precio_bs || 0}" data-stock="${p.cantidad}">${p.nombre} (Stock: ${p.cantidad}${p.precio_bs ? ` - ${parseFloat(p.precio_bs).toFixed(2)} Bs` : ''})</option>`
                                ).join('');
                            })()}
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
    
    // Agregar una nueva fila de propina
    function agregarFilaPropina() {
        contadorFilaPropina++;
        const filaId = `propina-fila-${contadorFilaPropina}`;
        const propinasLista = document.getElementById('propinas-lista');
        
        if (!propinasLista) return;
        
        const filaHTML = `
            <div class="propina-fila" id="${filaId}" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 6px; background: var(--bg-secondary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: var(--text-primary);">Propina ${contadorFilaPropina}</strong>
                    <button type="button" class="btn-icon btn-delete" onclick="eliminarFilaPropina('${filaId}')" title="Eliminar propina" style="background: transparent; border: none; color: var(--text-danger); cursor: pointer; font-size: 18px;">🗑️</button>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label>Empleado *</label>
                        <select class="propina-empleado" data-fila="${filaId}" required>
                            <option value="">Seleccione un empleado...</option>
                            ${empleados.map(e => `<option value="${e.id}">${e.nombre} ${e.apellido}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1;">
                        <label>Propina (Bs)</label>
                        <input type="text" class="propina-bs" data-fila="${filaId}" placeholder="000.00" inputmode="decimal" style="text-align: right; direction: rtl;">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label>Propina Ref. ($)</label>
                        <input type="text" class="propina-dolares" data-fila="${filaId}" placeholder="000.00" inputmode="decimal" style="text-align: right; direction: rtl;">
                    </div>
                </div>
            </div>
        `;
        
        propinasLista.insertAdjacentHTML('beforeend', filaHTML);
        
        // Configurar event listeners para la nueva fila
        const filaElement = document.getElementById(filaId);
        const propinaBsInput = filaElement.querySelector('.propina-bs');
        const propinaDolaresInput = filaElement.querySelector('.propina-dolares');
        
        if (propinaBsInput) {
            if (typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(propinaBsInput);
            }
            // Guardar handler original si existe
            const originalPropinaBsInput = propinaBsInput.oninput;
            propinaBsInput.oninput = function(e) {
                // Llamar al handler original del formateo si existe
                if (originalPropinaBsInput && typeof originalPropinaBsInput === 'function') {
                    originalPropinaBsInput.call(this, e);
                }
                // Actualizar total general
                actualizarTotalGeneral();
            };
        }
        
        if (propinaDolaresInput) {
            if (typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(propinaDolaresInput);
            }
            // Guardar handler original si existe
            const originalPropinaDolaresInput = propinaDolaresInput.oninput;
            propinaDolaresInput.oninput = function(e) {
                // Llamar al handler original del formateo si existe
                if (originalPropinaDolaresInput && typeof originalPropinaDolaresInput === 'function') {
                    originalPropinaDolaresInput.call(this, e);
                }
                // Actualizar total general
                actualizarTotalGeneral();
            };
        }
        
        // Actualizar total general
        actualizarTotalGeneral();
    }
    
    // Eliminar una fila de propina
    window.eliminarFilaPropina = function(filaId) {
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

    // Actualizar total general sumando todos los servicios, productos y propinas
    async function actualizarTotalGeneral() {
        const totalGeneralInput = document.getElementById('transaccion-total-general');
        const totalGeneralDolaresInput = document.getElementById('transaccion-total-general-dolares');
        if (!totalGeneralInput) return;
        
        let totalGeneralBs = 0;
        let totalPropinasDolares = 0; // Solo propinas en dólares
        
        // Sumar servicios
        const filasServicios = document.querySelectorAll('.servicio-fila');
        filasServicios.forEach(fila => {
            const precioInput = fila.querySelector('.servicio-precio');
            const propinaInput = fila.querySelector('.servicio-propina');
            const propinaDolaresInput = fila.querySelector('.servicio-propina-dolares');
            
            if (precioInput && precioInput.value && precioInput.value !== 'No disponible') {
                const precio = parseFloat(precioInput.value.replace(/[^\d.]/g, '')) || 0;
                totalGeneralBs += precio;
            }
            
            if (propinaInput && propinaInput.value && propinaInput.value.trim() !== '') {
                let propina = 0;
                if (typeof window.obtenerValorNumerico === 'function' && propinaInput._formateadoPrecio) {
                    propina = window.obtenerValorNumerico(propinaInput) || 0;
                } else {
                    propina = parseFloat(propinaInput.value.replace(/[^\d.]/g, '')) || 0;
                }
                totalGeneralBs += propina;
            }
            
            if (propinaDolaresInput && propinaDolaresInput.value && propinaDolaresInput.value.trim() !== '') {
                let propinaDolares = 0;
                if (typeof window.obtenerValorNumerico === 'function' && propinaDolaresInput._formateadoPrecio) {
                    propinaDolares = window.obtenerValorNumerico(propinaDolaresInput) || 0;
                } else {
                    propinaDolares = parseFloat(propinaDolaresInput.value.replace(/[^\d.]/g, '')) || 0;
                }
                totalPropinasDolares += propinaDolares;
            }
        });
        
        // Sumar productos
        const filasProductos = document.querySelectorAll('.producto-fila');
        filasProductos.forEach(fila => {
            const totalInput = fila.querySelector('.producto-total');
            if (totalInput && totalInput.value && totalInput.value !== 'No disponible') {
                const valor = parseFloat(totalInput.value.replace(/[^\d.]/g, '')) || 0;
                totalGeneralBs += valor;
            }
        });
        
        // Sumar propinas independientes
        const filasPropinas = document.querySelectorAll('.propina-fila');
        filasPropinas.forEach(fila => {
            const propinaBsInput = fila.querySelector('.propina-bs');
            const propinaDolaresInput = fila.querySelector('.propina-dolares');
            
            if (propinaBsInput && propinaBsInput.value && propinaBsInput.value.trim() !== '') {
                let propina = 0;
                if (typeof window.obtenerValorNumerico === 'function' && propinaBsInput._formateadoPrecio) {
                    propina = window.obtenerValorNumerico(propinaBsInput) || 0;
                } else {
                    propina = parseFloat(propinaBsInput.value.replace(/[^\d.]/g, '')) || 0;
                }
                totalGeneralBs += propina;
            }
            
            if (propinaDolaresInput && propinaDolaresInput.value && propinaDolaresInput.value.trim() !== '') {
                let propinaDolares = 0;
                if (typeof window.obtenerValorNumerico === 'function' && propinaDolaresInput._formateadoPrecio) {
                    propinaDolares = window.obtenerValorNumerico(propinaDolaresInput) || 0;
                } else {
                    propinaDolares = parseFloat(propinaDolaresInput.value.replace(/[^\d.]/g, '')) || 0;
                }
                totalPropinasDolares += propinaDolares;
            }
        });
        
        // Obtener la tasa de cambio del día para convertir entre monedas
        let tasaCambio = null;
        try {
            const fechaHoy = new Date();
            const dia = String(fechaHoy.getDate()).padStart(2, '0');
            const mes = String(fechaHoy.getMonth() + 1).padStart(2, '0');
            const año = fechaHoy.getFullYear();
            const fechaHoyStr = `${dia}/${mes}/${año}`;
            
            const tasaMasReciente = await window.electronAPI.dbGet(
                'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                [fechaHoyStr]
            );
            
            if (tasaMasReciente && tasaMasReciente.tasa_bs_por_dolar && tasaMasReciente.tasa_bs_por_dolar > 0) {
                tasaCambio = tasaMasReciente.tasa_bs_por_dolar;
            }
        } catch (error) {
            console.error('Error al obtener tasa de cambio para calcular totales:', error);
        }
        
        // Separar el total en bolívares (sin propinas en dólares) para calcular correctamente
        const totalBsSinPropinasDolares = totalGeneralBs;
        
        // Convertir propinas en dólares a bolívares y sumarlas al total en bolívares
        let propinasDolaresEnBs = 0;
        if (tasaCambio && totalPropinasDolares > 0) {
            propinasDolaresEnBs = totalPropinasDolares * tasaCambio;
            totalGeneralBs += propinasDolaresEnBs;
        }
        
        totalGeneralInput.value = totalGeneralBs.toFixed(2);
        
        // Calcular total en dólares: (servicios+productos+propinasBs) / tasa + propinasDolares
        let totalGeneralDolares = 0;
        
        if (tasaCambio && tasaCambio > 0) {
            // Convertir el total en bolívares (sin propinas en dólares) a dólares
            const totalBsEnDolares = totalBsSinPropinasDolares / tasaCambio;
            // Sumar las propinas en dólares directamente
            totalGeneralDolares = totalBsEnDolares + totalPropinasDolares;
        } else {
            // Si no hay tasa de cambio, solo mostrar las propinas en dólares
            totalGeneralDolares = totalPropinasDolares;
        }
        
        if (totalGeneralDolaresInput) {
            totalGeneralDolaresInput.value = totalGeneralDolares.toFixed(2);
        }
    }

    // Validar métodos de pago que requieren entidad
    function validarMetodosPago() {
        const entidadesGroup = document.getElementById('entidades-group');
        const metodoCheckboxes = document.querySelectorAll('.metodo-pago-checkbox:checked');
        
        let requiereEntidad = false;
        metodoCheckboxes.forEach(checkbox => {
            // Punto de venta no requiere entidad (se sobreentiende la entidad del POS físico)
            if (checkbox.value === 'punto_venta') {
                return; // Saltar punto_venta
            }
            if (checkbox.dataset.requiereEntidad === 'true') {
                requiereEntidad = true;
            }
        });
        
        if (entidadesGroup) {
            entidadesGroup.style.display = requiereEntidad ? 'block' : 'none';
        }
    }
    
    // Calcular cantidad pagada automáticamente según métodos y entidades seleccionados
    async function calcularCantidadPagadaDesdeMetodos() {
        const cerrarTransaccionId = document.getElementById('cerrar-transaccion-id').value;
        if (!cerrarTransaccionId) return;
        
        try {
            // Obtener la transacción
            const transaccion = await window.electronAPI.dbGet(
                'SELECT * FROM Transacciones WHERE id = ?',
                [cerrarTransaccionId]
            );
            
            if (!transaccion) return;
            
            const totalBs = parseFloat(transaccion.total_en_bs || 0);
            const totalDolares = parseFloat(transaccion.total_en_dolares || 0);
            
            // Obtener métodos y entidades seleccionados
            const metodosSeleccionados = Array.from(document.querySelectorAll('.metodo-pago-checkbox:checked'))
                .map(cb => cb.value);
            const entidadesSeleccionadas = Array.from(document.querySelectorAll('.entidad-pago-checkbox:checked'))
                .map(cb => cb.value);
            
            // Definir métodos y entidades que son en dólares
            const metodosDolares = ['efectivo_divisa', 'divisa'];
            const entidadesDolares = ['Binance', 'Zelle'];
            
            // Definir métodos y entidades que son en bolívares
            const metodosBs = ['efectivo', 'transferencia', 'pago_movil', 'punto_venta'];
            const entidadesBs = ['Banco Nacional de Credito', 'Banesco', 'Banco de Venezuela'];
            
            // Determinar si hay métodos/entidades en dólares o bolívares
            const tieneMetodosDolares = metodosSeleccionados.some(m => metodosDolares.includes(m));
            const tieneEntidadesDolares = entidadesSeleccionadas.some(e => entidadesDolares.includes(e));
            const tieneMetodosBs = metodosSeleccionados.some(m => metodosBs.includes(m));
            const tieneEntidadesBs = entidadesSeleccionadas.some(e => entidadesBs.includes(e));
            
            // Calcular valores
            // Determinar si es pago mixto o solo una moneda
            const esPagoMixtoCalculo = (tieneMetodosDolares || tieneEntidadesDolares) && (tieneMetodosBs || tieneEntidadesBs);
            
            let pagadoBs = 0;
            let pagadoDolares = 0;
            
            if (esPagoMixtoCalculo) {
                // Pago mixto: usar ambos totales
                pagadoBs = totalBs;
                pagadoDolares = totalDolares;
            } else if (tieneMetodosDolares || tieneEntidadesDolares) {
                // Solo métodos/entidades en dólares: se pagó solo en dólares
                pagadoDolares = totalDolares;
                // No establecer pagadoBs si solo se pagó en dólares
            } else if (tieneMetodosBs || tieneEntidadesBs) {
                // Solo métodos/entidades en bolívares: se pagó solo en bolívares
                pagadoBs = totalBs;
                // No establecer pagadoDolares si solo se pagó en bolívares
            } else {
                // Si no hay ningún método/entidad seleccionado, por defecto bolívares
                pagadoBs = totalBs;
            }
            
            // Actualizar campos solo si están vacíos o si el usuario no los ha modificado manualmente
            const pagadoBsInput = document.getElementById('cerrar-pagado-bs');
            const pagadoDolaresInput = document.getElementById('cerrar-pagado-dolares');
            
            if (pagadoBsInput && (!pagadoBsInput.value || pagadoBsInput.value.trim() === '')) {
                if (pagadoBs > 0) {
                    if (typeof window.obtenerValorNumerico === 'function' && pagadoBsInput._formateadoPrecio) {
                        // Formato automático
                        const valorFormateado = pagadoBs.toFixed(2).padStart(6, '0').replace(/(\d{3})(\d{2})/, '$1.$2');
                        pagadoBsInput.value = valorFormateado;
                    } else {
                        pagadoBsInput.value = pagadoBs.toFixed(2);
                    }
                } else {
                    // Si no se pagó en bolívares, limpiar el campo
                    pagadoBsInput.value = '';
                }
            }
            
            if (pagadoDolaresInput && (!pagadoDolaresInput.value || pagadoDolaresInput.value.trim() === '')) {
                if (pagadoDolares > 0) {
                    if (typeof window.obtenerValorNumerico === 'function' && pagadoDolaresInput._formateadoPrecio) {
                        // Formato automático
                        const valorFormateado = pagadoDolares.toFixed(2).padStart(6, '0').replace(/(\d{3})(\d{2})/, '$1.$2');
                        pagadoDolaresInput.value = valorFormateado;
                    } else {
                        pagadoDolaresInput.value = pagadoDolares.toFixed(2);
                    }
                } else {
                    // Si no se pagó en dólares, limpiar el campo
                    pagadoDolaresInput.value = '';
                }
            }
        } catch (error) {
            console.error('Error al calcular cantidad pagada:', error);
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
        const propinasLista = document.getElementById('propinas-lista');
        if (serviciosLista) serviciosLista.innerHTML = '';
        if (productosLista) productosLista.innerHTML = '';
        if (propinasLista) propinasLista.innerHTML = '';
        
        // Resetear contadores
        contadorFilaServicio = 0;
        contadorFilaProducto = 0;
        contadorFilaPropina = 0;
        
        // Limpiar búsqueda de clientes
        const clienteSearch = document.getElementById('transaccion-cliente-search');
        if (clienteSearch) {
            clienteSearch.value = '';
        }
        
        // Mostrar campo de búsqueda al crear nueva transacción
        const clienteSearchContainer = clienteSearch ? clienteSearch.parentElement : null;
        if (clienteSearchContainer) {
            clienteSearchContainer.style.display = 'flex';
        }
        
        actualizarSelectClientes();
        
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
        
        // Restaurar visibilidad del campo de búsqueda
        const clienteSearch = document.getElementById('transaccion-cliente-search');
        if (clienteSearch) {
            const clienteSearchContainer = clienteSearch.parentElement;
            if (clienteSearchContainer) {
                clienteSearchContainer.style.display = 'flex';
            }
        }
        
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
                'SELECT * FROM ProductosVendidos WHERE id_transaccion = ? ORDER BY id DESC',
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
            const propinaDolaresInput = fila.querySelector('.servicio-propina-dolares');
            
            if (!servicioSelect || !empleadoSelect) continue;
            
            const idServicio = parseInt(servicioSelect.value);
            const idEmpleado = parseInt(empleadoSelect.value);
            
            if (!idServicio || !idEmpleado) {
                mostrarError('Todos los servicios deben tener servicio y empleado seleccionados');
                return;
            }
            
            const precio = parseFloat(precioInput.value.replace(/[^\d.]/g, '')) || 0;
            
            // Obtener propina en Bs - si está vacío o no tiene valor, usar 0
            let propina = 0;
            if (propinaInput && propinaInput.value && propinaInput.value.trim() !== '') {
                // Si el input está formateado, usar obtenerValorNumerico, sino parseFloat normal
                if (typeof window.obtenerValorNumerico === 'function' && propinaInput._formateadoPrecio) {
                    propina = window.obtenerValorNumerico(propinaInput) || 0;
                } else {
                    propina = parseFloat(propinaInput.value.replace(/[^\d.]/g, '')) || 0;
                }
            }
            
            // Obtener propina en dólares - si está vacío o no tiene valor, usar 0
            let propinaDolares = 0;
            if (propinaDolaresInput && propinaDolaresInput.value && propinaDolaresInput.value.trim() !== '') {
                // Si el input está formateado, usar obtenerValorNumerico, sino parseFloat normal
                if (typeof window.obtenerValorNumerico === 'function' && propinaDolaresInput._formateadoPrecio) {
                    propinaDolares = window.obtenerValorNumerico(propinaDolaresInput) || 0;
                } else {
                    propinaDolares = parseFloat(propinaDolaresInput.value.replace(/[^\d.]/g, '')) || 0;
                }
            }
            
            serviciosData.push({
                id_servicio: idServicio,
                id_empleado: idEmpleado,
                precio: precio,
                propina: propina,
                propina_dolares: propinaDolares
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

        // Obtener propinas independientes
        const filasPropinas = document.querySelectorAll('.propina-fila');
        const propinasIndependientesData = [];
        
        for (const fila of filasPropinas) {
            const empleadoSelect = fila.querySelector('.propina-empleado');
            const propinaBsInput = fila.querySelector('.propina-bs');
            const propinaDolaresInput = fila.querySelector('.propina-dolares');
            
            if (!empleadoSelect) continue;
            
            const idEmpleado = parseInt(empleadoSelect.value);
            if (!idEmpleado) {
                mostrarError('Todas las propinas deben tener empleado seleccionado');
                return;
            }
            
            let propinaBs = 0;
            if (propinaBsInput && propinaBsInput.value && propinaBsInput.value.trim() !== '') {
                if (typeof window.obtenerValorNumerico === 'function' && propinaBsInput._formateadoPrecio) {
                    propinaBs = window.obtenerValorNumerico(propinaBsInput) || 0;
                } else {
                    propinaBs = parseFloat(propinaBsInput.value.replace(/[^\d.]/g, '')) || 0;
                }
            }
            
            let propinaDolares = 0;
            if (propinaDolaresInput && propinaDolaresInput.value && propinaDolaresInput.value.trim() !== '') {
                if (typeof window.obtenerValorNumerico === 'function' && propinaDolaresInput._formateadoPrecio) {
                    propinaDolares = window.obtenerValorNumerico(propinaDolaresInput) || 0;
                } else {
                    propinaDolares = parseFloat(propinaDolaresInput.value.replace(/[^\d.]/g, '')) || 0;
                }
            }
            
            if (propinaBs > 0 || propinaDolares > 0) {
                propinasIndependientesData.push({
                    id_empleado: idEmpleado,
                    propina_bs: propinaBs,
                    propina_dolares: propinaDolares
                });
            }
        }

        // Validar que haya al menos un servicio, producto o propina independiente
        if (serviciosData.length === 0 && productosData.length === 0 && propinasIndependientesData.length === 0) {
            mostrarError('Debe agregar al menos un servicio, producto o propina');
            return;
        }
        
        // Calcular totales
        const totalGeneralInput = document.getElementById('transaccion-total-general');
        const totalGeneralDolaresInput = document.getElementById('transaccion-total-general-dolares');
        const totalBs = parseFloat(totalGeneralInput.value.replace(/[^\d.]/g, '')) || 0;
        const totalDolares = parseFloat(totalGeneralDolaresInput ? totalGeneralDolaresInput.value.replace(/[^\d.]/g, '') : 0) || 0;
        
        // Los campos de cantidad pagada no se usan al guardar transacción abierta
        // Solo se usan al cerrar la transacción
        const pagadoBs = 0;
        const pagadoDolares = 0;
        
        // Total en dólares ya está calculado correctamente en actualizarTotalGeneral()
        // Incluye: (total en bolívares / tasa de cambio) + propinas en dólares
        const totalDolaresFinal = totalDolares;

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
                    SET servicios_consumidos = ?, productos_comprados_nombres = ?, productos_comprados_cantidad = ?, total_en_dolares = ?, total_en_bs = ?, pagado_bs = ?, pagado_dolares = ?
                    WHERE id = ?`,
                    [serviciosNombres, productosNombres, productosCantidades, totalDolaresFinal, totalBs, pagadoBs, pagadoDolares, idTransaccion]
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
                    (id_cliente, fecha_apertura, estado, servicios_consumidos, productos_comprados_nombres, productos_comprados_cantidad, total_en_dolares, total_en_bs, pagado_bs, pagado_dolares) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [idCliente, fechaAperturaStr, 'abierta', serviciosNombres, productosNombres, productosCantidades, totalDolaresFinal, totalBs, pagadoBs, pagadoDolares]
                );
                
                idTransaccion = resultado.lastInsertRowid;
            }
            
            // Crear propinas independientes como servicios realizados
            // Usamos id_servicio = 0 o NULL para identificar propinas independientes
            for (const propinaData of propinasIndependientesData) {
                try {
                    // Intentar con id_servicio NULL primero
                    await window.electronAPI.dbRun(
                        `INSERT INTO ServiciosRealizados 
                        (id_transaccion, id_empleado, id_servicio, fecha, precio_cobrado, propina, propina_en_dolares, estado) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [idTransaccion, propinaData.id_empleado, null, fechaAperturaStr, 0, propinaData.propina_bs, propinaData.propina_dolares || 0, 'completado']
                    );
                } catch (error) {
                    // Si id_servicio no permite NULL, usar 0
                    if (error.message && (error.message.includes('NOT NULL') || error.message.includes('no such column'))) {
                        try {
                            await window.electronAPI.dbRun(
                                `INSERT INTO ServiciosRealizados 
                                (id_transaccion, id_empleado, id_servicio, fecha, precio_cobrado, propina, propina_en_dolares, estado) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                [idTransaccion, propinaData.id_empleado, 0, fechaAperturaStr, 0, propinaData.propina_bs, propinaData.propina_dolares || 0, 'completado']
                            );
                        } catch (e) {
                            // Si propina_en_dolares no existe, intentar sin ese campo
                            if (e.message && e.message.includes('no such column')) {
                                try {
                                    await window.electronAPI.dbRun(
                                        `INSERT INTO ServiciosRealizados 
                                        (id_transaccion, id_empleado, id_servicio, fecha, precio_cobrado, propina, estado) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                        [idTransaccion, propinaData.id_empleado, 0, fechaAperturaStr, 0, propinaData.propina_bs, 'completado']
                                    );
                                } catch (e2) {
                                    console.error('Error al guardar propina independiente:', e2);
                                }
                            } else {
                                console.error('Error al guardar propina independiente:', e);
                            }
                        }
                    } else {
                        console.error('Error al guardar propina independiente:', error);
                    }
                }
            }
            
            // Crear servicios realizados
            for (const servicioData of serviciosData) {
                // Intentar insertar con propina_en_dolares si el campo existe, sino sin él
                try {
                    await window.electronAPI.dbRun(
                        `INSERT INTO ServiciosRealizados 
                        (id_transaccion, id_empleado, id_servicio, fecha, precio_cobrado, propina, propina_en_dolares, estado) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [idTransaccion, servicioData.id_empleado, servicioData.id_servicio, fechaAperturaStr, servicioData.precio, servicioData.propina, servicioData.propina_dolares || 0, 'completado']
                    );
                } catch (error) {
                    // Si el campo propina_en_dolares no existe, insertar sin él
                    if (error.message && error.message.includes('no such column')) {
                        await window.electronAPI.dbRun(
                            `INSERT INTO ServiciosRealizados 
                            (id_transaccion, id_empleado, id_servicio, fecha, precio_cobrado, propina, estado) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [idTransaccion, servicioData.id_empleado, servicioData.id_servicio, fechaAperturaStr, servicioData.precio, servicioData.propina, 'completado']
                        );
                    } else {
                        throw error;
                    }
                }
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
                    <p><strong>Total:</strong> ${parseFloat(transaccion.total_en_bs || 0).toFixed(2)} Bs / $${parseFloat(transaccion.total_en_dolares || 0).toFixed(2)}</p>
                    <p><strong>Servicios:</strong> ${transaccion.servicios_consumidos || 'Ninguno'}</p>
                    <p><strong>Productos:</strong> ${transaccion.productos_comprados_nombres || 'Ninguno'}</p>
                `;
            }
            
            // Limpiar formulario
            document.querySelectorAll('.metodo-pago-checkbox').forEach(cb => {
                cb.checked = false;
                const checkboxItem = cb.closest('.checkbox-item');
                if (checkboxItem) {
                    checkboxItem.classList.remove('checked');
                }
            });
            document.querySelectorAll('.entidad-pago-checkbox').forEach(cb => {
                cb.checked = false;
                const checkboxItem = cb.closest('.checkbox-item');
                if (checkboxItem) {
                    checkboxItem.classList.remove('checked');
                }
            });
            document.getElementById('numero-referencia').value = '';
            document.getElementById('entidades-group').style.display = 'none';
            
            // Limpiar campos de cantidad pagada
            const pagadoBsInput = document.getElementById('cerrar-pagado-bs');
            const pagadoDolaresInput = document.getElementById('cerrar-pagado-dolares');
            if (pagadoBsInput) {
                pagadoBsInput.value = '';
                // Aplicar formateo si está disponible
                setTimeout(() => {
                    if (typeof formatearInputPrecio === 'function' && !pagadoBsInput._formateadoPrecio) {
                        formatearInputPrecio(pagadoBsInput);
                    }
                }, 100);
            }
            if (pagadoDolaresInput) {
                pagadoDolaresInput.value = '';
                // Aplicar formateo si está disponible
                setTimeout(() => {
                    if (typeof formatearInputPrecio === 'function' && !pagadoDolaresInput._formateadoPrecio) {
                        formatearInputPrecio(pagadoDolaresInput);
                    }
                }, 100);
            }
            
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

        // Verificar contraseña para operación crítica
        try {
            if (window.verificarContraseñaOperacionCritica) {
                await window.verificarContraseñaOperacionCritica();
            }
        } catch (error) {
            // Si el usuario cancela o la contraseña es incorrecta, no continuar
            return;
        }

        // Obtener métodos de pago seleccionados
        const metodosSeleccionados = Array.from(document.querySelectorAll('.metodo-pago-checkbox:checked'))
            .map(cb => cb.value);
        
        if (metodosSeleccionados.length === 0) {
            mostrarError('Debe seleccionar al menos un método de pago');
            return;
        }

        // Verificar si algún método requiere entidad (excluyendo punto_venta)
        const metodosConEntidad = metodosSeleccionados.filter(m => {
            // Punto de venta no requiere entidad (se sobreentiende la entidad del POS físico)
            if (m === 'punto_venta') {
                return false;
            }
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
        
        // Obtener cantidad pagada en cada moneda desde el modal de cerrar
        const pagadoBsInput = document.getElementById('cerrar-pagado-bs');
        const pagadoDolaresInput = document.getElementById('cerrar-pagado-dolares');
        let pagadoBs = 0;
        let pagadoDolares = 0;
        
        if (pagadoBsInput && pagadoBsInput.value && pagadoBsInput.value.trim() !== '') {
            if (typeof window.obtenerValorNumerico === 'function' && pagadoBsInput._formateadoPrecio) {
                pagadoBs = window.obtenerValorNumerico(pagadoBsInput) || 0;
            } else {
                pagadoBs = parseFloat(pagadoBsInput.value.replace(/[^\d.]/g, '')) || 0;
            }
        }
        
        if (pagadoDolaresInput && pagadoDolaresInput.value && pagadoDolaresInput.value.trim() !== '') {
            if (typeof window.obtenerValorNumerico === 'function' && pagadoDolaresInput._formateadoPrecio) {
                pagadoDolares = window.obtenerValorNumerico(pagadoDolaresInput) || 0;
            } else {
                pagadoDolares = parseFloat(pagadoDolaresInput.value.replace(/[^\d.]/g, '')) || 0;
            }
        }

        const metodosPagoStr = metodosSeleccionados.join(',');
        const entidadesPagoStr = entidadesSeleccionadas.join(',');

        // Obtener la transacción para conocer el total
        const transaccion = await window.electronAPI.dbGet(
            'SELECT * FROM Transacciones WHERE id = ?',
            [id]
        );
        
        if (!transaccion) {
            mostrarError('Transacción no encontrada');
            return;
        }
        
        const totalBs = parseFloat(transaccion.total_en_bs || 0);
        const totalDolares = parseFloat(transaccion.total_en_dolares || 0);
        
        // Obtener la tasa de cambio del día para validaciones
        const fechaHoy = new Date();
        const dia = String(fechaHoy.getDate()).padStart(2, '0');
        const mes = String(fechaHoy.getMonth() + 1).padStart(2, '0');
        const año = fechaHoy.getFullYear();
        const fechaHoyStr = `${dia}/${mes}/${año}`;
        let tasaCambio = null;
        try {
            const tasaMasReciente = await window.electronAPI.dbGet(
                'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                [fechaHoyStr]
            );
            if (tasaMasReciente) {
                tasaCambio = tasaMasReciente.tasa_bs_por_dolar;
            }
        } catch (error) {
            console.error('Error al obtener tasa de cambio:', error);
        }
        
        // Definir métodos y entidades que son en dólares
        const metodosDolares = ['efectivo_divisa', 'divisa'];
        const entidadesDolares = ['Binance', 'Zelle'];
        
        // Definir métodos y entidades que son en bolívares
        const metodosBs = ['efectivo', 'transferencia', 'pago_movil', 'punto_venta'];
        const entidadesBs = ['Banco Nacional de Credito', 'Banesco', 'Banco de Venezuela'];
        
        // Determinar si hay métodos/entidades en dólares o bolívares
        const tieneMetodosDolares = metodosSeleccionados.some(m => metodosDolares.includes(m));
        const tieneEntidadesDolares = entidadesSeleccionadas.some(e => entidadesDolares.includes(e));
        const tieneMetodosBs = metodosSeleccionados.some(m => metodosBs.includes(m));
        const tieneEntidadesBs = entidadesSeleccionadas.some(e => entidadesBs.includes(e));
        
        // Determinar si es pago mixto
        const esPagoMixto = (tieneMetodosDolares || tieneEntidadesDolares) && (tieneMetodosBs || tieneEntidadesBs);
        
        // Si es pago mixto, validar solo la suma equivalente, no los montos individuales
        if (esPagoMixto && tasaCambio && tasaCambio > 0) {
            // Verificar que se hayan ingresado montos en ambas monedas
            if (pagadoBs === 0 || pagadoDolares === 0) {
                mostrarError('En pago mixto debe ingresar montos en ambas monedas (bolívares y dólares). Por favor, ingrese los valores manualmente.');
                return;
            }
            
            // Convertir todo a una sola moneda para verificar equivalencia
            const totalEquivalenteEsperadoBs = totalBs;
            
            const pagadoEquivalenteBs = pagadoBs;
            const pagadoEquivalenteDolaresEnBs = pagadoDolares * tasaCambio;
            const pagadoEquivalenteTotalBs = pagadoEquivalenteBs + pagadoEquivalenteDolaresEnBs;
            
            const diferenciaEquivalente = pagadoEquivalenteTotalBs - totalEquivalenteEsperadoBs;
            const diferenciaEquivalenteAbs = Math.abs(diferenciaEquivalente);
            // Permitir una pequeña diferencia por redondeo (equivalente a 0.01 dólares en bolívares)
            const tolerancia = tasaCambio * 0.01;
            if (diferenciaEquivalenteAbs > tolerancia) {
                if (diferenciaEquivalente > 0) {
                    // El monto pagado EXCEDE el total - NO PERMITIR
                    mostrarError(`En el pago mixto, la suma de los montos pagados excede el total. ` +
                              `Total esperado: ${totalEquivalenteEsperadoBs.toFixed(2)} Bs (o $${totalDolares.toFixed(2)}). ` +
                              `Pagado: ${pagadoBs.toFixed(2)} Bs + $${pagadoDolares.toFixed(2)} = ${pagadoEquivalenteTotalBs.toFixed(2)} Bs. ` +
                              `Exceso: ${diferenciaEquivalenteAbs.toFixed(2)} Bs. Por favor, corrija los montos.`);
                    return;
                } else {
                    // El monto pagado es MENOR que el total - NO PERMITIR
                    mostrarError(`En el pago mixto, la suma de los montos pagados es menor que el total. ` +
                              `Total esperado: ${totalEquivalenteEsperadoBs.toFixed(2)} Bs (o $${totalDolares.toFixed(2)}). ` +
                              `Pagado: ${pagadoBs.toFixed(2)} Bs + $${pagadoDolares.toFixed(2)} = ${pagadoEquivalenteTotalBs.toFixed(2)} Bs. ` +
                              `Falta: ${diferenciaEquivalenteAbs.toFixed(2)} Bs. Por favor, corrija los montos.`);
                    return;
                }
            }
        } else if (!esPagoMixto) {
            // Si NO es pago mixto, validar los montos individuales
            // Validación para dólares (siempre que haya total en dólares o se seleccione método en dólares)
            if (totalDolares > 0 || tieneMetodosDolares || tieneEntidadesDolares) {
                if (pagadoDolares > 0) {
                    const diferencia = pagadoDolares - totalDolares;
                    const diferenciaAbs = Math.abs(diferencia);
                    // Permitir una pequeña diferencia por redondeo (0.01 dólares)
                    if (diferenciaAbs > 0.01) {
                        if (diferencia > 0) {
                            // El monto pagado EXCEDE el total - NO PERMITIR
                            mostrarError(`El monto pagado en dólares ($${pagadoDolares.toFixed(2)}) excede el total a pagar ($${totalDolares.toFixed(2)}). ` +
                                       `Diferencia: $${diferenciaAbs.toFixed(2)}. Por favor, corrija el monto.`);
                            return;
                        } else {
                            // El monto pagado es MENOR que el total - NO PERMITIR (debe pagar el total completo)
                            mostrarError(`El monto pagado en dólares ($${pagadoDolares.toFixed(2)}) es menor que el total a pagar ($${totalDolares.toFixed(2)}). ` +
                                       `Falta: $${diferenciaAbs.toFixed(2)}. Por favor, corrija el monto.`);
                            return;
                        }
                    }
                } else if (pagadoDolares === 0 && totalDolares > 0 && (tieneMetodosDolares || tieneEntidadesDolares)) {
                    // Si hay total en dólares y se seleccionó método en dólares pero no se ingresó monto pagado, advertir
                    mostrarError(`El total a pagar es de $${totalDolares.toFixed(2)} pero no se ingresó cantidad pagada en dólares.`);
                    return;
                }
            }
            
            // Validación para bolívares (siempre que haya total en bolívares o se seleccione método en bolívares)
            if (totalBs > 0 || tieneMetodosBs || tieneEntidadesBs) {
                if (pagadoBs > 0) {
                    const diferencia = pagadoBs - totalBs;
                    const diferenciaAbs = Math.abs(diferencia);
                    // Permitir una pequeña diferencia por redondeo (0.01 bolívares)
                    if (diferenciaAbs > 0.01) {
                        if (diferencia > 0) {
                            // El monto pagado EXCEDE el total - NO PERMITIR
                            mostrarError(`El monto pagado en bolívares (${pagadoBs.toFixed(2)} Bs) excede el total a pagar (${totalBs.toFixed(2)} Bs). ` +
                                       `Diferencia: ${diferenciaAbs.toFixed(2)} Bs. Por favor, corrija el monto.`);
                            return;
                        } else {
                            // El monto pagado es MENOR que el total - NO PERMITIR (debe pagar el total completo)
                            mostrarError(`El monto pagado en bolívares (${pagadoBs.toFixed(2)} Bs) es menor que el total a pagar (${totalBs.toFixed(2)} Bs). ` +
                                       `Falta: ${diferenciaAbs.toFixed(2)} Bs. Por favor, corrija el monto.`);
                            return;
                        }
                    }
                } else if (pagadoBs === 0 && totalBs > 0 && (tieneMetodosBs || tieneEntidadesBs)) {
                    // Si hay total en bolívares y se seleccionó método en bolívares pero no se ingresó monto pagado, advertir
                    mostrarError(`El total a pagar es de ${totalBs.toFixed(2)} Bs pero no se ingresó cantidad pagada en bolívares.`);
                    return;
                }
            }
        } else if (esPagoMixto && (!tasaCambio || tasaCambio <= 0)) {
            // Si es pago mixto pero no hay tasa de cambio, no se puede validar
            mostrarError('No se puede validar el pago mixto porque no hay tasa de cambio establecida para el día. Por favor, establezca la tasa de cambio primero.');
            return;
        }
        
        // Calcular pagado_bs y pagado_dolares basándose en métodos y entidades
        // Si el usuario ya ingresó valores manualmente, usarlos; si no, calcular automáticamente
        let pagadoBsCalculado = 0;
        let pagadoDolaresCalculado = 0;
        
        // esPagoMixto ya fue declarado arriba, solo usarlo aquí
        if (esPagoMixto) {
            // Pago mixto: SIEMPRE usar los valores que el usuario ingresó manualmente
            // No calcular automáticamente porque no sabemos cómo se distribuyó el pago
            // Si el usuario no ingresó valores, ya se validó arriba y se mostró error
            // En este caso, mantener los valores que el usuario ingresó (ya están en pagadoBs y pagadoDolares)
            pagadoBsCalculado = pagadoBs; // Usar el valor ingresado
            pagadoDolaresCalculado = pagadoDolares; // Usar el valor ingresado
        } else if (tieneMetodosDolares || tieneEntidadesDolares) {
            // Solo métodos/entidades en dólares: se pagó solo en dólares
            pagadoDolaresCalculado = totalDolares;
            // No establecer pagadoBs si solo se pagó en dólares
        } else if (tieneMetodosBs || tieneEntidadesBs) {
            // Solo métodos/entidades en bolívares: se pagó solo en bolívares
            pagadoBsCalculado = totalBs;
            // No establecer pagadoDolares si solo se pagó en bolívares
        } else {
            // Si no hay ningún método/entidad seleccionado que determine la moneda,
            // por defecto asumimos que se pagó en bolívares
            pagadoBsCalculado = totalBs;
        }
        
        // Si el usuario ingresó valores manualmente, usarlos; si no, usar los calculados
        // Pero solo si los valores calculados no son cero (para respetar la selección del usuario)
        if (pagadoBs === 0 && pagadoDolares === 0) {
            pagadoBs = pagadoBsCalculado;
            pagadoDolares = pagadoDolaresCalculado;
            
            // Actualizar los campos del formulario con los valores calculados
            if (pagadoBsInput) {
                if (pagadoBs > 0) {
                    if (typeof window.obtenerValorNumerico === 'function' && pagadoBsInput._formateadoPrecio) {
                        // Si tiene formateo, usar el formato
                        const valorFormateado = pagadoBs.toFixed(2).padStart(6, '0').replace(/(\d{3})(\d{2})/, '$1.$2');
                        pagadoBsInput.value = valorFormateado;
                    } else {
                        pagadoBsInput.value = pagadoBs.toFixed(2);
                    }
                } else {
                    // Si no se pagó en bolívares, limpiar el campo
                    pagadoBsInput.value = '';
                }
            }
            if (pagadoDolaresInput) {
                if (pagadoDolares > 0) {
                    if (typeof window.obtenerValorNumerico === 'function' && pagadoDolaresInput._formateadoPrecio) {
                        // Si tiene formateo, usar el formato
                        const valorFormateado = pagadoDolares.toFixed(2).padStart(6, '0').replace(/(\d{3})(\d{2})/, '$1.$2');
                        pagadoDolaresInput.value = valorFormateado;
                    } else {
                        pagadoDolaresInput.value = pagadoDolares.toFixed(2);
                    }
                } else {
                    // Si no se pagó en dólares, limpiar el campo
                    pagadoDolaresInput.value = '';
                }
            }
        }

        // Fecha de cierre - usar formato DD/MM/YYYY HH:MM:SS
        const fechaCierre = new Date();
        const diaCierre = String(fechaCierre.getDate()).padStart(2, '0');
        const mesCierre = String(fechaCierre.getMonth() + 1).padStart(2, '0');
        const añoCierre = fechaCierre.getFullYear();
        const hora = String(fechaCierre.getHours()).padStart(2, '0');
        const minuto = String(fechaCierre.getMinutes()).padStart(2, '0');
        const segundo = String(fechaCierre.getSeconds()).padStart(2, '0');
        const fechaCierreStr = `${diaCierre}/${mesCierre}/${añoCierre} ${hora}:${minuto}:${segundo}`;
        
        // La tasa de cambio ya fue obtenida anteriormente para las validaciones

        try {
            await window.electronAPI.dbRun(
                `UPDATE Transacciones 
                SET fecha_cierre = ?, estado = ?, metodos_pago = ?, entidades_pago = ?, numero_referencia = ?, tasa_cambio = ?, pagado_bs = ?, pagado_dolares = ? 
                WHERE id = ?`,
                [fechaCierreStr, 'cerrada', metodosPagoStr, entidadesPagoStr, numeroReferencia || null, tasaCambio, pagadoBs, pagadoDolares, id]
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
            
            // Ocultar campo de búsqueda al editar
            const clienteSearchContainer = document.getElementById('transaccion-cliente-search').parentElement;
            if (clienteSearchContainer) {
                clienteSearchContainer.style.display = 'none';
            }
            
            // Deshabilitar cambio de cliente al editar
            const clienteSelect = document.getElementById('transaccion-cliente');
            if (clienteSelect) {
                clienteSelect.disabled = true;
            }

            // Cargar servicios realizados (excluyendo propinas independientes)
            const serviciosRealizados = await window.electronAPI.dbQuery(`
                SELECT 
                    sr.*,
                    s.nombre as nombre_servicio
                FROM ServiciosRealizados sr
                JOIN Servicios s ON sr.id_servicio = s.id
                WHERE sr.id_transaccion = ? AND sr.estado = 'completado' AND sr.id_servicio IS NOT NULL AND sr.id_servicio != 0
                ORDER BY sr.id DESC
            `, [id]);

            // Cargar propinas independientes (id_servicio NULL o 0)
            const propinasIndependientes = await window.electronAPI.dbQuery(`
                SELECT sr.*
                FROM ServiciosRealizados sr
                WHERE sr.id_transaccion = ? AND sr.estado = 'completado' AND (sr.id_servicio IS NULL OR sr.id_servicio = 0)
                ORDER BY sr.id DESC
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
                ORDER BY pv.id DESC
            `, [id]);

            // Limpiar listas
            const serviciosLista = document.getElementById('servicios-lista');
            const productosLista = document.getElementById('productos-lista');
            const propinasLista = document.getElementById('propinas-lista');
            if (serviciosLista) serviciosLista.innerHTML = '';
            if (productosLista) productosLista.innerHTML = '';
            if (propinasLista) propinasLista.innerHTML = '';

            // Resetear contadores
            contadorFilaServicio = 0;
            contadorFilaProducto = 0;
            contadorFilaPropina = 0;

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
                    const propinaDolaresInput = fila.querySelector('.servicio-propina-dolares');
                    
                    if (propinaInput) {
                        propinaInput.value = parseFloat(servicio.propina || 0).toFixed(2);
                        if (typeof formatearInputPrecio === 'function') {
                            formatearInputPrecio(propinaInput);
                        }
                        // Guardar handler original si existe
                        const originalPropinaInput = propinaInput.oninput;
                        propinaInput.oninput = function(e) {
                            // Llamar al handler original del formateo si existe
                            if (originalPropinaInput && typeof originalPropinaInput === 'function') {
                                originalPropinaInput.call(this, e);
                            }
                            // Actualizar total general
                            actualizarTotalGeneral();
                        };
                    }
                    
                    if (propinaDolaresInput) {
                        // Obtener propina en dólares del servicio si existe
                        // Nota: La propina en dólares se calcula desde la propina en Bs al guardar
                        // pero aquí solo mostramos lo que está guardado, no lo calculamos
                        propinaDolaresInput.value = '';
                        if (typeof formatearInputPrecio === 'function') {
                            formatearInputPrecio(propinaDolaresInput);
                        }
                        // Guardar handler original si existe
                        const originalPropinaDolaresInput = propinaDolaresInput.oninput;
                        propinaDolaresInput.oninput = function(e) {
                            // Llamar al handler original del formateo si existe
                            if (originalPropinaDolaresInput && typeof originalPropinaDolaresInput === 'function') {
                                originalPropinaDolaresInput.call(this, e);
                            }
                            // Actualizar total general
                            actualizarTotalGeneral();
                        };
                    }
                    
                    // Calcular precio si es necesario
                    if (servicioSelect) {
                        calcularPrecioServicio(filaId);
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

            // Agregar propinas independientes
            for (const propina of propinasIndependientes) {
                agregarFilaPropina();
                const filaId = `propina-fila-${contadorFilaPropina}`;
                const fila = document.getElementById(filaId);
                
                if (fila) {
                    const empleadoSelect = fila.querySelector('.propina-empleado');
                    const propinaBsInput = fila.querySelector('.propina-bs');
                    const propinaDolaresInput = fila.querySelector('.propina-dolares');
                    
                    if (empleadoSelect) empleadoSelect.value = propina.id_empleado;
                    
                    if (propinaBsInput) {
                        propinaBsInput.value = parseFloat(propina.propina || 0).toFixed(2);
                        if (typeof formatearInputPrecio === 'function') {
                            formatearInputPrecio(propinaBsInput);
                        }
                        // Guardar handler original si existe
                        const originalPropinaBsInput = propinaBsInput.oninput;
                        propinaBsInput.oninput = function(e) {
                            // Llamar al handler original del formateo si existe
                            if (originalPropinaBsInput && typeof originalPropinaBsInput === 'function') {
                                originalPropinaBsInput.call(this, e);
                            }
                            // Actualizar total general
                            actualizarTotalGeneral();
                        };
                    }
                    
                    if (propinaDolaresInput) {
                        propinaDolaresInput.value = parseFloat(propina.propina_en_dolares || 0).toFixed(2);
                        if (typeof formatearInputPrecio === 'function') {
                            formatearInputPrecio(propinaDolaresInput);
                        }
                        // Guardar handler original si existe
                        const originalPropinaDolaresInput = propinaDolaresInput.oninput;
                        propinaDolaresInput.oninput = function(e) {
                            // Llamar al handler original del formateo si existe
                            if (originalPropinaDolaresInput && typeof originalPropinaDolaresInput === 'function') {
                                originalPropinaDolaresInput.call(this, e);
                            }
                            // Actualizar total general
                            actualizarTotalGeneral();
                        };
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
                ORDER BY sr.id DESC
            `, [id]);

            // Obtener productos vendidos
            const productosVendidos = await window.electronAPI.dbQuery(`
                SELECT 
                    pv.*,
                    p.nombre as nombre_producto
                FROM ProductosVendidos pv
                JOIN Productos p ON pv.id_producto = p.id
                WHERE pv.id_transaccion = ?
                ORDER BY pv.id DESC
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
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Error: ' + mensaje, 'error', 5000);
        } else {
            console.error('Error: ' + mensaje);
        }
        // No forzar foco automáticamente para evitar parpadeo
        // Solo se forzará si realmente se detecta que los campos están bloqueados
    }

    function mostrarExito(mensaje) {
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion('Éxito: ' + mensaje, 'success', 3000);
        } else {
            console.log('Éxito: ' + mensaje);
        }
    }
})();

