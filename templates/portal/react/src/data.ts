/* Dados fictícios do Portal de serviços. Órgão, serviços, protocolos e valores não são reais. */

export const org = {
  name: 'Prefeitura de Vale das Araras',
  short: 'Vale das Araras',
  address: 'Praça da Fonte, 100, Centro, Vale das Araras',
  hours: 'Segunda a sexta, das 8h às 17h',
  phone: '(00) 0000-0000',
  email: 'atendimento@valedasararas.example',
} as const;

export interface Category {
  slug: string;
  name: string;
  text: string;
}

export interface Service {
  slug: string;
  cat: string;
  name: string;
  summary: string;
  what: string;
  who: string;
  docs: string[];
  steps: string[];
  prazo: string;
  custo: string;
  canal: string;
  orgao: string;
  faq: [question: string, answer: string][];
}

export interface NewsItem {
  slug: string;
  img: string;
  alt: string;
  tag: string;
  date: string;
  dateText: string;
  title: string;
  text: string;
}

export type EventTone = 'accent' | 'info' | 'success' | 'warning' | 'danger';
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface ProtocolEvent {
  id: string;
  title: string;
  dateTime: string;
  time: string;
  text?: string;
  tone?: EventTone;
}

export interface Protocol {
  number: string;
  service: string;
  opened: string;
  status: [BadgeTone, string];
  forecast: string | null;
  events: ProtocolEvent[];
}

export const categories: Category[] = [
  {
    slug: 'tributos',
    name: 'Tributos e taxas',
    text: 'IPTU, certidões e parcelamentos.',
  },
  {
    slug: 'obras',
    name: 'Obras e meio ambiente',
    text: 'Alvarás, vistorias e arborização.',
  },
  {
    slug: 'cidadania',
    name: 'Cidadania e saúde',
    text: 'Cartão de saúde e programas sociais.',
  },
  {
    slug: 'educacao',
    name: 'Educação e cultura',
    text: 'Matrículas e espaços culturais.',
  },
];

