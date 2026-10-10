import type { Region, RegionId, LangMode } from './types';

export const REGIONS: Region[] = [
  { id: 'mumbai', index: 1, name: 'Mumbai', location: 'Mumbai,Maharashtra,India', nativeHl: 'en', color: '#1F4BFF', coords: [72.8777, 19.076] },
  { id: 'delhi', index: 2, name: 'Delhi', location: 'Delhi,Delhi,India', nativeHl: 'hi', color: '#FF2E63', coords: [77.209, 28.6139] },
  { id: 'chennai', index: 3, name: 'Chennai', location: 'Chennai,Tamil Nadu,India', nativeHl: 'ta', color: '#12B76A', coords: [80.2707, 13.0827] },
  { id: 'kolkata', index: 4, name: 'Kolkata', location: 'Kolkata,West Bengal,India', nativeHl: 'bn', color: '#FF9F1C', coords: [88.3639, 22.5726] },
  { id: 'hyderabad', index: 5, name: 'Hyderabad', location: 'Hyderabad,Telangana,India', nativeHl: 'te', color: '#7B2CFF', coords: [78.4867, 17.385] },
  { id: 'bengaluru', index: 6, name: 'Bengaluru', location: 'Bengaluru,Karnataka,India', nativeHl: 'en', color: '#00A3C4', coords: [77.5946, 12.9716] },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, Region>;
export const ALL_REGION_IDS = REGIONS.map((r) => r.id) as [RegionId, ...RegionId[]];

export function hlFor(region: Region, mode: LangMode): string {
  return mode === 'english' ? 'en' : region.nativeHl;
}
