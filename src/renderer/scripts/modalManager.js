// Sistema unificado de gestión de modales
(function() {
    'use strict';
    
    // Registro de handlers por módulo
    const modalHandlers = {
        clientes: {
            modalId: 'cliente-modal',
            deleteModalId: 'delete-modal',
            formId: 'cliente-form',
            closeBtnId: 'close-modal',
            closeDeleteBtnId: 'close-delete-modal',
            cancelBtnId: 'cancel-cliente',
            cancelDeleteBtnId: 'cancel-delete',
            onSave: null, // Se establecerá desde el módulo
            onClose: null,
            onDelete: null
        },
        productos: {
            modalId: 'producto-modal',
            deleteModalId: 'delete-modal',
            formId: 'producto-form',
            closeBtnId: 'close-modal',
            closeDeleteBtnId: 'close-delete-modal',
            cancelBtnId: 'cancel-producto',
            cancelDeleteBtnId: 'cancel-delete',
            onSave: null,
            onClose: null,
            onDelete: null
        },
        tasas: {
            modalId: 'tasa-modal',
            deleteModalId: 'delete-modal',
            formId: 'tasa-form',
            closeBtnId: 'close-modal',
            closeDeleteBtnId: 'close-delete-modal',
            cancelBtnId: 'cancel-tasa',
            cancelDeleteBtnId: 'cancel-delete',
            onSave: null,
            onClose: null,
            onDelete: null
        }
    };
    
    // Módulo activo actual
    let activeModule = null;
    
    // Inicializar sistema de modales para un módulo
    window.initModalManager = function(moduleName, handlers) {
        if (!modalHandlers[moduleName]) {
            console.error(`Módulo ${moduleName} no está registrado en modalManager`);
            return;
        }
        
        activeModule = moduleName;
        const config = modalHandlers[moduleName];
        
        // Actualizar handlers
        if (handlers) {
            if (handlers.onSave) config.onSave = handlers.onSave;
            if (handlers.onClose) config.onClose = handlers.onClose;
            if (handlers.onDelete) config.onDelete = handlers.onDelete;
        }
        
        // Configurar event listeners
        setupModalListeners(config);
    };
    
    // Configurar listeners para un módulo
    function setupModalListeners(config) {
        // Obtener elementos
        const modal = document.getElementById(config.modalId);
        const deleteModal = document.getElementById(config.deleteModalId);
        const form = document.getElementById(config.formId);
        const closeBtn = document.getElementById(config.closeBtnId);
        const closeDeleteBtn = document.getElementById(config.closeDeleteBtnId);
        const cancelBtn = document.getElementById(config.cancelBtnId);
        const cancelDeleteBtn = document.getElementById(config.cancelDeleteBtnId);
        
        if (!modal) {
            console.warn(`Modal ${config.modalId} no encontrado`);
            return;
        }
        
        // Limpiar listeners anteriores
        modal.onclick = null;
        if (form) form.onsubmit = null;
        if (closeBtn) closeBtn.onclick = null;
        if (closeDeleteBtn) closeDeleteBtn.onclick = null;
        if (cancelBtn) cancelBtn.onclick = null;
        if (cancelDeleteBtn) cancelDeleteBtn.onclick = null;
        
        // Cerrar modal al hacer clic fuera (solo en el fondo)
        modal.onclick = (e) => {
            if (e.target === e.currentTarget) {
                closeModal(config);
            }
        };
        
        // Formulario
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                if (config.onSave) {
                    config.onSave(e);
                }
            };
        }
        
        // Botones de cerrar
        if (closeBtn) {
            closeBtn.onclick = () => closeModal(config);
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => closeModal(config);
        }
        
        // Modal de eliminación
        if (deleteModal) {
            deleteModal.onclick = (e) => {
                if (e.target === e.currentTarget) {
                    closeDeleteModal(config);
                }
            };
        }
        
        if (closeDeleteBtn) {
            closeDeleteBtn.onclick = () => closeDeleteModal(config);
        }
        
        if (cancelDeleteBtn) {
            cancelDeleteBtn.onclick = () => closeDeleteModal(config);
        }
    }
    
    // Cerrar modal principal
    function closeModal(config) {
        const modal = document.getElementById(config.modalId);
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Limpiar formulario
        const form = document.getElementById(config.formId);
        if (form) {
            form.reset();
        }
        
        // Llamar handler personalizado si existe
        if (config.onClose) {
            config.onClose();
        }
    }
    
    // Cerrar modal de eliminación
    function closeDeleteModal(config) {
        const deleteModal = document.getElementById(config.deleteModalId);
        if (deleteModal) {
            deleteModal.classList.remove('active');
        }
    }
    
    // Abrir modal principal
    window.openModal = function(moduleName) {
        if (!modalHandlers[moduleName]) {
            console.error(`Módulo ${moduleName} no está registrado`);
            return;
        }
        
        const config = modalHandlers[moduleName];
        const modal = document.getElementById(config.modalId);
        if (modal) {
            modal.classList.add('active');
        }
    };
    
    // Cerrar modal principal
    window.closeModal = function(moduleName) {
        if (!moduleName) {
            moduleName = activeModule;
        }
        
        if (!moduleName || !modalHandlers[moduleName]) {
            return;
        }
        
        const config = modalHandlers[moduleName];
        closeModal(config);
    };
    
    // Abrir modal de eliminación
    window.openDeleteModal = function(moduleName) {
        if (!moduleName) {
            moduleName = activeModule;
        }
        
        if (!moduleName || !modalHandlers[moduleName]) {
            return;
        }
        
        const config = modalHandlers[moduleName];
        const deleteModal = document.getElementById(config.deleteModalId);
        if (deleteModal) {
            deleteModal.classList.add('active');
        }
    };
    
    // Cerrar modal de eliminación
    window.closeDeleteModal = function(moduleName) {
        if (!moduleName) {
            moduleName = activeModule;
        }
        
        if (!moduleName || !modalHandlers[moduleName]) {
            return;
        }
        
        const config = modalHandlers[moduleName];
        closeDeleteModal(config);
    };
    
    // Obtener configuración del módulo activo
    window.getActiveModalConfig = function() {
        if (!activeModule) return null;
        return modalHandlers[activeModule];
    };
})();

