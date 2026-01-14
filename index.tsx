import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  ClipboardList,
  Calendar,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  browserLocalPersistence,
  browserSessionPersistence,
  deleteUser,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  reload,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { feriadosISO, prorrogsISO, stjRates, stfRates, funjusRates, ValorData } from './triario-data';
import simbaLogo from './Dados/WhatsApp Image 2025-12-16 at 16.54.26.jpeg';

type YesNo = 'sim' | 'não' | '';
type TipoRecurso = 'Especial' | 'Extraordinário' | '';
type Multa = 'não' | 'sim, recolhida' | 'sim, não recolhida' | '';
type Gratuidade =
  | 'não invocada'
  | 'já é ou afirma ser beneficiário'
  | 'requer no recurso em análise'
  | 'é o próprio objeto do recurso'
  | 'presumida (defensor público, dativo ou NPJ)'
  | '';
type Subscritor =
  | 'advogado particular'
  | 'procurador público'
  | 'procurador nomeado'
  | 'advogado em causa própria'
  | '';
type Contrarrazoes = 'apresentadas' | 'ausente alguma' | 'ausentes' | '';
type MPTeor = 'mera ciência' | 'pela admissão' | 'pela inadmissão' | 'ausência de interesse' | '';
type CamaraArea = 'Cível' | 'Crime' | '';
type ParcialOpcao = '' | 'não' | 'JG parcial' | 'COHAB Londrina' | 'outros';
type UserRole = 'admin' | 'user';
type ThemeMode = 'light' | 'dark';

type UserProfile = {
  uid: string;
  email: string;
  name: string;
  photoURL: string;
  role: UserRole;
  active: boolean;
  triageCount: number;
  theme: ThemeMode;
  createdAt: string;
  updatedAt: string;
};

type TriagemState = {
  tipo: TipoRecurso;
  acordo: YesNo;
  valido: YesNo;
  desist: YesNo;
  valida: YesNo;
  sigla: string;
  interp: string;
  decrec: 'colegiada/acórdão' | 'monocrática/singular' | '';
  camara: string;
  camaraArea: CamaraArea;
  camaraNumero: string;
  emaberto: YesNo;
  envio: string;
  consulta: YesNo;
  leitura: string;
  emdobro: 'simples' | 'em dobro' | '';
  multa: Multa;
  motivo: 'Fazenda Pública ou justiça gratuita' | 'é o próprio objeto do recurso' | 'não identificado' | '';
  dispensa: YesNo;
  gratuidade: Gratuidade;
  deferida: YesNo;
  movdef: string;
  requerida: YesNo;
  movped: string;
  atoincomp: YesNo;
  comprova:
    | 'no prazo para interposição do recurso'
    | 'no dia útil seguinte ao término do prazo'
    | 'posteriormente'
    | 'ausente'
    | '';
  apos16: YesNo;
  grumov: string;
  grumovComp: string;
  valorst: string;
  guiavinc: YesNo;
  guia: YesNo;
  funjusmov: string;
  guiorig: YesNo;
  comp: YesNo;
  comptipo: 'de pagamento' | 'de agendamento' | '';
  codbar: 'confere' | 'diverge ou guia ausente' | '';
  valorfj: string;
  funjusObs: string;
  parcialTipo: ParcialOpcao;
  parcialOutro: string;
  usarIntegral: boolean;
  subscritor: Subscritor;
  nomemovi: string;
  movis: string;
  cadeia: YesNo;
  faltante: 'ao próprio subscritor' | 'a outro elo da cadeia' | '';
  suspefeito: 'não requerido' | 'requerido no corpo do recurso' | 'requerido em petição apartada' | '';
  autuado: YesNo;
  exclusivi: 'requerida' | 'não requerida' | '';
  cadastrada: YesNo;
  regular: YesNo;
  contrarra: Contrarrazoes;
  contramovis: string;
  intimado: YesNo;
  intimovi: string;
  crraberto: YesNo;
  decursocrr: YesNo;
  semadv: YesNo;
  emepe: YesNo;
  mani: YesNo;
  teormani: MPTeor;
  manimovis: string;
  decursomp: YesNo;
  remetido: YesNo;
  anotacoes: string;
};

type StoredPayload = { __version: number; state: TriagemState; savedAt?: string };
type LoadedState = { state: TriagemState; savedAt: Date | null };

const STORAGE_KEY = 'triario_state_v2';
const STORAGE_VERSION = 3;
const USERS_COLLECTION = 'users';
const ADMIN_REQUESTS_COLLECTION = 'adminRequests';
const REMEMBER_KEY = 'triario_remember_login';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};
const firebaseEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);
const firebaseApp = firebaseEnabled ? initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
if (auth) {
  auth.languageCode = 'pt-BR';
}
const parseAdminEmails = (value?: string) =>
  value
    ?.split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean) ?? [];
const bootstrapAdminEmails = parseAdminEmails(import.meta.env.VITE_ADMIN_EMAILS);
const allowedEmailDomain = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN ?? 'tjpr.jus.br')
  .trim()
  .toLowerCase();

const initialState: TriagemState = {
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
  envio: '',
  consulta: 'não',
  leitura: '',
  emdobro: '',
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
  valorst: '',
  guiavinc: '',
  guia: '',
  guiorig: '',
  comp: '',
  funjusmov: '',
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
};

type Tempestividade = {
  status: 'tempestivo' | 'intempestivo' | 'pendente';
  intim?: Date;
  comeco?: Date;
  venc?: Date;
  prazo?: number;
  mensagem?: string;
};

type RateInfo = { value: number; start?: string };

const toDate = (value: string) => new Date(`${value}T00:00:00`);
const toDateKey = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};
const sortRates = (rates: ValorData[]) =>
  [...rates].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
const stjRatesSorted = sortRates(stjRates);
const stfRatesSorted = sortRates(stfRates);
const funjusRatesSorted = sortRates(funjusRates);
const feriadosSet = new Set(feriadosISO);
const prorrogsSet = new Set(prorrogsISO);

const toBusinessDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
const isHoliday = (date: Date) => feriadosSet.has(toDateKey(date));
const isProrrogacao = (date: Date) => prorrogsSet.has(toDateKey(date));

const isBusinessDay = (date: Date) => {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !isHoliday(date);
};
const isCountableDay = (date: Date) => isBusinessDay(date) && !isProrrogacao(date);

const nextBusinessDay = (date: Date) => {
  let current = toBusinessDate(date);
  while (!isBusinessDay(current)) {
    current = addDays(current, 1);
  }
  return current;
};

const pickRateInfo = (interp: Date | null, rates: ValorData[]): RateInfo => {
  if (!interp) return { value: 0 };
  let chosen: ValorData | undefined;
  for (const rate of rates) {
    if (interp >= toDate(rate.start)) {
      chosen = rate;
    } else {
      break;
    }
  }
  return chosen ? { value: chosen.value, start: chosen.start } : { value: 0 };
};

const formatDate = (date?: Date) => {
  if (!date) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatTime = (date?: Date) => {
  if (!date) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatIsoDate = (value?: string) => (value ? formatDate(toDate(value)) : '—');

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrency = (value: number) =>
  Number.isFinite(value) ? currencyFormatter.format(value) : 'R$ 0,00';

const parseInputDate = (value: string) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
};
const parseStoredDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const sanitizeFilename = (value: string) =>
  value.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');
const loadStoredState = (storageKey: string): LoadedState => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { state: initialState, savedAt: null };
    const parsed = JSON.parse(raw) as Partial<StoredPayload & TriagemState>;
    const stored = (parsed as StoredPayload).state || parsed;
    const merged: TriagemState = { ...initialState, ...(stored as Partial<TriagemState>) };
    if (!merged.parcialTipo && (stored as any)?.parcial) {
      const legacy = (stored as any).parcial as YesNo;
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
    if (merged.usarIntegral === undefined) merged.usarIntegral = false;
    if (merged.consulta === '') merged.consulta = 'não';
    const savedAt = parseStoredDate((parsed as StoredPayload).savedAt);
    return { state: merged, savedAt };
  } catch {
    return { state: initialState, savedAt: null };
  }
};
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizeUserKey = (user: UserProfile) => {
  const email = user.email ? normalizeEmail(user.email) : '';
  return email || user.uid;
};
const getTimestamp = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};
const pickPreferredUser = (current: UserProfile, candidate: UserProfile) => {
  if (current.role !== candidate.role) {
    return candidate.role === 'admin' ? candidate : current;
  }
  if (current.active !== candidate.active) {
    return candidate.active ? candidate : current;
  }
  const currentUpdated = getTimestamp(current.updatedAt);
  const candidateUpdated = getTimestamp(candidate.updatedAt);
  if (candidateUpdated !== currentUpdated) {
    return candidateUpdated > currentUpdated ? candidate : current;
  }
  const currentTriages = current.triageCount || 0;
  const candidateTriages = candidate.triageCount || 0;
  if (candidateTriages !== currentTriages) {
    return candidateTriages > currentTriages ? candidate : current;
  }
  return current;
};
const dedupeUsers = (users: UserProfile[]) => {
  const map = new Map<string, UserProfile>();
  users.forEach((user) => {
    const key = normalizeUserKey(user);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, user);
      return;
    }
    map.set(key, pickPreferredUser(existing, user));
  });
  return Array.from(map.values());
};
const isAllowedEmail = (value: string) => normalizeEmail(value).endsWith(`@${allowedEmailDomain}`);
const getInitials = (value: string) => {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};
const formatAuthError = (error: unknown) => {
  const err = error as { code?: string; message?: string };
  switch (err.code) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-not-found':
      return 'Usuário não encontrado.';
    case 'auth/wrong-password':
      return 'Senha incorreta.';
    case 'auth/invalid-credential':
      return 'Credenciais inválidas.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado.';
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha de rede. Verifique sua conexão.';
    case 'permission-denied':
      return 'Permissão negada para esta ação.';
    default:
      return err.message || 'Falha ao autenticar.';
  }
};

const computeTempestividade = (state: TriagemState): Tempestividade => {
  const envio = parseInputDate(state.envio);
  const interp = parseInputDate(state.interp);
  if (!envio || !interp) {
    return { status: 'pendente', mensagem: 'Preencha envio da intimação e interposição.' };
  }
  const prazo = state.emdobro === 'em dobro' ? 30 : 15;
  const leitura = state.consulta === 'sim' ? parseInputDate(state.leitura) : null;
  const auto = addDays(envio, 10);
  const intimBase = leitura && leitura <= auto ? leitura : auto;
  const intim = nextBusinessDay(intimBase);
  let comeco = addDays(intim, 1);
  while (!isCountableDay(comeco)) {
    comeco = addDays(comeco, 1);
  }
  let venc = comeco;
  const contagem: Date[] = [venc];
  while (contagem.length < prazo) {
    venc = addDays(venc, 1);
    while (!isCountableDay(venc)) {
      venc = addDays(venc, 1);
    }
    contagem.push(venc);
  }
  const status = interp <= venc ? 'tempestivo' : 'intempestivo';
  return { status, intim, comeco, venc, prazo };
};

type Outputs = {
  tempest: Tempestividade;
  deverST: number;
  deverFJ: number;
  stLabel: string;
  stRateStart?: string;
  fjRateStart?: string;
  controut: string;
  mpout: string;
  grout: string;
  funjout: string;
  procurout: string;
  exclusout: string;
  suspefout: string;
  parcialout: string;
  observacoes: string[];
};

const buildResumoText = (state: TriagemState, outputs: Outputs) => {
  const safe = (v: string) => (v ? v : '—');
  const valorFJValue = state.valorfj.trim();
  const valorFJNum = Number(valorFJValue || 0);
  const funjusBelow =
    state.dispensa === 'não' &&
    state.gratuidade === 'não invocada' &&
    valorFJValue !== '' &&
    Number.isFinite(valorFJNum) &&
    valorFJNum < outputs.deverFJ;
  const lines: string[] = [
    'Resumo - Portal de Triagem',
    `Data: ${new Date().toLocaleString('pt-BR')}`,
    `Sigla: ${safe(state.sigla)}`,
    '',
    `Tipo: ${safe(state.tipo)}`,
    `Interposição: ${safe(state.interp)}`,
    `Decisão recorrida: ${safe(state.decrec)}`,
    `Câmara: ${safe(camaraLabel(state))}`,
    '',
    `Tempestivo: ${outputs.tempest.status}`,
    `Intimação: ${formatDate(outputs.tempest.intim)}`,
    `Começo do prazo: ${formatDate(outputs.tempest.comeco)}`,
    `Prazo: ${outputs.tempest.prazo || '—'} dias`,
    `Vencimento: ${formatDate(outputs.tempest.venc)}`,
    '',
    `GRU: ${outputs.grout}`,
    `Funjus: ${outputs.funjout}`,
    `Pagamento parcial: ${outputs.parcialout}`,
    `Valores devidos - ${outputs.stLabel}: ${formatCurrency(outputs.deverST)} | FUNJUS: ${formatCurrency(
      outputs.deverFJ
    )}`,
    `Base de custas: ${outputs.stLabel} ${formatIsoDate(outputs.stRateStart)} | FUNJUS ${formatIsoDate(
      outputs.fjRateStart
    )}`,
    '',
    `Procuração/Nomeação: ${outputs.procurout}`,
    `Exclusividade na intimação: ${outputs.exclusout}`,
    `Efeito suspensivo: ${outputs.suspefout}`,
    '',
    `Contrarrazões: ${outputs.controut}`,
    `Ministério Público: ${outputs.mpout}`,
  ];
  if (outputs.observacoes.length) {
    lines.push('', 'Observações/Minutas:');
    outputs.observacoes.forEach((obs, idx) => lines.push(`${idx + 1}. ${obs}`));
  }
  if (funjusBelow && state.funjusObs.trim()) {
    lines.push('', `Justificativa Funjus: ${state.funjusObs.trim()}`);
  }
  if (state.anotacoes.trim()) {
    lines.push('', 'Notas manuais:', state.anotacoes.trim());
  }
  return lines.join('\n');
};

const buildGratuidadeOutput = (state: TriagemState) => {
  if (state.dispensa === 'sim') {
    return 'dispensado (CPC, art. 1.007, §1º)';
  }
  if (state.gratuidade === 'já é ou afirma ser beneficiário' && state.atoincomp !== 'sim') {
    if (state.deferida === 'sim') return `justiça gratuita mov. ${state.movdef || '?'}`;
    if (state.requerida === 'sim') return `justiça gratuita mov. ${state.movped || '?'}`;
    return 'justiça gratuita requerida no recurso';
  }
  if (state.gratuidade === 'requer no recurso em análise') return 'justiça gratuita requerida no recurso';
  if (state.gratuidade === 'é o próprio objeto do recurso') return 'justiça gratuita é o próprio objeto';
  if (state.gratuidade === 'presumida (defensor público, dativo ou NPJ)') {
    return 'justiça gratuita presumida (defensor público, dativo ou NPJ)';
  }
  return null;
};

