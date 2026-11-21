import { useEffect, useState } from 'react';
import { Foundations } from './Foundations';
import { ActionsDemo } from './demos/ActionsDemo';
import { AppShellDemo } from './demos/AppShellDemo';
import { FeedbackDemo } from './demos/FeedbackDemo';
import { NavigationDemo } from './demos/NavigationDemo';
import { SurfacesDemo } from './demos/SurfacesDemo';
import { FormsDemo } from './demos/FormsDemo';
import { LayoutDemo } from './demos/LayoutDemo';
import { DataDemo } from './demos/DataDemo';
import { InteractionDemo } from './demos/InteractionDemo';

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
      <h1 className="eds-text-h1" id="playground-titulo" tabIndex={-1}>
        efDS.ui Playground
      </h1>
      <p>Escolha os eixos abaixo; eles são aplicados como atributos no elemento html.</p>
      <nav aria-label="Telas de referência">
        <ul className="eds-stack eds-stack-row eds-stack-wrap eds-gap-4">
          <li>
            <a href="#/dashboard">Dashboard</a>
          </li>
          <li>
            <a href="#/listagem">Listagem</a>
          </li>
          <li>
            <a href="#/formulario">Formulário</a>
          </li>
        </ul>
      </nav>
      <div className="eds-stack eds-stack-row eds-stack-wrap eds-gap-4">
        {axes.map(({ attr, label, options }) => (
          <div className="eds-field" key={attr}>
            <label className="eds-label" htmlFor={`axis-${attr}`}>
              {label}
            </label>
            <select
              id={`axis-${attr}`}
              className="eds-select eds-select-sm"
              value={values[attr]}
              onChange={(event) => setValues((prev) => ({ ...prev, [attr]: event.target.value }))}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <Foundations />
      <LayoutDemo />
      <ActionsDemo />
      <FormsDemo />
      <SurfacesDemo />
      <NavigationDemo />
      <FeedbackDemo />
      <DataDemo />
      <InteractionDemo />
      <AppShellDemo />
    </main>
  );
}
