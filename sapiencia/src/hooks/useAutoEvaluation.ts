import { useMemo } from 'react'

export interface CompetencyFeedback {
  score: number
  level: 'critical' | 'needs-work' | 'good' | 'excellent'
  tips: string[]
}

export interface AutoEvaluationResult {
  c1: CompetencyFeedback
  c2: CompetencyFeedback
  c3: CompetencyFeedback
  c4: CompetencyFeedback
  overallTips: string[]
}

const SCORE_LEVELS = [0, 40, 80, 120, 160, 200] as const

function getLevel(score: number): CompetencyFeedback['level'] {
  if (score <= 40) return 'critical'
  if (score <= 80) return 'needs-work'
  if (score <= 160) return 'good'
  return 'excellent'
}

// Common formal writing issues in Portuguese
const INFORMAL_PATTERNS = [
  /\b(tipo|tipo assim|aí|né|tá|pra|pro|pros|pras|dum|duma|q\b|vc\b|tbm?|eh\b|mt|mto|pouco|demais)\b/i,
  /\b(hahaha|kkk+|rs+)\b/i,
  /[!]{2,}|[?]{2,}/,
  /\b(minha opinião|eu acho|na minha visão pessoal)\b/i,
]

const COHESIVE_DEVICES = [
  'portanto', 'entretanto', 'contudo', 'todavia', 'ademais', 'outrossim',
  'nesse sentido', 'diante disso', 'sendo assim', 'por conseguinte',
  'em contrapartida', 'não obstante', 'sobretudo', 'conquanto',
  'além disso', 'por outro lado', 'em suma', 'em síntese',
  'primeiramente', 'segundamente', 'por fim', 'finalmente',
  'visto que', 'uma vez que', 'já que', 'embora', 'ainda que',
  'no entanto', 'mas também', 'bem como', 'de tal forma que',
]

const ARGUMENT_MARKERS = [
  'porque', 'pois', 'visto que', 'uma vez que', 'já que',
  'dado que', 'considerando que', 'tendo em vista',
  'por exemplo', 'como por exemplo', 'tal como',
  'nesse contexto', 'diante desse cenário', 'nessa perspectiva',
  'é possível notar', 'nota-se', 'percebe-se', 'observa-se',
  'é evidente', 'é notório', 'fica claro',
]

const REPERTORY_INDICATORS = [
  // Authors and thinkers
  /\b(bauman|foucault|arendt|freire|marx|durkheim|weber|kant|locke|rousseau|hobbes|maquiavel|platão|aristóteles|sartre|camus|nietzsche|hegel|adorno|habermas|bourdieu|giddens|beck|lipovetsky|byung-chul|han|silvio almeida|gilberto freyre|machado de assis|graciliano ramos|conceição evaristo|jorge amado|clarice lispector|monteiro lobato|mário de andrade|oswald de andrade|carlos drummond|joão cabral|ferreira gullar|lygia fagundes telles|raduan nassar|milton hatoum|itamar vieira junior|djamilia ribeiro|bell hooks|angela davis|frantz fanon|eduardo viveiros de castro|ailton krenak|bruno latour|paul virilio|zygmunt|gilles deleuze|jacques derrida|michel serres|pierre bourdieu|jean baudrillard|slavoj žižek|noam chomsky|steven pinker|yuval harari|thomas piketty|amartya sen|martha nussbaum|judith butler|simone de beauvoir|hannah arendt)\b/i,
  // Laws and documents
  /\b(constituição federal|cf\/?88|declaração universal|direitos humanos|ddhu|estatuto da criança|eca|lei maria da penha|marco civil|lgpd|acordo de paris|ods|agenda 2030|pacto global)\b/i,
  // Cultural works
  /\b(parasita|black mirror|1984|admirável mundo novo|revolução dos bichos|senhor das moscas|capitães da areia|vidas secas|memórias póstumas|dom casmurro|o cortiço|iracema|macunaíma|grande sertão|hora da estrela|a paixão segundo gh)\b/i,
  // Historical events
  /\b(revolução industrial|revolução francesa|guerra fria|apartheid|holocausto|escravidão|abolição|independência|ditadura militar|redemocratização|movimento negro|movimento feminista|primavera árabe|muro de berlim|queda do muro)\b/i,
]

