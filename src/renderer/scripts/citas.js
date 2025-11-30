// Gestión de Citas - Módulo encapsulado
(function() {
    'use strict';
    
    // Usar window para evitar conflictos al recargar el script
    if (!window.citasModule) {
        window.citasModule = {
            citas: [],
            citaEditando: null,
            citaAEliminar: null,
            clientes: [],
            initialized: false
        };
    }

    // Referencias a las variables del módulo
    var citas = window.citasModule.citas;
    var citaEditando = window.citasModule.citaEditando;
    var citaAEliminar = window.citasModule.citaAEliminar;
    var clientes = window.citasModule.clientes;
    var initialized = window.citasModule.initialized;

    // Inicialización - función exportada para ser llamada desde main.js
    window.initCitas = async function() {
        console.log('initCitas llamado');
        setTimeout(async () => {
            try {
                console.log('Configurando event listeners...');
                setupEventListeners();
                console.log('Cargando datos...');
                await cargarClientes();
                await cargarCitas();
                window.citasModule.initialized = true;
                console.log('Citas inicializadas correctamente');
            } catch (error) {
                console.error('Error al inicializar citas:', error);
                const tbody = document.getElementById('citas-table-body');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" class="error-message">Error al inicializar: ' + error.message + '</td></tr>';
                }
            }
        }, 150);
    };

    // Event Listeners
    function setupEventListeners() {
        try {
            // Botón nueva cita
            const btnNuevo = document.getElementById('btn-nueva-cita');
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
            
            const cancelCita = document.getElementById('cancel-cita');
            if (cancelCita) cancelCita.onclick = cerrarModal;
            
            const cancelDelete = document.getElementById('cancel-delete');
            if (cancelDelete) cancelDelete.onclick = cerrarModalEliminar;

            // Guardar cita
            const btnGuardarCita = document.getElementById('guardar-cita');
            if (btnGuardarCita) {
                btnGuardarCita.onclick = (e) => {
                    e.preventDefault();
                    guardarCita();
                };
            }

            // Búsqueda y filtros
            const searchCita = document.getElementById('search-cita');
            if (searchCita) {
                searchCita.oninput = filtrarCitas;
            }
            
            const filterEstado = document.getElementById('filter-estado');
            if (filterEstado) {
                filterEstado.onchange = filtrarCitas;
            }
            
            const filterFecha = document.getElementById('filter-fecha');
            if (filterFecha) {
                filterFecha.onchange = filtrarCitas;
            }

            // Confirmar eliminación
            const confirmDelete = document.getElementById('confirm-delete');
            if (confirmDelete) {
                confirmDelete.onclick = eliminarCitaConfirmado;
            }

            // Cerrar modal al hacer clic fuera
            const citaModal = document.getElementById('cita-modal');
            if (citaModal) {
                citaModal.onclick = (e) => {
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

    // Cargar clientes
    async function cargarClientes() {
        try {
            const resultados = await window.electronAPI.dbQuery('SELECT * FROM Clientes ORDER BY nombre ASC, apellido ASC');
            window.citasModule.clientes = resultados || [];
            clientes.length = 0;
            if (window.citasModule.clientes.length > 0) {
                clientes.push(...window.citasModule.clientes);
            }
            
            // Llenar select de clientes
            const clienteSelect = document.getElementById('cita-cliente');
            if (clienteSelect) {
                clienteSelect.innerHTML = '<option value="">Sin cliente (reserva general)</option>' +
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

    // Cargar citas desde la base de datos
    async function cargarCitas() {
        try {
            console.log('Iniciando carga de citas...');
            const tbody = document.getElementById('citas-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="loading">Cargando citas...</td></tr>';
            }
            
            if (!window.electronAPI || !window.electronAPI.dbQuery) {
                throw new Error('electronAPI no está disponible');
            }
            
            console.log('Consultando base de datos...');
            const resultados = await window.electronAPI.dbQuery(`
                SELECT 
                    c.*,
                    cl.nombre || ' ' || cl.apellido as nombre_cliente
                FROM Citas c
                LEFT JOIN Clientes cl ON c.id_cliente = cl.id
                ORDER BY c.fecha_hora ASC
            `);
            console.log('Citas obtenidas:', resultados);
            
            window.citasModule.citas = resultados || [];
            citas.length = 0;
            if (window.citasModule.citas.length > 0) {
                citas.push(...window.citasModule.citas);
            }
            mostrarCitas(citas);
        } catch (error) {
            console.error('Error al cargar citas:', error);
            const tbody = document.getElementById('citas-table-body');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="error-message">Error al cargar las citas: ' + (error.message || error) + '</td></tr>';
            }
            mostrarError('Error al cargar las citas: ' + (error.message || error));
        }
    }

    // Mostrar citas en la tabla
    function mostrarCitas(listaCitas) {
        const tbody = document.getElementById('citas-table-body');
        
        if (!tbody) return;
        
            if (listaCitas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay citas registradas</td></tr>';
                return;
            }

        tbody.innerHTML = listaCitas.map((cita, index) => {
            // Formatear fecha y hora
            let fechaHora = cita.fecha_hora;
            let fechaFormateada = '';
            let horaFormateada = '';
            
            if (fechaHora) {
                // Puede estar en formato ISO (YYYY-MM-DDTHH:MM:SS) o en otro formato
                if (fechaHora.includes('T')) {
                    const [datePart, timePart] = fechaHora.split('T');
                    const [year, month, day] = datePart.split('-');
                    const [hours, minutes] = timePart.split(':');
                    fechaFormateada = `${day}/${month}/${year}`;
                    horaFormateada = `${hours}:${minutes}`;
                } else if (fechaHora.includes(' ')) {
                    const [datePart, timePart] = fechaHora.split(' ');
                    const [year, month, day] = datePart.split('-');
                    const [hours, minutes] = timePart.split(':');
                    fechaFormateada = `${day}/${month}/${year}`;
                    horaFormateada = `${hours}:${minutes}`;
                } else {
                    fechaFormateada = fechaHora;
                }
            }
            
            // Clase CSS según el estado
            const estadoClass = {
                'pendiente': 'estado-pendiente',
                'confirmada': 'estado-pagado',
                'completada': 'estado-pagado',
                'cancelada': 'estado-pendiente',
                'no_show': 'estado-pendiente'
            }[cita.estado] || '';
            
            const estadoText = {
                'pendiente': 'Pendiente',
                'confirmada': 'Confirmada',
                'completada': 'Completada',
                'cancelada': 'Cancelada',
                'no_show': 'No se presentó'
            }[cita.estado] || cita.estado;
            
            return `
                <tr class="${estadoClass}">
                    <td>#${index + 1}</td>
                    <td>${cita.nombre_cliente || 'Sin cliente'}</td>
                    <td>${fechaFormateada} ${horaFormateada ? horaFormateada : ''}</td>
                    <td><span class="badge ${estadoClass}">${estadoText}</span></td>
                    <td>${cita.notas || '-'}</td>
                    <td class="actions">
                        <button class="btn-icon btn-edit" onclick="window.editarCita(${cita.id})" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="window.eliminarCita(${cita.id})" title="Eliminar">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Exponer función para uso externo
    window.mostrarCitas = mostrarCitas;

    // Filtrar citas
    function filtrarCitas() {
        const searchTerm = document.getElementById('search-cita').value.toLowerCase();
        const filterEstado = document.getElementById('filter-estado').value;
        const filterFecha = document.getElementById('filter-fecha').value;

        let citasFiltradas = citas;

        // Filtrar por estado
        if (filterEstado !== 'all') {
            citasFiltradas = citasFiltradas.filter(c => c.estado === filterEstado);
        }

        // Filtrar por fecha
        if (filterFecha) {
            citasFiltradas = citasFiltradas.filter(c => {
                if (!c.fecha_hora) return false;
                // Extraer solo la fecha de fecha_hora
                let fechaCita = '';
                if (c.fecha_hora.includes('T')) {
                    fechaCita = c.fecha_hora.split('T')[0];
                } else if (c.fecha_hora.includes(' ')) {
                    fechaCita = c.fecha_hora.split(' ')[0];
                }
                return fechaCita === filterFecha;
            });
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            citasFiltradas = citasFiltradas.filter(cita => {
                const notas = (cita.notas || '').toLowerCase();
                return notas.includes(searchTerm);
            });
        }

        mostrarCitas(citasFiltradas);
    }

    // Abrir modal para nueva cita
    async function abrirModalNuevo() {
        citaEditando = null;
        document.getElementById('modal-title').textContent = 'Nueva Cita';
        document.getElementById('cita-form').reset();
        document.getElementById('cita-id').value = '';
        
        // Cargar clientes si no están cargados
        if (clientes.length === 0) {
            await cargarClientes();
        }
        
        // Establecer fecha y hora por defecto (hoy y hora actual + 1 hora)
        const fechaInput = document.getElementById('cita-fecha');
        const horaInput = document.getElementById('cita-hora');
        
        if (fechaInput) {
            if (window.obtenerFechaLocalInput) {
                fechaInput.value = window.obtenerFechaLocalInput();
            } else {
                const hoy = new Date();
                fechaInput.value = hoy.toISOString().split('T')[0];
            }
        }
        
        if (horaInput) {
            const ahora = new Date();
            ahora.setHours(ahora.getHours() + 1);
            const horas = String(ahora.getHours()).padStart(2, '0');
            const minutos = String(ahora.getMinutes()).padStart(2, '0');
            horaInput.value = `${horas}:${minutos}`;
        }
        
        // Asegurar que los campos estén habilitados
        const clienteSelect = document.getElementById('cita-cliente');
        const fechaInputEl = document.getElementById('cita-fecha');
        const horaInputEl = document.getElementById('cita-hora');
        const estadoSelect = document.getElementById('cita-estado');
        const notasTextarea = document.getElementById('cita-notas');
        
        if (clienteSelect) {
            clienteSelect.disabled = false;
            clienteSelect.style.pointerEvents = 'auto';
            clienteSelect.style.cursor = 'pointer';
        }
        if (fechaInputEl) {
            fechaInputEl.disabled = false;
            fechaInputEl.style.pointerEvents = 'auto';
            fechaInputEl.style.cursor = 'pointer';
        }
        if (horaInputEl) {
            horaInputEl.disabled = false;
            horaInputEl.style.pointerEvents = 'auto';
            horaInputEl.style.cursor = 'pointer';
        }
        if (estadoSelect) {
            estadoSelect.disabled = false;
            estadoSelect.style.pointerEvents = 'auto';
            estadoSelect.style.cursor = 'pointer';
        }
        if (notasTextarea) {
            notasTextarea.disabled = false;
            notasTextarea.style.pointerEvents = 'auto';
            notasTextarea.style.cursor = 'text';
        }
        
        document.getElementById('cita-modal').classList.add('active');
        
        setTimeout(() => {
            if (clienteSelect) clienteSelect.focus();
        }, 100);
    }

    // Guardar cita
    async function guardarCita() {
        const clienteSelect = document.getElementById('cita-cliente').value;
        const fechaInput = document.getElementById('cita-fecha').value;
        const horaInput = document.getElementById('cita-hora').value;
        const estadoSelect = document.getElementById('cita-estado').value;
        const notasTextarea = document.getElementById('cita-notas').value;
        const idCita = parseInt(document.getElementById('cita-id').value);
        const esEdicion = idCita > 0;
        
        if (!fechaInput || !horaInput || !estadoSelect) {
            mostrarError('La fecha, hora y estado son requeridos');
            return;
        }

        // Combinar fecha y hora en formato ISO
        const fechaHora = `${fechaInput}T${horaInput}:00`;
        const idCliente = clienteSelect ? parseInt(clienteSelect) : null;

        try {
            if (esEdicion) {
                // Actualizar cita existente
                await window.electronAPI.dbRun(
                    'UPDATE Citas SET id_cliente = ?, fecha_hora = ?, estado = ?, notas = ? WHERE id = ?',
                    [idCliente, fechaHora, estadoSelect, notasTextarea || null, idCita]
                );
                mostrarExito('Cita actualizada correctamente');
            } else {
                // Crear nueva cita
                await window.electronAPI.dbRun(
                    'INSERT INTO Citas (id_cliente, fecha_hora, estado, notas) VALUES (?, ?, ?, ?)',
                    [idCliente, fechaHora, estadoSelect, notasTextarea || null]
                );
                mostrarExito('Cita creada correctamente');
            }

            cerrarModal();
            await cargarCitas();
        } catch (error) {
            console.error('Error al guardar cita:', error);
            mostrarError('Error al guardar la cita: ' + (error.message || 'Error desconocido'));
        }
    }

    // Editar cita
    window.editarCita = async function(id) {
        try {
            const cita = await window.electronAPI.dbGet(`
                SELECT 
                    c.*,
                    cl.nombre || ' ' || cl.apellido as nombre_cliente
                FROM Citas c
                LEFT JOIN Clientes cl ON c.id_cliente = cl.id
                WHERE c.id = ?
            `, [id]);
            
            if (!cita) {
                mostrarError('Cita no encontrada');
                return;
            }

            citaEditando = cita;
            document.getElementById('modal-title').textContent = 'Editar Cita';
            document.getElementById('cita-id').value = cita.id;
            
            // Cargar clientes si no están cargados
            if (clientes.length === 0) {
                await cargarClientes();
            }
            
            document.getElementById('cita-cliente').value = cita.id_cliente || '';
            
            // Extraer fecha y hora de fecha_hora
            let fecha = '';
            let hora = '';
            
            if (cita.fecha_hora) {
                if (cita.fecha_hora.includes('T')) {
                    const [datePart, timePart] = cita.fecha_hora.split('T');
                    fecha = datePart;
                    const [hours, minutes] = timePart.split(':');
                    hora = `${hours}:${minutes}`;
                } else if (cita.fecha_hora.includes(' ')) {
                    const [datePart, timePart] = cita.fecha_hora.split(' ');
                    fecha = datePart;
                    const [hours, minutes] = timePart.split(':');
                    hora = `${hours}:${minutes}`;
                }
            }
            
            document.getElementById('cita-fecha').value = fecha;
            document.getElementById('cita-hora').value = hora;
            document.getElementById('cita-estado').value = cita.estado;
            document.getElementById('cita-notas').value = cita.notas || '';
            
            // Asegurar que los campos estén habilitados
            const clienteSelectEl = document.getElementById('cita-cliente');
            const fechaInputEl = document.getElementById('cita-fecha');
            const horaInputEl = document.getElementById('cita-hora');
            const estadoSelect = document.getElementById('cita-estado');
            const notasTextarea = document.getElementById('cita-notas');
            
            if (clienteSelectEl) {
                clienteSelectEl.disabled = false;
                clienteSelectEl.style.pointerEvents = 'auto';
                clienteSelectEl.style.cursor = 'pointer';
            }
            
            if (fechaInputEl) {
                fechaInputEl.disabled = false;
                fechaInputEl.style.pointerEvents = 'auto';
                fechaInputEl.style.cursor = 'pointer';
            }
            if (horaInputEl) {
                horaInputEl.disabled = false;
                horaInputEl.style.pointerEvents = 'auto';
                horaInputEl.style.cursor = 'pointer';
            }
            if (estadoSelect) {
                estadoSelect.disabled = false;
                estadoSelect.style.pointerEvents = 'auto';
                estadoSelect.style.cursor = 'pointer';
            }
            if (notasTextarea) {
                notasTextarea.disabled = false;
                notasTextarea.style.pointerEvents = 'auto';
                notasTextarea.style.cursor = 'text';
            }
            
            document.getElementById('cita-modal').classList.add('active');
        } catch (error) {
            console.error('Error al cargar cita:', error);
            mostrarError('Error al cargar la cita: ' + (error.message || 'Error desconocido'));
        }
    };

    // Eliminar cita
    window.eliminarCita = function(id) {
        citaAEliminar = id;
        document.getElementById('delete-modal').classList.add('active');
    };

    // Confirmar eliminación
    async function eliminarCitaConfirmado() {
        if (!citaAEliminar) return;

        try {
            await window.electronAPI.dbRun('DELETE FROM Citas WHERE id = ?', [citaAEliminar]);
            cerrarModalEliminar();
            await cargarCitas();
            mostrarExito('Cita eliminada correctamente');
            citaAEliminar = null;
        } catch (error) {
            console.error('Error al eliminar cita:', error);
            mostrarError('Error al eliminar la cita');
            citaAEliminar = null;
        }
    }

    // Cerrar modales
    function cerrarModal() {
        document.getElementById('cita-modal').classList.remove('active');
        citaEditando = null;
    }

    function cerrarModalEliminar() {
        document.getElementById('delete-modal').classList.remove('active');
        citaAEliminar = null;
    }

    // Mostrar mensajes
    function mostrarError(mensaje) {
        alert('Error: ' + mensaje);
    }

    function mostrarExito(mensaje) {
        alert('Éxito: ' + mensaje);
    }
})();

