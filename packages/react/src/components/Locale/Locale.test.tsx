import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { installPopoverStyle } from '../../test-utils/dom-polyfills';
import { DatePicker } from '../DatePicker';
import { DateRangePicker } from '../DateRangePicker';
import { TableExport } from '../TableExport';
import { LocaleProvider, useLocale } from './Locale';

beforeAll(() => {
  installPopoverStyle();
});

function Show() {
  return <output>{useLocale()}</output>;
}

describe('LocaleProvider', () => {
  it('o padrão é pt-BR e o provider troca para a subárvore', () => {
    const { rerender } = render(<Show />);
    expect(screen.getByRole('status')).toHaveTextContent('pt-BR');
    rerender(
      <LocaleProvider locale="en-US">
        <Show />
      </LocaleProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('en-US');
  });

  it('DatePicker usa o locale do provider nos nomes de mês; a prop locale vence', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LocaleProvider locale="en-US">
        <DatePicker aria-label="Due" defaultValue="2026-03-15" />
      </LocaleProvider>,
    );
    await user.click(screen.getByRole('button', { name: /^Escolher data/ }));
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('March 2026'));
    rerender(
      <LocaleProvider locale="en-US">
        <DatePicker aria-label="Due" defaultValue="2026-03-15" locale="pt-BR" />
      </LocaleProvider>,
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('março de 2026'));
  });

  it('DateRangePicker também segue o provider', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider locale="en-US">
        <DateRangePicker aria-label="Período" defaultValue={{ start: '2026-03-10', end: null }} />
      </LocaleProvider>,
    );
    await user.click(screen.getByRole('button', { name: /^Escolher período/ }));
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('March 2026'));
  });
});

describe('TableExport e locale', () => {
  const blobs: Blob[] = [];
  beforeEach(() => {
    blobs.length = 0;
    const urls = new Map<string, Blob>();
    URL.createObjectURL = vi.fn((blob: Blob) => {
      const url = `blob:eds-${urls.size}`;
      urls.set(url, blob);
      return url;
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      const blob = urls.get(this.href);
      if (blob) blobs.push(blob);
    });
  });

  const data = {
    columns: [
      { key: 'total', label: 'Total', type: 'number' as const },
      { key: 'data', label: 'Data', type: 'date' as const },
    ],
    rows: [{ total: 1280.5, data: '2026-03-15' }],
  };
  const read = (blob: Blob) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });

  it('formata datas e números no locale do provider (e pt-BR sem provider)', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TableExport data={data} />);
    await user.click(screen.getByRole('button', { name: 'CSV', hidden: true }));
    expect(await read(blobs[0]!)).toContain('1280,5;15/03/2026');
    unmount();

    render(
      <LocaleProvider locale="en-US">
        <TableExport data={data} />
      </LocaleProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'CSV', hidden: true }));
    expect(await read(blobs[1]!)).toContain('1280.5;03/15/2026');
  });
});
