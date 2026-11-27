/**
 * Escala única de tom (severidade ou ênfase). Cada componente aceita um subconjunto, declarado
 * com `Extract<Tone, ...>` e exportado como `<Componente>Tone`. No HTML é a classe modificadora
 * `eds-<componente>-<tom>`.
 */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
