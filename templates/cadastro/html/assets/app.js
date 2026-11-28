/*
 * Template Cadastro (HTML): o JS desta página só monta linhas, lê o id da query string e liga o que o
 * @efds-ui/behavior não faz sozinho (paginação, persistência de demonstração, a "base de dados" fictícia
 * que ordena, filtra e edita). Tudo o mais (ordenação múltipla, filtro por coluna, painel de colunas,
 * barra de lote, edição na célula, validação, resumo de erros, estado de envio, Lookup, stepper de
 * seções, máscaras, CEP, combobox, calendário, upload, campos condicionais, alterações não salvas e
 * diálogos) vem de atributos data-eds-* e do pacote.
 *
 * Este arquivo roda ANTES do behavior (script comum no fim do body; o behavior é defer): o DOM já está
 * montado quando o EDS liga os componentes. A persistência é só demonstrativa (localStorage).
 */
(function () {
  'use strict';

  var D = window.CADASTRO;
  var KEY = 'efds-cadastro-fornecedores';
  var FLASH = 'efds-cadastro-aviso';
  var KEY_CATEGORIAS = 'efds-cadastro-categorias';
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
  function rotuloTipo(tipo) {
    return tipo === 'pj' ? 'Pessoa jurídica' : tipo === 'pf' ? 'Pessoa física' : 'Estrangeiro';
  }
  function rotuloDocumento(tipo) {
    return tipo === 'pj' ? 'CNPJ' : tipo === 'pf' ? 'CPF' : 'Passaporte ou identificação fiscal';
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

  // Categorias (código + descrição): as do exemplo e as cadastradas por "Cadastrar novo…" (demonstração).
  var extras = (function () {
    try {
      var salvo = JSON.parse(localStorage.getItem(KEY_CATEGORIAS) || '[]');
      return Array.isArray(salvo) ? salvo : [];
    } catch {
      return [];
    }
  })();
  function todasCategorias() {
    return D.categoriasLookup.concat(extras);
  }
  function guardarCategoria(item) {
    extras.push(item);
    try {
      localStorage.setItem(KEY_CATEGORIAS, JSON.stringify(extras));
    } catch {
      // Sem localStorage a categoria vale só até recarregar a página.
    }
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
  var categoriasOpc = todasCategorias().map(function (c) {
    return { value: c.description, label: c.description };
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

    preencherOpcoes($('#flt-categoria'), categoriasOpc);
    preencherOpcoes($('#flt-cidade'), cidadesOpc);
    // Filtro por coluna "Categoria": uma caixa de seleção por categoria (várias podem valer ao mesmo tempo).
    $('#fc-categoria-opcoes').insertAdjacentHTML(
      'beforeend',
      categoriasOpc
        .map(function (c) {
          return (
            '<label class="eds-check"><input type="checkbox" class="eds-checkbox" name="filter[categoria]" value="' +
            esc(c.value) +
            '" /> <span>' +
            esc(c.label) +
            '</span></label>'
          );
        })
        .join(''),
    );

    // Filtros da barra: o envio é GET e a página lê a query string (funciona também sem JS no servidor).
    var params = new URLSearchParams(location.search);
    var filtros = {};
    ['situacao', 'categoria', 'cidade'].forEach(function (nome) {
      var el = $('#flt-' + nome);
      el.value = params.get(nome) || '';
      filtros[nome] = el.value;
    });

    // Ordenação por colunas (Shift + clique acrescenta): cada critério é { key: id da coluna, direction }.
    var estado = {
      q: '',
      sort: [{ key: 'razao', direction: 'ascending' }],
      colFilters: {},
      page: 1,
      loading: true,
      selecionados: new Set(),
    };
    var linhasDaPagina = [];

    // id da coluna -> campo do registro (só a cidade ordena por outro campo)
    var CAMPO_ORDEM = { cidade: 'cidadeNome' };
    function ordenar(itens) {
      var criterios = estado.sort.length ? estado.sort : [{ key: 'id', direction: 'ascending' }];
      return itens.slice().sort(function (a, b) {
        for (var i = 0; i < criterios.length; i += 1) {
          var campo = CAMPO_ORDEM[criterios[i].key] || criterios[i].key;
          var x = a[campo];
          var y = b[campo];
          var dif =
            typeof x === 'number' && typeof y === 'number'
              ? x - y
              : String(x).localeCompare(String(y), 'pt-BR');
          if (dif !== 0) return criterios[i].direction === 'ascending' ? dif : -dif;
        }
        return 0;
      });
    }
    /** Texto pesquisável da coluna Fornecedor (o mesmo que a célula expõe em data-filter-value). */
    function textoFornecedor(f) {
      return (f.razao + ' ' + (f.tipo !== 'pf' ? f.fantasia || '' : '')).trim();
    }
    /** Filtros por coluna (popover do cabeçalho): mesmas regras do behavior, aplicadas a todos os dados. */
    function passaColunas(f) {
      var c = estado.colFilters;
      if (c.razao && norm(textoFornecedor(f)).indexOf(norm(String(c.razao).trim())) < 0)
        return false;
      if (c.categoria && c.categoria.length) {
        var alvo = norm(f.categoria);
        var achou = c.categoria.some(function (v) {
          return norm(v) === alvo;
        });
        if (!achou) return false;
      }
      if (c.limite) {
        if (c.limite.gte !== undefined && f.limite < Number(c.limite.gte)) return false;
        if (c.limite.lte !== undefined && f.limite > Number(c.limite.lte)) return false;
      }
      return true;
    }
    function filtrados() {
      var q = norm(estado.q.trim());
      return ordenar(
        lista.filter(function (f) {
          if (filtros.situacao && f.situacao !== filtros.situacao) return false;
          if (filtros.categoria && f.categoria !== filtros.categoria) return false;
          if (filtros.cidade && f.cidade !== filtros.cidade) return false;
          if (!passaColunas(f)) return false;
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

    /**
     * Ordem atual das colunas no cabeçalho (o usuário pode reordená-las pelo painel "Colunas"):
     * as linhas novas já nascem nessa ordem, que é a que o behavior espera.
     */
    function ordemColunas() {
      return Array.prototype.map.call(table.tHead.rows[0].cells, function (th) {
        return (
          th.getAttribute('data-eds-col') ||
          (th.classList.contains('eds-table-check') ? 'check' : 'acoes')
        );
      });
    }

    function linhaHtml(f) {
      var sit = D.situacoes[f.situacao];
      var nome = esc(f.razao);
      var celulas = {
        check:
          '<td class="eds-table-check"><label class="eds-check"><input type="checkbox" class="eds-checkbox" aria-label="Selecionar ' +
          nome +
          '" data-eds-select-row' +
          (estado.selecionados.has(f.id) ? ' checked' : '') +
          ' /></label></td>',
        id: '<td>' + f.id + '</td>',
        razao:
          '<th scope="row" class="eds-table-pin-start eds-table-pin-edge" data-filter-value="' +
          esc(textoFornecedor(f)) +
          '"><a href="fornecedor.html?id=' +
          f.id +
          '">' +
          nome +
          '</a>' +
          (f.tipo !== 'pf' && f.fantasia
            ? '<span class="cad-sub">' + esc(f.fantasia) + '</span>'
            : '') +
          '</th>',
        documento: '<td>' + esc(f.documento) + '</td>',
        categoria: '<td>' + esc(f.categoria) + '</td>',
        cidade: '<td>' + esc(f.cidadeNome) + '/' + f.uf + '</td>',
        situacao:
          '<td><span class="eds-badge eds-badge-' + sit.badge + '">' + sit.label + '</span></td>',
        limite:
          '<td class="eds-table-num" data-eds-editable data-eds-edit-field="limite" data-eds-edit-format="moeda" data-value="' +
          f.limite +
          '" data-sort-value="' +
          f.limite +
          '">' +
          BRL.format(f.limite) +
          '</td>',
        acoes:
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
          '</div></td>',
      };
      return (
        '<tr data-id="' +
        f.id +
        '" data-eds-row-id="' +
        f.id +
        '" data-eds-row-label="' +
        f.id +
        '">' +
        ordemColunas()
          .map(function (coluna) {
            return celulas[coluna];
          })
          .join('') +
        '</tr>'
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
      // A seleção vale só para as linhas desta página (a barra de lote conta as linhas marcadas na tabela).
      Array.from(estado.selecionados).forEach(function (id) {
        if (
          !linhasDaPagina.some(function (f) {
            return f.id === id;
          })
        )
          estado.selecionados.delete(id);
      });
      // O cabeçalho "selecionar todos" reflete as linhas desta página.
      table.dispatchEvent(
        new window.CustomEvent('eds:table-filter', {
          bubbles: true,
          detail: { query: '', count: linhasDaPagina.length },
        }),
      );
    }

    var controlador = function () {
      return window.EDS && window.EDS.table ? window.EDS.table(table) : null;
    };

    // ---- ordenação: o behavior pergunta (cancelável, com a ordenação completa) e quem ordena é este
    // código, sobre todos os dados. setState devolve ao cabeçalho o aria-sort e o número de prioridade.
    table.addEventListener('eds:table-sort', function (event) {
      event.preventDefault();
      estado.sort = event.detail.sort;
      estado.page = 1;
      var ctl = controlador();
      if (ctl) ctl.setState({ sort: estado.sort });
      desenhar();
      anunciar(
        event.detail.reason === 'clear'
          ? 'Ordenação removida.'
          : estado.sort.length > 1
            ? 'Ordenado por ' +
              estado.sort
                .map(function (c) {
                  return (
                    rotuloColuna(c.key) +
                    ', ' +
                    (c.direction === 'ascending' ? 'crescente' : 'decrescente')
                  );
                })
                .join(', depois ') +
              '.'
            : estado.sort.length === 1
              ? 'Ordenado por ' +
                rotuloColuna(estado.sort[0].key) +
                ', ' +
                (estado.sort[0].direction === 'ascending' ? 'crescente' : 'decrescente') +
                '.'
              : 'Ordenação removida.',
      );
    });
    function rotuloColuna(chave) {
      var botao = table.querySelector('thead th[data-eds-col="' + chave + '"] .eds-table-sort');
      if (!botao) return chave;
      var copia = botao.cloneNode(true);
      Array.prototype.forEach.call(
        copia.querySelectorAll('svg, .eds-table-sort-order, .eds-table-sort-text'),
        function (no) {
          no.remove();
        },
      );
      return copia.textContent.replace(/\s+/g, ' ').trim();
    }

    // ---- filtro por coluna: o behavior guarda o estado (chips, botão ativo); o app filtra todos os dados
    table.addEventListener('eds:table-column-filter', function (event) {
      event.preventDefault();
      estado.colFilters = event.detail.filters;
      estado.page = 1;
      desenhar();
      var n = filtrados().length;
      anunciar(
        n === 0
          ? 'Nenhum fornecedor com esses filtros.'
          : plural(n, 'resultado', 'resultados') + '.',
      );
    });

    // ---- colunas: ocultar uma coluna que estava na ordenação a tira dela (sem evento de ordenação)
    table.addEventListener('eds:table-columns-change', function () {
      var ctl = controlador();
      if (!ctl) return;
      var atual = ctl.getState().query.sort;
      if (JSON.stringify(atual) !== JSON.stringify(estado.sort)) {
        estado.sort = atual;
        desenhar();
      }
    });

    // ---- seleção: o behavior marca as linhas; aqui se guarda o conjunto da página
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
    });

    // ---- ações em lote: o evento traz os ids das linhas marcadas (tr[data-eds-row-id])
    table.addEventListener('eds:table-bulk-action', function (event) {
      var ids = event.detail.ids;
      if (!ids.length) return;
      if (event.detail.action === 'excluir') {
        excluir(ids);
        return;
      }
      if (event.detail.action === 'inativar') inativar(ids);
    });
    $('[data-eds-bulk-clear]').addEventListener('click', function () {
      anunciar('Seleção desfeita.');
    });
    function inativar(ids) {
      var n = 0;
      ids.forEach(function (id) {
        var f = achar(id);
        if (f && f.situacao !== 'inativo') {
          f.situacao = 'inativo';
          f.motivo = 'Inativado em lote (simulação).';
          n += 1;
        }
      });
      persistir();
      estado.selecionados.clear();
      desenhar();
      anunciar(plural(n, 'fornecedor inativado', 'fornecedores inativados') + '.');
      avisar({
        tone: 'success',
        message: plural(n, 'fornecedor inativado', 'fornecedores inativados') + ' (simulação).',
      });
    }

    // ---- edição na célula (limite de compra): o servidor é simulado (400 ms; recusa acima de R$ 1.000.000)
    table.addEventListener('eds:table-edit-commit', function (event) {
      var d = event.detail;
      var valor = d.number;
      var f = achar(d.rowId);
      if (!f) return;
      d.respondWith(
        new Promise(function (resolve, reject) {
          window.setTimeout(function () {
            if (valor === null || valor < 0) reject(new Error('Informe um valor em reais.'));
            else if (valor > 1000000) reject(new Error('O limite máximo é de R$ 1.000.000,00.'));
            else {
              f.limite = valor;
              persistir();
              resolve();
            }
          }, 400);
        }),
      );
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
        estado.colFilters = {};
        var ctl = controlador();
        if (ctl) ctl.setState({ filters: {} });
        estado.page = 1;
        desenhar();
        busca.focus();
      }
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
      estado.selecionados.clear();
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
  /** Etapas do cadastro a partir da situação: Recebido -> Em análise -> Aprovado (e Inativado). */
  function etapasSituacao(f) {
    var hist = f.historico || [];
    var criado = hist.length ? hist[hist.length - 1].data : f.contratoEm;
    var recente = hist.length ? hist[0].data : criado;
    var conferido = hist.filter(function (h) {
      return h.titulo === 'Documentos conferidos';
    })[0];
    var etapas = [
      { titulo: 'Recebido', texto: 'Cadastro registrado.', data: criado, estado: 'done' },
    ];
    if (f.situacao === 'pendente') {
      etapas.push({
        titulo: 'Em análise',
        texto: 'Conferindo os documentos.',
        data: '',
        estado: 'current',
      });
      etapas.push({
        titulo: 'Aprovado',
        texto: 'Aguardando a análise.',
        data: '',
        estado: 'upcoming',
      });
      return etapas;
    }
    etapas.push({
      titulo: 'Em análise',
      texto: 'Documentos conferidos.',
      data: conferido ? conferido.data : criado,
      estado: 'done',
    });
    etapas.push({
      titulo: 'Aprovado',
      texto: 'Fornecedor habilitado.',
      data: recente,
      estado: f.situacao === 'inativo' ? 'done' : 'current',
    });
    if (f.situacao === 'inativo') {
      etapas.push({
        titulo: 'Inativado',
        texto: f.motivo || 'Cadastro inativado.',
        data: recente,
        estado: 'current',
      });
    }
    return etapas;
  }

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
    $('#subtitulo').textContent = f.id + ' · ' + rotuloTipo(f.tipo);
    $('#editar').href = 'fornecedor-form.html?id=' + f.id;
    $('#acoes').hidden = false;
    $('#abas').hidden = false;
    $('#situacao-cadastro').hidden = false;

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
      item(rotuloDocumento(f.tipo), esc(f.documento)) +
      (f.tipo === 'est' ? item('País de origem', esc(f.pais || '')) : '') +
      item('Nome fantasia', f.tipo !== 'pf' ? esc(f.fantasia) : '') +
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

    $('#linha-situacao').innerHTML = etapasSituacao(f)
      .map(function (e) {
        var sufixo =
          e.estado === 'done'
            ? ' (concluída)'
            : e.estado === 'current'
              ? ' (etapa atual)'
              : ' (a fazer)';
        return (
          '<li class="eds-timeline-item" data-state="' +
          e.estado +
          '">' +
          '<span class="eds-timeline-marker" aria-hidden="true"></span>' +
          '<div class="eds-timeline-content"><div class="eds-timeline-header">' +
          '<span class="eds-timeline-title">' +
          esc(e.titulo) +
          '<span class="eds-visually-hidden">' +
          sufixo +
          '</span></span>' +
          (e.data
            ? '<time class="eds-timeline-time" datetime="' +
              e.data +
              '">' +
              dataBr(e.data) +
              '</time>'
            : '') +
          '</div><p class="eds-timeline-text">' +
          esc(e.texto) +
          '</p></div></li>'
        );
      })
      .join('');

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
  /** Código curto de uma categoria nova (três letras do nome; número se já existir). */
  function gerarCodigo(nome) {
    var base =
      norm(nome)
        .replace(/[^a-z]/g, '')
        .slice(0, 3)
        .toUpperCase() || 'CAT';
    var codigo = base;
    var n = 2;
    while (
      todasCategorias().some(function (c) {
        return c.code === codigo;
      })
    ) {
      codigo = base + n;
      n += 1;
    }
    return codigo;
  }

  function iniciarFormulario() {
    var form = $('#form-fornecedor');
    var id = new URLSearchParams(location.search).get('id');
    var editando = id ? achar(id) : null;

    if (id && !editando) {
      $('#titulo').textContent = 'Fornecedor não encontrado';
      $('#crumb-atual').textContent = 'Não encontrado';
      form.hidden = true;
      $('#secoes').hidden = true;
      $('#resumo-erros').innerHTML =
        '<div class="eds-alert eds-alert-warning"><div class="eds-alert-content"><p class="eds-alert-title"><span class="eds-visually-hidden">Atenção: </span>Fornecedor não encontrado</p>' +
        '<p>O código ' +
        esc(id) +
        ' não existe. <a href="index.html">Voltar para a lista</a></p></div></div>';
      return;
    }

    preencherOpcoes($('#f-uf'), ufs);
    // Lista do Lookup de categorias (código + descrição), lida pelo behavior ao ligar.
    $('script[data-eds-lookup-items]', form).textContent = JSON.stringify(todasCategorias());
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

    var rotulo = $('#salvar-rotulo');
    if (editando) {
      var e = editando;
      document.title = 'Editar ' + e.razao + ' · Cadastro';
      $('#titulo').textContent = 'Editar fornecedor';
      $('#crumb-atual').textContent = 'Editar';
      $('#cancelar').href = 'fornecedor.html?id=' + e.id;
      rotulo.textContent = 'Salvar alterações';
      valor('tipo', e.tipo);
      valor('cnpj', e.tipo === 'pj' ? e.documento : '');
      valor('cpf', e.tipo === 'pf' ? e.documento : '');
      valor('docEstrangeiro', e.tipo === 'est' ? e.documento : '');
      valor('pais', e.pais);
      valor('razao', e.razao);
      valor('fantasia', e.fantasia);
      var cat = todasCategorias().filter(function (c) {
        return c.description === e.categoria;
      })[0];
      valor('categoria', cat ? cat.code : '');
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

    // ---- validação: declarativa (required, data-eds-validate) e visível (p.eds-error + resumo no topo),
    // feita pelo @efds-ui/behavior. Aqui só ficam o envio simulado e as regras do exemplo.

    /** Grava o registro e devolve-o (a "base de dados" é o localStorage). */
    function salvar() {
      var fd = new window.FormData(form);
      var get = function (n) {
        return String(fd.get(n) || '').trim();
      };
      var tipo = get('tipo');
      var cidade = cidadePorValor(get('cidade'));
      var categoria = todasCategorias().filter(function (c) {
        return c.code.toLowerCase() === get('categoria').toLowerCase();
      })[0];
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
        pais: tipo === 'est' ? get('pais') : '',
        razao: get('razao'),
        fantasia: tipo !== 'pf' ? get('fantasia') : '',
        documento: tipo === 'pj' ? get('cnpj') : tipo === 'pf' ? get('cpf') : get('docEstrangeiro'),
        categoria: categoria ? categoria.description : get('categoria'),
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
      guardarAviso({
        tone: 'success',
        message: 'Fornecedor ' + registro.razao + ' salvo (simulação).',
      });
      return registro;
    }

    // ---- envio: o botão mostra "Salvando…" (aria-busy), o duplo envio é bloqueado e o resultado vira
    // "Salvo". O servidor é simulado (900 ms); depois a página do fornecedor abre e mostra o aviso.
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var original = rotulo.textContent;
      rotulo.textContent = 'Salvando…';
      var restaurar = function () {
        rotulo.textContent = original;
      };
      form.addEventListener('eds:form-success', restaurar, { once: true });
      form.addEventListener('eds:form-error', restaurar, { once: true });
      var envio = new Promise(function (resolve) {
        window.setTimeout(function () {
          resolve(salvar());
        }, 900);
      });
      window.EDS.submit(form)
        .track(envio)
        .then(function (registro) {
          // O botão fica um instante em "Salvo" antes de a página trocar.
          window.setTimeout(function () {
            if (window.EDS.markClean) window.EDS.markClean(form);
            location.href = 'fornecedor.html?id=' + registro.id;
          }, 700);
        })
        .catch(function () {
          // O behavior já mostrou o erro no botão.
        });
    });

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

    // ---- Lookup com `required`: o aviso de "campo obrigatório" é do formulário e o Lookup não o
    // recolhe sozinho ao escolher; aqui ele sai assim que há um código.
    form.addEventListener('eds:lookup-change', function (event) {
      if (!event.detail.code) return;
      var campo = event.target.querySelector('input');
      var aviso = document.getElementById(campo.id + '-err');
      if (aviso && campo.validity.valid) {
        campo.removeAttribute('aria-invalid');
        campo.setAttribute(
          'aria-describedby',
          (campo.getAttribute('aria-describedby') || '')
            .split(/\s+/)
            .filter(function (id) {
              return id && id !== aviso.id;
            })
            .join(' '),
        );
        aviso.remove();
      }
    });

    // ---- "Cadastrar novo…" no Lookup de categorias: aqui, um diálogo pergunta o nome (em produção,
    // abra o seu cadastro) e o resultado volta ao campo por EDS.lookup(el).setValue.
    form.addEventListener('eds:lookup-create', function (event) {
      event.preventDefault();
      var lookup = event.target.closest('[data-eds-lookup]');
      window.EDS.prompt(
        'Nome da nova categoria. Ela fica disponível nos próximos cadastros (simulação).',
        event.detail.text,
        'Cadastrar categoria',
        { okText: 'Cadastrar' },
      ).then(function (nome) {
        var texto = (nome || '').trim();
        var campo = lookup.querySelector('input');
        if (!texto) {
          campo.focus();
          return;
        }
        var existente = todasCategorias().filter(function (c) {
          return norm(c.description) === norm(texto);
        })[0];
        var item = existente || { code: gerarCodigo(texto), description: texto };
        if (!existente) {
          guardarCategoria(item);
          avisar({
            tone: 'success',
            message: 'Categoria ' + item.description + ' cadastrada (simulação).',
          });
        }
        window.EDS.lookup(lookup).setValue(item);
      });
    });
  }

  // ---------------------------------------------------------------- partida
  var pagina = document.body.getAttribute('data-page');
  if (pagina === 'lista') iniciarLista();
  else if (pagina === 'detalhe') iniciarDetalhe();
  else if (pagina === 'form') iniciarFormulario();
  window.addEventListener('load', mostrarAviso);
})();
