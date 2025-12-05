// Gestión de Empleados - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.empleadosModule) {
        window.empleadosModule = {
            empleados: [],
            empleadoEditando: null,
            empleadoAEliminar: null,
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var empleados = window.empleadosModule.empleados;
    var empleadoEditando = window.empleadosModule.empleadoEditando;
    var empleadoAEliminar = window.empleadosModule.empleadoAEliminar;
    var initialized = window.empleadosModule.initialized;
    
    // Variables de paginación
    let currentPageEmpleados = 1;
    const itemsPerPage = 15;
    let empleadosFiltrados = [];

    // Inicialización - función exportada para ser llamada desde main.js
    // Inicializa el módulo de empleados cuando se carga la página
    window.initEmpleados = function() {
        // Siempre reconfigurar los event listeners porque el DOM se recrea al navegar
        // Pequeño delay para asegurar que el DOM esté completamente cargado
        setTimeout(() => {
            try {
                setupEventListeners();
                cargarEmpleados();
                window.empleadosModule.initialized = true;
                console.log('✅ Módulo de empleados inicializado correctamente');
            } catch (error) {
                console.error('❌ Error al inicializar empleados:', error);
                const tbody = document.getElementById('empleados-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="7" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

    // Event Listeners
    function setupEventListeners() {
        try {
            // Botón nuevo empleado
            const btnNuevo = document.getElementById('btn-nuevo-empleado');
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
            
            const cancelEmpleado = document.getElementById('cancel-empleado');
            if (cancelEmpleado) cancelEmpleado.onclick = cerrarModal;
            
            const cancelDelete = document.getElementById('cancel-delete');
            if (cancelDelete) cancelDelete.onclick = cerrarModalEliminar;

            // Formulario empleado
            const empleadoForm = document.getElementById('empleado-form');
            if (empleadoForm) {
                empleadoForm.onsubmit = (e) => {
                    e.preventDefault();
                    guardarEmpleado(e);
                };
            }
            
            // Formatear input de fecha de nacimiento (DD/MM)
            setTimeout(() => {
                const fechaNacimiento = document.getElementById('empleado-fecha-nacimiento');
                if (fechaNacimiento) {
                    fechaNacimiento.oninput = function() {
                        let valor = this.value.replace(/[^\d/]/g, '');
                        // Limitar a 5 caracteres (DD/MM)
                        if (valor.length > 5) {
                            valor = valor.substring(0, 5);
                        }
                        // Agregar / automáticamente después de 2 dígitos
                        if (valor.length === 2 && !valor.includes('/')) {
                            valor = valor + '/';
                        }
                        this.value = valor;
                    };
                }
                
                // Formatear input de cédula (solo números)
                const cedula = document.getElementById('empleado-cedula');
                if (cedula && typeof formatearInputCantidad === 'function') {
                    formatearInputCantidad(cedula);
                }
            }, 200);

            // Búsqueda
            const searchEmpleado = document.getElementById('search-empleado');
            if (searchEmpleado) {
                searchEmpleado.oninput = filtrarEmpleados;
            }
            
            const filterTipoCedula = document.getElementById('filter-tipo-cedula');
            if (filterTipoCedula) {
                filterTipoCedula.onchange = filtrarEmpleados;
            }

            // Confirmar eliminación
            const confirmDelete = document.getElementById('confirm-delete');
            if (confirmDelete) {
                confirmDelete.onclick = eliminarEmpleadoConfirmado;
            }

            // Cerrar modal al hacer clic fuera - SOLO en el fondo, no en el contenido
            const empleadoModal = document.getElementById('empleado-modal');
            if (empleadoModal) {
                empleadoModal.onclick = (e) => {
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

    // Cargar empleados desde la base de datos
    async function cargarEmpleados() {
        try {
            // Obtiene todos los empleados de la base de datos
            const tbody = document.getElementById('empleados-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">Cargando empleados...</td></tr>';
            }
            
            // Verificar que electronAPI esté disponible
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            // Consultar todos los empleados ordenados por nombre y apellido
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Empleados ORDER BY nombre ASC, apellido ASC');
            
            console.log(`👥 Empleados cargados: ${resultados?.length || 0} registros`);
            
            window.empleadosModule.empleados = resultados || [];
            // Actualizar referencia local
            empleados.length = 0;
            if (window.empleadosModule.empleados.length > 0) {
                empleados.push(...window.empleadosModule.empleados);
            }
            mostrarEmpleados(empleados);
        } catch (error) {
            console.error('Error al cargar empleados:', error);
            const tbody = document.getElementById('empleados-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="error-message">Error al cargar los empleados: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar los empleados: ' + (error.message || error));
        }
    }

    // Mostrar empleados en la tabla
    function mostrarEmpleados(listaEmpleados) {
        const tbody = document.getElementById('empleados-table-body');
        
        if (!tbody) return;
        
        // Guardar lista filtrada para paginación
        empleadosFiltrados = listaEmpleados;
        
        if (listaEmpleados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay empleados registrados</td></tr>';
            window.renderPagination('pagination-empleados', 1, 1, 'window.cambiarPaginaEmpleados');
            return;
        }
        
        // Calcular paginación
        const totalPages = Math.ceil(listaEmpleados.length / itemsPerPage);
        const startIndex = (currentPageEmpleados - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const empleadosPagina = listaEmpleados.slice(startIndex, endIndex);

        tbody.innerHTML = empleadosPagina.map((empleado, index) => {
            const cedulaCompleta = `${empleado.tipo_cedula}-${empleado.cedula}`;
            const telefono = empleado.telefono || '-';
            const fechaNacimiento = empleado.fecha_de_nacimiento || '-';
            const globalIndex = startIndex + index + 1;
            
            return `
                <tr>
                    <td>#${globalIndex}</td>
                    <td>${empleado.nombre}</td>
                    <td>${empleado.apellido}</td>
                    <td>${cedulaCompleta}</td>
                    <td>${telefono}</td>
                    <td>${fechaNacimiento}</td>
                    <td class="actions">
                        <button class="btn-icon btn-edit" onclick="window.editarEmpleado(${empleado.id})" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="window.eliminarEmpleado(${empleado.id})" title="Eliminar">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Renderizar paginación
        window.renderPagination('pagination-empleados', currentPageEmpleados, totalPages, 'window.cambiarPaginaEmpleados');
    }
    
    // Función para cambiar página de empleados
    function cambiarPaginaEmpleados(page) {
        currentPageEmpleados = page;
        mostrarEmpleados(empleadosFiltrados);
    }
    
    // Exponer funciones para uso externo
    window.mostrarEmpleados = mostrarEmpleados;
    window.cambiarPaginaEmpleados = cambiarPaginaEmpleados;

    // Filtrar empleados
    function filtrarEmpleados() {
        const searchTerm = document.getElementById('search-empleado').value.toLowerCase();
        const filterTipoCedula = document.getElementById('filter-tipo-cedula').value;

        let empleadosFiltradosTemp = empleados;

        // Filtrar por tipo de cédula
        if (filterTipoCedula !== 'all') {
            empleadosFiltradosTemp = empleadosFiltradosTemp.filter(e => e.tipo_cedula === filterTipoCedula);
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            empleadosFiltradosTemp = empleadosFiltradosTemp.filter(empleado => {
                const nombre = empleado.nombre.toLowerCase();
                const apellido = empleado.apellido.toLowerCase();
                const cedula = empleado.cedula.toString();
                return nombre.includes(searchTerm) || apellido.includes(searchTerm) || cedula.includes(searchTerm);
            });
        }

        // Resetear página al filtrar
        currentPageEmpleados = 1;
        
        mostrarEmpleados(empleadosFiltradosTemp);
    }

    // Abrir modal para nuevo empleado
    function abrirModalNuevo() {
        empleadoEditando = null;
        document.getElementById('modal-title').textContent = 'Nuevo Empleado';
        document.getElementById('empleado-form').reset();
        document.getElementById('empleado-id').value = '';
        
        // Obtener referencias a los campos y asegurar que sean editables
        const nombreInput = document.getElementById('empleado-nombre');
        const apellidoInput = document.getElementById('empleado-apellido');
        const tipoCedulaInput = document.getElementById('empleado-tipo-cedula');
        const cedulaInput = document.getElementById('empleado-cedula');
        const telefonoInput = document.getElementById('empleado-telefono');
        const fechaNacimientoInput = document.getElementById('empleado-fecha-nacimiento');
        
        // Asegurar que todos los campos estén habilitados
        [nombreInput, apellidoInput, tipoCedulaInput, cedulaInput, telefonoInput, fechaNacimientoInput].forEach(input => {
            if (input) {
                input.disabled = false;
                input.removeAttribute('readonly');
                input.style.pointerEvents = 'auto';
                input.style.cursor = input.tagName === 'SELECT' ? 'pointer' : 'text';
            }
        });
        
        document.getElementById('empleado-modal').classList.add('active');
        
        // Focus en el primer campo
        setTimeout(() => {
            if (nombreInput) nombreInput.focus();
        }, 100);
    }

    // Editar empleado
    window.editarEmpleado = async function(id) {
        try {
            const empleado = await window.electronAPI.dbGet('SELECT * FROM Empleados WHERE id = ?', [id]);
            
            if (!empleado) {
                mostrarError('Empleado no encontrado');
                return;
            }

            empleadoEditando = empleado;
            document.getElementById('modal-title').textContent = 'Editar Empleado';
            document.getElementById('empleado-id').value = empleado.id;
            
            // Obtener referencias a los campos
            const nombreInput = document.getElementById('empleado-nombre');
            const apellidoInput = document.getElementById('empleado-apellido');
            const tipoCedulaInput = document.getElementById('empleado-tipo-cedula');
            const cedulaInput = document.getElementById('empleado-cedula');
            const telefonoInput = document.getElementById('empleado-telefono');
            const fechaNacimientoInput = document.getElementById('empleado-fecha-nacimiento');
            
            if (!nombreInput || !apellidoInput || !tipoCedulaInput || !cedulaInput || !fechaNacimientoInput) {
                mostrarError('Error: Campos del formulario no encontrados');
                return;
            }
            
            // Asegurar que los campos estén habilitados
            [nombreInput, apellidoInput, tipoCedulaInput, cedulaInput, telefonoInput, fechaNacimientoInput].forEach(input => {
                if (input) {
                    input.disabled = false;
                    input.removeAttribute('readonly');
                    input.style.pointerEvents = 'auto';
                    input.style.cursor = input.tagName === 'SELECT' ? 'pointer' : 'text';
                }
            });
            
            // Llenar los campos con los valores
            nombreInput.value = empleado.nombre;
            apellidoInput.value = empleado.apellido;
            tipoCedulaInput.value = empleado.tipo_cedula;
            cedulaInput.value = empleado.cedula;
            telefonoInput.value = empleado.telefono || '';
            fechaNacimientoInput.value = empleado.fecha_de_nacimiento || '';

            document.getElementById('empleado-modal').classList.add('active');
            
            // Pequeño delay para asegurar que el DOM esté actualizado
            setTimeout(() => {
                nombreInput.focus();
                nombreInput.select();
            }, 150);
        } catch (error) {
            console.error('Error al cargar empleado:', error);
            mostrarError('Error al cargar el empleado');
        }
    };

    // Guardar empleado
    async function guardarEmpleado(e) {
        e.preventDefault();

        const id = document.getElementById('empleado-id').value;
        const nombre = document.getElementById('empleado-nombre').value.trim();
        const apellido = document.getElementById('empleado-apellido').value.trim();
        const tipoCedula = document.getElementById('empleado-tipo-cedula').value;
        const cedula = parseInt(document.getElementById('empleado-cedula').value) || 0;
        const telefono = document.getElementById('empleado-telefono').value.trim() || null;
        const fechaNacimiento = document.getElementById('empleado-fecha-nacimiento').value.trim();

        if (!nombre || !apellido || !tipoCedula || !cedula || !fechaNacimiento) {
            mostrarError('Todos los campos marcados con * son requeridos');
            return;
        }

        // Validar formato de fecha de nacimiento (DD/MM)
        const fechaRegex = /^\d{2}\/\d{2}$/;
        if (!fechaRegex.test(fechaNacimiento)) {
            mostrarError('La fecha de nacimiento debe tener el formato DD/MM (ej: 05/09)');
            return;
        }

        // Validar día (01-31) y mes (01-12)
        const [dia, mes] = fechaNacimiento.split('/');
        const diaNum = parseInt(dia);
        const mesNum = parseInt(mes);
        if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12) {
            mostrarError('La fecha de nacimiento no es válida. El día debe estar entre 01-31 y el mes entre 01-12');
            return;
        }

        try {
            if (id) {
                // Verificar si la cédula ya existe en otro empleado
                const existente = await window.electronAPI.dbGet(
                    'SELECT * FROM Empleados WHERE tipo_cedula = ? AND cedula = ? AND id != ?',
                    [tipoCedula, cedula, id]
                );

                if (existente) {
                    mostrarError('Ya existe un empleado con esta cédula');
                    return;
                }

                // Actualizar
                await window.electronAPI.dbRun(
                    'UPDATE Empleados SET nombre = ?, apellido = ?, tipo_cedula = ?, cedula = ?, telefono = ?, fecha_de_nacimiento = ? WHERE id = ?',
                    [nombre, apellido, tipoCedula, cedula, telefono, fechaNacimiento, id]
                );
            } else {
                // Verificar si ya existe un empleado con la misma cédula
                const existente = await window.electronAPI.dbGet(
                    'SELECT * FROM Empleados WHERE tipo_cedula = ? AND cedula = ?',
                    [tipoCedula, cedula]
                );

                if (existente) {
                    mostrarError('Ya existe un empleado con esta cédula');
                    return;
                }

                // Crear nuevo
                await window.electronAPI.dbRun(
                    'INSERT INTO Empleados (nombre, apellido, tipo_cedula, cedula, telefono, fecha_de_nacimiento) VALUES (?, ?, ?, ?, ?, ?)',
                    [nombre, apellido, tipoCedula, cedula, telefono, fechaNacimiento]
                );
            }

            cerrarModal();
            cargarEmpleados();
            mostrarExito(id ? 'Empleado actualizado correctamente' : 'Empleado creado correctamente');
        } catch (error) {
            console.error('Error al guardar empleado:', error);
            mostrarError('Error al guardar el empleado: ' + (error.message || 'Error desconocido'));
        }
    }

    // Eliminar empleado
    window.eliminarEmpleado = function(id) {
        empleadoAEliminar = id;
        document.getElementById('delete-modal').classList.add('active');
    };

    // Confirmar eliminación
    async function eliminarEmpleadoConfirmado() {
        if (!empleadoAEliminar) return;

        try {
            await window.electronAPI.dbRun('DELETE FROM Empleados WHERE id = ?', [empleadoAEliminar]);
            cerrarModalEliminar();
            cargarEmpleados();
            mostrarExito('Empleado eliminado correctamente');
            empleadoAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar empleado:', error);
            mostrarError('Error al eliminar el empleado. Puede que tenga nóminas o servicios asociados.');
            empleadoAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModal() {
        document.getElementById('empleado-modal').classList.remove('active');
        empleadoEditando = null;
    }

    function cerrarModalEliminar() {
        document.getElementById('delete-modal').classList.remove('active');
        empleadoAEliminar = null;
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

