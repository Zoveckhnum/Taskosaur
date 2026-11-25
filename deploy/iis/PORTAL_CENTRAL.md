# Conector con Portal iqualitys

## Actualización: revisión local conectada

7 de noviembre de 2026: Taskosaur real disponible en `http://127.0.0.1:10053/` desde Proyectos del hub `http://127.0.0.1:10031/`. Base nueva `TaskosaurIqualitys_Test`, cuentas ficticias con UUID explícitos, Keycloak de prueba y colas better-queue en memoria. Sin `.env`/credenciales del servicio operativo. El lanzador está en el checkout hermano `Check-list_diagnostico/central-portal/scripts/start-taskosaur-sandbox.ps1`; guía `central-portal/docs/TASKOSAUR_LOCAL.md`. Comprobados dashboard, cambio al portal, JWT/renovación rechazados al retirar permiso y JWT anterior aún inválido tras volver a conceder. Producción permanece sin activar. `STATIC_PUBLIC_DIR` permite servir el export del checkout en esta instancia aislada; HTTP para el enlace central solo se admite en loopback.

Implementado localmente el 7 de noviembre de 2026. No publicado ni activado en el servicio actual. No se modificaron bases, secretos, cuentas o permisos reales.

Compatibilidad adicional verificada al conectar Keycloak real: el controlador conserva `iss` de la respuesta de autorización y lo entrega a openid-client, que valida RFC9207 cuando el proveedor lo anuncia. No omitirlo ni desactivar la validación del emisor. El recorrido real de navegador de esta etapa cubrió portal/Diagnóstico/Oficina con fixtures; Taskosaur conserva sus 20 pruebas de autenticación, sin afirmar un login contra sus cuentas SQL operativas.

El portal y la guía operativa se encuentran en el checkout hermano `Check-list_diagnostico/central-portal/README.md`. Conservar ambos cambios al trasladar o publicar; no basta entregar solo Taskosaur.

Reutiliza `OidcService` con PKCE, state/nonce de un solo uso y tickets opacos de intercambio. El modo nuevo se activa expresamente mediante `CENTRAL_ACCESS_REQUIRED=true`, `CENTRAL_PORTAL_ORIGIN`, `CENTRAL_PORTAL_SERVICE_TOKEN` y `CENTRAL_OIDC_ISSUER`, todos configurados privadamente. No contiene valores de secretos.

Configurar además los ajustes SSO existentes para el mismo proveedor y un cliente confidencial propio, callback `/api/auth/oidc/callback`. La identidad `(issuer,subject)` se vincula al UUID local autorizado por el superusuario central. No hay vinculación por correo, altas automáticas ni cambios de roles en este modo.

La revocación se verifica en cada solicitud HTTP, renovación y evento entrante del socket. Los sockets ociosos se revisan cada 15 segundos con consulta de hasta 5 segundos. Ante caída del central se deniega el acceso. La versión de autorización invalida tokens tras cambios de permisos o cierre central. Los tokens emitidos antes de activar el modo requieren volver a iniciar sesión. El modo desactivado conserva el acceso anterior y no aplica las retiradas centrales.

Antes de activar: respaldar runtime/configuración, probar proveedor/cuentas/vinculaciones en entorno aislado, garantizar acceso del superusuario y validar la reversión de configuración sin restaurar datos. El proveedor de identidad no fue instalado en esta construcción. No se implementó logout administrativo/backchannel desde el proveedor; el cierre global previsto parte del portal central. El menú de cuenta incorpora **Cambiar plataforma** cuando el modo está configurado.
