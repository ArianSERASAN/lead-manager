import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Lead } from '../../types/domain';

const xlsxMocks = vi.hoisted(() => ({
  jsonToSheet: vi.fn(() => ({} as Record<string, unknown>)),
  bookNew: vi.fn(() => ({} as Record<string, unknown>)),
  bookAppendSheet: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: xlsxMocks.jsonToSheet,
    book_new: xlsxMocks.bookNew,
    book_append_sheet: xlsxMocks.bookAppendSheet,
  },
  writeFile: xlsxMocks.writeFile,
}));

import { exportLeadsToExcel } from '../../services/ExcelExportService';

function makeLead(id: string, overrides: Partial<Lead> = {}): Lead {
  return {
    id,
    name: `Lead ${id}`,
    email: `${id}@test.com`,
    source: 'landing',
    status: 'nuevo',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    tags: [],
    score: 0,
    ...overrides,
  } as Lead;
}

describe('exportLeadsToExcel', () => {
  beforeEach(() => {
    xlsxMocks.jsonToSheet.mockClear();
    xlsxMocks.bookNew.mockClear();
    xlsxMocks.bookAppendSheet.mockClear();
    xlsxMocks.writeFile.mockClear();
  });

  it('uses headers merged from all leads so no column is lost', () => {
    const leads = [
      makeLead('1', { data: { calculator: { score_total: 70 } } }),
      makeLead('2', { data: { calculator: { score_esg: 15 } } }),
    ];

    exportLeadsToExcel(leads, 'test.xlsx');

    const call = xlsxMocks.jsonToSheet.mock.calls[0];
    const options = call[1] as { header: string[] };

    expect(options.header).toContain('Data: calculator.score_total');
    expect(options.header).toContain('Data: calculator.score_esg');
    expect(xlsxMocks.writeFile).toHaveBeenCalledWith(expect.anything(), 'test.xlsx');
  });
});
