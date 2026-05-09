export type RequirementStatus = "WAJIB" | "DIIZINKAN" | "DILARANG";

export interface ClinicalRule {
  dasarKlinis: string;
  maxSingleComedo: number;
  maxMultiComedoLoad: number;
  harsh: { status: RequirementStatus; maxLoad: number };
  buffer: { status: RequirementStatus; minLoad: number };
  surfactant: { status: RequirementStatus; minCount: number; maxCount: number | "UNLIMITED" };
  uvFilter: { status: RequirementStatus; minCount: number; maxCount: number | "UNLIMITED" };
  moistLight: { status: RequirementStatus; minCount: number; maxCount: number | "UNLIMITED" };
  moistMedium: { status: RequirementStatus; minCount: number; maxCount: number | "UNLIMITED" };
  moistHeavy: { status: RequirementStatus; minCount: number; maxCount: number | "UNLIMITED" };
}
