"use client";
import { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  collection,
  getFirestore,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

export const getCheckoutUrl = async (
  app: FirebaseApp,
  priceId: string,
): Promise<string> => {
  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("User is not authenticated");

  const db = getFirestore(app);
  const checkoutSessionRef = collection(
    db,
    "customers",
    userId,
    "checkout_sessions",
  );

  const docRef = await addDoc(checkoutSessionRef, {
    price: priceId,
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });

  return new Promise<string>((resolve, reject) => {
    const unsubscribe = onSnapshot(docRef, (snap) => {
      const { error, url } = snap.data() as {
        error?: { message: string };
        url?: string;
      };
      if (error) {
        unsubscribe();
        reject(new Error(`An error occurred: ${error.message}`));
      }
      if (url) {
        console.log("Stripe Checkout URL:", url);
        unsubscribe();
        resolve(url);
      }
    });
  });
};

export const getPortalUrl = async (app: FirebaseApp): Promise<string> => {
  const auth = getAuth(app);
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");

  const functions = getFunctions(app, "us-central1");
  const functionRef = httpsCallable(
    functions,
    "ext-firestore-stripe-payments-createPortalLink",
  );

  try {
    const { data } = await functionRef({
      customerId: user.uid,
      returnUrl: window.location.origin,
    });

    const portalData = data as { url: string };
    if (!portalData.url) throw new Error("No URL returned from Stripe");
    console.log("Reroute to Stripe portal: ", portalData.url);
    return portalData.url;
  } catch (error) {
    console.error("Failed to obtain Stripe portal URL:", error);
    throw error;
  }
};