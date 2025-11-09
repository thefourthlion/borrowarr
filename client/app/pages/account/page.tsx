"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { initFirebase } from "@/firebase";
import { getAuth, updateProfile } from "firebase/auth";
import { getCheckoutUrl, getPortalUrl } from "./stripePayment";
import { getSubscriptionStatus } from "./getPremiumStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Mail, Calendar, Crown, LogOut } from "lucide-react";

export default function AccountPage() {
  const app = initFirebase();
  const auth = getAuth(app);
  const router = useRouter();

  const [userName, setUserName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [accountAge, setAccountAge] = useState<string>("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserName(user.displayName);
        setEmail(user.email);
        setAvatarUrl(user.photoURL || "");
        calculateAccountAge(
          user.metadata.creationTime || new Date().toISOString()
        );
      } else {
        router.push("/pages/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, router]);

  const calculateAccountAge = (creationTime: string) => {
    const createdAt = new Date(creationTime);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const days = diffDays % 30;

    let ageString = "";
    if (years > 0) ageString += `${years} year${years > 1 ? "s" : ""} `;
    if (remainingMonths > 0)
      ageString += `${remainingMonths} month${remainingMonths !== 1 ? "s" : ""} `;
    ageString += `${days} day${days !== 1 ? "s" : ""}`;

    setAccountAge(ageString.trim());
  };

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (auth.currentUser) {
        const activeSubscriptions = await getSubscriptionStatus(app);
        setSubscriptions(activeSubscriptions);
      }
    };

    loadSubscriptions();
  }, [app, auth.currentUser]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || !event.target.files[0]) return;
    setIsUploadingImage(true);

    try {
      const file = event.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("gid", auth.currentUser?.uid || "");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const { url } = await response.json();

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: url,
        });
        setAvatarUrl(url);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push("/pages/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleUpgradeToSubscription = async (priceId: string) => {
    const checkoutUrl = await getCheckoutUrl(app, priceId);
    router.push(checkoutUrl);
  };

  const handleManageSubscription = async () => {
    const portalUrl = await getPortalUrl(app);
    router.push(portalUrl);
  };

  if (loading) {
    return (
      <div className="p-2">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-10 h-10 border-3 border-content3 border-t-primary rounded-full animate-spin"></div>
          <p className="text-foreground opacity-70">Loading your account...</p>
        </div>
      </div>
    );
  }

  const currentPlan =
    subscriptions.length > 0 ? subscriptions[0].planName : "Free Account";

  return (
    <div className="p-1 md:p-2">
      <div className="max-w-3xl mx-auto flex flex-col gap-2 md:gap-3">
        {/* Header Section */}
        <div className="relative mb-2 md:mb-3">
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative rounded-full overflow-hidden transition-all duration-200 hover:scale-105 cursor-pointer group"
              onClick={() => document.getElementById("avatar-upload")?.click()}
            >
              <Avatar className="w-24 h-24 md:w-32 md:h-32">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl">
                  {userName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full">
                <span className="text-white text-sm font-semibold">
                  Click to change
                </span>
              </div>
            </div>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id="avatar-upload"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
            />
          </div>
        </div>

        {/* Profile Information */}
        <div className="text-center">
          <div className="bg-content1 border border-content3 rounded-2xl p-4 md:p-6 shadow-lg mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {userName}
            </h1>
            <div className="flex flex-col gap-1 mb-0">
              <div className="flex items-center justify-center gap-2 text-foreground opacity-80 text-xs md:text-sm py-1">
                <Mail className="w-4 h-4" />
                <span>{email}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-foreground opacity-80 text-xs md:text-sm py-1">
                <Calendar className="w-4 h-4" />
                <span>Member for {accountAge}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-foreground opacity-80 text-xs md:text-sm py-1">
                <Crown className="w-4 h-4" />
                <span>{currentPlan}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <Card className="bg-content1 border border-content3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5">
          <CardHeader>
            <h3 className="text-xl font-semibold text-foreground m-0">
              Subscription
            </h3>
          </CardHeader>
          <CardBody>
            <div>
              <div className="mb-3">
                <p className="text-xl md:text-2xl font-bold text-foreground m-0 mb-1">
                  {currentPlan}
                </p>
                <p className="text-foreground opacity-70 m-0">
                  {currentPlan === "Free Account"
                    ? "Upgrade to unlock premium features"
                    : "You have access to all premium features"}
                </p>
              </div>

              <div>
                {currentPlan === "Free Account" ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      color="primary"
                      onClick={() =>
                        handleUpgradeToSubscription(
                          "price_1QTsC4EWTDUOm33EAqvzOC4t"
                        )
                      }
                      className="w-full font-semibold py-2 px-4"
                    >
                      Upgrade to Premium - $12/month
                    </Button>
                    <Button
                      color="secondary"
                      onClick={() =>
                        handleUpgradeToSubscription(
                          "price_1QTsl4EWTDUOm33EWYiqr6xM"
                        )
                      }
                      className="w-full font-semibold py-2 px-4"
                    >
                      Upgrade to Extra - $18/month
                    </Button>
                  </div>
                ) : (
                  <Button
                    color="primary"
                    variant="ghost"
                    onClick={handleManageSubscription}
                    className="w-full font-semibold"
                  >
                    Manage Subscription
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Account Actions */}
        <Card className="bg-content1 border border-content3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5">
          <CardBody>
            <div className="flex justify-center">
              <Button
                color="danger"
                variant="ghost"
                onClick={handleSignOut}
                className="font-semibold py-2 px-6"
                startContent={<LogOut className="w-4 h-4" />}
              >
                Sign Out
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
