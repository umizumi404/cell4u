import type { RegisteredBlueprint } from "../_types";
import { b2bLocalServicesAdapter } from "./adapter";
import { b2bLocalServicesBlueprint } from "./blueprint";

export const b2bLocalServices: RegisteredBlueprint = {
  blueprint: b2bLocalServicesBlueprint,
  adapter: b2bLocalServicesAdapter,
};
