import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/lib/api-client";

function fakeResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => text,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("ApiClient transport", () => {
  it("does not send a JSON Content-Type on GET (keeps it a simple CORS request)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ status: "healthy", models: 3 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("http://api.test");
    await client.healthCheck();

    const [, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Accept")).toBe("application/json");
    expect(init.cache).toBe("no-store");
  });

  it("sends JSON headers only when a body is present", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse({ prediction: 2, model: "random_forest" }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("http://api.test");
    await client.predict({ model: "random_forest", features: [1, 2, 3] });

    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe("http://api.test/api/predict");
    expect(init.method).toBe("POST");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("deduplicates concurrent health checks into one request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse({ status: "healthy", models: 15 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("http://api.test");
    await Promise.all([client.healthCheck(), client.healthCheck(), client.healthCheck()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches the model list between polls", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse({ models: ["random_forest"], count: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("http://api.test");
    await Promise.all([client.listModels(), client.listModels()]);
    await client.listModels();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces a JSON error message from the API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse({ error: "Model not found" }, { ok: false, status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("http://api.test");
    await expect(client.healthCheck()).rejects.toThrow("Model not found");
  });

  it("falls back to the status code when an error body is not JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(fakeResponse("upstream exploded", { ok: false, status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("http://api.test");
    await expect(client.healthCheck()).rejects.toThrow("API request failed (502)");
  });
});
