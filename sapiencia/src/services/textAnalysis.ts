/**
 * Motor de análise textual pura para correção de redações ENEM.
 * Funções puras sem dependências de React — podem ser testadas isoladamente.
 */

// =============================================================================
// CONSTANTES E TIPOS
// =============================================================================

export const SCORE_LEVELS = [0, 40, 80, 120, 160, 200] as const

export interface CompetencyFeedback {
  score: number
  level: 'critical' | 'needs-work' | 'good' | 'excellent'
  tips: string[]
  /** Evidências textuais encontradas (trechos relevantes) */
  evidence?: string[]
}

export interface EvaluationResult {
  c1: CompetencyFeedback
  c2: CompetencyFeedback
  c3: CompetencyFeedback
  c4: CompetencyFeedback
  c5: CompetencyFeedback
  overallTips: string[]
}

export interface ThemeEquivalences {
  temaId: string
  palavrasChave: string[]
  equivalencias: string[]
}

// =============================================================================
// NORMALIZAÇÃO DE TEXTO
// =============================================================================

/** Remove acentos para comparação flexível */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Normaliza quebras de linha e segmenta em parágrafos */
export function normalizeParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

/** Normaliza texto para busca: lowercase + sem acentos */
function normalizeForSearch(str: string): string {
  return removeAccents(str.toLowerCase())
}

// =============================================================================
// STOPWORDS — palavras gramaticais que não indicam pobreza vocabular
// =============================================================================

const STOPWORDS_PT = new Set([
  'a', 'ao', 'aos', 'as', 'o', 'os', 'e', 'ou', 'nem',
  'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com',
  'que', 'se', 'seu', 'sua', 'seus', 'suas', 'este', 'esta',
  'esse', 'essa', 'este', 'isto', 'isso', 'aquilo', 'aquele',
  'aquela', 'la', 'lo', 'lhe', 'lhes', 'me', 'te', 'nos',
  'vos', 'mais', 'menos', 'muito', 'pouco', 'tanto', 'quanto',
  'como', 'quando', 'onde', 'quem', 'qual', 'quais', 'cujo',
  'cuja', 'cujos', 'cujas', 'porque', 'pois', 'logo', 'entao',
  'então', 'mas', 'porém', 'porem', 'todavia', 'contudo',
  'todas', 'todos', 'cada', 'outro', 'outra', 'outros', 'outras',
  'mesmo', 'mesma', 'mesmos', 'mesmas', 'próprio', 'própria',
  'ser', 'estar', 'ter', 'haver', 'poder', 'dever', 'ir', 'vir',
  'fazer', 'dizer', 'saber', 'querer', 'pôr', 'ver', 'dar',
  'ficar', 'parecer', 'embora', 'ainda', 'já', 'também',
  'tambem', 'não', 'nao', 'sim', 'bem', 'mal', 'assim',
  'aqui', 'ali', 'aí', 'lá', 'cá', 'aqui', 'agora', 'sempre',
  'nunca', 'jamais', 'talvez', 'apenas', 'somente', 'só',
  'muitos', 'muitas', 'poucos', 'poucas', 'vários', 'várias',
  'algum', 'alguma', 'alguns', 'algumas', 'nenhum', 'nenhuma',
  'todo', 'toda', 'todos', 'todas', 'cada', 'outro', 'outra',
  'pelo', 'pela', 'pelos', 'pelas', 'num', 'numa', 'neste',
  'nesta', 'nesse', 'nessa', 'deste', 'desta', 'desse', 'dessa',
  'daquele', 'daquela', 'nisto', 'nisso', 'aquilo',
  'eh', 'nao', 'pra', 'pro', 'pra', 'pros', 'pras',
  // Conectivos gramaticais muito frequentes
  'e', 'mas', 'porém', 'contudo', 'todavia', 'entretanto',
  'pois', 'porque', 'portanto', 'logo', 'então', 'assim',
])

// =============================================================================
// DICIONÁRIOS EXPANDIDOS
// =============================================================================

/** Conectivos coesivos — usados exclusivamente pela C4 */
const COHESIVE_DEVICES: string[] = [
  // Adição
  'ademais', 'outrossim', 'além disso', 'bem como', 'mas também',
  'não só', 'não apenas', 'não somente',
  // Adversidade / concessão
  'entretanto', 'contudo', 'todavia', 'não obstante', 'embora',
  'ainda que', 'mesmo que', 'conquanto', 'se bem que', 'apesar de',
  'a despeito de', 'em que pese',
  // Conclusão
  'portanto', 'por conseguinte', 'em suma', 'em síntese', 'logo',
  'assim sendo', 'sendo assim', 'diante disso', 'dessa forma',
  'desta forma', 'deste modo', 'desse modo', 'desta maneira',
  'dessa maneira', 'por isso',
  // Alternância
  'por outro lado', 'em contrapartida', 'ora', 'quer', 'já',
  // Explicação / causa
  'visto que', 'uma vez que', 'já que', 'dado que', 'pois',
  'considerando que', 'tendo em vista que', 'na medida em que',
  'porquanto', 'porque', 'à medida que', 'ao passo que',
  // Condição
  'desde que', 'contanto que', 'a menos que', 'a não ser que',
  'caso', 'se',
  // Conformidade
  'conforme', 'segundo', 'de acordo com', 'consoante',
  'como', 'tal qual',
  // Proporção
  'à proporção que', 'ao passo que', 'quanto mais', 'quanto menos',
  'à medida que',
  // Tempo
  'quando', 'enquanto', 'logo que', 'assim que', 'sempre que',
  'antes que', 'depois que', 'até que', 'desde que',
  // Finalidade
  'com o intuito de', 'a fim de', 'para que', 'com a finalidade de',
  'com o objetivo de', 'com o propósito de', 'visando a',
  'no intuito de', 'de modo a', 'de forma a', 'de maneira a',
  // Comparação
  'assim como', 'tal como', 'como', 'bem como', 'do mesmo modo que',
  'da mesma forma que', 'tanto quanto', 'mais que', 'menos que',
  // Ordem / sequência
  'primeiramente', 'em primeiro lugar', 'em segunda análise',
  'em segunda instância', 'em segundo lugar', 'por fim',
  'finalmente', 'em seguida', 'posteriormente', 'sucessivamente',
  'a princípio', 'inicialmente',
  // Esclarecimento / exemplificação
  'por exemplo', 'como por exemplo', 'tal como', 'a saber',
  'isto é', 'ou seja', 'em outras palavras', 'melhor dizendo',
  'explica-se', 'note-se', 'vale ressaltar', 'cumpre ressaltar',
  'vale destacar', 'é mister salientar', 'convém salientar',
  // Referenciação
  'nesse sentido', 'nesse viés', 'sob essa ótica', 'sob tal perspectiva',
  'nessa perspectiva', 'diante desse cenário', 'diante deste cenário',
  'nesse contexto', 'nesse cenário', 'nesse panorama',
  'sob tal prisma', 'por essa ótica', 'por esse ângulo',
  // Retomada / conclusão
  'depreende-se', 'conclui-se', 'infere-se', 'fica claro',
  'fica evidente', 'é notório', 'é evidente', 'nota-se',
  'percebe-se', 'observa-se', 'é possível notar',
]

