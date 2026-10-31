/** Shared by the server and plain-Node account tools. Never stores a password. */
export const PRODUCTION_ADMIN_EMAIL = "wangperry666@gmail.com";
export function normalizeAdminEmail(email) {
  return email.trim().toLowerCase();
}
export function isAdminEmailAllowed(email, environment) {
  return environment !== "production" || normalizeAdminEmail(email) === PRODUCTION_ADMIN_EMAIL;
}
export function validateAdminPassword(password) {
  if (typeof password !== "string" || password.length < 12 || password.length > 256)
    throw new Error("password_length_12_256");
}
export function validBootstrapHash(hash) {
  return typeof hash === "string" && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash);
}
