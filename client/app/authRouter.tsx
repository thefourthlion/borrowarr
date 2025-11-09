
"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { initFirebase } from "@/firebase";
import { User, getAuth } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

const LOGIN_ROUTE = "/pages/login";

// --------- routes that only authed users can see
const ACCOUNT_ROUTE = "/pages/account";

const AuthRouter = (props: any) => {
  const app = initFirebase();
  const auth = getAuth(app);
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathName = usePathname();

  // Pages that require the user to be authenticated
  const protectedRoutes = ["/pages/account", "/pages/hidden"];

  const redirect = (
    isLoading: boolean,
    firebaseUser: User | null | undefined,
  ) => {
    if (!isLoading) {
      if (firebaseUser) {
        // User is logged in
        if (pathName === LOGIN_ROUTE) {
          router.push(ACCOUNT_ROUTE); // Redirect from login to account if logged in
        }
      } else {
        // User is not logged in
        if (protectedRoutes.includes(pathName)) {
          router.push(LOGIN_ROUTE); // Redirect to login if trying to access a protected route
        }
      }
    }
  };

  useEffect(() => {
    redirect(loading, user);
  }, [loading, user, pathName]);

  if (loading) {
    return null; // Show a loader or return null while checking auth state
  } else {
    return <>{props.children}</>; // Render children when not loading
  }
};

export default AuthRouter;
