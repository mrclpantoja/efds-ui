import { useEffect } from 'react';
import { org } from '../data';

/** Título da aba: "Página | Prefeitura de Vale das Araras". */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | ${org.name}`;
  }, [title]);
}
