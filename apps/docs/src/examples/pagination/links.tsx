import { Pagination } from '@eds-ui/react';

export default function Links() {
  // Com getHref, cada controle é um <a href>: a página fica na URL e o clique navega.
  return (
    <Pagination
      page={2}
      pageCount={5}
      getHref={(pagina) => `#/componentes/pagination?pagina=${pagina}`}
    />
  );
}
