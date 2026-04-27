import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { hardReloadLatestBuild } from "@/lib/cache-cleanup";

const PLATFORM_ROUTES = new Set([
  "/admin/platform",
  "/admin/platform/",
  "/admin/platform/tenants",
  "/admin/platform/users",
  "/admin/platform/licenses",
  "/admin/platform/integrations",
  "/admin/platform/status",
]);

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (!PLATFORM_ROUTES.has(location.pathname)) return;
    const key = `not-found-recovered:${location.pathname}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void hardReloadLatestBuild(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <div className="flex items-center justify-center gap-3">
          <a href="/" className="text-primary underline hover:text-primary/90">
            Return to Home
          </a>
          {PLATFORM_ROUTES.has(location.pathname) && (
            <Button size="sm" onClick={() => hardReloadLatestBuild(location.pathname + location.search)}>
              Hard reload latest build
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
