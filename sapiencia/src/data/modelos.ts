export interface ModeloRedacao {
  titulo: string
  tema: string
  introducao: { texto: string; explicacao: string }
  desenvolvimento1: { texto: string; explicacao: string }
  desenvolvimento2: { texto: string; explicacao: string }
  conclusao: { texto: string; explicacao: string }
}

export const MODELO_COMPLETO: ModeloRedacao = {
  titulo: 'Modelo Didático: Os desafios do combate à fome no Brasil',
  tema: 'Os desafios no combate à fome no Brasil contemporâneo',
  introducao: {
    texto:
      'A Constituição Federal de 1988 assegura a alimentação como direito social fundamental de todo cidadão brasileiro. No entanto, mais de três décadas após a promulgação da Carta Magna, milhões de pessoas ainda enfrentam insegurança alimentar severa em território nacional. Nesse contexto, é preciso analisar como a desigualdade socioeconômica e a insuficiência de políticas públicas estruturais perpetuam esse cenário, que contradiz os princípios constitucionais vigentes.',
    explicacao:
      'A introdução apresenta o tema, contextualiza com repertório sociocultural legítimo (Constituição Federal), estabelece a tese (desigualdade + insuficiência de políticas) e anuncia os dois argumentos que serão desenvolvidos nos parágrafos seguintes.',
  },
  desenvolvimento1: {
    texto:
      'Em primeira análise, a concentração de renda no Brasil constitui um obstáculo central ao acesso universal à alimentação adequada. Segundo o sociólogo Jessé Souza, a sociedade brasileira reproduz uma hierarquia que naturaliza a pobreza e trata os mais vulneráveis como cidadãos de segunda classe. Essa estrutura excludente se reflete diretamente na segurança alimentar: enquanto parcelas privilegiadas desperdiçam alimentos, famílias inteiras dependem de doações esporádicas para sobreviver. Portanto, a fome não resulta apenas da escassez de produção, mas da distribuição profundamente desigual dos recursos disponíveis.',
    explicacao:
      'O primeiro desenvolvimento aborda o argumento da desigualdade socioeconômica. Utiliza repertório sociocultural pertinente (Jessé Souza), conecta-o explicitamente ao tema e constrói raciocínio causal que sustenta a tese. O parágrafo termina com uma frase-síntese que reforça o argumento.',
  },
  desenvolvimento2: {
    texto:
      'Além disso, a descontinuidade de políticas públicas agrava a vulnerabilidade alimentar das populações marginalizadas. Programas como o Bolsa Família e o Programa de Aquisição de Alimentos (PAA) demonstraram eficácia comprovada na redução da fome, conforme relatórios da FAO. Contudo, cortes orçamentários recorrentes e a falta de articulação entre esferas governamentais enfraquecem essas iniciativas, deixando milhões de brasileiros sem rede de proteção. Assim, a ausência de políticas de Estado permanentes transforma programas sociais bem-sucedidos em medidas provisórias e insuficientes.',
    explicacao:
      'O segundo desenvolvimento aborda o argumento da insuficiência de políticas públicas. Traz repertório factual (FAO, programas específicos), demonstra conhecimento sobre o tema e mantém coesão com o parágrafo anterior por meio do conectivo "Além disso". A conclusão parcial reforça a relação causa-consequência.',
  },
  conclusao: {
    texto:
      'Depreende-se, portanto, que o combate efetivo à fome no Brasil exige ações coordenadas e estruturais. Para isso, cabe ao Ministério do Desenvolvimento Social, em parceria com governos estaduais e municipais, ampliar e tornar permanentes os programas de transferência de renda e aquisição de alimentos da agricultura familiar, por meio de legislação específica e dotação orçamentária garantida no Plano Plurianual. Tal medida tem a finalidade de assegurar o direito constitucional à alimentação e reduzir as desigualdades regionais, detalhando-se a execução por meio de conselhos municipais de segurança alimentar que acompanhem localmente os beneficiários. Somente assim será possível transformar a garantia constitucional em realidade concreta para todos os brasileiros.',
    explicacao:
      'A conclusão retoma a tese, apresenta proposta de intervenção completa com cinco elementos obrigatórios — agente (Ministério do Desenvolvimento Social), ação (ampliar e tornar permanentes os programas), meio/modo (legislação específica e dotação orçamentária no PPA), finalidade (assegurar o direito à alimentação e reduzir desigualdades) e detalhamento (conselhos municipais de segurança alimentar). O fechamento conecta-se à introdução, criando circularidade argumentativa.',
  },
}

export interface EsqueletoSecao {
  titulo: string
  conteudo: string[]
}

export const ESQUELETOS: {
  introducao: EsqueletoSecao
  desenvolvimento: EsqueletoSecao
  conclusao: EsqueletoSecao
} = {
  introducao: {
    titulo: 'Introdução',
    conteudo: [
      '1. CONTEXTUALIZAÇÃO: Comece com um repertório sociocultural relevante (lei, dado histórico, obra literária, conceito filosófico) que dialogue com o tema proposto.',
      '2. PROBLEMATIZAÇÃO: Apresente a contradição ou o problema que será discutido. Mostre que a realidade não corresponde ao ideal apresentado na contextualização.',
      '3. TESE: Declare claramente sua posição. Indique quais aspectos você vai abordar nos parágrafos de desenvolvimento (geralmente dois).',
      'DICA: Evite começar com definições genéricas ("Desde sempre...", "É sabido que..."). Prefira repertórios específicos e conectados ao tema.',
    ],
  },
  desenvolvimento: {
    titulo: 'Desenvolvimento',
    conteudo: [
      '1. TÓPICO FRASAL: Inicie cada parágrafo com uma frase curta que sintetize o argumento principal daquele bloco.',
      '2. REPERTÓRIO SOCIOLÓGICO: Traga um autor, conceito, fato histórico, lei ou obra cultural que fundamente seu argumento. Não cite pelo nome sem explicar a conexão com o tema.',
      '3. ARGUMENTAÇÃO: Desenvolva o raciocínio que liga o repertório ao seu tópico frasal. Explique o "porquê" e o "como".',
      '4. FECHAMENTO: Termine com uma frase-síntese que reforce o argumento e prepare a transição para o próximo parágrafo.',
      'DICA: Use conectivos entre os parágrafos ("Além disso", "Ademais", "Outrossim") para garantir coesão textual.',
    ],
  },
  conclusao: {
    titulo: 'Conclusão / Proposta de Intervenção',
    conteudo: [
      '1. RETOMADA DA TESE: Reafirme brevemente o problema discutido, usando outras palavras.',
      '2. AGENTE: Quem deve agir? (Ministério, governo estadual, escola, ONG, mídia, família...). Seja específico.',
      '3. AÇÃO: O que deve ser feito? Use verbos no infinitivo (ampliar, criar, implementar, fiscalizar...).',
      '4. MEIO/MODO: Como a ação será executada? (por meio de leis, campanhas, investimentos, parcerias...).',
      '5. FINALIDADE: Para quê? Qual resultado se espera alcançar?',
      '6. DETALHAMENTO: Acrescente uma informação extra sobre um dos elementos acima (onde, quando, quanto custa, quem acompanha...).',
      'DICA: A proposta deve ser viável, concreta e respeitar os direitos humanos. Evite soluções vagas como "conscientizar a população" sem especificar como.',
    ],
  },
}