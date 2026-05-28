import type { RegisteredBlueprint } from "../_types";
import { realEstateAcquisitionAdapter } from "./adapter";
import { realEstateAcquisitionBlueprint } from "./blueprint";

export const realEstateAcquisition: RegisteredBlueprint = {
  blueprint: realEstateAcquisitionBlueprint,
  adapter: realEstateAcquisitionAdapter,
};
