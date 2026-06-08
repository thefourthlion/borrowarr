"use client";

import React, { useState } from "react";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import {
  Modal,
  ModalBody,
  ModalContent,
} from "@nextui-org/modal";
import Link from "next/link";
import { AlertCircle, Lock, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Welcome Back",
  description = "Sign in to your BorrowArr account",
}) => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      classNames={{
        base: "bg-background border border-secondary/20 shadow-xl shadow-secondary/10",
        closeButton: "text-foreground/60 hover:text-foreground",
      }}
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      size="md"
    >
      <ModalContent>
        <ModalBody className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent mb-2">
              {title}
            </h1>
            <p className="text-foreground/60 text-sm">{description}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              classNames={{
                inputWrapper:
                  "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
              }}
              isInvalid={!!error}
              isRequired
              label="Username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              startContent={<User className="text-secondary" size={18} />}
              type="text"
              value={username}
            />

            <Input
              classNames={{
                inputWrapper:
                  "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
              }}
              isInvalid={!!error}
              isRequired
              label="Password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              startContent={<Lock className="text-secondary" size={18} />}
              type="password"
              value={password}
            />

            <Button
              className="btn-glow w-full font-semibold"
              color="secondary"
              disabled={loading}
              isLoading={loading}
              size="lg"
              type="submit"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-foreground/60">
              Don&apos;t have an account?{" "}
              <Link
                className="text-secondary hover:text-secondary-600 font-medium transition-colors"
                href="/pages/register"
                onClick={onClose}
              >
                Sign Up
              </Link>
            </p>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default LoginRequiredModal;
