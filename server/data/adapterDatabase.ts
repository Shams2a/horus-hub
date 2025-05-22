/**
 * Base de données complète des adaptateurs Zigbee connus
 * Contient les identifiants USB (VID/PID), fabricants et types correspondants
 */

export interface AdapterInfo {
  vid: string;          // Vendor ID
  pid: string;          // Product ID
  manufacturer: string;
  model: string;
  type: 'coordinator' | 'router' | 'end_device';
  chipset: string;
  driver: string;
  reliability: 'excellent' | 'good' | 'fair' | 'limited';
  notes?: string;
  supportedFeatures: string[];
}

export const KNOWN_ZIGBEE_ADAPTERS: AdapterInfo[] = [
  // Texas Instruments Adaptateurs
  {
    vid: "0451",
    pid: "16c8",
    manufacturer: "Texas Instruments",
    model: "CC2531 USB Dongle",
    type: "coordinator",
    chipset: "CC2531",
    driver: "zigbee-herdsman",
    reliability: "good",
    notes: "Adaptateur populaire mais performances limitées",
    supportedFeatures: ["zigbee_3_0", "basic_coordination"]
  },
  {
    vid: "0451",
    pid: "16a8",
    manufacturer: "Texas Instruments", 
    model: "CC2530 USB Dongle",
    type: "coordinator",
    chipset: "CC2530",
    driver: "zigbee-herdsman",
    reliability: "fair",
    notes: "Ancienne génération, support limité",
    supportedFeatures: ["zigbee_ha", "basic_coordination"]
  },
  {
    vid: "0451",
    pid: "bef3",
    manufacturer: "Texas Instruments",
    model: "CC26X2R1 LaunchPad",
    type: "coordinator",
    chipset: "CC26X2R1",
    driver: "zigbee-herdsman",
    reliability: "excellent",
    notes: "Adaptateur haute performance recommandé",
    supportedFeatures: ["zigbee_3_0", "advanced_coordination", "high_power", "external_antenna"]
  },

  // ConBee/Dresden Elektronik
  {
    vid: "1cf1",
    pid: "0030",
    manufacturer: "Dresden Elektronik",
    model: "ConBee II",
    type: "coordinator",
    chipset: "EFR32MG21",
    driver: "deconz",
    reliability: "excellent",
    notes: "Excellente compatibilité, firmware régulièrement mis à jour",
    supportedFeatures: ["zigbee_3_0", "advanced_coordination", "ota_updates", "high_device_count"]
  },
  {
    vid: "1cf1",
    pid: "0031",
    manufacturer: "Dresden Elektronik",
    model: "ConBee III",
    type: "coordinator",
    chipset: "EFR32MG21B",
    driver: "deconz",
    reliability: "excellent",
    notes: "Dernière génération ConBee avec performances améliorées",
    supportedFeatures: ["zigbee_3_0", "thread", "advanced_coordination", "ota_updates", "very_high_device_count"]
  },

  // ITead Sonoff
  {
    vid: "10c4",
    pid: "ea60",
    manufacturer: "ITead (Sonoff)",
    model: "Sonoff Zigbee 3.0 USB Dongle Plus",
    type: "coordinator",
    chipset: "CC2652P",
    driver: "zigbee-herdsman",
    reliability: "excellent",
    notes: "Très bon rapport qualité-prix, populaire dans la communauté",
    supportedFeatures: ["zigbee_3_0", "advanced_coordination", "high_power", "external_antenna"]
  },

  // Electrolama
  {
    vid: "10c4",
    pid: "ea60",
    manufacturer: "Electrolama",
    model: "zig-a-zig-ah! (zzh!)",
    type: "coordinator",
    chipset: "CC2652R",
    driver: "zigbee-herdsman",
    reliability: "excellent",
    notes: "Adaptateur open-source de haute qualité",
    supportedFeatures: ["zigbee_3_0", "advanced_coordination", "open_source_firmware"]
  },

  // Nabu Casa (Home Assistant)
  {
    vid: "10c4",
    pid: "ea60",
    manufacturer: "Nabu Casa",
    model: "Home Assistant SkyConnect",
    type: "coordinator",
    chipset: "EFR32MG21",
    driver: "ezsp",
    reliability: "excellent",
    notes: "Adaptateur officiel Home Assistant avec support Thread",
    supportedFeatures: ["zigbee_3_0", "thread", "matter", "official_ha_support"]
  }
];

/**
 * Recherche un adaptateur dans la base de données par VID/PID
 */
export function findAdapterByUSBId(vid: string, pid: string): AdapterInfo | null {
  const normalizedVid = vid.toLowerCase().padStart(4, '0');
  const normalizedPid = pid.toLowerCase().padStart(4, '0');
  
  return KNOWN_ZIGBEE_ADAPTERS.find(adapter => 
    adapter.vid.toLowerCase() === normalizedVid && 
    adapter.pid.toLowerCase() === normalizedPid
  ) || null;
}

/**
 * Recherche des adaptateurs par fabricant
 */
export function findAdaptersByManufacturer(manufacturer: string): AdapterInfo[] {
  return KNOWN_ZIGBEE_ADAPTERS.filter(adapter => 
    adapter.manufacturer.toLowerCase().includes(manufacturer.toLowerCase())
  );
}

/**
 * Obtient tous les adaptateurs par niveau de fiabilité
 */
export function getAdaptersByReliability(reliability: AdapterInfo['reliability']): AdapterInfo[] {
  return KNOWN_ZIGBEE_ADAPTERS.filter(adapter => adapter.reliability === reliability);
}

/**
 * Obtient les adaptateurs recommandés (fiabilité excellente ou bonne)
 */
export function getRecommendedAdapters(): AdapterInfo[] {
  return KNOWN_ZIGBEE_ADAPTERS.filter(adapter => 
    adapter.reliability === 'excellent' || adapter.reliability === 'good'
  );
}