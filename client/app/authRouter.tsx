"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const LOGIN_ROUTE = "/pages/login";
const ACCOUNT_ROUTE = "/pages/account";

// Routes that require authentication
const protectedRoutes = ["/pages/account", "/pages/monitored", "/pages/indexers", "/pages/settings"];

const AuthRouter = (props: any) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathName = usePathname();

  useEffect(() => {
    if (loading) return; // Wait for auth check to complete

    if (user) {
        // User is logged in
      if (pathName === LOGIN_ROUTE || pathName === "/pages/register") {
        router.push(ACCOUNT_ROUTE);
        }
      } else {
        // User is not logged in
      if (protectedRoutes.some((route) => pathName.startsWith(route))) {
        router.push(LOGIN_ROUTE);
      }
    }
  }, [loading, user, pathName, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-content3 border-t-secondary rounded-full animate-spin"></div>
          <p className="text-foreground opacity-70">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{props.children}</>;
};

export default AuthRouter;
