import { describe, expect, it } from "vitest";
import {
  formatBackendStatus,
  formatLandingStatus,
  type BackendState,
} from "@/hooks/use-backend-status";

describe("formatBackendStatus", () => {
  it("shows a connecting label before the first health check resolves", () => {
    expect(formatBackendStatus({ state: "checking", models: 0 })).toBe("API: CONNECTING…");
  });

  it("shows offline without a model count when the API is unreachable", () => {
    expect(formatBackendStatus({ state: "offline", models: 0 })).toBe("API: OFFLINE");
  });

  it("reports the loaded model count when the API is online", () => {
    expect(formatBackendStatus({ state: "online", models: 15 })).toBe("API: ONLINE · 15 MODELS");
  });

  it("uses singular wording for a single model", () => {
    expect(formatBackendStatus({ state: "online", models: 1 })).toBe("API: ONLINE · 1 MODEL");
  });
});

describe("formatLandingStatus", () => {
  const cases: Array<[BackendState, string]> = [
    ["checking", "STATUS: CONNECTING…"],
    ["offline", "STATUS: API OFFLINE"],
    ["online", "STATUS: API ONLINE"],
  ];

  it.each(cases)("renders %s as %s", (state, expected) => {
    expect(formatLandingStatus(state)).toBe(expected);
  });
});
