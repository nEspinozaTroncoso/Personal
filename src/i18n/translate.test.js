import { describe, it, expect } from "vitest";
import { translate } from "./translate.js";
import { messages } from "./messages.js";

const fixture = {
  es: {
    "greet.hello": "Hola {name}",
    "only.es": "Solo en español",
  },
  en: {
    "greet.hello": "Hello {name}",
  },
};

describe("translate", () => {
  it("interpola un parámetro dentro del string", () => {
    expect(translate(fixture, "es", "greet.hello", { name: "Ana" })).toBe("Hola Ana");
    expect(translate(fixture, "en", "greet.hello", { name: "Ana" })).toBe("Hello Ana");
  });

  it("cae a es cuando falta la clave en el idioma pedido", () => {
    expect(translate(fixture, "en", "only.es")).toBe("Solo en español");
  });

  it("devuelve la propia clave si no existe en ningún idioma", () => {
    expect(translate(fixture, "en", "no.existe")).toBe("no.existe");
  });

  it("deja el literal {param} si falta el valor interpolado", () => {
    expect(translate(fixture, "es", "greet.hello")).toBe("Hola {name}");
  });
});

describe("messages: paridad de claves es/en", () => {
  it("toda clave de es existe en en y viceversa", () => {
    const esKeys = Object.keys(messages.es).sort();
    const enKeys = Object.keys(messages.en).sort();
    expect(enKeys).toEqual(esKeys);
  });
});
