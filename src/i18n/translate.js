// Función pura de traducción con interpolación simple de {param}. Sin React → testeable.
export function translate(messages, locale, key, params = {}) {
  const table = messages[locale] ?? messages.es;
  let str = table[key];
  if (str == null) {
    str = messages.es[key];
  }
  if (str == null) {
    return key;
  }
  return str.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? params[name] : match
  );
}
