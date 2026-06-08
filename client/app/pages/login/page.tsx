"use client";
import React, { useState } from "react";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Card, CardBody } from "@nextui-org/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import "../../../styles/Login.scss";

const Login = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      router.push("/pages/account");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border border-secondary/20 shadow-xl shadow-secondary/10">
          <CardBody className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent mb-2">
                Welcome Back
              </h1>
              <p className="text-foreground/60 text-sm">
                Sign in to your BorrowArr account
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
                isInvalid={!!error}
                isRequired
                label="Username"
                onChange={(e) => setUsername(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
                Don't have an account?{" "}
                <Link
                  className="text-secondary hover:text-secondary-600 font-medium transition-colors"
                  href="/pages/register"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Login;
