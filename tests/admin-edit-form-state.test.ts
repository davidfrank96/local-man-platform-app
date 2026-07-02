import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("admin edit workspace remounts whenever the selected vendor changes", () => {
  const source = readRepoFile("components/admin/admin-console.tsx");
  const editModeRender = sliceBetween(
    source,
    "{mode === \"edit\" ? (",
    "        </section>",
  );

  assert.match(
    editModeRender,
    /<EditVendorWorkspace\s+key=\{`admin-edit-workspace:\$\{selectedVendor\?\.id \?\? "none"\}`\}/,
  );
  assert.match(editModeRender, /selectedVendor=\{selectedVendor\}/);
});

test("all existing vendor edit sections sit under the selected-vendor remount boundary", () => {
  const source = readRepoFile("components/admin/admin-vendor-workspace-sections.tsx");
  const workspace = sliceBetween(
    source,
    "export function EditVendorWorkspace",
    "function RatingSignalInsightsPanel",
  );

  assert.match(workspace, /<UpdateVendorSection/);
  assert.match(workspace, /<VendorHoursSection/);
  assert.match(workspace, /<FeaturedDishesSection/);
  assert.match(workspace, /<VendorImagesSection/);
  assert.match(workspace, /key=\{`vendor-images:\$\{selectedVendor\.id\}`\}/);
});

test("basic detail inputs are initialized from selectedVendor for each remount", () => {
  const source = readRepoFile("components/admin/admin-vendor-workspace-sections.tsx");
  const updateFields = sliceBetween(
    source,
    "function UpdateVendorIdentityFields",
    "  function handleNameChange",
  );
  const updateFieldsRender = sliceBetween(
    source,
    "function UpdateVendorIdentityFields",
    "\n    </>",
  );

  assert.match(updateFields, /useState\(selectedVendor\?\.name \?\? ""\)/);
  assert.match(updateFields, /useState\(selectedVendor\?\.slug \?\? ""\)/);
  assert.match(updateFieldsRender, /defaultValue=\{selectedVendor\?\.area \?\? ""\}/);
  assert.match(updateFieldsRender, /defaultValue=\{selectedVendor\?\.price_band \?\? ""\}/);
  assert.match(updateFieldsRender, /defaultValue=\{selectedVendor\?\.latitude \?\? ""\}/);
  assert.match(updateFieldsRender, /defaultValue=\{selectedVendor\?\.longitude \?\? ""\}/);
  assert.match(updateFieldsRender, /defaultValue=\{selectedVendor\?\.phone_number \?\? ""\}/);
  assert.match(updateFieldsRender, /defaultValue=\{selectedVendor\?\.short_description \?\? ""\}/);
  assert.doesNotMatch(updateFieldsRender, /workspaceCache|localStorage|sessionStorage|ultimate-ontop/i);
});

test("saving a vendor uses the current selected vendor id and current form values", () => {
  const consoleSource = readRepoFile("components/admin/admin-console.tsx");
  const workspaceSource = readRepoFile("components/admin/admin-vendor-workspace-sections.tsx");
  const updateHandler = sliceBetween(
    consoleSource,
    "async function handleUpdateVendor",
    "\n  async function handleDeactivateVendor",
  );
  const submitHandler = sliceBetween(
    workspaceSource,
    "async function submitUpdateVendor",
    "\n  return (",
  );

  assert.match(updateHandler, /updateAdminVendor\(selectedVendor\.id, data\)/);
  assert.match(submitHandler, /updateVendorPayload\(new FormData\(event\.currentTarget\)\)/);
  assert.doesNotMatch(updateHandler, /initialSelectedVendorId|workspaceCacheSnapshot|ultimate-ontop/i);
});

test("image upload target follows the current selected vendor after switching", () => {
  const consoleSource = readRepoFile("components/admin/admin-console.tsx");
  const workspaceSource = readRepoFile("components/admin/admin-vendor-workspace-sections.tsx");
  const imageHandler = sliceBetween(
    consoleSource,
    "async function handleCreateImages",
    "\n  async function handleDeleteImage",
  );
  const imageWorkspace = sliceBetween(
    workspaceSource,
    "function VendorImagesSection",
    "\nfunction FeaturedDishesSection",
  );

  assert.match(imageHandler, /createAdminVendorImages\(selectedVendor\.id, data\)/);
  assert.match(imageHandler, /filterVendorImagesForVendor\(uploadedImages, selectedVendor\.id\)/);
  assert.match(imageWorkspace, /onCreateImages\(formData\)/);
});

test("dedicated edit pages prefer the route vendor id over cached selection", () => {
  const pageSource = readRepoFile("app/admin/vendors/[id]/page.tsx");
  const consoleSource = readRepoFile("components/admin/admin-console.tsx");

  assert.match(pageSource, /<AdminConsole initialSelectedVendorId=\{id\} mode="edit" \/>/);
  assert.match(
    consoleSource,
    /initialSelectedVendorId \?\? workspaceCacheSnapshot\.selectedVendorId/,
  );
});

test("vendor workspace uses the split registry and operational workspace presentation", () => {
  const source = readRepoFile("components/admin/admin-vendor-workspace-sections.tsx");
  const workspace = sliceBetween(
    source,
    "export function EditVendorWorkspace",
    "function RatingSignalInsightsPanel",
  );

  assert.match(workspace, /className="admin-v2-workspace"/);
  assert.match(workspace, /<VendorWorkspaceHeader/);
  assert.match(workspace, /<VendorWorkspaceTabs activeTab=\{activeTab\} onChangeTab=\{setActiveTab\} \/>/);
  assert.match(workspace, /<VendorOverview/);
  assert.match(workspace, /<VendorSignals/);
  assert.match(workspace, /<VendorActivity \/>/);
  assert.match(workspace, /activeTab === "details"/);
  assert.match(workspace, /activeTab === "hours"/);
  assert.match(workspace, /activeTab === "dishes"/);
  assert.match(workspace, /activeTab === "images"/);
});

test("vendor registry exposes filters and pagination without changing vendor data sources", () => {
  const source = readRepoFile("components/admin/admin-vendor-workspace-sections.tsx");
  const registry = sliceBetween(
    source,
    "export const VendorRegistryPanel",
    "export const VendorRegistryList",
  );
  const consoleSource = readRepoFile("components/admin/admin-console.tsx");

  assert.match(registry, /className="admin-panel admin-registry-panel admin-v2-registry-panel"/);
  assert.match(registry, /name="search" placeholder="Search vendors\.\.\."/);
  assert.match(registry, /name="area" placeholder="All areas"/);
  assert.match(registry, /name="price_band"/);
  assert.match(registry, /name="is_active"/);
  assert.match(registry, /onChangePage\?: \(offset: number\) => void/);
  assert.match(registry, /aria-label="Vendor registry pagination"/);
  assert.match(consoleSource, /function changeVendorPage\(offset: number\)/);
  assert.match(consoleSource, /onChangePage=\{changeVendorPage\}/);
});

test("vendor workspace pages hide the old page header while keeping an accessible heading", () => {
  const shellSource = readRepoFile("components/admin/admin-shell.tsx");
  const vendorsPage = readRepoFile("app/admin/vendors/page.tsx");
  const editPage = readRepoFile("app/admin/vendors/[id]/page.tsx");

  assert.match(shellSource, /hideWorkspaceHeader\?: boolean/);
  assert.match(shellSource, /<h1 className="sr-only">\{title\}<\/h1>/);
  assert.match(vendorsPage, /<AdminShell\s+hideWorkspaceHeader/);
  assert.match(editPage, /<AdminShell\s+hideWorkspaceHeader/);
});