/** Marcadores argumentativos — usados exclusivamente pela C3 (progressão lógica) */
const ARGUMENT_MARKERS: string[] = [
  'porque', 'pois', 'visto que', 'uma vez que', 'já que',
  'dado que', 'considerando que', 'tendo em vista',
  'nesse contexto', 'diante desse cenário', 'nessa perspectiva',
  'é possível notar', 'nota-se', 'percebe-se', 'observa-se',
  'é evidente', 'é notório', 'fica claro', 'fica evidente',
  'por exemplo', 'como por exemplo', 'tal como',
  'com efeito', 'de fato', 'na verdade', 'efetivamente',
  'segundo', 'conforme', 'de acordo com', 'consoante',
  'cumpre salientar', 'vale destacar', 'convém ressaltar',
]

/** Marcadores de conclusão para C5 */
const CONCLUSION_MARKERS: string[] = [
  'portanto', 'logo', 'assim', 'sendo assim', 'diante disso',
  'diante do exposto', 'em suma', 'em síntese', 'por fim',
  'finalmente', 'conclui-se', 'infere-se', 'depreende-se',
  'fica evidente', 'nesse sentido', 'por conseguinte',
  'em vista disso', 'tendo em vista', 'face ao exposto',
  'dessa forma', 'desta forma', 'em face do exposto',
]

// =============================================================================
// PADRÕES DE C5 — PROPOSTA DE INTERVENÇÃO
// =============================================================================

const AGENT_PATTERNS = [
  // Agentes específicos — "governo" sozinho é genérico demais; exige qualificador ou órgão concreto
  /\b(governo\s+(federal|estadual|municipal|brasileiro))\b/i,
  /\b(união|município|prefeitura|ministério|secretaria)\b/i,
  /\b(poder\s+(público|executivo|legislativo|judiciário))\b/i,
  /\b(escola|colégio|instituição|ong|organização)\b/i,
  /\b(sociedade|família|famílias|cidadão|cidadãos|indivíduo)\b/i,
  /\b(empresa|empresas|imprensa|mídia|universidade)\b/i,
  /\b(professor|professores|educador|educadores)\b/i,
  /\b(ministério\s+da\s+\w+|secretaria\s+de\s+\w+)\b/i,
  /\b(conselho\s+tutelar|sus|ibge|inep|mec|funai|incra|mdh)\b/i,
  /\b(administração\s+(pública|municipal|estadual|federal))\b/i,
  /\b(órgãos?\s+(públicos?|competentes?|responsáveis?))\b/i,
  /\b(cabe\s+ao|compete\s+a(o|s)?|é\s+dever\s+(do|da))\b/i,
]

const ACTION_VERBS = [
  'criar', 'implementar', 'desenvolver', 'promover', 'garantir',
  'assegurar', 'fomentar', 'investir', 'ampliar', 'fortalecer',
  'estabelecer', 'elaborar', 'executar', 'aplicar', 'adotar',
  'instituir', 'regulamentar', 'fiscalizar', 'monitorar',
  'conscientizar', 'educar', 'capacitar', 'oferecer',
  'disponibilizar', 'viabilizar', 'mitigar', 'combater',
  'erradicar', 'reduzir', 'prevenir', 'enfrentar', 'superar',
  'resolver', 'solucionar', 'minimizar', 'incentivar', 'estimular',
]

const ACTION_PATTERNS = [
  // Verbos modais + verbo de ação concreto (não apenas "deve agir" genérico)
  /\b(deve[m]?\s+(criar|implementar|desenvolver|promover|garantir|assegurar|fomentar|investir|ampliar|fortalecer|estabelecer|elaborar|executar|aplicar|adotar|instituir|regulamentar|fiscalizar|monitorar|conscientizar|educar|capacitar|oferecer|disponibilizar|viabilizar|mitigar|combater|erradicar|reduzir|prevenir|enfrentar|superar|minimizar|incentivar|estimular))\b/i,
  /\b(é\s+(necessário|preciso|fundamental|essencial|importante|urgente)\s+(criar|implementar|desenvolver|promover|garantir|assegurar|fomentar|investir|ampliar|fortalecer|estabelecer|elaborar|executar|adotar|instituir))\b/i,
  /\b(cabe\s+a(o|s)?\s+\w+\s+(criar|implementar|desenvolver|promover|garantir|assegurar|fomentar|investir|ampliar|fortalecer))\b/i,
  /\b(compete\s+a(o|s)?\s+\w+\s+(criar|implementar|desenvolver|promover|garantir|assegurar))\b/i,
  /\b(recomenda-se|propõe-se|sugere-se|faz-se\s+mister)\b/i,
  // Verbo de ação + objeto concreto (política, programa, projeto, campanha, medida)
  new RegExp(`\\b(${ACTION_VERBS.join('|')})\\s+(políticas?|programas?|projetos?|campanhas?|medidas?|ações?|estratégias?|iniciativas?|leis?|planos?|sistemas?)`, 'i'),
  // Substantivos de intervenção específicos (sem verbo genérico solto)
  /\b(políticas?\s+públicas?|programas?\s+(sociais?|de\s+\w+)|projetos?\s+(de\s+\w+)|campanhas?\s+(de\s+\w+|educativas?|nacionais?))\b/i,
]

