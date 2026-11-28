/**
 * AUDITORIA FINAL DE CALIBRAÇÃO DO MOTOR DE CORREÇÃO
 * Testes contrastivos para identificar distorções nas penalidades.
 * Cada par altera APENAS UM aspecto por vez.
 */
import { evaluateEssay } from '../services/textAnalysis'

const KW = ['fome', 'insegurança alimentar', 'alimentação', 'combate']
const EQ = ['subnutrição', 'desnutrição', 'escassez de alimentos', 'direito à alimentação', 'segurança alimentar', 'miséria', 'pobreza extrema']

interface AuditPair {
  id: string
  label: string
  aspect: string
  a: { name: string; text: string }
  b: { name: string; text: string }
  expectation: string
}

const PAIRS: AuditPair[] = [
  // =========================================================================
  // 1. TYPE-TOKEN RATIO — tamanho do texto vs penalidade
  // =========================================================================
  {
    id: 'TTR-1',
    label: 'TTR: Texto curto diversificado vs longo diversificado',
    aspect: 'Type-Token Ratio',
    a: {
      name: 'Curto (~80 palavras)',
      text: `A fome no Brasil persiste como desafio estrutural. A insegurança alimentar atinge milhões apesar da produção agrícola abundante. O combate à fome exige políticas integradas de distribuição e acesso. A subnutrição reflete desigualdade histórica, não escassez. Portanto, cabe ao governo federal implementar programas de segurança alimentar mediante fortalecimento da agricultura familiar, com a finalidade de garantir o direito à alimentação adequada previsto constitucionalmente.`
    },
    b: {
      name: 'Longo (~280 palavras)',
      text: `A persistência da fome no Brasil contemporâneo constitui um dos mais graves paradoxos sociais de uma nação reconhecida mundialmente como potência agroexportadora. Embora a Constituição Federal de 1988 garanta a alimentação como direito social fundamental, milhões de brasileiros ainda enfrentam insegurança alimentar severa, revelando uma contradição profunda entre a garantia legal e a realidade vivida pela população mais vulnerável. Nesse contexto, é fundamental analisar as causas estruturais desse problema para propor medidas eficazes de superação.

Em primeira análise, a desigualdade socioeconômica histórica do Brasil é um fator determinante para a perpetuação da fome. A formação da sociedade brasileira foi marcada por relações desiguais que concentraram renda e terra nas mãos de poucos, criando um abismo entre a abundância produtiva e a escassez de acesso alimentar. Essa herança colonial se reflete nos indicadores atuais: enquanto o agronegócio brasileiro bate recordes de exportação, famílias inteiras não têm acesso a alimentos básicos. Diante desse cenário, nota-se que a produção abundante de alimentos não se traduz em segurança alimentar para todos, evidenciando que o problema não é de oferta, mas de distribuição e acesso equitativo.

Ademais, a insuficiência de políticas públicas integradas agrava a subnutrição no território nacional. Programas assistenciais, embora importantes, não foram acompanhados por reformas estruturais na agricultura familiar, no abastecimento urbano e na geração de emprego digno. A miséria e a pobreza extrema persistem porque as intervenções governamentais tratam os sintomas sem enfrentar as raízes do problema. Por conseguinte, a dependência de transferências de renda sem transformação produtiva mantém milhões de brasileiros em situação de vulnerabilidade alimentar crônica, perpetuando o ciclo da desnutrição entre gerações.

Portanto, diante do exposto, cabe ao Ministério da Cidadania, em parceria com o Ministério da Agricultura, implementar um Plano Nacional de Segurança Alimentar e Nutricional ampliado, por meio da integração entre programas de transferência de renda, fortalecimento da agricultura familiar e criação de bancos de alimentos comunitários nas regiões metropolitanas e rurais. Essa ação deve ser executada mediante verbas do orçamento federal e com monitoramento trimestral pelo Conselho Nacional de Segurança Alimentar, com a finalidade de garantir o direito constitucional à alimentação adequada e erradicar a fome no Brasil em médio prazo.`
    },
    expectation: 'Ambos devem ter C1 alta (≥160). TTR não deve penalizar textos longos com vocabulário diversificado.'
  },
  {
    id: 'TTR-2',
    label: 'TTR: Longo diversificado vs longo repetitivo',
    aspect: 'Type-Token Ratio',
    a: {
      name: 'Longo diversificado',
      text: `A persistência da fome no Brasil contemporâneo constitui um paradoxo inquietante em uma nação reconhecida como potência agroexportadora. Sob essa ótica, compreender as raízes estruturais desse fenômeno é imprescindível para formular soluções efetivas.

Em primeiro lugar, a concentração fundiária herdada do período colonial perpetua a exclusão de pequenos produtores do acesso à terra produtiva. Consoante dados do INCRA, menos de 1% das propriedades rurais detém quase metade das terras cultiváveis do país, o que limita a diversificação da produção alimentar destinada ao mercado interno. Nessa perspectiva, a reforma agrária emerge como condição necessária para reverter o quadro de insegurança alimentar.

Por outro lado, a precarização do trabalho urbano amplia a vulnerabilidade nas metrópoles brasileiras. Visto que o desemprego e a informalidade atingem patamares elevados, milhões de trabalhadores não dispõem de renda estável para adquirir alimentos nutritivos em quantidade adequada. Em contrapartida aos discursos otimistas sobre o agronegócio, observa-se que a riqueza gerada no campo não se reverte em bem-estar para a população urbana empobrecida.

Depreende-se, portanto, que o enfrentamento da fome demanda ação coordenada entre múltiplos atores institucionais. Compete ao Ministério do Desenvolvimento Social reestruturar o Sistema Nacional de Segurança Alimentar mediante alocação prioritária de recursos, por intermédio de audiências públicas participativas, com o objetivo de restaurar a capilaridade dos programas de alimentação escolar em todo o território nacional, visando a garantir o direito humano à alimentação adequada.`
    },
    b: {
      name: 'Longo repetitivo (mesmas palavras-chave repetidas)',
      text: `A fome no Brasil é um problema muito grave. A fome afeta muitas pessoas no Brasil. A fome é causada pela desigualdade social. A fome precisa ser combatida pelo governo. A fome é um problema que precisa de solução.

A fome no Brasil é causada pela pobreza. A fome é resultado da falta de dinheiro. A fome acontece porque as pessoas não têm emprego. A fome é um problema social. A fome precisa de políticas públicas.

A fome também é causada pelo desperdício. A fome poderia ser reduzida se não houvesse desperdício. A fome é triste. A fome precisa acabar. A fome é um desafio para o Brasil.

Portanto, a fome precisa ser combatida. O governo deve combater a fome. A sociedade deve combater a fome. Todos devem combater a fome. Assim, a fome no Brasil poderá ser resolvida. O governo deve criar programas para combater a fome, por meio de investimentos, com a finalidade de reduzir a fome no Brasil.`
    },
    expectation: 'Diversificado deve ter C1 ≥160. Repetitivo deve ter C1 ≤120. Penalidade de TTR é justificada quando há pobreza lexical real.'
  },

  // =========================================================================
  // 2. COMPLEXIDADE SINTÁTICA — frases simples vs complexas
  // =========================================================================
  {
    id: 'SINT-1',
    label: 'Sintaxe: Frases curtas claras vs frases longas bem construídas',
    aspect: 'Complexidade sintática',
    a: {
      name: 'Frases curtas e claras',
      text: `A fome no Brasil é um problema grave. Milhões de pessoas passam fome. O país produz muitos alimentos. A distribuição é desigual. As famílias pobres sofrem mais.

O governo precisa agir. Programas sociais são importantes. A agricultura familiar merece apoio. O desperdício deve ser reduzido. A educação alimentar é fundamental.

Portanto, o combate à fome exige ação conjunta. O governo federal deve liderar esse esforço. A sociedade civil deve participar. Juntos, podemos vencer a fome. O governo deve implementar programas de segurança alimentar por meio de parcerias com estados e municípios, com a finalidade de garantir o direito à alimentação para todos os brasileiros.`
    },
    b: {
      name: 'Frases longas e bem construídas',
      text: `Embora a Constituição Federal de 1988 garanta a alimentação como direito social fundamental, a persistência da fome no Brasil contemporâneo revela uma contradição profunda entre a abundância produtiva do agronegócio e a insegurança alimentar que ainda atinge milhões de cidadãos, especialmente nas periferias urbanas e nas zonas rurais mais isoladas do território nacional.

Considerando que a desigualdade socioeconômica histórica do país concentra renda e terra nas mãos de uma minoria privilegiada, torna-se evidente que o combate à fome exige não apenas programas assistenciais emergenciais, mas sobretudo reformas estruturais que promovam a redistribuição de oportunidades e o fortalecimento da agricultura familiar como pilar da segurança alimentar interna.

Diante do exposto, compete ao Ministério da Cidadania, em articulação com o Ministério da Agricultura e com os governos estaduais e municipais, implementar um plano integrado de segurança alimentar e nutricional que, por meio da ampliação dos bancos de alimentos comunitários e do fortalecimento das cooperativas de agricultores familiares, assegure o acesso universal à alimentação adequada e nutricionalmente balanceada, com a finalidade de erradicar a fome no Brasil conforme preconiza a Agenda 2030 da ONU.`
    },
    expectation: 'Ambas devem ter C1 razoável. Frases curtas claras NÃO devem ser penalizadas excessivamente se forem gramaticalmente corretas. Complexidade maior ≠ qualidade automática.'
  },

  // =========================================================================
  // 3. PROFUNDIDADE ARGUMENTATIVA
  // =========================================================================
  {
    id: 'PROF-1',
    label: 'Profundidade: Afirmação+justificativa vs afirmação sem fundamentação',
    aspect: 'Profundidade argumentativa',
    a: {
      name: 'Com justificativa e explicação',
      text: `A fome no Brasil persiste como desafio estrutural que exige análise cuidadosa de suas causas profundas. A insegurança alimentar atinge milhões de brasileiros apesar da produção agrícola abundante, o que demonstra que o problema não reside na oferta, mas na distribuição desigual de recursos e oportunidades.

Essa desigualdade tem raízes históricas que remontam ao período colonial, quando a concentração fundiária e a exploração do trabalho escravo criaram uma estrutura social excludente que perdura até hoje. Os dados do IBGE confirmam essa realidade: enquanto o agronegócio responde por mais de 25% do PIB nacional, cerca de 33 milhões de brasileiros vivem em situação de insegurança alimentar grave. Essa disparidade evidencia que o crescimento econômico, por si só, não garante a superação da fome.

Ademais, a insuficiência de políticas públicas integradas agrava o cenário. Programas como o Bolsa Família, embora essenciais para aliviar a pobreza imediata, não foram acompanhados por reformas estruturais na agricultura familiar e no abastecimento urbano. Sem essas transformações, a dependência de transferências de renda perpetua a vulnerabilidade alimentar, pois não resolve as causas subjacentes da miséria.

Portanto, cabe ao Ministério da Cidadania implementar um Plano Nacional de Segurança Alimentar ampliado, por meio da integração entre transferência de renda, fortalecimento da agricultura familiar e criação de bancos de alimentos comunitários, com a finalidade de garantir o direito constitucional à alimentação adequada e erradicar a fome no Brasil em médio prazo.`
    },
    b: {
      name: 'Afirmações sem fundamentação',
      text: `A fome no Brasil é um problema muito sério. Muitas pessoas passam fome todos os dias. Isso é muito triste e precisa mudar. O Brasil precisa resolver esse problema urgente.

A pobreza é a causa da fome. As pessoas não têm dinheiro para comprar comida. Os alimentos são caros. O governo precisa ajudar as pessoas pobres. É importante que todos tenham acesso a alimentos.

O desperdício também é um problema. Muita comida é jogada fora. Isso não deveria acontecer. As pessoas precisam ser mais conscientes. O governo deve criar campanhas contra o desperdício.

Portanto, o governo deve criar programas para combater a fome. É necessário investir em políticas públicas. A sociedade também deve ajudar. Assim, será possível diminuir a fome no Brasil. O governo federal deve implementar ações por meio de investimentos em programas sociais, com a finalidade de reduzir a fome.`
    },
    expectation: 'Com fundamentação deve ter C3 ≥120. Sem fundamentação deve ter C3 ≤80. Penalidade de profundidade é justificada.'
  },

  // =========================================================================
  // 4. CONECTIVOS — variados vs repetidos vs básicos
  // =========================================================================
  {
    id: 'COES-1',
    label: 'Coesão: Conectivos variados vs repetição excessiva',
    aspect: 'Conectivos',
    a: {
      name: 'Variados',
      text: `A persistência da fome no Brasil constitui um paradoxo inquietante. Sob essa ótica, compreender suas raízes é imprescindível.

Em primeiro lugar, a concentração fundiária perpetua a exclusão de pequenos produtores. Consoante dados do INCRA, menos de 1% das propriedades detém quase metade das terras cultiváveis. Nessa perspectiva, a reforma agrária emerge como condição necessária.

Por outro lado, a precarização do trabalho urbano amplia a vulnerabilidade. Visto que o desemprego atinge patamares elevados, milhões não dispõem de renda estável. Em contrapartida aos discursos otimistas, a riqueza do campo não se reverte em bem-estar urbano.

Ademais, o enfraquecimento de políticas de segurança alimentar agravou o cenário. Uma vez que programas estratégicos sofreram cortes, a rede de proteção perdeu capacidade de resposta.

Depreende-se, portanto, que o enfrentamento da fome demanda ação coordenada. Compete ao Ministério da Cidadania reestruturar o SISAN mediante alocação prioritária de recursos, por intermédio de audiências públicas, com o objetivo de restaurar os programas de alimentação escolar, visando a garantir o direito humano à alimentação.`
    },
    b: {
      name: 'Repetição excessiva de "portanto"',
      text: `A fome no Brasil é um problema grave. Portanto, é necessário discutir suas causas. Portanto, a desigualdade social é um fator importante. Portanto, muitas famílias não têm acesso a alimentos adequados.

Além disso, a falta de políticas públicas agrava a situação. Além disso, o desperdício contribui para o problema. Além disso, a inflação dificulta o acesso das famílias mais pobres.

Portanto, é preciso agir. Portanto, o governo deve criar programas eficazes. Portanto, a sociedade deve se mobilizar. Portanto, todos devem contribuir para resolver esse problema.

Portanto, diante do exposto, o governo federal deve implementar políticas públicas de combate à fome por meio de investimentos em programas sociais, com a finalidade de garantir a segurança alimentar de todos os brasileiros.`
    },
    expectation: 'Variados deve ter C4 ≥160. Repetidos deve ter C4 ≤120. Penalidade de repetição é justificada.'
  },
  {
    id: 'COES-2',
    label: 'Coesão: Conectivos simples corretos vs sofisticados inadequados',
    aspect: 'Conectivos',
    a: {
      name: 'Simples mas corretos',
      text: `A fome no Brasil é um problema grave, mas pode ser superado com políticas adequadas. O país produz muitos alimentos, porém a distribuição é desigual. Além disso, a pobreza impede que muitas famílias tenham acesso a comida de qualidade.

O governo precisa criar programas sociais e também apoiar a agricultura familiar. Assim, será possível reduzir a insegurança alimentar no país. Mas é importante que a sociedade também participe desse esforço.

Portanto, o combate à fome exige ação conjunta entre governo e sociedade. O governo federal deve implementar programas de segurança alimentar por meio de parcerias com estados e municípios, com a finalidade de garantir o direito à alimentação para todos os brasileiros.`
    },
    b: {
      name: 'Sofisticados mas inadequados/forçados',
      text: `Conquanto a fome no Brasil seja um problema grave, outrossim pode ser superada com políticas adequadas. Não obstante o país produza muitos alimentos, todavia a distribuição é desigual. Demais disso, a pobreza impede que muitas famílias tenham acesso a comida de qualidade.

Outrossim, o governo necessita criar programas sociais e, ademais, apoiar a agricultura familiar. Por conseguinte, será possível reduzir a insegurança alimentar no país. Não obstante, é importante que a sociedade também participe desse esforço.

Destarte, o combate à fome exige ação conjunta entre governo e sociedade. O governo federal deve implementar programas de segurança alimentar por meio de parcerias com estados e municípios, com a finalidade de garantir o direito à alimentação para todos os brasileiros.`
    },
    expectation: 'Ambos devem ter C4 similar (≥120). Conectivos simples corretos NÃO devem ser penalizados. Sofisticados forçados não devem ser bonificados automaticamente.'
  },

  // =========================================================================
  // 5. REPERTÓRIO — articulação explícita vs contextual vs menção solta
  // =========================================================================
  {
    id: 'REP-1',
    label: 'Repertório: Articulação explícita vs contextual sem verbo de atribuição',
    aspect: 'Repertório',
    a: {
      name: 'Articulação explícita com verbo de atribuição',
      text: `A persistência da fome no Brasil revela uma contradição entre abundância produtiva e escassez de acesso. Conforme analisa o sociólogo Josué de Castro em "Geografia da Fome", a fome não resulta da falta de alimentos, mas de estruturas econômicas que excluem parcelas da população do direito à alimentação. Essa perspectiva é confirmada pelos dados recentes que mostram o Brasil como grande exportador de commodities agrícolas, enquanto milhões enfrentam insegurança alimentar severa.

Diante desse cenário, torna-se evidente que o combate à fome exige mais do que assistencialismo. Segundo o economista Amartya Sen, a segurança alimentar depende não apenas da disponibilidade, mas das capacidades individuais de acessá-los por meio de renda e educação. No contexto brasileiro, essa abordagem corrobora a necessidade de políticas que integrem transferência de renda e fortalecimento da agricultura familiar.

Portanto, cabe ao Ministério do Desenvolvimento Social ampliar o Programa de Aquisição de Alimentos mediante parcerias com cooperativas de agricultores familiares, por meio de editais de compra direta, com a finalidade de garantir o escoamento da produção local e o abastecimento de bancos de alimentos comunitários, visando a assegurar o direito constitucional à alimentação adequada.`
    },
    b: {
      name: 'Articulação contextual sem verbo de atribuição explícito',
      text: `A persistência da fome no Brasil revela uma contradição entre abundância produtiva e escassez de acesso. O sociólogo Josué de Castro, em sua obra "Geografia da Fome", já demonstrava que a fome brasileira não é resultado da falta de alimentos, mas sim de estruturas econômicas excludentes que negam a milhões de cidadãos o direito básico à alimentação. Os dados atuais comprovam essa tese: o Brasil é um dos maiores exportadores de commodities agrícolas do mundo, enquanto 33 milhões de brasileiros enfrentam insegurança alimentar severa.

Nesse mesmo sentido, a contribuição do economista Amartya Sen sobre as capacidades humanas mostra que a segurança alimentar vai além da mera disponibilidade de comida, dependendo fundamentalmente da renda, da educação e da participação social dos indivíduos. Aplicando essa lógica ao Brasil, fica claro que políticas puramente assistenciais são insuficientes sem reformas que ampliem as capacidades reais das populações vulneráveis.

Portanto, cabe ao Ministério do Desenvolvimento Social ampliar o Programa de Aquisição de Alimentos mediante parcerias com cooperativas de agricultores familiares, por meio de editais de compra direta, com a finalidade de garantir o escoamento da produção local e o abastecimento de bancos de alimentos comunitários, visando a assegurar o direito constitucional à alimentação adequada.`
    },
    expectation: 'Ambos devem ter C2 ≥120. Articulação contextual sem verbo explícito AINDA é articulação válida. Motor não deve exigir verbo de atribuição como requisito absoluto.'
  },
  {
    id: 'REP-2',
    label: 'Repertório: Menção solta vs repertório desconectado',
    aspect: 'Repertório',
    a: {
      name: 'Menção solta (autor citado sem conexão)',
      text: `A fome no Brasil é um problema grave que afeta milhões de pessoas. Zygmunt Bauman fala sobre a modernidade líquida. Karl Marx discute as desigualdades do capitalismo. Hannah Arendt aborda a banalidade do mal.

No entanto, a fome continua sendo um problema grave no Brasil. Milhões de brasileiros vivem em insegurança alimentar. A pobreza e a desigualdade social são as principais causas desse cenário.

Portanto, o governo deve investir em programas sociais para combater a fome. É preciso garantir que todos tenham acesso a alimentos de qualidade. O governo federal deve implementar ações por meio de programas de distribuição de alimentos, com a finalidade de reduzir a fome no Brasil.`
    },
    b: {
      name: 'Repertório conectado ao tema',
      text: `A fome no Brasil é um problema grave que afeta milhões de pessoas. Conforme demonstra o sociólogo Herbert de Souza, o Betinho, em sua campanha contra a fome nos anos 1990, a miséria brasileira não é natural, mas resultado de escolhas políticas que priorizam o lucro em detrimento da vida humana. Essa análise permanece atual: o Brasil produz alimentos suficientes para toda a população, mas a distribuição desigual mantém milhões em insegurança alimentar.

Além disso, a contribuição do geógrafo Josué de Castro em "Geografia da Fome" evidencia que a subnutrição no Brasil está diretamente ligada à concentração fundiária e à exclusão dos pequenos produtores do acesso à terra produtiva. Esses autores mostram que superar a fome exige transformações estruturais, não apenas assistência emergencial.

Portanto, cabe ao Ministério da Cidadania implementar um plano integrado de segurança alimentar mediante fortalecimento da agricultura familiar e criação de bancos de alimentos comunitários, por meio de parcerias com cooperativas locais, com a finalidade de garantir o direito constitucional à alimentação adequada e erradicar a fome no Brasil.`
    },
    expectation: 'Menção solta deve ter C2 ≤80. Conectado deve ter C2 ≥120. Diferença é justificada pela articulação.'
  },

  // =========================================================================
  // 6. C5 — Formas de apresentar agente e ação
  // =========================================================================
  {
    id: 'C5-1',
    label: 'C5: Agente explícito vs agente por construção alternativa',
    aspect: 'Competência 5',
    a: {
      name: 'Agente explícito ("Ministério da Cidadania")',
      text: `A fome no Brasil é um desafio estrutural que exige respostas coordenadas. A desigualdade socioeconômica e a insuficiência de políticas integradas perpetuam a insegurança alimentar no país.

As causas da fome são múltiplas e interligadas. A concentração de renda, a precarização do trabalho e o enfraquecimento de programas de segurança alimentar agravam o cenário de vulnerabilidade.

Portanto, diante do exposto, cabe ao Ministério da Cidadania, em articulação com o Ministério da Agricultura, implementar um Plano Nacional de Segurança Alimentar ampliado, por meio da integração entre programas de transferência de renda e fortalecimento da agricultura familiar, com a finalidade de garantir o direito constitucional à alimentação adequada e erradicar a fome no Brasil em médio prazo, especialmente para populações tradicionais e comunidades rurais em situação de vulnerabilidade.`
    },
    b: {
      name: 'Agente por construção alternativa ("É dever do Estado")',
      text: `A fome no Brasil é um desafio estrutural que exige respostas coordenadas. A desigualdade socioeconômica e a insuficiência de políticas integradas perpetuam a insegurança alimentar no país.

As causas da fome são múltiplas e interligadas. A concentração de renda, a precarização do trabalho e o enfraquecimento de programas de segurança alimentar agravam o cenário de vulnerabilidade.

Portanto, diante do exposto, é dever do Estado brasileiro, por intermédio de seus órgãos competentes na área de desenvolvimento social e agricultura, implementar um Plano Nacional de Segurança Alimentar ampliado, por meio da integração entre programas de transferência de renda e fortalecimento da agricultura familiar, com a finalidade de garantir o direito constitucional à alimentação adequada e erradicar a fome no Brasil em médio prazo, especialmente para populações tradicionais e comunidades rurais em situação de vulnerabilidade.`
    },
    expectation: 'Ambos devem ter C5 ≥160. "Estado brasileiro" e "órgãos competentes" são agentes válidos. Construção alternativa não deve ser penalizada.'
  },
  {
    id: 'C5-2',
    label: 'C5: Ação específica vs ação genérica',
    aspect: 'Competência 5',
    a: {
      name: 'Ação específica e concreta',
      text: `A fome no Brasil é um desafio estrutural que exige respostas coordenadas. A desigualdade socioeconômica e a insuficiência de políticas integradas perpetuam a insegurança alimentar no país.

As causas da fome são múltiplas e interligadas. A concentração de renda, a precarização do trabalho e o enfraquecimento de programas de segurança alimentar agravam o cenário de vulnerabilidade.

Portanto, diante do exposto, cabe ao Ministério da Cidadania implementar o Programa de Aquisição de Alimentos ampliado, por meio de editais de compra direta da agricultura familiar com preços justos e criação de bancos de alimentos comunitários nos territórios de maior vulnerabilidade, com a finalidade de garantir o escoamento da produção local e o abastecimento regular de refeições nutritivas para famílias em situação de insegurança alimentar, detalhando-se que a execução ocorrerá em parceria com cooperativas certificadas pelo MAPA e com monitoramento trimestral pelo CONSEA.`
    },
    b: {
      name: 'Ação genérica',
      text: `A fome no Brasil é um desafio estrutural que exige respostas coordenadas. A desigualdade socioeconômica e a insuficiência de políticas integradas perpetuam a insegurança alimentar no país.

As causas da fome são múltiplas e interligadas. A concentração de renda, a precarização do trabalho e o enfraquecimento de programas de segurança alimentar agravam o cenário de vulnerabilidade.

Portanto, diante do exposto, o governo deve fazer algo para resolver a fome. É necessário criar programas sociais e investir em políticas públicas. A sociedade também deve participar. Assim, será possível construir um Brasil sem fome. O governo federal deve implementar ações por meio de investimentos, com a finalidade de melhorar a situação.`
    },
    expectation: 'Específica deve ter C5 ≥160. Genérica deve ter C5 ≤80. Diferença é justificada pela concretude da proposta.'
  },
]

