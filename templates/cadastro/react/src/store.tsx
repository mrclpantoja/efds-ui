import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { categoriasLookup, seed, type CategoriaItem, type Fornecedor } from './data';

/** Estado em memória (some ao recarregar): a persistência real é do seu servidor. */
interface Store {
  lista: Fornecedor[];
  achar: (id: string) => Fornecedor | undefined;
  salvar: (f: Fornecedor) => void;
  remover: (ids: readonly string[]) => void;
  proximoId: () => string;
  /** Categorias (código + descrição): as do exemplo e as cadastradas por "Cadastrar novo…". */
  categorias: CategoriaItem[];
  /** Cadastra uma categoria (ou devolve a que já existe com esse nome). */
  adicionarCategoria: (nome: string) => CategoriaItem;
}

const StoreContext = createContext<Store | null>(null);

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Fornecedor[]>(seed);
  const [extras, setExtras] = useState<CategoriaItem[]>([]);
  const categorias = useMemo(() => [...categoriasLookup, ...extras], [extras]);

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
  const adicionarCategoria = useCallback(
    (nome: string): CategoriaItem => {
      const texto = nome.trim();
      const existente = categorias.find((c) => normalizar(c.description) === normalizar(texto));
      if (existente) return existente;
      // Código curto: três letras do nome (com número se já existir).
      const base =
        normalizar(texto)
          .replace(/[^a-z]/g, '')
          .slice(0, 3)
          .toUpperCase() || 'CAT';
      let code = base;
      for (let n = 2; categorias.some((c) => c.code === code); n += 1) code = `${base}${n}`;
      const item = { code, description: texto };
      setExtras((atual) => [...atual, item]);
      return item;
    },
    [categorias],
  );

  const value = useMemo(
    () => ({ lista, achar, salvar, remover, proximoId, categorias, adicionarCategoria }),
    [lista, achar, salvar, remover, proximoId, categorias, adicionarCategoria],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore deve ser usado dentro de <StoreProvider>.');
  return store;
}
