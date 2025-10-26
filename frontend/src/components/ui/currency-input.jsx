import * as React from "react"
import { cn } from "../../lib/utils"

const CurrencyInput = React.forwardRef(({ className, value, onChange, required, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState("");
  const [numericValue, setNumericValue] = React.useState("");

  // Formatear número a pesos colombianos
  const formatCurrency = (value) => {
    if (!value) return "";
    // Remover todo excepto números
    const number = value.toString().replace(/\D/g, "");
    if (!number) return "";
    // Formatear con separador de miles
    return new Intl.NumberFormat('es-CO').format(parseInt(number));
  };

  // Obtener valor numérico sin formato
  const getNumericValue = (formatted) => {
    if (!formatted) return "";
    const numeric = formatted.replace(/\D/g, "");
    return numeric;
  };

  // Inicializar displayValue cuando value cambia desde afuera
  React.useEffect(() => {
    if (value !== undefined && value !== null && value !== "") {
      const cleanValue = value.toString().replace(/\D/g, "");
      setNumericValue(cleanValue);
      setDisplayValue(formatCurrency(cleanValue));
    } else {
      setNumericValue("");
      setDisplayValue("");
    }
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Remover el símbolo $ y espacios
    const cleanValue = inputValue.replace(/[$\s]/g, "");
    
    // Formatear
    const formatted = formatCurrency(cleanValue);
    setDisplayValue(formatted);
    
    // Enviar valor numérico al padre
    const numeric = getNumericValue(formatted);
    setNumericValue(numeric);
    
    if (onChange) {
      // Crear un evento sintético con el valor numérico
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: numeric,
        },
      };
      onChange(syntheticEvent);
    }
  };

  const handleFocus = (e) => {
    // Seleccionar todo al hacer foco
    e.target.select();
  };

  // Custom validation
  const handleInvalid = (e) => {
    e.preventDefault();
    if (required && !numericValue) {
      e.target.setCustomValidity('Este campo es requerido');
    } else {
      e.target.setCustomValidity('');
    }
  };

  const handleInput = (e) => {
    // Clear custom validity cuando el usuario empiece a escribir
    e.target.setCustomValidity('');
  };

  // Validación cuando cambia el valor numérico
  React.useEffect(() => {
    if (ref && ref.current) {
      if (required && !numericValue) {
        ref.current.setCustomValidity('Este campo es requerido');
      } else {
        ref.current.setCustomValidity('');
      }
    }
  }, [numericValue, required, ref]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium pointer-events-none">
        $
      </span>
      <input
        type="text"
        inputMode="numeric"
        className={cn(
          "flex h-9 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-7 pr-3 py-1 text-base text-gray-900 dark:text-gray-100 shadow-sm transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onInvalid={handleInvalid}
        onInput={handleInput}
        required={required}
        {...props}
      />
    </div>
  );
});
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
