import { useId, type ReactNode } from 'react';
import { Stack } from '@efds-ui/react';

interface SectionProps {
  title: string;
  /** Nível do título (o h1 é do Layout): 2 para seções da página, 3 para subseções. */
  level?: 2 | 3;
  children: ReactNode;
}

/** Seção da página: `<section>` nomeada pelo próprio título. */
export function Section({ title, level = 2, children }: SectionProps) {
  const id = useId();
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <Stack as="section" gap={4} aria-labelledby={id}>
      <Heading id={id} className={level === 2 ? 'eds-text-h2' : 'eds-text-h3'}>
        {title}
      </Heading>
      {children}
    </Stack>
  );
}
