import { demoState } from "@/lib/mock-data";
import { SimulationState } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8080";

export async function getSimulationState(): Promise<SimulationState> {
  try {
    const response = await fetch(`${API_BASE}/api/state/demo-user-1`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return demoState;
    }

    return (await response.json()) as SimulationState;
  } catch {
    return demoState;
  }
}
