/*
 * Template Cadastro (HTML): o JS desta página só monta linhas, lê o id da query string e liga o que o
 * @efds-ui/behavior não faz sozinho (paginação, persistência de demonstração). Tudo o mais (ordenação,
 * seleção, exportação, máscaras, CEP, combobox, calendário, upload, campos condicionais, alterações
 * não salvas e diálogos) vem de atributos data-eds-* e do pacote.
 *
 * Este arquivo roda ANTES do behavior (script comum no fim do body; o behavior é defer): o DOM já está
 * montado quando o EDS liga os componentes. A persistência é só demonstrativa (localStorage).
 */
(function () {
  'use strict';

  var D = window.CADASTRO;
  var KEY = 'efds-cadastro-fornecedores';
  var FLASH = 'efds-cadastro-aviso';
  var PAGE_SIZE = 8;

  // ---------------------------------------------------------------- utilidades
  function $(selector, root) {
    return (root || document).querySelector(selector);
  }
  function norm(text) {
    return String(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  }
  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function dataBr(iso) {
    return iso ? String(iso).split('-').reverse().join('/') : '';
  }
  function plural(n, um, varios) {
    return n + ' ' + (n === 1 ? um : varios);
  }
  /** CNPJ/CPF mascarado: tudo vira asterisco, menos os dois últimos caracteres. */
  function maskDoc(doc) {
    var s = String(doc);
    return s.slice(0, -2).replace(/[0-9A-Za-z]/g, '*') + s.slice(-2);
  }
  function cidadePorValor(value) {
    return D.cidades.filter(function (c) {
      return c.value === value;
    })[0];
  }
  function cidadePorNome(nome) {
    return D.cidades.filter(function (c) {
      return norm(c.label) === norm(nome);
    })[0];
  }

  // ---------------------------------------------------------------- dados (só demonstração)
  var lista = carregar();

  function carregar() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var salvo = JSON.parse(raw);
        if (Array.isArray(salvo)) return salvo;
      }
    } catch {
      // Sem localStorage (modo privado, file:// restrito): a demonstração segue em memória.
    }
    return JSON.parse(JSON.stringify(D.seed));
  }
  function persistir() {
    try {
      localStorage.setItem(KEY, JSON.stringify(lista));
    } catch {
      // Idem: sem persistência, os dados valem até recarregar a página.
    }
  }
  function achar(id) {
    return lista.filter(function (f) {
      return f.id === id;
    })[0];
  }
  function proximoId() {
    var maior = lista.reduce(function (m, f) {
      return Math.max(m, Number(f.id.replace(/\D/g, '')) || 0);
    }, 0);
    return 'FOR-' + String(maior + 1).padStart(4, '0');
  }
  function remover(ids) {
    lista = lista.filter(function (f) {
      return ids.indexOf(f.id) < 0;
    });
    persistir();
  }

  // ---------------------------------------------------------------- avisos
  function avisar(opcoes) {
    if (window.EDS && window.EDS.toast) window.EDS.toast(opcoes);
  }
  /** Aviso que sobrevive à troca de página (salvar e excluir redirecionam). */
  function guardarAviso(opcoes) {
    try {
      sessionStorage.setItem(FLASH, JSON.stringify(opcoes));
    } catch {
      // Sem sessionStorage o aviso simplesmente não aparece.
    }
  }
  function mostrarAviso() {
    try {
      var raw = sessionStorage.getItem(FLASH);
      if (!raw) return;
      sessionStorage.removeItem(FLASH);
      avisar(JSON.parse(raw));
    } catch {
      // Aviso corrompido: ignora.
    }
  }
  function perguntar(texto, titulo, tipo, ok) {
    return window.EDS.confirm(texto, titulo, tipo, { okText: ok });
  }

  // ---------------------------------------------------------------- serviço de CEP fictício (local)
  // O pacote não faz nenhuma chamada externa por padrão. Aqui a "consulta" é respondida no navegador:
  // 90010100 e 88010000 existem, 99999999 simula falha de rede e o resto não é encontrado.
  (function instalarMockDeCep() {
    var original = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var href = typeof input === 'string' ? input : input && input.url ? input.url : String(input);
      var achado = /mock\/cep\/(\d+)/.exec(href);
      if (!achado) return original(input, init);
      return new Promise(function (resolve, reject) {
        window.setTimeout(function () {
          if (achado[1] === '99999999') {
            reject(new TypeError('Falha de rede simulada'));
            return;
          }
          resolve(
            new window.Response(JSON.stringify(D.ceps[achado[1]] || { erro: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }, 400);
      });
    };
  })();

  // ---------------------------------------------------------------- listas de apoio
  function preencherOpcoes(select, itens) {
    if (!select) return;
    itens.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item.value;
      opt.textContent = item.label;
      select.appendChild(opt);
    });
  }
  var categoriasOpc = D.categorias.map(function (c) {
    return { value: c, label: c };
  });
  var cidadesOpc = D.cidades.map(function (c) {
    return { value: c.value, label: c.label + '/' + c.uf };
  });
  var ufs = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'
    .split(' ')
    .map(function (uf) {
      return { value: uf, label: uf };
    });

  // ================================================================ LISTAGEM
  function iniciarLista() {
    var table = $('#tabela-fornecedores');
    var tbody = $('#tbody');
    var status = $('#tabela-status');
    var contagem = $('#contagem');
    var pag = $('#paginacao');
    var busca = $('#filtro-local');
    var lote = $('#acoes-lote');
    var selCount = $('#sel-count');

    preencherOpcoes($('#flt-categoria'), categoriasOpc);
    preencherOpcoes($('#flt-cidade'), cidadesOpc);

    // Filtros da barra: o envio é GET e a página lê a query string (funciona também sem JS no servidor).
    var params = new URLSearchParams(location.search);
    var filtros = {};
    ['situacao', 'categoria', 'cidade'].forEach(function (nome) {
      var el = $('#flt-' + nome);
      el.value = params.get(nome) || '';
      filtros[nome] = el.value;
    });

    var estado = {
      q: '',
      sort: { key: 'razao', dir: 'ascending' },
      page: 1,
      loading: true,
      selecionados: new Set(),
    };
    var linhasDaPagina = [];

    function ordenar(itens) {
      var sinal = estado.sort.dir === 'ascending' ? 1 : -1;
      var chave = estado.sort.key;
      return itens.slice().sort(function (a, b) {
        var x = a[chave];
        var y = b[chave];
        var dif =
          typeof x === 'number' && typeof y === 'number'
            ? x - y
            : String(x).localeCompare(String(y), 'pt-BR');
        return dif * sinal;
      });
    }
    function filtrados() {
      var q = norm(estado.q.trim());
      return ordenar(
        lista.filter(function (f) {
          if (filtros.situacao && f.situacao !== filtros.situacao) return false;
          if (filtros.categoria && f.categoria !== filtros.categoria) return false;
          if (filtros.cidade && f.cidade !== filtros.cidade) return false;
          if (!q) return true;
          return (
            norm(
              [f.id, f.razao, f.fantasia, f.documento, f.categoria, f.cidadeNome].join(' '),
            ).indexOf(q) >= 0
          );
        }),
      );
    }
    function filtrosAtivos() {
      return Boolean(filtros.situacao || filtros.categoria || filtros.cidade);
    }
    function anunciar(texto) {
      status.textContent = texto;
    }

    function linhaHtml(f) {
      var sit = D.situacoes[f.situacao];
      var nome = esc(f.razao);
      return (
        '<tr data-id="' +
        f.id +
        '">' +
        '<td class="eds-table-check"><label class="eds-check"><input type="checkbox" class="eds-checkbox" aria-label="Selecionar ' +
        nome +
        '" data-eds-select-row' +
        (estado.selecionados.has(f.id) ? ' checked' : '') +
        ' /></label></td>' +
        '<td>' +
        f.id +
        '</td>' +
        '<th scope="row"><a href="fornecedor.html?id=' +
        f.id +
        '">' +
        nome +
        '</a>' +
        (f.tipo === 'pj' && f.fantasia
          ? '<span class="cad-sub">' + esc(f.fantasia) + '</span>'
          : '') +
        '</th>' +
        '<td>' +
        esc(f.documento) +
        '</td>' +
        '<td>' +
        esc(f.categoria) +
        '</td>' +
        '<td>' +
        esc(f.cidadeNome) +
        '/' +
        f.uf +
        '</td>' +
        '<td><span class="eds-badge eds-badge-' +
        sit.badge +
        '">' +
        sit.label +
        '</span></td>' +
        '<td class="eds-table-num" data-value="' +
        f.limite +
        '">' +
        BRL.format(f.limite) +
        '</td>' +
        '<td class="eds-table-actions">' +
        '<button type="button" class="eds-button eds-button-ghost eds-button-icon eds-button-sm" id="acoes-' +
        f.id +
        '" popovertarget="menu-' +
        f.id +
        '" aria-label="Ações de ' +
        nome +
        '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg></button>' +
        '<div id="menu-' +
        f.id +
        '" class="eds-dropdown" role="group" aria-labelledby="acoes-' +
        f.id +
        '" popover="auto">' +
        '<a class="eds-dropdown-item" href="fornecedor.html?id=' +
        f.id +
        '">Ver detalhes</a>' +
        '<a class="eds-dropdown-item" href="fornecedor-form.html?id=' +
        f.id +
        '">Editar</a>' +
        '<hr class="eds-dropdown-separator" />' +
        '<button type="button" class="eds-dropdown-item eds-dropdown-item-danger" data-excluir="' +
        f.id +
        '" popovertarget="menu-' +
        f.id +
        '" popovertargetaction="hide">Excluir</button>' +
        '</div></td></tr>'
      );
    }

    function esqueletoHtml() {
      var linha = '<tr class="eds-table-loading">';
      for (var i = 0; i < 9; i += 1) {
        linha += '<td><span class="eds-skeleton eds-skeleton-text" aria-hidden="true"></span></td>';
      }
      linha += '</tr>';
      return linha.repeat(5);
    }

    function vazioHtml() {
      var semNada = lista.length === 0;
      var texto = semNada
        ? 'Ainda não há fornecedores. Cadastre o primeiro.'
        : 'Nada corresponde à busca ou aos filtros aplicados. Revise o termo ou limpe os filtros.';
      return (
        '<tr><td colspan="9" class="eds-table-empty"><div class="eds-empty">' +
        '<svg class="eds-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true"><path d="M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4" /></svg>' +
        '<h3 class="eds-empty-title">' +
        (semNada ? 'Nenhum fornecedor cadastrado' : 'Nenhum fornecedor encontrado') +
        '</h3>' +
        '<p class="eds-empty-text">' +
        texto +
        '</p>' +
        '<div class="eds-empty-actions">' +
        '<a class="eds-button eds-button-primary eds-button-sm" href="fornecedor-form.html">Novo fornecedor</a>' +
        (semNada
          ? ''
          : '<button type="button" class="eds-button eds-button-secondary eds-button-sm" id="limpar-tudo">Limpar busca e filtros</button>') +
        '</div></div></td></tr>'
      );
    }

    var SETA_ESQ =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>';
    var SETA_DIR =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>';

    function slots(pagina, total) {
      if (total <= 7) {
        return Array.from({ length: total }, function (_, i) {
          return i + 1;
        });
      }
      if (pagina <= 4) return [1, 2, 3, 4, 5, '…', total];
      if (pagina >= total - 3) {
        return [1, '…'].concat(
          Array.from({ length: 5 }, function (_, i) {
            return total - 4 + i;
          }),
        );
      }
      return [1, '…', pagina - 1, pagina, pagina + 1, '…', total];
    }

    function desenharPaginacao(total) {
      if (total <= 1) {
        pag.hidden = true;
        pag.innerHTML = '';
        return;
      }
      var atual = estado.page;
      var html =
        '<ul class="eds-pagination-list"><li><button type="button" class="eds-pagination-prev" data-pagina="' +
        (atual - 1) +
        '"' +
        (atual <= 1 ? ' aria-disabled="true"' : '') +
        '>' +
        SETA_ESQ +
        '<span>Anterior</span></button></li>';
      slots(atual, total).forEach(function (s) {
        if (s === '…') {
          html += '<li><span class="eds-pagination-ellipsis" aria-hidden="true">…</span></li>';
        } else {
          html +=
            '<li><button type="button" class="eds-pagination-item" data-pagina="' +
            s +
            '" aria-label="Página ' +
            s +
            '"' +
            (s === atual ? ' aria-current="page"' : '') +
            '>' +
            s +
            '</button></li>';
        }
      });
      html +=
        '<li><span class="eds-pagination-info">Página ' + atual + ' de ' + total + '</span></li>';
      html +=
        '<li><button type="button" class="eds-pagination-next" data-pagina="' +
        (atual + 1) +
        '"' +
        (atual >= total ? ' aria-disabled="true"' : '') +
        '><span>Próxima</span>' +
        SETA_DIR +
        '</button></li></ul>';
      pag.innerHTML = html;
      pag.hidden = false;
    }

    function atualizarLote() {
      var n = estado.selecionados.size;
      lote.hidden = n === 0;
      selCount.textContent = plural(n, 'selecionado', 'selecionados');
    }

    function desenhar() {
      table.setAttribute('aria-busy', String(estado.loading));
      if (estado.loading) {
        tbody.innerHTML = esqueletoHtml();
        contagem.textContent = '';
        pag.hidden = true;
        return;
      }
      var todos = filtrados();
      var total = todos.length;
      var paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
      estado.page = Math.min(estado.page, paginas);
      var inicio = (estado.page - 1) * PAGE_SIZE;
      linhasDaPagina = todos.slice(inicio, inicio + PAGE_SIZE);
      tbody.innerHTML = linhasDaPagina.length
        ? linhasDaPagina.map(linhaHtml).join('')
        : vazioHtml();
      contagem.textContent =
        total === 0
          ? 'Nenhum fornecedor encontrado.'
          : 'Mostrando ' +
            (inicio + 1) +
            '–' +
            (inicio + linhasDaPagina.length) +
            ' de ' +
            plural(total, 'fornecedor', 'fornecedores') +
            '.';
      desenharPaginacao(paginas);
      atualizarLote();
      // O cabeçalho "selecionar todos" reflete as linhas desta página.
      table.dispatchEvent(
        new window.CustomEvent('eds:table-filter', {
          bubbles: true,
          detail: { query: '', count: linhasDaPagina.length },
        }),
      );
    }

    // ---- ordenação: o behavior pergunta (cancelável) e quem ordena é este código, sobre todos os dados
    table.addEventListener('eds:table-sort', function (event) {
      event.preventDefault();
      var th = event.detail.th;
      estado.sort = { key: th.getAttribute('data-sort-key'), dir: event.detail.direction };
      estado.page = 1;
      Array.prototype.forEach.call(
        table.querySelectorAll('thead th[data-sort-key]'),
        function (outro) {
          outro.setAttribute('aria-sort', outro === th ? event.detail.direction : 'none');
        },
      );
      desenhar();
      anunciar(
        'Ordenado por ' +
          event.detail.label +
          ', ' +
          (event.detail.direction === 'ascending' ? 'crescente' : 'decrescente') +
          '.',
      );
    });

    // ---- seleção: o behavior marca as linhas; aqui se guarda o conjunto entre páginas
    table.addEventListener('eds:table-select-change', function (event) {
      var marcados = new Set(
        event.detail.rows.map(function (tr) {
          return tr && tr.getAttribute('data-id');
        }),
      );
      linhasDaPagina.forEach(function (f) {
        if (marcados.has(f.id)) estado.selecionados.add(f.id);
        else estado.selecionados.delete(f.id);
      });
      atualizarLote();
    });
    $('#lote-limpar').addEventListener('click', function () {
      estado.selecionados.clear();
      desenhar();
      anunciar('Seleção desfeita.');
      $('#filtro-local').focus();
    });

    // ---- exclusão (uma ou em lote), sempre com confirmação
    function excluir(ids) {
      var um = ids.length === 1;
      var alvo = achar(ids[0]);
      var texto = um
        ? 'Excluir o fornecedor ' + alvo.razao + '? Esta ação não pode ser desfeita.'
        : 'Excluir ' + ids.length + ' fornecedores? Esta ação não pode ser desfeita.';
      perguntar(
        texto,
        um ? 'Excluir fornecedor' : 'Excluir fornecedores',
        'danger',
        'Excluir',
      ).then(function (ok) {
        if (!ok) return;
        remover(ids);
        ids.forEach(function (id) {
          estado.selecionados.delete(id);
        });
        desenhar();
        anunciar(plural(ids.length, 'fornecedor excluído', 'fornecedores excluídos') + '.');
        avisar({
          tone: 'success',
          message: um
            ? 'Fornecedor ' + alvo.razao + ' excluído (simulação).'
            : ids.length + ' fornecedores excluídos (simulação).',
        });
        busca.focus();
      });
    }
    tbody.addEventListener('click', function (event) {
      var botao = event.target.closest('[data-excluir]');
      if (botao) {
        excluir([botao.getAttribute('data-excluir')]);
        return;
      }
      if (event.target.closest('#limpar-tudo')) {
        if (filtrosAtivos()) {
          location.href = 'index.html';
          return;
        }
        busca.value = '';
        estado.q = '';
        estado.page = 1;
        desenhar();
        busca.focus();
      }
    });
    $('#lote-excluir').addEventListener('click', function () {
      excluir(Array.from(estado.selecionados));
    });

    // ---- busca local (sobre todos os dados, não só a página visível)
    var temporizador = null;
    busca.addEventListener('input', function () {
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(function () {
        estado.q = busca.value;
        estado.page = 1;
        estado.selecionados.clear();
        desenhar();
        var n = filtrados().length;
        anunciar(n === 0 ? 'Nenhum resultado.' : plural(n, 'resultado', 'resultados') + '.');
      }, 150);
    });
    busca.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && busca.value) {
        busca.value = '';
        busca.dispatchEvent(new window.Event('input'));
      }
    });

    // ---- paginação
    pag.addEventListener('click', function (event) {
      var botao = event.target.closest('[data-pagina]');
      if (!botao || botao.getAttribute('aria-disabled') === 'true') return;
      estado.page = Number(botao.getAttribute('data-pagina'));
      desenhar();
      var atual = pag.querySelector('[aria-current="page"]');
      if (atual) atual.focus();
      anunciar('Página ' + estado.page + '. ' + contagem.textContent);
    });

    // ---- exportação: arquivo com todas as linhas da busca (ou as selecionadas) e documentos mascarados
    table.addEventListener('eds:table-beforeexport', function (event) {
      var fonte = estado.selecionados.size
        ? ordenar(
            lista.filter(function (f) {
              return estado.selecionados.has(f.id);
            }),
          )
        : filtrados();
      event.detail.data.rows = fonte.map(function (f) {
        return {
          id: f.id,
          razao: f.razao,
          documento: maskDoc(f.documento),
          categoria: f.categoria,
          cidade: f.cidadeNome + '/' + f.uf,
          situacao: D.situacoes[f.situacao].label,
          limite: f.limite,
        };
      });
    });

    // ---- carregando: a primeira carga é simulada para mostrar o estado
    desenhar();
    window.setTimeout(function () {
      estado.loading = false;
      desenhar();
      anunciar(plural(filtrados().length, 'fornecedor', 'fornecedores') + '.');
    }, 700);
  }

  // ================================================================ DETALHE
  function iniciarDetalhe() {
    var id = new URLSearchParams(location.search).get('id');
    var f = id ? achar(id) : null;
    if (!f) {
      $('#titulo').textContent = 'Fornecedor não encontrado';
      $('#crumb-atual').textContent = 'Não encontrado';
      document.title = 'Fornecedor não encontrado · Cadastro';
      $('#nao-encontrado').hidden = false;
      return;
    }
    document.title = f.razao + ' · Cadastro';
    $('#titulo').textContent = f.razao;
    $('#crumb-atual').textContent = f.razao;
    $('#subtitulo').textContent =
      f.id + ' · ' + (f.tipo === 'pj' ? 'Pessoa jurídica' : 'Pessoa física');
    $('#editar').href = 'fornecedor-form.html?id=' + f.id;
    $('#acoes').hidden = false;
    $('#abas').hidden = false;

    var sit = D.situacoes[f.situacao];
    function item(rotulo, valor) {
      var vazio = valor === undefined || valor === null || valor === '';
      return (
        '<div><dt>' +
        rotulo +
        '</dt><dd>' +
        (vazio
          ? '<span class="eds-description-empty" aria-hidden="true">—</span><span class="eds-visually-hidden">não informado</span>'
          : valor) +
        '</dd></div>'
      );
    }
    $('#lista-dados').innerHTML =
      item('Código', f.id) +
      item(
        'Situação',
        '<span class="eds-badge eds-badge-' + sit.badge + '">' + sit.label + '</span>',
      ) +
      item(f.tipo === 'pj' ? 'CNPJ' : 'CPF', esc(f.documento)) +
      item('Nome fantasia', f.tipo === 'pj' ? esc(f.fantasia) : '') +
      item('Categoria', esc(f.categoria)) +
      item('E-mail', esc(f.email)) +
      item('Telefone', esc(f.telefone)) +
      item(
        'Endereço',
        esc(
          f.logradouro +
            ', ' +
            f.numero +
            (f.bairro ? ' · ' + f.bairro : '') +
            ' · ' +
            f.cidadeNome +
            '/' +
            f.uf +
            ' · CEP ' +
            f.cep,
        ),
      ) +
      item('Limite de compra', BRL.format(f.limite)) +
      item('Início do contrato', dataBr(f.contratoEm)) +
      item('Motivo da inativação', f.motivo ? esc(f.motivo) : '') +
      item('Observações', f.obs ? esc(f.obs) : '');

    $('#lista-docs').innerHTML = f.documentos.length
      ? '<ul class="eds-stack eds-gap-2">' +
        f.documentos
          .map(function (d) {
            return (
              '<li>' + esc(d.nome) + ' <span class="cad-muted">(' + esc(d.tamanho) + ')</span></li>'
            );
          })
          .join('') +
        '</ul>'
      : '<p class="cad-muted">Nenhum documento enviado.</p>';

    $('#linha-tempo').innerHTML = f.historico
      .map(function (h) {
        return (
          '<li class="eds-timeline-item' +
          (h.tom ? ' eds-timeline-item-' + h.tom : '') +
          '">' +
          '<span class="eds-timeline-marker" aria-hidden="true"></span>' +
          '<div class="eds-timeline-content"><div class="eds-timeline-header">' +
          '<span class="eds-timeline-title">' +
          esc(h.titulo) +
          '</span>' +
          '<time class="eds-timeline-time" datetime="' +
          h.data +
          'T' +
          h.hora +
          '">' +
          dataBr(h.data) +
          ' ' +
          h.hora +
          '</time></div>' +
          '<p class="eds-timeline-actor">por ' +
          esc(h.autor) +
          '</p></div></li>'
        );
      })
      .join('');

    $('#excluir').addEventListener('click', function () {
      perguntar(
        'Excluir o fornecedor ' + f.razao + '? Esta ação não pode ser desfeita.',
        'Excluir fornecedor',
        'danger',
        'Excluir',
      ).then(function (ok) {
        if (!ok) return;
        remover([f.id]);
        guardarAviso({
          tone: 'success',
          message: 'Fornecedor ' + f.razao + ' excluído (simulação).',
        });
        location.href = 'index.html';
      });
    });
  }

  // ================================================================ FORMULÁRIO
  var CAMPO = {
    cnpj: 'f-cnpj',
    cpf: 'f-cpf',
    razao: 'f-razao',
    categoria: 'f-categoria',
    motivo: 'f-motivo',
    email: 'f-email',
    telefone: 'f-telefone',
    emailAlt: 'f-email-alt',
    cep: 'f-cep',
    logradouro: 'f-logradouro',
    numero: 'f-numero',
    cidade: 'f-cidade',
    uf: 'f-uf',
    contratoEm: 'f-contrato',
  };
  var ROTULO = {
    cnpj: 'CNPJ',
    cpf: 'CPF',
    razao: 'Razão social ou nome',
    categoria: 'Categoria',
    motivo: 'Motivo da inativação',
    email: 'E-mail',
    telefone: 'Telefone',
    emailAlt: 'E-mail alternativo',
    cep: 'CEP',
    logradouro: 'Logradouro',
    numero: 'Número',
    cidade: 'Cidade',
    uf: 'UF',
    contratoEm: 'Início do contrato',
  };

  function iniciarFormulario() {
    var form = $('#form-fornecedor');
    var id = new URLSearchParams(location.search).get('id');
    var editando = id ? achar(id) : null;

    if (id && !editando) {
      $('#titulo').textContent = 'Fornecedor não encontrado';
      $('#crumb-atual').textContent = 'Não encontrado';
      form.hidden = true;
      $('#resumo-erros').innerHTML =
        '<div class="eds-alert eds-alert-warning"><div class="eds-alert-content"><p class="eds-alert-title"><span class="eds-visually-hidden">Atenção: </span>Fornecedor não encontrado</p>' +
        '<p>O código ' +
        esc(id) +
        ' não existe. <a href="index.html">Voltar para a lista</a></p></div></div>';
      return;
    }

    preencherOpcoes($('#f-categoria'), categoriasOpc);
    preencherOpcoes($('#f-uf'), ufs);
    $('#f-cidade-lista').innerHTML = D.cidades
      .map(function (c, i) {
        return (
          '<li id="f-cidade-opt-' +
          (i + 1) +
          '" class="eds-combobox-option" role="option" data-value="' +
          c.value +
          '">' +
          esc(c.label) +
          '</li>'
        );
      })
      .join('');

    var el = form.elements;
    function valor(nome, v) {
      if (el[nome]) el[nome].value = v === undefined || v === null ? '' : v;
    }

    if (editando) {
      var e = editando;
      document.title = 'Editar ' + e.razao + ' · Cadastro';
      $('#titulo').textContent = 'Editar fornecedor';
      $('#crumb-atual').textContent = 'Editar';
      $('#cancelar').href = 'fornecedor.html?id=' + e.id;
      $('#salvar').textContent = 'Salvar alterações';
      valor('tipo', e.tipo);
      valor('cnpj', e.tipo === 'pj' ? e.documento : '');
      valor('cpf', e.tipo === 'pf' ? e.documento : '');
      valor('razao', e.razao);
      valor('fantasia', e.fantasia);
      valor('categoria', e.categoria);
      valor('situacao', e.situacao);
      valor('motivo', e.motivo);
      valor('email', e.email);
      valor('telefone', e.telefone);
      valor('cep', e.cep);
      valor('logradouro', e.logradouro);
      valor('numero', e.numero);
      valor('bairro', e.bairro);
      valor('cidade', e.cidade);
      $('#f-cidade').value = e.cidadeNome;
      valor('uf', e.uf);
      valor('limite', e.limite.toFixed(2));
      valor('contratoEm', e.contratoEm);
      valor('obs', e.obs);
      if (e.documentos && e.documentos.length) {
        var existentes = $('#docs-existentes');
        existentes.textContent =
          'Já enviados: ' +
          e.documentos
            .map(function (d) {
              return d.nome;
            })
            .join(', ') +
          '. Novos arquivos são acrescentados.';
        existentes.hidden = false;
      }
    } else {
      document.title = 'Novo fornecedor · Cadastro';
    }

    // ---- validação visível: mensagem por campo + resumo com links (nada de balão nativo)
    function dado(fd, nome) {
      return String(fd.get(nome) || '').trim();
    }
    function digitos(texto) {
      return String(texto).replace(/\D/g, '');
    }
    function validar() {
      var fd = new window.FormData(form);
      var erros = {};
      var tipo = dado(fd, 'tipo');
      if (tipo === 'pj') {
        if (!dado(fd, 'cnpj')) erros.cnpj = 'Informe o CNPJ.';
        else if (dado(fd, 'cnpj').replace(/[^0-9A-Za-z]/g, '').length !== 14)
          erros.cnpj = 'Use 14 caracteres, no formato 00.000.000/0000-00.';
      } else if (!dado(fd, 'cpf')) erros.cpf = 'Informe o CPF.';
      else if (digitos(dado(fd, 'cpf')).length !== 11)
        erros.cpf = 'Use 11 dígitos, no formato 000.000.000-00.';
      if (!dado(fd, 'razao')) erros.razao = 'Informe a razão social ou o nome.';
      if (!dado(fd, 'categoria')) erros.categoria = 'Escolha uma categoria.';
      if (dado(fd, 'situacao') === 'inativo' && !dado(fd, 'motivo'))
        erros.motivo = 'Informe o motivo da inativação.';
      var mail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!dado(fd, 'email')) erros.email = 'Informe o e-mail.';
      else if (!mail.test(dado(fd, 'email')))
        erros.email = 'Informe um e-mail válido, como nome@example.com.';
      if (dado(fd, 'emailAlt') && !mail.test(dado(fd, 'emailAlt')))
        erros.emailAlt = 'Informe um e-mail válido, como nome@example.com.';
      var tel = digitos(dado(fd, 'telefone'));
      if (tel && (tel.length < 10 || tel.length > 11))
        erros.telefone = 'Use DDD e número, com 10 ou 11 dígitos.';
      if (!dado(fd, 'cep')) erros.cep = 'Informe o CEP.';
      else if (digitos(dado(fd, 'cep')).length !== 8) erros.cep = 'Use o formato 00000-000.';
      if (!dado(fd, 'logradouro')) erros.logradouro = 'Informe o logradouro.';
      if (!dado(fd, 'numero')) erros.numero = 'Informe o número (ou "s/n").';
      if (!dado(fd, 'cidade')) erros.cidade = 'Escolha a cidade na lista.';
      if (!dado(fd, 'uf')) erros.uf = 'Escolha a UF.';
      if (!dado(fd, 'contratoEm')) erros.contratoEm = 'Informe a data de início do contrato.';
      return erros;
    }

    function limparErro(nome) {
      var ctl = document.getElementById(CAMPO[nome]);
      var p = document.getElementById(CAMPO[nome] + '-erro');
      if (p) p.remove();
      if (ctl) {
        ctl.removeAttribute('aria-invalid');
        var d = (ctl.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (x) {
          return x && x !== CAMPO[nome] + '-erro';
        });
        if (d.length) ctl.setAttribute('aria-describedby', d.join(' '));
        else ctl.removeAttribute('aria-describedby');
      }
    }
    function mostrarErro(nome, msg) {
      limparErro(nome);
      var ctl = document.getElementById(CAMPO[nome]);
      if (!ctl) return;
      var p = document.createElement('p');
      p.className = 'eds-error';
      p.id = CAMPO[nome] + '-erro';
      p.textContent = msg;
      ctl.closest('.eds-field').appendChild(p);
      ctl.setAttribute('aria-invalid', 'true');
      var d = (ctl.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      d.push(p.id);
      ctl.setAttribute('aria-describedby', d.join(' '));
    }

    var enviado = false;
    function revalidar() {
      if (!enviado) return;
      var erros = validar();
      Object.keys(CAMPO).forEach(function (nome) {
        var existe = document.getElementById(CAMPO[nome] + '-erro');
        if (existe && !erros[nome]) limparErro(nome);
      });
    }
    form.addEventListener('input', revalidar);
    form.addEventListener('change', revalidar);

    var resumo = $('#resumo-erros');
    resumo.addEventListener('click', function (event) {
      var link = event.target.closest('[data-foco]');
      if (!link) return;
      event.preventDefault();
      var alvo = document.getElementById(link.getAttribute('data-foco'));
      if (alvo) alvo.focus();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      enviado = true;
      var erros = validar();
      var nomes = Object.keys(CAMPO).filter(function (n) {
        return erros[n];
      });
      Object.keys(CAMPO).forEach(limparErro);
      nomes.forEach(function (n) {
        mostrarErro(n, erros[n]);
      });
      if (nomes.length) {
        resumo.innerHTML =
          '<div class="eds-alert eds-alert-danger" role="group" tabindex="-1" aria-labelledby="resumo-t"><div class="eds-alert-content">' +
          '<p class="eds-alert-title" id="resumo-t"><span class="eds-visually-hidden">Erro: </span>' +
          (nomes.length === 1
            ? 'Último envio: 1 campo com erro'
            : 'Último envio: ' + nomes.length + ' campos com erro') +
          '</p>' +
          '<ul role="list">' +
          nomes
            .map(function (n) {
              return (
                '<li><a href="#' +
                CAMPO[n] +
                '" data-foco="' +
                CAMPO[n] +
                '">' +
                ROTULO[n] +
                ': ' +
                esc(erros[n]) +
                '</a></li>'
              );
            })
            .join('') +
          '</ul></div></div>';
        resumo.firstElementChild.focus();
        return;
      }
      resumo.innerHTML = '';
      salvar();
    });

    function salvar() {
      var fd = new window.FormData(form);
      var get = function (n) {
        return dado(fd, n);
      };
      var tipo = get('tipo');
      var cidade = cidadePorValor(get('cidade'));
      var arquivos = Array.from(form.elements['documentos[]'].files || []).map(function (a) {
        return { nome: a.name, tamanho: Math.max(1, Math.round(a.size / 1024)) + ' kB' };
      });
      var agora = new Date();
      var data =
        agora.getFullYear() +
        '-' +
        String(agora.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(agora.getDate()).padStart(2, '0');
      var hora =
        String(agora.getHours()).padStart(2, '0') +
        ':' +
        String(agora.getMinutes()).padStart(2, '0');
      var base = editando || { documentos: [], historico: [] };
      var registro = {
        id: editando ? editando.id : proximoId(),
        tipo: tipo,
        razao: get('razao'),
        fantasia: tipo === 'pj' ? get('fantasia') : '',
        documento: tipo === 'pj' ? get('cnpj') : get('cpf'),
        categoria: get('categoria'),
        situacao: get('situacao'),
        motivo: get('situacao') === 'inativo' ? get('motivo') : '',
        cidade: cidade.value,
        cidadeNome: cidade.label,
        uf: get('uf'),
        email: get('email'),
        telefone: get('telefone'),
        cep: get('cep'),
        logradouro: get('logradouro'),
        numero: get('numero'),
        bairro: get('bairro'),
        limite:
          Number(
            get('limite')
              .replace(/[^\d,]/g, '')
              .replace(',', '.'),
          ) || 0,
        contratoEm: get('contratoEm'),
        obs: get('obs'),
        documentos: base.documentos.concat(arquivos),
        historico: [
          {
            titulo: editando ? 'Cadastro atualizado' : 'Fornecedor cadastrado',
            data: data,
            hora: hora,
            autor: 'Ana Exemplo',
            tom: editando ? 'info' : 'success',
          },
        ].concat(base.historico),
      };
      lista = lista.filter(function (f) {
        return f.id !== registro.id;
      });
      lista.push(registro);
      persistir();
      // O estado atual passa a ser o "sem alterações": o aviso de saída não aparece.
      if (window.EDS && window.EDS.markClean) window.EDS.markClean(form);
      guardarAviso({
        tone: 'success',
        message: 'Fornecedor ' + registro.razao + ' salvo (simulação).',
      });
      location.href = 'fornecedor.html?id=' + registro.id;
    }

    // ---- a cidade escolhida define a UF; o CEP encontrado escolhe a cidade
    form.addEventListener('eds:combobox-change', function (event) {
      var c = cidadePorValor(event.detail.value);
      if (c && el.uf.value !== c.uf) {
        el.uf.value = c.uf;
        el.uf.dispatchEvent(new window.Event('change', { bubbles: true }));
      }
    });
    form.addEventListener('eds:cep-lookup', function (event) {
      if (event.detail.status !== 'found') return;
      var c = cidadePorNome(event.detail.data.localidade || '');
      if (!c) return;
      var opcao = form.querySelector('#f-cidade-lista [data-value="' + c.value + '"]');
      if (opcao) opcao.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
  }

  // ---------------------------------------------------------------- partida
  var pagina = document.body.getAttribute('data-page');
  if (pagina === 'lista') iniciarLista();
  else if (pagina === 'detalhe') iniciarDetalhe();
  else if (pagina === 'form') iniciarFormulario();
  window.addEventListener('load', mostrarAviso);
})();
