import { ServiceType, RegionPricing } from "@/types";

/**
 * =========================================
 * TIPOS
 * =========================================
 */

export interface TechnicalMaterial {
  material: string;
  tecnico: string;
  valor_tecnico: number;
  pricePerUnit: number;
}

export interface TechnicalResult {
  serviceType: ServiceType;
  area: number;
  materials: TechnicalMaterial[];
  totalPrice: number;
}

/**
 * =========================================
 * MOTOR BASE (TODOS SERVIÇOS)
 * =========================================
 */

const SERVICE_SPECS: Record<ServiceType, any[]> = {
  /**
   * REBOCO
   */
  reboco: [
    { material: "Areia", unit: "m3", factor: 0.012, basePricePerUnit: 40 },
    { material: "Cimento", unit: "kg", factor: 4.2, basePricePerUnit: 0.6 },
    { material: "Cal", unit: "kg", factor: 1.05, basePricePerUnit: 0.5 },
    { material: "Água", unit: "L", factor: 2.5, basePricePerUnit: 0.005 },
  ],

  /**
   * PISO COMPLETO
   */
  piso: [
    { material: "Argamassa", unit: "kg", factor: 5, basePricePerUnit: 0.5 },
    { material: "Piso Cerâmico", unit: "m2", factor: 1.1, basePricePerUnit: 25 },
    { material: "Rejunte", unit: "kg", factor: 0.5, basePricePerUnit: 8 },
    { material: "Cruzeta", unit: "und", factor: 20, basePricePerUnit: 0.05 },
  ],

  /**
   * 🔥 PLADUR (CONTROLADO VIA MODE)
   */
  pladur: [],

  /**
   * ALVENARIA COMPLETA
   */
  alvenaria: [
    { material: "Tijolo", unit: "und", factor: 25, basePricePerUnit: 0.8 },
    { material: "Cimento", unit: "kg", factor: 5, basePricePerUnit: 0.6 },
    { material: "Areia", unit: "m3", factor: 0.01, basePricePerUnit: 40 },
    { material: "Cal", unit: "kg", factor: 1, basePricePerUnit: 0.5 },
  ],

  /**
   * CAPOTO COMPLETO
   */
  capoto: [
    { material: "EPS", unit: "m2", factor: 1.05, basePricePerUnit: 12 },
    { material: "Cola ETICS", unit: "kg", factor: 6, basePricePerUnit: 1.2 },
    { material: "Rede fibra vidro", unit: "m2", factor: 1.1, basePricePerUnit: 2 },
    { material: "Massa acabamento", unit: "kg", factor: 3, basePricePerUnit: 1.5 },
  ],

  /**
   * CONCRETO (BETÃO POR M²)
   */
  concreto: [
    { material: "Cimento", unit: "kg", factor: 3.5, basePricePerUnit: 0.6 },
    { material: "Areia", unit: "m3", factor: 0.007, basePricePerUnit: 40 },
    { material: "Brita", unit: "m3", factor: 0.008, basePricePerUnit: 45 },
    { material: "Água", unit: "L", factor: 1.8, basePricePerUnit: 0.005 },
  ],

  /**
   * PINTURA COMPLETA
   */
  pintura: [
    { material: "Tinta", unit: "L", factor: 0.1, basePricePerUnit: 15 },
    { material: "Primer", unit: "L", factor: 0.05, basePricePerUnit: 10 },
    { material: "Selante", unit: "L", factor: 0.03, basePricePerUnit: 12 },
    { material: "Fita adesiva", unit: "und", factor: 0.05, basePricePerUnit: 3 },
    { material: "Lixa", unit: "und", factor: 0.03, basePricePerUnit: 0.8 },
  ],
};

/**
 * =========================================
 * 🔥 CÁLCULO PRINCIPAL (COM PLADUR INTELIGENTE)
 * =========================================
 */

