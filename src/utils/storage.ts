import type { TriagemState, StoredPayload, LoadedState } from '../types';
import { STORAGE_KEY, STORAGE_VERSION, STORAGE_TTL_MS } from '../config/constants';
import { parseStoredDate } from './date';

/**
 * Estado inicial da triagem
 */
export const getInitialState = (): TriagemState => ({
  tipo: '',
  acordo: '',
  valido: '',
  desist: '',
  valida: '',
  sigla: '',
  interp: '',
  decrec: '',
  camara: '',
  camaraArea: '',
  camaraNumero: '',
  emaberto: '',
  sfh: 'não',
  envio: '',
  consulta: 'não',
  leitura: '',
  emdobro: '',
  eca: 'não',
  multa: '',
  motivo: '',
  dispensa: '',
  gratuidade: '',
  deferida: '',
  movdef: '',
  requerida: '',
  movped: '',
  atoincomp: '',
  comprova: '',
  apos16: '',
  grumov: '',
  grumovComp: '',
  gruProc: '',
  valorst: '',
  guiavinc: '',
  guia: '',
  funjusmov: '',
  funjusmovComp: '',
  guiorig: '',
  comp: '',
  funjusProc: '',
  comptipo: '',
  codbar: '',
  valorfj: '',
  funjusObs: '',
  parcialTipo: '',
  parcialOutro: '',
  usarIntegral: false,
  subscritor: '',
  nomemovi: '',
  movis: '',
  cadeia: '',
  faltante: '',
  suspefeito: '',
  autuado: '',
  exclusivi: '',
  exclusNome: '',
  cadastrada: '',
  regular: '',
  contrarra: '',
  contramovis: '',
  intimado: '',
  intimovi: '',
  crraberto: '',
  decursocrr: '',
  semadv: '',
  emepe: '',
  mani: '',
  teormani: '',
  manimovis: '',
  decursomp: '',
  remetido: '',
  anotacoes: '',
});

/**
 * Carrega estado armazenado do localStorage
 */
export const loadStoredState = (storageKey: string): LoadedState => {
  const initialState = getInitialState();
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { state: initialState, savedAt: null };
    const parsed = JSON.parse(raw) as Partial<StoredPayload & TriagemState>;
    const savedAt = parseStoredDate((parsed as StoredPayload).savedAt);
    if (savedAt && Date.now() - savedAt.getTime() > STORAGE_TTL_MS) {
      localStorage.removeItem(storageKey);
      return { state: initialState, savedAt: null };
    }
    const stored = (parsed as StoredPayload).state || parsed;
    const merged: TriagemState = { ...initialState, ...(stored as Partial<TriagemState>) };
    // Migração de campos legados
    if (!merged.parcialTipo && (stored as any)?.parcial) {
      const legacy = (stored as any).parcial as 'sim' | 'não' | '';
      merged.parcialTipo = legacy === 'sim' ? 'COHAB Londrina' : legacy === 'não' ? 'não' : '';
    }
    if (!merged.grumov) {
      const legacyGuia = (stored as any)?.guiast as string | undefined;
      const legacyComp = (stored as any)?.compst as string | undefined;
      if (legacyGuia && legacyComp && legacyGuia !== legacyComp) {
        merged.grumov = `${legacyGuia}; ${legacyComp}`;
      } else {
        merged.grumov = legacyGuia || legacyComp || '';
      }
    }
    if (!merged.grumovComp) merged.grumovComp = merged.grumov || '';
    if (!merged.funjusmov) {
      const legacyGuia = (stored as any)?.guiamov as string | undefined;
      const legacyComp = (stored as any)?.compmov as string | undefined;
      if (legacyGuia && legacyComp && legacyGuia !== legacyComp) {
        merged.funjusmov = `${legacyGuia}; ${legacyComp}`;
      } else {
        merged.funjusmov = legacyGuia || legacyComp || '';
      }
    }
    if (!merged.funjusmovComp) {
      merged.funjusmovComp = merged.funjusmov || '';
    }
    if (merged.usarIntegral === undefined) merged.usarIntegral = false;
    if (merged.consulta === '') merged.consulta = 'não';
    return { state: merged, savedAt };
  } catch {
    return { state: initialState, savedAt: null };
  }
};

/**
 * Salva estado no localStorage
 */
export const saveStoredState = (storageKey: string, state: TriagemState): void => {
  try {
    const payload: StoredPayload = {
      __version: STORAGE_VERSION,
      state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (err) {
    console.error('Erro ao salvar estado:', err);
  }
};

/**
 * Obtém a chave de armazenamento para um usuário
 */
export const getStorageKey = (userId?: string): string => {
  return userId ? `${STORAGE_KEY}_${userId}` : `${STORAGE_KEY}_anon`;
};
