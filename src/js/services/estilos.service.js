import { createService } from './base.service.js';

// Estilos de baile (con precios, días y horarios): orden alfabético.
export const estilosService = createService('estilos_baile', {
  select: 'id, nombre, descripcion, precio_clase, precio_mensual, dias_dictado, horarios, activo, created_at',
  orderBy: 'nombre',
  ascending: true
});
