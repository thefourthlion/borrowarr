"use client";
import React, { useState } from "react";
import { Button } from "@nextui-org/button";
import { Form } from "@nextui-org/form";
import { Input } from "@nextui-org/input";
import { GoogleLoginButton } from "react-social-login-buttons";
import { useRouter } from "next/navigation";
import { initFirebase } from "@/firebase";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import "../../../styles/Login.scss";
import Link from "next/link";
import { Card } from "@/components/ui/card";

const Login = () => {
  const app = initFirebase();
  const auth = getAuth(app);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/pages/account");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        router.push("/pages/account");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Login page">
      <div className="container">
        <h1 className="content-header">Log In</h1>
        <Card className="content-container">
          {error && <div className="text-danger mb-4">{error}</div>}
          <Form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              autoComplete="username"
              className="mb-4"
              isRequired
              onChange={(e) => setEmail(e.target.value)}
              isInvalid={!!error}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              className="mb-4"
              isRequired
              onChange={(e) => setPassword(e.target.value)}
              isInvalid={!!error}
            />
            <Button
              className="primary-btn"
              color="primary"
              variant="solid"
              type="submit"
              disabled={loading}
            >
              Log In
            </Button>
            <GoogleLoginButton
              className="social-sign-in-btn"
              onClick={handleGoogleSignIn}
            />
            <p>
              Don't have an account?{" "}
              <Link className="u-link" href="/pages/register">
                Sign Up
              </Link>
            </p>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Login;