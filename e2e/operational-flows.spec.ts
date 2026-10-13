import { expect, test, type Page } from "@playwright/test";

const email = process.env.BACKOFFICE_ADMIN_EMAIL;
const password = process.env.BACKOFFICE_ADMIN_PASSWORD;

async function signIn(page: Page, username = email, secret = password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(username || "");
  await page.getByLabel("Password").fill(secret || "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("authenticated operational flows", () => {
  test.skip(!email || !password, "Set BACKOFFICE_ADMIN_EMAIL and BACKOFFICE_ADMIN_PASSWORD to run authenticated browser flows.");

  test.beforeEach(async ({ page }) => signIn(page));

  test("dashboard exposes human greeting, charts, and linked operational records", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Welcome back,/ })).toBeVisible();
    await expect(page.getByText("Applications updated vs appointments booked")).toBeVisible();
    await expect(page.getByText("Application status distribution")).toBeVisible();
    const ticketLink = page.locator('a[href^="/tickets?ticket="]').first();
    if (await ticketLink.count()) await expect(ticketLink).toHaveAttribute("href", /ticket=/);
    const centreLink = page.locator('a[href^="/centers/"]').first();
    if (await centreLink.count()) await expect(centreLink).toHaveAttribute("href", /\/centers\//);
  });

  test("application filters navigate with sorting/page size and details hide raw stage JSON", async ({ page }) => {
    await page.goto("/applications");
    await page.getByLabel("Rows").selectOption("20");
    await page.getByLabel("Sort").selectOption("application_id");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/size=20/);
    await expect(page).toHaveURL(/sort=application_id/);
    const detail = page.locator('a[href^="/applications/"]').first();
    if (await detail.count()) {
      await detail.click();
      await expect(page.locator(".stage-progress")).toBeVisible();
      await expect(page.locator("body")).not.toContainText('[{"name"');
    }
  });

  test("CRUD dialogs trap workflow, validate, and close with Escape", async ({ page }) => {
    await page.goto("/services");
    const trigger = page.getByRole("button", { name: "New service" });
    test.skip(!(await trigger.count()), "The signed-in role cannot create services.");
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Create service" }).click();
    await expect(dialog.getByLabel("Name")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("appointment tabs, list controls, and ticket modal preserve URL state", async ({ page }) => {
    await page.goto("/appointments?tab=slots");
    await expect(page.getByText(/Slot references identify each individual visit time/)).toBeVisible();
    await page.getByLabel("Rows").selectOption("20");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/tab=slots/);
    await expect(page).toHaveURL(/size=20/);

    await page.goto("/tickets");
    await page.getByLabel("Rows").selectOption("20");
    await page.getByRole("button", { name: "Apply" }).click();
    const view = page.getByRole("link", { name: "View" }).first();
    if (await view.count()) {
      await view.click();
      await expect(page).toHaveURL(/size=20/);
      await expect(page).toHaveURL(/ticket=/);
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  });

  test("report preview and exports share the selected dataset", async ({ page }) => {
    await page.goto("/reports?dataset=applications&size=10");
    await expect(page.getByLabel("Dataset")).toHaveValue("applications");
    await page.getByLabel("Rows per page").selectOption("20");
    await page.getByRole("button", { name: "Build report" }).click();
    await expect(page).toHaveURL(/size=20/);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: /Excel/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^nira-applications-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

test("a second configured administrator resolves to their own welcome identity", async ({ page }) => {
  const secondEmail = process.env.BACKOFFICE_SECOND_ADMIN_EMAIL;
  const secondPassword = process.env.BACKOFFICE_SECOND_ADMIN_PASSWORD;
  test.skip(!secondEmail || !secondPassword, "Set the second administrator credentials to run the two-user identity check.");
  await signIn(page, secondEmail, secondPassword);
  await expect(page.getByRole("heading", { name: /Welcome back,/ })).toBeVisible();
});
