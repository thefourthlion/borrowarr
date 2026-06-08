"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@nextui-org/button";
import { Card, CardBody } from "@nextui-org/card";
import { Chip } from "@nextui-org/chip";
import { Calendar, LogOut, User, Shield, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageContent, PageHeader } from "@/components/page-header";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
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

  const handleSignOut = () => {
    logout();
    router.push("/pages/login");
  };

  if (loading) {
    return (
      <PageContent>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-3 border-content3 border-t-secondary rounded-full animate-spin" />
        </div>
      </PageContent>
    );
  }

  if (!user) return null;

  const initial = user.username?.charAt(0).toUpperCase() || "U";
  const isAdmin = user.permissions?.admin;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        actions={
          <Button
            color="danger"
            onPress={handleSignOut}
            startContent={<LogOut className="w-4 h-4" />}
            variant="flat"
          >
            Sign Out
          </Button>
        }
        description="Manage your profile and session"
        icon={<User className="h-6 w-6" />}
        title="Account"
      />
      <PageContent>
        <div className="max-w-lg mx-auto flex flex-col items-center gap-6 pt-4">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-secondary/15 border-2 border-secondary/30 flex items-center justify-center">
            <span className="text-4xl font-bold text-secondary">{initial}</span>
          </div>

          {/* Info Card */}
          <Card className="w-full bg-content1 border border-secondary/20">
            <CardBody className="p-6 flex flex-col gap-4">
              <div className="text-center border-b border-secondary/10 pb-4">
                <h2 className="text-2xl font-bold text-secondary">
                  {user.username}
                </h2>
                {isAdmin && (
                  <div className="flex justify-center mt-2">
                    <Chip
                      color="secondary"
                      size="sm"
                      startContent={<Shield size={12} />}
                      variant="flat"
                    >
                      Administrator
                    </Chip>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-sm text-foreground/70">
                  <Calendar className="w-4 h-4 text-secondary flex-shrink-0" />
                  <span>
                    Member for <strong className="text-foreground">{accountAge}</strong>
                  </span>
                </div>
                {user.createdAt && (
                  <div className="flex items-center gap-3 text-sm text-foreground/70">
                    <Clock className="w-4 h-4 text-secondary flex-shrink-0" />
                    <span>
                      Joined{" "}
                      <strong className="text-foreground">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-foreground/70">
                  <User className="w-4 h-4 text-secondary flex-shrink-0" />
                  <span className="font-mono text-xs text-foreground/50 break-all">
                    {user.id}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Permissions Card */}
          {user.permissions && (
            <Card className="w-full bg-content1 border border-secondary/20">
              <CardBody className="p-6">
                <h3 className="text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">
                  Permissions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.permissions.admin && (
                    <Chip color="secondary" size="sm" variant="flat">Admin</Chip>
                  )}
                  {user.permissions.manage_users && (
                    <Chip color="primary" size="sm" variant="flat">Manage Users</Chip>
                  )}
                  {user.permissions.manage_requests && (
                    <Chip color="primary" size="sm" variant="flat">Manage Requests</Chip>
                  )}
                  {user.permissions.auto_approve && (
                    <Chip color="success" size="sm" variant="flat">Auto Approve</Chip>
                  )}
                  {!user.permissions.admin &&
                    !user.permissions.manage_users &&
                    !user.permissions.manage_requests &&
                    !user.permissions.auto_approve && (
                      <Chip color="default" size="sm" variant="flat">Standard User</Chip>
                    )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </PageContent>
    </div>
  );
}