const computeOutputs = (state: TriagemState): Outputs => {
  const tempest = computeTempestividade(state);
  const interpDate = parseInputDate(state.interp);
  const stLabel =
    state.tipo === 'Especial' ? 'STJ' : state.tipo === 'Extraordinário' ? 'STF' : 'STJ/STF';
  const stRate =
    state.tipo === 'Especial'
      ? pickRateInfo(interpDate, stjRatesSorted)
      : state.tipo === 'Extraordinário'
      ? pickRateInfo(interpDate, stfRatesSorted)
      : { value: 0 };
  const funjusRate = pickRateInfo(interpDate, funjusRatesSorted);
  const deverST = stRate.value;
  const deverFJ = funjusRate.value;
  const gratuidadeOutput = buildGratuidadeOutput(state);

  const controut = (() => {
    if (state.contrarra === 'apresentadas') {
      return state.contramovis ? `mov(s). ${state.contramovis}` : 'apresentadas';
    }
    if (state.contrarra === 'ausente alguma') {
      return state.contramovis ? `mov(s). ${state.contramovis}` : 'ausente alguma';
    }
    if (state.contrarra === 'ausentes') {
      if (state.intimado === 'sim' && state.crraberto === 'não' && state.decursocrr === 'sim') return 'não';
      if (state.intimado === 'não' && state.semadv === 'sim') return 'sem adv.';
      return 'vide obs.';
    }
    return 'vide obs.';
  })();

  const mpout = (() => {
    if (state.emepe === 'não') return 'N/A';
    if (state.mani === 'sim') {
      const base = state.teormani || 'mera ciência';
      return state.manimovis ? `${base}; mov. ${state.manimovis}` : base;
    }
    if (state.remetido === 'sim' && state.decursomp === 'sim') return 'deixou de se manifestar';
    return 'vide obs.';
  })();

  const grout = (() => {
    if (gratuidadeOutput) return gratuidadeOutput;
    const guiaMov = state.grumov?.trim();
    const compMov = state.grumovComp?.trim();
    if (guiaMov && compMov && guiaMov !== compMov) {
      return `GRU guia mov. ${guiaMov}; comprovante mov. ${compMov}`;
    }
    return guiaMov || compMov ? `GRU mov. ${guiaMov || compMov}` : 'GRU não localizada';
  })();

  const funjout = (() => {
    if (gratuidadeOutput) return gratuidadeOutput;
    const guiaInfo = state.guia === 'sim' ? `guia mov. ${state.funjusmov || '?'}` : 'guia não localizada';
    const compInfo = state.comp === 'sim' ? `comprovante mov. ${state.funjusmov || '?'}` : 'comprovante não localizado';
    return `${guiaInfo}; ${compInfo}`;
  })();

  const parcialout = (() => {
    if (!state.parcialTipo || state.parcialTipo === 'não') return 'Não informado';
    if (state.parcialTipo === 'outros') return state.parcialOutro ? `Parcial: ${state.parcialOutro}` : 'Parcial: outros (especificar)';
    return `Parcial: ${state.parcialTipo}`;
  })();

  const procurout = (() => {
    if (state.subscritor === 'procurador público' || state.subscritor === 'advogado em causa própria') {
      return state.subscritor || 'N/A';
    }
    if (state.subscritor === 'procurador nomeado') {
      return state.nomemovi ? `mov. ${state.nomemovi}` : 'nomeação não localizada';
    }
    if (state.subscritor === 'advogado particular' && state.movis) return `mov(s). ${state.movis}`;
    if (state.subscritor === 'advogado particular') return 'movimentos não informados';
    return 'N/A';
  })();

  const exclusout = (() => {
    if (state.exclusivi === 'não requerida') return 'não requerida';
    if (state.exclusivi === 'requerida' && state.cadastrada === 'sim') return 'requerida e já cadastrada';
    if (state.exclusivi === 'requerida' && state.regular === 'sim') return 'requerida';
    if (state.exclusivi === 'requerida' && state.regular === 'não') return 'requerida, mas sem poderes';
    return 'N/A';
  })();

  const suspefout = (() => {
    if (!state.suspefeito) return 'N/A';
    if (state.suspefeito === 'requerido em petição apartada' && state.autuado === 'sim')
      return 'requerido em petição apartada e autuado';
    return state.suspefeito;
  })();

  const observacoes: string[] = [];
  const custasDispensadas = Boolean(gratuidadeOutput);
  const prazoEmDobroDevido =
    state.dispensa === 'sim' ||
    state.gratuidade === 'presumida (defensor público, dativo ou NPJ)' ||
    state.subscritor === 'procurador nomeado' ||
    state.subscritor === 'procurador público';
  const prazoEmDobroInvalido = state.emdobro === 'em dobro' && !prazoEmDobroDevido;
  const prazoEmDobroAusente = prazoEmDobroDevido && state.emdobro !== 'em dobro';

  const envioDate = parseInputDate(state.envio);
  const leituraDate = state.consulta === 'sim' ? parseInputDate(state.leitura) : null;
  if (envioDate && leituraDate) {
    const auto = addDays(envioDate, 10);
    if (leituraDate > auto) {
      observacoes.push('Leitura após 10 dias: considerar intimação automática.');
    }
  }

  if (state.decrec === 'monocrática/singular') {
    observacoes.push('Decisão monocrática: REsp/RExt incabível (nulidade).');
  }
  if (state.acordo === 'sim') {
    if (state.valido === 'sim') {
      observacoes.push('Acordo válido: encerrar o processo sem análise do mérito.');
    } else if (state.valido === 'não') {
      observacoes.push('Acordo inválido: verificar poderes expressamente outorgados e partes.');
    }
  }
  if (state.desist === 'sim') {
    if (state.valida === 'sim') {
      observacoes.push('Desistência válida: encerrar o processo sem análise do mérito.');
    } else if (state.valida === 'não') {
      observacoes.push('Desistência inválida: verificar poderes expressamente outorgados e partes.');
    }
  }
  if (prazoEmDobroInvalido) {
    observacoes.push('Prazo em dobro: apenas MP/Defensoria/NPJ/dativo.');
  } else if (prazoEmDobroAusente) {
    observacoes.push('Prazo em dobro aplicável (MP/Defensoria/NPJ/dativo/ente público).');
  }
  if (state.emaberto !== 'sim' && state.contrarra && state.contrarra !== 'ausentes' && !state.contramovis.trim()) {
    observacoes.push('Informar movimento da juntada das contrarrazões/renúncia.');
  }
  if (!custasDispensadas && state.gratuidade === 'não invocada' && state.comprova && state.comprova !== 'ausente') {
    if (!state.grumov) {
      observacoes.push('Informar movimento da GRU (guia/comprovante).');
    }
  }
  if (!custasDispensadas && state.guia === 'sim') {
    if (state.guiorig === 'não') {
      observacoes.push('Guia FUNJUS não é original do recurso; verificar reutilização.');
    } else if (state.guiorig === '') {
      observacoes.push('Informar se a guia FUNJUS é original do recurso.');
    }
  }
  if (!custasDispensadas && state.comp === 'sim' && state.codbar === 'diverge ou guia ausente') {
    observacoes.push('Código de barras divergente/guia ausente: conferir preparo FUNJUS.');
  }
  if (!custasDispensadas && state.comp === 'sim' && state.comptipo === 'de agendamento') {
    observacoes.push('Comprovante de agendamento não comprova pagamento; exigir comprovante.');
  }
  if (state.emaberto === 'sim') {
    observacoes.push(
      'Há prazo em aberto na Câmara de origem; sugere-se devolver para aguardar decurso.'
    );
  }
  if (state.emaberto !== 'sim') {
    if (state.contrarra !== 'apresentadas' && state.intimado === 'não' && state.semadv === 'não') {
      observacoes.push('Determinar intimação do(s) recorrido(s) para contrarrazões.');
    } else if (state.contrarra !== 'apresentadas' && state.intimado === 'sim' && state.crraberto === 'sim') {
      observacoes.push('Prazo de contrarrazões em aberto; aguardar decurso.');
    } else if (
      state.contrarra !== 'apresentadas' &&
      state.intimado === 'sim' &&
      state.crraberto === 'não' &&
      state.decursocrr === 'não'
    ) {
      observacoes.push('Determinar certificação do decurso do prazo para contrarrazões.');
    }
  }
  if (
    (state.emepe === 'sim' && state.mani === 'sim' && state.teormani === 'mera ciência' && state.decursomp === 'não') ||
    (state.emepe === 'sim' && state.mani === 'não' && state.remetido === 'sim' && state.decursomp === 'não')
  ) {
    observacoes.push('Aguardar decurso do prazo para manifestação da PGJ.');
  } else if (state.emepe === 'sim' && state.mani === 'não' && state.remetido === 'não') {
    observacoes.push('Encaminhar autos à PGJ.');
  }

  const recodobro =
    state.dispensa === 'não' &&
    state.gratuidade === 'não invocada' &&
    (state.comprova === 'ausente' ||
      state.comprova === 'posteriormente' ||
      (state.comprova === 'no dia útil seguinte ao término do prazo' && state.apos16 === 'não'));

  const valorSTNum = Number(state.valorst || 0);
  const valorFJNum = Number(state.valorfj || 0);

  if (recodobro && (deverST || deverFJ)) {
    observacoes.push(
      `Caso de recolhimento em dobro; intimar para regularizar. Valores: ${stLabel} ${formatCurrency(
        deverST * 2
      )}, FUNJUS ${formatCurrency(deverFJ * 2)}`
    );
  } else if (
    state.dispensa === 'não' &&
    state.gratuidade === 'já é ou afirma ser beneficiário' &&
    state.atoincomp === 'sim'
  ) {
    observacoes.push(
      `Ato incompatível com justiça gratuita; intimar para recolher preparo. Valores: ${stLabel} ${formatCurrency(
        deverST
      )}, FUNJUS ${formatCurrency(deverFJ)}`
    );
  } else if (
    state.dispensa === 'não' &&
    (state.gratuidade === 'não invocada' || state.atoincomp === 'sim') &&
    (valorSTNum < deverST || valorFJNum < deverFJ)
  ) {
    const parts = [];
    if (valorSTNum < deverST) parts.push(`${stLabel} ${formatCurrency(deverST - valorSTNum)}`);
    if (valorFJNum < deverFJ) parts.push(`Funjus ${formatCurrency(deverFJ - valorFJNum)}`);
    if (parts.length) {
      observacoes.push(`Complementar preparo: ${parts.join(' | ')}`);
    }
  }

  if (state.subscritor === 'advogado particular' && state.cadeia === 'não') {
    observacoes.push('Regularizar cadeia de procurações para o subscritor.');
  } else if (state.subscritor === 'advogado particular' && state.cadeia === 'sim' && !state.movis) {
    observacoes.push('Informar movimentos completos da cadeia de poderes.');
  }
  if (state.exclusivi === 'requerida' && state.cadastrada === 'não' && state.regular === 'sim') {
    observacoes.push('Deferir pedido de exclusividade e cadastrar procurador nas partes.');
  }
  if (state.suspefeito === 'requerido em petição apartada' && state.autuado === 'não') {
    observacoes.push('Autuar separadamente o pedido de efeito suspensivo.');
  }

  return {
    tempest,
    deverST,
    deverFJ,
    stLabel,
    stRateStart: stRate.start,
    fjRateStart: funjusRate.start,
    controut,
    mpout,
    grout,
    funjout,
    procurout,
    exclusout,
    suspefout,
    parcialout,
    observacoes,
  };
};

const camaraLabel = (state: TriagemState) => {
  if (state.camaraArea && state.camaraNumero) {
    return `${state.camaraArea} ${state.camaraNumero}`;
  }
  return state.camara || '—';
};

const buildConsequencias = (state: TriagemState, outputs: Outputs) => {
  const list: string[] = [
    `Tempestividade: ${outputs.tempest.status === 'tempestivo' ? 'prazo ok' : outputs.tempest.status === 'intempestivo' ? 'avaliar intempestividade' : 'preencha datas'}`,
    `Preparo (${outputs.stLabel}/FUNJUS): ${outputs.grout}`,
    `Funjus: ${outputs.funjout}`,
    `Pagamento parcial: ${outputs.parcialout}`,
    `Contrarrazões: ${outputs.controut}`,
    `Ministério Público: ${outputs.mpout}`,
    `Representação: ${outputs.procurout}`,
    `Exclusividade na intimação: ${outputs.exclusout}`,
    `Efeito suspensivo: ${outputs.suspefout || 'N/A'}`,
  ];
  outputs.observacoes.forEach((obs) => list.push(obs));
  return list;
};

type StepId = 'recurso' | 'dados' | 'tempest' | 'preparo' | 'processo' | 'resumo';

type FieldErrors = Partial<Record<keyof TriagemState, boolean>>;

const computeFieldErrors = (state: TriagemState, outputs: Outputs): FieldErrors => {
  const errors: FieldErrors = {};
  const mark = (key: keyof TriagemState, condition: boolean) => {
    if (condition) errors[key] = true;
  };

  mark('tipo', !state.tipo);
  mark('acordo', state.acordo === '');
  if (state.acordo === 'sim') mark('valido', !state.valido);
  mark('desist', state.desist === '');
  if (state.desist === 'sim') mark('valida', !state.valida);
  mark('sigla', !state.sigla);

  mark('interp', !state.interp);
  mark('decrec', !state.decrec);
  mark('camaraArea', !state.camaraArea);
  mark('camaraNumero', !state.camaraNumero);
  mark('emaberto', state.emaberto === '');

  mark('envio', !state.envio);
  mark('consulta', state.consulta === '');
  if (state.consulta === 'sim') mark('leitura', !state.leitura);
  mark('emdobro', !state.emdobro);
  const envioDate = parseInputDate(state.envio);
  const interpDate = parseInputDate(state.interp);
  if (interpDate && envioDate && interpDate < envioDate) {
    errors.envio = true;
    errors.interp = true;
  }

  mark('multa', state.multa === '');
  if (state.multa === 'sim, não recolhida') mark('motivo', !state.motivo);
  mark('dispensa', state.dispensa === '');
  if (state.dispensa === 'não') {
    mark('gratuidade', state.gratuidade === '');
    if (state.gratuidade === 'já é ou afirma ser beneficiário') {
      mark('deferida', state.deferida === '');
      if (state.deferida === 'sim') mark('movdef', !state.movdef);
      if (state.deferida === 'não') {
        mark('requerida', state.requerida === '');
        if (state.requerida === 'sim') mark('movped', !state.movped);
      }
      mark('atoincomp', state.atoincomp === '');
    }
    if (state.gratuidade === 'não invocada') {
      mark('comprova', state.comprova === '');
      if (state.comprova === 'no dia útil seguinte ao término do prazo') {
        mark('apos16', state.apos16 === '');
      }
    }
  }
  if (state.guia === 'sim') {
    mark('guiorig', state.guiorig === '');
  }
  if (state.dispensa !== 'sim' && (state.guia === 'sim' || state.comp === 'sim')) {
    mark('funjusmov', !state.funjusmov);
  }
  if (
    state.dispensa === 'não' &&
    state.gratuidade === 'não invocada' &&
    state.comprova &&
    state.comprova !== 'ausente'
  ) {
    const guiaMov = state.grumov?.trim();
    const compMov = state.grumovComp?.trim();
    mark('grumov', !guiaMov && !compMov);
  }
  if (state.comp === 'sim') {
    mark('comptipo', !state.comptipo);
    mark('codbar', !state.codbar);
  }
  const valorFJValue = state.valorfj.trim();
  const valorFJNum = Number(valorFJValue || 0);
  const funjusBelow =
    state.dispensa === 'não' &&
    state.gratuidade === 'não invocada' &&
    valorFJValue !== '' &&
    Number.isFinite(valorFJNum) &&
    valorFJNum < outputs.deverFJ;
  if (funjusBelow) mark('funjusObs', !state.funjusObs.trim());

  mark('subscritor', !state.subscritor);
  if (state.subscritor === 'procurador nomeado') mark('nomemovi', !state.nomemovi);
  if (state.subscritor === 'advogado particular') {
    mark('movis', !state.movis);
    mark('cadeia', state.cadeia === '');
    if (state.cadeia === 'não') mark('faltante', !state.faltante);
  }
  mark('suspefeito', state.suspefeito === '');
  if (state.suspefeito === 'requerido em petição apartada') mark('autuado', state.autuado === '');
  mark('exclusivi', state.exclusivi === '');
  if (state.exclusivi === 'requerida') {
    mark('cadastrada', state.cadastrada === '');
    if (state.cadastrada === 'não') mark('regular', state.regular === '');
  }

  if (state.emaberto !== 'sim') {
    mark('contrarra', state.contrarra === '');
    if (state.contrarra !== 'apresentadas') {
      mark('intimado', state.intimado === '');
      if (state.intimado === 'sim') {
        mark('crraberto', state.crraberto === '');
        if (state.crraberto === 'não') mark('decursocrr', state.decursocrr === '');
      } else if (state.intimado === 'não') {
        mark('semadv', state.semadv === '');
      }
    }
  }

  mark('emepe', state.emepe === '');
  if (state.emepe === 'sim') {
    mark('mani', state.mani === '');
    if (state.mani === 'sim') {
      mark('teormani', state.teormani === '');
      mark('manimovis', !state.manimovis);
      if (state.teormani === 'mera ciência') mark('decursomp', state.decursomp === '');
    } else if (state.mani === 'não') {
      mark('remetido', state.remetido === '');
      if (state.remetido === 'sim') mark('decursomp', state.decursomp === '');
    }
  }

  return errors;
};

