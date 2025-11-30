// Sistema de notificaciones personalizado para reemplazar alert() y confirm()
// Evita problemas de bloqueo de campos en Electron

(function() {
    'use strict';

    // Crear contenedor de notificaciones si no existe
    function crearContenedorNotificaciones() {
        let contenedor = document.getElementById('notifications-container');
        if (!contenedor) {
            contenedor = document.createElement('div');
            contenedor.id = 'notifications-container';
            contenedor.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(contenedor);
        }
        return contenedor;
    }

    // Crear modal de confirmación si no existe
    function crearModalConfirmacion() {
        let modal = document.getElementById('confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirm-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content modal-small">
                    <div class="modal-header">
                        <h3 id="confirm-title">Confirmar</h3>
                        <button class="modal-close" id="confirm-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p id="confirm-message"></p>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="confirm-ok">Aceptar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Event listeners
            document.getElementById('confirm-close').onclick = () => {
                modal.classList.remove('active');
                if (window._confirmReject) {
                    window._confirmReject();
                    window._confirmResolve = null;
                    window._confirmReject = null;
                }
                // No forzar foco aquí para evitar parpadeo
            };

            document.getElementById('confirm-cancel').onclick = () => {
                modal.classList.remove('active');
                if (window._confirmReject) {
                    window._confirmReject();
                    window._confirmResolve = null;
                    window._confirmReject = null;
                }
                // No forzar foco aquí para evitar parpadeo
            };

            document.getElementById('confirm-ok').onclick = () => {
                modal.classList.remove('active');
                if (window._confirmResolve) {
                    window._confirmResolve(true);
                    window._confirmResolve = null;
                    window._confirmReject = null;
                }
                // No forzar foco aquí para evitar parpadeo
            };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    if (window._confirmReject) {
                        window._confirmReject();
                        window._confirmResolve = null;
                        window._confirmReject = null;
                    }
                    // No forzar foco aquí para evitar parpadeo
                }
            };
        }
        return modal;
    }

    // Mostrar notificación (reemplazo de alert)
    window.mostrarNotificacion = function(mensaje, tipo = 'info', duracion = 3000) {
        const contenedor = crearContenedorNotificaciones();
        
        const notificacion = document.createElement('div');
        notificacion.className = `notification notification-${tipo}`;
        notificacion.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px 20px;
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            pointer-events: auto;
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        const icono = tipo === 'error' ? '❌' : tipo === 'success' ? '✅' : 'ℹ️';
        const color = tipo === 'error' ? 'var(--error-color)' : tipo === 'success' ? '#28a745' : 'var(--accent-primary)';

        notificacion.innerHTML = `
            <span style="font-size: 24px;">${icono}</span>
            <span style="flex: 1; color: var(--text-primary);">${mensaje}</span>
            <button class="notification-close" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 20px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
        `;

        const cerrar = () => {
            notificacion.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.parentNode.removeChild(notificacion);
                }
                // No forzar foco automáticamente para evitar parpadeo
                // Solo se forzará cuando realmente se detecte que los campos están bloqueados
            }, 300);
        };

        notificacion.querySelector('.notification-close').onclick = cerrar;

        contenedor.appendChild(notificacion);

        if (duracion > 0) {
            setTimeout(cerrar, duracion);
        }

        return notificacion;
    };

    // Confirmación personalizada (reemplazo de confirm)
    window.mostrarConfirmacion = function(mensaje, titulo = 'Confirmar') {
        return new Promise((resolve, reject) => {
            const modal = crearModalConfirmacion();
            document.getElementById('confirm-title').textContent = titulo;
            document.getElementById('confirm-message').textContent = mensaje;
            
            window._confirmResolve = resolve;
            window._confirmReject = reject;
            
            modal.classList.add('active');
        });
    };

    // Agregar estilos de animación si no existen
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Función para forzar el foco de la ventana (solución al problema de campos bloqueados)
    window.forzarFocoVentana = function() {
        if (window.electronAPI && window.electronAPI.fixFocus) {
            window.electronAPI.fixFocus();
        }
    };

    // Forzar foco después de cerrar notificaciones
    const observerNotificaciones = new MutationObserver(() => {
        // Cuando se cierra una notificación, forzar foco
        setTimeout(() => {
            window.forzarFocoVentana();
        }, 100);
    });

    // Observar el contenedor de notificaciones
    setTimeout(() => {
        const contenedor = document.getElementById('notifications-container');
        if (contenedor) {
            observerNotificaciones.observe(contenedor, { childList: true });
        }
    }, 1000);
})();

