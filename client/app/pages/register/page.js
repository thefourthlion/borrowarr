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
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import "../../../styles/Register.scss";
import Link from "next/link";
import { Card } from "@/components/ui/card";

const Register = () => {
  const app = initFirebase();
  const auth = getAuth(app);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
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
    <div className="Register page">
      <div className="container">
        <h1 className="content-header">Register</h1>
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
              autoComplete="new-password"
              className="mb-4"
              isRequired
              onChange={(e) => setPassword(e.target.value)}
              isInvalid={!!error}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              className="mb-4"
              isRequired
              onChange={(e) => setConfirmPassword(e.target.value)}
              isInvalid={!!error}
            />
            <Button className="primary-btn" color="primary" variant="solid" type="submit" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
            <p>or</p>
            <GoogleLoginButton
              className="social-sign-in-btn"
              onClick={handleGoogleSignIn}
            />
            <p>
              Already have an account?{" "}
              <Link className="u-link" href="/pages/login">
                Log In
              </Link>
            </p>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default Register;