import { createContext, useContext, type ReactNode } from "react";
import type { LayerMode } from "@/lib/slog/types";

const LayerCtx = createContext<LayerMode>("log");

export function LayerProvider({ value, children }: { value: LayerMode; children: ReactNode }) {
  return <LayerCtx.Provider value={value}>{children}</LayerCtx.Provider>;
}

export function useLayerMode(): LayerMode {
  return useContext(LayerCtx);
}