const MEANS_PATTERNS = [
  /\b(por\s+meio\s+de|através\s+de|mediante|via)\b/i,
  /\b(com\s+o\s+uso\s+de|com\s+base\s+em|com\s+apoio\s+de)\b/i,
  /\b(com\s+auxílio\s+de|com\s+suporte\s+de|com\s+recursos)\b/i,
  /\b(utilizando|usando|empregando|adotando|aplicando)\b/i,
  /\b(implantando|instalando|criando|desenvolvendo|elaborando)\b/i,
  /\b(por\s+intermédio\s+de|por\s+meio\s+de)\b/i,
  /\b(com\s+investimento\s+em|com\s+verba|com\s+financiamento)\b/i,
  /\b(com\s+parceria|com\s+colaboração|com\s+cooperação)\b/i,
  /\b(com\s+capacitação|com\s+treinamento|com\s+formação)\b/i,
]

const PURPOSE_PATTERNS = [
  /\b(com\s+a\s+finalidade\s+de|com\s+o\s+objetivo\s+de)\b/i,
  /\b(com\s+o\s+intuito\s+de|com\s+o\s+propósito\s+de)\b/i,
  /\b(com\s+vistas\s+a|visando\s+a?|para\s+que|a\s+fim\s+de)\b/i,
  /\b(no\s+sentido\s+de|no\s+intuito\s+de|de\s+modo\s+a)\b/i,
  /\b(de\s+forma\s+a|de\s+maneira\s+a|com\s+o\s+fito\s+de)\b/i,
  // "para" + verbo concreto de finalidade (não "para" isolado que captura qualquer preposição)
  /\bpara\s+(garantir|assegurar|promover|melhorar|reduzir|combater|erradicar|mitigar|prevenir|enfrentar|superar|minimizar|incentivar|estimular|fomentar|ampliar|fortalecer|viabilizar)\b/i,
]

const DETAIL_INDICATORS = [
  // Órgãos específicos
  /\b(ministério\s+da\s+(saúde|educação|cidadania|justiça|economia|meio\s+ambiente|cultura|trabalho|defesa|agricultura|ciência|tecnologia|comunicações|turismo|esporte|mulher|direitos\s+humanos|infraestrutura))\b/i,
  // Programas conhecidos
  /\b(bolsa\s+família|pronatec|enem|sisu|prouni|fies|mais\s+médicos|samu|cras|creas|cadúnico|sus)\b/i,
  // Prazo ou quantificação
  /\b(em\s+(curto|médio|longo)\s+prazo|dentro\s+de\s+\d+|no\s+prazo\s+de|até\s+\d{4})\b/i,
  /\b(anualmente|mensalmente|semanalmente|diariamente|gradualmente|progressivamente|paulatinamente)\b/i,
  // Público-alvo
  /\b(nas\s+escolas\s+públicas|nas\s+comunidades|nos\s+bairros\s+periféricos|nas\s+zonas\s+rurais)\b/i,
  /\b(para\s+(todos|todas|os|as)\s+(brasileiros|cidadãos|estudantes|alunos|jovens|idosos|crianças|mulheres|negros|indígenas|quilombolas|ribeirinhos|pessoas\s+com\s+deficiência))\b/i,
  // Âmbito geográfico
  /\b(em\s+todo\s+o\s+território\s+nacional|em\s+âmbito\s+(nacional|estadual|municipal|federal|regional|local))\b/i,
]

// =============================================================================
// REPERTÓRIO SOCIOCULTURAL
// =============================================================================

const REPERTORY_INDICATORS = [
  // Autores e pensadores
  /\b(bauman|foucault|arendt|hannah\s+arendt|freire|paulo\s+freire|marx|karl\s+marx|durkheim|weber|kant|locke|rousseau|hobbes|maquiavel|platão|aristóteles|sartre|camus|nietzsche|hegel|adorno|habermas|bourdieu|pierre\s+bourdieu|giddens|beck|lipovetsky|byung-chul\s*han|silvio\s+almeida|gilberto\s+freyre|machado\s+de\s+assis|graciliano\s+ramos|conceição\s+evaristo|jorge\s+amado|clarice\s+lispector|mário\s+de\s+andrade|carlos\s+drummond|ferreira\s+gullar|milton\s+santos|bell\s+hooks|angela\s+davis|frantz\s+fanon|ailton\s+krenak|bruno\s+latour|zygmunt|deleuze|derrida|baudrillard|žižek|chomsky|harari|piketty|amartya\s+sen|nussbaum|judith\s+butler|simone\s+de\s+beauvoir|boaventura|herbert\s+de\s+souza|betinho|josué\s+de\s+castro|caio\s+prado|sérgio\s+buarque|darcy\s+ribeiro|celso\s+furtado|ignacy\s+sachs)\b/i,
  // Obras específicas de referência sociocultural
  /\b(geografia\s+da\s+fome|o\s+povo\s+brasileiro|raízes\s+do\s+brasil|formação\s+do\s+brasil\s+contemporâneo|casa[-\s]grande\s+&?\s*e\s+senzala|pedagogia\s+do\s+oprimido|vigiar\s+e\s+punir|modernidade\s+líquida|sociedade\s+do\s+cansaço|banalidade\s+do\s+mal|segundo\s+tratado\s+do\s+governo)\b/i,
  // Leis e documentos
  /\b(constituição\s+(federal|cidadã)|cf\/?88|declaração\s+universal|direitos\s+humanos|ddhu|estatuto\s+da\s+criança|eca|lei\s+maria\s+da\s+penha|marco\s+civil|lgpd|acordo\s+de\s+paris|ods|agenda\s+2030|pacto\s+global)\b/i,
  // Obras culturais
  /\b(parasita|black\s+mirror|1984|admirável\s+mundo\s+novo|revolução\s+dos\s+bichos|senhor\s+das\s+moscas|capitães\s+da\s+areia|vidas\s+secas|memórias\s+póstumas|dom\s+casmurro|o\s+cortiço|macunaíma|grande\s+sertão|hora\s+da\s+estrela)\b/i,
  // Eventos históricos
  /\b(revolução\s+industrial|revolução\s+francesa|guerra\s+fria|apartheid|holocausto|escravidão|abolição|independência|ditadura\s+militar|redemocratização|movimento\s+negro|movimento\s+feminista|primavera\s+árabe|muro\s+de\s+berlim)\b/i,
]

