"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Mail, Calendar, LogOut, User, Upload } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, logout, updateUser } = useAuth();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [accountAge, setAccountAge] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
        router.push("/pages/login");
      }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.createdAt) {
      calculateAccountAge(user.createdAt);
    }
  }, [user]);

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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || !event.target.files[0] || !user) return;
    setIsUploadingImage(true);

    try {
      const file = event.target.files[0];
      // In a real app, you'd upload to a storage service
      // For now, we'll use a placeholder or data URL
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await updateUser({ avatarUrl: base64String });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSignOut = () => {
    logout();
      router.push("/pages/login");
  };

  if (loading) {
    return (
      <div className="p-2">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-10 h-10 border-3 border-content3 border-t-secondary rounded-full animate-spin"></div>
          <p className="text-foreground opacity-70">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="text-2xl bg-secondary/10 text-secondary">
                  {user.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full">
                <Upload className="w-5 h-5 text-white" />
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
          <Card className="bg-content1 border border-secondary/20 shadow-lg mb-3">
            <CardBody className="p-4 md:p-6">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent mb-2">
                {user.username}
            </h1>
            <div className="flex flex-col gap-1 mb-0">
                <div className="flex items-center justify-center gap-2 text-foreground/80 text-xs md:text-sm py-1">
                  <Mail className="w-4 h-4 text-secondary" />
                  <span>{user.email}</span>
              </div>
                <div className="flex items-center justify-center gap-2 text-foreground/80 text-xs md:text-sm py-1">
                  <Calendar className="w-4 h-4 text-secondary" />
                <span>Member for {accountAge}</span>
              </div>
                <div className="flex items-center justify-center gap-2 text-foreground/80 text-xs md:text-sm py-1">
                  <User className="w-4 h-4 text-secondary" />
                  <span>ID: {user.id}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Account Actions */}
        <Card className="bg-content1 border border-secondary/20 shadow-lg">
          <CardBody>
            <div className="flex justify-center">
              <Button
                color="danger"
                variant="flat"
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
