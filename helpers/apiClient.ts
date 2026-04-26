import { APIRequestContext, APIResponse } from '@playwright/test';

const DEBUG = process.env['DEBUG_API'] === 'true';

export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token?: string
  ) {}

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extra,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private log(method: string, url: string, status: number): void {
    if (DEBUG) {
      console.log(`[ApiClient] ${method} ${url} → ${status}`);
    }
  }

  async get(url: string): Promise<APIResponse> {
    const response = await this.request.get(url, { headers: this.buildHeaders() });
    this.log('GET', url, response.status());
    return response;
  }

  async post(url: string, data: unknown): Promise<APIResponse> {
    const response = await this.request.post(url, {
      data,
      headers: this.buildHeaders(),
    });
    this.log('POST', url, response.status());
    return response;
  }

  async put(url: string, data: unknown): Promise<APIResponse> {
    const response = await this.request.put(url, {
      data,
      headers: this.buildHeaders(),
    });
    this.log('PUT', url, response.status());
    return response;
  }

  async patch(url: string, data: unknown): Promise<APIResponse> {
    const response = await this.request.patch(url, {
      data,
      headers: this.buildHeaders(),
    });
    this.log('PATCH', url, response.status());
    return response;
  }

  async delete(url: string): Promise<APIResponse> {
    const response = await this.request.delete(url, { headers: this.buildHeaders() });
    this.log('DELETE', url, response.status());
    return response;
  }

  /**
   * Assert the response has the expected HTTP status.
   * Includes method, URL, and actual status in the failure message.
   */
  assertStatus(response: APIResponse, expected: number): void {
    if (response.status() !== expected) {
      throw new Error(
        `Expected status ${expected} but got ${response.status()} for ${response.url()}`
      );
    }
  }

  /**
   * Assert that all required keys are present in the response body.
   * Uses TypeScript generics for compile-time safety on key names.
   */
  assertSchema<T>(data: unknown, keys: (keyof T)[]): void {
    if (typeof data !== 'object' || data === null) {
      throw new Error(`Expected object, got ${typeof data}`);
    }
    const missing = keys.filter(key => !(key as string in data));
    if (missing.length > 0) {
      throw new Error(`Response schema missing keys: ${missing.join(', ')}`);
    }
  }
}
