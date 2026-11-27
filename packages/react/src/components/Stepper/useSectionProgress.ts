import { useEffect, useMemo, useRef, useState } from 'react';
import { announceStatus } from '../../internal/status-region';
import { isSectionComplete } from '../../internal/sections';
import type { StepState } from './Stepper';

export interface SectionProgressSection {
  /** `id` do elemento da seção (o `href` do link é `#id`). */
  id: string;
  /** Nome da seção, usado no anúncio "Seção X concluída.". */
  label: string;
}

export interface SectionProgressOptions {
  /** Texto do anúncio de seção concluída. Padrão: "Seção {label} concluída.". */
  sectionDone?: (label: string) => string;
}

export interface SectionProgress {
  /** Índice (a partir de 0) da seção que está sendo lida. */
  current: number;
  /** Estado de cada seção: `done`, `current` ou `upcoming`. Pronto para `steps[i].state`. */
  states: StepState[];
}

/** Linha de leitura: os 40% de cima da janela (igual ao behavior). */
const READING_LINE = 0.4;

/**
 * Acompanha as seções de uma página longa para o `Stepper` em modo indicador: `current` é a seção
 * lida (IntersectionObserver, sem rolagem automática) e a seção fica `done` quando nenhum controle
 * dela é inválido e há obrigatório ou campo preenchido (atualiza em `input`/`change`). Anuncia
 * "Seção X concluída." uma única vez por seção. As seções são elementos do DOM com o `id` dado.
 */
export function useSectionProgress(
  sections: readonly SectionProgressSection[],
  options: SectionProgressOptions = {},
): SectionProgress {
  const key = sections.map((s) => s.id).join('|');
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<boolean[]>(() => sections.map(() => false));
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const list = sections;
    const elements = () => list.map((s) => document.getElementById(s.id));
    const announced = new Set<string>();
    let first = true;
    let locked = false;
    let lockTimer: ReturnType<typeof setTimeout> | null = null;

    const recomputeCurrent = () => {
      if (locked) return;
      const line = window.innerHeight * READING_LINE;
      let index = 0;
      elements().forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) index = i;
      });
      const root = document.documentElement;
      if (
        window.innerHeight + window.scrollY >= root.scrollHeight - 2 &&
        root.scrollHeight > window.innerHeight
      )
        index = list.length - 1;
      setCurrent(index);
    };

    const recomputeDone = () => {
      const next = elements().map((el) => (el ? isSectionComplete(el) : false));
      setDone((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next,
      );
      next.forEach((isDone, i) => {
        const section = list[i];
        if (!isDone || !section || announced.has(section.id)) return;
        announced.add(section.id);
        // O estado inicial não é anunciado.
        if (first) return;
        const say = optionsRef.current.sectionDone ?? ((l: string) => `Seção ${l} concluída.`);
        announceStatus(say(section.label));
      });
      first = false;
    };

    recomputeDone();
    recomputeCurrent();

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(recomputeCurrent, {
        rootMargin: `0px 0px -${Math.round((1 - READING_LINE) * 100)}% 0px`,
        threshold: [0, 1],
      });
      for (const el of elements()) if (el) io.observe(el);
    }
    let frame = 0;
    const onScroll = () => {
      if (frame || typeof requestAnimationFrame !== 'function') return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        recomputeCurrent();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // Clique num link do indicador: a seção clicada vale até a rolagem assentar.
    const onHash = () => {
      const index = list.findIndex((section) => `#${section.id}` === window.location.hash);
      if (index < 0) return;
      locked = true;
      if (lockTimer) clearTimeout(lockTimer);
      lockTimer = setTimeout(() => {
        locked = false;
        lockTimer = null;
      }, 700);
      setCurrent(index);
    };
    window.addEventListener('hashchange', onHash);
    const onField = (event: Event) => {
      const target = event.target as Element | null;
      if (!target || !elements().some((el) => el?.contains(target))) return;
      queueMicrotask(recomputeDone);
    };
    document.addEventListener('input', onField, true);
    document.addEventListener('change', onField, true);
    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('hashchange', onHash);
      if (lockTimer) clearTimeout(lockTimer);
      document.removeEventListener('input', onField, true);
      document.removeEventListener('change', onField, true);
      if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    };
    // `sections` muda de identidade a cada render; `key` (os ids) é o que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const states = useMemo<StepState[]>(
    () => sections.map((_, i) => (done[i] ? 'done' : i === current ? 'current' : 'upcoming')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, done, current],
  );
  return { current, states };
}
