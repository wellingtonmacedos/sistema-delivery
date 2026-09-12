export type DiaSemana = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'

export interface StatusAberturaResultado {
  aberto: boolean
  motivo: string
  diaAtual?: DiaSemana
  horarioHojeAbre?: string | null
  horarioHojeFecha?: string | null
  configurado: boolean
}

const TODOS_DIAS: DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

const INT_TO_DIA: Record<number, DiaSemana> = {
  0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
}

const LABEL_DIAS: Record<DiaSemana, string> = {
  dom: 'Domingo', seg: 'Segunda', ter: 'Terça', qua: 'Quarta',
  qui: 'Quinta', sex: 'Sexta', sab: 'Sábado'
}

function parseHHMM(s: string | null | undefined): [number, number] | null {
  if (!s || typeof s !== 'string') return null
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null
  return [h, mm]
}

export function normalizarDiasAtivos(raw: any): DiaSemana[] | null {
  if (!raw || !Array.isArray(raw)) return null
  const arr = (raw as any[]).map(x => String(x).toLowerCase().slice(0, 3))
    .filter(x => (TODOS_DIAS as string[]).includes(x)) as DiaSemana[]
  if (arr.length === 0) return null
  return Array.from(new Set(arr))
}

export function calcularStatusAbertura(args: {
  abertoManual?: boolean | null
  diasAtivos?: any
  horarioAbertura?: string | null
  horarioFechamento?: string | null
  agora?: Date
  timezone?: 'America/Sao_Paulo'
}): StatusAberturaResultado {
  const { abertoManual = true, diasAtivos: rawDias, horarioAbertura, horarioFechamento } = args
  const agora = args.agora ?? new Date()

  if (abertoManual === false) {
    return {
      aberto: false,
      motivo: 'Fechado manualmente (feriado / manutenção)',
      configurado: true
    }
  }

  const dias = normalizarDiasAtivos(rawDias)
  const ab = parseHHMM(horarioAbertura)
  const fc = parseHHMM(horarioFechamento)

  const temHorarios = !!ab && !!fc
  const temDias = !!dias

  if (!temHorarios && !temDias) {
    return {
      aberto: abertoManual !== false,
      motivo: abertoManual !== false
        ? 'Aberto (sem horários configurados — padrão)'
        : 'Fechado (configuração manual)',
      configurado: false
    }
  }

  const tz = args.timezone || 'America/Sao_Paulo'
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(agora)

  const weekPart = parts.find(p => p.type === 'weekday')?.value || ''
  const hourPart = parts.find(p => p.type === 'hour')?.value || '00'
  const minPart = parts.find(p => p.type === 'minute')?.value || '00'

  let diaAtual: DiaSemana = INT_TO_DIA[agora.getDay()] ?? 'seg'
  const diaLower = weekPart.toLowerCase().replace(/[.]/g, '').slice(0, 3)
  const matchMap: Record<string, DiaSemana> = { dom: 'dom', seg: 'seg', ter: 'ter', qua: 'qua', qui: 'qui', sex: 'sex', sab: 'sab' }
  if (matchMap[diaLower]) diaAtual = matchMap[diaLower]

  const horaAgora = parseInt(hourPart, 10) * 60 + parseInt(minPart, 10)
  const horarioHojeAbre = ab ? `${String(ab[0]).padStart(2, '0')}:${String(ab[1]).padStart(2, '0')}` : null
  const horarioHojeFecha = fc ? `${String(fc[0]).padStart(2, '0')}:${String(fc[1]).padStart(2, '0')}` : null

  if (temDias && dias && !dias.includes(diaAtual)) {
    return {
      aberto: false,
      motivo: `Fechado hoje (${LABEL_DIAS[diaAtual]} não está nos dias de funcionamento)`,
      diaAtual,
      horarioHojeAbre,
      horarioHojeFecha,
      configurado: true
    }
  }

  if (temHorarios && ab && fc) {
    const abMin = ab[0] * 60 + ab[1]
    const fcMin = fc[0] * 60 + fc[1]

    if (fcMin <= abMin) {
      if (horaAgora >= abMin || horaAgora < fcMin) {
        return {
          aberto: true,
          motivo: `Aberto agora ${LABEL_DIAS[diaAtual]} ${horarioHojeAbre} → ${horarioHojeFecha} (funcionamento noturno)`,
          diaAtual,
          horarioHojeAbre,
          horarioHojeFecha,
          configurado: true
        }
      }
    } else {
      if (horaAgora >= abMin && horaAgora < fcMin) {
        return {
          aberto: true,
          motivo: `Aberto agora ${LABEL_DIAS[diaAtual]} ${horarioHojeAbre} → ${horarioHojeFecha}`,
          diaAtual,
          horarioHojeAbre,
          horarioHojeFecha,
          configurado: true
        }
      }
    }

    return {
      aberto: false,
      motivo: `Fora do horário hoje (${LABEL_DIAS[diaAtual]} ${horarioHojeAbre} → ${horarioHojeFecha})`,
      diaAtual,
      horarioHojeAbre,
      horarioHojeFecha,
      configurado: true
    }
  }

  return {
    aberto: abertoManual !== false,
    motivo: abertoManual !== false
      ? `Aberto ${LABEL_DIAS[diaAtual] || ''} (dias configurados, sem horários)`
      : 'Fechado manualmente',
    diaAtual,
    horarioHojeAbre: null,
    horarioHojeFecha: null,
    configurado: temDias
  }
}
