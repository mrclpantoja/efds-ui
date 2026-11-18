import { useState } from 'react';
import { Pagination } from '@eds-ui/react';

export default function Controlada() {
  const [pagina, setPagina] = useState(3);
  return <Pagination page={pagina} pageCount={25} onPageChange={setPagina} />;
}
