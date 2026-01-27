import type { TriagemState, Tempestividade, Outputs } from '../types';
import { stjRates, stfRates, funjusRates, type ValorData } from '../../triario-data';
import {
  parseInputDate,
  addDays,
  nextBusinessDay,
  isBusinessDay,
  isProrrogacao,
  pickRateInfo,
} from './date';
import { formatCurrency } from './currency';

/**
 * Adiciona dias úteis a uma data
 */
const addBusinessDays = (date: Date, days: number): Date => {
  let current = date;
  let remaining = days;
  while (remaining > 0) {
    current = nextBusinessDay(addDays(current, 1), { skipProrrogacao: true });
    remaining--;
  }
  return current;
};

/**
 * Calcula tempestividade do recurso
 */
export const computeTempestividade = (state: TriagemState): Tempestividade => {
  const envio = parseInputDate(state.envio);
  const interp = parseInputDate(state.interp);
  if (!envio || !interp) {
    return { status: 'pendente', mensagem: 'Use a calculadora de prazos.' };
  }
  const prazoBase = state.eca === 'sim' ? 10 : 15;
  const prazo = state.emdobro === 'em dobro' ? prazoBase * 2 : prazoBase;
  const prazoTipo = state.eca === 'sim' ? 'corridos' : 'úteis';
  const leitura = state.consulta === 'sim' ? parseInputDate(state.leitura) : null;
  const auto = addDays(envio, 10);
  const intimBase = leitura && leitura <= auto ? leitura : auto;
  const intim = nextBusinessDay(intimBase);
  let comeco = addDays(intim, 1);
  if (prazoTipo === 'úteis') {
    comeco = nextBusinessDay(comeco, { skipProrrogacao: true });
  } else if (isProrrogacao(comeco)) {
    comeco = nextBusinessDay(addDays(comeco, 1), { skipProrrogacao: true });
  }
  let venc =
    prazoTipo === 'corridos' ? addDays(comeco, Math.max(0, prazo - 1)) : addBusinessDays(comeco, prazo);
  if (!isBusinessDay(venc) || isProrrogacao(venc)) {
    venc = nextBusinessDay(addDays(venc, 1), { skipProrrogacao: true });
  }
  const status = interp <= venc ? 'tempestivo' : 'intempestivo';
  return { status, intim, comeco, venc, prazo, prazoTipo };
};

/**
 * Ordena taxas por data
 */
const sortRates = (rates: ValorData[]): ValorData[] =>
  [...rates].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

const stjRatesSorted = sortRates(stjRates);
const stfRatesSorted = sortRates(stfRates);
const funjusRatesSorted = sortRates(funjusRates);

/**
 * Constrói output de gratuidade
 */
const buildGratuidadeOutput = (state: TriagemState): string | null => {
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

/**
 * Calcula todos os outputs da triagem
 */
export const computeOutputs = (state: TriagemState): Outputs => {
  const tempest = computeTempestividade(state);
  const interpDate = parseInputDate(state.interp) ?? new Date();
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
  const valorFJNum = Number(state.valorfj || 0);
  const funjusBelow =
    state.dispensa === 'não' &&
    state.gratuidade === 'não invocada' &&
    state.valorfj.trim() !== '' &&
    Number.isFinite(valorFJNum) &&
    valorFJNum < deverFJ;
  const hasFunjusInfo = Boolean(
    state.guia || state.comp || state.funjusmov.trim() || state.funjusmovComp.trim()
  );

  const controut = (() => {
    if (state.contrarra === 'apresentadas') {
      return state.contramovis ? `mov(s). ${state.contramovis}` : 'apresentadas';
    }
    if (state.contrarra === 'ausente alguma') {
      return state.contramovis ? `mov(s). ${state.contramovis}` : 'ausente alguma';
    }
    if (state.contrarra === 'ausentes') {
      if (state.intimado === 'sim' && state.crraberto === 'não' && state.decursocrr === 'sim')
        return 'não';
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
    if (!funjusBelow && !hasFunjusInfo) return 'N/A';
    const guiaMov = state.funjusmov?.trim();
    const compMov = state.funjusmovComp?.trim();
    const guiaInfo =
      state.guia === 'sim'
        ? `guia mov. ${guiaMov || '?'}`
        : state.guia === 'não'
        ? 'guia não localizada'
        : 'guia pendente';
    const compInfo =
      state.comp === 'sim'
        ? `comprovante mov. ${compMov || '?'}`
        : state.comp === 'não'
        ? 'comprovante não localizado'
        : 'comprovante pendente';
    return `${guiaInfo}; ${compInfo}`;
  })();

  const parcialout = (() => {
    if (!funjusBelow) return 'Não informado';
    if (!state.parcialTipo || state.parcialTipo === 'não') return 'Não informado';
    if (state.parcialTipo === 'outros') {
      return state.parcialOutro
        ? `Parcial: ${state.parcialOutro}`
        : 'Parcial: outros (especificar)';
    }
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
    if (state.exclusivi === 'requerida' && state.cadastrada === 'sim')
      return 'requerida e já cadastrada';
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
  if (state.sfh === 'sim') {
    observacoes.push('SFH pós 24/03/2024: enviar para filtro específico.');
  }
  if (
    state.emaberto !== 'sim' &&
    state.contrarra &&
    state.contrarra !== 'ausentes' &&
    !state.contramovis.trim()
  ) {
    observacoes.push('Informar movimento da juntada das contrarrazões/renúncia.');
  }
  if (
    !custasDispensadas &&
    state.gratuidade === 'não invocada' &&
    state.comprova &&
    state.comprova !== 'ausente'
  ) {
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
  if (!custasDispensadas && state.gruProc === 'diverge') {
    observacoes.push('Número do processo divergente na GRU: conferir guia.');
  }
  if (!custasDispensadas && state.funjusProc === 'diverge') {
    observacoes.push('Número do processo divergente na guia FUNJUS.');
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
    } else if (
      state.contrarra !== 'apresentadas' &&
      state.intimado === 'sim' &&
      state.crraberto === 'sim'
    ) {
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
  if (state.emepe === 'sim' && state.mani === 'não') {
    if (state.remetido === 'sim' && state.decursomp === 'não') {
      observacoes.push('Aguardar decurso do prazo para manifestação da PGJ.');
    } else if (state.remetido === 'não') {
      observacoes.push('Encaminhar autos à PGJ.');
    }
  }

  const recodobro =
    state.dispensa === 'não' &&
    state.gratuidade === 'não invocada' &&
    (state.comprova === 'ausente' ||
      state.comprova === 'posteriormente' ||
      (state.comprova === 'no dia útil seguinte ao término do prazo' && state.apos16 === 'não'));

  const valorSTNum = Number(state.valorst || 0);

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