function evaluateC1(text: string): CompetencyFeedback {
  const tips: string[] = []
  let deductions = 0

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Comece a escrever para receber feedback sobre a norma culta.'] }
  }

  // Check informal language
  const informalFound: string[] = []
  for (const pattern of INFORMAL_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, 'gi'))
    if (matches) informalFound.push(...matches.map(m => `"${m.trim()}"`))
  }
  if (informalFound.length > 0) {
    const unique = [...new Set(informalFound)].slice(0, 5)
    deductions += Math.min(unique.length * 30, 120)
    tips.push(`Evite linguagem informal: ${unique.join(', ')}. Use registro formal.`)
  }

  // Check first-person usage (not always wrong, but flagged)
  const firstPerson = text.match(/\b(eu |meu|minha|meus|minhas|nós |nosso|nossa)\b/gi)
  if (firstPerson && firstPerson.length > 2) {
    deductions += 40
    tips.push('Reduza o uso de primeira pessoa. Prefira impessoalização ("é possível observar", "nota-se").')
  }

  // Check sentence length variation
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length < 5)
  if (sentences.length > 3 && shortSentences.length / sentences.length > 0.5) {
    deductions += 40
    tips.push('Muitas frases curtas. Desenvolva períodos mais complexos com orações subordinadas.')
  }

  // Check capitalization after periods
  const badCaps = text.match(/\.\s+[a-záàâãéèêíïóôõöúç]/g)
  if (badCaps && badCaps.length > 0) {
    deductions += Math.min(badCaps.length * 20, 80)
    tips.push(`Inicie frases com letra maiúscula após ponto final (${badCaps.length} ocorrência${badCaps.length > 1 ? 's' : ''}).`)
  }

  // Accentuation check (common missing accents)
  const commonUnaccented = [
    { word: /\bnao\b/gi, correct: 'não' },
    { word: /\btambem\b/gi, correct: 'também' },
    { word: /\bja\b/gi, correct: 'já' },
    { word: /\bate\b/gi, correct: 'até' },
    { word: /\bvoce\b/gi, correct: 'você' },
    { word: /\bsao\b/gi, correct: 'são' },
    { word: /\btem\b(?!\s)/gi, correct: 'têm (plural)' },
  ]
  const accentIssues: string[] = []
  for (const item of commonUnaccented) {
    if (item.word.test(text)) accentIssues.push(item.correct)
  }
  if (accentIssues.length > 0) {
    deductions += Math.min(accentIssues.length * 20, 80)
    tips.push(`Revise acentuação: verifique palavras como ${accentIssues.slice(0, 3).join(', ')}.`)
  }

  // Punctuation spacing
  const badPunctSpacing = text.match(/\w[,;:]\w/g)
  if (badPunctSpacing && badPunctSpacing.length > 0) {
    deductions += 20
    tips.push('Adicione espaço após vírgulas, pontos e vírgulas e dois-pontos.')
  }

  const score = Math.max(0, Math.min(200, 200 - deductions))
  // Snap to nearest valid ENEM score
  const snapped = SCORE_LEVELS.reduce((prev, curr) =>
    Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev
  )

  if (tips.length === 0) {
    tips.push('Boa domínio da norma culta! Continue revisando para manter a qualidade.')
  }

  return { score: snapped, level: getLevel(snapped), tips }
}

