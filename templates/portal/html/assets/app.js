/*
 * Portal de serviços: o JavaScript próprio do template.
 * O comportamento dos componentes (Drawer, Banner, Wizard, máscara, envio de arquivos) vem do
 * @efds-ui/behavior, ligado por atributos data-eds-*. Aqui ficam só as preferências de leitura,
 * o filtro da carta de serviços e a simulação de protocolo (dados fictícios em demo-data.js).
 */
(function () {
  'use strict';

  var KEY_MODE = 'portal:modo';
  var KEY_TEXT = 'portal:texto';
  var KEY_PROTOCOLS = 'portal:protocolos';
  var TEXT_SIZES = { padrao: null, grande: 'lg', maior: 'xl' };

  var root = document.documentElement;

  function read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* sem armazenamento: a preferência vale só nesta página */
    }
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function normalize(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  /* ---------------------------------------------------------------- Preferências de leitura */
  function initPreferences() {
    var savedMode = read(KEY_MODE);
    var dark =
      savedMode === 'dark' ||
      (savedMode === null &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-mode', dark ? 'dark' : 'light');

    var savedText = read(KEY_TEXT);
    if (!savedText || !(savedText in TEXT_SIZES)) savedText = 'padrao';
    applyTextSize(savedText);

    var toggle = $('[data-portal-dark]');
    if (toggle) {
      toggle.checked = dark;
      toggle.addEventListener('change', function () {
        var mode = toggle.checked ? 'dark' : 'light';
        root.setAttribute('data-mode', mode);
        write(KEY_MODE, mode);
      });
    }

    $$('[data-portal-text-size] input[type="radio"]').forEach(function (radio) {
      radio.checked = radio.value === savedText;
      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        applyTextSize(radio.value);
        write(KEY_TEXT, radio.value);
      });
    });
  }

  function applyTextSize(name) {
    var size = TEXT_SIZES[name];
    if (size) root.setAttribute('data-text-size', size);
    else root.removeAttribute('data-text-size');
  }

  /* ---------------------------------------------------------------- Carta de serviços */
  function initCarta() {
    var form = $('#filtro-carta');
    if (!form) return;
    var search = $('#filtro-busca');
    var select = $('#filtro-categoria');
    var status = $('#filtro-status');
    var empty = $('#filtro-vazio');
    var items = $$('[data-service]');
    var sections = $$('[data-category]');

    function searchText(item) {
      return $$('summary, .eds-accordion-panel p', item)
        .map(function (node) {
          return node.textContent;
        })
        .join(' ');
    }

    function apply() {
      var term = normalize(search.value);
      var cat = select.value;
      var total = 0;
      items.forEach(function (item) {
        var matches =
          (!cat || item.getAttribute('data-cat') === cat) &&
          (!term || normalize(searchText(item)).indexOf(term) !== -1);
        item.hidden = !matches;
        if (matches) total += 1;
      });
      sections.forEach(function (section) {
        var visible = $$('[data-service]:not([hidden])', section).length;
        section.hidden = visible === 0;
        var count = $('[data-count]', section);
        if (count) count.textContent = String(visible);
      });
      empty.hidden = total !== 0;
      status.textContent =
        total === 0
          ? 'Nenhum serviço encontrado.'
          : total === 1
            ? '1 serviço encontrado.'
            : total + ' serviços encontrados.';
    }

    var query = params();
    if (query.get('busca')) search.value = query.get('busca');
    var wanted = query.get('categoria');
    if (wanted && $('option[value="' + wanted + '"]', select)) select.value = wanted;

    search.addEventListener('input', apply);
    select.addEventListener('change', apply);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      apply();
    });
    form.addEventListener('reset', function () {
      window.setTimeout(apply, 0);
    });
    var clear = $('[data-portal-clear]');
    if (clear) {
      clear.addEventListener('click', function () {
        form.reset();
        search.focus();
      });
    }
    apply();
  }

  /* ---------------------------------------------------------------- Solicitação */
  function storedProtocols() {
    try {
      var list = JSON.parse(read(KEY_PROTOCOLS) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function newProtocolNumber() {
    function digits(n) {
      var out = '';
      for (var i = 0; i < n; i += 1) out += Math.floor(Math.random() * 10);
      return out;
    }
    return digits(7) + '-' + digits(2) + '.2026.1.01.0001';
  }

  function initSolicitacao() {
    var form = $('#form-solicitacao');
    if (!form) return;

    var wanted = params().get('servico');
    var select = $('#servico');
    if (wanted && $('option[value="' + wanted + '"]', select)) select.value = wanted;

    var CHANNELS = { presencial: 'Presencial', online: 'On-line', retirada: 'Retirada' };

    function fillReview() {
      var data = new FormData(form);
      var option = select.options[select.selectedIndex];
      var files = $('#anexos').files;
      var names = [];
      for (var i = 0; i < files.length; i += 1) names.push(files[i].name);
      var values = {
        servico: option && option.value ? option.textContent : '',
        nome: data.get('nome'),
        cpf: data.get('cpf'),
        email: data.get('email'),
        telefone: data.get('telefone'),
        cep: data.get('cep'),
        titulo: data.get('titulo'),
        canal: CHANNELS[data.get('canal')] || '',
        contato: data.get('contato'),
        detalhes: data.get('detalhes'),
        anexos: names.join(', '),
      };
      $$('[data-review]').forEach(function (cell) {
        var value = values[cell.getAttribute('data-review')];
        cell.textContent = '';
        if (value) {
          cell.textContent = String(value);
        } else {
          var dash = document.createElement('span');
          dash.className = 'eds-description-empty';
          dash.setAttribute('aria-hidden', 'true');
          dash.textContent = '—';
          var hidden = document.createElement('span');
          hidden.className = 'eds-visually-hidden';
          hidden.textContent = 'não informado';
          cell.append(dash, hidden);
        }
      });
    }

    form.addEventListener('eds:wizard-change', function (event) {
      if (event.detail && event.detail.to === event.detail.total - 1) fillReview();
    });

    /*
     * Envio: aqui só simulamos. O formulário usa data-eds-submit="manual": EDS.submit(form).track(...)
     * mostra o botão ocupado (círculo de espera), avisa "Enviando…" e ignora um segundo envio até o
     * "servidor" responder (900 ms fictícios). Num sistema real, troque a promessa por um fetch
     * (ou use data-eds-submit="fetch" e remova este ouvinte).
     */
    var finish = $('[data-eds-wizard-finish]', form);
    var finishLabel = finish.textContent;

    function save() {
      var number = newProtocolNumber();
      var option = select.options[select.selectedIndex];
      var list = storedProtocols();
      list.push({
        number: number,
        service: option ? option.textContent : '',
        opened: new Date().toLocaleDateString('pt-BR'),
      });
      write(KEY_PROTOCOLS, JSON.stringify(list));
      return number;
    }

    function confirm(number) {
      form.hidden = true;
      var confirmation = $('#confirmacao');
      $('#protocolo-numero').textContent = number;
      $('#confirmacao-acompanhar').setAttribute(
        'href',
        'consultar-protocolo.html?protocolo=' + encodeURIComponent(number),
      );
      confirmation.hidden = false;
      $('#confirmacao-t').focus();
      window.scrollTo(0, 0);
    }

    form.addEventListener('submit', function (event) {
      if (event.defaultPrevented) return;
      event.preventDefault();
      if (window.EDS.submit(form).state === 'busy') return;
      finish.textContent = 'Enviando…';
      var request = new Promise(function (resolve) {
        window.setTimeout(function () {
          resolve(save());
        }, 900);
      });
      window.EDS.submit(form)
        .track(request)
        .then(confirm, function () {
          finish.textContent = finishLabel;
        });
    });
  }

  /* ---------------------------------------------------------------- Consultar protocolo */
  function initProtocolo() {
    var form = $('#form-protocolo');
    if (!form) return;
    var input = $('#protocolo');
    var error = $('#protocolo-erro');
    var button = $('#protocolo-enviar');
    var result = $('#resultado');
    var demo = window.PORTAL_DEMO || { protocols: [], failingProtocol: '' };
    var failedOnce = false;
    var timer = 0;

    function setError(message) {
      error.hidden = !message;
      error.textContent = message || '';
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }

    function find(number) {
      var all = demo.protocols.concat(
        storedProtocols().map(function (item) {
          return {
            number: item.number,
            service: item.service,
            opened: item.opened,
            status: ['info', 'Recebida'],
            forecast: null,
            events: [
              {
                id: 'e1',
                title: 'Solicitação recebida',
                dateTime: new Date().toISOString().slice(0, 16),
                time: item.opened,
              },
            ],
          };
        }),
      );
      for (var i = 0; i < all.length; i += 1) if (all[i].number === number) return all[i];
      return null;
    }

    function show(templateId) {
      var fragment = document.getElementById(templateId).content.cloneNode(true);
      result.textContent = '';
      result.appendChild(fragment);
      return result;
    }

    function focusTitle() {
      var title = $('#resultado-titulo', result);
      if (title) title.focus();
    }

    function text(scope, name, value) {
      $('[data-f="' + name + '"]', scope).textContent = value;
    }

    var STATE_TEXT = { done: 'concluída', current: 'em curso', upcoming: 'a fazer' };

    /* Andamento em ordem cronológica: as etapas registradas e, se o pedido não terminou, a resposta final. */
    function progressItems(record) {
      var finished = record.status[0] === 'success';
      var events = record.events.slice().reverse();
      var items = events.map(function (event, index) {
        return {
          state: finished || index < events.length - 1 ? 'done' : 'current',
          title: event.title,
          time: event.time,
          dateTime: event.dateTime,
          text: event.text,
        };
      });
      if (!finished) {
        items.push({
          state: 'upcoming',
          title: 'Resposta final',
          text: record.forecast
            ? 'Previsão: ' + record.forecast
            : record.status[0] === 'warning'
              ? 'Depende de resolver a pendência.'
              : 'Ainda sem previsão.',
        });
      }
      return items;
    }

    function render(record) {
      var scope = show('tpl-encontrado');
      text(scope, 'numero', record.number);
      text(scope, 'servico', record.service);
      text(scope, 'aberto', record.opened);
      var forecast = $('[data-f="previsao"]', scope);
      if (record.forecast) {
        forecast.textContent = record.forecast;
      } else {
        var dash = document.createElement('span');
        dash.className = 'eds-description-empty';
        dash.setAttribute('aria-hidden', 'true');
        dash.textContent = '—';
        var hidden = document.createElement('span');
        hidden.className = 'eds-visually-hidden';
        hidden.textContent = 'não informado';
        forecast.append(dash, hidden);
      }
      var badge = $('[data-f="situacao"]', scope);
      badge.classList.add('eds-badge-' + record.status[0]);
      badge.textContent = record.status[1];
      var list = $('[data-f="andamento"]', scope);
      list.setAttribute('aria-label', 'Andamento do protocolo ' + record.number);
      progressItems(record).forEach(function (event) {
        var item = document.createElement('li');
        item.className = 'eds-timeline-item';
        item.setAttribute('data-state', event.state);
        var marker = document.createElement('span');
        marker.className = 'eds-timeline-marker';
        marker.setAttribute('aria-hidden', 'true');
        var content = document.createElement('div');
        content.className = 'eds-timeline-content';
        var header = document.createElement('div');
        header.className = 'eds-timeline-header';
        var title = document.createElement('span');
        title.className = 'eds-timeline-title';
        title.textContent = event.title;
        var hidden = document.createElement('span');
        hidden.className = 'eds-visually-hidden';
        hidden.textContent = ' (' + STATE_TEXT[event.state] + ')';
        title.appendChild(hidden);
        header.appendChild(title);
        if (event.time) {
          var time = document.createElement('time');
          time.className = 'eds-timeline-time';
          time.setAttribute('datetime', event.dateTime);
          time.textContent = event.time;
          header.appendChild(time);
        }
        content.appendChild(header);
        if (event.text) {
          var body = document.createElement('p');
          body.className = 'eds-timeline-text';
          body.textContent = event.text;
          content.appendChild(body);
        }
        item.append(marker, content);
        list.appendChild(item);
      });
      focusTitle();
    }

    function search(number) {
      window.clearTimeout(timer);
      button.setAttribute('aria-busy', 'true');
      result.textContent = 'Consultando o protocolo…';
      timer = window.setTimeout(function () {
        button.removeAttribute('aria-busy');
        if (number === demo.failingProtocol && !failedOnce) {
          failedOnce = true;
          show('tpl-erro');
          $('[data-portal-retry]', result).addEventListener('click', function () {
            search(number);
          });
          focusTitle();
          return;
        }
        var record = find(number);
        if (record) {
          render(record);
        } else {
          show('tpl-nao-encontrado');
          focusTitle();
        }
      }, 500);
    }

    function submit() {
      var digits = input.value.replace(/\D/g, '');
      if (digits.length !== 20) {
        setError('Informe os 20 números do protocolo.');
        result.textContent = '';
        input.focus();
        return;
      }
      setError('');
      search(input.value);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (button.getAttribute('aria-busy') === 'true') return;
      submit();
    });
    input.addEventListener('input', function () {
      if (!error.hidden) setError('');
    });

    var initial = params().get('protocolo');
    if (initial) {
      input.value = initial;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      submit();
    }
  }

  function init() {
    initPreferences();
    initCarta();
    initSolicitacao();
    initProtocolo();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
