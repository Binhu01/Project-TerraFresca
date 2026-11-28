/**
 * Script de validação do motor de correção refatorado.
 * Testa 10 cenários específicos contra evaluateEssay().
 */
import { evaluateEssay } from '../services/textAnalysis'

const THEME_KEYWORDS = ['fome', 'insegurança alimentar', 'alimentação', 'combate']
const EQUIVALENCES = ['subnutrição', 'desnutrição', 'escassez de alimentos', 'direito à alimentação', 'segurança alimentar', 'miséria', 'pobreza extrema']

interface TestCase {
  id: number
  label: string
  text: string
  expectations: {
    c1Min?: number; c1Max?: number
    c2Min?: number; c2Max?: number
    c3Min?: number; c3Max?: number
    c4Min?: number; c4Max?: number
    c5Min?: number; c5Max?: number
    totalMin?: number; totalMax?: number
    notes?: string
  }
}

const TESTS: TestCase[] = [
  {
    id: 1,
    label: 'Excelente qualidade, argumentação consistente, proposta completa',
    text: `A persistência da fome no Brasil contemporâneo constitui um dos mais graves desafios sociais do país. Embora a Constituição Federal de 1988 garanta a alimentação como direito social fundamental, milhões de brasileiros ainda enfrentam insegurança alimentar severa, revelando uma contradição entre a garantia legal e a realidade vivida pela população mais vulnerável. Nesse contexto, é fundamental analisar as causas estruturais desse problema para propor medidas eficazes de superação.

Em primeira análise, a desigualdade socioeconômica histórica do Brasil é um fator determinante para a perpetuação da fome. Segundo o sociólogo Gilberto Freyre, a formação da sociedade brasileira foi marcada por relações desiguais que concentraram renda e terra nas mãos de poucos. Essa herança colonial se reflete nos indicadores atuais: enquanto o agronegócio brasileiro bate recordes de exportação, famílias inteiras não têm acesso a alimentos básicos. Diante desse cenário, nota-se que a produção abundante de alimentos não se traduz em segurança alimentar para todos, evidenciando que o problema não é de oferta, mas de distribuição e acesso.

Ademais, a insuficiência de políticas públicas integradas agrava a insegurança alimentar no território nacional. Conforme aponta o geógrafo Milton Santos, o espaço geográfico brasileiro é marcado por uma modernização excludente que beneficia setores privilegiados em detrimento das periferias urbanas e das zonas rurais. De fato, programas como o Bolsa Família, embora importantes, não foram acompanhados por reformas estruturais na agricultura familiar, no abastecimento urbano e na geração de emprego digno. Por conseguinte, a dependência de transferências de renda sem transformação produtiva mantém milhões de brasileiros em situação de vulnerabilidade alimentar crônica.

Portanto, diante do exposto, cabe ao Ministério da Cidadania, em parceria com o Ministério da Agricultura, implementar um Plano Nacional de Segurança Alimentar e Nutricional ampliado, por meio da integração entre programas de transferência de renda, fortalecimento da agricultura familiar e criação de bancos de alimentos comunitários nas regiões metropolitanas e rurais. Essa ação deve ser executada mediante verbas do orçamento federal e com monitoramento trimestral pelo Conselho Nacional de Segurança Alimentar (CONSEA), com a finalidade de garantir o direito constitucional à alimentação adequada e erradicar a fome no Brasil em médio prazo. Assim sendo, será possível transformar a garantia legal em realidade concreta para todos os cidadãos brasileiros.`,
    expectations: {
      c1Min: 160, c2Min: 160, c3Min: 120, c4Min: 160, c5Min: 160,
      totalMin: 800,
      notes: 'Deve pontuar alto em todas as competências. Proposta com 5 elementos completos.'
    }
  },
  {
    id: 2,
    label: 'Intermediária, argumentos pouco desenvolvidos',
    text: `A fome no Brasil é um problema muito sério que afeta muitas pessoas. Apesar de o país produzir muitos alimentos, ainda existem pessoas que passam fome todos os dias. Isso acontece por vários motivos que precisam ser discutidos.

Um dos motivos é a pobreza. Muitas pessoas não têm dinheiro para comprar comida. Outro motivo é que os alimentos são caros nos supermercados. Além disso, muitas famílias não têm emprego e ficam sem condições de se alimentar bem.

Também tem o problema do desperdício de alimentos. Muita comida é jogada fora enquanto outras pessoas passam fome. Isso é muito triste e precisa mudar.

Portanto, é necessário que o governo faça algo para resolver esse problema. O governo deve criar programas para ajudar as pessoas pobres a terem acesso a alimentos. Também é importante reduzir o desperdício de comida no país. Dessa forma, será possível diminuir a fome no Brasil.`,
    expectations: {
      // C1 alta é CORRETA: texto gramaticalmente correto, sem informalidade, sem erros de acentuação/pontuação.
      // C1 mede norma culta, não profundidade argumentativa.
      c1Min: 160,
      c2Min: 40, c2Max: 120,
      c3Min: 40, c3Max: 120,
      // C4 alta é CORRETA: usa "Apesar de", "Além disso", "Portanto", "Dessa forma" — conectivos válidos e variados.
      // C4 mede coesão textual, não qualidade argumentativa.
      c4Min: 120,
      c5Min: 40, c5Max: 120,
      totalMax: 700,
      notes: 'Texto gramaticalmente correto mas com argumentos rasos. C1/C4 altas são corretas (medem norma culta e coesão). C2/C3/C5 baixas refletem falta de repertório, profundidade e proposta específica.'
    }
  },
  {
    id: 3,
    label: 'Repertório citado mas pouco relacionado à tese',
    text: `A fome no Brasil é um desafio que persiste apesar dos avanços sociais. A Constituição Federal de 1988 garante a alimentação como direito de todos, mas a realidade mostra que isso não é cumprido plenamente.

Zygmunt Bauman fala sobre a modernidade líquida e como as relações são frágeis na sociedade atual. Karl Marx também discute as desigualdades do capitalismo. Hannah Arendt aborda a banalidade do mal em suas obras. Esses autores são importantes para entender a sociedade.

No entanto, a fome continua sendo um problema grave no Brasil. Milhões de brasileiros vivem em insegurança alimentar e não têm acesso a comida suficiente todos os dias. A pobreza e a desigualdade social são as principais causas desse cenário.

Portanto, o governo deve investir em programas sociais para combater a fome. É preciso garantir que todos tenham acesso a alimentos de qualidade. Assim, o Brasil poderá superar esse desafio.`,
    expectations: {
      c2Min: 40, c2Max: 120,
      notes: 'Repertório citado (Bauman, Marx, Arendt) mas sem articulação clara com o tema da fome. C2 deve detectar repertório presente mas não produtivo.'
    }
  },
  {
    id: 4,
    label: 'Repertório produtivamente articulado',
    text: `A persistência da fome no Brasil contemporâneo revela uma profunda contradição entre a abundância produtiva e a escassez de acesso alimentar. Nesse sentido, a análise do sociólogo Josué de Castro em "Geografia da Fome" permanece atual: o autor demonstra que a fome não resulta da falta de alimentos, mas de estruturas econômicas e políticas que excluem parcelas significativas da população do direito à alimentação. Essa perspectiva é confirmada pelos dados recentes que mostram o Brasil como um dos maiores exportadores de commodities agrícolas do mundo, enquanto milhões de cidadãos enfrentam insegurança alimentar severa.

Diante desse cenário, torna-se evidente que o combate à fome exige mais do que assistencialismo emergencial. Conforme sustenta o economista Amartya Sen, a segurança alimentar depende não apenas da disponibilidade de alimentos, mas das capacidades individuais de acessá-los por meio de renda, educação e participação social. No contexto brasileiro, essa abordagem corrobora a necessidade de políticas que integrem transferência de renda, fortalecimento da agricultura familiar e garantia de emprego digno, articulando produção e consumo de forma sustentável.

Portanto, cabe ao Ministério do Desenvolvimento Social, em articulação com o Ministério da Agricultura, ampliar o Programa de Aquisição de Alimentos (PAA) mediante parcerias com cooperativas de agricultores familiares em todo o território nacional, por meio de editais de compra direta com preços justos, com a finalidade de garantir o escoamento da produção local e o abastecimento de bancos de alimentos comunitários nas regiões de maior vulnerabilidade. Essa medida, aliada à expansão do cadastro único e ao monitoramento contínuo pelo CONSEA, visa assegurar o direito constitucional à alimentação adequada e promover a soberania alimentar no Brasil.`,
    expectations: {
      c2Min: 160,
      notes: 'Josué de Castro e Amartya Sen articulados diretamente ao argumento sobre fome. C2 deve dar pontuação alta.'
    }
  },
  {
    id: 5,
    label: 'Muitos conectivos repetidos',
    text: `A fome no Brasil é um problema grave. Portanto, é necessário discutir suas causas. Portanto, a desigualdade social é um fator importante. Portanto, muitas famílias não têm acesso a alimentos adequados.

Além disso, a falta de políticas públicas agrava a situação. Além disso, o desperdício de alimentos contribui para o problema. Além disso, a inflação dos preços dos alimentos dificulta o acesso das famílias mais pobres.

Portanto, é preciso agir. Portanto, o governo deve criar programas eficazes. Portanto, a sociedade deve se mobilizar. Portanto, todos devem contribuir para resolver esse problema.

Portanto, diante do exposto, o governo federal deve implementar políticas públicas de combate à fome por meio de investimentos em programas sociais, com a finalidade de garantir a segurança alimentar de todos os brasileiros.`,
    expectations: {
      c4Min: 40, c4Max: 120,
      notes: '"Portanto" aparece 7x, "Além disso" 3x. C4 deve penalizar repetição excessiva de conectivos.'
    }
  },
  {
    id: 6,
    label: 'Conectivos variados e boa progressão textual',
    text: `A persistência da fome no Brasil contemporâneo constitui um paradoxo inquietante em uma nação reconhecida como potência agroexportadora. Sob essa ótica, compreender as raízes estruturais desse fenômeno é imprescindível para formular soluções efetivas.

Em primeiro lugar, a concentração fundiária herdada do período colonial perpetua a exclusão de pequenos produtores do acesso à terra produtiva. Consoante dados do INCRA, menos de 1% das propriedades rurais detém quase metade das terras cultiváveis do país, o que limita a diversificação da produção alimentar destinada ao mercado interno. Nessa perspectiva, a reforma agrária emerge como condição necessária, ainda que insuficiente, para reverter o quadro de insegurança alimentar.

Por outro lado, a precarização do trabalho urbano amplia a vulnerabilidade nas metrópoles brasileiras. Visto que o desemprego e a informalidade atingem patamares elevados, milhões de trabalhadores não dispõem de renda estável para adquirir alimentos nutritivos em quantidade adequada. Em contrapartida aos discursos otimistas sobre o agronegócio, observa-se que a riqueza gerada no campo não se reverte em bem-estar para a população urbana empobrecida.

Ademais, cumpre ressaltar que o enfraquecimento de políticas de segurança alimentar nos últimos anos agravou o cenário. Uma vez que programas estratégicos sofreram cortes orçamentários significativos, a rede de proteção social perdeu capacidade de resposta diante da crise econômica prolongada.

Depreende-se, portanto, que o enfrentamento da fome demanda ação coordenada entre múltiplos atores institucionais. Compete ao Ministério do Desenvolvimento Social, em parceria com governos estaduais e municipais, reestruturar o Sistema Nacional de Segurança Alimentar e Nutricional (SISAN) mediante alocação prioritária de recursos no orçamento federal, por intermédio de audiências públicas participativas, com o objetivo de restaurar a capilaridade dos programas de alimentação escolar e dos restaurantes populares em todo o território nacional, visando a garantir o direito humano à alimentação adequada conforme preconiza a Constituição Cidadã.`,
    expectations: {
      c4Min: 160,
      notes: 'Conectivos variados: "Sob essa ótica", "Em primeiro lugar", "Consoante", "Nessa perspectiva", "Por outro lado", "Visto que", "Em contrapartida", "Ademais", "Uma vez que", "Depreende-se". C4 deve dar pontuação alta.'
    }
  },
  {
    id: 7,
    label: 'Proposta de intervenção incompleta',
    text: `A fome no Brasil é um problema complexo que envolve questões econômicas, sociais e políticas. Apesar de o país ser um grande produtor de alimentos, a distribuição desigual impede que todos tenham acesso à alimentação adequada.

As causas da fome são múltiplas e interligadas. A pobreza extrema, a falta de emprego digno e a concentração de renda são fatores que contribuem para a insegurança alimentar. Além disso, o desperdício de alimentos ao longo da cadeia produtiva representa uma perda significativa que poderia beneficiar milhões de pessoas.

Diante desse quadro, é evidente que o combate à fome requer esforços conjuntos. O governo precisa agir para resolver esse problema. A sociedade também deve participar ativamente dessa luta. Somente com a união de todos será possível construir um Brasil sem fome.`,
    expectations: {
      c5Min: 0, c5Max: 80,
      notes: 'Conclusão sem agente específico, sem meio/modo, sem finalidade explícita, sem detalhamento. C5 deve dar pontuação baixa.'
    }
  },
  {
    id: 8,
    label: 'Proposta completa distribuída entre dois parágrafos',
    text: `A fome no Brasil contemporâneo é um desafio que exige respostas urgentes e estruturadas. A Constituição Federal garante a alimentação como direito social, mas a realidade de milhões de brasileiros contradiz essa garantia constitucional.

As causas da insegurança alimentar são profundas e históricas. A desigualdade socioeconômica, a concentração de renda e a insuficiência de políticas públicas integradas perpetuam o ciclo da fome no país. Conforme analisa o sociólogo Herbert de Souza, o Betinho, a fome é antes de tudo uma questão política, pois resulta de escolhas sociais que priorizam o lucro em detrimento da vida humana.

Diante do exposto, é imperativo que o Estado brasileiro assuma protagonismo no combate à fome. Para tanto, o Ministério da Cidadania deve liderar a implementação de um programa nacional de segurança alimentar.

Esse programa deve ser executado por meio da ampliação dos bancos de alimentos e da integração entre agricultura familiar e merenda escolar em todos os municípios brasileiros, com financiamento garantido pelo Fundo Nacional de Desenvolvimento Social, com a finalidade de assegurar o acesso universal à alimentação adequada e nutricionalmente balanceada, especialmente para crianças, idosos e populações tradicionais em situação de vulnerabilidade.`,
    expectations: {
      c5Min: 120,
      notes: 'Agente (Ministério da Cidadania), ação (implementar programa), meio (ampliação de bancos de alimentos + integração), finalidade (acesso universal) estão nos últimos 2 parágrafos. Motor deve encontrar mesmo distribuído.'
    }
  },
  {
    id: 9,
    label: 'Variações vocabulares e sinônimos do tema',
    text: `A subnutrição e a desnutrição que assolam parcelas significativas da população brasileira configuram uma violação sistemática do direito à alimentação. A miséria e a pobreza extrema, longe de serem fenômenos naturais, resultam de escolhas políticas que perpetuam a exclusão social no território nacional.

Nesse contexto, a escassez de alimentos nas mesas das famílias mais vulneráveis contrasta com a abundância da produção agrícola voltada para exportação. A segurança alimentar, conceito que vai além da mera disponibilidade de comida, envolve acesso econômico, estabilidade de preços e qualidade nutricional — dimensões frequentemente negligenciadas pelas políticas públicas vigentes.

Ademais, o combate à fome exige reconhecimento de que a insegurança alimentar é multifacetada. Não basta aumentar a produção; é preciso garantir que os alimentos cheguem a quem deles necessita, por meio de mecanismos de distribuição equitativa e de fortalecimento do poder aquisitivo das camadas populares.

Portanto, cabe ao governo federal, por meio do Ministério do Desenvolvimento Social e Combate à Fome, implementar um plano integrado de erradicação da subnutrição mediante expansão dos programas de aquisição direta da agricultura familiar e criação de cozinhas comunitárias nos territórios de maior vulnerabilidade, com a finalidade de assegurar o direito humano à alimentação adequada previsto na Declaração Universal dos Direitos Humanos e na Constituição Federal de 1988.`,
    expectations: {
      c2Min: 120,
      notes: 'Usa equivalências: subnutrição, desnutrição, miséria, pobreza extrema, escassez de alimentos, direito à alimentação, segurança alimentar. C2 deve reconhecer adesão temática via matching flexível.'
    }
  },
  {
    id: 10,
    label: 'Problemas gramaticais, sintáticos e de pontuação',
    text: `a fome no brasil é um problema mto serio q afeta mtas pessoas. tipo assim, o pais produz mto alimento mas tem gente q passa fome né??

eu acho q o governo deveria fazer alguma coisa pra resolver isso. tipo, criar programas sociais e tal. tbm é importante q as pessoas ajudem umas as outras pq a solidariedade é fundamental.

na minha opinião, a fome é causada pela desigualdade social e pela falta de vontade politica. os governantes nao fazem oq deveriam e o povo sofre as consequencias.

entao, é necessario q o governo invista em politicas publicas de combate a fome. atraves de programas de distribuicao de alimentos e geracao de emprego, sera possivel melhorar a situacao. assim, o brasil podera superar esse desafio q afeta milhoes de brasileiros.`,
    expectations: {
      c1Min: 0, c1Max: 80,
      c2Min: 0, c2Max: 80,
      c3Min: 0, c3Max: 80,
      totalMax: 400,
      notes: 'Informalidade (tipo assim, né, mto, q, tbm, pq), falta de acentuação (brasil, serio, politico, necessario, atraves), minúscula após ponto, pontuação dupla (??). C1 deve dar pontuação muito baixa.'
    }
  }
]

