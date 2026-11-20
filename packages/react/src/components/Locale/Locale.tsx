import { createContext, useContext, type ReactNode } from 'react';

/** Locale padrão de todos os componentes. */
export const DEFAULT_LOCALE = 'pt-BR';

const LocaleContext = createContext<string>(DEFAULT_LOCALE);

export interface LocaleProviderProps {
  /** Tag BCP 47 (ex.: `pt-BR`, `en-US`). Padrão: `pt-BR`. */
  locale?: string;
  children?: ReactNode;
}

/**
 * Locale da subárvore: nomes de mês e dia do DatePicker e do DateRangePicker, ordem de texto da
 * ordenação da Table (`sortTableData`) e datas e números da exportação (`TableExport`).
 * Os textos continuam em `texts` de cada componente; o locale só cuida do `Intl`. Um `locale`
 * passado direto ao componente tem prioridade.
 */
export function LocaleProvider({ locale = DEFAULT_LOCALE, children }: LocaleProviderProps) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Locale em vigor (o do `LocaleProvider` mais próximo, ou `pt-BR`). */
export function useLocale(): string {
  return useContext(LocaleContext);
}