// =============================================================================
// PADRÕES DE INFORMALIDADE (C1) — refinados para evitar falsos positivos
// =============================================================================

const INFORMAL_PATTERNS = [
  // Gírias e abreviações internet
  /\b(tipo\s+assim|aí|né|tá\b|vc\b|tbm?|eh\b|mt\b|mto\b|blz|pq\b|qdo|cmg|tmj)\b/i,
  // Risadas
  /\b(hahaha|kkk+|rs+|kkkk+)\b/i,
  // Excesso de pontuação
  /[!]{2,}|[?]{2,}/,
  // Expressões de opinião informal em 1ª pessoa
  /\b(eu\s+acho|na\s+minha\s+opinião|tipo\s+assim|pra\s+mim)\b/i,
  // Coloquialismos adicionais
  /\b(tipo|assim\s+tipo|e\s+tal|e\s+tudo|sei\s+lá|sabe\?|entende\?)\b/i,
]

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function snapToLevel(score: number): number {
  const clamped = Math.max(0, Math.min(200, score))
  return SCORE_LEVELS.reduce((prev, curr) =>
    Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
  )
}

function getLevel(score: number): CompetencyFeedback['level'] {
  if (score <= 40) return 'critical'
  if (score <= 80) return 'needs-work'
  if (score <= 160) return 'good'
  return 'excellent'
}

/** Verifica se um token normalizado está contido no texto normalizado */
function containsNormalized(textNorm: string, tokenNorm: string): boolean {
  return textNorm.includes(tokenNorm)
}

/** Conta palavras únicas no texto (excluindo stopwords) */
function getRelevantWords(text: string): Map<string, number> {
  const words = text.toLowerCase().split(/\s+/)
  const counts = new Map<string, number>()
  for (const word of words) {
    const clean = word.replace(/[^\wàáâãéèêíïóôõöúç]/g, '')
    if (clean.length < 3) continue
    if (STOPWORDS_PT.has(clean)) continue
    counts.set(clean, (counts.get(clean) || 0) + 1)
  }
  return counts
}

// =============================================================================
// AVALIAÇÃO DAS COMPETÊNCIAS
// =============================================================================

/**
 * C1 — Domínio da modalidade escrita formal da língua
 */
export function evaluateC1(text: string): CompetencyFeedback {
  const tips: string[] = []
  const evidence: string[] = []
  let deductions = 0

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Comece a escrever para receber feedback sobre a norma culta.'] }
  }

  // Informalidade — com contexto
  const informalFound: string[] = []
  for (const pattern of INFORMAL_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, 'gi'))
    if (matches) {
      const unique = [...new Set(matches.map(m => m.trim()))]
      informalFound.push(...unique)
    }
  }
  if (informalFound.length > 0) {
    const unique = [...new Set(informalFound)].slice(0, 8)
    // Penalização escalonada: cada ocorrência adicional pesa mais
    const severityScore = Math.min(unique.length * 35, 180)
    deductions += severityScore
    evidence.push(...unique.map(u => `"${u}"`))
    tips.push(`Evite linguagem informal: ${unique.slice(0, 5).join(', ')}. Use registro formal.`)
  }

  // Abreviações de uma letra usadas como palavras (q, c, d, p isolados)
  const singleLetterAbbr = text.match(/\b[qcdp]\b/gi)
  if (singleLetterAbbr && singleLetterAbbr.length > 0) {
    deductions += Math.min(singleLetterAbbr.length * 20, 60)
    tips.push('Evite abreviações de uma letra ("q", "c", "d", "p"). Escreva a palavra completa.')
  }

  // Primeira pessoa excessiva
  const firstPerson = text.match(/\b(eu\s|meu|minha|meus|minhas|nós\s|nosso|nossa)\b/gi)
  if (firstPerson && firstPerson.length > 3) {
    deductions += 30
    tips.push('Reduza o uso de primeira pessoa. Prefira impessoalização ("é possível observar", "nota-se").')
  }

  // Frases muito curtas (desenvolvimento insuficiente)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length < 5)
  if (sentences.length > 3 && shortSentences.length / sentences.length > 0.5) {
    deductions += 30
    tips.push('Muitas frases curtas. Desenvolva períodos mais complexos com orações subordinadas.')
  }

  // Capitalização após ponto
  const badCaps = text.match(/\.\s+[a-záàâãéèêíïóôõöúç]/g)
  if (badCaps && badCaps.length > 0) {
    deductions += Math.min(badCaps.length * 15, 60)
    tips.push(`Inicie frases com letra maiúscula após ponto final (${badCaps.length} ocorrência${badCaps.length > 1 ? 's' : ''}).`)
  }

  // Acentuação — palavras comuns
  const accentIssues: string[] = []
  const accentChecks: Array<{ pattern: RegExp; suggestion: string }> = [
    { pattern: /\bnao\b/gi, suggestion: 'não' },
    { pattern: /\btambem\b/gi, suggestion: 'também' },
    { pattern: /\bja\b/gi, suggestion: 'já' },
    { pattern: /\bate\b/gi, suggestion: 'até' },
    { pattern: /\bvoce\b/gi, suggestion: 'você' },
    { pattern: /\bsao\b/gi, suggestion: 'são' },
  ]
  for (const check of accentChecks) {
    if (check.pattern.test(text)) accentIssues.push(check.suggestion)
  }
  if (accentIssues.length > 0) {
    deductions += Math.min(accentIssues.length * 15, 60)
    tips.push(`Revise acentuação: verifique palavras como ${accentIssues.slice(0, 3).join(', ')}.`)
  }

  // Espaçamento após pontuação
  const badPunctSpacing = text.match(/\w[,;:]\w/g)
  if (badPunctSpacing && badPunctSpacing.length > 2) {
    deductions += 15
    tips.push('Adicione espaço após vírgulas, ponto e vírgula e dois-pontos.')
  }

  // Pobreza vocabular — type-token ratio geral (inclui todas as palavras)
  const allWords = text.toLowerCase().split(/\s+/).map(w => w.replace(/[^\wàáâãéèêíïóôõöúç]/g, '')).filter(w => w.length > 0)
  const totalWords = allWords.length
  const uniqueWords = new Set(allWords).size
  if (totalWords > 30 && uniqueWords / totalWords < 0.45) {
    deductions += 60
    tips.push('Vocabulário pouco variado. Use sinônimos e termos mais específicos para demonstrar domínio lexical.')
  } else if (totalWords > 30 && uniqueWords / totalWords < 0.55) {
    deductions += 30
    tips.push('Vocabulário com alguma repetição. Varie mais os termos para enriquecer o texto.')
  }

  // Frases excessivamente simples (sem orações subordinadas)
  const allSentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const complexSentences = allSentences.filter(s =>
    /\b(que|quem|onde|cujo|quando|enquanto|embora|porque|visto que|já que|se|caso|conforme)\b/i.test(s)
  )
  if (allSentences.length > 3 && complexSentences.length / allSentences.length < 0.25) {
    deductions += 40
    tips.push('Períodos muito simples. Construa orações complexas com subordinação para demonstrar maturidade sintática.')
  } else if (allSentences.length > 3 && complexSentences.length / allSentences.length < 0.35) {
    deductions += 20
    tips.push('Poucas orações subordinadas. Desenvolva períodos mais complexos.')
  }

  const score = snapToLevel(Math.max(0, 200 - deductions))

  if (tips.length === 0) {
    tips.push('Bom domínio da norma culta. Continue revisando para manter a qualidade.')
  }

  return { score, level: getLevel(score), tips, evidence }
}

