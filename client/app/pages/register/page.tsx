"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Card, CardBody } from "@nextui-org/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, User, AlertCircle, ShieldX } from "lucide-react";
import { Spinner } from "@nextui-org/spinner";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import "../../../styles/Register.scss";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

const Register = () => {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/Settings/public-registration-status`,
        );
        setRegistrationEnabled(response.data.enabled);
      } catch (error) {
        console.error("Error checking registration status:", error);
        // Default to enabled if there's an error
        setRegistrationEnabled(true);
      } finally {
        setCheckingRegistration(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Trim inputs
    const trimmedUsername = username.trim();
    // Validate username
    if (!trimmedUsername) {
      setError("Username is required");
      return;
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setError("Username must be between 3 and 30 characters");
      return;
    }

    // Check username format (letters, numbers, and underscores only)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    // Validate password
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      await register(trimmedUsername, password);
      router.push("/pages/account");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (checkingRegistration) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Spinner color="secondary" size="lg" />
          <p className="text-foreground/60">Checking registration status...</p>
        </div>
      </div>
    );
  }

  if (!registrationEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border border-secondary/20 shadow-xl shadow-secondary/10">
            <CardBody className="p-6 sm:p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-danger/10">
                  <ShieldX className="w-12 h-12 text-danger" />
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-2">Registration Disabled</h1>
              <p className="text-foreground/60 mb-6">
                Public registration is currently disabled. Please contact your
                administrator to create an account.
              </p>
              <Button
                as={Link}
                className="btn-glow"
                color="secondary"
                href="/pages/login"
                size="lg"
              >
                Go to Login
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border border-secondary/20 shadow-xl shadow-secondary/10">
          <CardBody className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent mb-2">
                Create Account
              </h1>
              <p className="text-foreground/60 text-sm">
                Create your local BorrowArr account
              </p>
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
                description="3-30 characters, letters, numbers, and underscores only"
                errorMessage={
                  error && error.includes("Username") ? error : undefined
                }
                isInvalid={!!error && error.includes("Username")}
                isRequired
                label="Username"
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow letters, numbers, and underscores
                  if (value === "" || /^[a-zA-Z0-9_]*$/.test(value)) {
                    setUsername(value);
                  }
                }}
                placeholder="Choose a username"
                startContent={<User className="text-secondary" size={18} />}
                type="text"
                value={username}
              />

              <Input
                classNames={{
                  inputWrapper:
                    "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                }}
                description="At least 8 characters"
                errorMessage={
                  error && error.includes("Password") ? error : undefined
                }
                isInvalid={!!error && error.includes("Password")}
                isRequired
                label="Password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                startContent={<Lock className="text-secondary" size={18} />}
                type="password"
                value={password}
              />

              <Input
                classNames={{
                  inputWrapper:
                    "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus-within:border-secondary transition-all",
                }}
                errorMessage={
                  error && error.includes("Passwords do not match")
                    ? error
                    : undefined
                }
                isInvalid={!!error && error.includes("Passwords do not match")}
                isRequired
                label="Confirm Password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                startContent={<Lock className="text-secondary" size={18} />}
                type="password"
                value={confirmPassword}
              />

              <Button
                className="btn-glow w-full font-semibold"
                color="secondary"
                disabled={loading}
                isLoading={loading}
                size="lg"
                type="submit"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-foreground/60">
                Already have an account?{" "}
                <Link
                  className="text-secondary hover:text-secondary-600 font-medium transition-colors"
                  href="/pages/login"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Register;
