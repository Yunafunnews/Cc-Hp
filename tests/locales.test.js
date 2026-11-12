import { test } from "node:test";
import assert from "node:assert/strict";
import core from "../src/locales/core.json" with { type: "json" };
import {
  languages,
  dictionaries,
  translator,
  localeDirection,
  normalizeLocale,
} from "../src/i18n.js";
test("at least thirty distinct offered languages translate the required interface vocabulary", () => {
  assert.ok(languages.length >= 30);
  assert.equal(new Set(languages.map(([code]) => code)).size, languages.length);
  for (const [code, label] of languages) {
    assert.ok(label);
    if (code === "en") continue;
    const dict = dictionaries[code];
    assert.ok(dict, `missing dictionary ${code}`);
    for (const phrase of core)
      assert.ok(
        typeof dict[phrase] === "string" && dict[phrase].trim(),
        `${code}: ${phrase}`,
      );
  }
});
test("priority languages provide real translations and missing secondary text falls back to English", () => {
  assert.equal(translator("ja")("Settings"), "設定");
  assert.equal(translator("de")("Settings"), "Einstellungen");
  assert.equal(translator("fr")("Settings"), "Paramètres");
  assert.equal(translator("es")("Settings"), "Configuración");
  assert.equal(
    translator("unknown")("Original pet caption"),
    "Original pet caption",
  );
  assert.equal(normalizeLocale("corrupt-locale"), "en");
  assert.equal(normalizeLocale("ja"), "ja");
});
test("RTL belongs to the selected language and switches back for European and Asian languages", () => {
  for (const code of ["ar", "he", "fa", "ur"])
    assert.equal(localeDirection(code), "rtl");
  for (const code of ["en", "zh-CN", "ja", "de", "fr", "es"])
    assert.equal(localeDirection(code), "ltr");
});
