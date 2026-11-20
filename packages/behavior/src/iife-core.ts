/**
 * Entrada de `dist/eds-behavior-core.js`: igual a `iife.ts`, sem o exportador de tabela e sem a
 * máscara de entrada (menor, para quem só precisa dos componentes).
 */
import { boot } from './iife-boot';
import { configure, init } from './index-core';

export * from './index-core';

boot(init, configure);
