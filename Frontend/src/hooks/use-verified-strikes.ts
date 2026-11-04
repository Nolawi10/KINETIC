import { useSyncExternalStore } from "react";
import {
  verifiedStrikeStore,
  type StrikeRecognitionState,
} from "@/lib/strike-recognition";

/** Subscribe to the verified-strike / combo store. */
export function useVerifiedStrikes(): StrikeRecognitionState {
  return useSyncExternalStore(
    verifiedStrikeStore.subscribe,
    verifiedStrikeStore.getSnapshot,
    verifiedStrikeStore.getSnapshot,
  );
}
