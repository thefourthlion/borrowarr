"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@nextui-org/button";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import "../../../styles/Product.scss";

const Product = () => {
  const router = useRouter();

  const handleSubscribe = (link: string | undefined) => {
    console.log("Subscribe clicked. Link:", link);
    if (link) {
      window.location.href = link;
    } else {
      console.error("Stripe link is missing. Check environment variables.");
      alert("Subscription link not configured. Please contact support.");
    }
  };

  return (
    <div className="page Product min-h-screen w-full py-16 px-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="text-center mb-16 relative z-10">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
          Choose Your <span className="text-gradient-animate">Power</span>
        </h1>
        <p className="text-default-500 text-xl max-w-2xl mx-auto leading-relaxed">
          Unlock the full potential of your media library with our premium tiers. 
          Scale your experience to infinity.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto relative z-10 items-start">
        {/* Basic Plan - Free */}
        <Card className="border-default-200/50 bg-content1/50 backdrop-blur-md card-interactive relative overflow-hidden">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto bg-default-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Zap size={32} className="text-default-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Basic</CardTitle>
            <div className="mt-4">
              <span className="text-4xl font-bold">Free</span>
              <span className="text-default-500 ml-1">/forever</span>
            </div>
          </CardHeader>
          <CardContent className="pt-8 px-8">
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-default-100"><Check size={14} className="text-default-500" /></div>
                <span className="text-default-700">Access to basic library</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-default-100"><Check size={14} className="text-default-500" /></div>
                <span className="text-default-700">720p Streaming</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-default-100"><Check size={14} className="text-default-500" /></div>
                <span className="text-default-700">Community Support</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-default-100"><Check size={14} className="text-default-500" /></div>
                <span className="text-default-700">1 Concurrent Stream</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-8 pb-8 px-8 relative z-30">
            <Button 
              className="w-full font-medium" 
              variant="bordered" 
              isDisabled
              radius="lg"
              size="lg"
            >
              Current Plan
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className="border-secondary/50 bg-content1/80 backdrop-blur-md card-interactive relative overflow-hidden shadow-2xl shadow-secondary/10 lg:-mt-8 z-20">
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 bg-secondary text-white px-4 py-1 text-xs font-bold rounded-bl-xl shadow-lg">
            MOST POPULAR
          </div>
          <CardHeader className="text-center pb-2 pt-10">
            <div className="mx-auto bg-secondary/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-inner ring-1 ring-secondary/20">
              <Sparkles size={40} className="text-secondary" />
            </div>
            <CardTitle className="text-3xl font-bold text-secondary">Premium</CardTitle>
            <div className="mt-4 flex items-baseline justify-center">
              <span className="text-5xl font-bold">$6</span>
              <span className="text-default-500 ml-1">/month</span>
            </div>
            <p className="text-sm text-default-400 mt-2">Billed monthly</p>
          </CardHeader>
          <CardContent className="pt-8 px-10">
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-secondary/20"><Check size={14} className="text-secondary" /></div>
                <span className="font-medium">Everything in Basic</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-secondary/20"><Check size={14} className="text-secondary" /></div>
                <span>1080p Streaming</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-secondary/20"><Check size={14} className="text-secondary" /></div>
                <span>Priority Support</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-secondary/20"><Check size={14} className="text-secondary" /></div>
                <span>3 Concurrent Streams</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-secondary/20"><Check size={14} className="text-secondary" /></div>
                <span>No Ads</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-8 pb-10 px-10 relative z-30">
            <Button 
              className="w-full btn-glow bg-secondary text-white font-bold" 
              size="lg"
              radius="lg"
              onPress={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_LINK_PREMIUM)}
            >
              Subscribe Now
            </Button>
          </CardFooter>
        </Card>

        {/* Ultimate Plan */}
        <Card className="border-purple-500/30 bg-content1/50 backdrop-blur-md card-interactive relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto bg-gradient-to-br from-purple-500/20 to-pink-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-inner ring-1 ring-purple-500/20">
              <Crown size={32} className="text-purple-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Ultimate</CardTitle>
            <div className="mt-4">
              <span className="text-4xl font-bold">$12</span>
              <span className="text-default-500 ml-1">/month</span>
            </div>
          </CardHeader>
          <CardContent className="pt-8 px-8">
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-purple-500/20"><Check size={14} className="text-purple-500" /></div>
                <span className="font-medium">Everything in Premium</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-purple-500/20"><Check size={14} className="text-purple-500" /></div>
                <span>4K HDR Streaming</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-purple-500/20"><Check size={14} className="text-purple-500" /></div>
                <span>Unlimited Streams</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-purple-500/20"><Check size={14} className="text-purple-500" /></div>
                <span>Offline Downloads</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="p-1 rounded-full bg-purple-500/20"><Check size={14} className="text-purple-500" /></div>
                <span>Early Access</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="pt-8 pb-8 px-8 relative z-30">
            <Button 
              className="w-full btn-glow bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold border-none" 
              size="lg"
              radius="lg"
              onPress={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_LINK_ULTIMATE)}
            >
              Get Ultimate
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-24 text-center max-w-3xl mx-auto relative z-10 mb-12">
        <h3 className="text-2xl font-bold mb-8">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-content1/40 backdrop-blur-sm border border-default-200/50 hover:bg-content1/60 transition-colors">
            <h4 className="font-semibold text-lg mb-2">Can I cancel anytime?</h4>
            <p className="text-default-500 leading-relaxed">Yes, you can cancel your subscription at any time. Your benefits will continue until the end of your billing cycle.</p>
          </div>
          <div className="p-6 rounded-2xl bg-content1/40 backdrop-blur-sm border border-default-200/50 hover:bg-content1/60 transition-colors">
            <h4 className="font-semibold text-lg mb-2">What payment methods?</h4>
            <p className="text-default-500 leading-relaxed">We accept all major credit cards, Apple Pay, and Google Pay securely processed via Stripe.</p>
          </div>
          <div className="p-6 rounded-2xl bg-content1/40 backdrop-blur-sm border border-default-200/50 hover:bg-content1/60 transition-colors">
            <h4 className="font-semibold text-lg mb-2">Is there a refund policy?</h4>
            <p className="text-default-500 leading-relaxed">We offer a 7-day money-back guarantee if you're not satisfied with the premium features.</p>
          </div>
          <div className="p-6 rounded-2xl bg-content1/40 backdrop-blur-sm border border-default-200/50 hover:bg-content1/60 transition-colors">
            <h4 className="font-semibold text-lg mb-2">Can I upgrade later?</h4>
            <p className="text-default-500 leading-relaxed">Absolutely! You can upgrade your plan at any time. The price difference will be prorated.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Product;