function evaluateC2(text: string, themeKeywords: string[]): CompetencyFeedback {
  const tips: string[] = []
  let score = 0

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Escreva sobre o tema proposto para receber feedback de repertório sociocultural.'] }
  }

  // Theme adherence — check keyword presence
  const lowerText = text.toLowerCase()
  const themeHits = themeKeywords.filter(kw => lowerText.includes(kw.toLowerCase()))
  const themeRatio = themeKeywords.length > 0 ? themeHits.length / themeKeywords.length : 0

  if (themeRatio < 0.2) {
    tips.push('Seu texto parece distante do tema. Retome os termos-chave da proposta.')
  } else if (themeRatio < 0.5) {
    score += 40
    tips.push('Aborde mais explicitamente os termos centrais do tema para fortalecer a argumentação.')
  } else {
    score += 80
  }

  // Repertory detection
  const repertoryMatches: string[] = []
  for (const pattern of REPERTORY_INDICATORS) {
    const matches = text.match(new RegExp(pattern.source, 'gi'))
    if (matches) repertoryMatches.push(...matches)
  }
  const uniqueRepertory = [...new Set(repertoryMatches)]

  if (uniqueRepertory.length === 0) {
    tips.push('Nenhum repertório sociocultural identificado. Cite autores, leis, obras ou fatos históricos relevantes ao tema.')
  } else if (uniqueRepertory.length === 1) {
    score += 40
    tips.push(`Repertório identificado: "${uniqueRepertory[0]}". Tente conectar mais de uma referência para enriquecer a argumentação.`)
  } else if (uniqueRepertory.length === 2) {
    score += 80
    tips.push(`Bom uso de repertórios (${uniqueRepertory.length} referências). Verifique se estão bem articulados ao argumento.`)
  } else {
    score += 120
    tips.push(`Excelente variedade de repertórios (${uniqueRepertory.length} referências). Certifique-se de que cada um está produtivo na argumentação.`)
  }

  // Productive use check — repertory should appear near argument markers
  if (uniqueRepertory.length > 0) {
    const hasArgumentNearRepertory = uniqueRepertory.some(rep => {
      const idx = lowerText.indexOf(rep.toLowerCase())
      if (idx === -1) return false
      const context = lowerText.slice(Math.max(0, idx - 80), Math.min(lowerText.length, idx + 80))
      return ARGUMENT_MARKERS.some(marker => context.includes(marker))
    })
    if (!hasArgumentNearRepertory && uniqueRepertory.length > 0) {
      tips.push('Conecte seus repertórios aos argumentos usando operadores argumentativos ("visto que", "nesse sentido", "diante disso").')
    }
  }

  const snapped = SCORE_LEVELS.reduce((prev, curr) =>
    Math.abs(curr - Math.min(score, 200)) < Math.abs(prev - Math.min(score, 200)) ? curr : prev
  )

  return { score: snapped, level: getLevel(snapped), tips }
}

function evaluateC3(text: string): CompetencyFeedback {
  const tips: string[] = []
  let score = 0

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Desenvolva argumentos organizados para receber feedback de estrutura argumentativa.'] }
  }

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  const words = text.trim().split(/\s+/).length

  // Paragraph count (ENEM expects intro + 2 dev + conclusion = ~4)
  if (paragraphs.length < 3) {
    tips.push('Estrutura incompleta. A redação deve ter introdução, pelo menos dois desenvolvimentos e conclusão.')
  } else if (paragraphs.length === 3) {
    score += 40
    tips.push('Considere adicionar um segundo parágrafo de desenvolvimento para fortalecer a argumentação.')
  } else if (paragraphs.length >= 4 && paragraphs.length <= 6) {
    score += 80
  } else {
    score += 60
    tips.push('Muitos parágrafos podem fragmentar a argumentação. Considere consolidar ideias relacionadas.')
  }

  // Argument markers presence
  const argMarkerCount = ARGUMENT_MARKERS.filter(marker =>
    text.toLowerCase().includes(marker)
  ).length

  if (argMarkerCount === 0) {
    tips.push('Use marcadores argumentativos ("nesse contexto", "é possível notar", "diante disso") para guiar o leitor.')
  } else if (argMarkerCount < 3) {
    score += 40
    tips.push(`Poucos marcadores argumentativos (${argMarkerCount}). Varie os conectivos para demonstrar progressão.`)
  } else {
    score += 80
  }

  // Development depth — average paragraph length
  if (paragraphs.length > 0) {
    const avgWordsPerPara = words / paragraphs.length
    if (avgWordsPerPara < 30) {
      tips.push('Parágrafos muito curtos. Desenvolva cada argumento com explicação, exemplificação e análise.')
    } else if (avgWordsPerPara > 150) {
      score += 20
      tips.push('Parágrafos longos podem dificultar a leitura. Divida ideias distintas em parágrafos separados.')
    } else {
      score += 40
    }
  }

  const snapped = SCORE_LEVELS.reduce((prev, curr) =>
    Math.abs(curr - Math.min(score, 200)) < Math.abs(prev - Math.min(score, 200)) ? curr : prev
  )

  return { score: snapped, level: getLevel(snapped), tips }
}

