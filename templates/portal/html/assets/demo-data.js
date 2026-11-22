/*
 * Dados fictícios do template (protocolos de exemplo). Em produção, substitua a consulta por uma
 * chamada ao seu servidor e remova este arquivo.
 */
window.PORTAL_DEMO = {
  protocols: [
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
  ],
  failingProtocol: '0000500-00.2026.1.01.0001',
};