// Run validation
console.log('═'.repeat(80))
console.log('VALIDAÇÃO DO MOTOR DE CORREÇÃO REFATORADO')
console.log('═'.repeat(80))
console.log()

let passed = 0
let failed = 0
const failures: string[] = []

for (const test of TESTS) {
  const result = evaluateEssay(test.text, THEME_KEYWORDS, EQUIVALENCES)
  const total = result.c1.score + result.c2.score + result.c3.score + result.c4.score + result.c5.score

  const checks: string[] = []
  let testPassed = true

  const checkRange = (label: string, actual: number, min?: number, max?: number) => {
    if (min !== undefined && actual < min) {
      checks.push(`  ❌ ${label}: ${actual} (esperado ≥ ${min})`)
      testPassed = false
    } else if (max !== undefined && actual > max) {
      checks.push(`  ❌ ${label}: ${actual} (esperado ≤ ${max})`)
      testPassed = false
    } else {
      checks.push(`  ✅ ${label}: ${actual}${min !== undefined ? ` (≥${min})` : ''}${max !== undefined ? ` (≤${max})` : ''}`)
    }
  }

  checkRange('C1', result.c1.score, test.expectations.c1Min, test.expectations.c1Max)
  checkRange('C2', result.c2.score, test.expectations.c2Min, test.expectations.c2Max)
  checkRange('C3', result.c3.score, test.expectations.c3Min, test.expectations.c3Max)
  checkRange('C4', result.c4.score, test.expectations.c4Min, test.expectations.c4Max)
  checkRange('C5', result.c5.score, test.expectations.c5Min, test.expectations.c5Max)
  checkRange('TOTAL', total, test.expectations.totalMin, test.expectations.totalMax)

  const status = testPassed ? '✅ PASSOU' : '❌ FALHOU'
  console.log(`Teste ${test.id}: ${test.label}`)
  console.log(`  ${status}`)
  for (const c of checks) console.log(c)
  if (test.expectations.notes) console.log(`  📝 Nota: ${test.expectations.notes}`)
  console.log()

  if (testPassed) {
    passed++
  } else {
    failed++
    failures.push(`Teste ${test.id}: ${test.label}`)
  }
}

console.log('═'.repeat(80))
console.log(`RESULTADO: ${passed}/10 passaram, ${failed}/10 falharam`)
if (failures.length > 0) {
  console.log('Falhas:')
  for (const f of failures) console.log(`  - ${f}`)
}
console.log('═'.repeat(80))

process.exit(failed > 0 ? 1 : 0)