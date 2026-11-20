import { useEffect, useRef, useState } from 'react';
import { Combobox, Field, type ComboboxOption } from '@eds-ui/react';

/** Base fictícia. Em produção, `buscar` seria um fetch ao seu servidor. */
const clientes: ComboboxOption[] = [
  { value: '101', label: 'Atelier Exemplo' },
  { value: '102', label: 'Comércio Modelo' },
  { value: '103', label: 'Oficina Fictícia' },
  { value: '104', label: 'Papelaria Aurora' },
  { value: '105', label: 'Padaria Horizonte' },
];

function buscar(texto: string): Promise<ComboboxOption[]> {
  const termo = texto.toLowerCase();
  return new Promise((resolve) =>
    setTimeout(() => resolve(clientes.filter((c) => c.label.toLowerCase().includes(termo))), 600),
  );
}

export default function Remoto() {
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const ultima = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Debounce de 300 ms; respostas atrasadas (número antigo) são descartadas.
  const aoDigitar = (texto: string) => {
    window.clearTimeout(timer.current);
    const numero = ++ultima.current;
    if (texto.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = window.setTimeout(() => {
      void buscar(texto).then((resultado) => {
        if (numero !== ultima.current) return;
        setOptions(resultado);
        setLoading(false);
      });
    }, 300);
  };

  return (
    <Field label="Cliente" helper="Digite ao menos 2 letras: Pa, Ate, Com…">
      <Combobox
        name="cliente"
        options={options}
        filter={false}
        loading={loading}
        onInputChange={aoDigitar}
        texts={{ empty: 'Nenhum cliente encontrado' }}
      />
    </Field>
  );
}
