/*
 * Horários `hh:mm`: o mesmo código de `@eds-ui/behavior` (`parseTime`, `formatTime`, `maskTime`),
 * conferido pelos mesmos casos nos testes dos dois pacotes.
 */

const MINUTES_IN_DAY = 24 * 60;
export const LAST_MINUTE = MINUTES_IN_DAY - 1;

/** "08:30" -> 510 (minutos desde 00:00); `null` se não for hh:mm válido (00:00 a 23:59). */
export function parseTime(text: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const mi = Number(match[2]);
  return h <= 23 && mi <= 59 ? h * 60 + mi : null;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, '0')}:${String(minutes - h * 60).padStart(2, '0')}`;
}

/** Máscara hh:mm: só dígitos (até 4), dois-pontos automático; hora iniciada em 3 a 9 vira 0h. */
export function maskTime(raw: string): string {
  const pasted = /^\s*(\d{1,2})\s*[:h.]\s*(\d{2})\s*$/.exec(raw);
  let digits = pasted
    ? `${pasted[1]?.padStart(2, '0') ?? ''}${pasted[2] ?? ''}`
    : raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 1 && Number(digits) > 2) digits = `0${digits}`;
  if (digits.length <= 2) return digits.length === 2 && raw.endsWith(':') ? `${digits}:` : digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Posição no texto mascarado logo depois do n-ésimo dígito. */
export function caretAfterDigits(masked: string, digits: number): number {
  if (digits <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < masked.length; i += 1) {
    if (/\d/.test(masked.charAt(i)) && (seen += 1) === digits) {
      // Depois do segundo dígito o cursor passa dos dois-pontos.
      return masked.charAt(i + 1) === ':' ? i + 2 : i + 1;
    }
  }
  return masked.length;
}