/**
 * C2 — Compreensão do tema e uso de repertório sociocultural
 */
export function evaluateC2(
  text: string,
  themeKeywords: string[],
  equivalences: string[] = []
): CompetencyFeedback {
  const tips: string[] = []
  const evidence: string[] = []
  let score = 0

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Escreva sobre o tema proposto para receber feedback de repertório sociocultural.'] }
  }

  const textNorm = normalizeForSearch(text)

  // Adesão temática — com equivalências e variações morfológicas
  const allKeywords = [...themeKeywords, ...equivalences]
  const uniqueNormKeywords = [...new Set(allKeywords.map(k => normalizeForSearch(k)))]
    .filter(k => k.length > 2) // ignora tokens muito curtos

  const themeHits: string[] = []
  for (const kw of uniqueNormKeywords) {
    if (containsNormalized(textNorm, kw)) {
      themeHits.push(kw)
    } else {
      // Tenta matching parcial (radicais com 4+ chars) para variações morfológicas
      const radical = kw.length > 5 ? kw.slice(0, -2) : kw
      if (radical.length >= 4 && containsNormalized(textNorm, radical)) {
        themeHits.push(kw)
      }
    }
  }

  // Contar acertos por tokens individuais E por frases multi-palavra separadamente
  // Frases como "insegurança alimentar" são normalizadas e buscadas inteiras no texto
  const normKeywords = themeKeywords.map(k => normalizeForSearch(k)).filter(k => k.length > 2)
  const normEquivs = equivalences.map(e => normalizeForSearch(e)).filter(e => e.length > 2)

  let kwCount = 0
  for (const kw of normKeywords) {
    if (textNorm.includes(kw)) kwCount++
  }
  let eqCount = 0
  for (const eq of normEquivs) {
    if (textNorm.includes(eq)) eqCount++
    else {
      // Matching parcial por radical para variações morfológicas de equivalências
      const radical = eq.length > 5 ? eq.slice(0, -2) : eq
      if (radical.length >= 4 && textNorm.includes(radical)) eqCount++
    }
  }
  const totalHits = kwCount + eqCount

  // Adesão temática: precisa de pelo menos 2 termos relevantes (keywords OU equivalências)
  if (totalHits === 0) {
    tips.push('Seu texto parece distante do tema. Retome os termos-chave da proposta ou use vocabulário equivalente.')
  } else if (totalHits === 1) {
    score += 40
    tips.push('Pouca adesão temática. Use mais termos relacionados ao tema para fortalecer a argumentação.')
  } else if (totalHits <= 2) {
    score += 60
    tips.push('Boa adesão temática. Considere variar o vocabulário com sinônimos e termos relacionados.')
  } else if (totalHits <= 4) {
    score += 80
    tips.push('Boa variedade de termos temáticos e equivalentes.')
  } else {
    score += 100
    tips.push('Excelente domínio vocabular do tema com uso rico de equivalências.')
  }

  // Repertório sociocultural
  const repertoryMatches: string[] = []
  for (const pattern of REPERTORY_INDICATORS) {
    const matches = text.match(new RegExp(pattern.source, 'gi'))
    if (matches) repertoryMatches.push(...matches)
  }
  const uniqueRepertory = [...new Set(repertoryMatches.map(m => m.trim()))]

  if (uniqueRepertory.length === 0) {
    tips.push('Nenhum repertório sociocultural identificado. Cite autores, leis, obras ou fatos históricos relevantes ao tema.')
  } else {
    evidence.push(...uniqueRepertory)

    // Verificar ARTICULAÇÃO — repertório precisa estar conectado ao argumento
    // Raio de ~150 chars para capturar frases completas com autor + análise
    const articulatedCount = uniqueRepertory.filter(rep => {
      const idx = text.toLowerCase().indexOf(rep.toLowerCase())
      if (idx === -1) return false
      const context = text.slice(Math.max(0, idx - 150), Math.min(text.length, idx + 150))
      const contextLower = context.toLowerCase()

      // Exige verbo de atribuição/análise EXPLÍCITO — marcadores genéricos como
      // "nesse contexto", "diante desse cenário" NÃO contam como articulação
      // pois aparecem em qualquer parágrafo sem conectar o repertório ao argumento
      const hasAttributionVerb = /\b(segundo|conforme|de\s+acordo\s+com|como\s+afirma|como\s+diz|como\s+sustenta|como\s+defende|como\s+aponta|como\s+evidencia|como\s+demonstra|como\s+analisa|como\s+observa|como\s+mostra|como\s+explica|como\s+destaca|como\s+enfatiza|como\s+lembra|como\s+ressalta|como\s+adverte|como\s+pondera|na\s+obra|na\s+visão\s+de|no\s+entendimento\s+de|para\s+\w+\s+(a\s+)?(fome|desigualdade|violência|educação|saúde|racismo|trabalho|mobilidade|clima))\b/i.test(context)
      // Verbos conjugados no passado/presente que atribuem ideia ao autor dentro do contexto
      const hasConjugatedAttribution = /\b(demonstrava|demonstrou|argumentava|argumentou|sustentava|sustentou|defendia|defendeu|evidenciava|evidenciou|mostrava|mostrou|afirmava|afirmou|apontava|apontou|analisava|analisou|observava|observou|destacava|destacou|ressaltava|ressaltou|explicava|explicou|alertava|alertou|denunciava|denunciou|criticava|criticou|propunha|propôs)\b/i.test(contextLower)
      const hasAnalyticalConnection = /\b(corrobora|ilustra|exemplifica|evidencia|demonstra|revela|confirma|comprova|ratifica|reflete|expressa|traduz|materializa|concretiza|dialoga\s+com|conversa\s+com|comprova\s+essa|confirma\s+essa|valida\s+essa|corrobora\s+essa)\b/i.test(contextLower)

      return hasAttributionVerb || hasConjugatedAttribution || hasAnalyticalConnection
    }).length

    if (articulatedCount === 0) {
      score += 20
      tips.push(`Repertório citado (${uniqueRepertory.join(', ')}), mas sem articulação clara com a argumentação. Explique COMO a referência se conecta ao seu argumento.`)
    } else if (articulatedCount === 1) {
      score += 80
      tips.push(`Repertório identificado e articulado. Tente conectar mais referências ao argumento.`)
    } else if (articulatedCount >= 2) {
      score += 120
      tips.push(`Excelente uso de repertórios articulados (${articulatedCount} referências produtivas).`)
    }
  }

  const snapped = snapToLevel(Math.min(score, 200))
  return { score: snapped, level: getLevel(snapped), tips, evidence }
}

