import { describe, expect, it } from "vitest";
import { nextFreeSku, skuBase } from "@/core/domain/services/sku";

describe("geração de SKU", () => {
  it("monta a base com nome, tamanho e cor, sem acentos", () => {
    expect(skuBase("Camiseta Básica", "M", "Azul Marinho")).toBe("CAM-M-AZU");
    expect(skuBase("Calça Jeans", "38", null)).toBe("CAL-38");
    expect(skuBase("Vestido", null, "Preto")).toBe("VES-PRE");
    expect(skuBase("  ", null, null)).toBe("PRD");
  });

  it("devolve o primeiro SKU livre", () => {
    expect(nextFreeSku("CAM-M-AZU", [])).toBe("CAM-M-AZU");
    expect(nextFreeSku("CAM-M-AZU", ["cam-m-azu"])).toBe("CAM-M-AZU-2");
    expect(nextFreeSku("CAM-M-AZU", ["CAM-M-AZU", "CAM-M-AZU-2"])).toBe("CAM-M-AZU-3");
  });
});

import { ean13CheckDigit, internalEan13, internalSeqOf, isValidEan13 } from "@/core/domain/services/ean13";
import { buildGrid, parseList } from "@/core/domain/services/product-grid";

describe("EAN-13 interno", () => {
  it("calcula o dígito verificador (exemplo oficial 4006381333931)", () => {
    expect(ean13CheckDigit("400638133393")).toBe(1);
    expect(isValidEan13("4006381333931")).toBe(true);
    expect(isValidEan13("4006381333932")).toBe(false);
  });

  it("gera códigos válidos, sequenciais e reversíveis", () => {
    const a = internalEan13(1);
    expect(a).toHaveLength(13);
    expect(a.startsWith("200000000001")).toBe(true);
    expect(isValidEan13(a)).toBe(true);
    expect(isValidEan13(internalEan13(123456))).toBe(true);
    expect(internalSeqOf(internalEan13(42))).toBe(42);
    expect(internalSeqOf("4006381333931")).toBeNull();
    expect(() => internalEan13(0)).toThrow();
  });
});

describe("grade de produto", () => {
  it("lê listas separadas por vírgula, ponto e vírgula ou linha, sem repetir", () => {
    expect(parseList("P, M; G\nGG, m")).toEqual(["P", "M", "G", "GG"]);
    expect(parseList("")).toEqual([]);
  });

  it("combina tamanhos × cores e limita o total", () => {
    expect(buildGrid(["P", "M"], ["Azul", "Preto"])).toHaveLength(4);
    expect(buildGrid([], [])).toEqual([{ size: null, color: null }]);
    expect(buildGrid(["U"], [])).toEqual([{ size: "U", color: null }]);
    const many = Array.from({ length: 13 }, (_, i) => String(i));
    expect(() => buildGrid(many, many)).toThrow(/máximo/);
  });
});
