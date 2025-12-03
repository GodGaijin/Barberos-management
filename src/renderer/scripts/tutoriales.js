// Sistema de Tutoriales Interactivos
(function() {
    'use strict';
    
    let currentTutorial = null;
    let currentStep = 0;
    let tutorialOverlay = null;
    let highlightElement = null;
    let isTutorialActive = false;
    
    // Definición de tutoriales por módulo
    const tutoriales = {
        'dashboard': {
            id: 'dashboard',
            nombre: 'Dashboard - Panel Principal',
            descripcion: 'Aprende a usar el panel principal del sistema',
            etapas: [
                {
                    titulo: 'Bienvenido al Dashboard',
                    descripcion: 'Este es el panel principal donde verás un resumen de toda la información importante de tu barbería.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Estadísticas del Día',
                    descripcion: 'Aquí puedes ver los ingresos del día, transacciones pendientes, citas programadas y empleados activos.',
                    elemento: '#ingresos-hoy',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Transacciones Pendientes',
                    descripcion: 'Esta sección muestra las transacciones que están abiertas y esperando ser cerradas.',
                    elemento: '#transacciones-list',
                    posicion: 'right'
                },
                {
                    titulo: 'Citas Próximas',
                    descripcion: 'Aquí verás las citas programadas para hoy y los próximos días.',
                    elemento: '#citas-list',
                    posicion: 'right'
                },
                {
                    titulo: 'Nóminas Pendientes',
                    descripcion: 'Muestra las nóminas que están pendientes de pago a los empleados.',
                    elemento: '#nominas-list',
                    posicion: 'right'
                },
                {
                    titulo: 'Advertencias',
                    descripcion: 'El sistema te alertará sobre productos con stock bajo, falta de configuración de tasas, etc.',
                    elemento: '#dashboard-warnings',
                    posicion: 'top'
                }
            ]
        },
        'clientes': {
            id: 'clientes',
            nombre: 'Gestión de Clientes',
            descripcion: 'Aprende a gestionar tu base de datos de clientes',
            etapas: [
                {
                    titulo: 'Gestión de Clientes',
                    descripcion: 'En esta sección puedes agregar, editar y buscar clientes de tu barbería.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Buscar Clientes',
                    descripcion: 'Usa la barra de búsqueda para encontrar clientes rápidamente por nombre o cédula.',
                    elemento: '#search-cliente',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Nuevo Cliente',
                    descripcion: 'Haz clic en este botón para agregar un nuevo cliente a tu base de datos.',
                    elemento: '#btn-nuevo-cliente',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Lista de Clientes',
                    descripcion: 'Aquí verás todos tus clientes. Puedes editar o eliminar haciendo clic en los iconos de cada fila.',
                    elemento: '#clientes-table-body',
                    posicion: 'top'
                }
            ]
        },
        'productos': {
            id: 'productos',
            nombre: 'Gestión de Productos',
            descripcion: 'Aprende a gestionar el inventario de productos',
            etapas: [
                {
                    titulo: 'Gestión de Productos',
                    descripcion: 'Aquí puedes administrar el inventario de productos de tu barbería.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Buscar Productos',
                    descripcion: 'Busca productos por nombre para encontrarlos rápidamente.',
                    elemento: '#search-producto',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Agregar Producto',
                    descripcion: 'Haz clic aquí para agregar un nuevo producto al inventario.',
                    elemento: '#btn-nuevo-producto',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Stock y Precios',
                    descripcion: 'La tabla muestra el stock actual, precios en bolívares y dólares de cada producto.',
                    elemento: '#productos-table-body',
                    posicion: 'top'
                }
            ]
        },
        'servicios': {
            id: 'servicios',
            nombre: 'Gestión de Servicios',
            descripcion: 'Aprende a gestionar los servicios que ofreces',
            etapas: [
                {
                    titulo: 'Gestión de Servicios',
                    descripcion: 'Aquí puedes crear y administrar los servicios que ofrece tu barbería.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Buscar Servicios',
                    descripcion: 'Busca servicios por nombre o descripción.',
                    elemento: '#search-servicio',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Nuevo Servicio',
                    descripcion: 'Agrega nuevos servicios con sus precios en bolívares y dólares.',
                    elemento: '#btn-nuevo-servicio',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Lista de Servicios',
                    descripcion: 'Ve todos tus servicios con sus precios y descripciones.',
                    elemento: '#servicios-table-body',
                    posicion: 'top'
                }
            ]
        },
        'empleados': {
            id: 'empleados',
            nombre: 'Gestión de Empleados',
            descripcion: 'Aprende a gestionar tu equipo de trabajo',
            etapas: [
                {
                    titulo: 'Gestión de Empleados',
                    descripcion: 'Administra la información de tus empleados aquí.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Buscar Empleados',
                    descripcion: 'Encuentra empleados rápidamente por nombre o cédula.',
                    elemento: '#search-empleado',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Nuevo Empleado',
                    descripcion: 'Agrega nuevos empleados a tu sistema.',
                    elemento: '#btn-nuevo-empleado',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Información de Empleados',
                    descripcion: 'Aquí verás todos los datos de tus empleados.',
                    elemento: '#empleados-table-body',
                    posicion: 'top'
                }
            ]
        },
        'transacciones': {
            id: 'transacciones',
            nombre: 'Transacciones',
            descripcion: 'Aprende a crear y gestionar transacciones',
            etapas: [
                {
                    titulo: 'Sistema de Transacciones',
                    descripcion: 'Las transacciones son la forma de registrar ventas de servicios y productos.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Nueva Transacción',
                    descripcion: 'Haz clic aquí para crear una nueva transacción.',
                    elemento: '#btn-nueva-transaccion',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Buscar Cliente',
                    descripcion: 'Al crear una transacción, puedes buscar y seleccionar un cliente, o crear uno nuevo.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Agregar Servicios',
                    descripcion: 'En el modal de transacción, puedes agregar servicios, productos y propinas.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Cerrar Transacción',
                    descripcion: 'Una vez agregados los servicios/productos, cierra la transacción y selecciona el método de pago.',
                    elemento: null,
                    posicion: 'center'
                }
            ]
        },
        'nominas': {
            id: 'nominas',
            nombre: 'Nóminas',
            descripcion: 'Aprende a calcular y pagar nóminas a empleados',
            etapas: [
                {
                    titulo: 'Sistema de Nóminas',
                    descripcion: 'Aquí puedes calcular y gestionar los pagos a tus empleados.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Calcular Nómina',
                    descripcion: 'Haz clic aquí para calcular la nómina de un empleado basada en sus servicios realizados.',
                    elemento: '#btn-calcular-nomina',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Moneda de Pago',
                    descripcion: 'Puedes pagar las nóminas en bolívares o dólares según corresponda.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Marcar como Pagado',
                    descripcion: 'Una vez pagada la nómina, márcala como pagada para mantener el registro actualizado.',
                    elemento: null,
                    posicion: 'center'
                }
            ]
        },
        'tasas': {
            id: 'tasas',
            nombre: 'Tasas de Cambio',
            descripcion: 'Aprende a configurar las tasas de cambio diarias',
            etapas: [
                {
                    titulo: 'Tasas de Cambio',
                    descripcion: 'Configura la tasa de cambio del día para calcular precios en dólares.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Establecer Tasa',
                    descripcion: 'Haz clic aquí para establecer la tasa de cambio del día.',
                    elemento: '#btn-nueva-tasa',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Historial de Tasas',
                    descripcion: 'Aquí verás el historial de todas las tasas configuradas.',
                    elemento: '#tasas-table-body',
                    posicion: 'top'
                }
            ]
        },
        'reportes': {
            id: 'reportes',
            nombre: 'Reportes',
            descripcion: 'Aprende a generar y ver reportes diarios',
            etapas: [
                {
                    titulo: 'Sistema de Reportes',
                    descripcion: 'Genera reportes detallados de las actividades del día.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Generar Reporte',
                    descripcion: 'Haz clic aquí para generar un reporte del día seleccionado.',
                    elemento: '#btn-generar-reporte',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Ver Reportes',
                    descripcion: 'Aquí verás todos los reportes generados. Puedes ver los detalles de cada uno.',
                    elemento: '#reportes-list',
                    posicion: 'top'
                }
            ]
        },
        'citas': {
            id: 'citas',
            nombre: 'Citas y Reservas',
            descripcion: 'Aprende a gestionar citas y reservas',
            etapas: [
                {
                    titulo: 'Sistema de Citas',
                    descripcion: 'Gestiona las citas y reservas de tus clientes.',
                    elemento: null,
                    posicion: 'center'
                },
                {
                    titulo: 'Nueva Cita',
                    descripcion: 'Haz clic aquí para crear una nueva cita o reserva.',
                    elemento: '#btn-nueva-cita',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Filtrar Citas',
                    descripcion: 'Filtra las citas por estado o fecha para encontrarlas fácilmente.',
                    elemento: '#filter-estado',
                    posicion: 'bottom'
                },
                {
                    titulo: 'Lista de Citas',
                    descripcion: 'Aquí verás todas las citas con su estado (pendiente, confirmada, completada, etc.).',
                    elemento: '#citas-table-body',
                    posicion: 'top'
                }
            ]
        }
    };
    
    // Inicializar sistema de tutoriales
    window.initTutoriales = async function() {
        console.log('Inicializando sistema de tutoriales...');
        crearOverlayTutorial();
        
        // Interceptar navegación para verificar tutoriales
        if (window.navigateToPage) {
            const originalNavigate = window.navigateToPage;
            window.navigateToPage = async function(page) {
                await originalNavigate(page);
                // Esperar a que la página se cargue completamente
                setTimeout(() => {
                    verificarTutorialPendiente(page);
                }, 800);
            };
        }
        
        // También verificar tutorial al iniciar si hay una página cargada
        setTimeout(() => {
            const pageContent = document.getElementById('page-content');
            if (pageContent) {
                // Intentar detectar la página actual desde la URL o el contenido
                const activeNav = document.querySelector('.nav-menu a.active');
                if (activeNav) {
                    const pageId = activeNav.getAttribute('data-page');
                    if (pageId) {
                        verificarTutorialPendiente(pageId);
                    }
                }
            }
        }, 1000);
    };
    
    // Crear overlay para tutoriales
    function crearOverlayTutorial() {
        if (document.getElementById('tutorial-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
        overlay.innerHTML = `
            <div class="tutorial-highlight"></div>
            <div class="tutorial-tooltip">
                <div class="tutorial-header">
                    <h3 class="tutorial-title"></h3>
                    <button class="tutorial-close" onclick="window.cerrarTutorial()">×</button>
                </div>
                <p class="tutorial-description"></p>
                <div class="tutorial-progress">
                    <span class="tutorial-step-info"></span>
                </div>
                <div class="tutorial-actions">
                    <button class="btn btn-secondary tutorial-prev" onclick="window.tutorialAnterior()" style="display: none;">Anterior</button>
                    <button class="btn btn-primary tutorial-next" onclick="window.tutorialSiguiente()">Siguiente</button>
                    <button class="btn btn-secondary tutorial-skip" onclick="window.saltarTutorial()">Saltar Tutorial</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        tutorialOverlay = overlay;
    }
    
    // Verificar si hay tutorial pendiente para una página
    async function verificarTutorialPendiente(pageId) {
        if (!tutoriales[pageId]) return;
        
        // Verificar si los tutoriales están activados en la configuración
        try {
            const configTutoriales = await window.electronAPI.dbGet(
                'SELECT valor FROM Configuracion WHERE clave = ?',
                ['tutoriales_activos']
            );
            
            // Si la configuración existe y está en 'false', no mostrar tutoriales
            if (configTutoriales && configTutoriales.valor === 'false') {
                return; // Tutoriales desactivados, no mostrar
            }
        } catch (error) {
            // Si hay error al leer la configuración, continuar (por defecto activados)
            console.warn('No se pudo verificar configuración de tutoriales:', error);
        }
        
        try {
            const result = await window.electronAPI.tutorialGetProgress(tutoriales[pageId].id);
            if (result.success && result.progress) {
                // Si está completado (ya sea visto completamente o saltado), no mostrar de nuevo
                if (result.progress.completado) {
                    return; // No mostrar tutorial si ya fue completado o saltado
                }
                
                // Si hay progreso guardado pero no está completado, continuar desde ahí
                if (result.progress.etapa_actual > 0) {
                    iniciarTutorial(pageId, result.progress.etapa_actual);
                } else {
                    // Preguntar si quiere ver el tutorial
                    mostrarOpcionTutorial(pageId);
                }
            } else {
                // No hay progreso, preguntar si quiere ver el tutorial
                mostrarOpcionTutorial(pageId);
            }
        } catch (error) {
            console.error('Error al verificar tutorial:', error);
        }
    }
    
    // Mostrar opción de ver tutorial
    function mostrarOpcionTutorial(pageId) {
        const tutorial = tutoriales[pageId];
        if (!tutorial) return;
        
        // Esperar un momento para que la página se cargue completamente
        setTimeout(() => {
            if (typeof window.mostrarConfirmacion === 'function') {
                window.mostrarConfirmacion(
                    `¿Te gustaría ver un tutorial sobre "${tutorial.nombre}"?`,
                    'Tutorial Disponible'
                ).then(confirmado => {
                    if (confirmado) {
                        iniciarTutorial(pageId, 0);
                    } else {
                        // Marcar como saltado (completado = true pero etapa = 0 indica que fue rechazado/saltado)
                        guardarProgresoTutorial(pageId, 0, true);
                    }
                });
            } else {
                // Fallback
                if (confirm(`¿Te gustaría ver un tutorial sobre "${tutorial.nombre}"?`)) {
                    iniciarTutorial(pageId, 0);
                } else {
                    // Marcar como saltado si el usuario rechaza
                    guardarProgresoTutorial(pageId, 0, true);
                }
            }
        }, 1000);
    }
    
    // Iniciar tutorial
    async function iniciarTutorial(pageId, etapaInicial = 0) {
        const tutorial = tutoriales[pageId];
        if (!tutorial) return;
        
        currentTutorial = tutorial;
        currentStep = etapaInicial;
        isTutorialActive = true;
        
        mostrarEtapaTutorial();
    }
    
    // Mostrar etapa actual del tutorial
    function mostrarEtapaTutorial() {
        if (!currentTutorial || !tutorialOverlay) return;
        
        const etapa = currentTutorial.etapas[currentStep];
        if (!etapa) {
            completarTutorial();
            return;
        }
        
        // Actualizar contenido
        const title = tutorialOverlay.querySelector('.tutorial-title');
        const description = tutorialOverlay.querySelector('.tutorial-description');
        const stepInfo = tutorialOverlay.querySelector('.tutorial-step-info');
        const prevBtn = tutorialOverlay.querySelector('.tutorial-prev');
        const nextBtn = tutorialOverlay.querySelector('.tutorial-next');
        
        if (title) title.textContent = etapa.titulo;
        if (description) description.textContent = etapa.descripcion;
        if (stepInfo) {
            stepInfo.textContent = `Paso ${currentStep + 1} de ${currentTutorial.etapas.length}`;
        }
        
        // Mostrar/ocultar botones
        if (prevBtn) {
            prevBtn.style.display = currentStep > 0 ? 'inline-block' : 'none';
        }
        if (nextBtn) {
            nextBtn.textContent = currentStep === currentTutorial.etapas.length - 1 ? 'Finalizar' : 'Siguiente';
        }
        
        // Resaltar elemento si existe
        if (etapa.elemento) {
            const elemento = document.querySelector(etapa.elemento);
            if (elemento) {
                resaltarElemento(elemento, etapa.posicion);
            } else {
                // Si el elemento no existe, mostrar en el centro
                resaltarElemento(null, 'center');
            }
        } else {
            resaltarElemento(null, etapa.posicion || 'center');
        }
        
        // Mostrar overlay
        tutorialOverlay.classList.add('active');
        
        // Guardar progreso
        guardarProgresoTutorial(currentTutorial.id, currentStep, false);
    }
    
    // Resaltar elemento
    function resaltarElemento(elemento, posicion) {
        const highlight = tutorialOverlay.querySelector('.tutorial-highlight');
        const tooltip = tutorialOverlay.querySelector('.tutorial-tooltip');
        
        if (!highlight || !tooltip) return;
        
        if (elemento) {
            const rect = elemento.getBoundingClientRect();
            highlight.style.display = 'block';
            highlight.style.left = `${rect.left}px`;
            highlight.style.top = `${rect.top}px`;
            highlight.style.width = `${rect.width}px`;
            highlight.style.height = `${rect.height}px`;
            
            // Posicionar tooltip según la posición especificada
            posicionarTooltip(tooltip, rect, posicion);
        } else {
            highlight.style.display = 'none';
            // Centrar tooltip
            tooltip.style.position = 'fixed';
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
        }
    }
    
    // Posicionar tooltip con detección de bordes
    function posicionarTooltip(tooltip, rect, posicion) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const padding = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Primero posicionar según la preferencia
        let left, top, transform;
        
        switch (posicion) {
            case 'top':
                left = rect.left + rect.width / 2;
                top = rect.top - tooltipRect.height - padding;
                transform = 'translateX(-50%)';
                break;
            case 'bottom':
                left = rect.left + rect.width / 2;
                top = rect.bottom + padding;
                transform = 'translateX(-50%)';
                break;
            case 'left':
                left = rect.left - tooltipRect.width - padding;
                top = rect.top + rect.height / 2;
                transform = 'translateY(-50%)';
                break;
            case 'right':
                left = rect.right + padding;
                top = rect.top + rect.height / 2;
                transform = 'translateY(-50%)';
                break;
            default: // center
                tooltip.style.position = 'fixed';
                tooltip.style.left = '50%';
                tooltip.style.top = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
                return;
        }
        
        // Ajustar para que no se salga de la pantalla
        // Calcular dimensiones reales del tooltip
        tooltip.style.position = 'fixed';
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.transform = transform;
        
        // Forzar reflow para obtener dimensiones reales
        void tooltip.offsetWidth;
        
        const actualRect = tooltip.getBoundingClientRect();
        let adjustedLeft = left;
        let adjustedTop = top;
        let adjustedTransform = transform;
        
        // Verificar borde izquierdo
        if (actualRect.left < padding) {
            adjustedLeft = padding;
            if (posicion === 'top' || posicion === 'bottom') {
                adjustedTransform = 'translateX(0)';
            }
        }
        
        // Verificar borde derecho
        if (actualRect.right > viewportWidth - padding) {
            adjustedLeft = viewportWidth - actualRect.width - padding;
            if (posicion === 'top' || posicion === 'bottom') {
                adjustedTransform = 'translateX(0)';
            }
        }
        
        // Verificar borde superior
        if (actualRect.top < padding) {
            // Si está arriba y no cabe, mover abajo
            if (posicion === 'top') {
                adjustedTop = rect.bottom + padding;
                adjustedTransform = 'translateX(-50%)';
            } else {
                adjustedTop = padding;
            }
        }
        
        // Verificar borde inferior
        if (actualRect.bottom > viewportHeight - padding) {
            // Si está abajo y no cabe, mover arriba
            if (posicion === 'bottom') {
                // Intentar poner arriba del elemento
                const espacioArriba = rect.top - padding;
                if (espacioArriba >= actualRect.height) {
                    // Hay espacio arriba, mover allí
                    adjustedTop = rect.top - actualRect.height - padding;
                    adjustedTransform = 'translateX(-50%)';
                } else {
                    // No hay espacio arriba, poner en el centro vertical disponible
                    adjustedTop = Math.max(padding, (viewportHeight - actualRect.height) / 2);
                    if (adjustedTransform.includes('translateX')) {
                        adjustedTransform = 'translate(-50%, 0)';
                    }
                }
            } else {
                // Para otras posiciones, ajustar al borde inferior
                adjustedTop = viewportHeight - actualRect.height - padding;
            }
        }
        
        // Si el tooltip es muy grande, centrarlo
        if (actualRect.width > viewportWidth - 2 * padding) {
            adjustedLeft = viewportWidth / 2;
            adjustedTransform = 'translateX(-50%)';
        }
        
        // Si el tooltip es más alto que el viewport disponible, centrarlo verticalmente
        if (actualRect.height > viewportHeight - 2 * padding) {
            adjustedTop = Math.max(padding, (viewportHeight - actualRect.height) / 2);
            // Ajustar transform según el contexto
            if (adjustedTransform.includes('translateX')) {
                adjustedTransform = 'translate(-50%, 0)';
            } else if (adjustedTransform.includes('translateY')) {
                adjustedTransform = 'translate(0, -50%)';
            } else {
                adjustedTransform = 'translate(-50%, 0)';
            }
        }
        
        // Verificación final: asegurar que no se salga por ningún lado
        // Recalcular después de todos los ajustes
        tooltip.style.left = `${adjustedLeft}px`;
        tooltip.style.top = `${adjustedTop}px`;
        tooltip.style.transform = adjustedTransform;
        
        // Forzar otro reflow
        void tooltip.offsetWidth;
        
        const finalRect = tooltip.getBoundingClientRect();
        
        // Ajuste final de seguridad
        if (finalRect.bottom > viewportHeight - padding) {
            adjustedTop = viewportHeight - finalRect.height - padding;
            tooltip.style.top = `${adjustedTop}px`;
        }
        
        if (finalRect.right > viewportWidth - padding) {
            adjustedLeft = viewportWidth - finalRect.width - padding;
            tooltip.style.left = `${adjustedLeft}px`;
        }
        
        if (finalRect.left < padding) {
            adjustedLeft = padding;
            tooltip.style.left = `${adjustedLeft}px`;
        }
        
        if (finalRect.top < padding) {
            adjustedTop = padding;
            tooltip.style.top = `${adjustedTop}px`;
        }
        
        // Aplicar posición ajustada
        tooltip.style.left = `${adjustedLeft}px`;
        tooltip.style.top = `${adjustedTop}px`;
        tooltip.style.transform = adjustedTransform;
    }
    
    // Siguiente etapa
    window.tutorialSiguiente = function() {
        if (!currentTutorial) return;
        
        currentStep++;
        if (currentStep >= currentTutorial.etapas.length) {
            completarTutorial();
        } else {
            mostrarEtapaTutorial();
        }
    };
    
    // Etapa anterior
    window.tutorialAnterior = function() {
        if (!currentTutorial || currentStep <= 0) return;
        
        currentStep--;
        mostrarEtapaTutorial();
    };
    
    // Saltar tutorial
    window.saltarTutorial = function() {
        if (!currentTutorial) return;
        
        // Marcar como completado (saltado) - usar etapa final para indicar que fue saltado intencionalmente
        // Esto evita que se muestre de nuevo
        guardarProgresoTutorial(currentTutorial.id, currentTutorial.etapas.length - 1, true);
        cerrarTutorial();
    };
    
    // Cerrar tutorial
    window.cerrarTutorial = function() {
        if (tutorialOverlay) {
            tutorialOverlay.classList.remove('active');
        }
        isTutorialActive = false;
        currentTutorial = null;
        currentStep = 0;
    };
    
    // Completar tutorial
    async function completarTutorial() {
        if (!currentTutorial) return;
        
        await guardarProgresoTutorial(currentTutorial.id, currentTutorial.etapas.length - 1, true);
        
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion(`¡Tutorial "${currentTutorial.nombre}" completado!`, 'success', 3000);
        }
        
        cerrarTutorial();
    }
    
    // Guardar progreso del tutorial
    async function guardarProgresoTutorial(tutorialId, etapa, completado) {
        try {
            await window.electronAPI.tutorialSaveProgress(tutorialId, etapa, completado);
        } catch (error) {
            console.error('Error al guardar progreso del tutorial:', error);
        }
    }
    
    // Función global para iniciar tutorial manualmente
    window.iniciarTutorial = function(pageId) {
        if (tutoriales[pageId]) {
            iniciarTutorial(pageId, 0);
        } else {
            console.warn(`Tutorial no encontrado para: ${pageId}`);
        }
    };
    
    // Función para reiniciar tutorial
    window.reiniciarTutorial = async function(pageId) {
        if (!tutoriales[pageId]) return;
        
        try {
            // Eliminar progreso guardado
            await window.electronAPI.tutorialSaveProgress(tutoriales[pageId].id, 0, false);
            iniciarTutorial(pageId, 0);
        } catch (error) {
            console.error('Error al reiniciar tutorial:', error);
        }
    };
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.initTutoriales();
        });
    } else {
        window.initTutoriales();
    }
    
})();

