import { describe, it, expect } from 'vitest';
import {
  autoMapHeaders,
  mapRow,
  validateRow,
  generateSlug,
  generateFieldId,
  buildMissingFieldDefinitions,
  buildOfficialImportTemplateRows,
  getOfficialImportColumn,
  isOfficialCustomFieldName,
} from '../../services/CSVImportService';

describe('generateSlug', () => {
  it('converts to lowercase and replaces spaces with underscores', () => {
    expect(generateSlug('Nombre Completo')).toBe('nombre_completo');
  });

  it('strips accents', () => {
    expect(generateSlug('Dirección')).toBe('direccion');
    expect(generateSlug('Teléfono')).toBe('telefono');
  });

  it('removes special characters', () => {
    expect(generateSlug('Ref. Catastral #1')).toBe('ref_catastral_1');
  });

  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
  });
});

describe('generateFieldId', () => {
  it('starts with cf_ prefix', () => {
    expect(generateFieldId()).toMatch(/^cf_\d+_[a-z0-9]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateFieldId()));
    expect(ids.size).toBe(10);
  });
});

describe('autoMapHeaders', () => {
  it('maps Spanish headers to standard fields', () => {
    const result = autoMapHeaders(['Nombre', 'Correo', 'Teléfono', 'Empresa']);
    expect(result['Nombre']).toBe('name');
    expect(result['Correo']).toBe('email');
    expect(result['Teléfono']).toBe('phone');
    expect(result['Empresa']).toBe('company');
  });

  it('maps English headers to standard fields', () => {
    const result = autoMapHeaders(['Full Name', 'Mail', 'Phone', 'Company']);
    expect(result['Full Name']).toBe('name');
    expect(result['Mail']).toBe('email');
    expect(result['Phone']).toBe('phone');
    expect(result['Company']).toBe('company');
  });

  it('returns empty string for unknown headers', () => {
    const result = autoMapHeaders(['Código Postal', 'Idioma Preferido']);
    expect(result['Código Postal']).toBe('');
    expect(result['Idioma Preferido']).toBe('');
  });

  it('maps professional fields correctly', () => {
    const result = autoMapHeaders(['Cargo', 'Sector', 'Localidad']);
    expect(result['Cargo']).toBe('cargo');
    expect(result['Sector']).toBe('sector');
    expect(result['Localidad']).toBe('localidad');
  });

  it('maps property fields correctly', () => {
    const result = autoMapHeaders(['Tipo Inmueble', 'Superficie', 'Referencia Catastral']);
    expect(result['Tipo Inmueble']).toBe('tipoInmueble');
    expect(result['Superficie']).toBe('superficie');
    expect(result['Referencia Catastral']).toBe('referenciaCatastral');
  });

  it('maps official template headers to the expected standard fields', () => {
    const result = autoMapHeaders(['Empresa', 'CEO', 'Email', 'Sede', 'Cargo']);
    expect(result['Empresa']).toBe('company');
    expect(result['CEO']).toBe('name');
    expect(result['Email']).toBe('email');
    expect(result['Sede']).toBe('localidad');
    expect(result['Cargo']).toBe('cargo');
  });
});

describe('mapRow', () => {
  it('maps a complete row to a MappedLead', () => {
    const mapping = { 'Nombre': 'name', 'Email': 'email', 'Tel': 'phone', 'Empresa': 'company' };
    const row = { 'Nombre': 'Juan', 'Email': 'juan@test.com', 'Tel': '600123456', 'Empresa': 'ACME' };
    const result = mapRow(row, mapping);

    expect(result.name).toBe('Juan');
    expect(result.email).toBe('juan@test.com');
    expect(result.phone).toBe('600123456');
    expect(result.company).toBe('ACME');
    expect(result.source).toBe('csv-import');
    expect(result.status).toBe('nuevo');
  });

  it('uses company as fallback name when name is missing', () => {
    const mapping = { 'Empresa': 'company', 'Email': 'email' };
    const row = { 'Empresa': 'ACME Corp', 'Email': 'info@acme.com' };
    const result = mapRow(row, mapping);
    expect(result.name).toBe('ACME Corp');
  });

  it('uses "Sin nombre" when both name and company are missing', () => {
    const mapping = { 'Email': 'email' };
    const row = { 'Email': 'test@test.com' };
    const result = mapRow(row, mapping);
    expect(result.name).toBe('Sin nombre');
  });

  it('puts unmapped columns into customFields', () => {
    const mapping = { 'Nombre': 'name', 'Código Postal': '' };
    const row = { 'Nombre': 'Ana', 'Código Postal': '28001' };
    const result = mapRow(row, mapping);
    expect(result.customFields).toBeDefined();
    expect(result.customFields!['codigo_postal']).toBe('28001');
  });

  it('skips empty values', () => {
    const mapping = { 'Nombre': 'name', 'Email': 'email', 'Tel': 'phone' };
    const row = { 'Nombre': 'Test', 'Email': '', 'Tel': '' };
    const result = mapRow(row, mapping);
    expect(result.email).toBe('');
    expect(result.phone).toBeUndefined();
  });

  it('stores official template custom fields while keeping standard lead fields', () => {
    const mapping = autoMapHeaders(['Empresa', 'CEO', 'Cargo', 'Email', 'CIF', 'Score Total']);
    const row = {
      'Empresa': 'SERASAN',
      'CEO': 'Ana Lopez',
      'Cargo': 'CEO',
      'Email': 'ana@serasan.es',
      'CIF': 'B12345678',
      'Score Total': '87',
    };

    const result = mapRow(row, mapping);

    expect(result.company).toBe('SERASAN');
    expect(result.name).toBe('Ana Lopez');
    expect(result.cargo).toBe('CEO');
    expect(result.email).toBe('ana@serasan.es');
    expect(result.customFields?.cif).toBe('B12345678');
    expect(result.customFields?.ceo).toBe('Ana Lopez');
    expect(result.customFields?.score_total).toBe('87');
  });
});