function evaluateC4(text: string): CompetencyFeedback {
  const tips: string[] = []
  let score = 0

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Escreva seu texto para receber feedback sobre coesão textual.'] }
  }

  // Cohesive device count
  const cohesiveFound = COHESIVE_DEVICES.filter(device =>
    text.toLowerCase().includes(device)
  )
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

  // Repetition check — same connector used too many times
  const connectorCounts: Record<string, number> = {}
  for (const device of COHESIVE_DEVICES) {
    const regex = new RegExp(`\\b${device}\\b`, 'gi')
    const matches = text.match(regex)
    if (matches && matches.length > 2) {
      connectorCounts[device] = matches.length
    }
  }
  const repeatedConnectors = Object.entries(connectorCounts)
  if (repeatedConnectors.length > 0) {
    const names = repeatedConnectors.map(([name, count]) => `"${name}" (${count}×)`).join(', ')
    tips.push(`Conectivos repetidos: ${names}. Substitua por sinônimos para demonstrar vocabulário variado.`)
    score -= Math.min(repeatedConnectors.length * 20, 60)
  }

  // Pronoun reference check (basic)
  const vagueRefs = text.match(/\b(isso|isto|aquilo|esse|esta|aquele|essa|tal|mesmo|próprio)\b/gi)
  if (vagueRefs && vagueRefs.length > 4) {
    tips.push('Muitas referências vagas ("isso", "esse", "tal"). Especifique o referente para evitar ambiguidade.')
    score -= 20
  }

  const snapped = SCORE_LEVELS.reduce((prev, curr) =>
    Math.abs(curr - Math.max(0, Math.min(score, 200))) < Math.abs(prev - Math.max(0, Math.min(score, 200))) ? curr : prev
  )

  return { score: snapped, level: getLevel(snapped), tips }
}

