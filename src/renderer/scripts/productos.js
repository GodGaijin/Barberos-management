// Gestión de Productos - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.productosModule) {
        window.productosModule = {
            productos: [],
            productoEditando: null,
            productoAEliminar: null,
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var productos = window.productosModule.productos;
    var productoEditando = window.productosModule.productoEditando;
    var productoAEliminar = window.productosModule.productoAEliminar;
    var initialized = window.productosModule.initialized;
    
    // Variables de paginación
    let currentPageProductos = 1;
    const itemsPerPage = 15;
    let productosFiltrados = [];

    // Inicialización - función exportada para ser llamada desde main.js
    window.initProductos = function() {
        console.log('initProductos llamado');
        // Siempre reconfigurar los event listeners porque el DOM se recrea al navegar
        // Pequeño delay para asegurar que el DOM esté completamente cargado
        setTimeout(() => {
            try {
                console.log('Configurando event listeners...');
                setupEventListeners();
                console.log('Cargando productos...');
                cargarProductos();
                window.productosModule.initialized = true;
                console.log('Productos inicializados correctamente');
            } catch (error) {
                console.error('Error al inicializar productos:', error);
                const tbody = document.getElementById('productos-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

    // No auto-inicializar - main.js se encarga de la inicialización cuando se navega a la página

    // Event Listeners
    function setupEventListeners() {
        try {
            // Botón nuevo producto
            const btnNuevo = document.getElementById('btn-nuevo-producto');
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
            
            const cancelProducto = document.getElementById('cancel-producto');
            if (cancelProducto) cancelProducto.onclick = cerrarModal;
            
            const cancelDelete = document.getElementById('cancel-delete');
            if (cancelDelete) cancelDelete.onclick = cerrarModalEliminar;

            // Formulario producto
            const productoForm = document.getElementById('producto-form');
            if (productoForm) {
                productoForm.onsubmit = (e) => {
                    e.preventDefault();
                    guardarProducto(e);
                };
            }
            
            // Formatear inputs de precio (esperar a que utils.js esté cargado)
            setTimeout(() => {
                const precioDolares = document.getElementById('producto-precio-dolares');
                const precioBs = document.getElementById('producto-precio-bs');
                const cantidad = document.getElementById('producto-cantidad');
                
                if (precioDolares && typeof formatearInputPrecio === 'function') {
                    // Guardar handlers de cálculo antes de formatear
                    precioDolares._originalBlur = calcularPrecioBs;
                    precioDolares._originalInput = async () => {
                        // Calcular en tiempo real mientras escribe
                        await calcularPrecioBs();
                    };
                    // Aplicar formateo (que preservará los handlers originales)
                    formatearInputPrecio(precioDolares);
                }
                // precioBs es readonly, no necesita formateo
                if (cantidad && typeof formatearInputCantidad === 'function') {
                    formatearInputCantidad(cantidad);
                }
            }, 200);

            // Búsqueda
            const searchProducto = document.getElementById('search-producto');
            if (searchProducto) {
                searchProducto.oninput = filtrarProductos;
            }
            
            const filterStock = document.getElementById('filter-stock');
            if (filterStock) {
                filterStock.onchange = filtrarProductos;
            }

            // Confirmar eliminación
            const confirmDelete = document.getElementById('confirm-delete');
            if (confirmDelete) {
                confirmDelete.onclick = eliminarProductoConfirmado;
            }

            // Cerrar modal al hacer clic fuera - SOLO en el fondo, no en el contenido
            const productoModal = document.getElementById('producto-modal');
            if (productoModal) {
                // Remover listener anterior si existe
                productoModal.onclick = null;
                // Agregar nuevo listener que solo cierra si se hace clic en el fondo
                productoModal.onclick = (e) => {
                    // Solo cerrar si el clic fue directamente en el modal (fondo), no en ningún hijo
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

    // Cargar productos desde la base de datos
    async function cargarProductos() {
        try {
            console.log('Iniciando carga de productos...');
            const tbody = document.getElementById('productos-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading">Cargando productos...</td></tr>';
            }
            
            // Verificar que electronAPI esté disponible
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            console.log('Consultando base de datos...');
            // Ordenar alfabéticamente por nombre
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Productos ORDER BY nombre ASC');
            console.log('Productos obtenidos:', resultados);
            
            window.productosModule.productos = resultados || [];
            // Actualizar referencia local
            productos.length = 0;
            if (window.productosModule.productos.length > 0) {
                productos.push(...window.productosModule.productos);
            }
            mostrarProductos(productos);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            const tbody = document.getElementById('productos-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="error-message">Error al cargar los productos: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar los productos: ' + (error.message || error));
        }
    }

    // Mostrar productos en la tabla
    function mostrarProductos(listaProductos) {
        const tbody = document.getElementById('productos-table-body');
        
        if (!tbody) return;
        
        // Guardar lista filtrada para paginación
        productosFiltrados = listaProductos;
        
        if (listaProductos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay productos registrados</td></tr>';
            window.renderPagination('pagination-productos', 1, 1, 'window.cambiarPaginaProductos');
            return;
        }
        
        // Calcular paginación
        const totalPages = Math.ceil(listaProductos.length / itemsPerPage);
        const startIndex = (currentPageProductos - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const productosPagina = listaProductos.slice(startIndex, endIndex);

        tbody.innerHTML = productosPagina.map((producto, index) => {
            const stockClass = producto.cantidad === 0 ? 'sin-stock' : producto.cantidad < 10 ? 'stock-bajo' : '';
            const globalIndex = startIndex + index + 1;
            
            return `
                <tr class="${stockClass}">
                    <td>#${globalIndex}</td>
                    <td>${producto.nombre}</td>
                    <td>${producto.cantidad}</td>
                    <td>$${parseFloat(producto.referencia_en_dolares).toFixed(2)}</td>
                    <td>${producto.precio_bs ? parseFloat(producto.precio_bs).toFixed(2) + ' Bs' : 'N/A'}</td>
                    <td class="actions">
                        <button class="btn-icon btn-edit" onclick="window.editarProducto(${producto.id})" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="window.eliminarProducto(${producto.id})" title="Eliminar">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Renderizar paginación
        window.renderPagination('pagination-productos', currentPageProductos, totalPages, 'window.cambiarPaginaProductos');
    }
    
    // Función para cambiar página de productos
    function cambiarPaginaProductos(page) {
        currentPageProductos = page;
        mostrarProductos(productosFiltrados);
    }
    
    // Exponer funciones para uso externo
    window.mostrarProductos = mostrarProductos;
    window.cambiarPaginaProductos = cambiarPaginaProductos;

    // Filtrar productos
    function filtrarProductos() {
        const searchTerm = document.getElementById('search-producto').value.toLowerCase();
        const filterStock = document.getElementById('filter-stock').value;

        let productosFiltradosTemp = productos;

        // Filtrar por stock
        if (filterStock === 'con-stock') {
            productosFiltradosTemp = productosFiltradosTemp.filter(p => p.cantidad > 0);
        } else if (filterStock === 'sin-stock') {
            productosFiltradosTemp = productosFiltradosTemp.filter(p => p.cantidad === 0);
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            productosFiltradosTemp = productosFiltradosTemp.filter(producto => {
                const nombre = producto.nombre.toLowerCase();
                return nombre.includes(searchTerm);
            });
        }

        // Resetear página al filtrar
        currentPageProductos = 1;
        
        mostrarProductos(productosFiltradosTemp);
    }

    // Abrir modal para nuevo producto
    async function abrirModalNuevo() {
        productoEditando = null;
        document.getElementById('modal-title').textContent = 'Nuevo Producto';
        document.getElementById('producto-form').reset();
        document.getElementById('producto-id').value = '';
        
        // Obtener referencias a los campos y asegurar que sean editables
        const nombreInput = document.getElementById('producto-nombre');
        const cantidadInput = document.getElementById('producto-cantidad');
        const precioDolaresInput = document.getElementById('producto-precio-dolares');
        
        if (nombreInput) {
            nombreInput.disabled = false;
            nombreInput.removeAttribute('readonly');
            nombreInput.style.pointerEvents = 'auto';
            nombreInput.style.cursor = 'text';
        }
        if (cantidadInput) {
            cantidadInput.disabled = false;
            cantidadInput.removeAttribute('readonly');
            cantidadInput.style.pointerEvents = 'auto';
            cantidadInput.style.cursor = 'text';
        }
        if (precioDolaresInput) {
            precioDolaresInput.disabled = false;
            precioDolaresInput.removeAttribute('readonly');
            precioDolaresInput.style.pointerEvents = 'auto';
            precioDolaresInput.style.cursor = 'text';
            
            // Guardar handlers de cálculo
            precioDolaresInput._originalBlur = calcularPrecioBs;
            precioDolaresInput._originalInput = async () => {
                await calcularPrecioBs();
            };
        }
        
        // Aplicar formateo
        if (typeof formatearInputPrecio === 'function' && precioDolaresInput) {
            formatearInputPrecio(precioDolaresInput);
        }
        if (typeof formatearInputCantidad === 'function' && cantidadInput) {
            formatearInputCantidad(cantidadInput);
        }
        
        // Calcular precio en Bs automáticamente
        await calcularPrecioBs();
        
        document.getElementById('producto-modal').classList.add('active');
        
        // Focus en el primer campo
        setTimeout(() => {
            if (nombreInput) nombreInput.focus();
        }, 100);
    }
    
    // Calcular precio en Bs según la tasa del día
    async function calcularPrecioBs() {
        try {
            const precioDolaresInput = document.getElementById('producto-precio-dolares');
            const precioBsInput = document.getElementById('producto-precio-bs');
            
            if (!precioDolaresInput || !precioBsInput) return;
            
            const precioDolares = parseFloat(precioDolaresInput.value) || 0;
            
            if (precioDolares > 0) {
                // Obtener tasa del día actual
                const hoy = new Date();
                const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
                
                const tasaHoy = await window.electronAPI.dbGet(
                    'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                    [fechaHoy]
                );
                
                if (tasaHoy) {
                    const precioBs = precioDolares * tasaHoy.tasa_bs_por_dolar;
                    precioBsInput.value = typeof formatearDecimales === 'function' 
                        ? formatearDecimales(precioBs) 
                        : precioBs.toFixed(2);
                } else {
                    precioBsInput.value = 'No disponible';
                    precioBsInput.placeholder = 'Establece la tasa del día primero';
                }
            } else {
                precioBsInput.value = '';
            }
        } catch (error) {
            console.error('Error al calcular precio en Bs:', error);
        }
    }

    // Editar producto
    window.editarProducto = async function(id) {
        try {
            const producto = await window.electronAPI.dbGet('SELECT * FROM Productos WHERE id = ?', [id]);
            
            if (!producto) {
                mostrarError('Producto no encontrado');
                return;
            }

            productoEditando = producto;
            document.getElementById('modal-title').textContent = 'Editar Producto';
            document.getElementById('producto-id').value = producto.id;
            
            // Obtener referencias a los campos
            const nombreInput = document.getElementById('producto-nombre');
            const cantidadInput = document.getElementById('producto-cantidad');
            const precioDolaresInput = document.getElementById('producto-precio-dolares');
            const precioBsInput = document.getElementById('producto-precio-bs');
            
            if (!nombreInput || !cantidadInput || !precioDolaresInput) {
                mostrarError('Error: Campos del formulario no encontrados');
                return;
            }
            
            // Asegurar que los campos estén habilitados (excepto precioBs que es readonly)
            nombreInput.disabled = false;
            cantidadInput.disabled = false;
            precioDolaresInput.disabled = false;
            
            // Remover atributo readonly si existe (excepto precioBs)
            nombreInput.removeAttribute('readonly');
            cantidadInput.removeAttribute('readonly');
            precioDolaresInput.removeAttribute('readonly');
            
            // Resetear flags de formateo para permitir re-aplicar
            precioDolaresInput._formateadoPrecio = false;
            precioDolaresInput._originalBlurSaved = false;
            precioDolaresInput._originalInputSaved = false;
            cantidadInput._formateadoCantidad = false;
            
            // Llenar los campos con los valores
            nombreInput.value = producto.nombre;
            cantidadInput.value = producto.cantidad;
            // Formatear precio en dólares a 2 decimales
            precioDolaresInput.value = typeof formatearDecimales === 'function' 
                ? formatearDecimales(producto.referencia_en_dolares) 
                : parseFloat(producto.referencia_en_dolares).toFixed(2);
            
            // Asegurar que los campos sean completamente interactivos ANTES de aplicar formateo
            nombreInput.style.pointerEvents = 'auto';
            nombreInput.style.cursor = 'text';
            cantidadInput.style.pointerEvents = 'auto';
            cantidadInput.style.cursor = 'text';
            precioDolaresInput.style.pointerEvents = 'auto';
            precioDolaresInput.style.cursor = 'text';
            
            // Guardar handlers de cálculo ANTES de formatear
            precioDolaresInput._originalBlur = calcularPrecioBs;
            precioDolaresInput._originalInput = async () => {
                await calcularPrecioBs();
            };
            
            // Re-aplicar formateo a los inputs
            if (typeof formatearInputPrecio === 'function') {
                formatearInputPrecio(precioDolaresInput);
            }
            if (typeof formatearInputCantidad === 'function') {
                formatearInputCantidad(cantidadInput);
            }
            
            // Calcular precio en Bs automáticamente
            await calcularPrecioBs();

            document.getElementById('producto-modal').classList.add('active');
            
            // Pequeño delay para asegurar que el DOM esté actualizado
            setTimeout(() => {
                // Forzar focus y selección para verificar que es editable
                nombreInput.focus();
                nombreInput.select();
                
                // Verificación adicional: intentar escribir en el campo
                console.log('Campo nombre editable:', !nombreInput.disabled && !nombreInput.readOnly && nombreInput.style.pointerEvents !== 'none');
                console.log('Campo cantidad editable:', !cantidadInput.disabled && !cantidadInput.readOnly && cantidadInput.style.pointerEvents !== 'none');
                console.log('Campo precio editable:', !precioDolaresInput.disabled && !precioDolaresInput.readOnly && precioDolaresInput.style.pointerEvents !== 'none');
            }, 150);
        } catch (error) {
            console.error('Error al cargar producto:', error);
            mostrarError('Error al cargar el producto');
        }
    };

    // Guardar producto
    async function guardarProducto(e) {
        e.preventDefault();

        const id = document.getElementById('producto-id').value;
        const nombre = document.getElementById('producto-nombre').value.trim();
        
        // Obtener valores numéricos formateados
        const cantidadInput = document.getElementById('producto-cantidad');
        const precioDolaresInput = document.getElementById('producto-precio-dolares');
        const precioBsInput = document.getElementById('producto-precio-bs');
        
        const cantidad = parseInt(cantidadInput.value) || 0;
        const precioDolares = obtenerValorNumerico ? obtenerValorNumerico(precioDolaresInput) : parseFloat(precioDolaresInput.value) || 0;
        
        // Calcular precio_bs automáticamente si no está disponible
        let precioBs = null;
        if (precioBsInput.value && precioBsInput.value !== 'No disponible' && precioBsInput.value !== '') {
            precioBs = obtenerValorNumerico ? obtenerValorNumerico(precioBsInput) : parseFloat(precioBsInput.value);
        } else {
            // Calcular según la tasa del día
            const hoy = new Date();
            const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
            const tasaHoy = await window.electronAPI.dbGet(
                'SELECT * FROM TasasCambio WHERE fecha = ?',
                [fechaHoy]
            );
            if (tasaHoy && precioDolares > 0) {
                precioBs = precioDolares * tasaHoy.tasa_bs_por_dolar;
            }
        }

        if (!nombre) {
            mostrarError('El nombre es requerido');
            return;
        }

        if (cantidad < 0) {
            mostrarError('La cantidad no puede ser negativa');
            return;
        }

        try {
            // Si precioBs es null, calcularlo según la tasa del día
            if (precioBs === null || precioBs === undefined) {
                const hoy = new Date();
                const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
                const tasaHoy = await window.electronAPI.dbGet(
                    'SELECT * FROM TasasCambio WHERE fecha = ? ORDER BY id DESC LIMIT 1',
                    [fechaHoy]
                );
                if (tasaHoy && precioDolares > 0) {
                    precioBs = precioDolares * tasaHoy.tasa_bs_por_dolar;
                } else {
                    mostrarError('No hay tasa de cambio establecida para hoy. Por favor, establece la tasa del día primero.');
                    return;
                }
            }
            
            if (id) {
                // Actualizar
                await window.electronAPI.dbRun(
                    'UPDATE Productos SET nombre = ?, cantidad = ?, referencia_en_dolares = ?, precio_bs = ? WHERE id = ?',
                    [nombre, cantidad, precioDolares, precioBs, id]
                );
            } else {
                // Verificar si ya existe un producto con el mismo nombre
                const existente = await window.electronAPI.dbGet(
                    'SELECT * FROM Productos WHERE nombre = ?',
                    [nombre]
                );

                if (existente) {
                    mostrarError('Ya existe un producto con este nombre');
                    return;
                }

                // Crear nuevo
                await window.electronAPI.dbRun(
                    'INSERT INTO Productos (nombre, cantidad, referencia_en_dolares, precio_bs) VALUES (?, ?, ?, ?)',
                    [nombre, cantidad, precioDolares, precioBs]
                );
            }

            cerrarModal();
            cargarProductos();
            mostrarExito(id ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
        } catch (error) {
            console.error('Error al guardar producto:', error);
            mostrarError('Error al guardar el producto: ' + (error.message || 'Error desconocido'));
        }
    }

    // Eliminar producto
    window.eliminarProducto = function(id) {
        productoAEliminar = id;
        document.getElementById('delete-modal').classList.add('active');
    };

    // Confirmar eliminación
    async function eliminarProductoConfirmado() {
        if (!productoAEliminar) return;

        try {
            await window.electronAPI.dbRun('DELETE FROM Productos WHERE id = ?', [productoAEliminar]);
            cerrarModalEliminar();
            cargarProductos();
            mostrarExito('Producto eliminado correctamente');
            productoAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            mostrarError('Error al eliminar el producto. Puede que tenga transacciones asociadas.');
            productoAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModal() {
        document.getElementById('producto-modal').classList.remove('active');
        productoEditando = null;
        
        // Resetear flags de formateo para permitir re-aplicar en la próxima apertura
        const precioDolares = document.getElementById('producto-precio-dolares');
        const cantidad = document.getElementById('producto-cantidad');
        if (precioDolares) {
            precioDolares._formateadoPrecio = false;
            precioDolares._originalBlurSaved = false;
            precioDolares._originalInputSaved = false;
        }
        if (cantidad) cantidad._formateadoCantidad = false;
    }

    function cerrarModalEliminar() {
        document.getElementById('delete-modal').classList.remove('active');
        productoAEliminar = null;
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
