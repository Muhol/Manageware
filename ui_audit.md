# Frontend UI Incompleteness Audit

After reviewing the codebase, I have identified the following buttons, clickable elements, and search bars that are currently serving as placeholders (missing `onClick` handlers or underlying logic), grouped by the page they appear on:

### 1. Global Navigation (`src/components/Navbar.tsx`)
- **Global Search Bar Field:** The "Search assets, properties, or orders..." input has no state or filtering logic attached.
- **Mobile Search Button:** The magnifying glass button visible on mobile screens has no `onClick` action.
- **Notifications Button:** The bell icon button has no dropdown or `onClick` action.

### 2. Dashboard (`src/app/page.tsx`)
- **Stock Alert Action Buttons:** The arrow buttons (`ArrowUpRight`) next to each low-stock alert have no click handler.
- **"Legacy View" Button:** Located under the Recent Acquisitions header.
- **Recent Acquisition Rows:** The individual acquisition cards are styled to look clickable but have no navigation or click action.

### 3. Inventory Ledger (`src/app/inventory/page.tsx`)
- **"Export" Button:** Located at the top next to "New Item".
- **Pagination Buttons:** The "Prev" and "Next" buttons at the bottom of the table.

### 4. Portfolio Analytics (`src/app/reports/page.tsx`)
- **"Generate Master Report" Button:** Located at the top right of the page.

### 5. System Audit Trail (`src/app/admin/audit/page.tsx`)
- **"Advanced Filter" Button:** Located next to the search bar.
- **"Trace" Buttons:** The chevron arrow buttons on the far right of every audit log row.

### 6. System Settings (`src/app/settings/page.tsx`)
- **"Commit Changes" Button:** Located at the top right of the page.
- **Settings Category Rows:** The 8 individual setting items under "Portfolio Configuration", "Access & Security", and "Interface Customization" look clickable but have no configuration modals attached.
- **"View Platform Certificate" Button:** Located inside the Security panel.
- **"Export System Metadata" Button:** Under Quick Actions.
- **"Re-sync Inventory Ledger" Button:** Under Quick Actions.
- **"Reset Workspace View" Button:** Under Quick Actions.

---

### Pages with Fully Implemented Interactive Elements
The following pages have **no** missing button implementations or dummy search bars (all of their CRUD actions and local search fields are fully hooked up to the FastAPI backend):
- **Procurement Ledger** (`src/app/procurement/page.tsx`)
- **Staff Directory** (`src/app/staff/page.tsx`)