/**
 * C3 — Seleção, relação, organização e interpretação de informações, fatos e argumentos
 */
export function evaluateC3(text: string): CompetencyFeedback {
  const tips: string[] = []
  const evidence: string[] = []
  let score = 0

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Desenvolva argumentos organizados para receber feedback de estrutura argumentativa.'] }
  }

  const paragraphs = normalizeParagraphs(text)
  const words = text.trim().split(/\s+/).length

  // Identificar estrutura por posição + indicadores
  const hasIntroMarker = paragraphs.length > 0 &&
    /\b(apresentar|discutir|analisar|debater|abordar|refletir|questão|problema|desafio|tema)\b/i.test(paragraphs[0])
  // Quantidade de parágrafos — NÃO exige 4 como obrigatório
  if (paragraphs.length < 2) {
    tips.push('Texto com apenas um bloco. Organize em parágrafos distintos: introdução, desenvolvimento e conclusão.')
  } else if (paragraphs.length === 2) {
    score += 40
    tips.push('Estrutura básica (2 parágrafos). Considere separar introdução de desenvolvimento e adicionar conclusão própria.')
  } else if (paragraphs.length === 3) {
    score += 60
    if (!hasIntroMarker) {
      tips.push('Considere apresentar a tese claramente na introdução.')
    }
    tips.push('Considere adicionar um segundo parágrafo de desenvolvimento para fortalecer a argumentação.')
  } else if (paragraphs.length >= 4 && paragraphs.length <= 6) {
    score += 80
  } else if (paragraphs.length > 6) {
    score += 60
    tips.push('Muitos parágrafos podem fragmentar a argumentação. Considere consolidar ideias relacionadas.')
  }

  // Progressão argumentativa
  const uniqueArgMarkers = [...new Set(ARGUMENT_MARKERS.filter(m => text.toLowerCase().includes(m)))]

  if (uniqueArgMarkers.length === 0) {
    tips.push('Use marcadores argumentativos ("nesse contexto", "é possível notar", "diante disso") para guiar o leitor.')
  } else if (uniqueArgMarkers.length < 3) {
    score += 30
    tips.push(`Poucos marcadores argumentativos (${uniqueArgMarkers.length}). Varie os conectivos para demonstrar progressão.`)
  } else {
    score += 60
  }

  // Desenvolvimento — profundidade dos parágrafos
  if (paragraphs.length > 0) {
    const avgWordsPerPara = words / paragraphs.length
    if (avgWordsPerPara < 25) {
      tips.push('Parágrafos muito curtos. Desenvolva cada argumento com explicação, exemplificação e análise.')
    } else if (avgWordsPerPara > 150) {
      score += 10
      tips.push('Parágrafos longos podem dificultar a leitura. Divida ideias distintas em parágrafos separados.')
    } else {
      score += 40
    }
  }

  // Profundidade argumentativa — penaliza textos que têm estrutura mas conteúdo raso
  // Detecta parágrafos de desenvolvimento sem análise crítica (apenas afirmações genéricas)
  const devParagraphs = paragraphs.slice(1, -1) // exclui intro e conclusão
  if (devParagraphs.length > 0) {
    const shallowDevCount = devParagraphs.filter(p => {
      const pLower = p.toLowerCase()
      // Parágrafo sem verbo analítico, sem repertório, sem exemplificação concreta
      const hasAnalysis = /\b(analis|observ|not|perceb|evidenci|demonstr|revel|mostr|indic|suger|comprov|confirm|corrobor|ilustr|exemplific|reflet|traduz|materializ)\b/i.test(p)
      const hasRepertory = REPERTORY_INDICATORS.some(r => r.test(p))
      const hasConcreteExample = /\b(por exemplo|como por exemplo|tal como|no caso|como ocorre|conforme dados|segundo pesquisa|de acordo com levantamento)\b/i.test(pLower)
      return !hasAnalysis && !hasRepertory && !hasConcreteExample
    }).length

    if (shallowDevCount === devParagraphs.length && devParagraphs.length >= 2) {
      // Todos os parágrafos de desenvolvimento são rasos
      score -= 40
      tips.push('Argumentos pouco desenvolvidos. Cada parágrafo deve conter análise, exemplificação ou referência sociocultural articulada à tese.')
    } else if (shallowDevCount > 0 && shallowDevCount >= devParagraphs.length * 0.5) {
      score -= 20
      tips.push('Alguns parágrafos de desenvolvimento carecem de profundidade analítica.')
    }
  }

  const snapped = snapToLevel(Math.max(0, Math.min(score, 200)))
  return { score: snapped, level: getLevel(snapped), tips, evidence }
}

