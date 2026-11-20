import { useEffect, useRef } from 'react';

/** Campo de renomear: Enter salva, Esc cancela, perder o foco salva (sem tirar o foco de onde foi). */
export function RenameInput({
  initial,
  label,
  onFinish,
}: {
  initial: string;
  label: string;
  /** `value === null` cancela. `refocus`: devolver o foco ao item. */
  onFinish: (value: string | null, refocus: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const finish = (save: boolean, refocus: boolean) => {
    if (done.current) return;
    done.current = true;
    onFinish(save ? (ref.current?.value ?? initial) : null, refocus);
  };
  return (
    <input
      ref={ref}
      className="eds-input eds-input-sm"
      defaultValue={initial}
      aria-label={label}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          event.preventDefault();
          finish(true, true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          finish(false, true);
        }
      }}
      onBlur={() => finish(true, false)}
    />
  );
}
