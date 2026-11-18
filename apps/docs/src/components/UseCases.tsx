import type { ReactNode } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Grid, GridItem } from '@eds-ui/react';

interface UseCasesProps {
  use: readonly ReactNode[];
  avoid: readonly ReactNode[];
}

/**
 * "Quando usar" e "Quando não usar", lado a lado em telas largas, com a mesma altura. Os
 * títulos são h2: vêm logo depois do h1, antes das demais seções.
 */
export function UseCases({ use, avoid }: UseCasesProps) {
  return (
    <Grid gap={4}>
      {(
        [
          ['Quando usar', use],
          ['Quando não usar', avoid],
        ] as const
      ).map(([title, items]) => (
        <GridItem key={title} span={12} spanMd={6}>
          <Card className="docs-usecase">
            <CardHeader>
              <CardTitle level={2}>{title}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="docs-list">
                {items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </GridItem>
      ))}
    </Grid>
  );
}
