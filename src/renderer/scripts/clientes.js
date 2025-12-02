// Gestión de Clientes - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.clientesModule) {
        window.clientesModule = {
            clientes: [],
            clienteEditando: null,
            clienteAEliminar: null,
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var clientes = window.clientesModule.clientes;
    var clienteEditando = window.clientesModule.clienteEditando;
    var clienteAEliminar = window.clientesModule.clienteAEliminar;
    var initialized = window.clientesModule.initialized;
    
    // Variables de paginación
    let currentPageClientes = 1;
    const itemsPerPage = 15;
    let clientesFiltrados = [];

    // Inicialización - función exportada para ser llamada desde main.js
    window.initClientes = function() {
        console.log('initClientes llamado');
        // Siempre reconfigurar los event listeners porque el DOM se recrea al navegar
        // Pequeño delay para asegurar que el DOM esté completamente cargado
        setTimeout(() => {
            try {
                console.log('Configurando event listeners...');
                setupEventListeners();
                console.log('Cargando clientes...');
                cargarClientes();
                window.clientesModule.initialized = true;
                console.log('Clientes inicializados correctamente');
            } catch (error) {
                console.error('Error al inicializar clientes:', error);
                const tbody = document.getElementById('clientes-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

    // No auto-inicializar - main.js se encarga de la inicialización cuando se navega a la página

    // Event Listeners
    function setupEventListeners() {
        // Obtener elementos específicos del módulo
        const btnNuevo = document.getElementById('btn-nuevo-cliente');
        const clienteTipo = document.getElementById('cliente-tipo');
        const searchCliente = document.getElementById('search-cliente');
        const filterTipoCliente = document.getElementById('filter-tipo-cliente');
        const confirmDelete = document.getElementById('confirm-delete');

        if (!btnNuevo) {
            console.error('Elementos necesarios no encontrados en setupEventListeners');
            return;
        }

        // Inicializar sistema unificado de modales
        if (typeof window.initModalManager === 'function') {
            window.initModalManager('clientes', {
                onSave: guardarCliente,
                onClose: () => {
                    window.clientesModule.clienteEditando = null;
                    clienteEditando = null;
                }
            });
        }

        // Botón nuevo cliente
        btnNuevo.onclick = () => {
            abrirModalNuevo();
        };

        // Tipo de cliente
        if (clienteTipo) {
            clienteTipo.onchange = (e) => {
                toggleTipoCliente(e.target.value);
            };
        }

        // Búsqueda
        if (searchCliente) searchCliente.oninput = filtrarClientes;
        if (filterTipoCliente) filterTipoCliente.onchange = filtrarClientes;

        // Confirmar eliminación
        if (confirmDelete) confirmDelete.onclick = eliminarClienteConfirmado;
    }

    // Cargar clientes desde la base de datos
    async function cargarClientes() {
        try {
            const tbody = document.getElementById('clientes-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading">Cargando clientes...</td></tr>';
            }
            
            // Ordenar alfabéticamente por nombre y apellido
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Clientes ORDER BY nombre ASC, apellido ASC');
            window.clientesModule.clientes = resultados;
            clientes = window.clientesModule.clientes;
            mostrarClientes(clientes);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            const tbody = document.getElementById('clientes-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="error-message">Error al cargar los clientes: ' + error.message + '</td></tr>';
            }
            mostrarError('Error al cargar los clientes: ' + error.message);
        }
    }

    // Mostrar clientes en la tabla
    function mostrarClientes(listaClientes) {
        const tbody = document.getElementById('clientes-table-body');
        if (!tbody) return;
        
        // Guardar lista filtrada para paginación
        clientesFiltrados = listaClientes;
        
        if (listaClientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay clientes registrados</td></tr>';
            window.renderPagination('pagination-clientes', 1, 1, 'window.cambiarPaginaClientes');
            return;
        }
        
        // Calcular paginación
        const totalPages = Math.ceil(listaClientes.length / itemsPerPage);
        const startIndex = (currentPageClientes - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const clientesPagina = listaClientes.slice(startIndex, endIndex);

        tbody.innerHTML = clientesPagina.map((cliente, index) => {
            // Manejar cédula NA (cliente contado)
            let cedulaCompleta;
            if (cliente.tipo_cedula === 'NA' || cliente.cedula === 0) {
                cedulaCompleta = 'NA';
            } else {
                cedulaCompleta = `${cliente.tipo_cedula}-${cliente.cedula}`;
            }
            const telefono = cliente.telefono || '-';
            
            // Verificar si es cliente contado
            const esClienteContado = cliente.tipo_cedula === 'NA' || cliente.cedula === 0;
            
            return `
                <tr ${esClienteContado ? 'class="cliente-contado-row"' : ''}>
                    <td>#${index + 1}</td>
                    <td>${cliente.nombre}</td>
                    <td>${cliente.apellido}</td>
                    <td>${cedulaCompleta}</td>
                    <td>${telefono}</td>
                    <td class="actions">
                        ${esClienteContado ? 
                            '<span class="no-editable" title="Cliente contado no es editable">🔒</span>' :
                            `<button class="btn-icon btn-edit" onclick="window.editarCliente(${cliente.id})" title="Editar">
                                ✏️
                            </button>`
                        }
                        ${esClienteContado ? 
                            '<span class="no-deletable" title="Cliente contado no se puede eliminar">🔒</span>' :
                            `<button class="btn-icon btn-delete" onclick="window.eliminarCliente(${cliente.id})" title="Eliminar">
                                🗑️
                            </button>`
                        }
                    </td>
                </tr>
            `;
        }).join('');
        
        // Renderizar paginación
        window.renderPagination('pagination-clientes', currentPageClientes, totalPages, 'window.cambiarPaginaClientes');
    }
    
    // Función para cambiar página de clientes
    function cambiarPaginaClientes(page) {
        currentPageClientes = page;
        mostrarClientes(clientesFiltrados);
    }
    
    // Exponer función de cambio de página
    window.cambiarPaginaClientes = cambiarPaginaClientes;

    // Filtrar clientes
    function filtrarClientes() {
        const searchTerm = document.getElementById('search-cliente').value.toLowerCase();
        const filterType = document.getElementById('filter-tipo-cliente').value;

        let clientesFiltradosTemp = clientes;

        // Filtrar por tipo
        if (filterType === 'registrado') {
            clientesFiltradosTemp = clientesFiltradosTemp.filter(c => c.tipo_cedula !== 'NA' && c.cedula !== 0);
        } else if (filterType === 'contado') {
            clientesFiltradosTemp = clientesFiltradosTemp.filter(c => c.tipo_cedula === 'NA' || c.cedula === 0);
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            clientesFiltradosTemp = clientesFiltradosTemp.filter(cliente => {
                const nombre = cliente.nombre.toLowerCase();
                const apellido = cliente.apellido.toLowerCase();
                let cedula = 'NA';
                if (cliente.tipo_cedula !== 'NA' && cliente.cedula !== 0) {
                    cedula = `${cliente.tipo_cedula}-${cliente.cedula}`.toLowerCase();
                }
                return nombre.includes(searchTerm) || 
                       apellido.includes(searchTerm) || 
                       cedula.includes(searchTerm);
            });
        }

        // Resetear página al filtrar
        currentPageClientes = 1;
        
        mostrarClientes(clientesFiltradosTemp);
    }

    // Abrir modal para nuevo cliente
    function abrirModalNuevo() {
        window.clientesModule.clienteEditando = null;
        clienteEditando = null;
        document.getElementById('modal-title').textContent = 'Nuevo Cliente';
        document.getElementById('cliente-form').reset();
        document.getElementById('cliente-id').value = '';
        document.getElementById('cliente-tipo').value = 'registrado';
        // Ocultar selector de tipo y opción de cliente contado al crear nuevo
        document.getElementById('tipo-cliente-row').style.display = 'none';
        document.getElementById('option-contado').style.display = 'none';
        toggleTipoCliente('registrado');
        
        // Obtener referencias a los campos y asegurar que sean editables
        const nombreInput = document.getElementById('cliente-nombre');
        const apellidoInput = document.getElementById('cliente-apellido');
        const tipoCedulaSelect = document.getElementById('cliente-tipo-cedula');
        const cedulaInput = document.getElementById('cliente-cedula');
        const telefonoInput = document.getElementById('cliente-telefono');
        
        // Asegurar que todos los campos sean completamente interactivos
        [nombreInput, apellidoInput, tipoCedulaSelect, cedulaInput, telefonoInput].forEach(input => {
            if (input) {
                input.disabled = false;
                input.removeAttribute('readonly');
                input.style.pointerEvents = 'auto';
                input.style.cursor = input.tagName === 'SELECT' ? 'pointer' : 'text';
            }
        });
        
        if (typeof window.openModal === 'function') {
            window.openModal('clientes');
        } else {
            document.getElementById('cliente-modal').classList.add('active');
        }
        
        // Focus en el primer campo
        setTimeout(() => {
            if (nombreInput) nombreInput.focus();
        }, 100);
    }

    // Editar cliente
    window.editarCliente = async function(id) {
        try {
            const cliente = await window.electronAPI.dbGet('SELECT * FROM Clientes WHERE id = ?', [id]);
            
            if (!cliente) {
                mostrarError('Cliente no encontrado');
                return;
            }

            // Verificar si es cliente contado
            const esClienteContado = cliente.tipo_cedula === 'NA' || cliente.cedula === 0;
            
            if (esClienteContado) {
                mostrarError('El cliente contado no es editable');
                return;
            }

            window.clientesModule.clienteEditando = cliente;
            clienteEditando = cliente;
            document.getElementById('modal-title').textContent = 'Editar Cliente';
            document.getElementById('cliente-id').value = cliente.id;
            
            // Ocultar selector de tipo al editar cliente registrado
            const tipoClienteRow = document.getElementById('tipo-cliente-row');
            tipoClienteRow.style.display = 'none';
            
            // Es cliente registrado
            document.getElementById('cliente-tipo').value = 'registrado';
            toggleTipoCliente('registrado');
            
            // Obtener referencias a los campos
            const nombreInput = document.getElementById('cliente-nombre');
            const apellidoInput = document.getElementById('cliente-apellido');
            const tipoCedulaSelect = document.getElementById('cliente-tipo-cedula');
            const cedulaInput = document.getElementById('cliente-cedula');
            const telefonoInput = document.getElementById('cliente-telefono');
            
            // Asegurar que los campos estén habilitados y sean completamente interactivos
            nombreInput.disabled = false;
            apellidoInput.disabled = false;
            tipoCedulaSelect.disabled = false;
            cedulaInput.disabled = false;
            telefonoInput.disabled = false;
            
            // Remover atributo readonly si existe
            nombreInput.removeAttribute('readonly');
            apellidoInput.removeAttribute('readonly');
            tipoCedulaSelect.removeAttribute('readonly');
            cedulaInput.removeAttribute('readonly');
            telefonoInput.removeAttribute('readonly');
            
            // Asegurar estilos inline para garantizar interactividad
            nombreInput.style.pointerEvents = 'auto';
            nombreInput.style.cursor = 'text';
            apellidoInput.style.pointerEvents = 'auto';
            apellidoInput.style.cursor = 'text';
            tipoCedulaSelect.style.pointerEvents = 'auto';
            tipoCedulaSelect.style.cursor = 'pointer';
            cedulaInput.style.pointerEvents = 'auto';
            cedulaInput.style.cursor = 'text';
            telefonoInput.style.pointerEvents = 'auto';
            telefonoInput.style.cursor = 'text';
            
            // Llenar los campos con los valores
            nombreInput.value = cliente.nombre;
            apellidoInput.value = cliente.apellido;
            tipoCedulaSelect.value = cliente.tipo_cedula;
            cedulaInput.value = cliente.cedula;
            telefonoInput.value = cliente.telefono || '';

            if (typeof window.openModal === 'function') {
                window.openModal('clientes');
            } else {
                document.getElementById('cliente-modal').classList.add('active');
            }
            
            // Pequeño delay para asegurar que el DOM esté actualizado
            setTimeout(() => {
                // Forzar focus y selección para verificar que es editable
                nombreInput.focus();
                nombreInput.select();
                console.log('Campo nombre editable:', !nombreInput.disabled && !nombreInput.readOnly && nombreInput.style.pointerEvents !== 'none');
            }, 150);
        } catch (error) {
            console.error('Error al cargar cliente:', error);
            mostrarError('Error al cargar el cliente');
        }
    };

    // Toggle entre tipo de cliente
    function toggleTipoCliente(tipo) {
        const registradoFields = document.getElementById('cliente-registrado-fields');
        const contadoInfo = document.getElementById('cliente-contado-info');

        if (tipo === 'contado') {
            registradoFields.style.display = 'none';
            contadoInfo.style.display = 'block';
            // Limpiar campos requeridos
            document.getElementById('cliente-nombre').required = false;
            document.getElementById('cliente-apellido').required = false;
            document.getElementById('cliente-tipo-cedula').required = false;
            document.getElementById('cliente-cedula').required = false;
        } else {
            registradoFields.style.display = 'block';
            contadoInfo.style.display = 'none';
            // Restaurar campos requeridos
            document.getElementById('cliente-nombre').required = true;
            document.getElementById('cliente-apellido').required = true;
            document.getElementById('cliente-tipo-cedula').required = true;
            document.getElementById('cliente-cedula').required = true;
        }
    }

    // Guardar cliente
    async function guardarCliente(e) {
        e.preventDefault();

        const tipo = document.getElementById('cliente-tipo').value;
        const id = document.getElementById('cliente-id').value;

        try {
            if (tipo === 'contado') {
                // Cliente contado - solo se puede editar, no crear nuevos
                if (id) {
                    // Actualizar cliente contado existente
                    await window.electronAPI.dbRun(
                        'UPDATE Clientes SET nombre = ?, apellido = ?, tipo_cedula = ?, cedula = ? WHERE id = ?',
                        ['CLIENTE CONTADO', 'CLIENTE CONTADO', 'NA', 0, id]
                    );
                } else {
                    // No se pueden crear nuevos clientes contados
                    mostrarError('El cliente contado ya existe en el sistema. Solo se puede editar el existente.');
                    return;
                }
            } else {
                // Cliente registrado
                const nombre = document.getElementById('cliente-nombre').value.trim();
                const apellido = document.getElementById('cliente-apellido').value.trim();
                const tipoCedula = document.getElementById('cliente-tipo-cedula').value;
                const cedula = parseInt(document.getElementById('cliente-cedula').value);
                const telefono = document.getElementById('cliente-telefono').value.trim() || null;

                if (id) {
                    // Actualizar
                    await window.electronAPI.dbRun(
                        'UPDATE Clientes SET nombre = ?, apellido = ?, tipo_cedula = ?, cedula = ?, telefono = ? WHERE id = ?',
                        [nombre, apellido, tipoCedula, cedula, telefono, id]
                    );
                } else {
                    // Verificar si ya existe la cédula
                    const existente = await window.electronAPI.dbGet(
                        'SELECT * FROM Clientes WHERE tipo_cedula = ? AND cedula = ?',
                        [tipoCedula, cedula]
                    );

                    if (existente) {
                        mostrarError('Ya existe un cliente con esta cédula');
                        return;
                    }

                    // Crear nuevo
                    await window.electronAPI.dbRun(
                        'INSERT INTO Clientes (nombre, apellido, tipo_cedula, cedula, telefono) VALUES (?, ?, ?, ?, ?)',
                        [nombre, apellido, tipoCedula, cedula, telefono]
                    );
                }
            }

            cerrarModal();
            cargarClientes();
            mostrarExito(id ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
        } catch (error) {
            console.error('Error al guardar cliente:', error);
            mostrarError('Error al guardar el cliente: ' + (error.message || 'Error desconocido'));
        }
    }

    // Eliminar cliente
    window.eliminarCliente = async function(id) {
        try {
            // Verificar si es cliente contado
            const cliente = await window.electronAPI.dbGet('SELECT * FROM Clientes WHERE id = ?', [id]);
            
            if (cliente && (cliente.tipo_cedula === 'NA' || cliente.cedula === 0)) {
                mostrarError('El cliente contado no se puede eliminar');
                return;
            }
            
            window.clientesModule.clienteAEliminar = id;
            clienteAEliminar = id;
            if (typeof window.openDeleteModal === 'function') {
                window.openDeleteModal('clientes');
            } else {
                document.getElementById('delete-modal').classList.add('active');
            }
        } catch (error) {
            console.error('Error al verificar cliente:', error);
            mostrarError('Error al verificar el cliente');
        }
    };

    // Confirmar eliminación
    async function eliminarClienteConfirmado() {
        if (!clienteAEliminar) return;

        try {
            await window.electronAPI.dbRun('DELETE FROM Clientes WHERE id = ?', [clienteAEliminar]);
            cerrarModalEliminar();
            cargarClientes();
            mostrarExito('Cliente eliminado correctamente');
            window.clientesModule.clienteAEliminar = null;
            clienteAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            mostrarError('Error al eliminar el cliente. Puede que tenga transacciones asociadas.');
            window.clientesModule.clienteAEliminar = null;
            clienteAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModal() {
        if (typeof window.closeModal === 'function') {
            window.closeModal('clientes');
        } else {
            document.getElementById('cliente-modal').classList.remove('active');
        }
        window.clientesModule.clienteEditando = null;
        clienteEditando = null;
        
        // Resetear cualquier flag de formateo si se usa en el futuro
        // (clientes no usa formateo de inputs numéricos actualmente)
    }

    function cerrarModalEliminar() {
        if (typeof window.closeDeleteModal === 'function') {
            window.closeDeleteModal('clientes');
        } else {
            document.getElementById('delete-modal').classList.remove('active');
        }
        window.clientesModule.clienteAEliminar = null;
        clienteAEliminar = null;
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
