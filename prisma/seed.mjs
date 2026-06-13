import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "apex-wealth-hub" },
    update: {},
    create: {
      name: "Apex Wealth Hub",
      slug: "apex-wealth-hub",
      baseCurrency: "ARS",
    },
  });

  const [superAdmin, orgAdmin] = await Promise.all([
    prisma.user.upsert({
      where: { email: "miqueas@apexhub.ai" },
      update: { organizationId: organization.id, role: "SUPER_ADMIN", name: "Miqueas Elias" },
      create: {
        organizationId: organization.id,
        email: "miqueas@apexhub.ai",
        name: "Miqueas Elias",
        role: "SUPER_ADMIN",
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@apexhub.ai" },
      update: { organizationId: organization.id, role: "ORG_ADMIN", name: "Admin Wealth" },
      create: {
        organizationId: organization.id,
        email: "admin@apexhub.ai",
        name: "Admin Wealth",
        role: "ORG_ADMIN",
      },
    }),
  ]);

  const [allaria, cocos, galicia] = await Promise.all([
    prisma.custodian.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: "Allaria" } },
      update: { aliases: ["allaria"] },
      create: {
        organizationId: organization.id,
        name: "Allaria",
        type: "ALYC",
        code: "ALL",
        aliases: ["allaria"],
      },
    }),
    prisma.custodian.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: "Cocos" } },
      update: { aliases: ["cocos"] },
      create: {
        organizationId: organization.id,
        name: "Cocos",
        type: "BROKER",
        code: "COCOS",
        aliases: ["cocos"],
      },
    }),
    prisma.custodian.upsert({
      where: { organizationId_name: { organizationId: organization.id, name: "Banco Galicia" } },
      update: { aliases: ["galicia"] },
      create: {
        organizationId: organization.id,
        name: "Banco Galicia",
        type: "BANK",
        code: "GAL",
        aliases: ["galicia"],
      },
    }),
  ]);

  const claudia = await prisma.client.upsert({
    where: { id: "seed-client-claudia" },
    update: {
      organizationId: organization.id,
      name: "Claudia L. Comolli",
      type: "PRIVATE",
      legalName: "Claudia Liliana Comolli",
      email: "claudia@example.com",
      taxId: "27-00000001-9",
    },
    create: {
      id: "seed-client-claudia",
      organizationId: organization.id,
      name: "Claudia L. Comolli",
      type: "PRIVATE",
      legalName: "Claudia Liliana Comolli",
      email: "claudia@example.com",
      taxId: "27-00000001-9",
    },
  });

  const fundacion = await prisma.client.upsert({
    where: { id: "seed-client-fundacion" },
    update: {
      organizationId: organization.id,
      name: "Fundacion Sur",
      type: "INSTITUTIONAL",
      legalName: "Fundacion Sur para el Desarrollo",
      email: "tesoreria@fundacionsur.org",
      taxId: "30-00000002-7",
    },
    create: {
      id: "seed-client-fundacion",
      organizationId: organization.id,
      name: "Fundacion Sur",
      type: "INSTITUTIONAL",
      legalName: "Fundacion Sur para el Desarrollo",
      email: "tesoreria@fundacionsur.org",
      taxId: "30-00000002-7",
    },
  });

  await prisma.clientUser.upsert({
    where: { clientId_userId: { clientId: claudia.id, userId: superAdmin.id } },
    update: { canEdit: true },
    create: { clientId: claudia.id, userId: superAdmin.id, canEdit: true },
  });

  await prisma.clientUser.upsert({
    where: { clientId_userId: { clientId: fundacion.id, userId: orgAdmin.id } },
    update: { canEdit: true },
    create: { clientId: fundacion.id, userId: orgAdmin.id, canEdit: true },
  });

  const accountAllaria = await prisma.account.upsert({
    where: {
      organizationId_clientId_custodianId_name: {
        organizationId: organization.id,
        clientId: claudia.id,
        custodianId: allaria.id,
        name: "Cuenta 931931",
      },
    },
    update: { number: "931931" },
    create: {
      organizationId: organization.id,
      clientId: claudia.id,
      custodianId: allaria.id,
      name: "Cuenta 931931",
      number: "931931",
      currency: "ARS",
    },
  });

  const accountCocos = await prisma.account.upsert({
    where: {
      organizationId_clientId_custodianId_name: {
        organizationId: organization.id,
        clientId: fundacion.id,
        custodianId: cocos.id,
        name: "Cuenta 415326",
      },
    },
    update: { number: "415326" },
    create: {
      organizationId: organization.id,
      clientId: fundacion.id,
      custodianId: cocos.id,
      name: "Cuenta 415326",
      number: "415326",
      currency: "ARS",
    },
  });

  const accountGalicia = await prisma.account.upsert({
    where: {
      organizationId_clientId_custodianId_name: {
        organizationId: organization.id,
        clientId: fundacion.id,
        custodianId: galicia.id,
        name: "Custodia Galicia 01",
      },
    },
    update: { number: "GAL-01" },
    create: {
      organizationId: organization.id,
      clientId: fundacion.id,
      custodianId: galicia.id,
      name: "Custodia Galicia 01",
      number: "GAL-01",
      currency: "ARS",
    },
  });

  const assetDefinitions = [
    ["MELI", "MercadoLibre CEDEAR", "CEDEAR", "ARS", false, false],
    ["NU", "Nu Holdings CEDEAR", "CEDEAR", "ARS", false, false],
    ["AO28", "Bono Tesoro AO28", "SOVEREIGN_BOND", "USD", false, false],
    ["AL_D_RET_A_MEP", "Allaria Dolar Retorno Total Clase A", "FUND", "USD", true, false],
    ["AL_DINA_D_MEP_A", "Allaria Dolar Dinamico Clase A", "FUND", "USD", true, false],
    ["COCORMA", "FCI Cocos Rendimiento Clase A", "FUND", "ARS", true, false],
    ["IBIT", "iShares Bitcoin Trust CEDEAR", "CEDEAR", "ARS", false, false],
    ["ARS", "Pesos", "CASH", "ARS", false, true],
  ];

  const assets = {};
  for (const [symbol, name, assetClass, currency, isFund, isCashLike] of assetDefinitions) {
    assets[symbol] = await prisma.asset.upsert({
      where: { organizationId_symbol: { organizationId: organization.id, symbol } },
      update: { name, assetClass, currency, isFund, isCashLike },
      create: {
        organizationId: organization.id,
        symbol,
        name,
        assetClass,
        currency,
        isFund,
        isCashLike,
      },
    });
  }

  const reportDate = new Date("2026-06-12T00:00:00.000Z");

  await prisma.holding.deleteMany({
    where: { organizationId: organization.id, accountId: { in: [accountAllaria.id, accountCocos.id, accountGalicia.id] } },
  });

  await prisma.holding.createMany({
    data: [
      {
        organizationId: organization.id,
        clientId: claudia.id,
        accountId: accountAllaria.id,
        assetId: assets.MELI.id,
        quantity: 19,
        availableQuantity: 19,
        pledgedQuantity: 0,
        averageCost: 19800,
        marketPrice: 20345.24,
        fxRate: 1,
        marketValueArs: 376200,
        marketValueUsd: 259.75,
        pnlAmountArs: 10359.56,
        pnlIsEstimated: false,
        valuationDate: reportDate,
      },
      {
        organizationId: organization.id,
        clientId: claudia.id,
        accountId: accountAllaria.id,
        assetId: assets.AL_DINA_D_MEP_A.id,
        quantity: 1207.89,
        availableQuantity: 1207.89,
        pledgedQuantity: 0,
        averageCost: 1.209938,
        marketPrice: 1.67755,
        fxRate: 1448.33,
        marketValueArs: 2116701.64,
        marketValueUsd: 1461.48,
        pnlAmountArs: 818171.88,
        pnlIsEstimated: false,
        valuationDate: reportDate,
      },
      {
        organizationId: organization.id,
        clientId: fundacion.id,
        accountId: accountCocos.id,
        assetId: assets.COCORMA.id,
        quantity: 246.97,
        availableQuantity: 246.97,
        pledgedQuantity: 0,
        averageCost: 11161.47,
        marketPrice: 11155.22,
        fxRate: 1,
        marketValueArs: 2755,
        marketValueUsd: 1.89,
        pnlAmountArs: -1543.56,
        pnlIsEstimated: false,
        valuationDate: new Date("2026-06-10T00:00:00.000Z"),
      },
      {
        organizationId: organization.id,
        clientId: fundacion.id,
        accountId: accountGalicia.id,
        assetId: assets.ARS.id,
        quantity: 1500000,
        availableQuantity: 1500000,
        pledgedQuantity: 0,
        averageCost: 1,
        marketPrice: 1,
        fxRate: 1,
        marketValueArs: 1500000,
        marketValueUsd: 1031.41,
        pnlAmountArs: 0,
        pnlIsEstimated: false,
        valuationDate: reportDate,
      },
    ],
  });

  await prisma.movement.deleteMany({
    where: { organizationId: organization.id, accountId: { in: [accountAllaria.id, accountCocos.id] } },
  });

  await prisma.movement.createMany({
    data: [
      {
        organizationId: organization.id,
        clientId: fundacion.id,
        accountId: accountCocos.id,
        assetId: assets.MELI.id,
        type: "BUY",
        tradeDate: new Date("2026-05-08T00:00:00.000Z"),
        settlementDate: new Date("2026-05-11T00:00:00.000Z"),
        description: "Compra CEDEAR MERCADOLIBRE INC.",
        quantity: 9,
        price: 20303.3333,
        grossAmount: -182730,
        netAmount: -183835.52,
        fees: 822.285,
        taxes: 283.2315,
        currency: "ARS",
      },
      {
        organizationId: organization.id,
        clientId: fundacion.id,
        accountId: accountCocos.id,
        assetId: assets.COCORMA.id,
        type: "FUND_REDEMPTION",
        tradeDate: new Date("2026-05-08T00:00:00.000Z"),
        settlementDate: new Date("2026-05-08T00:00:00.000Z"),
        description: "Liquidacion Rescate Fci",
        quantity: -12960.0498,
        price: 10956.748,
        grossAmount: 142000,
        netAmount: 142000,
        fees: 0,
        taxes: 0,
        currency: "ARS",
      },
    ],
  });

  const fundMaster = await prisma.fundMaster.upsert({
    where: { organizationId_code: { organizationId: organization.id, code: "AL_DINA_D_MEP_A" } },
    update: { name: "Allaria Dolar Dinamico Clase A", assetId: assets.AL_DINA_D_MEP_A.id },
    create: {
      organizationId: organization.id,
      code: "AL_DINA_D_MEP_A",
      name: "Allaria Dolar Dinamico Clase A",
      assetId: assets.AL_DINA_D_MEP_A.id,
    },
  });

  await prisma.fundPrice.upsert({
    where: {
      fundMasterId_date_source: {
        fundMasterId: fundMaster.id,
        date: new Date("2026-06-11T00:00:00.000Z"),
        source: "FUND",
      },
    },
    update: { vcp: 1.67755, currency: "USD" },
    create: {
      fundMasterId: fundMaster.id,
      date: new Date("2026-06-11T00:00:00.000Z"),
      vcp: 1.67755,
      currency: "USD",
      source: "FUND",
    },
  });

  console.log("Seed completed for Apex Wealth Hub");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
