import React from "react";
import Link from "next/link";
import { SocialIcon } from "react-social-icons";
import { Logo } from "@/components/icons";
import "../styles/Footer.scss";

const Footer = () => {
  return (
    <footer className="Footer bg-content2">
      <div className="footer-main">
        <div className="footer-brand">
          <div className="brand-logo">
            <Logo size={32} />
            <span className="brand-text">LOGO</span>
          </div>
          <p className="company-slogan">COMPANY NAME</p>
        </div>
        <div className="footer-navigation">
          <Link className="nav-link" href="/">Home</Link>
          <Link className="nav-link" href="/pages/search">Search</Link>
          <Link className="nav-link" href="/pages/indexers">Indexers</Link>
          <Link className="nav-link" href="/pages/stats">Stats</Link>
          <Link className="nav-link" href="/pages/settings">Settings</Link>
          <Link className="nav-link" href="/pages/settings/downloadclients">Download Clients</Link>
          <Link className="nav-link" href="/pages/system">System</Link>
          <Link className="nav-link" href="/pages/account">Account</Link>
          <Link className="nav-link" href="/pages/products">Pricing</Link>
          <Link className="nav-link" href="/pages/login">Login</Link>
          <Link className="nav-link" href="/pages/register">Register</Link>
        </div>
      </div>
      <hr className="footer-divider bg-content2-border" />
      <div className="footer-bottom">
        <div className="socials">
          <SocialIcon url="https://x.com" aria-label="X" className="social-icon"/>
          <SocialIcon url="https://discord.com" aria-label="Discord" className="social-icon"/>
          <SocialIcon url="https://substack.com" aria-label="Substack" className="social-icon"/>
          <SocialIcon url="https://github.com" aria-label="GitHub" className="social-icon"/>
        </div>
        <p className="copyright">©Copyright. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
