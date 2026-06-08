"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@nextui-org/button";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Input } from "@nextui-org/input";
import { Spinner } from "@nextui-org/spinner";
import { Chip } from "@nextui-org/chip";
import { Switch } from "@nextui-org/switch";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/modal";
import {
  Users as UsersIcon,
  Plus,
  Search,
  Trash2,
  Edit2,
  Shield,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageContent, PageHeader } from "@/components/page-header";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

interface UserPermissions {
  admin: boolean;
  manage_users: boolean;
  request: boolean;
  auto_approve: boolean;
  manage_requests: boolean;
}

interface User {
  id: string;
  username: string;
  permissions: UserPermissions;
  createdAt: string;
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const canManageUsers = Boolean(
    currentUser?.permissions?.admin || currentUser?.permissions?.manage_users,
  );
  const isAdmin = Boolean(currentUser?.permissions?.admin);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [publicRegistrationEnabled, setPublicRegistrationEnabled] =
    useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    permissions: {
      admin: false,
      manage_users: false,
      request: true,
      auto_approve: false,
      manage_requests: false,
    } as UserPermissions,
  });

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({ show: false, type: "success", message: "" });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${API_BASE_URL}/api/Users/read`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.data || []);
    } catch (error: any) {
      if (error.response?.status !== 403) {
        console.error("Error fetching users:", error);
      }
      showNotification("error", "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const token = localStorage.getItem("accessToken");
      const response = await axios.get(`${API_BASE_URL}/api/Settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPublicRegistrationEnabled(
        response.data.publicRegistrationEnabled ?? true,
      );
    } catch (error: any) {
      if (error.response?.status !== 403) {
        console.error("Error fetching settings:", error);
      }
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (!canManageUsers) {
      setLoading(false);
      setLoadingSettings(false);
      return;
    }

    fetchUsers();
    fetchSettings();
  }, [canManageUsers, fetchUsers, fetchSettings]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ ...notification, show: false }), 3000);
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: "",
        permissions: { ...user.permissions, request: true },
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        password: "",
        permissions: {
          admin: false,
          manage_users: false,
          request: true,
          auto_approve: false,
          manage_requests: false,
        },
      });
    }
    onOpen();
  };

  const handleSaveUser = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("accessToken");

      if (editingUser) {
        // Update existing user
        const updateData: any = {
          username: formData.username,
          permissions: { ...formData.permissions, request: true },
        };
        if (formData.password) {
          updateData.password = formData.password;
        }

        await axios.put(
          `${API_BASE_URL}/api/Users/update/${editingUser.id}`,
          updateData,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        showNotification("success", "User updated successfully");
      } else {
        // Create new user
        await axios.post(
          `${API_BASE_URL}/api/Users/create`,
          {
            ...formData,
            permissions: { ...formData.permissions, request: true },
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        showNotification("success", "User created successfully");
      }

      onClose();
      fetchUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      showNotification(
        "error",
        error.response?.data?.error || "Failed to save user",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`${API_BASE_URL}/api/Users/delete/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotification("success", "User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      showNotification("error", error.response?.data?.error || "Failed to delete user");
    }
  };

  const handleTogglePublicRegistration = async (enabled: boolean) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(
        `${API_BASE_URL}/api/Settings`,
        { publicRegistrationEnabled: enabled },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPublicRegistrationEnabled(enabled);
      showNotification(
        "success",
        `Public registration ${enabled ? "enabled" : "disabled"}`,
      );
    } catch (error: any) {
      console.error("Error updating registration setting:", error);
      showNotification("error", "Failed to update registration setting");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const PermissionSwitch = ({
    label,
    permissionKey,
    description,
  }: {
    label: string;
    permissionKey: keyof UserPermissions;
    description?: string;
  }) => (
    <div className="flex items-center justify-between p-3 bg-content2 rounded-lg border border-secondary/20">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs text-foreground/60">{description}</span>
        )}
      </div>
      <Switch
        color="secondary"
        isSelected={formData.permissions[permissionKey]}
        onValueChange={(checked) =>
          setFormData((prev) => ({
            ...prev,
            permissions: { ...prev.permissions, [permissionKey]: checked },
          }))
        }
        size="sm"
      />
    </div>
  );

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          description="Manage users and their permissions"
          icon={<UsersIcon className="h-6 w-6" />}
          title="Users"
        />
        <PageContent>
          <Card className="border border-secondary/20 bg-content1 max-w-2xl mx-auto">
            <CardBody className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Access Restricted</h3>
              <p className="text-foreground/60">
                Only administrators or users with manage-users permission can
                access this page.
              </p>
            </CardBody>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        actions={
          <Button
            className="btn-glow"
            color="secondary"
            onPress={() => handleOpenModal()}
            startContent={<Plus size={18} />}
          >
            Create User
          </Button>
        }
        description="Manage users and their permissions"
        icon={<UsersIcon className="h-6 w-6" />}
        title="Users"
      />

      {/* Content */}
      <PageContent>
        {/* Registration Toggle Card */}
        <Card className="mb-6 border border-secondary/20 bg-content1">
          <CardBody className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">Public Registration</h3>
              <p className="text-sm text-foreground/60">
                {publicRegistrationEnabled
                  ? "Anyone can create an account on the register page"
                  : "Only admins can create new user accounts"}
              </p>
            </div>
            <Switch
              color="secondary"
              isDisabled={loadingSettings || !isAdmin}
              isSelected={publicRegistrationEnabled}
              onValueChange={handleTogglePublicRegistration}
              size="lg"
            />
          </CardBody>
        </Card>

        {/* Search */}
        <div className="mb-6">
          <Input
            classNames={{
              inputWrapper:
                "bg-content2 border border-secondary/20 hover:border-secondary/40",
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            startContent={<Search className="text-default-400" size={18} />}
            value={searchQuery}
          />
        </div>

        {/* Notification */}
        {notification.show && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-success/10 border-success/20 text-success"
                : "bg-danger/10 border-danger/20 text-danger"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : (
              <XCircle size={18} />
            )}
            {notification.message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner color="secondary" size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <Card
                className="card-interactive border border-secondary/20 bg-content1"
                key={user.id}
              >
                <CardHeader className="flex justify-between items-start pb-2">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-lg">
                      {user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-none">
                        {user.username}
                      </h3>
                      <div className="flex items-center gap-1 mt-1 text-foreground/50 text-xs">
                        <UserIcon size={12} />
                        Local account
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      isIconOnly
                      onPress={() => handleOpenModal(user)}
                      size="sm"
                      variant="light"
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button
                      color="danger"
                      isIconOnly
                      onPress={() => handleDeleteUser(user.id)}
                      size="sm"
                      variant="light"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="pt-2">
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.permissions.admin && (
                      <Chip
                        color="secondary"
                        size="sm"
                        startContent={<Shield size={12} />}
                        variant="flat"
                      >
                        Admin
                      </Chip>
                    )}
                    {user.permissions.manage_users && (
                      <Chip
                        color="primary"
                        size="sm"
                        startContent={<UsersIcon size={12} />}
                        variant="flat"
                      >
                        Manage Users
                      </Chip>
                    )}
                    {user.permissions.auto_approve && (
                      <Chip
                        color="success"
                        size="sm"
                        startContent={<CheckCircle2 size={12} />}
                        variant="flat"
                      >
                        Auto Approve
                      </Chip>
                    )}
                    {!user.permissions.admin &&
                      !user.permissions.manage_users &&
                      !user.permissions.auto_approve && (
                        <Chip
                          size="sm"
                          startContent={<UserIcon size={12} />}
                          variant="flat"
                        >
                          Standard User
                        </Chip>
                      )}
                  </div>
                  <div className="mt-4 text-xs text-foreground/40">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </PageContent>

      {/* User Modal */}
      <Modal
        classNames={{
          backdrop: "bg-overlay/50 backdrop-blur-sm",
          base: "bg-content1 border border-secondary/20",
        }}
        isOpen={isOpen}
        onClose={onClose}
        scrollBehavior="inside"
        size="2xl"
      >
        <ModalContent>
          <ModalHeader className="border-b border-secondary/20">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">
                {editingUser ? "Edit User" : "Create User"}
              </h2>
              <p className="text-sm text-foreground/60 font-normal">
                Configure user details and permissions
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="py-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserIcon className="text-secondary" size={18} />
                  Account Details
                </h3>
                <div className="flex flex-col gap-4">
                  <Input
                    classNames={{
                      inputWrapper: "bg-content2 border border-secondary/20",
                    }}
                    label="Username"
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="Enter username"
                    value={formData.username}
                  />
                  <Input
                    classNames={{
                      inputWrapper: "bg-content2 border border-secondary/20",
                    }}
                    label={editingUser ? "New Password (Optional)" : "Password"}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={
                      editingUser
                        ? "Leave blank to keep current"
                        : "Enter password"
                    }
                    type="password"
                    value={formData.password}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="text-secondary" size={18} />
                  Permissions
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <PermissionSwitch
                    description="Full access to all settings and features"
                    label="Administrator"
                    permissionKey="admin"
                  />
                  <PermissionSwitch
                    description="Can create, edit, and delete other users"
                    label="Manage Users"
                    permissionKey="manage_users"
                  />
                  <PermissionSwitch
                    description="Can approve or deny media requests"
                    label="Manage Requests"
                    permissionKey="manage_requests"
                  />
                  <PermissionSwitch
                    description="Requests are automatically approved without review"
                    label="Auto Approve"
                    permissionKey="auto_approve"
                  />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-secondary/20">
            <Button onPress={onClose} variant="flat">
              Cancel
            </Button>
            <Button
              className="btn-glow"
              color="secondary"
              isLoading={saving}
              onPress={handleSaveUser}
            >
              {editingUser ? "Save Changes" : "Create User"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Users;
