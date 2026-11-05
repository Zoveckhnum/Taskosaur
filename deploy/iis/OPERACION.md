# Taskosaur para iqualitys

Destino: https://project-manajer-iqualitys.stackbi.com.mx (se conserva la escritura solicitada `manajer`).
Aplicación y servicio independientes del portal StackBI. IIS/ARR dirige el host al servicio
`StackBI-Taskosaur`, en `127.0.0.1:10021`. El frontend es una exportación estática de Next.js,
servida por el backend. Las URL del navegador usan `/api` y el mismo origen para Socket.IO.
HTTPS termina en el Cloudflare Tunnel existente; el enlace IIS en el puerto 80 es el origen local.

## SQL Server

Base independiente `TaskosaurIqualitys` en la instancia `STACKBI`, nombre TLS
`sql.stackbi.com.mx:1433`. Prisma 6.19.1 usa autenticación integrada de Windows,
cifrado TLS y verificación del certificado. El servicio tiene SELECT/INSERT/UPDATE/DELETE
sobre su propia base; las migraciones requieren una identidad de despliegue distinta.
Máximo tres conexiones, conexión 10 segundos, consulta 30 segundos.

El esquema PostgreSQL original conserva el contrato TypeScript de la aplicación.
`scripts/generate-sqlserver.cjs` produce el esquema físico SQL Server; un cliente nativo
SQL Server y `sqlserver.extension.ts` convierten JSON/listas a NVARCHAR(MAX), enumeraciones
a cadenas validadas, filtros de texto a la intercalación CI y las consultas SQL usadas por la app.
Los dos clientes comparten el runtime de Prisma para conservar los marcadores DbNull/JsonNull.
Las versiones de ambos paquetes Prisma están fijadas; revisar esta frontera antes de actualizarlas.

La migración incorpora índices únicos filtrados para columnas opcionales, CHECK de JSON/enumeraciones,
índices de relaciones y claves foráneas físicas NO ACTION. Prisma emula las cascadas de propiedad;
referencias opcionales y de auditoría bloquean un borrado mientras existan referencias.
Los filtros JSON por ruta y cambios parciales `push` de listas no están habilitados; las operaciones
actuales escriben objetos/listas completos. SQL Server 2022 o posterior es necesario para ISJSON VALUE.
La búsqueda aproximada de slugs utiliza DIFFERENCE de SQL Server.

La historia SQL Server está en `backend/prisma/sqlserver/migrations`, separada de PostgreSQL.
No ejecutar las migraciones PostgreSQL contra esta base ni `db:reset` en producción.
`Initialize-Database.ps1` crea únicamente una instalación nueva y se niega a sustituir una existente.
Para cambios posteriores, preparar migraciones SQL revisadas, conservar claves/índices filtrados,
probar con una copia y ejecutar `prisma:migrate:sqlserver`. El `down.sql` inicial solo admite tablas vacías;
con datos, recuperar desde un respaldo verificado. No regenerar la migración inicial aplicada.

## Instalación y acceso

1. `npm ci`, `npm run lint` y `npm run build`.
2. `node scripts/package-iis.cjs .local/iis-artifact-IDENTIFICADOR` prepara un runtime compacto.
3. `Initialize-Database.ps1`, una sola vez.
4. `Install-Taskosaur.ps1 -ArtifactRoot RUTA -CodexExecutable RUTA_EXE -CodexAuthFile RUTA_AUTH`
   instala WinSW con su hash comprobado, cuenta virtual propia y configuración cifrada CMS.
   No copiar la configuración, skills, plugins ni sesiones de otra aplicación.
5. `Initialize-Admin.ps1 -Email CORREO` crea la cuenta inicial, guarda su contraseña con DPAPI
   para el usuario Windows que ejecuta el script y deshabilita el registro público global.