const steps: { id: StepId; label: string; icon: typeof FileText }[] = [
  { id: 'recurso', label: 'Recurso', icon: FileText },
  { id: 'dados', label: 'Dados iniciais', icon: Calendar },
  { id: 'tempest', label: 'Tempestividade', icon: ClipboardList },
  { id: 'preparo', label: 'Preparo e custas', icon: ShieldAlert },
  { id: 'processo', label: 'Representação e pedidos', icon: AlertTriangle },
  { id: 'resumo', label: 'Resumo', icon: CheckCircle2 },
];

const stepFields: Record<StepId, (keyof TriagemState)[]> = {
  recurso: ['tipo', 'acordo', 'valido', 'desist', 'valida', 'sigla'],
  dados: ['interp', 'decrec', 'camaraArea', 'camaraNumero', 'emaberto'],
  tempest: ['envio', 'consulta', 'leitura', 'emdobro'],
  preparo: [
    'multa',
    'motivo',
    'dispensa',
    'gratuidade',
    'deferida',
    'movdef',
    'requerida',
    'movped',
    'atoincomp',
    'comprova',
    'apos16',
    'grumov',
    'funjusmov',
    'guia',
    'guiorig',
    'comp',
    'comptipo',
    'codbar',
    'funjusObs',
  ],
  processo: [
    'subscritor',
    'nomemovi',
    'movis',
    'cadeia',
    'faltante',
    'suspefeito',
    'autuado',
    'exclusivi',
    'cadastrada',
    'regular',
    'contrarra',
    'contramovis',
    'intimado',
    'intimovi',
    'crraberto',
    'decursocrr',
    'semadv',
    'emepe',
    'mani',
    'teormani',
    'manimovis',
    'decursomp',
    'remetido',
  ],
  resumo: [],
};

const InputLabel = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
    <span className="min-h-[2.5rem] leading-tight">{label}</span>
    {children}
  </label>
);

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="card-surface relative bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl p-6 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.55)] overflow-hidden">
    <div className="absolute inset-x-6 top-0 h-[2px] bg-gradient-to-r from-slate-900 via-amber-500 to-teal-500 opacity-80" />
    <div className="absolute -right-12 -top-10 h-28 w-28 rounded-full bg-amber-200/30 blur-3xl" />
    <div className="relative space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 font-display tracking-tight">{title}</h3>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.22em]">Ficha</span>
      </div>
      <div className="grid gap-4">{children}</div>
    </div>
  </div>
);

const Pill = ({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}) => {
  const tones = {
    neutral: 'bg-white/80 border-slate-200 text-slate-700',
    success: 'bg-emerald-50/90 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50/90 border-amber-200 text-amber-800',
  };
  return (
    <span
      className={`pill inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold shadow-sm ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

const MetricCard = ({
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) => {
  const tones = {
    neutral: 'border-white/70 bg-white/85 text-slate-900 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)]',
    positive: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900 shadow-[0_18px_40px_-30px_rgba(16,185,129,0.35)]',
    negative: 'border-amber-200/80 bg-amber-50/90 text-amber-900 shadow-[0_18px_40px_-30px_rgba(245,158,11,0.35)]',
  };
  return (
    <div className={`metric-surface rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.24em] font-semibold text-slate-500">{label}</p>
      <p className="text-lg font-semibold leading-tight mt-1">{value}</p>
      {helper && <p className="text-xs mt-1 text-slate-600">{helper}</p>}
    </div>
  );
};

const StepChip = ({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof FileText;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'step' : undefined}
    className={`step-chip group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition shadow-sm whitespace-nowrap ${
      active
        ? 'border-slate-900 bg-slate-900 text-white shadow-[0_12px_30px_-20px_rgba(15,23,42,0.6)]'
        : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300 hover:shadow-md'
    }`}
  >
    <Icon className={`h-4 w-4 ${active ? 'text-amber-200' : 'text-slate-500 group-hover:text-slate-700'}`} />
    <span>{label}</span>
  </button>
);

const Watermark = () => (
  <div className="watermark pointer-events-none fixed bottom-4 right-4 z-30 max-w-[320px] text-right text-[9px] leading-tight opacity-80">
    <div className="flex flex-col gap-[1px]">
      <span>Desenvolvido por :</span>
      <span className="block h-[3px]" aria-hidden="true" />
      <span>P-SEP-AR - GESTÃO 2025/2026</span>
      <span className="block h-[3px]" aria-hidden="true" />
      <span>Assessoria de Recursos aos Tribunais Superiores</span>
      <span className="block h-[3px]" aria-hidden="true" />
      <span>(STF e STJ) da Secretaria Especial da Presidência</span>
      <span className="block h-[3px]" aria-hidden="true" />
      <span>Elvertoni Martelli Coimbr</span>
      <span className="block h-[3px]" aria-hidden="true" />
      <span>Luís Gustavo Arruda Lançoni</span>
      <span className="block h-[3px]" aria-hidden="true" />
      <span className="font-semibold">Narley Almeida de Sousa</span>
      <span className="block h-[3px]" aria-hidden="true" />
      <span>Rodrigo Louzano</span>
    </div>
  </div>
);

