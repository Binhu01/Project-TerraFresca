export interface TemaRedacao {
  id: string
  titulo: string
  contextualizacao: string
  problematica: string
  /** Palavras-chave extraídas do título/problemática para matching direto */
  palavrasChave: string[]
  /** Sinônimos, variações morfológicas e termos relacionados para matching flexível */
  equivalencias: string[]
}

export const TEMAS: TemaRedacao[] = [
  {
    id: 'desafios-combate-fome',
    titulo: 'Os desafios no combate à fome no Brasil contemporâneo',
    contextualizacao: 'A Constituição Federal de 1988 garante a alimentação como direito social fundamental. No entanto, milhões de brasileiros ainda enfrentam insegurança alimentar severa.',
    problematica: 'Discuta as causas estruturais da persistência da fome no Brasil e proponha medidas para superá-la.',
    palavrasChave: ['fome', 'insegurança alimentar', 'alimentação', 'combate'],
    equivalencias: ['subnutrição', 'desnutrição', 'escassez de alimentos', 'direito à alimentação', 'segurança alimentar', 'miséria', 'pobreza extrema', 'acesso a alimentos', 'nutrição', 'abastecimento'],
  },
  {
    id: 'violencia-contra-mulher',
    titulo: 'A violência contra a mulher na sociedade brasileira',
    contextualizacao: 'A Lei Maria da Penha (2006) representa um marco no enfrentamento à violência doméstica, mas os índices de feminicídio permanecem alarmantes.',
    problematica: 'Analise os fatores culturais e institucionais que perpetuam a violência contra a mulher e aponte caminhos para sua redução.',
    palavrasChave: ['violência', 'mulher', 'feminicídio', 'doméstica'],
    equivalencias: ['agressão', 'abuso', 'machismo', 'patriarcado', 'cultura machista', 'Lei Maria da Penha', 'gênero', 'desigualdade de gênero', 'assédio', 'empoderamento feminino', 'proteção à mulher'],
  },
  {
    id: 'racismo-estrutura-social',
    titulo: 'O racismo como estrutura da sociedade brasileira',
    contextualizacao: 'Apesar de mais da metade da população se declarar preta ou parda, negros continuam sub-representados em posições de poder e sobrerrepresentados em indicadores de violência.',
    problematica: 'Debata como o racismo estrutural se manifesta nas instituições brasileiras e quais políticas podem promover equidade racial.',
    palavrasChave: ['racismo', 'estrutural', 'negro', 'equidade racial'],
    equivalencias: ['preconceito racial', 'discriminação racial', 'desigualdade racial', 'população negra', 'pretos e pardos', 'racismo institucional', 'segregação', 'cotas raciais', 'ações afirmativas', 'diversidade étnica'],
  },
  {
    id: 'saude-mental-jovens',
    titulo: 'A saúde mental dos jovens brasileiros no século XXI',
    contextualizacao: 'Pesquisas recentes apontam aumento significativo de transtornos de ansiedade e depressão entre adolescentes e jovens adultos no Brasil.',
    problematica: 'Discuta as causas desse cenário e proponha estratégias de prevenção e acolhimento nas escolas e comunidades.',
    palavrasChave: ['saúde mental', 'jovens', 'ansiedade', 'depressão'],
    equivalencias: ['transtornos mentais', 'bem-estar psicológico', 'adolescentes', 'juventude', 'sofrimento psíquico', 'CAPS', 'CVV', 'autocuidado', 'psicologia', 'terapia', 'acolhimento emocional', 'burnout'],
  },
  {
    id: 'acesso-educacao-basica',
    titulo: 'Os obstáculos ao acesso à educação básica de qualidade no Brasil',
    contextualizacao: 'O Brasil universalizou o acesso à escola, mas a qualidade do ensino público permanece desigual entre regiões e classes sociais.',
    problematica: 'Analise os principais desafios para garantir educação básica de qualidade para todos e proponha soluções viáveis.',
    palavrasChave: ['educação', 'ensino', 'qualidade', 'acesso'],
    equivalencias: ['escola', 'escolarização', 'ensino público', 'MEC', 'BNCC', 'IDEB', 'PISA', 'alfabetização', 'formação docente', 'infraestrutura escolar', 'evasão escolar', 'universalização'],
  },
  {
    id: 'crise-climatica-brasil',
    titulo: 'A crise climática e seus impactos no território brasileiro',
    contextualizacao: 'Eventos extremos como secas prolongadas, enchentes e deslizamentos têm se tornado cada vez mais frequentes em diversas regiões do país.',
    problematica: 'Discuta a relação entre mudanças climáticas e vulnerabilidade socioambiental no Brasil e proponha medidas de adaptação e mitigação.',
    palavrasChave: ['clima', 'mudanças climáticas', 'impactos', 'território'],
    equivalencias: ['aquecimento global', 'efeito estufa', 'desmatamento', 'Amazônia', 'sustentabilidade', 'meio ambiente', 'desastres naturais', 'enchentes', 'secas', 'Acordo de Paris', 'ODS', 'mitigação', 'adaptação climática', 'vulnerabilidade ambiental'],
  },
  {
    id: 'tecnologia-trabalho',
    titulo: 'Os impactos da inteligência artificial no mercado de trabalho brasileiro',
    contextualizacao: 'A automação e a inteligência artificial transformam rapidamente profissões e exigem novas competências dos trabalhadores.',
    problematica: 'Analise os desafios e oportunidades que a revolução tecnológica traz para o trabalhador brasileiro e proponha políticas de transição.',
    palavrasChave: ['inteligência artificial', 'trabalho', 'tecnologia', 'mercado'],
    equivalencias: ['automação', 'robotização', 'digitalização', 'revolução industrial', 'quarta revolução', 'empregabilidade', 'requalificação', 'capacitação profissional', 'uberização', 'teletrabalho', 'competências digitais', 'futuro do trabalho'],
  },
  {
    id: 'mobilidade-urbana',
    titulo: 'A mobilidade urbana como desafio das grandes cidades brasileiras',
    contextualizacao: 'O crescimento urbano desordenado gerou congestionamentos crônicos, transporte público precário e exclusão territorial nas metrópoles brasileiras.',
    problematica: 'Discuta as causas da crise de mobilidade urbana e proponha alternativas sustentáveis e inclusivas de deslocamento.',
    palavrasChave: ['mobilidade', 'urbana', 'transporte', 'cidades'],
    equivalencias: ['trânsito', 'congestionamento', 'metrô', 'ônibus', 'BRT', 'ciclovias', 'planejamento urbano', 'urbanização', 'deslocamento', 'acessibilidade', 'transporte coletivo', 'mobilidade sustentável', 'exclusão territorial'],
  },
]

/**
 * Extrai palavras-chave e equivalências de um tema pelo ID.
 * Retorna arrays vazios se o tema não for encontrado.
 */
export function getThemeAnalysisData(themeId: string): { keywords: string[]; equivalences: string[] } {
  const tema = TEMAS.find(t => t.id === themeId)
  if (!tema) return { keywords: [], equivalences: [] }
  return { keywords: tema.palavrasChave, equivalences: tema.equivalencias }
}