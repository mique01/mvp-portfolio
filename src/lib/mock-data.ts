export type AssetType = "Bono" | "Acción" | "CEDEAR" | "Fondo" | "ON" | "Letra";
export type TxType = "Compra" | "Venta" | "Suscripción" | "Rescate";

export type AssetPerformance = {
  d1: number;
  d30: number;
  y1: number;
};

export type Holding = {
  asset: string;
  type: AssetType;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  isPeso?: boolean;
  mepFxRate?: number | null;
  performance: AssetPerformance;
};

export type TransactionStatus = "Ejecutada" | "Pendiente" | "Cancelada";

export type Transaction = {
  id: string;
  date: string;
  type: TxType;
  asset: string;
  assetType: AssetType;
  quantity: number;
  price: number;
  commission: number;
  isPeso?: boolean;
  mepFxRate?: number | null;
  status?: TransactionStatus;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  telefono: string;
  fechaAlta: string;
  comitente: string;
  shareToken: string;
  expectedCommissionPct: number;
  lastActivity: string;
  holdings: Holding[];
  transactions: Transaction[];
};

export const clients: Client[] = [
  {
    id: "c1",
    name: "Maria Fernandez",
    email: "maria.fernandez@email.com",
    telefono: "+54 9 11 1234 5678",
    fechaAlta: "2024-01-12",
    comitente: "104582",
    shareToken: "mf7x2k9q1p4z8a3b",
    expectedCommissionPct: 0.6,
    lastActivity: "2025-04-18",
    holdings: [
      {
        asset: "AL30",
        type: "Bono",
        quantity: 12000,
        avgPrice: 58.2,
        currentPrice: 71.4,
        performance: { d1: 0.84, d30: 4.2, y1: 22.7 },
      },
      {
        asset: "GD30",
        type: "Bono",
        quantity: 8500,
        avgPrice: 62.1,
        currentPrice: 68.9,
        performance: { d1: 0.42, d30: 3.1, y1: 18.4 },
      },
      {
        asset: "YPFD",
        type: "Acción",
        quantity: 320,
        avgPrice: 12450,
        currentPrice: 15890,
        performance: { d1: -1.12, d30: 6.8, y1: 31.5 },
      },
      {
        asset: "AAPL",
        type: "CEDEAR",
        quantity: 180,
        avgPrice: 8200,
        currentPrice: 9450,
        performance: { d1: 0.95, d30: 2.4, y1: 14.8 },
      },
      {
        asset: "FIMA Renta Fija",
        type: "Fondo",
        quantity: 45000,
        avgPrice: 1.0,
        currentPrice: 1.18,
        performance: { d1: 0.08, d30: 1.6, y1: 18.0 },
      },
    ],
    transactions: [
      {
        id: "t1",
        date: "2025-04-18",
        type: "Compra",
        asset: "AL30",
        assetType: "Bono",
        quantity: 2000,
        price: 70.1,
        commission: 8400,
      },
      {
        id: "t2",
        date: "2025-04-10",
        type: "Venta",
        asset: "YPFD",
        assetType: "Acción",
        quantity: 50,
        price: 15600,
        commission: 4680,
      },
      {
        id: "t3",
        date: "2025-03-28",
        type: "Suscripción",
        asset: "FIMA Renta Fija",
        assetType: "Fondo",
        quantity: 15000,
        price: 1.12,
        commission: 1680,
      },
      {
        id: "t4",
        date: "2025-03-15",
        type: "Compra",
        asset: "AAPL",
        assetType: "CEDEAR",
        quantity: 80,
        price: 8950,
        commission: 4296,
      },
      {
        id: "t5",
        date: "2025-02-20",
        type: "Compra",
        asset: "GD30",
        assetType: "Bono",
        quantity: 3500,
        price: 64.2,
        commission: 6741,
      },
    ],
  },
  {
    id: "c2",
    name: "Roberto Salinas",
    email: "roberto.salinas@email.com",
    telefono: "+54 9 11 2233 4455",
    fechaAlta: "2023-11-03",
    comitente: "118903",
    shareToken: "rs4n8m2v6c1k9p5q",
    expectedCommissionPct: 0.5,
    lastActivity: "2025-04-20",
    holdings: [
      {
        asset: "AL30",
        type: "Bono",
        quantity: 25000,
        avgPrice: 60.5,
        currentPrice: 71.4,
        performance: { d1: 0.84, d30: 4.2, y1: 22.7 },
      },
      {
        asset: "GGAL",
        type: "Acción",
        quantity: 1200,
        avgPrice: 4850,
        currentPrice: 6120,
        performance: { d1: 1.65, d30: 8.4, y1: 26.2 },
      },
      {
        asset: "MSFT",
        type: "CEDEAR",
        quantity: 95,
        avgPrice: 14200,
        currentPrice: 16800,
        performance: { d1: 0.34, d30: 3.7, y1: 19.6 },
      },
      {
        asset: "TSLA",
        type: "CEDEAR",
        quantity: 60,
        avgPrice: 9100,
        currentPrice: 8450,
        performance: { d1: -2.18, d30: -5.4, y1: -7.1 },
      },
    ],
    transactions: [
      {
        id: "t6",
        date: "2025-04-20",
        type: "Compra",
        asset: "AL30",
        assetType: "Bono",
        quantity: 5000,
        price: 70.8,
        commission: 17700,
      },
      {
        id: "t7",
        date: "2025-04-05",
        type: "Compra",
        asset: "MSFT",
        assetType: "CEDEAR",
        quantity: 25,
        price: 16500,
        commission: 2062,
      },
      {
        id: "t8",
        date: "2025-03-22",
        type: "Venta",
        asset: "TSLA",
        assetType: "CEDEAR",
        quantity: 20,
        price: 8800,
        commission: 880,
      },
      {
        id: "t9",
        date: "2025-03-01",
        type: "Compra",
        asset: "GGAL",
        assetType: "Acción",
        quantity: 400,
        price: 5680,
        commission: 11360,
      },
    ],
  },
  {
    id: "c3",
    name: "Lucia Etcheverry",
    email: "lucia.etcheverry@email.com",
    telefono: "+54 9 11 6644 2211",
    fechaAlta: "2024-03-18",
    comitente: "127441",
    shareToken: "le9k3p7w2x5n8m4t",
    expectedCommissionPct: 0.7,
    lastActivity: "2025-04-15",
    holdings: [
      {
        asset: "GD30",
        type: "Bono",
        quantity: 18000,
        avgPrice: 61.0,
        currentPrice: 68.9,
        performance: { d1: 0.42, d30: 3.1, y1: 18.4 },
      },
      {
        asset: "PAMP",
        type: "Acción",
        quantity: 800,
        avgPrice: 3200,
        currentPrice: 4150,
        performance: { d1: 0.78, d30: 5.2, y1: 24.1 },
      },
      {
        asset: "NVDA",
        type: "CEDEAR",
        quantity: 45,
        avgPrice: 18500,
        currentPrice: 22400,
        performance: { d1: 2.41, d30: 11.8, y1: 78.4 },
      },
      {
        asset: "Schroder Renta Fija",
        type: "Fondo",
        quantity: 80000,
        avgPrice: 1.0,
        currentPrice: 1.21,
        performance: { d1: 0.07, d30: 1.4, y1: 21.0 },
      },
      {
        asset: "KO",
        type: "CEDEAR",
        quantity: 220,
        avgPrice: 5400,
        currentPrice: 5890,
        performance: { d1: -0.21, d30: 1.1, y1: 8.4 },
      },
    ],
    transactions: [
      {
        id: "t10",
        date: "2025-04-15",
        type: "Suscripción",
        asset: "Schroder Renta Fija",
        assetType: "Fondo",
        quantity: 30000,
        price: 1.18,
        commission: 3540,
      },
      {
        id: "t11",
        date: "2025-04-02",
        type: "Compra",
        asset: "NVDA",
        assetType: "CEDEAR",
        quantity: 15,
        price: 21800,
        commission: 2289,
      },
      {
        id: "t12",
        date: "2025-03-18",
        type: "Compra",
        asset: "GD30",
        assetType: "Bono",
        quantity: 4000,
        price: 65.5,
        commission: 9170,
      },
    ],
  },
  {
    id: "c4",
    name: "Joaquin Iribarren",
    email: "joaquin.iribarren@email.com",
    telefono: "+54 9 11 8877 6655",
    fechaAlta: "2024-06-05",
    comitente: "139025",
    shareToken: "ji6h4d8s2f1l7q3w",
    expectedCommissionPct: 0.55,
    lastActivity: "2025-04-12",
    holdings: [
      {
        asset: "AL30",
        type: "Bono",
        quantity: 6000,
        avgPrice: 59.0,
        currentPrice: 71.4,
        performance: { d1: 0.84, d30: 4.2, y1: 22.7 },
      },
      {
        asset: "YPFD",
        type: "Acción",
        quantity: 150,
        avgPrice: 13100,
        currentPrice: 15890,
        performance: { d1: -1.12, d30: 6.8, y1: 31.5 },
      },
      {
        asset: "FIMA Acciones",
        type: "Fondo",
        quantity: 22000,
        avgPrice: 1.0,
        currentPrice: 1.34,
        performance: { d1: 0.41, d30: 4.2, y1: 34.0 },
      },
    ],
    transactions: [
      {
        id: "t13",
        date: "2025-04-12",
        type: "Compra",
        asset: "AL30",
        assetType: "Bono",
        quantity: 2000,
        price: 70.5,
        commission: 7050,
      },
      {
        id: "t14",
        date: "2025-03-25",
        type: "Suscripción",
        asset: "FIMA Acciones",
        assetType: "Fondo",
        quantity: 8000,
        price: 1.28,
        commission: 1024,
      },
    ],
  },
  {
    id: "c5",
    name: "Camila Wertheim",
    email: "camila.wertheim@email.com",
    telefono: "+54 9 11 3322 7788",
    fechaAlta: "2023-09-27",
    comitente: "145778",
    shareToken: "cw2v5b9n6m1z4x8h",
    expectedCommissionPct: 0.65,
    lastActivity: "2025-04-19",
    holdings: [
      {
        asset: "GD30",
        type: "Bono",
        quantity: 14000,
        avgPrice: 63.4,
        currentPrice: 68.9,
        performance: { d1: 0.42, d30: 3.1, y1: 18.4 },
      },
      {
        asset: "GGAL",
        type: "Acción",
        quantity: 600,
        avgPrice: 5200,
        currentPrice: 6120,
        performance: { d1: 1.65, d30: 8.4, y1: 26.2 },
      },
      {
        asset: "AAPL",
        type: "CEDEAR",
        quantity: 110,
        avgPrice: 8650,
        currentPrice: 9450,
        performance: { d1: 0.95, d30: 2.4, y1: 14.8 },
      },
      {
        asset: "AMZN",
        type: "CEDEAR",
        quantity: 70,
        avgPrice: 11200,
        currentPrice: 12450,
        performance: { d1: 0.62, d30: 4.1, y1: 21.4 },
      },
    ],
    transactions: [
      {
        id: "t15",
        date: "2025-04-19",
        type: "Compra",
        asset: "AMZN",
        assetType: "CEDEAR",
        quantity: 20,
        price: 12300,
        commission: 1599,
      },
      {
        id: "t16",
        date: "2025-04-08",
        type: "Venta",
        asset: "GD30",
        assetType: "Bono",
        quantity: 2000,
        price: 68.4,
        commission: 2736,
      },
      {
        id: "t17",
        date: "2025-03-12",
        type: "Compra",
        asset: "AAPL",
        assetType: "CEDEAR",
        quantity: 30,
        price: 9100,
        commission: 1638,
      },
    ],
  },
];

export function generatePerformanceSeries(seed: number, points = 24) {
  const output: { date: string; value: number }[] = [];
  let value = 100;
  const start = new Date();
  start.setMonth(start.getMonth() - points);

  for (let index = 0; index < points; index += 1) {
    const drift = Math.sin((index + seed) / 3) * 1.6 + ((seed % 3) - 1) * 0.4;
    const noise = (Math.sin(index * seed * 1.7) + Math.cos(index * 0.9)) * 1.1;
    value = Math.max(80, value * (1 + (drift + noise) / 100));
    const date = new Date(start);
    date.setMonth(start.getMonth() + index);
    output.push({ date: date.toISOString().slice(0, 7), value: Math.round(value * 100) / 100 });
  }

  return output;
}
