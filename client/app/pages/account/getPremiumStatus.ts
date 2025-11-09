import { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

export const getSubscriptionStatus = async (app: FirebaseApp) => {
  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("User not logged in");

  const db = getFirestore(app);
  const subscriptionsRef = collection(db, "customers", userId, "subscriptions");
  const q = query(
    subscriptionsRef,
    where("status", "in", ["trialing", "active"])
  );

  return new Promise<any[]>((resolve, reject) => {
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.docs.length === 0) {
          resolve([]);
        } else {
          const subscriptions = snapshot.docs.map((doc) => {
            const subscriptionData = doc.data();
            const planName =
              subscriptionData.items?.[0]?.price?.product?.name ||
              "Unknown Plan";

            return {
              ...subscriptionData,
              planName,
            };
          });

          resolve(subscriptions);
        }
        unsubscribe();
      },
      reject
    );
  });
};