function evaluateC5(text: string): CompetencyFeedback {
  const tips: string[] = []
  let score = 0

  if (!text.trim()) {
    return { score: 0, level: 'critical', tips: ['Escreva uma conclusão com proposta de intervenção para receber feedback de C5.'] }
  }

  // Extract conclusion paragraph (last non-empty paragraph)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  if (paragraphs.length < 2) {
    return { score: 0, level: 'critical', tips: ['Texto muito curto para identificar uma proposta de intervenção. Desenvolva mais parágrafos.'] }
  }

  const conclusion = paragraphs[paragraphs.length - 1].toLowerCase()

  // Check for conclusion markers
  const conclusionMarkers = [
    'portanto', 'logo', 'assim', 'sendo assim', 'diante disso', 'diante do exposto',
    'em suma', 'em síntese', 'por fim', 'finalmente', 'conclui-se', 'infere-se',
    'depreende-se', 'fica evidente', 'nesse sentido', 'por conseguinte',
    'em vista disso', 'tendo em vista', 'face ao exposto', 'dessa forma',
  ]
  const hasConclusionMarker = conclusionMarkers.some(m => conclusion.includes(m))

  if (!hasConclusionMarker) {
    tips.push('Sua conclusão não possui conectivo conclusivo claro. Use "Portanto", "Em suma", "Diante do exposto" etc.')
  } else {
    score += 20
  }

  // AGENTE — who acts? Government, institutions, society, schools, media, NGOs, families
  const agentPatterns = [
    /\b(governo|estado|união|município|prefeitura|ministério|secretaria|poder (público|executivo|legislativo|judiciário)|escola|colégio|instituição|ong|organização|sociedade|família|famílias|indivíduo|cidadão|cidadãos|empresa|empresas|imprensa|mídia|universidade|professor|professores|educador|educadores)\b/i,
    /\b(ministério da \w+|secretaria de \w+|conselho tutelar|sus|capa|ibge|inep|mec|funai|incra|mdh|mcid)\b/i,
  ]
  const hasAgent = agentPatterns.some(p => conclusion.match(p))
  if (hasAgent) {
    score += 40
  } else {
    tips.push('Agente não identificado na proposta. Especifique QUEM deve agir (governo, escola, mídia, sociedade etc.).')
  }

  // AÇÃO — what should be done? Verbs in subjunctive/imperative/infinitive indicating intervention
  const actionPatterns = [
    /\b(deve[m]?|precisa[m]?|é (necessário|preciso|fundamental|essencial|importante|urgente)|cabe a|compete a|é dever|faz-se necessário|urge|convém|recomenda-se|propõe-se|sugere-se)\b/i,
    /\b(criar|implementar|desenvolver|promover|garantir|assegurar|fomentar|investir|ampliar|fortalecer|estabelecer|elaborar|executar|aplicar|adotar|instituir|regulamentar|fiscalizar|monitorar|conscientizar|educar|capacitar|oferecer|disponibilizar|viabilizar|mitigar|combater|erradicar|reduzir|prevenir|enfrentar|superar|resolver|solucionar|minimizar)\b/i,
    /\b(política[s]? pública[s]?|programa[s]?|projeto[s]?|campanha[s]?|medida[s]?|ação[aões]?|estratégia[s]?|iniciativa[s]?|lei|legislação|norma|regulamento|decreto|portaria|plano)\b/i,
  ]
  const hasAction = actionPatterns.some(p => conclusion.match(p))
  if (hasAction) {
    score += 40
  } else {
    tips.push('Ação não identificada. Descreva O QUE deve ser feito (criar políticas, implementar programas, promover campanhas etc.).')
  }

  // MEIO/MODO — how? Through what means?
  const meansPatterns = [
    /\b(por meio de|através de|mediante|via|com o uso de|com base em|com apoio de|com auxílio de|com ajuda de|com suporte de|com recursos de|com investimento em|com verba|com financiamento|com parceria|com colaboração|com cooperação|com articulação|com integração|com coordenação|com supervisão|com monitoramento|com fiscalização|com capacitação|com treinamento|com formação|com orientação|com conscientização|com educação|com informação|com divulgação|com publicidade|com propaganda)\b/i,
    /\b(utilizando|usando|empregando|adotando|aplicando|implantando|instalando|criando|desenvolvendo|elaborando|produzindo|gerando|ofertando|disponibilizando|proporcionando|viabilizando|facilitando|promovendo|estimulando|incentivando|fomentando)\b/i,
  ]
  const hasMeans = meansPatterns.some(p => conclusion.match(p))
  if (hasMeans) {
    score += 40
  } else {
    tips.push('Meio/modo não identificado. Explique COMO a ação será realizada (por meio de, através de, mediante etc.).')
  }

  // FINALIDADE — why? For what purpose?
  const purposePatterns = [
    /\b(com a finalidade de|com o objetivo de|com o intuito de|com o propósito de|com o fito de|com a meta de|com o alvo de|com vistas a|visando a|para que|para|a fim de|no sentido de|no intuito de|no propósito de|de modo a|de forma a|de maneira a)\b/i,
    /\b(garantir|assegurar|promover|melhorar|reduzir|diminuir|mitigar|combater|erradicar|prevenir|evitar|solucionar|resolver|minimizar|suprir|atender|satisfazer|contemplar|beneficiar|auxiliar|ajudar|amparar|proteger|defender|respeitar|valorizar|incluir|integrar|democratizar|universalizar|equilibrar|equalizar)\b/i,
  ]
  const hasPurpose = purposePatterns.some(p => conclusion.match(p))
  if (hasPurpose) {
    score += 40
  } else {
    tips.push('Finalidade não identificada. Indique PARA QUE a ação é proposta (com a finalidade de, visando a, a fim de etc.).')
  }

  // DETALHAMENTO — extra detail about agent, action, means or purpose
  const detailIndicators = [
    // Specific ministry/organ names
    /\b(ministério da (saúde|educação|cidadania|justiça|economia|meio ambiente|cultura|trabalho|defesa|agricultura|ciência|tecnologia|comunicações|turismo|esporte|mulher|direitos humanos|planejamento|desenvolvimento|infraestrutura|minas e energia|relações exteriores|integração nacional|pesca e aquicultura|controladoria-geral|secretaria-geral|casa civil|gabinete pessoal))\b/i,
    // Specific programs/laws
    /\b(bolsa família|bolsa escola|fome zero|pró-universidade|pronatec|enem|sisu|prouni|fies|mais médicos|samu|upa|cras|creas|cadúnico|loas|bpc|pbf|igpm|inpc|ipca|selic|cdi|fgts|pis|pasep|cofins|icms|iss|iptu|ipva|itbi|itr|iof|csll|irpf|irpj|simples nacional|mei|clt|ect|ctps|rg|cpf|cnh|sus|capa|ibge|inep|mec|funai|incra|mdh|mcid|onu|oms|opas|unicef|unesco|oit|fmi|banco mundial|bid|ocde|g20|brics|mercosul|unifil|otan|omc|fao|pnuma|acnur|oim|uit|upr|cidh|corte idh|tribunal penal internacional|cpi|onu mulheres|habitat|unctad|undp|unfpa|unhabitat|unhcr|unicef|unido|unodc|unops|unrwa|unv|unwomen|wfp|who|wipo|wmo|world bank group)\b/i,
    // Timeframe or quantification
    /\b(em (curto|médio|longo) prazo|dentro de \d+|no prazo de|até \d{4}|anualmente|mensalmente|semanalmente|diariamente|gradualmente|progressivamente|paulatinamente|imediatamente|urgentemente|prioritariamente|preferencialmente|especialmente|principalmente|sobretudo|notadamente|designadamente|nomeadamente|mormente|maxime)\b/i,
    // Geographic or demographic specification
    /\b(em todo o território nacional|em âmbito nacional|estadual|municipal|federal|regional|local|nas escolas públicas|nas comunidades|nos bairros periféricos|nas zonas rurais|nas áreas urbanas|para (todos|todas|os|as) (brasileiros|cidadãos|estudantes|alunos|jovens|idosos|crianças|mulheres|negros|indígenas|quilombolas|ribeirinhos|pessoas com deficiência|população em situação de rua|refugiados|imigrantes|agricultores familiares|pescadores artesanais|catadores de materiais recicláveis|trabalhadores informais|microempreendedores|pequenos empresários|produtores rurais|povos tradicionais|comunidades originárias))\b/i,
  ]
  const hasDetail = detailIndicators.some(p => conclusion.match(p))
  if (hasDetail) {
    score += 40
  } else {
    tips.push('Detalhamento ausente. Acrescente especificações: qual órgão exatamente, qual programa, em qual prazo, para qual público-alvo.')
  }

  // Cap at 200 and snap to valid ENEM scores
  const snapped = SCORE_LEVELS.reduce((prev, curr) =>
    Math.abs(curr - Math.min(score, 200)) < Math.abs(prev - Math.min(score, 200)) ? curr : prev
  )

  if (tips.length === 0) {
    tips.push('Proposta de intervenção completa! Todos os 5 elementos foram identificados.')
  }

  return { score: snapped, level: getLevel(snapped), tips }
}

export interface AutoEvaluationResult {
  c1: CompetencyFeedback
  c2: CompetencyFeedback
  c3: CompetencyFeedback
  c4: CompetencyFeedback
  c5: CompetencyFeedback
  overallTips: string[]
}

export function useAutoEvaluation(text: string, themeKeywords: string[]): AutoEvaluationResult {
  return useMemo(() => {
    const c1 = evaluateC1(text)
    const c2 = evaluateC2(text, themeKeywords)
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
  }, [text, themeKeywords])
}