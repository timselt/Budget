# Bütçe Planlama UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Budget Planning page usable end-to-end by wiring the existing-but-orphan `BudgetEntry.Quantity` field through the API, redesigning each cell as independent quantity + amount inputs, eliminating the double-click during Hierarchical → Customer-Focused tab navigation, and consolidating Revenue/Loss rows under a single product line with role badges.

**Architecture:** Backend changes are minimal — DTO additions and service/controller wiring only; the column already exists, no migration needed. Frontend introduces one new shared cell component (`BudgetCellInputs`) and updates two screens (`BudgetEntryPage` for tab state propagation, `BudgetCustomerGrid` for layout). No cross-field validation rule on the backend — empty-cell suppression stays on the frontend (matching the existing `hasContent` pattern at `BudgetEntryPage.tsx:388`). Every task is committed independently using TDD.

**Tech Stack:** .NET 10 / EF Core 10 / xUnit / NSubstitute / Testcontainers (backend); React 19 / TypeScript / Vite / Vitest / React Testing Library / TanStack Query (frontend).

---

## File Structure

**Backend (modified):**

- `src/BudgetTracker.Application/BudgetEntries/CreateBudgetEntryRequest.cs` — add `Quantity` field
- `src/BudgetTracker.Application/BudgetEntries/BudgetEntryUpsert.cs` — add `Quantity` field
- `src/BudgetTracker.Application/BudgetEntries/BulkUpdateBudgetEntriesRequest.cs` — add `Quantity` per entry
- `src/BudgetTracker.Application/BudgetEntries/IBudgetEntryService.cs` and impl — pass Quantity through upsert
- `src/BudgetTracker.Application/BudgetEntries/BudgetEntryDto.cs` — confirm Quantity exposed
- `src/BudgetTracker.Api/Controllers/BudgetVersionsController.cs` — wire Quantity in POST/PUT request handlers

**Backend (tests, new or modified):**

- `tests/BudgetTracker.IntegrationTests/Persistence/BudgetEntryRoundtripTests.cs` — round-trip Quantity through DB
- `tests/BudgetTracker.IntegrationTests/Controllers/BudgetVersionsControllerTests.cs` — extend with Quantity scenarios

**Frontend (new):**

- `client/src/components/budget-planning/BudgetCellInputs.tsx` — vertical quantity + amount input cell
- `client/src/components/budget-planning/BudgetCellInputs.test.tsx`

**Frontend (modified):**

- `client/src/components/budget-planning/BudgetCustomerGrid.tsx` — adopt new cell, Revenue/Loss row layout
- `client/src/components/budget-planning/BudgetCustomerGrid.test.tsx` — update tests
- `client/src/pages/BudgetEntryPage.tsx` — tab pre-select (lines ~140-175 area, mode propagation), update `hasContent` to also consider quantity
- `client/src/pages/BudgetEntryPage.test.tsx` — add tab pre-select test
- `client/src/lib/api.ts` (BudgetEntry types) — add `quantity?: number | null`

---

## Phase 1 — Backend: wire Quantity through DTOs and service

### Task 1.1 — Add `Quantity` to `CreateBudgetEntryRequest` and DTO round-trip

**Files:**
- Modify: `src/BudgetTracker.Application/BudgetEntries/CreateBudgetEntryRequest.cs`
- Modify: `src/BudgetTracker.Application/BudgetEntries/BudgetEntryDto.cs` (verify Quantity exposed)
- Test: `tests/BudgetTracker.IntegrationTests/Persistence/BudgetEntryRoundtripTests.cs` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/BudgetTracker.IntegrationTests/Persistence/BudgetEntryRoundtripTests.cs`:

```csharp
using BudgetTracker.Application.BudgetEntries;
using BudgetTracker.IntegrationTests.Fixtures;
using FluentAssertions;
using Xunit;

namespace BudgetTracker.IntegrationTests.Persistence;

public sealed class BudgetEntryRoundtripTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _db;

    public BudgetEntryRoundtripTests(DatabaseFixture db) => _db = db;

    [Fact]
    public async Task UpsertWithQuantity_PersistsAndReturnsQuantity()
    {
        // Arrange: a draft version + customer with a contract (use existing test seed helpers)
        var (versionId, customerId, contractId) = await _db.SeedDraftBudgetAsync();

        var upsert = new BudgetEntryUpsert(
            Id: null,
            CustomerId: customerId,
            Month: 1,
            EntryType: "REVENUE",
            AmountOriginal: 5500m,
            CurrencyCode: "TRY",
            ContractId: contractId,
            ProductId: null,
            Quantity: 10);

        // Act
        var saved = await _db.Service.UpsertAsync(versionId, upsert, actorUserId: 1, default);

        // Assert
        saved.Quantity.Should().Be(10);
        saved.AmountOriginal.Should().Be(5500m);

        var reread = await _db.GetEntryAsync(saved.Id);
        reread.Quantity.Should().Be(10);
    }

    [Fact]
    public async Task UpsertWithoutQuantity_PersistsAsNull()
    {
        var (versionId, customerId, contractId) = await _db.SeedDraftBudgetAsync();

        var upsert = new BudgetEntryUpsert(
            Id: null,
            CustomerId: customerId,
            Month: 2,
            EntryType: "REVENUE",
            AmountOriginal: 6600m,
            CurrencyCode: "TRY",
            ContractId: contractId,
            ProductId: null,
            Quantity: null);

        var saved = await _db.Service.UpsertAsync(versionId, upsert, actorUserId: 1, default);

        saved.Quantity.Should().BeNull();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails (compile error expected)**

Run: `dotnet test --filter FullyQualifiedName~BudgetEntryRoundtripTests -v normal`
Expected: Compile error — `BudgetEntryUpsert` does not have a `Quantity` parameter; `BudgetEntryDto` may not have `Quantity` either.

- [ ] **Step 3: Add `Quantity` to `CreateBudgetEntryRequest`**

Replace `src/BudgetTracker.Application/BudgetEntries/CreateBudgetEntryRequest.cs` with:

```csharp
namespace BudgetTracker.Application.BudgetEntries;

public sealed record CreateBudgetEntryRequest(
    int CustomerId,
    int Month,
    string EntryType,
    decimal AmountOriginal,
    string CurrencyCode,
    int? Quantity = null);
```

- [ ] **Step 4: Verify `BudgetEntryDto.cs` exposes `Quantity`**

Read `src/BudgetTracker.Application/BudgetEntries/BudgetEntryDto.cs`. If `Quantity` is missing, add it as `int? Quantity` matching the entity. If it's already there, no change needed.

- [ ] **Step 5: Commit (interim — service still missing Quantity)**

```bash
git add src/BudgetTracker.Application/BudgetEntries/CreateBudgetEntryRequest.cs \
        src/BudgetTracker.Application/BudgetEntries/BudgetEntryDto.cs \
        tests/BudgetTracker.IntegrationTests/Persistence/BudgetEntryRoundtripTests.cs
git commit -m "test(budget-entries): pin Quantity round-trip behavior (red)"
```

(Test still fails at this point — that's OK; commit pins the contract.)

---

### Task 1.2 — Add `Quantity` to `BudgetEntryUpsert` and `IBudgetEntryService`

**Files:**
- Modify: `src/BudgetTracker.Application/BudgetEntries/BudgetEntryUpsert.cs`
- Modify: `src/BudgetTracker.Application/BudgetEntries/IBudgetEntryService.cs`
- Modify: implementation file (find with `grep -rln "class.*BudgetEntryService" src/`)

- [ ] **Step 1: Update `BudgetEntryUpsert`**

Replace `BudgetEntryUpsert.cs`:

```csharp
namespace BudgetTracker.Application.BudgetEntries;

public sealed record BudgetEntryUpsert(
    int? Id,
    int CustomerId,
    int Month,
    string EntryType,
    decimal AmountOriginal,
    string CurrencyCode,
    int? ContractId = null,
    int? ProductId = null,
    int? Quantity = null);
```

- [ ] **Step 2: Update `IBudgetEntryService` upsert signature if needed**

Open `IBudgetEntryService.cs`. If `UpsertAsync` already takes `BudgetEntryUpsert` (which now contains Quantity), no signature change. If it takes individual parameters, add `int? quantity`. Document either case in the commit.

- [ ] **Step 3: Update implementation to persist Quantity**

In the service implementation, locate the call to `BudgetEntry.Create(...)` or `entry.UpdateAmount(...)` (or equivalent). Add the Quantity argument. Example pattern (adjust to actual code):

```csharp
var entry = BudgetEntry.Create(
    versionId, upsert.CustomerId, upsert.Month, upsert.EntryType,
    upsert.AmountOriginal, upsert.CurrencyCode,
    quantity: upsert.Quantity,
    contractId: upsert.ContractId,
    productId: upsert.ProductId,
    actorUserId);
```

If `BudgetEntry.Create` doesn't accept `quantity`, look for an `UpdateQuantity(int?)` method on the entity — if neither exists, add a property-setter via a method on the entity (private setter is on the entity already; add `public void SetQuantity(int? value) => Quantity = value;` or pass through constructor).

- [ ] **Step 4: Run tests — they should now pass**

Run: `dotnet test --filter FullyQualifiedName~BudgetEntryRoundtripTests -v normal`
Expected: Both tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/BudgetTracker.Application/BudgetEntries/BudgetEntryUpsert.cs \
        src/BudgetTracker.Application/BudgetEntries/IBudgetEntryService.cs \
        src/BudgetTracker.Application/BudgetEntries/<service-impl>.cs \
        src/BudgetTracker.Core/Entities/BudgetEntry.cs
git commit -m "feat(budget-entries): persist Quantity through Upsert path (green)"
```

---

### Task 1.3 — Wire `Quantity` in `BulkUpdateBudgetEntriesRequest` and the controller

**Files:**
- Modify: `src/BudgetTracker.Application/BudgetEntries/BulkUpdateBudgetEntriesRequest.cs`
- Modify: `src/BudgetTracker.Api/Controllers/BudgetVersionsController.cs`
- Test: `tests/BudgetTracker.IntegrationTests/Controllers/BudgetVersionsControllerTests.cs`

- [ ] **Step 1: Write the failing controller test**

Add a test (in the existing class) that posts a bulk update with quantity and verifies it round-trips through the controller:

```csharp
[Fact]
public async Task BulkUpdate_WithQuantity_PersistsAndReturnsQuantity()
{
    var (versionId, customerId) = await SeedDraftBudgetAsync();

    var request = new
    {
        Entries = new[]
        {
            new
            {
                customerId = customerId,
                month = 1,
                entryType = "REVENUE",
                amountOriginal = 5500m,
                currencyCode = "TRY",
                quantity = 10
            }
        }
    };

    var response = await _client.PostAsJsonAsync(
        $"/api/budget-versions/{versionId}/entries/bulk", request);

    response.EnsureSuccessStatusCode();

    var get = await _client.GetFromJsonAsync<List<BudgetEntryDto>>(
        $"/api/budget-versions/{versionId}/entries");

    var entry = get!.Single(e => e.CustomerId == customerId && e.Month == 1);
    entry.Quantity.Should().Be(10);
    entry.AmountOriginal.Should().Be(5500m);
}
```

- [ ] **Step 2: Run the test — it should fail (Quantity dropped at API boundary)**

Run: `dotnet test --filter FullyQualifiedName~BudgetVersionsControllerTests.BulkUpdate_WithQuantity -v normal`
Expected: Test fails because `BulkUpdateBudgetEntriesRequest` doesn't carry Quantity, or the controller doesn't pass it through.

- [ ] **Step 3: Add Quantity to `BulkUpdateBudgetEntriesRequest`**

Open the file and add `int? Quantity = null` to the per-entry record. Example (adjust to actual shape):

```csharp
public sealed record BulkUpdateBudgetEntryItem(
    int? Id,
    int CustomerId,
    int Month,
    string EntryType,
    decimal AmountOriginal,
    string CurrencyCode,
    int? ContractId = null,
    int? ProductId = null,
    int? Quantity = null);
```

- [ ] **Step 4: In `BudgetVersionsController.cs`, ensure the bulk handler maps Quantity**

Locate the bulk update action method (search for `Bulk` + `BudgetEntry`). Where it constructs `BudgetEntryUpsert` from the request items, add `Quantity: item.Quantity`.

- [ ] **Step 5: Run the test — it should pass**

Run: `dotnet test --filter FullyQualifiedName~BudgetVersionsControllerTests.BulkUpdate_WithQuantity -v normal`
Expected: Pass.

- [ ] **Step 6: Run the full backend test suite to catch regressions**

Run: `dotnet test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/BudgetTracker.Application/BudgetEntries/BulkUpdateBudgetEntriesRequest.cs \
        src/BudgetTracker.Api/Controllers/BudgetVersionsController.cs \
        tests/BudgetTracker.IntegrationTests/Controllers/BudgetVersionsControllerTests.cs
git commit -m "feat(api): accept Quantity in bulk budget-entry updates"
```

---

## Phase 2 — Frontend: new `BudgetCellInputs` shared component

### Task 2.1 — Create `BudgetCellInputs.tsx` with tests

**Files:**
- Create: `client/src/components/budget-planning/BudgetCellInputs.tsx`
- Create: `client/src/components/budget-planning/BudgetCellInputs.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `BudgetCellInputs.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BudgetCellInputs } from './BudgetCellInputs'

describe('BudgetCellInputs', () => {
  it('shows placeholders when both fields empty', () => {
    render(
      <BudgetCellInputs
        quantity={null}
        amount=""
        onChange={vi.fn()}
        showQuantity={true}
      />,
    )
    expect(screen.getByPlaceholderText('Adet')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tutar')).toBeInTheDocument()
  })

  it('renders quantity when provided', () => {
    render(
      <BudgetCellInputs
        quantity={10}
        amount=""
        onChange={vi.fn()}
        showQuantity={true}
      />,
    )
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('emits onChange with new quantity when user types in quantity field', () => {
    const onChange = vi.fn()
    render(
      <BudgetCellInputs
        quantity={null}
        amount=""
        onChange={onChange}
        showQuantity={true}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('Adet'), { target: { value: '15' } })
    expect(onChange).toHaveBeenCalledWith({ quantity: 15, amount: '' })
  })

  it('emits onChange with new amount when user types in amount field', () => {
    const onChange = vi.fn()
    render(
      <BudgetCellInputs
        quantity={null}
        amount=""
        onChange={onChange}
        showQuantity={true}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText('Tutar'), { target: { value: '5500' } })
    expect(onChange).toHaveBeenCalledWith({ quantity: null, amount: '5500' })
  })

  it('hides quantity field when showQuantity=false (loss row)', () => {
    render(
      <BudgetCellInputs
        quantity={null}
        amount="3200"
        onChange={vi.fn()}
        showQuantity={false}
      />,
    )
    expect(screen.queryByPlaceholderText('Adet')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Tutar')).toBeInTheDocument()
  })

  it('clears quantity when user empties the field', () => {
    const onChange = vi.fn()
    render(
      <BudgetCellInputs
        quantity={10}
        amount="5500"
        onChange={onChange}
        showQuantity={true}
      />,
    )
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith({ quantity: null, amount: '5500' })
  })
})
```

- [ ] **Step 2: Run the test — it fails because component doesn't exist**

Run: `cd client && pnpm test BudgetCellInputs`
Expected: Module not found.

- [ ] **Step 3: Implement `BudgetCellInputs.tsx`**

```tsx
import { ChangeEvent } from 'react'

export interface BudgetCellValue {
  quantity: number | null
  amount: string
}

export interface BudgetCellInputsProps {
  quantity: number | null
  amount: string
  onChange: (next: BudgetCellValue) => void
  showQuantity: boolean
  disabled?: boolean
}

export function BudgetCellInputs({
  quantity,
  amount,
  onChange,
  showQuantity,
  disabled,
}: BudgetCellInputsProps) {
  const handleQuantity = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim()
    const next = raw === '' ? null : Number(raw)
    onChange({ quantity: Number.isFinite(next as number) || next === null ? next : quantity, amount })
  }
  const handleAmount = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ quantity, amount: e.target.value })
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[110px]">
      {showQuantity && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Adet"
            value={quantity ?? ''}
            onChange={handleQuantity}
            disabled={disabled}
            className="w-16 px-2 py-1 text-sm text-right rounded border border-default focus:border-accent focus:outline-none"
          />
          <span className="text-[10px] uppercase tracking-wide text-muted">adet</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          placeholder="Tutar"
          value={amount}
          onChange={handleAmount}
          disabled={disabled}
          className="w-16 px-2 py-1 text-sm text-right rounded border border-default focus:border-accent focus:outline-none"
        />
        <span className="text-[10px] uppercase tracking-wide text-muted">tutar</span>
      </div>
    </div>
  )
}
```

> Note: Tailwind class names like `text-muted`, `border-default`, `focus:border-accent` follow the project's existing token system (see PR #49). If any token is missing, fall back to the closest existing one and call it out in the PR description.

- [ ] **Step 4: Run the tests — they should all pass**

Run: `cd client && pnpm test BudgetCellInputs`
Expected: 6 passing tests.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/budget-planning/BudgetCellInputs.tsx \
        client/src/components/budget-planning/BudgetCellInputs.test.tsx
git commit -m "feat(budget-planning): add BudgetCellInputs vertical quantity/amount cell"
```

---

## Phase 3 — Frontend: integrate cell + Revenue/Loss layout in `BudgetCustomerGrid`

### Task 3.1 — Adopt `BudgetCellInputs` in `BudgetCustomerGrid` and consolidate Revenue/Loss rows

**Files:**
- Modify: `client/src/components/budget-planning/BudgetCustomerGrid.tsx`
- Modify: `client/src/components/budget-planning/BudgetCustomerGrid.test.tsx`
- Modify: `client/src/lib/api.ts` (or the file that defines BudgetEntry types — locate via `grep -rln "BudgetEntryDto\|amountOriginal" client/src/lib`)

- [ ] **Step 1: Update the BudgetEntry type to include Quantity**

In the API types file, find the entry shape and add:

```ts
export interface BudgetEntry {
  // ... existing fields
  quantity: number | null
}
```

If the type uses Zod or a similar schema validator, add `quantity: z.number().nullable()` accordingly.

- [ ] **Step 2: Write the failing layout test**

Update `BudgetCustomerGrid.test.tsx` (or add a new test) that asserts:

```tsx
it('renders product row once with revenue + loss as two horizontal rows joined by rowspan', () => {
  render(<BudgetCustomerGrid {...sompoYolYardimProps} />)

  // Product header appears exactly once
  const productCells = screen.getAllByText('Yol Yardım')
  expect(productCells).toHaveLength(1)

  // Contract code appears exactly once (was twice in the old layout)
  const contractCodes = screen.getAllByText(/TA1SGK0B/)
  expect(contractCodes).toHaveLength(1)

  // Two role badges visible: Gelir and Hasar
  expect(screen.getByText('Gelir')).toBeInTheDocument()
  expect(screen.getByText('Hasar')).toBeInTheDocument()

  // Hasar row has no quantity input (only amount)
  const hasarRow = screen.getByText('Hasar').closest('tr')!
  // eslint-disable-next-line testing-library/no-node-access
  expect(hasarRow.querySelectorAll('input[placeholder="Adet"]')).toHaveLength(0)
  // eslint-disable-next-line testing-library/no-node-access
  expect(hasarRow.querySelectorAll('input[placeholder="Tutar"]')).toHaveLength(12)
})

it('shows formula notes on Teknik Marj and Loss Ratio rows', () => {
  render(<BudgetCustomerGrid {...sompoYolYardimProps} />)
  expect(screen.getByText(/Teknik Marj/)).toHaveTextContent('Gelir − Hasar')
  expect(screen.getByText(/Loss Ratio/)).toHaveTextContent('Hasar / Gelir')
})
```

- [ ] **Step 3: Run the test — it fails (current layout has product twice + amount-only cells)**

Run: `cd client && pnpm test BudgetCustomerGrid`
Expected: Failures on product count, contract code count, and badge presence.

- [ ] **Step 4: Refactor `BudgetCustomerGrid.tsx`**

Restructure the grid so that for each product:

```tsx
<tr>
  <td rowSpan={2} className="product-header">
    <strong>{product.name}</strong>
    <span className="kod">{product.contractCode}</span>
  </td>
  {months.map((m) => (
    <td key={`gelir-${m}`}>
      <RoleBadge kind="revenue" />
      <BudgetCellInputs
        quantity={revenueByMonth[m]?.quantity ?? null}
        amount={revenueByMonth[m]?.amount ?? ''}
        onChange={(v) => updateCell({ entryType: 'REVENUE', month: m }, v)}
        showQuantity={true}
      />
    </td>
  ))}
</tr>
<tr>
  {months.map((m) => (
    <td key={`hasar-${m}`}>
      <RoleBadge kind="loss" />
      <BudgetCellInputs
        quantity={null}
        amount={lossByMonth[m]?.amount ?? ''}
        onChange={(v) => updateCell({ entryType: 'LOSS', month: m }, { ...v, quantity: null })}
        showQuantity={false}
      />
    </td>
  ))}
</tr>
```

Add a small `RoleBadge` component (inline or extracted) with two variants:

```tsx
function RoleBadge({ kind }: { kind: 'revenue' | 'loss' }) {
  const styles = kind === 'revenue'
    ? 'bg-status-revenue-soft text-status-revenue'
    : 'bg-status-loss-soft text-status-loss'
  return (
    <span className={`inline-block px-2 py-0.5 mb-1 text-[10px] uppercase tracking-wide font-semibold rounded ${styles}`}>
      {kind === 'revenue' ? 'Gelir' : 'Hasar'}
    </span>
  )
}
```

Update the Teknik Marj and Loss Ratio summary rows so the formula appears in muted text:

```tsx
<tr><td>Teknik Marj <span className="text-muted text-xs">(Gelir − Hasar)</span></td>{...}</tr>
<tr><td>Loss Ratio <span className="text-muted text-xs">(Hasar / Gelir)</span></td>{...}</tr>
```

- [ ] **Step 5: Update `hasContent` logic to consider quantity**

In `BudgetEntryPage.tsx` around line 388, change:

```tsx
const hasContent = cell.amount.trim() !== ''
```

to:

```tsx
const hasContent = cell.amount.trim() !== '' || cell.quantity != null
```

Also update the cell state shape to track quantity alongside amount (the `GridValues` type / cell map). Pass quantity through the `updateCell` and `createBudgetEntry` paths.

- [ ] **Step 6: Run the layout test — it passes**

Run: `cd client && pnpm test BudgetCustomerGrid`
Expected: All assertions pass.

- [ ] **Step 7: Run the full client test suite**

Run: `cd client && pnpm test`
Expected: No regressions.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/budget-planning/BudgetCustomerGrid.tsx \
        client/src/components/budget-planning/BudgetCustomerGrid.test.tsx \
        client/src/pages/BudgetEntryPage.tsx \
        client/src/lib/api.ts
git commit -m "feat(budget-planning): consolidate revenue/loss rows + adopt BudgetCellInputs"
```

---

## Phase 4 — Frontend: tab pre-select navigation

### Task 4.1 — Pre-select customer when switching from Hierarchical to Customer-Focused

**Files:**
- Modify: `client/src/pages/BudgetEntryPage.tsx`
- Modify: `client/src/pages/BudgetEntryPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `BudgetEntryPage.test.tsx`:

```tsx
it('pre-selects customer in Customer-Focused tab when chosen in Hierarchical tab', async () => {
  const user = userEvent.setup()
  render(<BudgetEntryPageWithProviders />)

  // Wait for tree to load
  await screen.findByText('Sompo Sigorta')

  // Click Sompo in the Hierarchical tab
  await user.click(screen.getByText('Sompo Sigorta'))

  // The view should switch to Customer-Focused, pre-selected on Sompo,
  // showing the product matrix directly (no second customer list)
  expect(screen.getByRole('tab', { name: /Müşteri Odaklı/i })).toHaveAttribute(
    'aria-selected', 'true',
  )
  expect(screen.queryByText(/Müşteri seç/i)).not.toBeInTheDocument()
  expect(screen.getByText('Yol Yardım')).toBeInTheDocument()

  // The "Müşteri Değiştir" back button is available
  expect(screen.getByRole('button', { name: /Müşteri Değiştir/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test — it fails (current behavior shows the customer list again)**

Run: `cd client && pnpm test BudgetEntryPage`
Expected: Failure on `Müşteri seç` text being present, or product not directly visible.

- [ ] **Step 3: Modify the mode-switch effect in `BudgetEntryPage.tsx`**

Locate the effect around lines 140-175 that handles `mode === 'customer'` initialization. Currently it picks the first customer if none is selected. Change it so that when a customer is clicked in `tree` mode, the selection propagates:

```tsx
// In the tree-row click handler, set the customer-focused state before switching mode
const handleTreeCustomerClick = (segmentId: number, customerId: number) => {
  setCustomerModeSegmentId(segmentId)
  setCustomerModeCustomerId(customerId)
  setMode('customer')
}
```

Then in the customer-focused render, when both IDs are set, skip the customer-list step and render the product matrix directly. Add the back button:

```tsx
{mode === 'customer' && customerModeCustomerId !== null && (
  <button
    type="button"
    className="btn-secondary"
    onClick={() => {
      setCustomerModeCustomerId(null)
      setCustomerModeSegmentId(null)
    }}
  >
    Müşteri Değiştir
  </button>
)}
```

- [ ] **Step 4: Run the test — it passes**

Run: `cd client && pnpm test BudgetEntryPage`
Expected: Pass.

- [ ] **Step 5: Run the full client test suite**

Run: `cd client && pnpm test`
Expected: No regressions.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/BudgetEntryPage.tsx \
        client/src/pages/BudgetEntryPage.test.tsx
git commit -m "feat(budget-planning): pre-select customer on tab switch (no double click)"
```

---

## Phase 5 — Manual acceptance test

### Task 5.1 — Manual end-to-end smoke test

This is not an automated step. It is the runbook the engineer (or product owner) executes to confirm the work.

- [ ] **Step 1: Start the system**

Run (from repo root): `docker compose -f docker-compose.dev.yml up -d`
Run (in one terminal): `dotnet run --project src/BudgetTracker.Api`
Run (in another terminal): `cd client && pnpm dev`

- [ ] **Step 2: Login and navigate**

Open http://localhost:3000 — login with `admin@tag.local` / `Devpass!2026` — go to Bütçe Çalışması > Bütçe Planlama.

- [ ] **Step 3: Versiyonlar tab — confirm 2026 V0 Taslak still exists (or create one)**

The version created during the original test session (`2026 V0 — Taslak`) should be there. If not, click `+ Yeni Taslak`.

- [ ] **Step 4: Hierarchical tab — confirm pre-select works**

Switch to Hiyerarşik Planlama. Find Sompo Sigorta, click it. The view should switch to Müşteri Odaklı tab and Sompo's product matrix (Yol Yardım row) should be open directly — **no second customer list**. A `Müşteri Değiştir` button is visible.

- [ ] **Step 5: New cell layout — confirm independent quantity/amount inputs**

In Yol Yardım row → Gelir badge cell for January:

- Enter `10` in the **Adet** input → Tab away. The amount input should remain empty (no auto-calc).
- Enter `5500` in the **Tutar** input.
- Click **Tüm Değişiklikleri Kaydet** at the top.
- The KPI bar should reflect the new revenue (`Yıllık Gelir` includes 5.500 TRY).

- [ ] **Step 6: Amount-only cell — confirm null quantity is OK**

In February for the same product:

- Leave **Adet** empty.
- Enter `5500` in **Tutar**. Save.
- Reload the page. The cell should still show only the amount; no quantity.

- [ ] **Step 7: Loss row — confirm no quantity input**

In the Yol Yardım row → Hasar badge cell for January:

- The cell should show **only** a Tutar input (no Adet).
- Enter `3200`. Save.
- Teknik Marj for January should compute as `5500 − 3200 = 2300`.
- Loss Ratio for January should compute as `3200 / 5500 ≈ 58,2%`.

- [ ] **Step 8: Empty-cell suppression**

In March for Yol Yardım Gelir, leave both Adet and Tutar empty. Save. Reload. No phantom 0/0 entry should appear; the cell stays empty.

- [ ] **Step 9: Open the PR**

After all phase commits land:

```bash
git push origin feat/budget-planning-ux-fixes
gh pr create --title "feat: Budget planning UX fixes (cell layout, tab pre-select, revenue/loss consolidation)" \
  --body "$(cat docs/superpowers/specs/2026-04-28-budget-planning-ux-fixes-design.md | head -40)"
```

---

## Notes for the engineer

- The `BudgetEntry.Quantity` field already exists on the entity and DB schema. Your job is to wire it through the API/DTO/service layers — no migration.
- Empty-cell suppression must consider quantity: the existing `hasContent` check at `BudgetEntryPage.tsx:388` is the single source of truth for "is this cell worth saving?"
- Do not auto-calculate `amount = quantity * unitPrice` on the client. The user explicitly rejected this; the two fields are independent.
- The Hasar (loss) row never has a quantity input — its `showQuantity` prop is always `false`.
- Tailwind tokens follow the project token system from PR #49; if a token like `bg-status-revenue-soft` doesn't exist, use the nearest available (e.g. `bg-danger-soft text-danger`) and note it.
- After Phase 4 commits, rebase onto `main` if PR #49 has merged (the launchSettings port fix lives there).
