// Tipos base
export type YesNo = 'sim' | 'não' | '';
export type TipoRecurso = 'Especial' | 'Extraordinário' | '';
export type Multa = 'não' | 'sim, recolhida' | 'sim, não recolhida' | '';
export type Gratuidade =
  | 'não invocada'
  | 'já é ou afirma ser beneficiário'
  | 'requer no recurso em análise'
  | 'é o próprio objeto do recurso'
  | 'presumida (defensor público, dativo ou NPJ)'
  | '';
export type Subscritor =
  | 'advogado particular'
  | 'procurador público'
  | 'procurador nomeado'
  | 'advogado em causa própria'
  | '';
export type Contrarrazoes = 'apresentadas' | 'ausente alguma' | 'ausentes' | '';
export type MPTeor = 'mera ciência' | 'pela admissão' | 'pela inadmissão' | 'ausência de interesse' | '';
export type CamaraArea = 'Cível' | 'Crime' | '';
export type ParcialOpcao = '' | 'não' | 'JG parcial' | 'COHAB Londrina' | 'outros';
export type UserRole = 'admin' | 'user';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ProcCheck = 'confere' | 'diverge' | '';

// Tipos de perfil e autenticação
export type UserProfile = {
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

export type AdminRequest = {
  id: string;
  uid: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
};

// Estado da triagem
export type TriagemState = {
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
  sfh: YesNo;
  envio: string;
  consulta: YesNo;
  leitura: string;
  emdobro: 'simples' | 'em dobro' | '';
  eca: YesNo;
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
  gruProc: ProcCheck;
  valorst: string;
  guiavinc: YesNo;
  guia: YesNo;
  funjusmov: string;
  funjusmovComp: string;
  funjusProc: ProcCheck;
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
  exclusNome: string;
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

// Tipos de armazenamento
export type StoredPayload = { __version: number; state: TriagemState; savedAt?: string };
export type LoadedState = { state: TriagemState; savedAt: Date | null };

// Tipos de cálculos
export type Tempestividade = {
  status: 'tempestivo' | 'intempestivo' | 'pendente';
  intim?: Date;
  comeco?: Date;
  venc?: Date;
  prazo?: number;
  prazoTipo?: 'úteis' | 'corridos';
  mensagem?: string;
};

export type RateInfo = { value: number; start?: string };

export type Outputs = {
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

export type StepId = 'recurso' | 'dados' | 'tempest' | 'preparo' | 'processo' | 'resumo';
