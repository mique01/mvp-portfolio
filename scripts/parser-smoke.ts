import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseCsvTextImport, parseExtractedPdfText } from "../src/lib/server/import-parser";

async function main() {
  const base = resolve(process.cwd(), "fixtures", "imports");
  const cases = [
    {
      name: "cocos_movimientos.csv",
      run: async () => parseCsvTextImport(await readFile(resolve(base, "cocos_movimientos.csv"), "utf8")),
    },
    {
      name: "cocos_portfolio.csv",
      run: async () => parseCsvTextImport(await readFile(resolve(base, "cocos_portfolio.csv"), "utf8")),
    },
    {
      name: "allaria_valuacion.txt",
      run: async () => parseExtractedPdfText(await readFile(resolve(base, "allaria_valuacion.txt"), "utf8")),
    },
    {
      name: "allaria_movimientos.txt",
      run: async () => parseExtractedPdfText(await readFile(resolve(base, "allaria_movimientos.txt"), "utf8")),
    },
  ];

  for (const testCase of cases) {
    const result = await testCase.run();
    console.log(`\n[${testCase.name}]`);
    console.log(`custodian=${result.detectedCustodian} kind=${result.reportKind} status=${result.status} rows=${result.rows.length}`);
    if (!result.rows.length) {
      throw new Error(`No se parsearon filas para ${testCase.name}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