6. Comprobar `/api/health`, inicio de sesión y `/api/ai-chat/test-connection` antes de publicar.
7. `Publish-Taskosaur.ps1` crea el sitio IIS independiente. Añadir el host al túnel existente
   y crear su ruta DNS; comprobar el dominio público, login, recursos estáticos y Socket.IO.

La contraseña inicial se consulta localmente, como el usuario Windows que inicializó la cuenta:

```powershell
(Import-Clixml 'C:\ProgramData\StackBI\Applications\Taskosaur\secrets\initial-admin.credential.xml').GetNetworkCredential().Password
```

Cambiarla desde la cuenta después del primer acceso. Las claves JWT y ENCRYPTION_KEY son independientes
y quedan en `secrets/environment.p7m`. El certificado CMS y su clave privada se protegen con ACL de Windows.
Respaldar la configuración y planear la renovación del certificado antes de su vencimiento de dos años.
No incluir `secrets`, `codex/auth.json` ni respaldos en Git o en los artefactos públicos.

## Codex y consumo

`AI_TRANSPORT=codex-cli` sustituye las llamadas HTTP del chat, automatización del navegador y descripciones.
No pide claves API a los usuarios. El ejecutable copiado y la sesión ChatGPT quedan aislados en la carpeta
de la aplicación. La identidad del servicio necesita una sesión Codex válida; verificarla tras cambios
de cuenta o revocaciones. No se inicia sesión automáticamente al cambiar de equipo.

El proceso recibe únicamente variables de Windows/red y CODEX_HOME; no hereda las claves JWT ni SQL.
Se ejecuta sin shell, con sandbox de lectura, sin configuración heredada, reglas, MCP ni plugins,
sin búsqueda web, con sesión efímera y sin permitir comandos o escrituras de herramientas.
La respuesta conserva el protocolo de acciones del navegador y sus permisos de Taskosaur.
Los títulos de conversación se derivan del mensaje, evitando otra llamada al modelo.

Valores iniciales:

| Control | Límite |
| --- | ---: |
| Llamadas simultáneas | 1, sin cola de espera |
| Duración de una llamada | 90 segundos |
| Prompt explícito | 98,304 bytes |
| Salida del proceso | 1 MiB |
| Reserva por llamada | 131,072 tokens |
| Presupuesto global por día UTC | 2,097,152 tokens |
| Presupuesto por usuario y día UTC | 524,288 tokens |
| Registro persistente | 4,000 entradas / 1 MiB |
| Almacenamiento propio de Codex | 256 MiB; se bloquean llamadas al superarlo |

`Get-CodexUsage.ps1` muestra contadores sin prompts ni credenciales. El registro conserva hashes de usuario,
reservas y consumo final de entrada + salida. Si falta el consumo, la reserva sigue contando; reiniciar
no libera saldo. Un bloqueo abandonado requiere comprobar que el proceso murió antes de retirarlo.
Al llenar el registro, archivar bajo supervisión conservando el saldo del día y reservas pendientes.
No borrar el registro para liberar presupuesto. La reserva es un control de admisión, no un corte exacto
de tokens durante una llamada ni un límite monetario; una respuesta puede excederla y bloquear llamadas posteriores.
El consumo de Codex depende de la cuenta/plan utilizado. Una comprobación de conexión también consume presupuesto.

## Disco, versiones y recuperación

| Área | Política |
| --- | --- |
| Versiones de aplicación | 3 versiones / 2 GiB; siempre protege activa y anterior |
| Artefactos locales de empaquetado | Bloquea nuevas compilaciones de artefactos si `.local` supera 1 GiB; requiere revisión |
| Logs de servicio | Rotación WinSW, 5 archivos de 10 MiB |
| Logs de acceso IIS del sitio | Deshabilitados para evitar otra acumulación sin retención |
| Datos SQL | 2 GiB de datos + 512 MiB de log, crecimiento 64 MiB |
| Archivos adjuntos | 4 GiB, rechaza nuevas cargas al alcanzar el límite |
| Respaldos SQL | Hasta 7 copias / 8 GiB, conserva las dos últimas verificadas |
| Espacio libre | Mínimo 10 GiB antes de instalar, llamar Codex, cargar o respaldar |

