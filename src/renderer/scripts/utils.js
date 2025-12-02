// Utilidades para formateo de números y fechas

// Obtener fecha y hora local en formato DD/MM/YYYY HH:MM:SS (zona horaria local, no UTC)
window.obtenerFechaHoraLocal = function() {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const año = ahora.getFullYear();
    const hora = String(ahora.getHours()).padStart(2, '0');
    const minuto = String(ahora.getMinutes()).padStart(2, '0');
    const segundo = String(ahora.getSeconds()).padStart(2, '0');
    return `${dia}/${mes}/${año} ${hora}:${minuto}:${segundo}`;
};

// Obtener fecha local en formato DD/MM/YYYY
window.obtenerFechaLocal = function() {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const año = ahora.getFullYear();
    return `${dia}/${mes}/${año}`;
};

// Obtener fecha local en formato YYYY-MM-DD (para inputs de tipo date)
window.obtenerFechaLocalInput = function() {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const año = ahora.getFullYear();
    return `${año}-${mes}-${dia}`;
};

// Utilidades para formateo de números

// Formatear número a 2 decimales con ceros a la izquierda
// Ejemplo: 1 -> "000.01", 12 -> "000.12", 123 -> "001.23", 1234 -> "012.34", 12345 -> "123.45"
function formatearDecimales(valor) {
    if (!valor && valor !== 0) return '';
    
    // Convertir a número
    let num = parseFloat(valor);
    if (isNaN(num)) return '';
    
    // Formatear a 2 decimales con ceros a la izquierda
    const partes = num.toFixed(2).split('.');
    const parteEntera = partes[0].padStart(3, '0');
    const parteDecimal = partes[1];
    
    return `${parteEntera}.${parteDecimal}`;
}

// Formatear input de precio mientras el usuario escribe
// Versión con formateo de derecha a izquierda (como calculadora)
function formatearInputPrecio(input) {
    if (!input) return input;
    
    // Si ya tiene el formateo aplicado, no hacer nada (evitar duplicados)
    if (input._formateadoPrecio) {
        return input;
    }
    
    // Marcar como formateado
    input._formateadoPrecio = true;
    
    // Guardar handlers originales ANTES de crear los nuevos
    if (!input._originalBlurSaved) {
        const currentBlur = input.onblur;
        const currentInput = input.oninput;
        
        // Guardar solo si existen y no son funciones del sistema de formateo
        if (currentBlur && typeof currentBlur === 'function') {
            const blurStr = currentBlur.toString();
            if (!blurStr.includes('formatearDecimales') && 
                !blurStr.includes('_originalBlurFunc') &&
                !blurStr.includes('_originalInputFunc')) {
                input._originalBlurFunc = currentBlur;
            }
        }
        
        if (currentInput && typeof currentInput === 'function') {
            const inputStr = currentInput.toString();
            if (!inputStr.includes('_originalInputFunc') && 
                !inputStr.includes('formatearInputPrecio') &&
                !inputStr.includes('calcularPrecioBs')) {
                input._originalInputFunc = currentInput;
            }
        }
        
        input._originalBlurSaved = true;
        input._originalInputSaved = true;
    }
    
    // Crear handlers nombrados para poder compararlos
    function blurHandler() {
        const valor = this.value.trim();
        if (valor === '') {
            this.value = '';
            if (this._originalBlurFunc && this._originalBlurFunc !== blurHandler) {
                try {
                    this._originalBlurFunc.call(this);
                } catch (e) {
                    console.warn('Error en handler original de blur:', e.message);
                }
            }
            return;
        }
        
        // Remover cualquier formato previo y convertir a número
        const num = parseFloat(valor.replace(/[^\d.]/g, ''));
        if (!isNaN(num)) {
            this.value = formatearDecimales(num);
        } else {
            this.value = '';
        }
        
        if (this._originalBlurFunc && this._originalBlurFunc !== blurHandler) {
            try {
                this._originalBlurFunc.call(this);
            } catch (e) {
                console.warn('Error en handler original de blur:', e.message);
            }
        }
    }
    
    function inputHandler(e) {
        // Obtener solo los dígitos (sin punto decimal ni otros caracteres)
        let digitos = this.value.replace(/[^\d]/g, '');
        
        if (digitos === '') {
            this.value = '';
            // Llamar al handler original si existe
            if (this._originalInputFunc && this._originalInputFunc !== inputHandler) {
                try {
                    this._originalInputFunc.call(this, e);
                } catch (e) {
                    console.warn('Error en handler original de input:', e.message);
                }
            }
            return;
        }
        
        // Convertir a número entero (sin decimales)
        // Los últimos 2 dígitos son los decimales
        const num = parseInt(digitos);
        
        // Calcular parte entera y decimal
        // Ejemplo: 12345 -> parte entera: 123, decimal: 45
        const parteDecimal = num % 100; // Últimos 2 dígitos
        const parteEntera = Math.floor(num / 100); // Resto de dígitos
        
        // Formatear: parte entera con ceros a la izquierda (mínimo 3 dígitos) + punto + decimal (siempre 2 dígitos)
        const parteEnteraFormateada = String(parteEntera).padStart(3, '0');
        const parteDecimalFormateada = String(parteDecimal).padStart(2, '0');
        
        this.value = parteEnteraFormateada + '.' + parteDecimalFormateada;
        
        // Llamar al handler original si existe
        if (this._originalInputFunc && this._originalInputFunc !== inputHandler) {
            try {
                this._originalInputFunc.call(this, e);
            } catch (e) {
                console.warn('Error en handler original de input:', e.message);
            }
        }
    }
    
    // Asignar handlers
    input.onblur = blurHandler;
    input.oninput = inputHandler;
    
    // Asegurar que el input sea completamente interactivo
    input.style.pointerEvents = 'auto';
    input.style.cursor = 'text';
    input.removeAttribute('readonly');
    input.disabled = false;
    
    return input;
}

