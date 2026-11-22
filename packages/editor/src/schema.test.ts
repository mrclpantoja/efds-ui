import { describe, expect, it } from 'vitest';
import { safeHref } from './url';
import { sanitizeHtml } from './html';
import { prepareClipboardHtml } from './paste';

describe('sanitizeHtml', () => {
  it('mantém o que o esquema conhece', () => {
    const html =
      '<h2>Título</h2><p>Texto <strong>forte</strong>, <em>itálico</em>, <u>sub</u> e <s>riscado</s>.</p>' +
      '<ul><li>um</li><li>dois<ul><li>filho</li></ul></li></ul><ol><li>a</li></ol>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('remove scripts, estilos, atributos on* e style', () => {
    const out = sanitizeHtml(
      '<p onclick="x()" style="color:red">Oi<script>alert(1)</script><style>p{}</style></p><img src=x onerror=alert(1)><iframe src="a"></iframe>',
    );
    expect(out).toBe('<p>Oi</p>');
    expect(out).not.toMatch(/script|style|onclick|onerror|iframe|img/i);
  });

  it('descarta links javascript:, data: e vbscript: mas mantém o texto', () => {
    expect(sanitizeHtml('<p><a href="javascript:alert(1)">x</a></p>')).toBe('<p>x</p>');
    expect(sanitizeHtml('<p><a href=" JaVa\tScript:alert(1)">x</a></p>')).toBe('<p>x</p>');
    expect(sanitizeHtml('<p><a href="data:text/html,a">x</a></p>')).toBe('<p>x</p>');
  });

  it('mantém links http, mailto, tel e relativos; target=_blank ganha rel', () => {
    expect(sanitizeHtml('<p><a href="https://exemplo.test/a">a</a></p>')).toBe(
      '<p><a href="https://exemplo.test/a">a</a></p>',
    );
    expect(sanitizeHtml('<p><a href="/rel">a</a><a href="mailto:a@b.test">b</a></p>')).toContain(
      'href="mailto:a@b.test"',
    );
    expect(sanitizeHtml('<p><a href="https://x.test" target="_blank">a</a></p>')).toBe(
      '<p><a href="https://x.test" target="_blank" rel="noopener noreferrer">a</a></p>',
    );
  });

  it('alinhamento e fonte saem por classe, nunca por style', () => {
    expect(sanitizeHtml('<p style="text-align:center">a</p>')).toBe(
      '<p class="eds-prose-align-center">a</p>',
    );
    expect(sanitizeHtml('<h3 align="right">t</h3>')).toBe(
      '<h3 class="eds-prose-align-right">t</h3>',
    );
    expect(
      sanitizeHtml(
        '<p><span class="eds-prose-font-serif">s</span> <span style="font-family:Consolas">m</span></p>',
      ),
    ).toBe(
      '<p><span class="eds-prose-font-serif">s</span> <span class="eds-prose-font-mono">m</span></p>',
    );
  });

  it('h1 vira título 2, h5 e h6 viram título 4', () => {
    expect(sanitizeHtml('<h1>a</h1><h5>b</h5>')).toBe('<h2>a</h2><h4>b</h4>');
  });

  it('tabela: cabeçalho vai para thead e mesclagem é ignorada', () => {
    const out = sanitizeHtml(
      '<table><tr><th colspan="2">A</th><th>B</th></tr><tr><td rowspan="2">1</td><td>2</td></tr></table>',
    );
    expect(out).toBe(
      '<table><thead><tr><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    );
    // A leitura de volta reconstrói a mesma estrutura.
    expect(sanitizeHtml(out)).toBe(out);
  });

  it('th lido com ou sem scope sai sempre com scope="col" na linha de cabeçalho', () => {
    const a = sanitizeHtml(
      '<table><thead><tr><th scope="col">A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
    );
    const b = sanitizeHtml('<table><tr><th>A</th></tr><tr><td>1</td></tr></table>');
    expect(a).toBe(b);
    expect(a).toContain('<th scope="col">A</th>');
  });

  it('colar do Word: parágrafos de lista viram listas', () => {
    const word =
      '<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">·<span>&nbsp;</span></span>Item um</p>' +
      '<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">·</span>Item dois</p>' +
      '<p class="MsoNormal">Fim</p>';
    expect(sanitizeHtml(prepareClipboardHtml(word))).toBe(
      '<ul><li>Item um</li><li>Item dois</li></ul><p>Fim</p>',
    );
  });

  it('documento vazio vira texto vazio', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml('<p></p>')).toBe('');
  });
});

describe('safeHref', () => {
  it.each([
    ['https://a.test', true],
    ['http://a.test', true],
    ['mailto:a@b.test', true],
    ['tel:+5551999999999', true],
    ['/caminho', true],
    ['../x', true],
    ['#ancora', true],
    ['pagina.html', true],
    ['javascript:alert(1)', false],
    ['  JAVASCRIPT:alert(1)', false],
    ['java\nscript:alert(1)', false],
    ['data:text/html;base64,AAA', false],
    ['vbscript:x', false],
    ['', false],
  ])('%s', (href, ok) => {
    expect(safeHref(href) !== null).toBe(ok);
  });
});