`Maintain-Taskosaur.ps1 -WhatIf` permite revisar la limpieza. Solo elimina versiones con nombre y marcador
reconocidos dentro de la raíz exacta de Taskosaur, rechaza enlaces y conserva las versiones protegidas.
No limpia otros proyectos, repositorios Git, credenciales, adjuntos ni datos de negocio.
`Update-Taskosaur.ps1 -ArtifactRoot RUTA` instala una versión y revierte si no pasa salud de BD.
`Update-Taskosaur.ps1 -Rollback` intercambia activa y anterior; no revierte migraciones de datos.
Cada artefacto registra commit original, fecha, estado de cambios locales y dependencias fijadas en su lockfile.
No equivale a un commit nuevo: guardar los cambios en Git antes de los siguientes despliegues revisados.

`Backup-Taskosaur.ps1` ejecuta BACKUP CHECKSUM y RESTORE VERIFYONLY antes de marcar una copia como verificable.
`Register-Tasks.ps1` programa mantenimiento a las 03:10 y respaldo a las 03:20, hora local del servidor (Ciudad de México), como SYSTEM. Si las dos copias protegidas exceden el presupuesto,
se detiene y exige revisión, en lugar de borrar la recuperación más reciente. Los respaldos locales comparten
el mismo disco: configurar copia externa y prueba real de restauración. Los adjuntos y los secretos necesitan
su propia copia externa; la retención SQL no los respalda.

La cola inicial `better-queue` evita añadir Redis; sus trabajos pendientes viven en memoria y se pierden
en reinicios. Para correo/automatizaciones duraderas configurar Redis/BullMQ con límites de retención.
SMTP no se configura copiando credenciales de otras aplicaciones; invitaciones y recuperación por correo
requieren completar esa configuración.

## Validación

Se probaron operaciones contra una BD SQL Server aislada: JSON, listas, escritura anidada, valores únicos nulos,
intercalación, paginación SQL parametrizada, bloqueo de filas, seed de prueba, transacciones, duplicados y cascadas.
`npm run test:sqlserver --workspace backend` exige explícitamente la base `TaskosaurIqualitys_Test`.
Las pruebas nuevas de conversión y presupuesto y las pruebas de normalización del chat pasaron.
La suite backend original conserva fallos en pruebas antiguas de colas, mocks de TaskRanks y la expectativa
Hello World del controlador raíz. `test:frontend` referencia un script `test` que este frontend no define;
dispone de Playwright E2E, además de compilación TypeScript y lint.

Fuentes: [Codex no interactivo](https://learn.chatgpt.com/docs/non-interactive-mode),
[Prisma SQL Server](https://www.prisma.io/docs/orm/v6/overview/databases/sql-server).

## Activación del 5 de noviembre de 2026

Se creó la cuenta `alejandoalvarado71@gmail.com` y la organización `iqualitys`, sin proyectos de ejemplo.
El servicio ejecuta con `NT SERVICE\StackBI-Taskosaur`. La BD quedó en recuperación SIMPLE:
el respaldo diario no proporciona recuperación a un instante entre respaldos.
Se verificaron HTTPS público, login, dashboard, conexión Codex bajo el servicio y el portal StackBI existente.
Se probó la reversión a la versión anterior y el retorno a la versión final; ambas pasaron salud de BD.
La versión final activa es `20261105T231906619Z-a5bea521`; se conservan tres versiones, aproximadamente 639 MiB en total.
El panel de IA muestra la conexión administrada y permite activar/desactivar el asistente sin campos de API.
La comprobación de conexión y el chat real registraron 24,298 tokens de entrada + salida en total, sin reservas pendientes.
Las tareas diarias de mantenimiento y respaldo están registradas. El respaldo inicial pasó RESTORE VERIFYONLY;
queda pendiente configurar copia externa y correo SMTP.