// Formatear input de cantidad (solo enteros)
function formatearInputCantidad(input) {
    if (!input) return input;
    
    // Si ya tiene el formateo aplicado, no hacer nada
    if (input._formateadoCantidad) {
        return input;
    }
    
    // Marcar como formateado
    input._formateadoCantidad = true;
    
    // Guardar handler original si existe
    const originalHandler = input.oninput;
    
    input.oninput = function(e) {
        this.value = this.value.replace(/[^\d]/g, '');
        // Llamar al handler original si existe
        if (originalHandler && typeof originalHandler === 'function') {
            originalHandler.call(this, e);
        }
    };
    
    // Asegurar que el input sea completamente interactivo
    input.style.pointerEvents = 'auto';
    input.style.cursor = 'text';
    input.removeAttribute('readonly');
    input.disabled = false;
    
    return input;
}

// Obtener valor numérico de un input formateado
window.obtenerValorNumerico = function(input) {
    if (!input) return 0;
    // Remover el punto y convertir directamente
    // Ejemplo: "001.23" -> "00123" -> 123 / 100 = 1.23
    const valor = input.value.trim().replace(/[^\d]/g, '');
    if (valor === '') return 0;
    
    // Los últimos 2 dígitos son decimales
    const num = parseInt(valor);
    return num / 100;
};

// Función global para forzar que los campos editables se mantengan editables
// Útil cuando la ventana pierde y recupera el foco
window.forzarCamposEditables = function() {
    // Buscar todos los inputs, textareas y selects que NO deberían estar bloqueados
    const camposEditables = document.querySelectorAll(`
        input:not([readonly]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]),
        textarea:not([readonly]),
        select:not([disabled])
    `);
    
    camposEditables.forEach(campo => {
        // Solo procesar campos que no están explícitamente marcados como readonly o disabled
        // y que no son campos calculados (como precios readonly)
        const esReadonly = campo.hasAttribute('readonly') || campo.readOnly;
        const esDisabled = campo.disabled;
        const esCalculado = campo.classList.contains('servicio-precio') || 
                           campo.classList.contains('producto-precio-unitario') || 
                           campo.classList.contains('producto-total') ||
                           campo.classList.contains('transaccion-total-general') ||
                           campo.classList.contains('nomina-comisiones-dolares') ||
                           campo.classList.contains('nomina-comisiones-bs') ||
                           campo.classList.contains('nomina-propinas-dolares') ||
                           campo.classList.contains('nomina-propinas-bs') ||
                           campo.classList.contains('nomina-descuentos') ||
                           campo.classList.contains('nomina-subtotal') ||
                           campo.classList.contains('nomina-total');
        
        if (!esReadonly && !esDisabled && !esCalculado) {
            // Forzar que el campo sea editable
            campo.style.pointerEvents = 'auto';
            campo.style.cursor = 'text';
            campo.removeAttribute('readonly');
            campo.disabled = false;
            
            // Si es un input formateado, asegurar que el formateo siga activo
            if (campo._formateadoPrecio && typeof formatearInputPrecio === 'function') {
                // No re-aplicar el formateo si ya está aplicado, solo asegurar que esté activo
                campo.style.pointerEvents = 'auto';
                campo.style.cursor = 'text';
            } else if (campo._formateadoCantidad && typeof formatearInputCantidad === 'function') {
                campo.style.pointerEvents = 'auto';
                campo.style.cursor = 'text';
            }
        }
    });
    
    // No forzar foco automáticamente aquí para evitar parpadeo
    // Solo se forzará cuando sea realmente necesario (errores, pérdida de foco, etc.)
};

