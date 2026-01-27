/**
 * Formatador de moeda brasileira
 */
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Formata número para moeda brasileira (R$ X,XX)
 */
export const formatCurrency = (value: number): string =>
  Number.isFinite(value) ? currencyFormatter.format(value) : 'R$ 0,00';
