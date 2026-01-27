import { feriadosISO, prorrogsISO, type ValorData } from '../../triario-data';
import type { RateInfo } from '../types';

const feriadosSet = new Set(feriadosISO);
const prorrogsSet = new Set(prorrogsISO);

/**
 * Converte string de data (YYYY-MM-DD) para Date
 */
export const toDate = (value: string): Date => new Date(`${value}T00:00:00`);

/**
 * Converte Date para chave de data (YYYY-MM-DD)
 */
export const toDateKey = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/**
 * Normaliza data para início do dia (remove horas)
 */
export const toBusinessDate = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Adiciona dias a uma data
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Verifica se uma data é feriado
 */
export const isHoliday = (date: Date): boolean => feriadosSet.has(toDateKey(date));

/**
 * Verifica se uma data é prorrogação
 */
export const isProrrogacao = (date: Date): boolean => prorrogsSet.has(toDateKey(date));

/**
 * Verifica se uma data é dia útil (não é fim de semana nem feriado)
 */
export const isBusinessDay = (date: Date): boolean => {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !isHoliday(date);
};

/**
 * Verifica se uma data é contável (mesmo que isBusinessDay)
 */
export const isCountableDay = (date: Date): boolean => isBusinessDay(date);

/**
 * Retorna o próximo dia útil
 */
export const nextBusinessDay = (
  date: Date,
  options: { skipProrrogacao?: boolean } = {}
): Date => {
  let current = toBusinessDate(date);
  while (!isBusinessDay(current) || (options.skipProrrogacao && isProrrogacao(current))) {
    current = addDays(current, 1);
  }
  return current;
};

/**
 * Seleciona a taxa apropriada baseada na data de interposição
 */
export const pickRateInfo = (interp: Date | null, rates: ValorData[]): RateInfo => {
  if (!interp) return { value: 0 };
  const sortedRates = [...rates].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  let chosen: ValorData | undefined;
  for (const rate of sortedRates) {
    if (interp >= toDate(rate.start)) {
      chosen = rate;
    } else {
      break;
    }
  }
  return chosen ? { value: chosen.value, start: chosen.start } : { value: 0 };
};

/**
 * Formata data para exibição (DD.MM.YYYY)
 */
export const formatDate = (date?: Date): string => {
  if (!date) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Formata hora para exibição (HH:MM)
 */
export const formatTime = (date?: Date): string => {
  if (!date) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formata data ISO para exibição
 */
export const formatIsoDate = (value?: string): string => (value ? formatDate(toDate(value)) : '—');

/**
 * Parse de data de input (string para Date)
 */
export const parseInputDate = (value: string): Date | null => {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
};

/**
 * Parse de data armazenada (string ISO para Date)
 */
export const parseStoredDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