// Función de utilidad para renderizar paginación
window.renderPagination = function(containerId, currentPage, totalPages, onPageChangeFunc) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">';
    
    // Botón anterior
    if (currentPage > 1) {
        html += `<button class="btn btn-secondary" onclick="${onPageChangeFunc}(${currentPage - 1})" style="padding: 8px 16px;">« Anterior</button>`;
    }
    
    // Números de página
    html += '<div style="display: flex; gap: 5px; flex-wrap: wrap;">';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" onclick="${onPageChangeFunc}(${i})" style="padding: 8px 12px; min-width: 40px;">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span style="padding: 8px; color: var(--text-secondary);">...</span>';
        }
    }
    html += '</div>';
    
    // Botón siguiente
    if (currentPage < totalPages) {
        html += `<button class="btn btn-secondary" onclick="${onPageChangeFunc}(${currentPage + 1})" style="padding: 8px 16px;">Siguiente »</button>`;
    }
    
    html += `<span style="margin-left: 15px; color: var(--text-secondary);">Página ${currentPage} de ${totalPages}</span>`;
    html += '</div>';
    
    container.innerHTML = html;
};

// Agregar listener para cuando la ventana recupera el foco
window.addEventListener('focus', () => {
    // Pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
        window.forzarCamposEditables();
        // Solo forzar foco si realmente se perdió (no siempre para evitar parpadeo)
        // El foco ya se recuperó naturalmente con este evento
    }, 100);
});

// También forzar cuando se hace clic en un campo (por si se bloqueó)
document.addEventListener('click', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        const campo = e.target;
        const esReadonly = campo.hasAttribute('readonly') || campo.readOnly;
        const esDisabled = campo.disabled;
        const esCalculado = campo.classList.contains('servicio-precio') || 
                           campo.classList.contains('producto-precio-unitario') || 
                           campo.classList.contains('producto-total');
        
        if (!esReadonly && !esDisabled && !esCalculado) {
            // Forzar que el campo sea editable al hacer clic
            campo.style.pointerEvents = 'auto';
            campo.style.cursor = 'text';
            campo.removeAttribute('readonly');
            campo.disabled = false;
        }
    }
}, true); // Usar capture phase para interceptar antes que otros handlers

// Listener para cuando un campo recibe focus - desbloquear inmediatamente
document.addEventListener('focusin', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        const campo = e.target;
        const esReadonly = campo.hasAttribute('readonly') || campo.readOnly;
        const esDisabled = campo.disabled;
        const esCalculado = campo.classList.contains('servicio-precio') || 
                           campo.classList.contains('producto-precio-unitario') || 
                           campo.classList.contains('producto-total');
        
        if (!esReadonly && !esDisabled && !esCalculado) {
            // Forzar que el campo sea editable al recibir focus
            campo.style.pointerEvents = 'auto';
            campo.style.cursor = 'text';
            campo.removeAttribute('readonly');
            campo.disabled = false;
        }
    }
}, true);

// Observer para detectar cuando se abren/cierran modales y forzar campos editables
const modalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.classList && target.classList.contains('modal')) {
                if (target.classList.contains('active')) {
                    // Modal se abrió, forzar campos editables después de un pequeño delay
                    setTimeout(() => {
                        if (typeof window.forzarCamposEditables === 'function') {
                            window.forzarCamposEditables();
                        }
                    }, 150);
                } else {
                    // Modal se cerró, solo forzar campos editables (sin forzar foco para evitar parpadeo)
                    setTimeout(() => {
                        if (typeof window.forzarCamposEditables === 'function') {
                            window.forzarCamposEditables();
                        }
                    }, 100);
                }
            }
        }
    });
});

// Observar todos los modales cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
        });
    });
} else {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
}
