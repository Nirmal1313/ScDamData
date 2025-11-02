// src/app/core/models/water-level.model.ts

export interface SluiceStatus {
  data: { [key: string]: string };
}

export interface GateStatus {
  data: { [key: string]: string };
}

export interface ScrivenerCR1000Result {
  datetime: string;
  waterLevel: string[];
  sluice_Status: SluiceStatus[];
  gate_Status: GateStatus[];
}
