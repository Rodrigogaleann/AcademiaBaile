import { createService } from './base.service.js';

// Estilos de baile: orden alfabético.
export const estilosService = createService('estilos_baile', {
  select: 'id, nombre, descripcion, activo, created_at',
  orderBy: 'nombre',
  ascending: true
});
