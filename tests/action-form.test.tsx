// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionForm, NavigationSubmitButton } from "@/components/action-form";
import { EntityDialog } from "@/components/entity-dialog";

afterEach(cleanup);

describe("shared action forms", () => {
  it("renders form and field errors returned by a server action", async () => {
    const action = vi.fn(async () => ({ ok: false, error: "Check the form.", fieldErrors: { name: "Name is required." } }));
    const { container } = render(<ActionForm action={action} submitLabel="Save"><input name="name" /></ActionForm>);
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByText("Check the form.")).toBeVisible();
    expect(screen.getByText("Name is required.")).toBeVisible();
  });

  it("disables the submit button and shows its pending label while saving", async () => {
    let finish!: (value: { ok: boolean; message: string }) => void;
    const action = vi.fn(() => new Promise<{ ok: boolean; message: string }>((resolve) => { finish = resolve; }));
    const { container } = render(<ActionForm action={action} submitLabel="Save" pendingLabel="Saving record…"><input name="name" defaultValue="Example" /></ActionForm>);
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("button", { name: "Saving record…" })).toBeDisabled());
    await act(async () => finish({ ok: true, message: "Saved." }));
    expect(await screen.findByText("Saved.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("marks navigation submissions busy after native validation succeeds", () => {
    const { container } = render(<form onSubmit={(event) => event.preventDefault()}><input name="q" required defaultValue="Kampala" /><NavigationSubmitButton>Apply</NavigationSubmitButton></form>);
    const button = screen.getByRole("button", { name: "Apply" });
    fireEvent.click(button);
    expect(container.querySelector('button[aria-busy="true"]')).toBeDisabled();
    expect(screen.getByRole("button", { name: "Applying…" })).toBeVisible();
  });

  it("closes a CRUD dialog after a successful action", async () => {
    const action = vi.fn(async () => ({ ok: true, message: "Created." }));
    render(<EntityDialog title="Create example" trigger="New example"><ActionForm action={action} submitLabel="Create"><input name="name" defaultValue="Example" /></ActionForm></EntityDialog>);
    fireEvent.click(screen.getByRole("button", { name: "New example" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    expect(await screen.findByText("Created.")).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: 1_500 });
  });
});
