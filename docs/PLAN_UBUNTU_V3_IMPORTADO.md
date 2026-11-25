# Plan Ubuntu v3 importado en Rodrigo Melendez

El 9 de noviembre de 2026 el usuario confirmó la propuesta de importación y pidió inicio **6/11/2026**, fin **14/11/2026**, jornadas de ocho horas y excluir el domingo **8/11**. Importación completada en producción mediante las API autenticadas y reglas normales de Taskosaur, con identidad central del propietario comprobada. No se ejecutaron los prompts ni se lanzaron trabajos de agentes.

Proyecto: [iqualitys | Plan v3 Ubuntu + SQL Server](https://project-manajer-iqualitys.stackbi.com.mx/rodrigo-melendez/iqualitys-plan-v3-ubuntu-sql-server), workspace **Rodrigo Melendez**, privado y en planeación.

206 elementos: 18 fases EPIC, 90 actividades SUBTASK (cinco por fase), 18 hitos, 47 pruebas, 20 riesgos, 12 decisiones y una tarea documental. Siete etiquetas de categoría, 39 dependencias explícitas sin ciclos, responsables/revisores por asignar. Fases/actividades/hitos/documentación pendientes; pruebas No ejecutada; riesgos Abierto; decisiones Por confirmar. Ningún elemento se marcó completado por tener fechas pasadas.

## Calendario y alcance

Jornada adoptada: **09:00–17:00 America/Mexico_City**, los días 6, 7, 9, 10, 11, 12, 13 y 14 de noviembre. Ocho días, **64 horas**, incluyendo ambos sábados. Las franjas objetivo de las 90 actividades suman exactamente 480 minutos por fecha, sin trabajo asignado al domingo 8. La carga se distribuyó proporcionalmente a la estimación mínima de cada fase; se mantuvo el paso inicial de P15 antes de P14.03.

Las fechas son objetivos comprimidos, no una reestimación de esfuerzo ni una demostración de viabilidad. Se conservan **476–770 horas base** y **547–886 horas con reserva**. Riesgo de capacidad visible en descripción del proyecto, tareas y metadatos. El criterio original de P12 de observar cinco días hábiles no queda cumplido por comprimir esa fase al 14/11. Los hitos y gates continúan pendientes de aprobación humana; dependencias condicionales se conservan en texto, sin inventar bloqueos automáticos.

El calendario está en fechas de tareas y proyecto, franjas documentadas y configuración JSON del proyecto; no se modificó el calendario global de la organización. El sprint predeterminado del proyecto nuevo se ajustó a la misma ventana. Los intervalos de tareas que cruzan días pueden abarcar la noche o el domingo en una barra de calendario, pero sus franjas asignadas excluyen esos tiempos.

## Fuente y fidelidad

Fuente: `Iqualitys-plan-control-v3-Ubuntu-prompts-IA-2026-11-07.xlsx`, SHA-256 `c7abaf13197ae3e507bc3bb3f3092ada58ea15805905625c370712adda46dcbe`. Se adjuntó el Excel íntegro y `Calendario-iqualitys-6-14-nov-2026.csv` a **DOC-01**. Ambos descargados mediante API y comprobados por hash.

Los 90 prompts completos aparecen en bloques de texto escapado de las descripciones y se compararon con las celdas originales, incluidos marcadores como `<app>`. `customFields.sourceRow` pasa por el saneamiento normal de la aplicación: es una vista textual saneada, no una copia canónica byte a byte. El Excel adjunto y los bloques de prompt comprobados preservan el contenido original. Los 12 perfiles y las hojas de arquitectura, equivalencias y cambios quedan referenciados desde la documentación y el Excel.

Se anotaron diferencias con producción: SSO ya activo frente al login separado propuesto por P09.03; Taskosaur ya usa SQL Server en Windows frente a las referencias de origen PostgreSQL. No se retiró SSO ni se declaró completada la portabilidad a Ubuntu.

## Corrección necesaria de almacenamiento

La primera creación de tarea detectó `P2000` en `tasks.description`: la columna estaba limitada a nvarchar(1000), pese a admitir descripciones de mayor longitud en la API. No se truncaron textos para hacerlos caber. Nueva migración **202611090002_task_description_text** amplía únicamente esa columna a **nvarchar(max) NULL**, conservando datos y nulabilidad. Esquema PostgreSQL explicita `@db.Text`; el generado SQL Server usa `@db.NVarChar(Max)`.

Respaldo previo verificado, ensayo DDL con rollback, aplicación por operador y registro en `_prisma_migrations`; no se ampliaron privilegios del runtime ni se modificaron migraciones aplicadas. Ambos esquemas Prisma validados. El cliente ya publicado pudo escribir y leer las descripciones completas sin reiniciar servicios. No reducir de nuevo la columna a 1000 ni restaurar la base anterior para revertir una importación que ya contiene registros reales.

## Verificación y continuidad

Lectura final de los 206 registros: títulos, estado, jerarquía, etiquetas, fechas, 90 prompts íntegros, 39 dependencias, dos adjuntos por hash y URL pública correctos. Todas las actividades sin completedAt. Las API de Oficina también pudieron listar el proyecto nuevo, sus tareas y opciones sin ampliar permisos centrales. No se crearon usuarios ni se cambiaron contraseñas o accesos.

Respaldo, plan aprobado, checkpoints por ID y recibo final `verified.json` están en la carpeta privada `IqualitysAccess/backups/project-import-*` indicada por el puntero local `Check-list_diagnostico/check-list-app/.runtime/ubuntu-project-import-location.json`. Los checkpoints permiten reanudar sin duplicar tareas. No publicar secretos ni credenciales efímeras de mantenimiento. Aceptación funcional, ejecución del plan y liberación profesional siguen siendo decisiones distintas de la carga del proyecto.
