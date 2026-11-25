# Operaciones coordinadas por Oficina

Estado al 9 de noviembre de 2026: **activada en producción**, migración de recibos aplicada y registrada. RouterModule incluye OfficeOperationsModule bajo /api. Guía operativa: repositorio hermano Check-list_diagnostico/check-list-app/docs/OPERACIONES_OFICINA_PRODUCCION.md. Proyectos/tareas vacíos en esta base al activar; no crear semillas para probar. Una vinculación Telegram anterior requiere renovación.

El módulo `backend/src/modules/office-operations` proporciona el adaptador privado de tareas y el backend autenticado del formulario. El acceso del menú de usuario **Oficina · tareas y agenda** abre una propuesta con revisión antes/después, cancelación y confirmación explícita. También puede gestionar agenda a través del coordinador de Oficina y del adaptador de Diagnóstico.

No acepta identidades o roles enviados por el navegador. Resuelve el vínculo central del usuario local y comprueba permisos actuales en la plataforma de destino. Crear y actualizar reutilizan `TasksService.withinOfficeTransaction`; el cambio, actividad de auditoría y recibo se guardan dentro de la transacción exterior. Una respuesta perdida se reconcilia mediante el recibo. Un miembro solo puede actualizar estado. No incluye eliminar tareas ni administrar usuarios.

La migración `202611090001_office_operations` existe para PostgreSQL y SQL Server. Aplicar solo la del proveedor correspondiente mediante el procedimiento operativo existente, con respaldo, sin reset ni semillas. El schema SQL Server generado conserva el nuevo modelo también presente en el original PostgreSQL. Los down scripts rehúsan eliminar recibos no vacíos.

Configuración privada del backend: `OFFICE_OPERATIONS_ENABLED=true`, `OFFICE_OPERATIONS_ADAPTER_TOKEN` exclusivo (mínimo 48 caracteres), `OFFICE_OPERATIONS_URL=http://127.0.0.1:10011/api/integrations/operations` y `OFFICE_OPERATIONS_TOKEN` del origen Taskosaur (distinto del token del adaptador). Mantener identidad central obligatoria y publicar la resolución inversa de identidad local del portal central. No usar variables NEXT_PUBLIC para secretos.

Los endpoints `/api/office-operations/internal/*` requieren socket loopback real y rechazan Origin/encabezados de proxy. El navegador usa `/api/office-requests/*` con su sesión; los adaptadores no deben exponerse por IIS. Oficina debe estar abierta para preparar/ejecutar operaciones. Nunca se abre automáticamente desde estos endpoints.

Pruebas del adaptador: 8 aprobadas; ESLint del módulo aprobado; backend Nest y frontend Next compilados en staging aislado para conservar los sandbox. Ambos esquemas Prisma validados con conexiones ficticias sin acceso a bases. DDL SQL Server ensayado con rollback en TaskosaurIqualitys_Test: cero recibos y tabla ausente al terminar. Activación conjunta y consultas reales de lectura aprobadas; primer guardado confirmado y recorrido humano pendientes, sin crear registros de prueba en producción.

Guía transversal: `Check-list_diagnostico/check-list-app/docs/OPERACIONES_OFICINA.md` en el repositorio hermano. El bot permanece en Diagnóstico; las nuevas operaciones pasan por Oficina. No se trasladaron todos los flujos históricos de Telegram en esta entrega.


Actualización posterior: el usuario autorizó la carga del [Plan Ubuntu v3](PLAN_UBUNTU_V3_IMPORTADO.md), con 206 elementos reales en Rodrigo Melendez. Proyectos ya no está vacío. Migración 202611090002_task_description_text amplía descripciones sin truncar prompts; respeta nuevas migraciones y no modifica las anteriores. Consultas integradas Oficina de proyecto/tareas/opciones aprobadas.
