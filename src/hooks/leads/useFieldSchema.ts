import { useState, useEffect, useCallback } from 'react';
import { FieldDefinition } from '../../types/domain';
import * as FieldSchemaService from '../../services/FieldSchemaService';

export function useFieldSchema() {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = FieldSchemaService.subscribeToFieldSchema((f) => {
      setFields(f);
      setLoading(false);
    });
    return unsub;
  }, []);

  const addField = useCallback(
    async (field: FieldDefinition) => {
      await FieldSchemaService.addField(field, fields);
    },
    [fields]
  );

  const updateField = useCallback(
    async (fieldId: string, updates: Partial<FieldDefinition>) => {
      await FieldSchemaService.updateField(fieldId, updates, fields);
    },
    [fields]
  );

  const deleteField = useCallback(
    async (fieldId: string) => {
      await FieldSchemaService.deleteField(fieldId, fields);
    },
    [fields]
  );

  const reorderFields = useCallback(async (reordered: FieldDefinition[]) => {
    await FieldSchemaService.saveFieldSchema(reordered);
  }, []);

  return { fields, loading, addField, updateField, deleteField, reorderFields };
}