const App = () => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [authEmailLocal, setAuthEmailLocal] = useState('');
  const [rememberLogin, setRememberLogin] = useState(() => {
    try {
      const stored = localStorage.getItem(REMEMBER_KEY);
      return stored ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [blockedNotice, setBlockedNotice] = useState('');
  const [storageKey, setStorageKey] = useState(`${STORAGE_KEY}_anon`);
  const [state, setState] = useState<TriagemState>(initialState);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedCons, setCopiedCons] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const triageLoggedRef = useRef(false);
  const triageLogInFlightRef = useRef(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: '', photoURL: '' });
  const [profileNotice, setProfileNotice] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [adminRequestNotice, setAdminRequestNotice] = useState('');
  const [adminRequestBusy, setAdminRequestBusy] = useState(false);
  const [selfDeleteOpen, setSelfDeleteOpen] = useState(false);
  const [selfDeletePassword, setSelfDeletePassword] = useState('');
  const [selfDeleteError, setSelfDeleteError] = useState('');
  const [selfDeleteBusy, setSelfDeleteBusy] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminFilter, setAdminFilter] = useState('');
  const [adminEdits, setAdminEdits] = useState<
    Record<string, { name: string; role: UserRole; active: boolean }>
  >({});
  const [adminBusyUid, setAdminBusyUid] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState('');
  const [deleteTargetUid, setDeleteTargetUid] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteBusyUid, setDeleteBusyUid] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const isAdmin = profile?.role === 'admin';
  const authEmailValue = authEmailLocal
    ? `${authEmailLocal.trim().toLowerCase()}@${allowedEmailDomain}`
    : '';

  useEffect(() => {
    if (!firebaseEnabled || !auth || !db) {
      setAuthReady(true);
      return;
    }
    let active = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setProfile(null);
      setAuthReady(false);
      if (!user) {
        if (active) setAuthReady(true);
        return;
      }
      try {
        const email = user.email || '';
        if (!isAllowedEmail(email)) {
          if (active) {
            setBlockedNotice(`Acesso restrito a contas @${allowedEmailDomain}.`);
          }
          await signOut(auth);
          return;
        }
        if (!user.emailVerified) {
          if (active) {
            setBlockedNotice('Confirme o e-mail para acessar a plataforma.');
          }
          await signOut(auth);
          return;
        }
        const normalized = normalizeEmail(email);
        const isBootstrapAdmin = normalized ? bootstrapAdminEmails.includes(normalized) : false;
        const now = new Date().toISOString();
        const userRef = doc(db, USERS_COLLECTION, user.uid);
        const snap = await getDoc(userRef);
        let nextProfile: UserProfile;
        if (!snap.exists()) {
          nextProfile = {
            uid: user.uid,
            email,
            name: user.displayName || '',
            photoURL: user.photoURL || '',
            role: isBootstrapAdmin ? 'admin' : 'user',
            active: true,
            triageCount: 0,
            theme: 'light',
            createdAt: now,
            updatedAt: now,
          };
          await setDoc(userRef, nextProfile);
        } else {
          const data = snap.data() as Partial<UserProfile>;
          nextProfile = {
            uid: user.uid,
            email: data.email ?? email,
            name: data.name ?? user.displayName ?? '',
            photoURL: data.photoURL ?? user.photoURL ?? '',
            role: data.role ?? (isBootstrapAdmin ? 'admin' : 'user'),
            active: data.active ?? true,
            triageCount: data.triageCount ?? 0,
            theme: data.theme ?? 'light',
            createdAt: data.createdAt ?? now,
            updatedAt: now,
          };
          const needsMerge =
            !data.email || !data.name || !data.role || data.active === undefined || !data.createdAt;
          if (needsMerge) {
            if (isBootstrapAdmin) {
              await setDoc(userRef, nextProfile, { merge: true });
            } else if (!data.name && nextProfile.name) {
              await updateDoc(userRef, { name: nextProfile.name, updatedAt: now });
            }
          }
        }
        if (!nextProfile.active) {
          if (active) setBlockedNotice('Conta desativada. Procure um administrador.');
          await signOut(auth);
          return;
        }
        if (active) {
          setProfile(nextProfile);
          setAuthError('');
          setAuthMessage('');
          setBlockedNotice('');
        }
      } catch (err) {
        if (active) {
          const message = formatAuthError(err);
          setAuthError(message);
          if ((err as { code?: string }).code === 'permission-denied') {
            setAuthMessage('Aplique as regras do Firestore e tente novamente.');
          }
        }
      } finally {
        if (active) setAuthReady(true);
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    const nextKey = authUser?.uid ? `${STORAGE_KEY}_${authUser.uid}` : `${STORAGE_KEY}_anon`;
    setStorageKey(nextKey);
  }, [authUser?.uid]);

  useEffect(() => {
    const stored = loadStoredState(storageKey);
    setState(stored.state);
    setLastSavedAt(stored.savedAt);
    setStep(0);
  }, [storageKey]);

  useEffect(() => {
    if (!isAdmin || !db) {
      setAdminUsers([]);
      return;
    }
    const usersQuery = query(collection(db, USERS_COLLECTION));
    const unsub = onSnapshot(
      usersQuery,
      (snapshot) => {
        const rawUsers = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<UserProfile>;
          const role = data.role === 'admin' ? 'admin' : 'user';
          return {
            uid: docSnap.id,
            email: data.email ?? '',
            name: data.name ?? '',
            photoURL: data.photoURL ?? '',
            role,
            active: data.active ?? true,
            triageCount: data.triageCount ?? 0,
            theme: data.theme ?? 'light',
            createdAt: data.createdAt ?? '',
            updatedAt: data.updatedAt ?? '',
          };
        });
        const nextUsers = dedupeUsers(rawUsers);
        nextUsers.sort((a, b) => {
          const nameCompare = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
          if (nameCompare !== 0) return nameCompare;
          return a.email.localeCompare(b.email, 'pt-BR', { sensitivity: 'base' });
        });
        setAdminUsers(nextUsers);
      },
      (err) => {
        setAdminNotice(formatAuthError(err));
      }
    );
    return () => unsub();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setAdminOpen(false);
      setDeleteTargetUid(null);
      setDeletePassword('');
      setDeleteError('');
    }
  }, [isAdmin]);

  useEffect(() => {
    if (adminOpen) return;
    setDeleteTargetUid(null);
    setDeletePassword('');
    setDeleteError('');
  }, [adminOpen]);

  useEffect(() => {
    if (profileOpen) return;
    setSelfDeleteOpen(false);
    setSelfDeletePassword('');
    setSelfDeleteError('');
  }, [profileOpen]);

  useEffect(() => {
    if (!profile) return;
    setProfileDraft({ name: profile.name ?? '', photoURL: profile.photoURL ?? '' });
    setTheme(profile.theme ?? 'light');
    setAdminRequestNotice('');
  }, [profile?.uid]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    try {
      localStorage.setItem(REMEMBER_KEY, String(rememberLogin));
    } catch {
      /* ignore */
    }
  }, [rememberLogin]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-dark', theme === 'dark');
    const key = authUser?.uid ? `triario_theme_${authUser.uid}` : 'triario_theme_anon';
    try {
      localStorage.setItem(key, theme);
    } catch {
      /* ignore */
    }
  }, [theme, authUser?.uid]);

  const outputs = useMemo(() => computeOutputs(state), [state]);
  const summaryText = useMemo(() => buildResumoText(state, outputs), [state, outputs]);
  const consequencias = useMemo(() => buildConsequencias(state, outputs), [state, outputs]);
  const fieldErrors = useMemo(() => computeFieldErrors(state, outputs), [state, outputs]);
  const stepErrorCounts = useMemo(() => {
    const counts: Record<StepId, number> = {
      recurso: 0,
      dados: 0,
      tempest: 0,
      preparo: 0,
      processo: 0,
      resumo: 0,
    };
    (Object.keys(stepFields) as StepId[]).forEach((stepId) => {
      counts[stepId] = stepFields[stepId].reduce(
        (total, key) => total + (fieldErrors[key] ? 1 : 0),
        0
      );
    });
    return counts;
  }, [fieldErrors]);
  const filteredUsers = useMemo(() => {
    const term = adminFilter.trim().toLowerCase();
    if (!term) return adminUsers;
    return adminUsers.filter((user) => {
      const haystack = `${user.name} ${user.email}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [adminFilter, adminUsers]);
  const totalTriages = useMemo(
    () => adminUsers.reduce((total, user) => total + (user.triageCount || 0), 0),
    [adminUsers]
  );
  const triageLeaderboard = useMemo(() => {
    const sorted = [...adminUsers];
    sorted.sort((a, b) => (b.triageCount || 0) - (a.triageCount || 0));
    return sorted;
  }, [adminUsers]);
  const isPublicEntity = state.dispensa === 'sim';
  const valorFJValue = state.valorfj.trim();
  const valorFJNum = Number(valorFJValue || 0);
  const funjusBelow =
    state.dispensa === 'não' &&
    state.gratuidade === 'não invocada' &&
    valorFJValue !== '' &&
    Number.isFinite(valorFJNum) &&
    valorFJNum < outputs.deverFJ;
  const funjusObsRequired = funjusBelow && !state.funjusObs.trim();
  const funjusObs = state.funjusObs.trim();
  const currentStepId = steps[step].id;
  const currentStepErrorCount = stepErrorCounts[currentStepId] ?? 0;

  const handleChange = <K extends keyof TriagemState>(key: K, value: TriagemState[K]) => {
    setState((prev) => {
      if (key === 'funjusmov') {
        const nextValue = String(value);
        const mark = nextValue.trim() ? 'sim' : '';
        return {
          ...prev,
          [key]: value,
          guia: mark,
          comp: mark,
        };
      }
      if (key === 'grumov') {
        const nextValue = String(value);
        const shouldMirror = !prev.grumovComp?.trim() || prev.grumovComp === prev.grumov;
        return {
          ...prev,
          [key]: value,
          grumovComp: shouldMirror ? nextValue : prev.grumovComp,
        };
      }
      return { ...prev, [key]: value };
    });
  };

  const inputClass = (key: keyof TriagemState, extra?: string) => {
    const value = state[key];
    const filled = typeof value === 'string' ? value.trim() !== '' : Boolean(value);
    const base = filled ? 'input input-success' : 'input';
    return extra ? `${base} ${extra}` : base;
  };

  useEffect(() => {
    try {
      const now = new Date();
      const payload: StoredPayload = {
        __version: STORAGE_VERSION,
        state,
        savedAt: now.toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLastSavedAt(now);
    } catch {
      /* ignore */
    }
  }, [state, storageKey]);

  useEffect(() => {
    if (!state.usarIntegral) return;
    const targetValorST = outputs.deverST ? outputs.deverST.toFixed(2) : '';
    const targetValorFJ = outputs.deverFJ ? outputs.deverFJ.toFixed(2) : '';
    setState((prev) => {
      if (!prev.usarIntegral) return prev;
      if (prev.valorst === targetValorST && prev.valorfj === targetValorFJ) return prev;
      return { ...prev, valorst: targetValorST, valorfj: targetValorFJ };
    });
  }, [state.usarIntegral, outputs.deverST, outputs.deverFJ]);

  useEffect(() => {
    if (!isPublicEntity) return;
    setState((prev) => {
      if (prev.dispensa !== 'sim') return prev;
      let changed = false;
      const next: TriagemState = { ...prev };
      if (next.emdobro !== 'em dobro') {
        next.emdobro = 'em dobro';
        changed = true;
      }
      if (next.subscritor !== 'procurador público') {
        next.subscritor = 'procurador público';
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [isPublicEntity]);

  useEffect(() => {
    if (state.consulta === 'sim') return;
    if (!state.leitura) return;
    setState((prev) => (prev.leitura ? { ...prev, leitura: '' } : prev));
  }, [state.consulta, state.leitura]);

  useEffect(() => {
    if (state.emdobro) return;
    if (
      state.gratuidade === 'presumida (defensor público, dativo ou NPJ)' ||
      state.subscritor === 'procurador nomeado'
    ) {
      setState((prev) => (prev.emdobro ? prev : { ...prev, emdobro: 'em dobro' }));
    }
  }, [state.emdobro, state.gratuidade, state.subscritor]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    main.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, [step]);

  const downloadResumo = () => {
    void recordTriageCompletion();
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSigla = sanitizeFilename(state.sigla);
    a.download = `resumo-triagem-${safeSigla || 'triario'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyText = async (text: string) => {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      return true;
    } catch {
      return false;
    }
  };

  const copyResumo = async () => {
    void recordTriageCompletion();
    const ok = await copyText(summaryText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setCopied(false);
    }
  };

  const copyConsequencias = async () => {
    const text = consequencias.join('\n');
    const ok = await copyText(text);
    if (ok) {
      setCopiedCons(true);
      setTimeout(() => setCopiedCons(false), 1500);
    } else {
      setCopiedCons(false);
    }
  };

  const handleLogin = async () => {
    if (!auth) return;
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    if (!authEmailLocal.trim()) {
      setAuthError('Informe seu usuário @tjpr.jus.br.');
      setAuthBusy(false);
      return;
    }
    if (!isAllowedEmail(authEmailValue)) {
      setAuthError(`Use um e-mail @${allowedEmailDomain} para entrar.`);
      setAuthBusy(false);
      return;
    }
    try {
      await setPersistence(auth, rememberLogin ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, authEmailValue, authPassword);
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!auth) return;
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    if (!authEmailLocal.trim()) {
      setAuthError('Informe seu usuário @tjpr.jus.br.');
      setAuthBusy(false);
      return;
    }
    if (!isAllowedEmail(authEmailValue)) {
      setAuthError(`O cadastro é permitido apenas para e-mails @${allowedEmailDomain}.`);
      setAuthBusy(false);
      return;
    }
    if (authPassword.trim().length < 6) {
      setAuthError('A senha precisa ter pelo menos 6 caracteres.');
      setAuthBusy(false);
      return;
    }
    if (authPassword !== authPasswordConfirm) {
      setAuthError('As senhas não conferem.');
      setAuthBusy(false);
      return;
    }
    try {
      await setPersistence(auth, rememberLogin ? browserLocalPersistence : browserSessionPersistence);
      const cred = await createUserWithEmailAndPassword(auth, authEmailValue, authPassword);
      if (authName.trim()) {
        await updateProfile(cred.user, { displayName: authName.trim() });
      }
      try {
        await sendEmailVerification(cred.user);
      } catch (err) {
        setAuthError(formatAuthError(err));
      }
      setAuthMessage('Conta criada. Confirme o e-mail para entrar.');
      setAuthPassword('');
      setAuthPasswordConfirm('');
      setAuthMode('login');
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!auth) return;
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    if (!authEmailLocal.trim()) {
      setAuthError('Informe seu usuário @tjpr.jus.br.');
      setAuthBusy(false);
      return;
    }
    if (!isAllowedEmail(authEmailValue)) {
      setAuthError(`Use um e-mail @${allowedEmailDomain} para redefinir a senha.`);
      setAuthBusy(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, authEmailValue);
      setAuthMessage('Enviamos um e-mail para redefinir sua senha.');
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth || !authUser) return;
    if (resendCooldown > 0) return;
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    try {
      await sendEmailVerification(authUser);
      setResendCooldown(20);
      setAuthMessage('E-mail de confirmação reenviado.');
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!auth || !authUser) return;
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');
    try {
      await reload(authUser);
      if (authUser.emailVerified) {
        setAuthMessage('E-mail confirmado. Você já pode entrar.');
      } else {
        setAuthError('E-mail ainda não confirmado.');
      }
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    setState(initialState);
    setStep(0);
    setAdminOpen(false);
    setProfileOpen(false);
    setProfileNotice('');
    setAdminRequestNotice('');
    setAdminRequestBusy(false);
    setResendCooldown(0);
    triageLoggedRef.current = false;
    triageLogInFlightRef.current = false;
  };

  const updateAdminDraft = (
    user: UserProfile,
    patch: Partial<{ name: string; role: UserRole; active: boolean }>
  ) => {
    setAdminEdits((prev) => {
      const current = prev[user.uid] ?? { name: user.name, role: user.role, active: user.active };
      return { ...prev, [user.uid]: { ...current, ...patch } };
    });
  };

  const getAdminDraft = (user: UserProfile) =>
    adminEdits[user.uid] ?? { name: user.name, role: user.role, active: user.active };

  const handleSaveUser = async (user: UserProfile) => {
    if (!db || !auth) return;
    const draft = getAdminDraft(user);
    const adminCount = adminUsers.filter((item) => item.role === 'admin').length;
    const isSelf = authUser?.uid === user.uid;
    if (isSelf && adminCount <= 1 && draft.role !== 'admin') {
      setAdminNotice('Você é o último admin. Não é possível remover seu próprio acesso.');
      return;
    }
    if (adminCount <= 1 && user.role === 'admin' && draft.role !== 'admin') {
      setAdminNotice('É necessário manter pelo menos um admin ativo.');
      return;
    }
    if (
      draft.name === user.name &&
      draft.role === user.role &&
      draft.active === user.active
    ) {
      setAdminNotice('Nenhuma alteração pendente para salvar.');
      return;
    }
    setAdminBusyUid(user.uid);
    setAdminNotice('');
    try {
      await updateDoc(doc(db, USERS_COLLECTION, user.uid), {
        name: draft.name,
        role: draft.role,
        active: draft.active,
        updatedAt: new Date().toISOString(),
      });
      setAdminNotice('Cadastro atualizado.');
    } catch (err) {
      setAdminNotice(formatAuthError(err));
    } finally {
      setAdminBusyUid(null);
    }
  };

  const handleResetForUser = async (email: string) => {
    if (!auth) return;
    setAdminNotice('');
    try {
      await sendPasswordResetEmail(auth, email);
      setAdminNotice(`E-mail de redefinição enviado para ${email}.`);
    } catch (err) {
      setAdminNotice(formatAuthError(err));
    }
  };

  const handleDemoteFromAdmin = async (user: UserProfile) => {
    if (!db) return;
    const adminCount = adminUsers.filter((item) => item.role === 'admin').length;
    const isSelf = authUser?.uid === user.uid;
    if (isSelf) {
      setAdminNotice('Você não pode remover seu próprio acesso de admin.');
      return;
    }
    if (adminCount <= 1) {
      setAdminNotice('É necessário manter pelo menos um admin ativo.');
      return;
    }
    setAdminNotice('');
    setAdminBusyUid(user.uid);
    try {
      await updateDoc(doc(db, USERS_COLLECTION, user.uid), {
        role: 'user',
        updatedAt: new Date().toISOString(),
      });
      setAdminNotice(`${user.email || 'Usuário'} removido do perfil admin.`);
      setAdminEdits((prev) => {
        if (!prev[user.uid]) return prev;
        return { ...prev, [user.uid]: { ...prev[user.uid], role: 'user' } };
      });
    } catch (err) {
      setAdminNotice(formatAuthError(err));
    } finally {
      setAdminBusyUid(null);
    }
  };

  const recordTriageCompletion = async () => {
    if (!db || !authUser) return;
    if (triageLoggedRef.current || triageLogInFlightRef.current) return;
    triageLogInFlightRef.current = true;
    try {
      await updateDoc(doc(db, USERS_COLLECTION, authUser.uid), {
        triageCount: increment(1),
        updatedAt: new Date().toISOString(),
      });
      triageLoggedRef.current = true;
      setProfile((prev) =>
        prev ? { ...prev, triageCount: (prev.triageCount || 0) + 1 } : prev
      );
    } catch (err) {
      setAdminNotice(formatAuthError(err));
    } finally {
      triageLogInFlightRef.current = false;
    }
  };

  const handleProfileSave = async () => {
    if (!auth || !authUser || !db || !profile) return;
    const name = profileDraft.name.trim();
    const photoURL = profileDraft.photoURL.trim();
    const updates: Partial<UserProfile> = {};
    if (name !== profile.name) updates.name = name;
    if (photoURL !== profile.photoURL) updates.photoURL = photoURL;
    if (Object.keys(updates).length === 0) {
      setProfileNotice('Nenhuma alteração para salvar.');
      return;
    }
    setProfileBusy(true);
    setProfileNotice('');
    try {
      await updateProfile(authUser, {
        displayName: name || null,
        photoURL: photoURL || null,
      });
      await updateDoc(doc(db, USERS_COLLECTION, authUser.uid), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      setProfileNotice('Perfil atualizado.');
    } catch (err) {
      setProfileNotice(formatAuthError(err));
    } finally {
      setProfileBusy(false);
    }
  };

  const handleProfileResetPassword = async () => {
    if (!auth || !authUser?.email) return;
    setProfileNotice('');
    try {
      await sendPasswordResetEmail(auth, authUser.email);
      setProfileNotice('Enviamos um e-mail para redefinir sua senha.');
    } catch (err) {
      setProfileNotice(formatAuthError(err));
    }
  };

  const handleAdminRequest = async () => {
    if (!authUser || !db) return;
    setAdminRequestNotice('');
    setAdminRequestBusy(true);
    try {
      const requestRef = doc(db, ADMIN_REQUESTS_COLLECTION, authUser.uid);
      const snap = await getDoc(requestRef);
      const now = new Date().toISOString();
      if (snap.exists()) {
        const data = snap.data() as { status?: string };
        if (data.status === 'approved') {
          setAdminRequestNotice('Seu acesso já foi aprovado. Saia e entre novamente.');
        } else if (data.status === 'pending') {
          setAdminRequestNotice('Solicitação já enviada. Aguarde aprovação.');
        } else {
          await setDoc(
            requestRef,
            {
              uid: authUser.uid,
              email: authUser.email ?? '',
              name: authUser.displayName ?? '',
              status: 'pending',
              updatedAt: now,
            },
            { merge: true }
          );
          setAdminRequestNotice('Solicitação reenviada com sucesso.');
        }
      } else {
        await setDoc(requestRef, {
          uid: authUser.uid,
          email: authUser.email ?? '',
          name: authUser.displayName ?? '',
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        });
        setAdminRequestNotice('Solicitação enviada. Aguarde aprovação do admin.');
      }
    } catch (err) {
      setAdminRequestNotice(formatAuthError(err));
    } finally {
      setAdminRequestBusy(false);
    }
  };

  const toggleSelfDelete = () => {
    setSelfDeleteOpen((open) => !open);
    setSelfDeletePassword('');
    setSelfDeleteError('');
  };

  const handleSelfDelete = async () => {
    if (!auth || !authUser || !db) return;
    if (!authUser.email) {
      setSelfDeleteError('E-mail do usuário indisponível.');
      return;
    }
    if (!selfDeletePassword.trim()) {
      setSelfDeleteError('Informe sua senha para confirmar a exclusão.');
      return;
    }
    setSelfDeleteError('');
    setSelfDeleteBusy(true);
    try {
      const credential = EmailAuthProvider.credential(authUser.email, selfDeletePassword);
      await reauthenticateWithCredential(authUser, credential);
      await deleteDoc(doc(db, USERS_COLLECTION, authUser.uid));
      await deleteUser(authUser);
    } catch (err) {
      setSelfDeleteError(formatAuthError(err));
    } finally {
      setSelfDeleteBusy(false);
    }
  };

  const handleThemeToggle = async (next: ThemeMode) => {
    setTheme(next);
    if (!db || !authUser || !profile) return;
    try {
      await updateDoc(doc(db, USERS_COLLECTION, authUser.uid), {
        theme: next,
        updatedAt: new Date().toISOString(),
      });
      setProfile((prev) => (prev ? { ...prev, theme: next } : prev));
    } catch (err) {
      setProfileNotice(formatAuthError(err));
    }
  };

  const handlePromoteToAdmin = async (user: UserProfile) => {
    if (!db) return;
    setAdminNotice('');
    setAdminBusyUid(user.uid);
    try {
      await updateDoc(doc(db, USERS_COLLECTION, user.uid), {
        role: 'admin',
        updatedAt: new Date().toISOString(),
      });
      setAdminNotice(`${user.email || 'Usuário'} promovido a admin.`);
      setAdminEdits((prev) => {
        if (!prev[user.uid]) return prev;
        return { ...prev, [user.uid]: { ...prev[user.uid], role: 'admin' } };
      });
    } catch (err) {
      setAdminNotice(formatAuthError(err));
    } finally {
      setAdminBusyUid(null);
    }
  };

  const openDeletePrompt = (user: UserProfile) => {
    if (deleteTargetUid === user.uid) {
      setDeleteTargetUid(null);
      setDeletePassword('');
      setDeleteError('');
      return;
    }
    setDeleteTargetUid(user.uid);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!auth || !authUser || !db) return;
    if (authUser.uid === user.uid) {
      setDeleteError('Não é possível excluir o próprio usuário.');
      return;
    }
    if (!authUser.email) {
      setDeleteError('E-mail do administrador indisponível.');
      return;
    }
    if (!deletePassword.trim()) {
      setDeleteError('Informe sua senha para confirmar a exclusão.');
      return;
    }
    setDeleteError('');
    setDeleteBusyUid(user.uid);
    try {
      const credential = EmailAuthProvider.credential(authUser.email, deletePassword);
      await reauthenticateWithCredential(authUser, credential);
      await deleteDoc(doc(db, USERS_COLLECTION, user.uid));
      setAdminNotice('Usuário excluído da base.');
      setDeleteTargetUid(null);
      setDeletePassword('');
    } catch (err) {
      setDeleteError(formatAuthError(err));
    } finally {
      setDeleteBusyUid(null);
    }
  };

  const handleAuthSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (authMode === 'login') {
      void handleLogin();
    } else if (authMode === 'register') {
      void handleRegister();
    } else {
      void handleResetPassword();
    }
  };

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const clearStorage = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setState(initialState);
    setStep(0);
    setLastSavedAt(null);
    triageLoggedRef.current = false;
    triageLogInFlightRef.current = false;
  };
  const restart = () => {
    clearStorage();
  };
  const confirmRestart = (message: string, onConfirm?: () => void) => {
    if (!window.confirm(message)) return;
    onConfirm?.();
    restart();
  };

  const renderAuth = () => {
    const needsProfile = Boolean(authUser && !profile);
    return (
      <div className="min-h-screen page-bg text-slate-900 page-enter">
        <div className="min-h-screen flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-lg shadow-slate-300/60 flex items-center justify-center">
                <img src={simbaLogo} alt="Simba-JUD" className="h-full w-full object-cover" />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Simba-JUD</p>
              <h1 className="text-2xl font-semibold text-slate-900 font-display">
                Acesso ao Portal de Triagem
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { id: 'login', label: 'Entrar' },
                { id: 'register', label: 'Criar conta' },
                { id: 'reset', label: 'Redefinir senha' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setAuthMode(item.id as typeof authMode);
                    setAuthError('');
                    setAuthMessage('');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                    authMode === item.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
              {needsProfile && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Perfil não carregado.</p>
                  <p className="mt-1">
                    Verifique as regras do Firestore e domínios autorizados. Se quiser, saia e entre
                    novamente.
                  </p>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-white text-amber-800 hover:shadow-sm transition"
                  >
                    Sair
                  </button>
                </div>
              )}
              <SectionCard title="Credenciais">
                <form
                  className="grid gap-4"
                  onSubmit={handleAuthSubmit}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                >
                  {blockedNotice && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {blockedNotice}
                    </div>
                  )}
                  {authError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {authError}
                    </div>
                  )}
                  {authMessage && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {authMessage}
                    </div>
                  )}
                  {authMode === 'register' && (
                    <InputLabel label="Nome completo">
                      <input
                        className="input"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Digite seu nome"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                      />
                    </InputLabel>
                  )}
                  <InputLabel label="E-mail">
                    <div className="flex items-center">
                      <input
                        className="input rounded-r-none"
                        type="text"
                        value={authEmailLocal}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const cleaned = raw.split('@')[0].replace(/\s+/g, '');
                          setAuthEmailLocal(cleaned);
                        }}
                        placeholder="usuario"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        required
                      />
                      <span className="px-3 py-[0.6rem] border border-l-0 border-slate-200 rounded-r-lg bg-slate-50 text-sm text-slate-600">
                        @{allowedEmailDomain}
                      </span>
                    </div>
                  </InputLabel>
                  {authMode !== 'reset' && (
                    <InputLabel label="Senha">
                      <input
                        className="input"
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        required
                      />
                    </InputLabel>
                  )}
                  {authMode !== 'reset' && (
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                        checked={rememberLogin}
                        onChange={(e) => setRememberLogin(e.target.checked)}
                      />
                      Lembrar login neste dispositivo
                    </label>
                  )}
                  {authMode === 'register' && (
                    <InputLabel label="Confirme a senha">
                      <input
                        className="input"
                        type="password"
                        value={authPasswordConfirm}
                        onChange={(e) => setAuthPasswordConfirm(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        required
                      />
                    </InputLabel>
                  )}
                  {authMode === 'reset' && (
                    <p className="text-xs text-slate-500">
                      Enviaremos um link de redefinição de senha para o seu e-mail.
                    </p>
                  )}
                  {authMode === 'login' && blockedNotice.includes('Confirme') && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={authBusy || resendCooldown > 0}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition disabled:opacity-60"
                      >
                        {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar confirmação'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCheckVerification}
                        disabled={authBusy}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition disabled:opacity-60"
                      >
                        Já confirmei
                      </button>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-black transition shadow-sm disabled:opacity-60"
                  >
                    {authBusy
                      ? 'Aguarde...'
                      : authMode === 'login'
                      ? 'Entrar'
                      : authMode === 'register'
                      ? 'Criar conta'
                      : 'Enviar link'}
                  </button>
                </form>
              </SectionCard>
              <p className="text-center text-xs text-slate-500">
                Cadastro aberto apenas para contas @{allowedEmailDomain}.
              </p>
          </div>
        </div>
        <Watermark />
      </div>
    );
  };

  const renderProfilePanel = () => {
    if (!profileOpen || !profile) return null;
    const displayName = profileDraft.name || profile.email;
    return (
      <div className="mb-6">
        <SectionCard title="Meu perfil">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="avatar-surface h-16 w-16 rounded-2xl border border-slate-200 bg-white/80 flex items-center justify-center overflow-hidden">
                {profileDraft.photoURL ? (
                  <img
                    src={profileDraft.photoURL}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-slate-700">
                    {getInitials(displayName)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="text-xs text-slate-500">{profile.email}</p>
                <p className="text-xs text-slate-500">Triagens: {profile.triageCount || 0}</p>
              </div>
            </div>
            {profileNotice && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {profileNotice}
              </div>
            )}
            {adminRequestNotice && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {adminRequestNotice}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <InputLabel label="Nome">
                <input
                  className="input"
                  value={profileDraft.name}
                  onChange={(e) => setProfileDraft((prev) => ({ ...prev, name: e.target.value }))}
                />
              </InputLabel>
              <InputLabel label="Foto de perfil (URL)">
                <input
                  className="input"
                  placeholder="https://..."
                  value={profileDraft.photoURL}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, photoURL: e.target.value }))
                  }
                />
              </InputLabel>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                  checked={theme === 'dark'}
                  onChange={(e) => handleThemeToggle(e.target.checked ? 'dark' : 'light')}
                />
                Modo escuro
              </label>
              <span className="text-xs text-slate-500">
                Preferência salva neste dispositivo e no perfil.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={profileBusy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-black transition shadow-sm disabled:opacity-60"
              >
                {profileBusy ? 'Salvando...' : 'Salvar perfil'}
              </button>
              <button
                type="button"
                onClick={handleProfileResetPassword}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition"
              >
                Enviar reset de senha
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileDraft((prev) => ({ ...prev, photoURL: '' }));
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition"
              >
                Remover foto
              </button>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={handleAdminRequest}
                  disabled={adminRequestBusy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shadow-sm disabled:opacity-60"
                >
                  {adminRequestBusy ? 'Enviando...' : 'Solicitar acesso admin'}
                </button>
              )}
              <button
                type="button"
                onClick={toggleSelfDelete}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shadow-sm"
              >
                {selfDeleteOpen ? 'Cancelar exclusão' : 'Excluir minha conta'}
              </button>
            </div>
            {selfDeleteOpen && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                <p className="font-semibold">Confirmação de exclusão</p>
                <p className="mt-1">
                  Esta ação é permanente. Informe sua senha para apagar sua conta.
                </p>
                {selfDeleteError && <p className="mt-2 text-xs text-rose-700">{selfDeleteError}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    className="input flex-1 min-w-[200px]"
                    type="password"
                    value={selfDeletePassword}
                    onChange={(e) => {
                      setSelfDeletePassword(e.target.value);
                      if (selfDeleteError) setSelfDeleteError('');
                    }}
                    placeholder="Senha atual"
                    autoComplete="current-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                  />
                  <button
                    type="button"
                    onClick={handleSelfDelete}
                    disabled={selfDeleteBusy}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm disabled:opacity-60"
                  >
                    {selfDeleteBusy ? 'Excluindo...' : 'Excluir conta'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    );
  };

  const renderAdminPanel = () => {
    if (!isAdmin || !adminOpen) return null;
    const adminCount = adminUsers.filter((user) => user.role === 'admin').length;
    return (
      <div className="mb-6 space-y-4">
        <SectionCard title="Dashboard de triagens">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>{totalTriages} triagem(ns) registradas</Pill>
              <Pill>{adminUsers.length} usuário(s)</Pill>
            </div>
            {triageLeaderboard.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhuma triagem registrada.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {triageLeaderboard.map((user) => (
                  <div
                    key={user.uid}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {user.name || user.email || 'Sem nome'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <span className="font-semibold">{user.triageCount || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
        <SectionCard title="Administração de usuários">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input flex-1 min-w-[220px]"
                placeholder="Buscar por nome ou e-mail"
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
              />
              <Pill>{adminUsers.length} usuário(s)</Pill>
              <Pill tone="success">{adminCount} admin(s)</Pill>
            </div>
            {adminNotice && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {adminNotice}
              </div>
            )}
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhum usuário encontrado.</p>
            ) : (
              <div className="grid gap-3">
                {filteredUsers.map((user) => {
                  const draft = getAdminDraft(user);
                  const isSelf = authUser?.uid === user.uid;
                  const disableRoleChange = isSelf && adminCount <= 1;
                  const deleteOpen = deleteTargetUid === user.uid;
                  const disableDelete = isSelf;
                  const canPromote = user.role !== 'admin' && draft.role !== 'admin';
                  const canDemote = user.role === 'admin' && draft.role === 'admin';
                  const disableDemote = isSelf || adminCount <= 1;
                  return (
                    <div
                      key={user.uid}
                      className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {user.name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-slate-500">{user.email || 'E-mail não informado'}</p>
                          <p className="text-xs text-slate-500">Triagens: {user.triageCount || 0}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelf && <Pill>Você</Pill>}
                          {user.role === 'admin' && <Pill tone="success">Admin</Pill>}
                          {!user.active && <Pill tone="warning">Desativado</Pill>}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <InputLabel label="Nome">
                          <input
                            className="input"
                            value={draft.name}
                            onChange={(e) => updateAdminDraft(user, { name: e.target.value })}
                          />
                        </InputLabel>
                        <InputLabel label="Perfil">
                          <select
                            className="input"
                            value={draft.role}
                            disabled={disableRoleChange}
                            onChange={(e) =>
                              updateAdminDraft(user, { role: e.target.value as UserRole })
                            }
                          >
                            <option value="user">Usuário</option>
                            <option value="admin">Admin</option>
                          </select>
                          {disableRoleChange && (
                            <span className="text-xs text-slate-500">
                              Você é o único admin cadastrado.
                            </span>
                          )}
                        </InputLabel>
                        <InputLabel label="Status">
                          <select
                            className="input"
                            value={draft.active ? 'ativo' : 'inativo'}
                            onChange={(e) => updateAdminDraft(user, { active: e.target.value === 'ativo' })}
                          >
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Desativado</option>
                          </select>
                        </InputLabel>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveUser(user)}
                          disabled={adminBusyUid === user.uid}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-black transition shadow-sm disabled:opacity-60"
                        >
                          {adminBusyUid === user.uid ? 'Salvando...' : 'Salvar'}
                        </button>
                        {canPromote && (
                          <button
                            type="button"
                            onClick={() => handlePromoteToAdmin(user)}
                            disabled={adminBusyUid === user.uid}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-60"
                          >
                            Promover a admin
                          </button>
                        )}
                        {canDemote && (
                          <button
                            type="button"
                            onClick={() => handleDemoteFromAdmin(user)}
                            disabled={adminBusyUid === user.uid || disableDemote}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition shadow-sm disabled:opacity-60"
                          >
                            Remover admin
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResetForUser(user.email)}
                          disabled={!user.email}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition disabled:opacity-60"
                        >
                          Enviar reset de senha
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeletePrompt(user)}
                          disabled={disableDelete}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shadow-sm disabled:opacity-60"
                        >
                          {deleteOpen ? 'Cancelar exclusão' : 'Excluir usuário'}
                        </button>
                      </div>
                      {deleteOpen && (
                        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                          <p className="font-semibold">Confirmação de exclusão</p>
                          <p className="mt-1">
                            Para excluir este usuário, informe sua senha de administrador.
                          </p>
                          {deleteError && <p className="mt-2 text-xs text-rose-700">{deleteError}</p>}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <input
                              className="input flex-1 min-w-[200px]"
                              type="password"
                              value={deletePassword}
                              onChange={(e) => {
                                setDeletePassword(e.target.value);
                                if (deleteError) setDeleteError('');
                              }}
                              placeholder="Senha do admin"
                              autoComplete="current-password"
                              data-lpignore="true"
                              data-1p-ignore="true"
                              data-bwignore="true"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              disabled={deleteBusyUid === user.uid}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm disabled:opacity-60"
                            >
                              {deleteBusyUid === user.uid ? 'Excluindo...' : 'Excluir'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    );
  };

  const renderStep = () => {
    const content = (() => {
      switch (steps[step].id) {
        case 'recurso':
          return (
            <div className="grid lg:grid-cols-2 gap-4">
              <SectionCard title="Triar um novo recurso">
                <div className="grid gap-4">
                  <InputLabel label="Tipo">
                    <select
                      className={inputClass('tipo')}
                      value={state.tipo}
                      onChange={(e) => handleChange('tipo', e.target.value as TipoRecurso)}
                    >
                      <option value="">Selecione</option>
                      <option value="Especial">Especial</option>
                      <option value="Extraordinário">Extraordinário</option>
                    </select>
                  </InputLabel>
                  <InputLabel label="Sigla para minutas">
                    <input
                      className={inputClass('sigla')}
                      placeholder="AR-99"
                      value={state.sigla}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleChange('sigla', value.replace(/^[aA][rR]/, 'AR'));
                      }}
                    />
                  </InputLabel>
                </div>
                <div className="grid gap-4">
                  <InputLabel label="Acordo">
                    <select
                      className={inputClass('acordo')}
                      value={state.acordo}
                      onChange={(e) => handleChange('acordo', e.target.value as YesNo)}
                    >
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="não">Não</option>
                    </select>
                  </InputLabel>
                  {state.acordo === 'sim' && (
                    <InputLabel label="Acordo válido?">
                      <select
                        className={inputClass('valido')}
                        value={state.valido}
                        onChange={(e) => handleChange('valido', e.target.value as YesNo)}
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="não">Não</option>
                      </select>
                    </InputLabel>
                  )}
                </div>
                <div className="grid gap-4">
                  <InputLabel label="Desistência">
                    <select
                      className={inputClass('desist')}
                      value={state.desist}
                      onChange={(e) => handleChange('desist', e.target.value as YesNo)}
                    >
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="não">Não</option>
                    </select>
                  </InputLabel>
                  {state.desist === 'sim' && (
                    <InputLabel label="Desistência válida?">
                      <select
                        className={inputClass('valida')}
                        value={state.valida}
                        onChange={(e) => handleChange('valida', e.target.value as YesNo)}
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="não">Não</option>
                      </select>
                    </InputLabel>
                  )}
                </div>
              </SectionCard>
              <SectionCard title="Ajuda rápida">
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>
                    <Pill>Importante</Pill> Confirme a validade de acordos e desistências antes de prosseguir.
                  </li>
                  <li>
                    <Pill>Tipificação</Pill> “Especial” aplica tabela STJ; “Extraordinário” aplica tabela STF.
                  </li>
                  <li>
                    <Pill>Sigla</Pill> Use o padrão interno (ex.: AR-130E+T) para a minuta/post-it.
                  </li>
                </ul>
              </SectionCard>
            </div>
          );
        case 'dados':
          return (
            <div className="grid lg:grid-cols-2 gap-4">
              <SectionCard title="Dados iniciais">
                <div className="grid gap-4">
                  <InputLabel label="Interposição (data)">
                    <input
                      type="date"
                      className={inputClass('interp')}
                      value={state.interp}
                      onChange={(e) => handleChange('interp', e.target.value)}
                    />
                  </InputLabel>
                  <InputLabel label="Decisão recorrida">
                    <select
                      className={inputClass('decrec')}
                      value={state.decrec}
                      onChange={(e) =>
                        handleChange('decrec', e.target.value as TriagemState['decrec'])
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="colegiada/acórdão">colegiada/acórdão</option>
                      <option value="monocrática/singular">Monocrática/singular</option>
                    </select>
                  </InputLabel>
                </div>
                <div className="grid gap-4">
                  <InputLabel label="Câmara (ramo)">
                    <select
                      className={inputClass('camaraArea')}
                      value={state.camaraArea}
                      onChange={(e) => handleChange('camaraArea', e.target.value as CamaraArea)}
                    >
                      <option value="">Selecione</option>
                      <option value="Cível">Cível</option>
                      <option value="Crime">Crime</option>
                    </select>
                  </InputLabel>
                  <InputLabel label="Número da Câmara">
                    <input
                      className={inputClass('camaraNumero', 'no-spinner')}
                      type="number"
                      min={1}
                      placeholder="Ex.: 7"
                      value={state.camaraNumero}
                      onChange={(e) => handleChange('camaraNumero', e.target.value)}
                    />
                  </InputLabel>
                  <InputLabel label="Prazo em aberto na origem?">
                    <select
                      className={inputClass('emaberto')}
                      value={state.emaberto}
                      onChange={(e) => handleChange('emaberto', e.target.value as YesNo)}
                    >
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="não">Não</option>
                    </select>
                  </InputLabel>
                </div>
              </SectionCard>
              <SectionCard title="Checklist rápido">
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Se for decisão monocrática, o fluxo deve seguir até a etapa de custas.</li>
                  <li>• “Prazo em aberto” ignora contrarrazões (serão tratadas depois).</li>
                </ul>
              </SectionCard>
            </div>
          );
        case 'tempest':
          return (
            <div className="grid lg:grid-cols-2 gap-4">
              <SectionCard title="Tempestividade">
                <div className="grid gap-4">
                  <InputLabel label="Envio (expedição) da intimação">
                    <input
                      type="date"
                      className={inputClass('envio')}
                      value={state.envio}
                      onChange={(e) => handleChange('envio', e.target.value)}
                    />
                  </InputLabel>
                  <InputLabel label="Consulta eletrônica (leitura)">
                    <select
                      className={inputClass('consulta')}
                      value={state.consulta}
                      onChange={(e) => handleChange('consulta', e.target.value as YesNo)}
                    >
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="não">Não</option>
                    </select>
                  </InputLabel>
                  {state.consulta === 'sim' && (
                    <InputLabel label="Data da leitura">
                      <input
                        type="date"
                        className={inputClass('leitura')}
                        value={state.leitura}
                        onChange={(e) => handleChange('leitura', e.target.value)}
                      />
                    </InputLabel>
                  )}
                  <InputLabel label="Prazo">
                    <select
                      className={inputClass('emdobro')}
                      value={state.emdobro}
                      disabled={isPublicEntity}
                      onChange={(e) => handleChange('emdobro', e.target.value as TriagemState['emdobro'])}
                    >
                      <option value="">Selecione</option>
                      <option value="simples">Simples (15 dias)</option>
                      <option value="em dobro">Em dobro (30 dias)</option>
                    </select>
                  </InputLabel>
                  {isPublicEntity && (
                    <p className="text-xs text-slate-500">
                      Órgão público informado: prazo em dobro aplicado automaticamente.
                    </p>
                  )}
                  <p className="md:col-span-2 text-xs text-slate-500">
                    Use prazo em dobro apenas para Defensoria Pública, MP, NPJ ou advogado dativo.
                  </p>
                </div>
                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-2">Resultado parcial</p>
                  {outputs.tempest.status === 'pendente' ? (
                    <div className="text-sm text-slate-500">{outputs.tempest.mensagem}</div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-800">
                      <div>
                        <strong>Intimação:</strong> {formatDate(outputs.tempest.intim)}
                      </div>
                      <div>
                        <strong>Começo do prazo:</strong> {formatDate(outputs.tempest.comeco)}
                      </div>
                      <div>
                        <strong>Prazo:</strong> {outputs.tempest.prazo} dias
                      </div>
                      <div>
                        <strong>Vencimento:</strong> {formatDate(outputs.tempest.venc)}
                      </div>
                      <div className="col-span-full flex items-center gap-2 text-sm">
                        {outputs.tempest.status === 'tempestivo' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="font-semibold uppercase tracking-tight">
                          {outputs.tempest.status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
              <SectionCard title="Critérios usados">
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Intimação presumida 10 dias após expedição (após vinculação no DJEN), salvo leitura antes disso.</li>
                  <li>• Atenção ao calendário e às comprovações de feriado/prorrogação.</li>
                  <li>• Prazo em dobro: apenas Defensoria Pública, MP, NPJ ou advogado dativo.</li>
                </ul>
              </SectionCard>
            </div>
          );
        case 'preparo':
          return (
            <div className="grid lg:grid-cols-2 gap-4">
              <SectionCard title="Preparo e custas">
                <div className="grid gap-4">
                  <InputLabel label="Multa por embargos protelatórios">
                    <select
                      className={inputClass('multa')}
                      value={state.multa}
                      onChange={(e) => handleChange('multa', e.target.value as Multa)}
                    >
                      <option value="">Selecione</option>
                      <option value="não">Não</option>
                      <option value="sim, recolhida">Sim, recolhida</option>
                      <option value="sim, não recolhida">Sim, não recolhida</option>
                    </select>
                  </InputLabel>
                  {state.multa === 'sim, não recolhida' && (
                    <InputLabel label="Motivo">
                      <select
                        className={inputClass('motivo')}
                        value={state.motivo}
                        onChange={(e) =>
                          handleChange('motivo', e.target.value as TriagemState['motivo'])
                        }
                      >
                        <option value="">Selecione</option>
                        <option value="Fazenda Pública ou justiça gratuita">Fazenda Pública ou justiça gratuita</option>
                        <option value="é o próprio objeto do recurso">É o próprio objeto do recurso</option>
                        <option value="não identificado">Não identificado</option>
                      </select>
                    </InputLabel>
                  )}
                  <InputLabel label="Dispensa (MP/ente público/autarquia)">
                    <select
                      className={inputClass('dispensa')}
                      value={state.dispensa}
                      onChange={(e) => handleChange('dispensa', e.target.value as YesNo)}
                    >
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="não">Não</option>
                    </select>
                  </InputLabel>
                  {state.dispensa === 'sim' && (
                    <p className="text-xs text-slate-500">
                      Dispensa informada: justiça gratuita não é necessária.
                    </p>
                  )}
                  {state.dispensa === 'não' && (
                    <>
                      <InputLabel label="Justiça gratuita">
                        <select
                          className={inputClass('gratuidade')}
                          value={state.gratuidade}
                          onChange={(e) =>
                            handleChange('gratuidade', e.target.value as TriagemState['gratuidade'])
                          }
                        >
                          <option value="">Selecione</option>
                          <option value="não invocada">Não invocada</option>
                          <option value="já é ou afirma ser beneficiário">Já é ou afirma ser beneficiário</option>
                          <option value="requer no recurso em análise">Requer no recurso em análise</option>
                          <option value="é o próprio objeto do recurso">É o próprio objeto do recurso</option>
                          <option value="presumida (defensor público, dativo ou NPJ)">
                            Presumida (defensor público, dativo ou NPJ)
                          </option>
                        </select>
                      </InputLabel>
                      {state.gratuidade === 'já é ou afirma ser beneficiário' && (
                        <>
                          <InputLabel label="Deferida expressamente?">
                            <select
                              className={inputClass('deferida')}
                              value={state.deferida}
                              onChange={(e) => handleChange('deferida', e.target.value as YesNo)}
                            >
                              <option value="">Selecione</option>
                              <option value="sim">Sim</option>
                              <option value="não">Não</option>
                            </select>
                          </InputLabel>
                          {state.deferida === 'sim' && (
                            <InputLabel label="Movimento (deferimento)">
                              <input
                                className={inputClass('movdef')}
                                placeholder="Ex.: 9.1"
                                value={state.movdef}
                                onChange={(e) => handleChange('movdef', e.target.value)}
                              />
                            </InputLabel>
                          )}
                          {state.deferida === 'não' && (
                            <>
                              <InputLabel label="Requerida anteriormente?">
                                <select
                                  className={inputClass('requerida')}
                                  value={state.requerida}
                                  onChange={(e) => handleChange('requerida', e.target.value as YesNo)}
                                >
                                  <option value="">Selecione</option>
                                  <option value="sim">Sim</option>
                                  <option value="não">Não</option>
                                </select>
                              </InputLabel>
                              {state.requerida === 'sim' && (
                                <InputLabel label="Movimento (pedido)">
                                  <input
                                    className={inputClass('movped')}
                                    placeholder="Ex.: 9.1"
                                    value={state.movped}
                                    onChange={(e) => handleChange('movped', e.target.value)}
                                  />
                                </InputLabel>
                              )}
                            </>
                          )}
                          <InputLabel label="Ato incompatível (pagamento prévio)?">
                            <select
                              className={inputClass('atoincomp')}
                              value={state.atoincomp}
                              onChange={(e) => handleChange('atoincomp', e.target.value as YesNo)}
                            >
                              <option value="">Selecione</option>
                              <option value="sim">Sim</option>
                              <option value="não">Não</option>
                            </select>
                          </InputLabel>
                        </>
                      )}
                      {state.gratuidade === 'não invocada' && (
                        <>
                          <InputLabel label="Comprovação de preparo">
                            <select
                              className={inputClass('comprova')}
                              value={state.comprova}
                              onChange={(e) =>
                                handleChange('comprova', e.target.value as TriagemState['comprova'])
                              }
                            >
                              <option value="">Selecione</option>
                              <option value="no prazo para interposição do recurso">
                                No prazo para interposição do recurso
                              </option>
                              <option value="no dia útil seguinte ao término do prazo">
                                No dia útil seguinte ao término do prazo
                              </option>
                              <option value="posteriormente">Posteriormente</option>
                              <option value="ausente">Ausente</option>
                            </select>
                          </InputLabel>
                          {state.comprova === 'no dia útil seguinte ao término do prazo' && (
                            <InputLabel label="Recurso interposto no último dia, após as 16h?">
                              <select
                                className={inputClass('apos16')}
                                value={state.apos16}
                                onChange={(e) => handleChange('apos16', e.target.value as YesNo)}
                              >
                                <option value="">Selecione</option>
                                <option value="sim">Sim</option>
                                <option value="não">Não</option>
                              </select>
                            </InputLabel>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </SectionCard>
              {!isPublicEntity && (
                <SectionCard title="Documentos e valores">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputLabel label="Movimento GRU (guia/comprovante)">
                      <input
                        className={inputClass('grumov')}
                        placeholder="Ex.: 1.2"
                        value={state.grumov}
                        onChange={(e) => handleChange('grumov', e.target.value)}
                      />
                    </InputLabel>
                    <InputLabel label="Movimento GRU (auto)">
                      <input
                        className={inputClass('grumovComp')}
                        placeholder="Ex.: 1.2"
                        value={state.grumovComp}
                        onChange={(e) => handleChange('grumovComp', e.target.value)}
                      />
                    </InputLabel>
                    <div className="md:col-span-2">
                      <InputLabel label={`Valor pago ${outputs.stLabel}/FUNJUS`}>
                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                            checked={state.usarIntegral}
                            onChange={(e) => handleChange('usarIntegral', e.target.checked)}
                          />
                          <span>Usar valor integral devido (preenche automático)</span>
                        </div>
                        <div className="grid gap-2">
                          <input
                            className={inputClass('valorst')}
                            type="number"
                            step="0.01"
                            placeholder="STJ/STF"
                            value={state.valorst}
                            onChange={(e) => handleChange('valorst', e.target.value)}
                          />
                          <input
                            className={inputClass('valorfj')}
                            type="number"
                            step="0.01"
                            placeholder="Funjus"
                            value={state.valorfj}
                            onChange={(e) => handleChange('valorfj', e.target.value)}
                          />
                        </div>
                      </InputLabel>
                    </div>
                    {funjusBelow && (
                      <div className="md:col-span-2">
                        <InputLabel label="Justificativa Funjus (valor abaixo do padrão)">
                          <textarea
                            className={inputClass('funjusObs', 'h-24 resize-none')}
                            maxLength={400}
                            placeholder="Descreva o motivo do valor menor."
                            value={state.funjusObs}
                            onChange={(e) => handleChange('funjusObs', e.target.value)}
                          />
                          {funjusObsRequired && (
                            <span className="text-xs text-rose-600">Informe o motivo do valor menor.</span>
                          )}
                        </InputLabel>
                      </div>
                    )}
                    <InputLabel label="Movimento FUNJUS (guia/comprovante)">
                      <input
                        className={inputClass('funjusmov')}
                        placeholder="Ex.: 1.5"
                        value={state.funjusmov}
                        onChange={(e) => handleChange('funjusmov', e.target.value)}
                      />
                    </InputLabel>
                    <InputLabel label="Juntou guia?">
                      <select
                        className={inputClass('guia')}
                        value={state.guia}
                        onChange={(e) => handleChange('guia', e.target.value as YesNo)}
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="não">Não</option>
                      </select>
                    </InputLabel>
                    {state.guia === 'sim' && (
                      <>
                        <InputLabel label="Guia original para o recurso?">
                          <select
                            className={inputClass('guiorig')}
                            value={state.guiorig}
                            onChange={(e) => handleChange('guiorig', e.target.value as YesNo)}
                          >
                            <option value="">Selecione</option>
                            <option value="sim">Sim</option>
                            <option value="não">Não</option>
                          </select>
                        </InputLabel>
                      </>
                    )}
                    <InputLabel label="Juntou comprovante?">
                      <select
                        className={inputClass('comp')}
                        value={state.comp}
                        onChange={(e) => handleChange('comp', e.target.value as YesNo)}
                      >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="não">Não</option>
                      </select>
                    </InputLabel>
                    {state.comp === 'sim' && (
                      <>
                        <InputLabel label="Tipo de comprovante">
                          <select
                            className={inputClass('comptipo')}
                            value={state.comptipo}
                            onChange={(e) =>
                              handleChange('comptipo', e.target.value as TriagemState['comptipo'])
                            }
                          >
                            <option value="">Selecione</option>
                            <option value="de pagamento">De pagamento</option>
                            <option value="de agendamento">De agendamento</option>
                          </select>
                        </InputLabel>
                        <InputLabel label="Código de barras">
                          <select
                            className={inputClass('codbar')}
                            value={state.codbar}
                            onChange={(e) =>
                              handleChange('codbar', e.target.value as TriagemState['codbar'])
                            }
                          >
                            <option value="">Selecione</option>
                            <option value="confere">Confere</option>
                            <option value="diverge ou guia ausente">Diverge ou guia ausente</option>
                          </select>
                        </InputLabel>
                      </>
                    )}
                    <div className="md:col-span-2">
                      <InputLabel label="COHAB LD? (parcial Funjus)">
                        <select
                          className={inputClass('parcialTipo')}
                          value={state.parcialTipo}
                          onChange={(e) => handleChange('parcialTipo', e.target.value as ParcialOpcao)}
                        >
                          <option value="">Selecione</option>
                          <option value="não">Não</option>
                          <option value="JG parcial">JG parcial</option>
                          <option value="COHAB Londrina">COHAB Londrina</option>
                          <option value="outros">Outros (especificar)</option>
                        </select>
                      </InputLabel>
                    </div>
                    {state.parcialTipo === 'outros' && (
                      <div className="md:col-span-2">
                        <InputLabel label="Descrever pagamento parcial">
                          <input
                            className={inputClass('parcialOutro')}
                            placeholder="Ex.: parcelamento, precatório, etc."
                            value={state.parcialOutro}
                            onChange={(e) => handleChange('parcialOutro', e.target.value)}
                          />
                        </InputLabel>
                      </div>
                    )}
                  </div>
                  {state.interp ? (
                    <div className="mt-4 space-y-1 text-sm text-slate-600">
                      <div>
                        Valores devidos agora: {outputs.stLabel} {formatCurrency(outputs.deverST)} | FUNJUS{' '}
                        {formatCurrency(outputs.deverFJ)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Base aplicada: {outputs.stLabel} {formatIsoDate(outputs.stRateStart)} | FUNJUS{' '}
                        {formatIsoDate(outputs.fjRateStart)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-slate-500">
                      Informe a data de interposição para calcular as custas automaticamente.
                    </div>
                  )}
                </SectionCard>
              )}
              {!isPublicEntity && (
                <SectionCard title="Notas práticas">
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Marque “de agendamento” se o comprovante não tem autenticação.</li>
                    <li>• Se houver ato incompatível com a gratuidade, o preparo será exigido.</li>
                    <li>• Campos de movimento ajudam a gerar a minuta/post-it automaticamente.</li>
                  </ul>
                </SectionCard>
              )}
            </div>
          );
        case 'processo':
          return (
            <div className="grid lg:grid-cols-2 gap-4">
              {state.emaberto === 'sim' && (
                <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white/80 text-slate-700 p-4 text-sm shadow-sm">
                  Prazo em aberto na origem: contrarrazões podem ser tratadas depois. Preencha apenas se já houver dados.
                </div>
              )}
              <SectionCard title="Representação">
                {isPublicEntity ? (
                  <p className="text-sm text-slate-600">
                    Órgão público informado: procuração dispensada.
                  </p>
                ) : (
                  <div className="grid gap-4">
                    <InputLabel label="Subscritor">
                      <select
                        className={inputClass('subscritor')}
                        value={state.subscritor}
                        onChange={(e) => handleChange('subscritor', e.target.value as Subscritor)}
                      >
                        <option value="">Selecione</option>
                        <option value="advogado particular">Advogado particular</option>
                        <option value="procurador público">Procurador público</option>
                        <option value="procurador nomeado">Procurador nomeado</option>
                        <option value="advogado em causa própria">Advogado em causa própria</option>
                      </select>
                    </InputLabel>
                    {state.subscritor === 'procurador nomeado' && (
                      <InputLabel label="Movimento (nomeação)">
                        <input
                          className={inputClass('nomemovi')}
                          placeholder="Ex.: 9.1"
                          value={state.nomemovi}
                          onChange={(e) => handleChange('nomemovi', e.target.value)}
                        />
                      </InputLabel>
                    )}
                    {state.subscritor === 'advogado particular' && (
                      <>
                      <InputLabel label="Movimentos (cadeia de poderes)">
                        <input
                          className={inputClass('movis')}
                          placeholder="Ex.: 1.1; 9.1; via sistema"
                          value={state.movis}
                          onChange={(e) => handleChange('movis', e.target.value)}
                        />
                      </InputLabel>
                      <InputLabel label="Cadeia completa?">
                        <select
                          className={inputClass('cadeia')}
                          value={state.cadeia}
                          onChange={(e) => handleChange('cadeia', e.target.value as YesNo)}
                        >
                            <option value="">Selecione</option>
                            <option value="sim">Sim</option>
                            <option value="não">Não</option>
                          </select>
                        </InputLabel>
                      {state.cadeia === 'não' && (
                        <InputLabel label="Poderes faltantes">
                          <select
                            className={inputClass('faltante')}
                            value={state.faltante}
                            onChange={(e) =>
                              handleChange('faltante', e.target.value as TriagemState['faltante'])
                            }
                            >
                              <option value="">Selecione</option>
                              <option value="ao próprio subscritor">Ao próprio subscritor</option>
                              <option value="a outro elo da cadeia">A outro elo da cadeia</option>
                            </select>
                          </InputLabel>
                        )}
                      </>
                    )}
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Pedidos">
                <div className="grid gap-4">
                  <InputLabel label="Efeito suspensivo">
                    <select
                      className={inputClass('suspefeito')}
                      value={state.suspefeito}
                      onChange={(e) =>
                        handleChange('suspefeito', e.target.value as TriagemState['suspefeito'])
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="não requerido">Não requerido</option>
                      <option value="requerido no corpo do recurso">Requerido no corpo do recurso</option>
                      <option value="requerido em petição apartada">Requerido em petição apartada</option>
                    </select>
                  </InputLabel>
                {state.suspefeito === 'requerido em petição apartada' && (
                  <InputLabel label="Autuado?">
                    <select
                      className={inputClass('autuado')}
                      value={state.autuado}
                      onChange={(e) => handleChange('autuado', e.target.value as YesNo)}
                    >
                        <option value="">Selecione</option>
                        <option value="sim">Sim</option>
                        <option value="não">Não</option>
                      </select>
                    </InputLabel>
                  )}
                <InputLabel label="Exclusividade na intimação">
                  <select
                    className={inputClass('exclusivi')}
                    value={state.exclusivi}
                    onChange={(e) =>
                      handleChange('exclusivi', e.target.value as TriagemState['exclusivi'])
                    }
                    >
                      <option value="">Selecione</option>
                      <option value="requerida">Requerida</option>
                      <option value="não requerida">Não requerida</option>
                    </select>
                  </InputLabel>
                  {state.exclusivi === 'requerida' && (
                    <>
                    <InputLabel label="Procurador já cadastrado?">
                      <select
                        className={inputClass('cadastrada')}
                        value={state.cadastrada}
                        onChange={(e) => handleChange('cadastrada', e.target.value as YesNo)}
                      >
                          <option value="">Selecione</option>
                          <option value="sim">Sim</option>
                          <option value="não">Não</option>
                        </select>
                      </InputLabel>
                    {state.cadastrada === 'não' && (
                      <InputLabel label="Advogado regularmente constituído?">
                        <select
                          className={inputClass('regular')}
                          value={state.regular}
                          onChange={(e) => handleChange('regular', e.target.value as YesNo)}
                        >
                            <option value="">Selecione</option>
                            <option value="sim">Sim</option>
                            <option value="não">Não</option>
                          </select>
                        </InputLabel>
                      )}
                    </>
                  )}
                </div>
              </SectionCard>
              <SectionCard title="Processamento">
                <div className="grid gap-4">
                  <InputLabel label="Contrarrazões">
                    <select
                      className={inputClass('contrarra')}
                      value={state.contrarra}
                      onChange={(e) =>
                        handleChange('contrarra', e.target.value as TriagemState['contrarra'])
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="apresentadas">Apresentadas</option>
                      <option value="ausente alguma">Ausente alguma</option>
                      <option value="ausentes">Ausentes</option>
                    </select>
                  </InputLabel>
                {state.contrarra !== '' && state.contrarra !== 'ausentes' && (
                  <InputLabel label="Movimentos das contrarrazões/renúncia">
                    <input
                      className={inputClass('contramovis')}
                      placeholder="Ex.: 6.1; 7.1 (renúncia)"
                      value={state.contramovis}
                      onChange={(e) => handleChange('contramovis', e.target.value)}
                    />
                  </InputLabel>
                )}
                {state.contrarra !== 'apresentadas' && (
                  <>
                    <InputLabel label="Recorrido(s) intimado(s)?">
                      <select
                        className={inputClass('intimado')}
                        value={state.intimado}
                        onChange={(e) => handleChange('intimado', e.target.value as YesNo)}
                      >
                          <option value="">Selecione</option>
                          <option value="sim">Sim</option>
                          <option value="não">Não</option>
                        </select>
                      </InputLabel>
                      {state.intimado === 'sim' && (
                        <>
                        <InputLabel label="Movimento de intimação">
                          <input
                            className={inputClass('intimovi')}
                            placeholder="Ex.: 3.1"
                            value={state.intimovi}
                            onChange={(e) => handleChange('intimovi', e.target.value)}
                          />
                        </InputLabel>
                        <InputLabel label="Prazo em aberto para algum recorrido?">
                          <select
                            className={inputClass('crraberto')}
                            value={state.crraberto}
                            onChange={(e) => handleChange('crraberto', e.target.value as YesNo)}
                          >
                              <option value="">Selecione</option>
                              <option value="sim">Sim</option>
                              <option value="não">Não</option>
                            </select>
                          </InputLabel>
                        {state.crraberto === 'não' && (
                          <InputLabel label="Decurso certificado?">
                            <select
                              className={inputClass('decursocrr')}
                              value={state.decursocrr}
                              onChange={(e) => handleChange('decursocrr', e.target.value as YesNo)}
                            >
                                <option value="">Selecione</option>
                                <option value="sim">Sim</option>
                                <option value="não">Não</option>
                              </select>
                            </InputLabel>
                          )}
                        </>
                      )}
                    {state.intimado === 'não' && (
                      <InputLabel label="Recorrido(s) sem advogado constituído?">
                        <select
                          className={inputClass('semadv')}
                          value={state.semadv}
                          onChange={(e) => handleChange('semadv', e.target.value as YesNo)}
                        >
                            <option value="">Selecione</option>
                            <option value="sim">Sim</option>
                            <option value="não">Não</option>
                          </select>
                        </InputLabel>
                      )}
                    </>
                  )}
                <InputLabel label="Intervenção do MP?">
                  <select
                    className={inputClass('emepe')}
                    value={state.emepe}
                    onChange={(e) => handleChange('emepe', e.target.value as YesNo)}
                  >
                      <option value="">Selecione</option>
                      <option value="sim">Sim</option>
                      <option value="não">Não</option>
                    </select>
                  </InputLabel>
                  {state.emepe === 'sim' && (
                    <>
                    <InputLabel label="Manifestação nos autos?">
                      <select
                        className={inputClass('mani')}
                        value={state.mani}
                        onChange={(e) => handleChange('mani', e.target.value as YesNo)}
                      >
                          <option value="">Selecione</option>
                          <option value="sim">Sim</option>
                          <option value="não">Não</option>
                        </select>
                      </InputLabel>
                      {state.mani === 'sim' && (
                        <>
                        <InputLabel label="Teor da manifestação">
                          <select
                            className={inputClass('teormani')}
                            value={state.teormani}
                            onChange={(e) =>
                              handleChange('teormani', e.target.value as TriagemState['teormani'])
                            }
                            >
                              <option value="">Selecione</option>
                              <option value="mera ciência">Mera ciência</option>
                              <option value="pela admissão">Pela admissão</option>
                              <option value="pela inadmissão">Pela inadmissão</option>
                              <option value="ausência de interesse">Ausência de interesse</option>
                            </select>
                          </InputLabel>
                        <InputLabel label="Movimento">
                          <input
                            className={inputClass('manimovis')}
                            placeholder="Ex.: 9.1"
                            value={state.manimovis}
                            onChange={(e) => handleChange('manimovis', e.target.value)}
                          />
                        </InputLabel>
                        {state.teormani === 'mera ciência' && (
                          <InputLabel label="Decurso do prazo?">
                            <select
                              className={inputClass('decursomp')}
                              value={state.decursomp}
                              onChange={(e) => handleChange('decursomp', e.target.value as YesNo)}
                            >
                                <option value="">Selecione</option>
                                <option value="sim">Sim</option>
                                <option value="não">Não</option>
                              </select>
                            </InputLabel>
                          )}
                        </>
                      )}
                      {state.mani === 'não' && (
                        <>
                      <InputLabel label="Autos remetidos?">
                        <select
                          className={inputClass('remetido')}
                          value={state.remetido}
                          onChange={(e) => handleChange('remetido', e.target.value as YesNo)}
                        >
                              <option value="">Selecione</option>
                              <option value="sim">Sim</option>
                              <option value="não">Não</option>
                            </select>
                          </InputLabel>
                        {state.remetido === 'sim' && (
                          <InputLabel label="Decurso do prazo?">
                            <select
                              className={inputClass('decursomp')}
                              value={state.decursomp}
                              onChange={(e) => handleChange('decursomp', e.target.value as YesNo)}
                            >
                                <option value="">Selecione</option>
                                <option value="sim">Sim</option>
                                <option value="não">Não</option>
                              </select>
                            </InputLabel>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </SectionCard>
            </div>
          );
        case 'resumo':
          return (
            <div className="space-y-4">
              <SectionCard title="Resultado da triagem">
                <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-800">
                  <div>
                    <strong>Tempestivo:</strong> {outputs.tempest.status}
                  </div>
                  <div>
                    <strong>Contrarrazões:</strong> {outputs.controut}
                  </div>
                  <div>
                    <strong>Ministério Público:</strong> {outputs.mpout}
                  </div>
                  <div>
                    <strong>GRU:</strong> {outputs.grout}
                  </div>
                  <div>
                    <strong>Funjus:</strong> {outputs.funjout}
                  </div>
                  <div>
                    <strong>Procuração/Nomeação:</strong> {outputs.procurout}
                  </div>
                  <div>
                    <strong>Exclusividade na intimação:</strong> {outputs.exclusout}
                  </div>
                  <div>
                    <strong>Efeito suspensivo:</strong> {outputs.suspefout}
                  </div>
                  <div>
                    <strong>Pagamento parcial:</strong> {outputs.parcialout}
                  </div>
                  <div>
                    <strong>Vencimento:</strong> {formatDate(outputs.tempest.venc)}
                  </div>
                  <div>
                    <strong>Prazo:</strong> {outputs.tempest.prazo || '—'} dias
                  </div>
                  <div>
                    <strong>Câmara:</strong> {camaraLabel(state)}
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Observações e minutas sugeridas">
                {outputs.observacoes.length === 0 && !(funjusBelow && funjusObs) ? (
                  <p className="text-sm text-slate-600">Nenhuma observação pendente.</p>
                ) : (
                  <div className="space-y-2 text-sm text-slate-700">
                    {outputs.observacoes.length > 0 && (
                      <ul className="list-disc pl-5 space-y-2">
                        {outputs.observacoes.map((obs, idx) => (
                          <li key={idx}>{obs}</li>
                        ))}
                      </ul>
                    )}
                    {funjusBelow && funjusObs && (
                      <p>
                        <strong>Justificativa Funjus:</strong> {funjusObs}
                      </p>
                    )}
                  </div>
                )}
              </SectionCard>
              <div className="grid lg:grid-cols-2 gap-4">
                <SectionCard title="Notas rápidas (salvas no navegador)">
                  <div className="space-y-3">
                    <textarea
                      className={inputClass('anotacoes', 'h-32 resize-none')}
                      maxLength={900}
                      placeholder="Pendências específicas, nomes de partes, números de telefone..."
                      value={state.anotacoes}
                      onChange={(e) => handleChange('anotacoes', e.target.value)}
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Anotações guardadas apenas neste dispositivo.</span>
                      <span>{state.anotacoes.length}/900</span>
                    </div>
                  </div>
                </SectionCard>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={copyResumo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition"
                >
                  <ClipboardList className="w-4 h-4" />
                  {copied ? 'Copiado!' : 'Copiar resumo'}
                </button>
                <span className="sr-only" role="status" aria-live="polite">
                  {copied ? 'Resumo copiado para a área de transferência.' : ''}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <Pill>
                  {outputs.stLabel}: {formatCurrency(outputs.deverST)} | FUNJUS: {formatCurrency(outputs.deverFJ)}
                </Pill>
                <Pill>Intimação: {formatDate(outputs.tempest.intim)}</Pill>
                <Pill>Começo do prazo: {formatDate(outputs.tempest.comeco)}</Pill>
              </div>
            </div>
          );
        default:
          return null;
      }
    })();

    if (!content) return null;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Pill tone={currentStepErrorCount === 0 ? 'success' : 'warning'}>
            {currentStepErrorCount === 0
              ? 'Etapa completa'
              : `${currentStepErrorCount} campo(s) pendente(s)`}
          </Pill>
          {currentStepErrorCount > 0 && (
            <span className="text-xs text-slate-500">
              Complete os campos pendentes para avançar.
            </span>
          )}
        </div>
        {content}
      </div>
    );
  };

  const tempestTone: 'neutral' | 'positive' | 'negative' =
    outputs.tempest.status === 'tempestivo'
      ? 'positive'
      : outputs.tempest.status === 'intempestivo'
      ? 'negative'
      : 'neutral';
  const contraTone: 'neutral' | 'positive' | 'negative' =
    state.contrarra === 'apresentadas'
      ? 'positive'
      : state.contrarra === 'ausentes' || state.contrarra === 'ausente alguma'
      ? 'negative'
      : 'neutral';
  const savedLabel = lastSavedAt ? `Salvo às ${formatTime(lastSavedAt)}` : 'Salvamento local';
  const progress = Math.round((step / (steps.length - 1)) * 100);

  if (!firebaseEnabled) {
    return (
      <div className="min-h-screen page-bg text-slate-900 flex items-center justify-center px-4 py-10">
        <SectionCard title="Configuração necessária">
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Configure as variáveis do Firebase para habilitar autenticação e perfis de usuário.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>`VITE_FIREBASE_API_KEY`</li>
              <li>`VITE_FIREBASE_AUTH_DOMAIN`</li>
              <li>`VITE_FIREBASE_PROJECT_ID`</li>
              <li>`VITE_FIREBASE_APP_ID`</li>
            </ul>
            <p>Depois reinicie o servidor.</p>
          </div>
        </SectionCard>
        <Watermark />
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen page-bg text-slate-900 flex items-center justify-center px-4 py-10">
        <SectionCard title="Carregando">
          <p className="text-sm text-slate-600">Preparando o acesso seguro...</p>
        </SectionCard>
        <Watermark />
      </div>
    );
  }

  if (!authUser || !profile) {
    return renderAuth();
  }

  return (
    <div className="min-h-screen page-bg text-slate-900 relative page-enter">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute top-6 right-[-5rem] h-64 w-64 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-10 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />
      </div>
      <div className="relative z-10">
        <header className="header-surface border-b border-white/60 bg-white/75 backdrop-blur-2xl shadow-[0_25px_70px_-50px_rgba(15,23,42,0.55)]">
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-lg shadow-slate-300/60 flex items-center justify-center">
                <img src={simbaLogo} alt="Simba-JUD" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Simba-JUD</p>
                <h1 className="text-xl font-semibold text-slate-900 leading-tight font-display">
                  Admissibilidade Recursal
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <Pill>{savedLabel}</Pill>
                <div className="user-chip flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 shadow-sm">
                  <div className="avatar-surface h-6 w-6 rounded-full overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="Perfil" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-600">
                        {getInitials(profile.name || profile.email)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    {profile.name || profile.email}
                  </span>
                </div>
                <Pill>Triagens: {profile.triageCount || 0}</Pill>
                {isAdmin && <Pill tone="success">Admin</Pill>}
              </div>
              <button
                onClick={() => setProfileOpen((open) => !open)}
                className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition"
              >
                {profileOpen ? 'Fechar perfil' : 'Perfil'}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setAdminOpen((open) => !open)}
                  className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition"
                >
                  {adminOpen ? 'Fechar admin' : 'Administração'}
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition"
              >
                Sair
              </button>
              <button
                onClick={() => confirmRestart('Isso vai limpar a triagem atual. Deseja continuar?')}
                className="text-sm px-3 py-2 rounded-lg border border-slate-900 bg-slate-900 text-white hover:bg-black transition shadow-sm"
              >
                Recomeçar
              </button>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Progresso da triagem"
              className="h-2 bg-slate-100 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-slate-900 via-amber-500 to-teal-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Etapa {step + 1} de {steps.length}: {steps[step].label}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 md:hidden">
              <Pill>{savedLabel}</Pill>
              <Pill>{profile.name || profile.email}</Pill>
              <Pill>Triagens: {profile.triageCount || 0}</Pill>
              {isAdmin && <Pill tone="success">Admin</Pill>}
            </div>
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2" aria-label="Etapas">
              {steps.map((item, index) => (
                <StepChip
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  active={step === index}
                  onClick={() => setStep(index)}
                />
              ))}
            </div>
          </div>
        </header>

        <main ref={mainRef} className="max-w-7xl mx-auto px-4 py-8">
          {renderProfilePanel()}
          {renderAdminPanel()}
          <div className="grid lg:grid-cols-[2fr_1fr] gap-5 items-start">
            <div className="space-y-4">
            <div className="main-surface bg-white/80 backdrop-blur-xl border border-white/70 rounded-3xl p-6 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.5)]">
              <div className="animate-fade-in">{renderStep()}</div>
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={prev}
                    disabled={step === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-800 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </button>
                  {step < steps.length - 1 ? (
                    <button
                      onClick={next}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-950 hover:to-slate-900 transition shadow-sm"
                    >
                      Avançar
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={downloadResumo}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-red-600 text-white hover:bg-red-700 hover:shadow-sm transition"
                      >
                        <FileText className="w-4 h-4" />
                        Baixar resumo
                      </button>
                    <button
                      onClick={() =>
                        confirmRestart('Isso vai limpar a triagem atual. Deseja iniciar outra?', () => {
                          void recordTriageCompletion();
                        })
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 transition shadow-sm"
                    >
                        Nova triagem
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-3 lg:sticky lg:top-20">
              <SectionCard title="Resumo">
                <div className="grid gap-3">
                  <MetricCard
                    label="Tempestividade"
                    value={outputs.tempest.status}
                    helper={`Vencimento: ${formatDate(outputs.tempest.venc)}`}
                    tone={tempestTone}
                  />
                  <MetricCard
                    label="Contrarrazões"
                    value={outputs.controut}
                    helper={state.emaberto === 'sim' ? 'Prazo em aberto na origem' : 'Fluxo em andamento'}
                    tone={contraTone}
                  />
                </div>
              </SectionCard>
              <SectionCard title="Consequências automáticas">
                {consequencias.length === 0 ? (
                  <p className="text-sm text-slate-600">Nenhum comando gerado até agora.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                    {consequencias.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={copyConsequencias}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 hover:shadow-sm transition"
                  >
                    <ClipboardList className="w-4 h-4" />
                    {copiedCons ? 'Copiado!' : 'Copiar consequências'}
                  </button>
                  <span className="sr-only" role="status" aria-live="polite">
                    {copiedCons ? 'Consequências copiadas para a área de transferência.' : ''}
                  </span>
                </div>
              </SectionCard>
            </aside>
          </div>
        </main>
      </div>
      <Watermark />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

// Tailwind-like input styling via Tailwind CDN
const style = document.createElement('style');
style.innerHTML = `
.page-bg {
  background:
    radial-gradient(circle at 18% 16%, rgba(249, 115, 22, 0.12), transparent 36%),
    radial-gradient(circle at 82% 12%, rgba(20, 184, 166, 0.12), transparent 38%),
    radial-gradient(circle at 22% 78%, rgba(56, 189, 248, 0.12), transparent 40%),
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 55%, #f1f5f9 100%);
  background-size: 200% 200%;
  animation: flowDrift 18s ease-in-out infinite alternate;
  transition: background 0.35s ease;
}
.page-bg ::selection {
  background: rgba(249, 115, 22, 0.18);
  color: #0f172a;
}
.watermark {
  color: #0f172a;
}
.page-enter {
  animation: pageIn 0.45s ease both;
}
@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes flowDrift {
  0% {
    background-position: 0% 20%;
  }
  100% {
    background-position: 100% 80%;
  }
}
@keyframes flowIn {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.985);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}
.animate-fade-in {
  animation: flowIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.card-surface,
.main-surface,
.header-surface,
.metric-surface,
.pill,
.step-chip,
.input {
  transition: background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease,
    color 0.25s ease, transform 0.2s ease;
  will-change: transform;
}
.card-surface:hover,
.main-surface:hover {
  transform: translateY(-3px);
}
.metric-surface:hover {
  transform: translateY(-2px);
}
.step-chip:hover {
  transform: translateY(-1px);
}
button:active {
  transform: translateY(1px);
}
.theme-dark body {
  color: #e2e8f0;
  background: #0b1220;
}
.theme-dark .page-bg {
  background:
    radial-gradient(circle at 18% 16%, rgba(148, 163, 184, 0.12), transparent 36%),
    radial-gradient(circle at 82% 12%, rgba(56, 189, 248, 0.08), transparent 38%),
    radial-gradient(circle at 22% 78%, rgba(45, 212, 191, 0.1), transparent 40%),
    linear-gradient(180deg, #0b1220 0%, #0f172a 60%, #111827 100%);
  background-size: 200% 200%;
}
.theme-dark .bg-white,
.theme-dark .bg-white\\/85,
.theme-dark .bg-white\\/80,
.theme-dark .bg-white\\/75,
.theme-dark .bg-white\\/70 {
  background-color: rgba(15, 23, 42, 0.85) !important;
}
.theme-dark .bg-slate-50,
.theme-dark .bg-slate-100 {
  background-color: rgba(30, 41, 59, 0.75) !important;
}
.theme-dark .bg-amber-50 {
  background-color: rgba(120, 53, 15, 0.3) !important;
}
.theme-dark .bg-emerald-50 {
  background-color: rgba(6, 95, 70, 0.3) !important;
}
.theme-dark .bg-rose-50 {
  background-color: rgba(159, 18, 57, 0.28) !important;
}
.theme-dark .watermark {
  color: #f8fafc;
}
.theme-dark .header-surface {
  background: rgba(15, 23, 42, 0.82);
  border-color: rgba(148, 163, 184, 0.2);
}
.theme-dark .card-surface,
.theme-dark .main-surface {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(148, 163, 184, 0.2);
  box-shadow: 0 24px 50px -40px rgba(0, 0, 0, 0.6);
}
.theme-dark .user-chip {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(148, 163, 184, 0.3);
}
.theme-dark .avatar-surface {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(148, 163, 184, 0.35);
}
.theme-dark .metric-surface {
  background: rgba(30, 41, 59, 0.75);
  border-color: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}
.theme-dark .pill {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
}
.theme-dark .step-chip {
  border-color: rgba(148, 163, 184, 0.35);
}
.theme-dark .step-chip[aria-current='step'] {
  background: #0f172a;
  border-color: rgba(148, 163, 184, 0.35);
}
.theme-dark .input {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(148, 163, 184, 0.4);
  color: #e2e8f0;
  box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.6);
}
.theme-dark .input::placeholder {
  color: rgba(148, 163, 184, 0.8);
}
.theme-dark .input:focus {
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25);
  border-color: rgba(56, 189, 248, 0.6);
}
.theme-dark .text-slate-900,
.theme-dark .text-slate-800,
.theme-dark .text-slate-700 {
  color: #e2e8f0 !important;
}
.theme-dark .text-slate-600,
.theme-dark .text-slate-500 {
  color: rgba(226, 232, 240, 0.75) !important;
}
.theme-dark .text-slate-400 {
  color: rgba(226, 232, 240, 0.6) !important;
}
.theme-dark .text-amber-800,
.theme-dark .text-amber-700 {
  color: #fcd34d !important;
}
.theme-dark .text-emerald-700 {
  color: #6ee7b7 !important;
}
.theme-dark .text-rose-700 {
  color: #fda4af !important;
}
.theme-dark .border-slate-200 {
  border-color: rgba(148, 163, 184, 0.3) !important;
}
.theme-dark .border-amber-200 {
  border-color: rgba(251, 191, 36, 0.35) !important;
}
.theme-dark .border-emerald-200 {
  border-color: rgba(52, 211, 153, 0.3) !important;
}
.theme-dark .border-rose-200 {
  border-color: rgba(251, 113, 133, 0.35) !important;
}
.input {
  width: 100%;
  border-radius: 0.45rem;
  border: 1px solid rgba(226, 232, 240, 0.95);
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  font-size: 0.875rem;
  line-height: 1.4;
  min-height: 2.5rem;
  box-sizing: border-box;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.input.rounded-r-none {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.input::placeholder {
  color: #94a3b8;
}
.input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
  border-color: rgba(249, 115, 22, 0.65);
  background: #ffffff;
}
.input-error {
  border-color: rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.9);
}
.input-error:focus {
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
  border-color: rgba(249, 115, 22, 0.65);
  background: #ffffff;
}
.input-success {
  border-color: rgba(16, 185, 129, 0.7);
  background: rgba(236, 253, 245, 0.6);
}
.input-success:focus {
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.85);
}
.theme-dark .input.rounded-r-none {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.no-spinner {
  -moz-appearance: textfield;
  appearance: textfield;
}
@media (prefers-reduced-motion: reduce) {
  .page-enter {
    animation: none !important;
  }
  .page-bg {
    animation: none !important;
  }
  .card-surface,
  .main-surface,
  .header-surface,
  .metric-surface,
  .pill,
  .step-chip,
  .input,
  button {
    transition: none !important;
    transform: none !important;
  }
  .animate-fade-in {
    animation: none !important;
  }
}
`;
document.head.appendChild(style);
