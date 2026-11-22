import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { seed, type Fornecedor } from './data';

/** Estado em memória (some ao recarregar): a persistência real é do seu servidor. */
interface Store {
  lista: Fornecedor[];
  achar: (id: string) => Fornecedor | undefined;
  salvar: (f: Fornecedor) => void;
  remover: (ids: readonly string[]) => void;
  proximoId: () => string;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Fornecedor[]>(seed);

  const achar = useCallback((id: string) => lista.find((f) => f.id === id), [lista]);
  const salvar = useCallback((f: Fornecedor) => {
    setLista((atual) =>
      atual.some((x) => x.id === f.id) ? atual.map((x) => (x.id === f.id ? f : x)) : [...atual, f],
    );
  }, []);
  const remover = useCallback((ids: readonly string[]) => {
    setLista((atual) => atual.filter((f) => !ids.includes(f.id)));
  }, []);
  const proximoId = useCallback(() => {
    const maior = lista.reduce((m, f) => Math.max(m, Number(f.id.replace(/\D/g, '')) || 0), 0);
    return `FOR-${String(maior + 1).padStart(4, '0')}`;
  }, [lista]);

  const value = useMemo(
    () => ({ lista, achar, salvar, remover, proximoId }),
    [lista, achar, salvar, remover, proximoId],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore deve ser usado dentro de <StoreProvider>.');
  return store;
}
