import { createContext } from 'react';

/** Ligação RadioGroup → Radio (privado, nunca exportado). */
export interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  required?: boolean;
  select: (value: string) => void;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);
