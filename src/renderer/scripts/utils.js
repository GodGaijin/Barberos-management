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
function obtenerValorNumerico(input) {
    if (!input) return 0;
    // Remover el punto y convertir directamente
    // Ejemplo: "001.23" -> "00123" -> 123 / 100 = 1.23
    const valor = input.value.trim().replace(/[^\d]/g, '');
    if (valor === '') return 0;
    
    // Los últimos 2 dígitos son decimales
    const num = parseInt(valor);
    return num / 100;
}
