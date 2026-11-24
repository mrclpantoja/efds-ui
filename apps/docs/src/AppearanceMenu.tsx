import { useEffect, useState } from 'react';
import { Button, Dropdown, Field, Select, Stack } from '@efds-ui/react';

const axes = [
  {
    attr: 'theme',
    label: 'Tema',
    options: [
      ['blue', 'Azul'],
      ['green', 'Verde'],
      ['purple', 'Roxo'],
      ['orange', 'Laranja'],
      ['neutral', 'Neutro'],
    ],
  },
  {
    attr: 'mode',
    label: 'Modo',
    options: [
      ['light', 'Claro'],
      ['dark', 'Escuro'],
    ],
  },
  {
    attr: 'density',
    label: 'Densidade',
    options: [
      ['compact', 'Compacta'],
      ['comfortable', 'Confortável'],
      ['spacious', 'Espaçosa'],
    ],
  },
  {
    attr: 'shape',
    label: 'Forma',
    options: [
      ['sharp', 'Reta'],
      ['soft', 'Suave'],
      ['rounded', 'Arredondada'],
    ],
  },
] as const;

type Axis = (typeof axes)[number]['attr'];

/** Lê os padrões do `<html>` (declarados em index.html) para a UI começar coerente. */
function initialValues(): Record<Axis, string> {
  // Pré-renderização (sem DOM): os mesmos padrões do <html> em index.html.
  if (typeof document === 'undefined') {
    return { theme: 'blue', mode: 'light', density: 'comfortable', shape: 'soft' };
  }
  const root = document.documentElement;
  return Object.fromEntries(
    axes.map(({ attr }) => [attr, root.getAttribute(`data-${attr}`) ?? '']),
  ) as Record<Axis, string>;
}

/** Guarda a escolha do visitante; o script de index.html a reaplica antes da primeira pintura. */
function save(values: Record<Axis, string>) {
  try {
    localStorage.setItem('eds-docs-appearance', JSON.stringify(values));
  } catch {
    // Sem armazenamento (janela privada, bloqueio): a escolha vale só nesta visita.
  }
}

/** Seletores de tema, modo, densidade e forma: aplicados como `data-*` no `<html>`. */
export function AppearanceMenu() {
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    for (const [axis, value] of Object.entries(values)) {
      document.documentElement.setAttribute(`data-${axis}`, value);
    }
  }, [values]);

  return (
    <Dropdown className="docs-appearance" trigger={<Button variant="secondary">Aparência</Button>}>
      <Stack gap={3}>
        {axes.map(({ attr, label, options }) => (
          <Field key={attr} label={label}>
            <Select
              size="sm"
              value={values[attr]}
              onChange={(event) => {
                const next = { ...values, [attr]: event.target.value };
                setValues(next);
                save(next);
              }}
            >
              {options.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </Select>
          </Field>
        ))}
      </Stack>
    </Dropdown>
  );
}
