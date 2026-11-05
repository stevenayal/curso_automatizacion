import { test, expect, type APIRequestContext } from '@playwright/test';
import { TransfersPage } from './pages/TransfersPage';

// Salida del Generator a partir de PLAN_TRANSFERENCIAS.md (escenarios TRF-01 y TRF-02).
// Patrón: API setup → UI business flow → API verification.
// Ejecuta sin IA: una vez aprobado por QA, este archivo nunca vuelve a consultar un modelo.

const ORIGIN = process.env.TRF_ORIGIN_ACCOUNT ?? 'CA_GS';
const DESTINATION = process.env.TRF_TARGET_ACCOUNT ?? 'CC_GS';
const AMOUNT = 500_000;

async function balanceOf(request: APIRequestContext, account: string) {
  const response = await request.get(`/api/accounts/${account}/balance`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { available: number };
  return body.available;
}

test.describe('Transferencias — cuentas propias', () => {
  test('TRF-01 transferencia exitosa entre cuentas propias @transferencias @smoke', async ({ page, request }) => {
    // API setup: saldo suficiente sin pasar por la UI.
    const seed = await request.post('/api/test-data/balance', {
      data: { account: ORIGIN, available: AMOUNT * 2 },
    });
    expect(seed.ok()).toBeTruthy();

    const transfers = new TransfersPage(page);
    await transfers.goto();
    await transfers.transfer({ origin: ORIGIN, destination: DESTINATION, amount: AMOUNT });

    await expect(transfers.success).toBeVisible();
  });

  test('TRF-02 saldo origen se descuenta por el monto transferido @transferencias @ledger', async ({ page, request }) => {
    const before = await balanceOf(request, ORIGIN);

    const transfers = new TransfersPage(page);
    await transfers.goto();
    await transfers.transfer({ origin: ORIGIN, destination: DESTINATION, amount: AMOUNT });
    await expect(transfers.success).toBeVisible();

    // Expected de negocio — BLACKLIST del Healer: nunca se ajusta para hacer pasar el test.
    expect(await balanceOf(request, ORIGIN)).toBe(before - AMOUNT);
  });
});