// =============================================================================
// EXECUÇÃO DA AUDITORIA
// =============================================================================

console.log('═'.repeat(90))
console.log('AUDITORIA FINAL DE CALIBRAÇÃO DO MOTOR DE CORREÇÃO')
console.log('═'.repeat(90))
console.log()

let warnings = 0
let ok = 0
const issues: Array<{ pair: string; issue: string }> = []

for (const pair of PAIRS) {
  console.log(`── ${pair.id}: ${pair.label}`)
  console.log(`   Aspecto: ${pair.aspect}`)
  console.log(`   Expectativa: ${pair.expectation}`)
  console.log()

  const resultA = evaluateEssay(pair.a.text, KW, EQ)
  const resultB = evaluateEssay(pair.b.text, KW, EQ)
  const totalA = resultA.c1.score + resultA.c2.score + resultA.c3.score + resultA.c4.score + resultA.c5.score
  const totalB = resultB.c1.score + resultB.c2.score + resultB.c3.score + resultB.c4.score + resultB.c5.score

  console.log(`   [A] ${pair.a.name}:`)
  console.log(`       C1=${resultA.c1.score} C2=${resultA.c2.score} C3=${resultA.c3.score} C4=${resultA.c4.score} C5=${resultA.c5.score} | TOTAL=${totalA}`)
  if (resultA.c1.tips.length) console.log(`       C1 tips: ${resultA.c1.tips.join(' | ')}`)
  if (resultA.c2.tips.length) console.log(`       C2 tips: ${resultA.c2.tips.join(' | ')}`)
  if (resultA.c3.tips.length) console.log(`       C3 tips: ${resultA.c3.tips.join(' | ')}`)
  if (resultA.c4.tips.length) console.log(`       C4 tips: ${resultA.c4.tips.join(' | ')}`)
  if (resultA.c5.tips.length) console.log(`       C5 tips: ${resultA.c5.tips.join(' | ')}`)

  console.log(`   [B] ${pair.b.name}:`)
  console.log(`       C1=${resultB.c1.score} C2=${resultB.c2.score} C3=${resultB.c3.score} C4=${resultB.c4.score} C5=${resultB.c5.score} | TOTAL=${totalB}`)
  if (resultB.c1.tips.length) console.log(`       C1 tips: ${resultB.c1.tips.join(' | ')}`)
  if (resultB.c2.tips.length) console.log(`       C2 tips: ${resultB.c2.tips.join(' | ')}`)
  if (resultB.c3.tips.length) console.log(`       C3 tips: ${resultB.c3.tips.join(' | ')}`)
  if (resultB.c4.tips.length) console.log(`       C4 tips: ${resultB.c4.tips.join(' | ')}`)
  if (resultB.c5.tips.length) console.log(`       C5 tips: ${resultB.c5.tips.join(' | ')}`)

  // Análise automática de distorções
  const diffs: string[] = []
  const c4Diff = Math.abs(resultA.c4.score - resultB.c4.score)

  // Verifica se a diferença esperada aparece na competência correta
  switch (pair.id) {
    case 'TTR-1':
      // Ambos devem ter C1 alta
      if (resultA.c1.score < 160) { diffs.push(`⚠️ A: C1=${resultA.c1.score} deveria ser ≥160`)}
      if (resultB.c1.score < 160) { diffs.push(`⚠️ B: C1=${resultB.c1.score} deveria ser ≥160`)}
      break
    case 'TTR-2':
      // Diversificado ≥160, repetitivo ≤120
      if (resultA.c1.score < 160) { diffs.push(`⚠️ A(diversificado): C1=${resultA.c1.score} deveria ser ≥160`)}
      if (resultB.c1.score > 120) { diffs.push(`⚠️ B(repetitivo): C1=${resultB.c1.score} deveria ser ≤120`)}
      break
    case 'SINT-1':
      // Ambas devem ter C1 razoável (≥120)
      if (resultA.c1.score < 120) { diffs.push(`⚠️ A(curtas claras): C1=${resultA.c1.score} deveria ser ≥120`)}
      if (resultB.c1.score < 120) { diffs.push(`⚠️ B(longas): C1=${resultB.c1.score} deveria ser ≥120`)}
      break
    case 'PROF-1':
      // Com fundamentação C3 ≥120, sem ≤80
      if (resultA.c3.score < 120) { diffs.push(`⚠️ A(fundamentado): C3=${resultA.c3.score} deveria ser ≥120`)}
      if (resultB.c3.score > 80) { diffs.push(`⚠️ B(sem fund.): C3=${resultB.c3.score} deveria ser ≤80`)}
      break
    case 'COES-1':
      // Variados ≥160, repetidos ≤120
      if (resultA.c4.score < 160) { diffs.push(`⚠️ A(variados): C4=${resultA.c4.score} deveria ser ≥160`)}
      if (resultB.c4.score > 120) { diffs.push(`⚠️ B(repetidos): C4=${resultB.c4.score} deveria ser ≤120`)}
      break
    case 'COES-2':
      // Ambos devem ter C4 similar (≥120)
      if (resultA.c4.score < 120) { diffs.push(`⚠️ A(simples corretos): C4=${resultA.c4.score} deveria ser ≥120`)}
      if (resultB.c4.score < 120) { diffs.push(`⚠️ B(sofisticados): C4=${resultB.c4.score} deveria ser ≥120`)}
      if (c4Diff > 40) { diffs.push(`⚠️ Diferença C4 muito grande (${c4Diff}): simples vs sofisticados deveriam ser similares`)}
      break
    case 'REP-1':
      // Ambos devem ter C2 ≥120 (articulação contextual é válida)
      if (resultA.c2.score < 120) { diffs.push(`⚠️ A(explícita): C2=${resultA.c2.score} deveria ser ≥120`)}
      if (resultB.c2.score < 120) { diffs.push(`⚠️ B(contextual): C2=${resultB.c2.score} deveria ser ≥120 — articulação sem verbo explícito AINDA é válida`)}
      break
    case 'REP-2':
      // Solta ≤80, conectada ≥120
      if (resultA.c2.score > 80) { diffs.push(`⚠️ A(solta): C2=${resultA.c2.score} deveria ser ≤80`)}
      if (resultB.c2.score < 120) { diffs.push(`⚠️ B(conectada): C2=${resultB.c2.score} deveria ser ≥120`)}
      break
    case 'C5-1':
      // Ambos devem ter C5 ≥160
      if (resultA.c5.score < 160) { diffs.push(`⚠️ A(explícito): C5=${resultA.c5.score} deveria ser ≥160`)}
      if (resultB.c5.score < 160) { diffs.push(`⚠️ B(alternativo): C5=${resultB.c5.score} deveria ser ≥160 — "Estado brasileiro" é agente válido`)}
      break
    case 'C5-2':
      // Específica ≥160, genérica ≤80
      if (resultA.c5.score < 160) { diffs.push(`⚠️ A(específica): C5=${resultA.c5.score} deveria ser ≥160`)}
      if (resultB.c5.score > 80) { diffs.push(`⚠️ B(genérica): C5=${resultB.c5.score} deveria ser ≤80`)}
      break
  }

  if (diffs.length > 0) {
    for (const d of diffs) console.log(`   ${d}`)
    issues.push({ pair: `${pair.id}: ${pair.label}`, issue: diffs.join('; ') })
    warnings++
  } else {
    console.log(`   ✅ Sem distorções detectadas`)
    ok++
  }

  console.log()
}

console.log('═'.repeat(90))
console.log(`RESULTADO DA AUDITORIA: ${ok}/${PAIRS.length} pares OK, ${warnings}/${PAIRS.length} com distorções`)
if (issues.length > 0) {
  console.log()
  console.log('DISTORÇÕES ENCONTRADAS:')
  for (const i of issues) {
    console.log(`  • ${i.pair}`)
    console.log(`    → ${i.issue}`)
  }
}
console.log('═'.repeat(90))

process.exit(warnings > 0 ? 1 : 0)