export function calculateTechnical(
  serviceType: ServiceType,
  area: number,
  regionPricing?: RegionPricing,
  mode?: "parede" | "teto" // 👈 NOVO
): TechnicalResult {
  const multiplier = regionPricing?.priceMultiplier ?? 1;

  let specs: any[] = [];

  /**
   * =========================================
   * 🔥 PLADUR DIFERENCIADO
   * =========================================
   */
  if (serviceType === "pladur") {
    if (mode === "teto") {
      /**
       * 🔥 PLADUR TETO — engenharia automática
       * Sistema F530 + perfis primários + secundários + pendurais
       * - Perfis secundários F530: ~3.4 m/m² (espaçamento 40 cm)
       * - Perfis primários F530: ~0.9 m/m² (espaçamento 120 cm)
       * - Pendurais: ~1.7 und/m² (malha 90x60 cm) → reforço automático
       * - Conectores cruzados: ~2.8 und/m²
       * - Cantoneira perimetral: aprox. 0.5 m/m² (ajuste médio)
       * - Parafusos placa→perfil 25mm: ~17/m²
       * - Buchas fixação teto: ~1.7/m² (1 por pendural)
       * - Fita papel juntas: ~1.5 m/m²
       * - Massa juntas: 0.45 kg/m²
       * - Placa standard 12.5mm c/ perdas 8%
       */
      specs = [
        { material: "Placa de gesso 12.5mm", unit: "m2", factor: 1.08, basePricePerUnit: 6.5 },
        { material: "Perfil F530 (primário+secundário)", unit: "m", factor: 4.3, basePricePerUnit: 3.5 },
        { material: "Cantoneira perimetral", unit: "m", factor: 0.5, basePricePerUnit: 2.2 },
        { material: "Pendural regulável", unit: "und", factor: 1.7, basePricePerUnit: 0.8 },
        { material: "Conector cruzado", unit: "und", factor: 2.8, basePricePerUnit: 0.6 },
        { material: "Bucha fixação teto", unit: "und", factor: 1.7, basePricePerUnit: 0.25 },
        { material: "Parafuso placa 25mm", unit: "und", factor: 17, basePricePerUnit: 0.04 },
        { material: "Fita papel juntas", unit: "m", factor: 1.5, basePricePerUnit: 0.15 },
        { material: "Massa para juntas", unit: "kg", factor: 0.45, basePricePerUnit: 2 },
      ];
    } else {
      /**
       * 🔥 PLADUR PAREDE — engenharia automática
       * Sistema 48 (montantes M48 + guias R48) altura ref. 2.60 m
       * - Montantes verticais cada 40 cm: ~0.96 m/m² altura → ~2.5 m/m²
       *   (para altura média 2.6 m: 2.5 montantes/m parede × 2.6 = mantém ~2.5/m²)
       * - Guias horizontais sup+inf: ~0.77 m/m²
       * - Banda acústica: ~0.77 m/m²
       * - Buchas fixação guias: ~2.5/m²
       * - Parafusos metal-metal: ~4/m²
       * - Parafusos placa 25mm: ~14/m² (face única; dupla face dobrar)
       * - Lã mineral 40mm: 1 m²/m² (isolamento padrão)
       * - Fita juntas: ~1.4 m/m²
       * - Massa juntas: 0.35 kg/m²
       * - Placa 12.5mm c/ perdas 5%
       */
      specs = [
        { material: "Placa de gesso 12.5mm", unit: "m2", factor: 1.05, basePricePerUnit: 6.5 },
        { material: "Montante vertical M48", unit: "m", factor: 2.5, basePricePerUnit: 2.8 },
        { material: "Guia horizontal R48", unit: "m", factor: 0.77, basePricePerUnit: 2.5 },
        { material: "Banda acústica", unit: "m", factor: 0.77, basePricePerUnit: 0.6 },
        { material: "Lã mineral 40mm", unit: "m2", factor: 1.0, basePricePerUnit: 4.5 },
        { material: "Bucha fixação guias", unit: "und", factor: 2.5, basePricePerUnit: 0.2 },
        { material: "Parafuso metal-metal", unit: "und", factor: 4, basePricePerUnit: 0.03 },
        { material: "Parafuso placa 25mm", unit: "und", factor: 14, basePricePerUnit: 0.04 },
        { material: "Fita papel juntas", unit: "m", factor: 1.4, basePricePerUnit: 0.15 },
        { material: "Massa para juntas", unit: "kg", factor: 0.35, basePricePerUnit: 2 },
      ];
    }
  } else {
    specs = SERVICE_SPECS[serviceType] ?? [];
  }

  /**
   * =========================================
   * CÁLCULO
   * =========================================
   */
  const materials: TechnicalMaterial[] = specs.map((spec) => {
    const valor = area * spec.factor;

    return {
      material: spec.material,
      tecnico: spec.unit,
      valor_tecnico: valor,
      pricePerUnit: spec.basePricePerUnit * multiplier,
    };
  });

  const totalPrice = materials.reduce(
    (sum, m) => sum + m.valor_tecnico * m.pricePerUnit,
    0
  );

  return {
    serviceType,
    area,
    materials,
    totalPrice,
  };
}

/**
 * =========================================
 * 🔥 ARREDONDAMENTO DE OBRA
 * =========================================
 */
function roundForConstruction(value: number, unit: string): number {
  switch (unit) {
    case "m3":
      return Math.ceil(value * 100) / 100;

    case "kg":
      return Math.ceil(value / 5) * 5;

    case "L":
      return Math.ceil(value);

    case "und":
      return Math.ceil(value);

    default:
      return Math.ceil(value * 10) / 10;
  }
}

/**
 * =========================================
 * 🔥 EXPORT PRINCIPAL (USADO NA UI)
 * =========================================
 */
export function calculateForUser(
  serviceType: ServiceType,
  area: number,
  regionPricing?: RegionPricing,
  mode?: "parede" | "teto"
) {
  const technical = calculateTechnical(serviceType, area, regionPricing, mode);

  return {
    ...technical,
    materials: technical.materials.map((m) => ({
      ...m,
      valor_tecnico: roundForConstruction(m.valor_tecnico, m.tecnico),
    })),
  };
}

export default calculateForUser;
