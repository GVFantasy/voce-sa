// @ts-check
const { test, expect } = require('@playwright/test');

const EMAIL = 'claude.test@mailinator.com';
const PASSWORD = 'Teste@12345';

async function login(page) {
  await page.goto('/');
  await expect(page.locator('#splash')).toBeHidden({ timeout: 5000 });
  await page.fill('#auth-email', EMAIL);
  await page.fill('#auth-pass', PASSWORD);
  await page.click('#auth-btn');
  await expect(page.locator('#app')).toBeVisible({ timeout: 15000 });
}

test.describe('Você S.A. — caminho crítico', () => {
  test('login carrega o check-in sem erro de console', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await login(page);
    await expect(page.locator('.main-nav')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('toggle de hábito + salvar check-in', async ({ page }) => {
    await login(page);
    const firstHabit = page.locator('.habit-toggle').first();
    await firstHabit.click();
    await page.click('button:has-text("Salvar check-in")');
    await expect(page.locator('.g-toast')).toBeVisible({ timeout: 5000 });
  });

  test('criar plano via modal inline e cancelar', async ({ page }) => {
    await login(page);
    await page.click('#plan-badge');
    await expect(page.locator('#plan-modal')).toBeVisible();

    await page.click('#plan-add-btn');
    await expect(page.locator('#plan-add-form')).toBeVisible();
    await page.fill('#plan-add-input', 'Plano de teste automatizado');
    await page.click('#plan-add-btn-confirm');
    await expect(page.locator('#plan-add-form')).toBeHidden({ timeout: 5000 });

    await page.click('#plan-add-btn');
    await page.click('button:has-text("Cancelar")');
    await expect(page.locator('#plan-add-form')).toBeHidden();
  });

  test('navega pelas abas principais sem erro de console', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await login(page);

    await page.click('button.nav-btn[onclick*="dashboard"]');
    await expect(page.locator('#pg-dashboard')).toBeVisible();

    await page.click('button.nav-btn[onclick*="okrs"]');
    await expect(page.locator('#pg-okrs')).toBeVisible();

    await page.click('button.nav-btn[onclick*="financeiro"]');
    await expect(page.locator('#pg-financeiro')).toBeVisible();

    const buttons = await page.$$('button.nav-btn');
    for (const b of buttons) {
      const t = await b.innerText();
      if (/mais/i.test(t)) { await b.click(); break; }
    }
    await page.click('button.mais-item[onclick*="retrospectiva"]');
    await expect(page.locator('#pg-retrospectiva')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('dark mode liga e desliga sem quebrar o layout', async ({ page }) => {
    await login(page);
    const buttons = await page.$$('button.nav-btn');
    for (const b of buttons) {
      const t = await b.innerText();
      if (/mais/i.test(t)) { await b.click(); break; }
    }
    await page.click('button.mais-item[onclick*="perfil"]');
    await expect(page.locator('#pg-perfil')).toBeVisible();

    const headers = await page.$$('.pillar-header');
    for (const h of headers) {
      const t = await h.innerText();
      if (/apar/i.test(t)) { await h.click(); break; }
    }
    await page.click('#dark-toggle');
    await expect(page.locator('body')).toHaveClass(/dark/);
    await page.click('#dark-toggle');
    await expect(page.locator('body')).not.toHaveClass(/dark/);
  });
});
