"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { initFirebase } from "@/firebase";
import { getCheckoutUrl } from "../account/stripePayment";
import "../../../styles/Product.scss";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@nextui-org/button";

const Product = () => {
  const app = initFirebase();
  const auth = getAuth(app);
  const router = useRouter();

  const subscribe = async (priceId) => {
    if (!auth.currentUser) {
      router.push("/login"); // Redirect to login if not logged in
      return;
    }

    try {
      const checkoutUrl = await getCheckoutUrl(app, priceId);
      router.push(checkoutUrl);
    } catch (error) {
      console.error("Failed to subscribe:", error.message);
    }
  };

  return (
    <div className="page Product">
      <h1>Subscribe to benefit!</h1>
      <div className="container">
        <Card className="sub-card">
          <CardHeader>
            <CardTitle className="title">Basic</CardTitle>
            <CardTitle>$6 / Month</CardTitle>
            <div className="features">
              <ul>
                <li>✓ Access to basic features</li>
                <li>✓ 5 projects per month</li>
                <li>✓ Basic support</li>
                <li>✓ 1GB storage</li>
              </ul>
            </div>
            <Button
              color="primary"
              variant="ghost"
              className="primary-btn"
              onClick={() => subscribe("price_1PyaUqEWTDUOm33EpvHFA80P")}
            >
              Subscribe
            </Button>
          </CardHeader>
        </Card>

        <Card className="sub-card">
          <CardHeader>
            <CardTitle className="title">Premium</CardTitle>
            <CardTitle>$12 / Month</CardTitle>
            <div className="features">
              <ul>
                <li>✓ All Basic features</li>
                <li>✓ 15 projects per month</li>
                <li>✓ Priority support</li>
                <li>✓ 10GB storage</li>
                <li>✓ Advanced analytics</li>
              </ul>
            </div>
            <Button
              color="primary"
              variant="ghost"
              className="primary-btn"
              onClick={() => subscribe("price_1PyaVCEWTDUOm33EFYT1O64B")}
            >
              Subscribe
            </Button>
          </CardHeader>
        </Card>

        <Card className="sub-card">
          <CardHeader>
            <CardTitle className="title">Ultimate</CardTitle>
            <CardTitle>$18 / Month</CardTitle>
            <div className="features">
              <ul>
                <li>✓ All Premium features</li>
                <li>✓ Unlimited projects</li>
                <li>✓ 24/7 priority support</li>
                <li>✓ 50GB storage</li>
                <li>✓ Custom analytics</li>
                <li>✓ API access</li>
              </ul>
            </div>
            <Button
              color="primary"
              className="primary-btn"
              onClick={() => subscribe("price_1PyaVREWTDUOm33Epun180Ji")}
            >
              Subscribe
            </Button>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default Product;