/**
 * C4 — Demonstração de conhecimento dos mecanismos linguísticos (coesão)
 */
export function evaluateC4(text: string): CompetencyFeedback {
  const tips: string[] = []
  const evidence: string[] = []
  let score = 0

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Escreva seu texto para receber feedback sobre coesão textual.'] }
  }

  const textLower = text.toLowerCase()

  // Detecção case-insensitive com normalização
  const cohesiveFound: string[] = []
  for (const device of COHESIVE_DEVICES) {
    if (textLower.includes(device.toLowerCase())) {
      cohesiveFound.push(device)
    }
  }
  const uniqueCohesive = [...new Set(cohesiveFound)]

  if (uniqueCohesive.length === 0) {
    tips.push('Nenhum operador coesivo identificado. Use conectivos como "portanto", "entretanto", "ademais", "nesse sentido".')
  } else if (uniqueCohesive.length < 3) {
    score += 40
    tips.push(`Poucos conectivos (${uniqueCohesive.length}). Diversifique os mecanismos coesivos entre e dentro dos parágrafos.`)
  } else if (uniqueCohesive.length < 6) {
    score += 120
    tips.push(`Bom uso de coesão (${uniqueCohesive.length} conectivos variados). Verifique se não há repetição excessiva.`)
  } else {
    score += 160
  }

  evidence.push(...uniqueCohesive)

  // Repetição de conectivos
  const repeatedConnectors: Array<[string, number]> = []
  for (const device of uniqueCohesive) {
    const regex = new RegExp(`\\b${device}\\b`, 'gi')
    const matches = text.match(regex)
    if (matches && matches.length > 2) {
      repeatedConnectors.push([device, matches.length])
    }
  }
  if (repeatedConnectors.length > 0) {
    const names = repeatedConnectors.map(([name, count]) => `"${name}" (${count}×)`).join(', ')
    tips.push(`Conectivos repetidos: ${names}. Substitua por sinônimos para demonstrar vocabulário variado.`)
    score -= Math.min(repeatedConnectors.length * 15, 40)
  }

  // Referências vagas em excesso
  const vagueRefs = text.match(/\b(isso|isto|aquilo|esse|esta|aquele|essa|tal|mesmo|próprio)\b/gi)
  if (vagueRefs && vagueRefs.length > 5) {
    tips.push('Muitas referências vagas ("isso", "esse", "tal"). Especifique o referente para evitar ambiguidade.')
    score -= 15
  }

  // Repetição de palavras relevantes (não stopwords) — detecta pobreza vocabular
  const wordCounts = getRelevantWords(text)
  const highlyRepeated: string[] = []
  for (const [word, count] of wordCounts) {
    if (count >= 5 && word.length > 4) {
      highlyRepeated.push(`"${word}" (${count}×)`)
    }
  }
  if (highlyRepeated.length > 2) {
    tips.push(`Palavras repetidas em excesso: ${highlyRepeated.slice(0, 3).join(', ')}. Use sinônimos para enriquecer o vocabulário.`)
    score -= 15
  }

  // Conectivos genéricos/básicos em excesso — textos intermediários usam "e", "mas", "também"
  // mas poucos conectivos sofisticados; penaliza quando a maioria dos hits são básicos
  const basicConnectors = ['e', 'mas', 'também', 'então', 'porque', 'porém', 'assim']
  const basicHits = uniqueCohesive.filter(c => basicConnectors.some(b => c.toLowerCase() === b))
  if (uniqueCohesive.length >= 3 && basicHits.length / uniqueCohesive.length > 0.6) {
    score -= 30
    tips.push('Conectivos muito básicos. Use operadores mais variados como "ademais", "entretanto", "conquanto", "nesse sentido".')
  }

  const snapped = snapToLevel(Math.max(0, Math.min(score, 200)))
  return { score: snapped, level: getLevel(snapped), tips, evidence }
}

/**
 * C5 — Proposta de intervenção com respeito aos direitos humanos
 */
