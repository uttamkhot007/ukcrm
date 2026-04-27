import AdminTenants from "../AdminTenants";

// Platform Console wrapper — the original AdminTenants table is the canonical
// tenant directory. The PlatformLayout already provides the banner + sub-nav,
// so we just render it inside.
export default function PlatformTenants() {
  return <AdminTenants />;
}
