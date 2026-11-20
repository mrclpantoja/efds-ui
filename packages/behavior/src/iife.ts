/**
 * Entrada do pacote completo para <script src defer>: expõe `window.EDS` e liga tudo sozinho.
 * A configuração pela tag está em `iife-boot.ts`.
 */
import { boot } from './iife-boot';
import { configure, init } from './index';

export * from './index';

boot(init, configure);
