/**
 * Aparência e preferências do painel, guardadas neste navegador (localStorage). Mesmas chaves e
 * valores da versão HTML (assets/app.js), para as duas versões lerem a mesma escolha.
 */

export interface Aparencia {
  theme: 'blue' | 'green' | 'purple' | 'orange' | 'neutral';
  mode: 'light' | 'dark';
  density: 'compact' | 'comfortable' | 'spacious';
  shape: 'sharp' | 'soft' | 'rounded';
}

export interface Preferencias {
  emailNotificacoes: boolean;
  resumoSemanal: boolean;
  sons: boolean;
  /** Minutos de inatividade até encerrar a sessão; 0 = nunca. */
  sessao: number;
}

export const aparenciaPadrao: Aparencia = {
  theme: 'blue',
  mode: 'light',
  density: 'comfortable',
  shape: 'soft',
};

export const preferenciasPadrao: Preferencias = {
  emailNotificacoes: true,
  resumoSemanal: false,
  sons: false,
  sessao: 30,
};

const CHAVE_APARENCIA = 'painel-aparencia';
const CHAVE_PREFERENCIAS = 'painel-preferencias';

function ler<T extends object>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return { ...padrao };
    const salvo = JSON.parse(bruto) as Partial<T>;
    const resultado = { ...padrao };
    for (const k of Object.keys(padrao) as (keyof T)[]) {
      if (typeof salvo[k] === typeof padrao[k]) resultado[k] = salvo[k] as T[keyof T];
    }
    return resultado;
  } catch {
    return { ...padrao };
  }
}

function gravar(chave: string, valor: object) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Sem armazenamento (janela privada, bloqueio): a escolha vale só nesta página.
  }
}

export const lerAparencia = () => ler(CHAVE_APARENCIA, aparenciaPadrao);
export const lerPreferencias = () => ler(CHAVE_PREFERENCIAS, preferenciasPadrao);
export const gravarPreferencias = (p: Preferencias) => gravar(CHAVE_PREFERENCIAS, p);

/** Aplica os quatro eixos no <html> (só atributos data-*; o CSS do efDS.ui faz o resto). */
export function aplicarAparencia(a: Aparencia) {
  const html = document.documentElement;
  html.dataset.theme = a.theme;
  html.dataset.mode = a.mode;
  html.dataset.density = a.density;
  html.dataset.shape = a.shape;
  gravar(CHAVE_APARENCIA, a);
}
