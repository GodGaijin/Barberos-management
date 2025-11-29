// Gestión de Consumos de Empleados - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.consumosModule) {
        window.consumosModule = {
            consumos: [],
            consumoEditando: null,
            consumoAEliminar: null,
            empleados: [],
            productos: [],
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var consumos = window.consumosModule.consumos;
    var consumoEditando = window.consumosModule.consumoEditando;
    var consumoAEliminar = window.consumosModule.consumoAEliminar;
    var empleados = window.consumosModule.empleados;
    var productos = window.consumosModule.productos;
    var initialized = window.consumosModule.initialized;

    // Inicialización - función exportada para ser llamada desde main.js
    window.initConsumosEmpleados = function() {
        console.log('initConsumosEmpleados llamado');
        setTimeout(() => {
            try {
                console.log('Configurando event listeners...');
                setupEventListeners();
                console.log('Cargando datos...');
                cargarDatos();
                window.consumosModule.initialized = true;
                console.log('Consumos inicializados correctamente');
            } catch (error) {
                console.error('Error al inicializar consumos:', error);
                const tbody = document.getElementById('consumos-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="9" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

    // Event Listeners
    function setupEventListeners() {
        try {
            // Botón nuevo consumo
            const btnNuevo = document.getElementById('btn-nuevo-consumo');
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
            
            const cancelConsumo = document.getElementById('cancel-consumo');
            if (cancelConsumo) cancelConsumo.onclick = cerrarModal;
            
            const cancelDelete = document.getElementById('cancel-delete');
            if (cancelDelete) cancelDelete.onclick = cerrarModalEliminar;

            // Formulario consumo
            const consumoForm = document.getElementById('consumo-form');
            if (consumoForm) {
                consumoForm.onsubmit = (e) => {
                    e.preventDefault();
                    guardarConsumo(e);
                };
            }
            
            // Botón agregar producto
            const btnAgregarProducto = document.getElementById('btn-agregar-producto');
            if (btnAgregarProducto) {
                btnAgregarProducto.onclick = agregarFilaProducto;
            }
            
            // Establecer fecha por defecto a hoy
            const fechaInput = document.getElementById('consumo-fecha');
            if (fechaInput) {
                const hoy = new Date();
                fechaInput.value = hoy.toISOString().split('T')[0];
            }

            // Búsqueda y filtros
            const searchConsumo = document.getElementById('search-consumo');
            if (searchConsumo) {
                searchConsumo.oninput = filtrarConsumos;
            }
            
            const filterEstado = document.getElementById('filter-estado');
            if (filterEstado) {
                filterEstado.onchange = filtrarConsumos;
            }
            
            const filterEmpleado = document.getElementById('filter-empleado');
            if (filterEmpleado) {
                filterEmpleado.onchange = filtrarConsumos;
            }

            // Confirmar eliminación
            const confirmDelete = document.getElementById('confirm-delete');
            if (confirmDelete) {
                confirmDelete.onclick = eliminarConsumoConfirmado;
            }

            // Cerrar modal al hacer clic fuera
            const consumoModal = document.getElementById('consumo-modal');
            if (consumoModal) {
                consumoModal.onclick = (e) => {
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

    // Cargar datos iniciales
    async function cargarDatos() {
        try {
            await Promise.all([
                cargarConsumos(),
                cargarEmpleados(),
                cargarProductos()
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
            window.consumosModule.empleados = resultados || [];
            empleados.length = 0;
            if (window.consumosModule.empleados.length > 0) {
                empleados.push(...window.consumosModule.empleados);
            }
            
            // Llenar select de empleados
            const empleadoSelect = document.getElementById('consumo-empleado');
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

    // Cargar productos
    async function cargarProductos() {
        try {
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Productos ORDER BY nombre ASC');
            window.consumosModule.productos = resultados || [];
            productos.length = 0;
            if (window.consumosModule.productos.length > 0) {
                productos.push(...window.consumosModule.productos);
            }
            
            // Llenar select de productos
            const productoSelect = document.getElementById('consumo-producto');
            if (productoSelect) {
                productoSelect.innerHTML = '<option value="">Seleccione un producto...</option>' +
                    productos.map(p => `<option value="${p.id}" data-precio="${p.precio_bs || 0}">${p.nombre} (Stock: ${p.cantidad})</option>`).join('');
            }
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    }

    // Cargar consumos desde la base de datos
    async function cargarConsumos() {
        try {
            console.log('Iniciando carga de consumos...');
            const tbody = document.getElementById('consumos-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="9" class="loading">Cargando consumos...</td></tr>';
            }
            
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            console.log('Consultando base de datos...');
            const resultados = await window.electronAPI.dbQuery(`
                SELECT 
                    ce.*,
                    e.nombre || ' ' || e.apellido as nombre_empleado,
                    p.nombre as nombre_producto
                FROM ConsumosEmpleados ce
                JOIN Empleados e ON ce.id_empleado = e.id
                JOIN Productos p ON ce.id_producto = p.id
                ORDER BY ce.fecha DESC, ce.id DESC
            `);
            console.log('Consumos obtenidos:', resultados);
            
            window.consumosModule.consumos = resultados || [];
            consumos.length = 0;
            if (window.consumosModule.consumos.length > 0) {
                consumos.push(...window.consumosModule.consumos);
            }
            mostrarConsumos(consumos);
        } catch (error) {
            console.error('Error al cargar consumos:', error);
            const tbody = document.getElementById('consumos-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="9" class="error-message">Error al cargar los consumos: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar los consumos: ' + (error.message || error));
        }
    }

    // Mostrar consumos en la tabla
    function mostrarConsumos(listaConsumos) {
        const tbody = document.getElementById('consumos-table-body');
        
        if (!tbody) return;
        
        if (listaConsumos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No hay consumos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = listaConsumos.map((consumo, index) => {
            const estadoClass = consumo.estado === 'pagado' ? 'estado-pagado' : 'estado-pendiente';
            const estadoText = consumo.estado === 'pagado' ? 'Pagado' : 'Pendiente';
            
            // Formatear fecha
            const fecha = consumo.fecha;
            let fechaFormateada = fecha;
            if (fecha.includes('-')) {
                const [year, month, day] = fecha.split('-');
                fechaFormateada = `${day}/${month}/${year}`;
            }
            
            return `
                <tr class="${estadoClass}">
                    <td>#${index + 1}</td>
                    <td>${consumo.nombre_empleado}</td>
                    <td>${consumo.nombre_producto}</td>
                    <td>${consumo.cantidad}</td>
                    <td>${parseFloat(consumo.precio_unitario).toFixed(2)} Bs</td>
                    <td>${parseFloat(consumo.precio_total).toFixed(2)} Bs</td>
                    <td>${fechaFormateada}</td>
                    <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                    <td class="actions">
                        ${consumo.estado === 'pendiente' ? `
                            <button class="btn-icon btn-edit" onclick="window.editarConsumo(${consumo.id})" title="Editar">
                                ✏️
                            </button>
                            <button class="btn-icon btn-delete" onclick="window.eliminarConsumo(${consumo.id})" title="Eliminar">
                                🗑️
                            </button>
                        ` : `
                            <span class="no-editable" title="Consumo ya pagado">🔒</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Exponer función para uso externo
    window.mostrarConsumos = mostrarConsumos;

    // Filtrar consumos
    function filtrarConsumos() {
        const searchTerm = document.getElementById('search-consumo').value.toLowerCase();
        const filterEstado = document.getElementById('filter-estado').value;
        const filterEmpleado = document.getElementById('filter-empleado').value;

        let consumosFiltrados = consumos;

        // Filtrar por estado
        if (filterEstado !== 'all') {
            consumosFiltrados = consumosFiltrados.filter(c => c.estado === filterEstado);
        }

        // Filtrar por empleado
        if (filterEmpleado !== 'all') {
            consumosFiltrados = consumosFiltrados.filter(c => c.id_empleado == filterEmpleado);
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            consumosFiltrados = consumosFiltrados.filter(consumo => {
                const empleado = (consumo.nombre_empleado || '').toLowerCase();
                const producto = (consumo.nombre_producto || '').toLowerCase();
                return empleado.includes(searchTerm) || producto.includes(searchTerm);
            });
        }

        mostrarConsumos(consumosFiltrados);
    }

    // Contador para IDs únicos de filas de productos
    let contadorFilaProducto = 0;

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
            productoSelect.onchange = () => calcularPrecioFila(filaId);
        }
        
        if (cantidadInput) {
            // Establecer el handler de cálculo ANTES de aplicar el formateo
            // Así el formateo lo preservará
            cantidadInput.oninput = () => calcularPrecioFila(filaId);
            
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

    // Calcular precio de una fila específica
    function calcularPrecioFila(filaId) {
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
            // Obtener precio del option seleccionado o del array de productos
            const optionSeleccionado = productoSelect.options[productoSelect.selectedIndex];
            let precioUnitario = 0;
            
            if (optionSeleccionado && optionSeleccionado.dataset.precio) {
                precioUnitario = parseFloat(optionSeleccionado.dataset.precio) || 0;
            } else {
                // Si no está en el data attribute, buscar en el array
                const producto = productos.find(p => p.id == productoId);
                if (producto && producto.precio_bs) {
                    precioUnitario = parseFloat(producto.precio_bs) || 0;
                }
            }
            
            if (precioUnitario > 0) {
                const precioTotal = precioUnitario * cantidad;
                
                // Formatear sin usar formatearDecimales para evitar el formato 000.00
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
        
        // Actualizar total general
        actualizarTotalGeneral();
    }

    // Actualizar total general sumando todos los productos
    function actualizarTotalGeneral() {
        const totalGeneralInput = document.getElementById('consumo-total-general');
        if (!totalGeneralInput) return;
        
        const filas = document.querySelectorAll('.producto-fila');
        let totalGeneral = 0;
        
        filas.forEach(fila => {
            const totalInput = fila.querySelector('.producto-total');
            if (totalInput && totalInput.value && totalInput.value !== 'No disponible') {
                const valor = parseFloat(totalInput.value.replace(/[^\d.]/g, '')) || 0;
                totalGeneral += valor;
            }
        });
        
        totalGeneralInput.value = totalGeneral.toFixed(2);
    }

    // Abrir modal para nuevo consumo
    async function abrirModalNuevo() {
        consumoEditando = null;
        document.getElementById('modal-title').textContent = 'Nuevo Consumo';
        document.getElementById('consumo-form').reset();
        document.getElementById('consumo-id').value = '';
        
        // Limpiar lista de productos
        const productosLista = document.getElementById('productos-lista');
        if (productosLista) {
            productosLista.innerHTML = '';
        }
        
        // Agregar una fila inicial
        agregarFilaProducto();
        
        // Establecer fecha por defecto a hoy
        const fechaInput = document.getElementById('consumo-fecha');
        if (fechaInput) {
            const hoy = new Date();
            fechaInput.value = hoy.toISOString().split('T')[0];
        }
        
        // Asegurar que los campos estén habilitados
        const empleadoSelect = document.getElementById('consumo-empleado');
        const fechaInput2 = document.getElementById('consumo-fecha');
        
        if (empleadoSelect) {
            empleadoSelect.disabled = false;
            empleadoSelect.style.pointerEvents = 'auto';
            empleadoSelect.style.cursor = 'pointer';
        }
        
        if (fechaInput2) {
            fechaInput2.disabled = false;
            fechaInput2.removeAttribute('readonly');
            fechaInput2.style.pointerEvents = 'auto';
            fechaInput2.style.cursor = 'text';
        }
        
        document.getElementById('consumo-modal').classList.add('active');
        
        setTimeout(() => {
            if (empleadoSelect) empleadoSelect.focus();
        }, 100);
    }

    // Editar consumo (solo un producto a la vez)
    window.editarConsumo = async function(id) {
        try {
            const consumo = await window.electronAPI.dbGet(`
                SELECT 
                    ce.*,
                    e.nombre || ' ' || e.apellido as nombre_empleado,
                    p.nombre as nombre_producto
                FROM ConsumosEmpleados ce
                JOIN Empleados e ON ce.id_empleado = e.id
                JOIN Productos p ON ce.id_producto = p.id
                WHERE ce.id = ?
            `, [id]);
            
            if (!consumo) {
                mostrarError('Consumo no encontrado');
                return;
            }

            if (consumo.estado === 'pagado') {
                mostrarError('No se puede editar un consumo que ya fue pagado en una nómina');
                return;
            }

            consumoEditando = consumo;
            document.getElementById('modal-title').textContent = 'Editar Consumo';
            document.getElementById('consumo-id').value = consumo.id;
            
            // Limpiar lista de productos
            const productosLista = document.getElementById('productos-lista');
            if (productosLista) {
                productosLista.innerHTML = '';
            }
            
            // Agregar una fila con el producto a editar
            contadorFilaProducto++;
            const filaId = `producto-fila-${contadorFilaProducto}`;
            const filaHTML = `
                <div class="producto-fila" id="${filaId}" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 6px; background: var(--bg-secondary);">
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;">
                            <label>Producto *</label>
                            <select class="producto-select" data-fila="${filaId}" required>
                                <option value="">Seleccione un producto...</option>
                                ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio_bs || 0}" data-stock="${p.cantidad}" ${p.id == consumo.id_producto ? 'selected' : ''}>${p.nombre} (Stock: ${p.cantidad})</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Cantidad *</label>
                            <input type="text" class="producto-cantidad" data-fila="${filaId}" required placeholder="0" inputmode="numeric" value="${consumo.cantidad}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label>Precio Unit. (Bs)</label>
                            <input type="text" class="producto-precio-unitario" data-fila="${filaId}" placeholder="0.00" readonly value="${typeof formatearDecimales === 'function' ? formatearDecimales(consumo.precio_unitario) : parseFloat(consumo.precio_unitario).toFixed(2)}">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Total (Bs)</label>
                            <input type="text" class="producto-total" data-fila="${filaId}" placeholder="0.00" readonly value="${typeof formatearDecimales === 'function' ? formatearDecimales(consumo.precio_total) : parseFloat(consumo.precio_total).toFixed(2)}">
                        </div>
                    </div>
                </div>
            `;
            
            productosLista.insertAdjacentHTML('beforeend', filaHTML);
            
            // Configurar event listeners
            const filaElement = document.getElementById(filaId);
            const productoSelect = filaElement.querySelector('.producto-select');
            const cantidadInput = filaElement.querySelector('.producto-cantidad');
            
            if (productoSelect) {
                productoSelect.onchange = () => calcularPrecioFila(filaId);
            }
            
            if (cantidadInput) {
                // Establecer el handler de cálculo ANTES de aplicar el formateo
                // Así el formateo lo preservará
                cantidadInput.oninput = () => calcularPrecioFila(filaId);
                
                if (typeof formatearInputCantidad === 'function') {
                    formatearInputCantidad(cantidadInput);
                }
            }
            
            // Calcular precio inicial
            calcularPrecioFila(filaId);
            
            const empleadoSelect = document.getElementById('consumo-empleado');
            const fechaInput = document.getElementById('consumo-fecha');
            
            if (!empleadoSelect || !fechaInput) {
                mostrarError('Error: Campos del formulario no encontrados');
                return;
            }
            
            // Llenar campos
            empleadoSelect.value = consumo.id_empleado;
            
            // Formatear fecha
            let fechaValue = consumo.fecha;
            if (fechaValue.includes('/')) {
                const [day, month, year] = fechaValue.split('/');
                fechaValue = `${year}-${month}-${day}`;
            }
            fechaInput.value = fechaValue;
            
            // Asegurar que los campos estén habilitados
            if (empleadoSelect) {
                empleadoSelect.disabled = false;
                empleadoSelect.style.pointerEvents = 'auto';
                empleadoSelect.style.cursor = 'pointer';
            }
            
            if (fechaInput) {
                fechaInput.disabled = false;
                fechaInput.removeAttribute('readonly');
                fechaInput.style.pointerEvents = 'auto';
                fechaInput.style.cursor = 'text';
            }

            document.getElementById('consumo-modal').classList.add('active');
            
            setTimeout(() => {
                empleadoSelect.focus();
            }, 150);
        } catch (error) {
            console.error('Error al cargar consumo:', error);
            mostrarError('Error al cargar el consumo');
        }
    };

    // Guardar consumo
    async function guardarConsumo(e) {
        e.preventDefault();

        const id = document.getElementById('consumo-id').value;
        const idEmpleado = parseInt(document.getElementById('consumo-empleado').value);
        const fechaInput = document.getElementById('consumo-fecha').value;
        
        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
        let fecha = fechaInput;
        if (fecha.includes('-')) {
            const [year, month, day] = fecha.split('-');
            fecha = `${day}/${month}/${year}`;
        }

        if (!idEmpleado || !fecha) {
            mostrarError('El empleado y la fecha son requeridos');
            return;
        }

        // Obtener todas las filas de productos
        const filas = document.querySelectorAll('.producto-fila');
        if (filas.length === 0) {
            mostrarError('Debe agregar al menos un producto');
            return;
        }

        const productosData = [];
        
        // Validar cada fila
        for (const fila of filas) {
            const productoSelect = fila.querySelector('.producto-select');
            const cantidadInput = fila.querySelector('.producto-cantidad');
            const precioUnitarioInput = fila.querySelector('.producto-precio-unitario');
            const precioTotalInput = fila.querySelector('.producto-total');
            
            if (!productoSelect || !cantidadInput) continue;
            
            const idProducto = parseInt(productoSelect.value);
            const cantidad = parseInt(cantidadInput.value) || 0;
            
            if (!idProducto || !cantidad) {
                mostrarError('Todos los productos deben tener producto y cantidad seleccionados');
                return;
            }
            
            if (cantidad <= 0) {
                mostrarError('La cantidad debe ser mayor a 0');
                return;
            }
            
            // Verificar stock disponible
            const producto = productos.find(p => p.id == idProducto);
            if (!producto) {
                mostrarError('Producto no encontrado');
                return;
            }
            
            if (cantidad > producto.cantidad) {
                mostrarError(`No hay suficiente stock de ${producto.nombre}. Stock disponible: ${producto.cantidad}`);
                return;
            }
            
            const precioUnitario = obtenerValorNumerico ? obtenerValorNumerico(precioUnitarioInput) : parseFloat(precioUnitarioInput.value.replace(/[^\d.]/g, '')) || 0;
            const precioTotal = obtenerValorNumerico ? obtenerValorNumerico(precioTotalInput) : parseFloat(precioTotalInput.value.replace(/[^\d.]/g, '')) || 0;
            
            productosData.push({
                id_producto: idProducto,
                cantidad: cantidad,
                precio_unitario: precioUnitario,
                precio_total: precioTotal
            });
        }

        try {
            if (id) {
                // Editar consumo existente (solo un producto)
                const fila = document.querySelector('.producto-fila');
                if (!fila) {
                    mostrarError('Debe agregar al menos un producto');
                    return;
                }
                
                const productoSelect = fila.querySelector('.producto-select');
                const cantidadInput = fila.querySelector('.producto-cantidad');
                const precioUnitarioInput = fila.querySelector('.producto-precio-unitario');
                const precioTotalInput = fila.querySelector('.producto-total');
                
                if (!productoSelect || !cantidadInput) {
                    mostrarError('Todos los campos son requeridos');
                    return;
                }
                
                const idProducto = parseInt(productoSelect.value);
                const cantidad = parseInt(cantidadInput.value) || 0;
                
                if (!idProducto || !cantidad || cantidad <= 0) {
                    mostrarError('Producto y cantidad válidos son requeridos');
                    return;
                }
                
                // Obtener consumo original para verificar stock
                const consumoOriginal = await window.electronAPI.dbGet(
                    'SELECT * FROM ConsumosEmpleados WHERE id = ?',
                    [id]
                );
                
                if (!consumoOriginal) {
                    mostrarError('Consumo no encontrado');
                    return;
                }
                
                // Verificar stock disponible (considerando la cantidad original que se devolverá)
                const producto = productos.find(p => p.id == idProducto);
                if (!producto) {
                    mostrarError('Producto no encontrado');
                    return;
                }
                
                const stockDisponible = producto.cantidad + (consumoOriginal.id_producto == idProducto ? consumoOriginal.cantidad : 0);
                if (cantidad > stockDisponible) {
                    mostrarError(`No hay suficiente stock de ${producto.nombre}. Stock disponible: ${stockDisponible}`);
                    return;
                }
                
                const precioUnitario = obtenerValorNumerico ? obtenerValorNumerico(precioUnitarioInput) : parseFloat(precioUnitarioInput.value.replace(/[^\d.]/g, '')) || 0;
                const precioTotal = obtenerValorNumerico ? obtenerValorNumerico(precioTotalInput) : parseFloat(precioTotalInput.value.replace(/[^\d.]/g, '')) || 0;
                
                // Devolver stock del producto original
                await window.electronAPI.dbRun(
                    'UPDATE Productos SET cantidad = cantidad + ? WHERE id = ?',
                    [consumoOriginal.cantidad, consumoOriginal.id_producto]
                );
                
                // Actualizar consumo
                await window.electronAPI.dbRun(
                    'UPDATE ConsumosEmpleados SET id_producto = ?, cantidad = ?, precio_unitario = ?, precio_total = ? WHERE id = ?',
                    [idProducto, cantidad, precioUnitario, precioTotal, id]
                );
                
                // Descontar nuevo stock
                await window.electronAPI.dbRun(
                    'UPDATE Productos SET cantidad = cantidad - ? WHERE id = ?',
                    [cantidad, idProducto]
                );
            } else {
                // Crear un registro por cada producto
                for (const productoData of productosData) {
                    await window.electronAPI.dbRun(
                        'INSERT INTO ConsumosEmpleados (id_empleado, id_producto, cantidad, fecha, precio_unitario, precio_total, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [idEmpleado, productoData.id_producto, productoData.cantidad, fecha, productoData.precio_unitario, productoData.precio_total, 'pendiente']
                    );
                    
                    // Descontar del stock del producto
                    await window.electronAPI.dbRun(
                        'UPDATE Productos SET cantidad = cantidad - ? WHERE id = ?',
                        [productoData.cantidad, productoData.id_producto]
                    );
                }
            }

            cerrarModal();
            await cargarDatos(); // Recargar consumos y productos
            mostrarExito('Consumos registrados correctamente');
        } catch (error) {
            console.error('Error al guardar consumo:', error);
            mostrarError('Error al guardar los consumos: ' + (error.message || 'Error desconocido'));
        }
    }

    // Eliminar consumo
    window.eliminarConsumo = function(id) {
        consumoAEliminar = id;
        document.getElementById('delete-modal').classList.add('active');
    };

    // Confirmar eliminación
    async function eliminarConsumoConfirmado() {
        if (!consumoAEliminar) return;

        try {
            // Verificar que no esté pagado
            const consumo = await window.electronAPI.dbGet(
                'SELECT * FROM ConsumosEmpleados WHERE id = ?',
                [consumoAEliminar]
            );

            if (consumo && consumo.estado === 'pagado') {
                mostrarError('No se puede eliminar un consumo que ya fue pagado en una nómina');
                cerrarModalEliminar();
                return;
            }

            // Devolver cantidad al stock
            if (consumo) {
                await window.electronAPI.dbRun(
                    'UPDATE Productos SET cantidad = cantidad + ? WHERE id = ?',
                    [consumo.cantidad, consumo.id_producto]
                );
            }

            await window.electronAPI.dbRun('DELETE FROM ConsumosEmpleados WHERE id = ?', [consumoAEliminar]);
            cerrarModalEliminar();
            await cargarDatos(); // Recargar consumos y productos
            mostrarExito('Consumo eliminado correctamente');
            consumoAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar consumo:', error);
            mostrarError('Error al eliminar el consumo');
            consumoAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModal() {
        document.getElementById('consumo-modal').classList.remove('active');
        consumoEditando = null;
    }

    function cerrarModalEliminar() {
        document.getElementById('delete-modal').classList.remove('active');
        consumoAEliminar = null;
    }

    // Mostrar mensajes
    function mostrarError(mensaje) {
        alert('Error: ' + mensaje);
    }

    function mostrarExito(mensaje) {
        alert('Éxito: ' + mensaje);
    }
})();