export const services: Service[] = [
  {
    slug: 'iptu',
    cat: 'tributos',
    name: '2ª via do IPTU',
    summary: 'Emita a segunda via do carnê do imposto predial e territorial urbano.',
    what: 'Emissão da segunda via do carnê do IPTU do exercício atual ou de anos anteriores, com código de barras para pagamento na rede bancária.',
    who: 'Proprietário, possuidor ou procurador do imóvel, com inscrição imobiliária ativa no município.',
    docs: [
      'Documento de identificação com foto',
      'Inscrição imobiliária ou endereço do imóvel',
      'Procuração, quando a solicitação for feita por terceiros',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Acompanhe pelo número de protocolo',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Imediato',
    custo: 'Gratuito',
    canal: 'Online',
    orgao: 'Secretaria de Finanças',
    faq: [
      [
        'Onde encontro a inscrição imobiliária?',
        'O número está no canto superior do carnê do ano anterior e na escritura do imóvel.',
      ],
      [
        'Posso emitir o carnê de anos anteriores?',
        'Sim. Informe o exercício desejado na solicitação; débitos antigos podem exigir parcelamento.',
      ],
    ],
  },
  {
    slug: 'certidao-negativa',
    cat: 'tributos',
    name: 'Certidão negativa de débitos',
    summary: 'Comprove que você não tem débitos municipais em aberto.',
    what: 'Documento que atesta a inexistência de débitos tributários municipais em nome do contribuinte ou do imóvel, usado em financiamentos e compra e venda.',
    who: 'Contribuinte, proprietário do imóvel ou procurador com poderes específicos.',
    docs: [
      'Documento de identificação com foto',
      'CPF ou CNPJ do contribuinte',
      'Inscrição imobiliária, quando a certidão for do imóvel',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Acompanhe pelo número de protocolo',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Até 2 dias úteis',
    custo: 'Gratuito',
    canal: 'Online',
    orgao: 'Secretaria de Finanças',
    faq: [
      ['Qual é a validade da certidão?', 'Noventa dias a partir da emissão.'],
      [
        'E se houver débitos em aberto?',
        'Será emitida a certidão positiva, e você poderá parcelar a dívida pelo portal.',
      ],
    ],
  },
  {
    slug: 'parcelamento',
    cat: 'tributos',
    name: 'Parcelamento de dívidas',
    summary: 'Negocie débitos municipais em parcelas mensais.',
    what: 'Negociação de dívidas de IPTU, taxas e multas municipais em até 24 parcelas mensais, conforme a lei municipal vigente.',
    who: 'Contribuinte com débitos vencidos, inscritos ou não em dívida ativa.',
    docs: [
      'Documento de identificação com foto',
      'CPF ou CNPJ do devedor',
      'Comprovante de endereço atualizado',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Acompanhe pelo número de protocolo',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Até 5 dias úteis',
    custo: 'Sem taxa de adesão',
    canal: 'Online',
    orgao: 'Secretaria de Finanças',
    faq: [
      ['Qual é o valor mínimo da parcela?', 'A parcela mínima é de R$ 50,00 (valor fictício).'],
      [
        'O que acontece se eu atrasar uma parcela?',
        'Três parcelas em atraso cancelam o acordo e o saldo volta a ser cobrado integralmente.',
      ],
    ],
  },
  {
    slug: 'alvara',
    cat: 'obras',
    name: 'Alvará de funcionamento',
    summary: 'Abra ou regularize um negócio no município.',
    what: 'Autorização para que um estabelecimento comercial, industrial ou de serviços funcione no município, após a análise de zoneamento e das condições do local.',
    who: 'Empresário individual ou representante legal da empresa, com CNPJ ativo.',
    docs: [
      'Documento de identificação do responsável',
      'Comprovante de inscrição no CNPJ',
      'Contrato de locação ou escritura do imóvel',
      'Laudo do corpo de bombeiros, quando exigido',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Aguarde o agendamento da vistoria',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Até 15 dias úteis',
    custo: 'Taxa de R$ 180,00 (valor fictício)',
    canal: 'Online, com vistoria presencial',
    orgao: 'Secretaria de Desenvolvimento Econômico',
    faq: [
      [
        'Preciso de alvará para trabalhar em casa?',
        'Atividades de baixo risco podem ter licença simplificada. Informe a atividade na solicitação.',
      ],
      [
        'Quando renovar o alvará?',
        'A renovação é anual e pode ser pedida a partir de 60 dias antes do vencimento.',
      ],
    ],
  },
  {
    slug: 'poda-arvore',
    cat: 'obras',
    name: 'Poda ou remoção de árvore',
    summary: 'Peça a avaliação de uma árvore em via ou área pública.',
    what: 'Vistoria técnica de árvores em calçadas, praças e vias públicas para definir poda, manejo ou remoção quando houver risco.',
    who: 'Qualquer cidadão que identifique árvore em área pública que ofereça risco ou cause danos.',
    docs: [
      'Endereço e ponto de referência da árvore',
      'Fotos da árvore e do local (opcional)',
      'Documento de identificação com foto',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Aguarde o agendamento da vistoria',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Vistoria em até 10 dias úteis',
    custo: 'Gratuito',
    canal: 'Online, com vistoria no local',
    orgao: 'Secretaria de Meio Ambiente',
    faq: [
      [
        'Posso podar a árvore da calçada por conta própria?',
        'Não. A poda em área pública só pode ser feita pela prefeitura ou com autorização.',
      ],
      [
        'E se houver risco imediato de queda?',
        'Ligue para a Defesa Civil, no telefone de atendimento desta página.',
      ],
    ],
  },
  {
    slug: 'habite-se',
    cat: 'obras',
    name: 'Certidão de habite-se',
    summary: 'Regularize a conclusão de uma obra residencial ou comercial.',
    what: 'Certidão que atesta que a obra foi concluída de acordo com o projeto aprovado e pode ser ocupada.',
    who: 'Proprietário ou responsável técnico da obra, com alvará de construção válido.',
    docs: [
      'Alvará de construção',
      'Anotação de responsabilidade técnica da obra',
      'Planta aprovada e fotos da edificação concluída',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Aguarde o agendamento da vistoria',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Até 20 dias úteis',
    custo: 'Taxa de R$ 95,00 (valor fictício)',
    canal: 'Online, com vistoria presencial',
    orgao: 'Secretaria de Obras',
    faq: [
      [
        'Posso ocupar o imóvel antes do habite-se?',
        'Não. A ocupação sem a certidão pode gerar multa.',
      ],
      [
        'O habite-se vale para ampliações?',
        'Sim, desde que a ampliação conste no projeto aprovado.',
      ],
    ],
  },
  {
    slug: 'cartao-saude',
    cat: 'cidadania',
    name: 'Cartão municipal de saúde',
    summary: 'Cadastre-se para usar os serviços da rede municipal de saúde.',
    what: 'Cadastro e emissão do cartão que identifica o morador na rede municipal de saúde, para consultas, exames e vacinação.',
    who: 'Moradores do município, de qualquer idade. Menores de 18 anos devem ser cadastrados por um responsável.',
    docs: [
      'Documento de identificação com foto',
      'Comprovante de residência em Vale das Araras',
      'Certidão de nascimento, no caso de menores',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Acompanhe pelo número de protocolo',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Até 5 dias úteis',
    custo: 'Gratuito',
    canal: 'Online',
    orgao: 'Secretaria de Saúde',
    faq: [
      [
        'Como recebo o cartão?',
        'Você retira o cartão em qualquer unidade básica de saúde, com um documento de identificação.',
      ],
      ['Preciso renovar o cartão?', 'Não. Basta atualizar o endereço quando mudar de casa.'],
    ],
  },
  {
    slug: 'cadastro-social',
    cat: 'cidadania',
    name: 'Cadastro em programas sociais',
    summary: 'Solicite a inclusão da sua família nos programas municipais.',
    what: 'Cadastro da família para avaliação de elegibilidade em programas municipais de apoio, como cesta básica e auxílio-aluguel.',
    who: 'Famílias residentes no município com renda mensal de até meio salário mínimo por pessoa.',
    docs: [
      'Documento de identificação de todos os moradores',
      'Comprovante de residência',
      'Comprovante de renda ou declaração de ausência de renda',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Acompanhe pelo número de protocolo',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Até 10 dias úteis',
    custo: 'Gratuito',
    canal: 'Online ou presencial',
    orgao: 'Secretaria de Assistência Social',
    faq: [
      ['Quem pode fazer o cadastro?', 'O responsável pela família, com mais de 18 anos.'],
      ['Preciso atualizar os dados?', 'Sim. O cadastro deve ser revisto a cada 12 meses.'],
    ],
  },
  {
    slug: 'matricula',
    cat: 'educacao',
    name: 'Matrícula na rede municipal',
    summary: 'Matricule crianças na educação infantil e no ensino fundamental.',
    what: 'Pedido de vaga em creches, pré-escolas e escolas de ensino fundamental da rede municipal, por proximidade da residência.',
    who: 'Pais ou responsáveis legais de crianças e adolescentes de 0 a 14 anos.',
    docs: [
      'Certidão de nascimento da criança',
      'Documento de identificação do responsável',
      'Comprovante de residência',
      'Cartão de vacinação atualizado',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Acompanhe pelo número de protocolo',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Resposta conforme o calendário escolar',
    custo: 'Gratuito',
    canal: 'Online',
    orgao: 'Secretaria de Educação',
    faq: [
      ['Quando abrem as matrículas?', 'O calendário é divulgado em dezembro no portal.'],
      [
        'Posso escolher a escola?',
        'Você indica preferências, mas a vaga depende da disponibilidade perto da residência.',
      ],
    ],
  },
  {
    slug: 'espaco-cultural',
    cat: 'educacao',
    name: 'Reserva de espaço cultural',
    summary: 'Reserve o teatro ou a casa de cultura para um evento.',
    what: 'Reserva de espaços culturais municipais para apresentações, oficinas e reuniões, sujeita à disponibilidade da agenda.',
    who: 'Entidades, grupos artísticos e cidadãos maiores de 18 anos.',
    docs: [
      'Documento de identificação do responsável',
      'Descrição do evento, data e público esperado',
      'Estatuto da entidade, quando houver',
    ],
    steps: [
      'Preencha a solicitação online',
      'Anexe os documentos pedidos',
      'Acompanhe pelo número de protocolo',
      'Receba a resposta por e-mail',
    ],
    prazo: 'Resposta em até 5 dias úteis',
    custo:
      'Gratuito para entidades sem fins lucrativos; R$ 120,00 por dia nos demais casos (valores fictícios)',
    canal: 'Online',
    orgao: 'Secretaria de Cultura',
    faq: [
      ['Com quanta antecedência devo pedir?', 'Com pelo menos 30 dias de antecedência.'],
      [
        'Posso cobrar ingresso?',
        'Sim, desde que informado na solicitação e autorizado pela secretaria.',
      ],
    ],
  },
];

export const featured: string[] = ['iptu', 'certidao-negativa', 'alvara', 'poda-arvore'];

export const news: NewsItem[] = [
  {
    slug: 'feira-adocao',
    img: 'news-1',
    alt: 'Ilustração de colinas verdes sob um céu claro',
    tag: 'Meio ambiente',
    date: '2026-11-20',
    dateText: '20/11/2026',
    title: 'Feira de adoção de animais acontece no sábado',
    text: 'A praça central recebe cães e gatos castrados e vacinados, com orientação de veterinários.',
  },
  {
    slug: 'iptu-2027',
    img: 'news-2',
    alt: 'Ilustração de prédios geométricos em tons de azul',
    tag: 'Tributos',
    date: '2026-11-18',
    dateText: '18/11/2026',
    title: 'Calendário de vencimentos do IPTU 2027 sai em dezembro',
    text: 'Os carnês poderão ser consultados pelo portal, sem necessidade de ir ao balcão.',
  },
  {
    slug: 'biblioteca',
    img: 'news-3',
    alt: 'Ilustração de livros empilhados sobre uma mesa',
    tag: 'Cultura',
    date: '2026-11-12',
    dateText: '12/11/2026',
    title: 'Biblioteca municipal amplia o horário de funcionamento',
    text: 'A partir de dezembro, o atendimento passa a ir até as 20h, de segunda a sexta.',
  },
];

export const protocols: Protocol[] = [
  {
    number: '0004821-37.2026.1.01.0001',
    service: 'Alvará de funcionamento',
    opened: '20/11/2026',
    status: ['info', 'Em análise'],
    forecast: '11/12/2026',
    events: [
      {
        id: 'e3',
        title: 'Encaminhada para análise técnica',
        dateTime: '2026-11-23T10:05',
        time: '23/11/2026 10:05',
        text: 'A solicitação aguarda a vistoria da Secretaria de Desenvolvimento Econômico.',
        tone: 'info',
      },
      {
        id: 'e2',
        title: 'Documentos conferidos',
        dateTime: '2026-11-20T14:40',
        time: '20/11/2026 14:40',
        text: 'Todos os documentos obrigatórios foram aceitos.',
        tone: 'success',
      },
      {
        id: 'e1',
        title: 'Solicitação recebida',
        dateTime: '2026-11-20T09:12',
        time: '20/11/2026 09:12',
      },
    ],
  },
  {
    number: '0004102-15.2026.1.01.0001',
    service: 'Poda ou remoção de árvore',
    opened: '03/11/2026',
    status: ['success', 'Concluída'],
    forecast: null,
    events: [
      {
        id: 'e3',
        title: 'Serviço executado',
        dateTime: '2026-11-14T16:30',
        time: '14/11/2026 16:30',
        text: 'Poda realizada pela equipe de arborização.',
        tone: 'success',
      },
      {
        id: 'e2',
        title: 'Vistoria realizada',
        dateTime: '2026-11-09T11:00',
        time: '09/11/2026 11:00',
        text: 'A vistoria recomendou a poda de galhos sobre a rede elétrica.',
        tone: 'info',
      },
      {
        id: 'e1',
        title: 'Solicitação recebida',
        dateTime: '2026-11-03T08:47',
        time: '03/11/2026 08:47',
      },
    ],
  },
  {
    number: '0003955-82.2026.1.01.0001',
    service: 'Cartão municipal de saúde',
    opened: '28/10/2026',
    status: ['warning', 'Pendência de documento'],
    forecast: null,
    events: [
      {
        id: 'e2',
        title: 'Pendência de documento',
        dateTime: '2026-11-02T15:20',
        time: '02/11/2026 15:20',
        text: 'Envie um comprovante de residência atualizado para continuar.',
        tone: 'warning',
      },
      {
        id: 'e1',
        title: 'Solicitação recebida',
        dateTime: '2026-10-28T10:03',
        time: '28/10/2026 10:03',
      },
    ],
  },
  {
    number: '0000500-00.2026.1.01.0001',
    service: 'Matrícula na rede municipal',
    opened: '10/11/2026',
    status: ['success', 'Vaga confirmada'],
    forecast: null,
    events: [
      {
        id: 'e2',
        title: 'Vaga confirmada',
        dateTime: '2026-11-16T09:00',
        time: '16/11/2026 09:00',
        text: 'A vaga foi confirmada na escola mais próxima da residência.',
        tone: 'success',
      },
      {
        id: 'e1',
        title: 'Solicitação recebida',
        dateTime: '2026-11-10T13:25',
        time: '10/11/2026 13:25',
      },
    ],
  },
];

export const failingProtocol = '0000500-00.2026.1.01.0001';

export const a11yFeatures: [string, string][] = [
  [
    'Teclado',
    'Todo o portal pode ser usado só com o teclado. Use Tab e Shift+Tab para navegar, Enter para acionar e Esc para fechar janelas e menus.',
  ],
  [
    'Pular para o conteúdo',
    'O primeiro item ao teclar Tab é o link "Pular para o conteúdo", que leva direto ao texto principal da página.',
  ],
  [
    'Tamanho do texto',
    'Na barra de acessibilidade, escolha entre os tamanhos padrão, grande e maior. A escolha fica salva neste navegador.',
  ],
  [
    'Modo escuro',
    'Reduz o brilho da tela. Seguimos a preferência do seu sistema, e você pode trocá-la na barra.',
  ],
  [
    'Contraste e movimento',
    'Se o seu sistema pede mais contraste ou menos animação, o portal respeita essas preferências automaticamente.',
  ],
  [
    'Leitores de tela',
    'Usamos regiões da página, títulos em ordem e rótulos em todos os campos. Avisos de estado são lidos sem tirar o foco de onde você está.',
  ],
];

export const a11yFaq: [string, string][] = [
  [
    'Como aumento o texto?',
    'Na barra de acessibilidade, no alto de cada página, escolha "Grande" ou "Maior". Você também pode usar o zoom do navegador, que o portal acompanha até 400%.',
  ],
  [
    'O portal funciona com leitor de tela?',
    'Sim. Testamos com os leitores de tela mais usados. Se algo não for lido corretamente, avise pelos canais abaixo.',
  ],
  [
    'Preciso de ajuda para fazer uma solicitação.',
    'Procure o atendimento presencial ou ligue para a central. Um atendente preenche a solicitação com você.',
  ],
];

export const serviceBySlug = (slug: string): Service | undefined =>
  services.find((s) => s.slug === slug);

export const categoryName = (slug: string): string =>
  categories.find((c) => c.slug === slug)?.name ?? '';
