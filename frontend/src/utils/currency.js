// Formatear número a pesos colombianos
export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '$0';
  const number = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(number)) return '$0';
  return '$' + new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

// Parsear valor formateado a número
export const parseCurrency = (formatted) => {
  if (!formatted) return 0;
  const numeric = formatted.toString().replace(/\D/g, '');
  return numeric ? parseInt(numeric) : 0;
};