describe('validateRow', () => {
  it('returns no errors for a valid row', () => {
    const mapped = { name: 'Juan', email: 'j@t.com', source: 'csv-import', status: 'nuevo' };
    expect(validateRow(mapped as any)).toEqual([]);
  });

  it('returns error for completely empty row', () => {
    const mapped = { name: '', email: '', source: 'csv-import', status: 'nuevo' };
    const errors = validateRow(mapped as any);
    expect(errors).toContain('Fila vacía');
  });

  it('clears invalid email instead of rejecting', () => {
    const mapped = { name: 'Test', email: 'not-an-email', source: 'csv-import', status: 'nuevo' } as any;
    validateRow(mapped);
    expect(mapped.email).toBe('');
  });

  it('accepts valid email', () => {
    const mapped = { name: 'Test', email: 'valid@test.com', source: 'csv-import', status: 'nuevo' } as any;
    validateRow(mapped);
    expect(mapped.email).toBe('valid@test.com');
  });
});

describe('buildMissingFieldDefinitions', () => {
  it('creates FieldDefinitions for unmapped headers not in schema', () => {
    const headers = ['Nombre', 'Código Postal'];
    const mapping = { 'Nombre': 'name', 'Código Postal': '' };
    const sections = { 'Código Postal': 'Datos extra' };
    const result = buildMissingFieldDefinitions(headers, mapping, sections, [], 'user1');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('codigo_postal');
    expect(result[0].label).toBe('Código Postal');
    expect(result[0].type).toBe('text');
    expect(result[0].section).toBe('Datos extra');
    expect(result[0].createdBy).toBe('user1');
  });

  it('skips headers that already exist in schema', () => {
    const headers = ['Custom'];
    const mapping = { 'Custom': '' };
    const existingSchema = [{ id: 'x', name: 'custom', label: 'Custom', type: 'text' as const, order: 0, visible: true, required: false, createdAt: '', createdBy: '' }];
    const result = buildMissingFieldDefinitions(headers, mapping, {}, existingSchema, 'user1');
    expect(result).toHaveLength(0);
  });

  it('skips mapped standard fields', () => {
    const headers = ['Nombre', 'Email'];
    const mapping = { 'Nombre': 'name', 'Email': 'email' };
    const result = buildMissingFieldDefinitions(headers, mapping, {}, [], 'user1');
    expect(result).toHaveLength(0);
  });

  it('assigns incremental order values', () => {
    const headers = ['FieldA', 'FieldB'];
    const mapping = { 'FieldA': '', 'FieldB': '' };
    const existingSchema = [{ id: 'x', name: 'existing', label: 'X', type: 'text' as const, order: 5, visible: true, required: false, createdAt: '', createdBy: '' }];
    const result = buildMissingFieldDefinitions(headers, mapping, {}, existingSchema, 'u');
    expect(result[0].order).toBe(6);
    expect(result[1].order).toBe(7);
  });

  it('creates official template field definitions with stable slugs and sections', () => {
    const headers = ['Empresa', 'CEO', 'CIF', 'Score Total'];
    const mapping = autoMapHeaders(headers);
    const result = buildMissingFieldDefinitions(headers, mapping, {}, [], 'user1');

    expect(result.map((field) => field.name)).toEqual(['ceo', 'cif', 'score_total']);
    expect(result.find((field) => field.name === 'ceo')?.section).toBe('Contacto');
    expect(result.find((field) => field.name === 'score_total')?.type).toBe('number');
    expect(result.find((field) => field.name === 'ceo')?.official).toBe(true);
    expect(result.find((field) => field.name === 'cif')?.official).toBe(true);
  });
});

describe('getOfficialImportColumn', () => {
  it('detects official template headers and aliases', () => {
    expect(getOfficialImportColumn('CIF')?.customField).toBe('cif');
    expect(getOfficialImportColumn('Telefono')?.leadField).toBe('phone');
    expect(getOfficialImportColumn('LinkedIn CEO')?.customField).toBe('linkedin_ceo');
  });
});

describe('isOfficialCustomFieldName', () => {
  it('returns true only for official custom field slugs', () => {
    expect(isOfficialCustomFieldName('score_total')).toBe(true);
    expect(isOfficialCustomFieldName('linkedin_ceo')).toBe(true);
    expect(isOfficialCustomFieldName('campo_nuevo_inventado')).toBe(false);
  });
});

describe('buildOfficialImportTemplateRows', () => {
  it('returns section, header, and sample rows for the official template', () => {
    const [sectionRow, headerRow, sampleRow] = buildOfficialImportTemplateRows();

    expect(sectionRow[0]).toBe('Empresa');
    expect(headerRow[0]).toBe('Empresa');
    expect(headerRow).toContain('Score Total');
    expect(sampleRow[0]).toBe('Empresa Ejemplo');
    expect(sampleRow[headerRow.indexOf('Email')]).toBe('ana@empresa-ejemplo.com');
    expect(headerRow).toHaveLength(sectionRow.length);
    expect(sampleRow).toHaveLength(headerRow.length);
  });
});
