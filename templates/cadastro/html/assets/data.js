/*
 * Dados FICTÍCIOS do template Cadastro (Fornecedores). Nenhuma pessoa ou empresa real:
 * documentos e contatos são inventados (example.com). Em produção, troque por chamadas ao seu servidor.
 */
(function () {
  var CIDADES = [
    { value: 'poa', label: 'Porto Alegre', uf: 'RS' },
    { value: 'pel', label: 'Pelotas', uf: 'RS' },
    { value: 'pf', label: 'Passo Fundo', uf: 'RS' },
    { value: 'cax', label: 'Caxias do Sul', uf: 'RS' },
    { value: 'sm', label: 'Santa Maria', uf: 'RS' },
    { value: 'flo', label: 'Florianópolis', uf: 'SC' },
    { value: 'joi', label: 'Joinville', uf: 'SC' },
    { value: 'cwb', label: 'Curitiba', uf: 'PR' },
    { value: 'lon', label: 'Londrina', uf: 'PR' },
    { value: 'spo', label: 'São Paulo', uf: 'SP' },
  ];

  // Categorias do Lookup: código curto + descrição. O cadastro guarda a descrição.
  var CATEGORIAS_LOOKUP = [
    { code: 'MAT', description: 'Materiais' },
    { code: 'SRV', description: 'Serviços' },
    { code: 'TEC', description: 'Tecnologia' },
    { code: 'TRA', description: 'Transporte' },
    { code: 'MAN', description: 'Manutenção' },
  ];
  var CATEGORIAS = CATEGORIAS_LOOKUP.map(function (c) {
    return c.description;
  });

  var SITUACOES = {
    ativo: { label: 'Ativo', badge: 'success' },
    pendente: { label: 'Em análise', badge: 'warning' },
    inativo: { label: 'Inativo', badge: 'neutral' },
  };

  // [fantasia, razão social, categoria, cidade, situação, tipo (pj, pf ou est = estrangeiro)]
  var BASE = [
    ['Aurora Papelaria', 'Aurora Papelaria Exemplo Ltda.', 'Materiais', 'poa', 'ativo', 'pj'],
    ['Boreal Serviços', 'Boreal Serviços Gerais Ltda.', 'Serviços', 'pel', 'ativo', 'pj'],
    ['Cedro Alimentos', 'Cedro Alimentos Modelo S.A.', 'Materiais', 'pf', 'ativo', 'pj'],
    [
      'Delta Transportes',
      'Delta Transportes Fictícios Ltda.',
      'Transporte',
      'cax',
      'pendente',
      'pj',
    ],
    ['Estrela Informática', 'Estrela Informática Exemplo Ltda.', 'Tecnologia', 'sm', 'ativo', 'pj'],
    ['Faróis Manutenção', 'Faróis Manutenção Predial Ltda.', 'Manutenção', 'flo', 'inativo', 'pj'],
    ['Girassol Gráfica', 'Girassol Gráfica Modelo Ltda.', 'Serviços', 'joi', 'ativo', 'pj'],
    ['Horizonte Software', 'Horizonte Software Exemplo Ltda.', 'Tecnologia', 'cwb', 'ativo', 'pj'],
    ['Ipê Mobiliário', 'Ipê Mobiliário Fictício Ltda.', 'Materiais', 'lon', 'pendente', 'pj'],
    ['Jacarandá Logística', 'Jacarandá Logística Teste S.A.', 'Transporte', 'spo', 'ativo', 'pj'],
    ['Kappa Limpeza', 'Kappa Limpeza e Conservação Ltda.', 'Serviços', 'poa', 'ativo', 'pj'],
    ['Lumen Elétrica', 'Lumen Instalações Elétricas Ltda.', 'Manutenção', 'pel', 'inativo', 'pj'],
    ['Mirante Consultoria', 'Mirante Consultoria Exemplo S/S', 'Serviços', 'pf', 'ativo', 'pj'],
    ['Nimbus Cloud', 'Nimbus Serviços em Nuvem Ltda.', 'Tecnologia', 'cax', 'ativo', 'pj'],
    ['Ouro Verde Jardinagem', 'Ouro Verde Jardinagem Ltda.', 'Serviços', 'sm', 'pendente', 'pj'],
    ['Pampa Suprimentos', 'Pampa Suprimentos Modelo Ltda.', 'Materiais', 'flo', 'ativo', 'pj'],
    ['Quartzo Engenharia', 'Quartzo Engenharia Fictícia Ltda.', 'Manutenção', 'joi', 'ativo', 'pj'],
    ['Rio Claro Fretes', 'Rio Claro Fretes Exemplo Ltda.', 'Transporte', 'cwb', 'inativo', 'pj'],
    ['Safira Uniformes', 'Safira Uniformes Teste Ltda.', 'Materiais', 'lon', 'ativo', 'pj'],
    ['Tupã Sistemas', 'Tupã Sistemas Modelo Ltda.', 'Tecnologia', 'spo', 'ativo', 'pj'],
    ['Ana Exemplo Fotografia', 'Ana Exemplo (autônoma)', 'Serviços', 'poa', 'ativo', 'pf'],
    ['Bruno Modelo Reparos', 'Bruno Modelo (autônomo)', 'Manutenção', 'pel', 'pendente', 'pf'],
    ['Clara Teste Tradução', 'Clara Teste (autônoma)', 'Serviços', 'pf', 'ativo', 'pf'],
    [
      'Diego Fictício Transportes',
      'Diego Fictício (autônomo)',
      'Transporte',
      'cax',
      'inativo',
      'pf',
    ],
    ['Nordic Supplies', 'Nordic Supplies Exemplo AB', 'Materiais', 'poa', 'ativo', 'est'],
  ];

  function pad(n, size) {
    return String(n).padStart(size, '0');
  }

  // CNPJ e CPF FICTÍCIOS, mas com dígitos verificadores corretos (a validação do formulário os aceita).
  function digitoVerificador(digitos, pesos) {
    var soma = 0;
    for (var k = 0; k < pesos.length; k += 1) soma += digitos[k] * pesos[k];
    var resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }
  function cnpjFicticio(base12) {
    var d = base12.split('').map(Number);
    d.push(digitoVerificador(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
    d.push(digitoVerificador(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
    var t = d.join('');
    return (
      t.slice(0, 2) +
      '.' +
      t.slice(2, 5) +
      '.' +
      t.slice(5, 8) +
      '/' +
      t.slice(8, 12) +
      '-' +
      t.slice(12)
    );
  }
  function cpfFicticio(base9) {
    var d = base9.split('').map(Number);
    d.push(digitoVerificador(d, [10, 9, 8, 7, 6, 5, 4, 3, 2]));
    d.push(digitoVerificador(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]));
    var t = d.join('');
    return t.slice(0, 3) + '.' + t.slice(3, 6) + '.' + t.slice(6, 9) + '-' + t.slice(9);
  }

  var fornecedores = BASE.map(function (b, i) {
    var cidade = CIDADES.filter(function (c) {
      return c.value === b[3];
    })[0];
    var documento =
      b[5] === 'pj'
        ? cnpjFicticio(pad(10 + i, 2) + '000' + pad(100 + i, 3) + '0001')
        : b[5] === 'pf'
          ? cpfFicticio('000000' + pad(100 + i, 3))
          : 'SE556000-' + pad(100 + i, 4);
    var dia = pad((i % 27) + 1, 2);
    var mes = pad((i % 12) + 1, 2);
    return {
      id: 'FOR-' + pad(i + 1, 4),
      tipo: b[5],
      pais: b[5] === 'est' ? 'Suécia' : '',
      razao: b[1],
      fantasia: b[0],
      documento: documento,
      categoria: b[2],
      situacao: b[4],
      cidade: b[3],
      cidadeNome: cidade.label,
      uf: cidade.uf,
      email: 'contato' + (i + 1) + '@example.com',
      telefone: '(51) 3000-' + pad(1000 + i, 4),
      cep: '90010-100',
      logradouro: 'Rua dos Exemplos',
      numero: String(100 + i),
      bairro: 'Centro',
      limite: 5000 + i * 2500,
      contratoEm: '2025-' + mes + '-' + dia,
      documentos: [
        { nome: 'Contrato de fornecimento.pdf', tamanho: '184 kB' },
        { nome: 'Certidão negativa.pdf', tamanho: '92 kB' },
      ],
      historico: [
        {
          titulo: 'Cadastro atualizado',
          data: '2026-10-' + dia,
          hora: '14:20',
          autor: 'Maria Exemplo',
          tom: 'info',
        },
        {
          titulo: 'Documentos conferidos',
          data: '2026-09-' + dia,
          hora: '09:05',
          autor: 'João Exemplo',
          tom: 'success',
        },
        {
          titulo: 'Fornecedor cadastrado',
          data: '2025-' + mes + '-' + dia,
          hora: '16:40',
          autor: 'Maria Exemplo',
        },
      ],
    };
  });

  // CEPs fictícios do serviço local (mock): 90010100 e 88010000 existem; 99999999 simula falha de rede.
  var CEPS = {
    90010100: {
      logradouro: 'Rua dos Exemplos',
      bairro: 'Centro Histórico',
      localidade: 'Porto Alegre',
      uf: 'RS',
    },
    88010000: {
      logradouro: 'Avenida Modelo',
      bairro: 'Centro',
      localidade: 'Florianópolis',
      uf: 'SC',
    },
  };

  window.CADASTRO = {
    cidades: CIDADES,
    categorias: CATEGORIAS,
    categoriasLookup: CATEGORIAS_LOOKUP,
    situacoes: SITUACOES,
    ceps: CEPS,
    seed: fornecedores,
  };
})();
