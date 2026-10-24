import { expect, type APIRequestContext } from '@playwright/test';

export type SandboxUser = { id: string; nombre: string; email: string };

export class SandboxUsersApi {
  constructor(private readonly request: APIRequestContext) {}

  async firstActiveUser(): Promise<SandboxUser> {
    const response = await this.request.post('/api/v1/sql/select', {
      data: {
        sql: 'SELECT id, nombre, email FROM usuarios WHERE activo = $1',
        params: [true],
      },
    });
    expect(response.ok(), 'La consulta de usuarios activos debe responder correctamente').toBeTruthy();
    const body = await response.json() as { data?: SandboxUser[] };
    expect(body.data, 'La consulta debe devolver usuarios activos').toBeTruthy();
    expect(body.data!.length, 'La consulta debe devolver al menos un usuario activo').toBeGreaterThan(0);
    return body.data![0];
  }
}
