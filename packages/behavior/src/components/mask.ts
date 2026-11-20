import { emit } from '../core/dom';
import { createMask, type MaskOptions } from '../core/mask';
import { bindAll, type Behavior } from '../core/registry';

/**
 * Máscara de entrada: `input[data-eds-mask]` com o nome de uma máscara pronta (`telefone`, `cpf`,
 * `cnpj`, `cpf-cnpj`, `cep`, `moeda`, `numero`) ou um padrão (`0` dígito, `A` letra, `*` letra ou
 * dígito; o resto é literal). Opções: `data-eds-mask-decimals`, `-prefix`, `-negative`. Com
 * `data-eds-mask-unmask`, o campo visível perde o `name` e um hidden com o mesmo `name` leva só os
 * caracteres significativos (na moeda, `1234.56`).
 *
 * O valor do campo é sempre o texto mascarado; o cursor é preservado ao digitar, apagar e colar.
 * Sem anúncio por tecla e sem validação: `required`/`pattern`/servidor continuam valendo.
 * Evento `eds:mask-change` (`{ value, raw }`) a cada alteração. Atributos que o autor já definiu
 * (`inputmode`, `autocomplete`, `maxlength`) nunca são trocados.
 */
export const maskBehavior: Behavior = {
  name: 'mask',
  selector: 'input[data-eds-mask]',
  bind(el) {
    if (!(el instanceof HTMLInputElement)) return;
    const input = el;
    const spec = input.getAttribute('data-eds-mask')?.trim() ?? '';
    if (spec === '') return;

    const options: MaskOptions = {};
    const decimals = input.getAttribute('data-eds-mask-decimals');
    if (decimals !== null && decimals.trim() !== '') options.decimals = Number(decimals);
    const prefix = input.getAttribute('data-eds-mask-prefix');
    if (prefix !== null) options.prefix = prefix;
    const negative = input.getAttribute('data-eds-mask-negative');
    if (negative !== null && negative !== 'false') options.negative = true;
    const mask = createMask(spec, options);

    const ac = new AbortController();
    const { signal } = ac;
    const added: string[] = [];
    const setDefault = (name: string, value: string | undefined) => {
      if (value === undefined || input.hasAttribute(name)) return;
      input.setAttribute(name, value);
      added.push(name);
    };
    setDefault('inputmode', mask.inputMode);
    setDefault('autocomplete', mask.autocomplete);
    setDefault('maxlength', mask.maxLength === undefined ? undefined : String(mask.maxLength));

    // Valor limpo para o servidor: o campo visível deixa de ser enviado e um hidden o substitui.
    const name = input.getAttribute('name');
    let hidden: HTMLInputElement | null = null;
    let observer: MutationObserver | null = null;
    if (input.hasAttribute('data-eds-mask-unmask') && name) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = name;
      hidden.setAttribute('data-eds-mask-raw', '');
      const form = input.getAttribute('form');
      if (form) hidden.setAttribute('form', form);
      hidden.disabled = input.disabled;
      input.removeAttribute('name');
      input.after(hidden);
      observer = new MutationObserver(() => {
        if (hidden) hidden.disabled = input.disabled;
      });
      observer.observe(input, { attributes: true, attributeFilter: ['disabled'] });
    }

    let last = '';
    let internal = false;
    const sync = () => {
      if (hidden) hidden.value = mask.unmask(input.value);
    };
    const write = (value: string, caret: number | null) => {
      if (input.value !== value) input.value = value;
      if (caret !== null && document.activeElement === input) input.setSelectionRange(caret, caret);
      last = value;
      sync();
    };
    const changed = () =>
      emit(input, 'mask-change', { value: input.value, raw: mask.unmask(input.value) });

    // Valor inicial (do servidor): pode vir sem máscara.
    if (input.value !== '') write(mask.format(input.value), null);
    last = input.value;
    sync();

    input.addEventListener(
      'input',
      (event) => {
        if (internal || (event as InputEvent).isComposing) return;
        const result = mask.edit({
          text: input.value,
          caret: input.selectionStart ?? input.value.length,
          prev: last,
          inputType: (event as InputEvent).inputType,
        });
        write(result.value, result.caret);
        changed();
      },
      { signal },
    );

    // Colar nunca é bloqueado: o texto entra (com ou sem máscara) e o campo é reescrito aqui,
    // sem passar pelo corte do `maxlength`, que cortaria o texto colado antes da máscara.
    input.addEventListener(
      'paste',
      (event) => {
        if (event.defaultPrevented || input.readOnly || input.disabled) return;
        const text = event.clipboardData?.getData('text');
        if (text === undefined || text === '') return;
        event.preventDefault();
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const result = mask.paste(input.value, start, end, text);
        write(result.value, result.caret);
        // Quem escuta `input` (frameworks, validação) precisa ver a mudança.
        internal = true;
        input.dispatchEvent(
          new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }),
        );
        internal = false;
        changed();
      },
      { signal },
    );

    // Valor posto por script (`input.value = ...`) ou pelo preenchimento automático: ao sair do
    // campo e ao enviar o formulário o texto é refeito e o hidden atualizado.
    const normalize = () => {
      if (input.value === '') {
        last = '';
        sync();
        return;
      }
      const value = mask.format(input.value);
      if (value !== input.value) {
        write(value, null);
        changed();
      } else {
        last = value;
        sync();
      }
    };
    input.addEventListener('blur', normalize, { signal });
    input.addEventListener('change', normalize, { signal });
    const form = input.form;
    if (form) {
      form.addEventListener('submit', normalize, { signal, capture: true });
      form.addEventListener(
        'reset',
        () => {
          setTimeout(() => {
            if (!signal.aborted) normalize();
          }, 0);
        },
        { signal },
      );
    }

    return () => {
      ac.abort();
      observer?.disconnect();
      hidden?.remove();
      if (hidden && name) input.setAttribute('name', name);
      for (const attr of added) input.removeAttribute(attr);
    };
  },
};

export function initMask(root: ParentNode = document): () => void {
  return bindAll(root, [maskBehavior]);
}