export function evaluateC5(text: string): CompetencyFeedback {
  const tips: string[] = []
  const evidence: string[] = []

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Escreva uma conclusão com proposta de intervenção para receber feedback de C5.'] }
  }

  const paragraphs = normalizeParagraphs(text)
  if (paragraphs.length < 2) {
    return {
      score: 0, level: 'critical',
      tips: ['Texto muito curto para identificar uma proposta de intervenção. Desenvolva mais parágrafos.'],
    }
  }

  // Buscar proposta nos últimos 2-3 parágrafos (não só o último)
  const searchParagraphs = paragraphs.slice(-3).join(' ')
  const conclusionText = searchParagraphs.toLowerCase()
  const lastParagraph = paragraphs[paragraphs.length - 1].toLowerCase()

  // 1. Conectivo conclusivo
  const hasConclusionMarker = CONCLUSION_MARKERS.some(m =>
    lastParagraph.includes(m) || conclusionText.includes(m)
  )
  if (!hasConclusionMarker) {
    tips.push('Sua conclusão não possui conectivo conclusivo claro. Use "Portanto", "Em suma", "Diante do exposto" etc.')
  }

  // 2. AGENTE
  const agentEvidence: string[] = []
  for (const pattern of AGENT_PATTERNS) {
    const match = conclusionText.match(pattern)
    if (match) agentEvidence.push(match[0])
  }
  const hasAgent = agentEvidence.length > 0
  if (hasAgent) {
    evidence.push(`Agente: ${agentEvidence[0]}`)
  } else {
    tips.push('Agente não identificado na proposta. Especifique QUEM deve agir (governo, escolas, mídia, sociedade etc.).')
  }

  // 3. AÇÃO
  const actionEvidence: string[] = []
  for (const pattern of ACTION_PATTERNS) {
    const match = conclusionText.match(pattern)
    if (match) actionEvidence.push(match[0])
  }
  const hasAction = actionEvidence.length > 0
  if (hasAction) {
    evidence.push(`Ação: ${actionEvidence[0]}`)
  } else {
    tips.push('Ação não identificada. Descreva O QUE deve ser feito (criar políticas, implementar programas, promover campanhas etc.).')
  }

  // 4. MEIO/MODO
  const meansEvidence: string[] = []
  for (const pattern of MEANS_PATTERNS) {
    const match = conclusionText.match(pattern)
    if (match) meansEvidence.push(match[0])
  }
  const hasMeans = meansEvidence.length > 0
  if (hasMeans) {
    evidence.push(`Meio: ${meansEvidence[0]}`)
  } else {
    tips.push('Meio/modo não identificado. Explique COMO a ação será realizada (por meio de, através de, mediante etc.).')
  }

  // 5. FINALIDADE
  const purposeEvidence: string[] = []
  for (const pattern of PURPOSE_PATTERNS) {
    const match = conclusionText.match(pattern)
    if (match) purposeEvidence.push(match[0])
  }
  const hasPurpose = purposeEvidence.length > 0
  if (hasPurpose) {
    evidence.push(`Finalidade: ${purposeEvidence[0]}`)
  } else {
    tips.push('Finalidade não identificada. Indique PARA QUE a ação é proposta (com a finalidade de, visando a, a fim de etc.).')
  }

  // 6. DETALHAMENTO
  const detailEvidence: string[] = []
  for (const pattern of DETAIL_INDICATORS) {
    const match = conclusionText.match(pattern)
    if (match) detailEvidence.push(match[0])
  }
  const hasDetail = detailEvidence.length > 0
  if (hasDetail) {
    evidence.push(`Detalhamento: ${detailEvidence[0]}`)
  } else {
    tips.push('Detalhamento ausente. Acrescente especificações: qual órgão exatamente, qual programa, em qual prazo, para qual público-alvo.')
  }

  // Verificar QUALIDADE da proposta — ação e detalhamento genéricos reduzem a nota
  // "implementar ações por meio de investimentos" casa padrões mas é vago
  const genericActionPattern = /\b(fazer\s+algo|resolver\s+(o|esse|este)\s+problema|tomar\s+(medidas?|providências?)|agir|atuar)\b/i.test(conclusionText)
  const vagueObjectPattern = /\b(ações?\s+(genéricas?|gerais?)|investimentos?\s+(sem|pouco)|políticas?\s+(sem|pouco)\s+(detalhe|especificação|concretude))\b/i.test(conclusionText)
  const actionIsGeneric = !actionEvidence.some(e =>
    /\b(políticas?|programas?|projetos?|campanhas?|medidas?|planos?|leis?|sistemas?|estratégias?|iniciativas?)\b/i.test(e)
  ) && !vagueObjectPattern === false
  const detailIsAbsentOrWeak = !hasDetail

  // Penalidade de genericidade: se ação é vaga E não há detalhamento concreto,
  // a proposta não demonstra competência 5 plena mesmo com 4 elementos superficiais
  const isGenericProposal = (genericActionPattern || (actionIsGeneric && detailIsAbsentOrWeak))

  // Calcular pontuação baseada em QUALIDADE, não apenas contagem
  const elements = [hasAgent, hasAction, hasMeans, hasPurpose, hasDetail].filter(Boolean).length

  let rawScore: number
  if (elements === 0) {
    rawScore = hasConclusionMarker ? 20 : 0
  } else if (elements === 1) {
    rawScore = 40
  } else if (elements === 2) {
    rawScore = 80
  } else if (elements === 3) {
    rawScore = 120
  } else if (elements === 4) {
    // Proposta com 4 elementos mas genérica → máximo 80 (nível 2): estrutura presente mas sem concretude
    rawScore = isGenericProposal ? 80 : 160
  } else {
    // Proposta com 5 elementos mas ação genérica → máximo 120 (nível 3)
    rawScore = isGenericProposal ? 120 : 200
  }

  if (isGenericProposal && elements >= 4) {
    tips.push('Proposta com estrutura completa, mas pouco concreta. Especifique qual programa, projeto ou medida exatamente será implementado.')
  }

  const snapped = snapToLevel(rawScore)

  if (tips.length === 0) {
    tips.push('Proposta de intervenção completa! Todos os 5 elementos foram identificados.')
  }

  return { score: snapped, level: getLevel(snapped), tips, evidence }
}

// =============================================================================
// FUNÇÃO PRINCIPAL — Avaliação completa do texto
// =============================================================================

/**
 * Avalia o texto completo em todas as 5 competências.
 * Função pura — sem dependências de React.
 */
export function evaluateEssay(
  text: string,
  themeKeywords: string[],
  equivalences: string[] = []
): EvaluationResult {
  const c1 = evaluateC1(text)
  const c2 = evaluateC2(text, themeKeywords, equivalences)
  const c3 = evaluateC3(text)
  const c4 = evaluateC4(text)
  const c5 = evaluateC5(text)

  const overallTips: string[] = []
  const totalWords = text.trim().split(/\s+/).filter(Boolean).length

  if (totalWords === 0) {
    overallTips.push('Comece a escrever sua redação para receber feedback automático em tempo real.')
  } else if (totalWords < 100) {
    overallTips.push(`Texto com ${totalWords} palavras. Uma redação ENEM competitiva tem entre 250 e 300 palavras.`)
  } else if (totalWords < 200) {
    overallTips.push(`Texto com ${totalWords} palavras. Busque desenvolver mais os argumentos para alcançar pelo menos 250 palavras.`)
  } else if (totalWords > 400) {
    overallTips.push(`Texto com ${totalWords} palavras. Cuidado para não ultrapassar 30 linhas na folha oficial.`)
  }

  return { c1, c2, c3, c4, c5, overallTips }
}