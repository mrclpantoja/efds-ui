import { useEffect, useState } from 'react';
import { Foundations } from './Foundations';

const axes = [
  { attr: 'theme', label: 'Tema', options: ['blue', 'green', 'purple', 'orange', 'neutral'] },
  { attr: 'mode', label: 'Modo', options: ['light', 'dark'] },
  { attr: 'density', label: 'Densidade', options: ['compact', 'comfortable', 'spacious'] },
  { attr: 'shape', label: 'Forma', options: ['sharp', 'soft', 'rounded'] },
] as const;

type Axis = (typeof axes)[number]['attr'];

export function App() {
  const [values, setValues] = useState<Record<Axis, string>>({
    theme: 'blue',
    mode: 'light',
    density: 'comfortable',
    shape: 'soft',
  });

  useEffect(() => {
    for (const [axis, value] of Object.entries(values)) {
      document.documentElement.setAttribute(`data-${axis}`, value);
    }
  }, [values]);

  return (
    <main>
      <h1 className="eds-text-h1">eDS.ui Playground</h1>
      <p>Escolha os eixos abaixo; eles são aplicados como atributos no elemento html.</p>
      {axes.map(({ attr, label, options }) => (
        <p key={attr}>
          <label>
            {label}{' '}
            <select
              value={values[attr]}
              onChange={(event) => setValues((prev) => ({ ...prev, [attr]: event.target.value }))}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </p>
      ))}
      <Foundations />
    </main>
  );
}
