import React from "react";
import Link from "next/link";
import { SocialIcon } from "react-social-icons";
import { Logo } from "@/components/icons";
import { Film, Tv, Settings, User, BarChart3, Database, Server, Mail, Heart } from "lucide-react";
import "../styles/Footer.scss";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="Footer">
      {/* Animated gradient line */}
      <div className="footer-gradient-line"></div>
      
      <div className="footer-container">
        {/* Brand Section */}
        <div className="footer-section footer-brand">
          <div className="brand-logo-wrapper">
            <div className="brand-logo-icon">
              <Logo size={40} />
            </div>
            <div>
              <h3 className="brand-name">BorrowArr</h3>
              <p className="brand-tagline">Self-Hosted Media Hub</p>
            </div>
          </div>
          <p className="brand-description">
            Take control of your media library with powerful automation, 
            beautiful discovery, and complete privacy.
          </p>
          <div className="social-links">
            <SocialIcon 
              url="https://github.com" 
              className="social-icon" 
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            />
            <SocialIcon 
              url="https://discord.com" 
              className="social-icon" 
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
            />
            <SocialIcon 
              url="https://x.com" 
              className="social-icon" 
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
            />
            <a href="mailto:contact@borrowarr.com" className="social-link" aria-label="Email">
              <div className="email-icon">
                <Mail size={20} />
              </div>
            </a>
          </div>
        </div>

        {/* Discover Section */}
        <div className="footer-section">
          <h4 className="section-title">Discover</h4>
          <ul className="section-links">
            <li>
              <Link href="/pages/discover/movies" className="footer-link">
                <Film size={16} />
                <span>Movies</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/discover/series" className="footer-link">
                <Tv size={16} />
                <span>Series</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/monitored" className="footer-link">
                <Film size={16} />
                <span>Monitored</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Settings Section */}
        <div className="footer-section">
          <h4 className="section-title">Settings</h4>
          <ul className="section-links">
            <li>
              <Link href="/pages/indexers" className="footer-link">
                <Database size={16} />
                <span>Indexers</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/settings/downloadclients" className="footer-link">
                <Settings size={16} />
                <span>Download Clients</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/system" className="footer-link">
                <Server size={16} />
                <span>System</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Account Section */}
        <div className="footer-section">
          <h4 className="section-title">Account</h4>
          <ul className="section-links">
            <li>
              <Link href="/pages/login" className="footer-link">
                <User size={16} />
                <span>Login</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/register" className="footer-link">
                <User size={16} />
                <span>Register</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/favorites" className="footer-link">
                <Heart size={16} />
                <span>Favorites</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/stats" className="footer-link">
                <BarChart3 size={16} />
                <span>Stats</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/account" className="footer-link">
                <User size={16} />
                <span>Profile</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p className="copyright">
            © {currentYear} BorrowArr. Built with <Heart size={14} className="heart-icon" /> by developers, for developers.
          </p>
          <div className="footer-links-inline">
            <Link href="/pages/privacy" className="footer-link-small">Privacy</Link>
            <span className="separator">•</span>
            <Link href="/pages/terms" className="footer-link-small">Terms</Link>
            <span className="separator">•</span>
            <Link href="/pages/docs" className="footer-link-small">Docs</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
