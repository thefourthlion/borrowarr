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
  Mail,
  User as UserIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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
  email: string;
  avatarUrl?: string;
  permissions: UserPermissions;
  createdAt: string;
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [publicRegistrationEnabled, setPublicRegistrationEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  // Modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
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
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/Users/read`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      showNotification("error", "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE_URL}/api/Settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPublicRegistrationEnabled(response.data.publicRegistrationEnabled ?? true);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, [fetchUsers, fetchSettings]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ ...notification, show: false }), 3000);
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: "", // Don't show existing password
        permissions: { ...user.permissions },
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        email: "",
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
      const token = localStorage.getItem("token");
      
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          username: formData.username,
          email: formData.email,
          permissions: formData.permissions,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }

        await axios.put(
          `${API_BASE_URL}/api/Users/update/${editingUser.id}`,
          updateData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showNotification("success", "User updated successfully");
      } else {
        // Create new user
        await axios.post(
          `${API_BASE_URL}/api/Users/create`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showNotification("success", "User created successfully");
      }

      onClose();
      fetchUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      showNotification("error", error.response?.data?.error || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/api/Users/delete/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showNotification("success", "User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      showNotification("error", "Failed to delete user");
    }
  };

  const handleTogglePublicRegistration = async (enabled: boolean) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_BASE_URL}/api/Settings`,
        { publicRegistrationEnabled: enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPublicRegistrationEnabled(enabled);
      showNotification("success", `Public registration ${enabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      console.error("Error updating registration setting:", error);
      showNotification("error", "Failed to update registration setting");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
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
        {description && <span className="text-xs text-foreground/60">{description}</span>}
      </div>
      <Switch
        size="sm"
        color="secondary"
        isSelected={formData.permissions[permissionKey]}
        onValueChange={(checked) =>
          setFormData((prev) => ({
            ...prev,
            permissions: { ...prev.permissions, [permissionKey]: checked },
          }))
        }
      />
    </div>
  );

    return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-secondary/20 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <UsersIcon className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
                  Users
                </h1>
                <p className="text-xs sm:text-sm text-foreground/60 mt-1">
                  Manage users and their permissions
                </p>
                </div>
            </div>
            <Button
              color="secondary"
              className="btn-glow"
              startContent={<Plus size={18} />}
              onPress={() => handleOpenModal()}
            >
              Create User
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
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
              isSelected={publicRegistrationEnabled}
              onValueChange={handleTogglePublicRegistration}
              color="secondary"
              size="lg"
              isDisabled={loadingSettings}
            />
          </CardBody>
        </Card>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Search size={18} className="text-default-400" />}
            classNames={{
              inputWrapper: "bg-content2 border border-secondary/20 hover:border-secondary/40",
            }}
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
            <Spinner size="lg" color="secondary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="card-interactive border border-secondary/20 bg-content1"
              >
                <CardHeader className="flex justify-between items-start pb-2">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-lg">
                      {user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-none">{user.username}</h3>
                      <div className="flex items-center gap-1 mt-1 text-foreground/60 text-xs">
                        <Mail size={12} />
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      isIconOnly 
                      variant="light" 
                      size="sm"
                      onPress={() => handleOpenModal(user)}
                    >
                      <Edit2 size={18} />
                    </Button>
                    <Button 
                      isIconOnly 
                      variant="light" 
                      size="sm"
                      color="danger"
                      onPress={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className="pt-2">
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.permissions.admin && (
                      <Chip size="sm" color="secondary" variant="flat" startContent={<Shield size={12} />}>
                        Admin
                      </Chip>
                    )}
                    {user.permissions.manage_users && (
                      <Chip size="sm" color="primary" variant="flat" startContent={<UsersIcon size={12} />}>
                        Manage Users
                      </Chip>
                    )}
                    {user.permissions.auto_approve && (
                      <Chip size="sm" color="success" variant="flat" startContent={<CheckCircle2 size={12} />}>
                        Auto Approve
                      </Chip>
                    )}
                    {!user.permissions.admin && !user.permissions.manage_users && !user.permissions.auto_approve && (
                      <Chip size="sm" variant="flat" startContent={<UserIcon size={12} />}>
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
      </div>

      {/* User Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          backdrop: "bg-overlay/50 backdrop-blur-sm",
          base: "bg-content1 border border-secondary/20",
        }}
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
                  <UserIcon size={18} className="text-secondary" />
                  Account Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Username"
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    classNames={{ inputWrapper: "bg-content2 border border-secondary/20" }}
                  />
                  <Input
                    label="Email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    classNames={{ inputWrapper: "bg-content2 border border-secondary/20" }}
                  />
                  <Input
                    label={editingUser ? "New Password (Optional)" : "Password"}
                    placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    classNames={{ inputWrapper: "bg-content2 border border-secondary/20" }}
                    className="sm:col-span-2"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield size={18} className="text-secondary" />
                  Permissions
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <PermissionSwitch
                    label="Administrator"
                    permissionKey="admin"
                    description="Full access to all settings and features"
                  />
                  <PermissionSwitch
                    label="Manage Users"
                    permissionKey="manage_users"
                    description="Can create, edit, and delete other users"
                  />
                  <PermissionSwitch
                    label="Manage Requests"
                    permissionKey="manage_requests"
                    description="Can approve or deny media requests"
                  />
                  <PermissionSwitch
                    label="Request Media"
                    permissionKey="request"
                    description="Can request movies and series"
                  />
                  <PermissionSwitch
                    label="Auto Approve"
                    permissionKey="auto_approve"
                    description="Requests are automatically approved without review"
                  />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-secondary/20">
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button color="secondary" className="btn-glow" onPress={handleSaveUser} isLoading={saving}>
              {editingUser ? "Save Changes" : "Create User"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
        </div>
    );
};

export default Users;
