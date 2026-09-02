import { devices, expect, test } from "@playwright/test"

test.describe("Demand Radar production smoke", () => {
  test("demo login opens the live workspace and core routes render", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /know what your market wants/i })).toBeVisible()

    await page.getByRole("button", { name: /try the demo/i }).first().click()
    await expect(page).toHaveURL(/\/app\/[^/]+\/pulse$/)
    await expect(page.getByRole("heading", { name: "Pulse", exact: true })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible()

    const sidebarBox = await page.locator("aside").first().boundingBox()
    const headerBox = await page.locator("header").boundingBox()
    expect(sidebarBox?.x).toBe(0)
    expect(headerBox?.x).toBe(sidebarBox?.width)

    await page.waitForLoadState("networkidle")
    await page.getByRole("button", { name: "RU", exact: true }).click()
    await expect(page.getByRole("button", { name: "RU", exact: true })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("navigation", { name: "Навигация рабочего пространства" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Кластер спроса" })).toBeVisible()
    const hasRussianHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasRussianHorizontalOverflow).toBe(false)
    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("lang", "ru")
    await expect(page.getByRole("button", { name: "RU", exact: true })).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("button", { name: "EN", exact: true }).click()

    await page.getByRole("link", { name: "Demand signals", exact: true }).click()
    await expect(page).toHaveURL(/\/signals$/)
    await expect(page.getByRole("heading", { name: "Demand signals", exact: true })).toBeVisible()
    await page.waitForLoadState("networkidle")
    const expandButton = page.locator('button[aria-controls^="evidence-"]').first()
    await expect(expandButton).toBeVisible()
    await expandButton.click()
    await expect(expandButton).toHaveAttribute("aria-expanded", "true")
    await expect(page.locator('[id^="evidence-"]').first()).toBeVisible()
    await expect(page.getByText(/independent signals/).first()).toBeVisible()

    await page.getByRole("link", { name: "Posts", exact: true }).click()
    await expect(page).toHaveURL(/\/posts$/)
    await expect(page.getByRole("heading", { name: "Posts", exact: true })).toBeVisible()
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible()
    await expect(page.getByRole("button", { name: "Generate image" })).toBeDisabled()

    await page.getByRole("link", { name: "Scan history", exact: true }).click()
    await expect(page).toHaveURL(/\/scans$/)
    await expect(page.getByRole("heading", { name: "Scan history", exact: true })).toBeVisible()
    await expect(page.getByText("Completed", { exact: true }).first()).toBeVisible()
  })

  test("landing page remains usable at a mobile viewport", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["iPhone 13"] })
    const page = await context.newPage()
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /know what your market wants/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /try the demo/i }).first()).toBeVisible()
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(hasHorizontalOverflow).toBe(false)
    await context.close()
  })
})
