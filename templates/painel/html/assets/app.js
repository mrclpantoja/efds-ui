/*
 * Painel administrativo (HTML) — só o que o @efds-ui/behavior não faz:
 * aparência e preferências guardadas neste navegador, tempo de sessão escolhido, validação dos
 * formulários de exemplo com mensagem visível e o foco na caixa de notificações filtrada.
 * Carregado no <head> sem defer: a aparência vale antes do primeiro desenho (sem piscar o tema).
 */
(function () {
  'use strict';

  var CHAVE_APARENCIA = 'painel-aparencia';
  var CHAVE_PREFERENCIAS = 'painel-preferencias';
  var APARENCIA = { theme: 'blue', mode: 'light', density: 'comfortable', shape: 'soft' };
  var PREFERENCIAS = { emailNotificacoes: true, resumoSemanal: false, sons: false, sessao: 30 };
  var html = document.documentElement;

  function ler(chave, padrao) {
    var resultado = Object.assign({}, padrao);
    try {
      var salvo = JSON.parse(localStorage.getItem(chave) || '{}');
      Object.keys(padrao).forEach(function (k) {
        if (typeof salvo[k] === typeof padrao[k]) resultado[k] = salvo[k];
      });
    } catch {
      // Sem armazenamento (janela privada, bloqueio): ficam os padrões.
    }
    return resultado;
  }

  function gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      // Sem armazenamento: a escolha vale só nesta página.
    }
  }

  function aplicarAparencia(a) {
    Object.keys(a).forEach(function (eixo) {
      html.setAttribute('data-' + eixo, a[eixo]);
    });
    gravar(CHAVE_APARENCIA, a);
  }

  /** O behavior lê data-eds-session-timeout ao iniciar (auto-init do behavior). */
  function marcarSessao(minutos) {
    if (minutos > 0) {
      html.setAttribute('data-eds-session-timeout', String(minutos * 60));
      html.setAttribute('data-eds-session-warn', '60');
    } else {
      html.removeAttribute('data-eds-session-timeout');
      html.removeAttribute('data-eds-session-warn');
    }
  }

  function avisar(variant, message) {
    if (window.EDS) window.EDS.toast({ variant: variant, message: message });
  }

  aplicarAparencia(ler(CHAVE_APARENCIA, APARENCIA));
  marcarSessao(ler(CHAVE_PREFERENCIAS, PREFERENCIAS).sessao);

  // ---------- Validação com mensagem visível (p.eds-error), sem o balão nativo ----------
  function mensagem(campo) {
    var v = campo.validity;
    if (v.valueMissing) return 'Preencha este campo.';
    if (v.typeMismatch && campo.type === 'email')
      return 'Informe um e-mail válido, como nome@exemplo.com.br.';
    if (v.tooShort) return 'Use ao menos ' + campo.minLength + ' caracteres.';
    return campo.validationMessage;
  }

  function mostrarErro(campo, texto) {
    var erro = document.getElementById(campo.id + '-erro');
    if (!erro) return;
    var ids = (campo.getAttribute('aria-describedby') || '').split(' ').filter(function (id) {
      return id && id !== erro.id;
    });
    if (texto) {
      erro.textContent = texto;
      erro.hidden = false;
      campo.setAttribute('aria-invalid', 'true');
      ids.unshift(erro.id);
    } else {
      erro.textContent = '';
      erro.hidden = true;
      campo.removeAttribute('aria-invalid');
    }
    if (ids.length) campo.setAttribute('aria-describedby', ids.join(' '));
    else campo.removeAttribute('aria-describedby');
  }

  function validar(form) {
    var primeiro = null;
    Array.prototype.forEach.call(form.elements, function (campo) {
      if (!campo.name || !campo.id || !campo.validity) return;
      var texto = campo.validity.valid ? '' : mensagem(campo);
      if (!texto && form.hasAttribute('data-pn-senha') && campo.name === 'confirmacao') {
        if (campo.value !== form.elements.nova.value)
          texto = 'A confirmação não confere com a nova senha.';
      }
      mostrarErro(campo, texto);
      if (texto && !primeiro) primeiro = campo;
    });
    if (primeiro) primeiro.focus();
    return !primeiro;
  }

  // ---------- Caixa de notificações: o item lido pode sair do filtro (CSS :has) ----------
  function oculto(el) {
    return el.offsetParent === null;
  }

  function manterFoco(caixa, item) {
    var ativo = document.activeElement;
    if (ativo && ativo !== document.body && !ativo.disabled && !oculto(ativo)) return;
    var proximo = item ? item.nextElementSibling : null;
    while (proximo && oculto(proximo)) proximo = proximo.nextElementSibling;
    var alvo = proximo ? proximo.querySelector('button') : caixa.querySelector('.eds-card-title');
    if (alvo && !proximo) alvo.tabIndex = -1;
    if (alvo) alvo.focus();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var aparencia = document.querySelector('[data-pn-aparencia]');
    if (aparencia) {
      var preencher = function (a) {
        Object.keys(a).forEach(function (eixo) {
          var campo = aparencia.elements[eixo];
          if (campo) campo.value = a[eixo];
        });
      };
      preencher(ler(CHAVE_APARENCIA, APARENCIA));
      aparencia.addEventListener('change', function () {
        var a = {};
        Object.keys(APARENCIA).forEach(function (eixo) {
          a[eixo] = aparencia.elements[eixo].value;
        });
        aplicarAparencia(a);
      });
      aparencia.addEventListener('reset', function (event) {
        event.preventDefault();
        preencher(APARENCIA);
        aplicarAparencia(APARENCIA);
      });
    }

    var preferencias = document.querySelector('[data-pn-preferencias]');
    if (preferencias) {
      var p = ler(CHAVE_PREFERENCIAS, PREFERENCIAS);
      ['emailNotificacoes', 'resumoSemanal', 'sons'].forEach(function (nome) {
        preferencias.elements[nome].checked = p[nome];
      });
      preferencias.addEventListener('submit', function (event) {
        event.preventDefault();
        var dados = new FormData(preferencias);
        var atual = ler(CHAVE_PREFERENCIAS, PREFERENCIAS);
        ['emailNotificacoes', 'resumoSemanal', 'sons'].forEach(function (nome) {
          atual[nome] = dados.has(nome);
        });
        gravar(CHAVE_PREFERENCIAS, atual);
        avisar('success', 'Preferências salvas.');
      });
    }

    var sessao = document.querySelector('[data-pn-sessao]');
    if (sessao) {
      sessao.elements.sessao.value = String(ler(CHAVE_PREFERENCIAS, PREFERENCIAS).sessao);
      sessao.addEventListener('submit', function (event) {
        event.preventDefault();
        var minutos = Number(sessao.elements.sessao.value);
        var atual = ler(CHAVE_PREFERENCIAS, PREFERENCIAS);
        atual.sessao = minutos;
        gravar(CHAVE_PREFERENCIAS, atual);
        marcarSessao(minutos);
        if (window.EDS) {
          // EDS.session substitui o controle ativo; "Nunca" cria um e o encerra em seguida.
          var controle = window.EDS.session({ timeout: Math.max(minutos, 1) * 60, warnBefore: 60 });
          if (minutos === 0) controle.destroy();
        }
        avisar('success', 'Tempo de sessão atualizado.');
      });
    }

    Array.prototype.forEach.call(
      document.querySelectorAll('form[data-pn-validar]'),
      function (form) {
        form.addEventListener('submit', function (event) {
          event.preventDefault();
          if (!validar(form)) return;
          // Num sistema real, aqui vai o envio ao servidor.
          if (form.hasAttribute('data-pn-senha')) form.reset();
          avisar('success', form.getAttribute('data-pn-sucesso') || 'Salvo.');
        });
      },
    );

    var caixa = document.querySelector('.pn-inbox');
    if (caixa) {
      caixa.addEventListener('eds:notifications-read', function (event) {
        var item = event.target.querySelector('[data-id="' + event.detail.id + '"]');
        manterFoco(caixa, item);
      });
      caixa.addEventListener('eds:notifications-read-all', function () {
        manterFoco(caixa, null);
      });
    }

    html.addEventListener('eds:session-expire', function () {
      // Num sistema real, use data-eds-session-logout-url para levar à tela de entrada.
      avisar(
        'warning',
        'Sessão encerrada por inatividade. Num sistema real, você voltaria à tela de entrada.',
      );
    });
  });
})();
