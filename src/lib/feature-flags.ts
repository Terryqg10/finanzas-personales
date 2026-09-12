/**
 * Feature flags de la aplicación.
 *
 * MULTI_USER_SIGNUP_ENABLED (Tarea 3.8, Fase 3):
 * En v1 la app es de un único usuario. El modelo de datos, RLS y
 * autenticación ya están preparados para multiusuario desde la
 * Fase 2-3 (cada tabla tiene su propio user_id con políticas de
 * aislamiento) — lo único que falta para abrir el registro público
 * es cambiar este flag a `true`.
 *
 * Cuando actives esto, revisa también:
 * - La página /signup deja de ser solo para ti; considera añadir
 *   verificación adicional (invitaciones, aprobación manual, etc.)
 *   si no quieres registro 100% abierto.
 * - Los límites de envío de email de Resend (Fase 11) escalan con
 *   más usuarios.
 */
export const MULTI_USER_SIGNUP_ENABLED = false;
