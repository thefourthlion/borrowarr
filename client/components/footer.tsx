"use client";
import React, { useState } from "react";
import Link from "next/link";
import { SocialIcon } from "react-social-icons";
import { Logo } from "@/components/icons";
import { 
  Film, 
  Tv, 
  Settings, 
  User, 
  Users,
  BarChart3, 
  Database, 
  Server, 
  Mail, 
  Heart, 
  Clock, 
  Coffee, 
  Bitcoin,
  EyeOff,
  HardDrive,
  Inbox
} from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/modal";
import { Button } from "@nextui-org/button";
import { Snippet } from "@nextui-org/snippet";
import "../styles/Footer.scss";

// Crypto Icons
const EthIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
  </svg>
);

const UsdcIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z" fill="#2775CA"/>
    <path d="M12.75 15.75h-1.5v-1.5h1.5v1.5zm0-9h-1.5V5.25h1.5v1.5zm2.25 4.5c0 1.24-.92 2.25-2.05 2.25h-1.7v-1.5h1.7c.41 0 .75-.34.75-.75s-.34-.75-.75-.75h-1.7v-1.5h1.7c.41 0 .75-.34.75-.75s-.34-.75-.75-.75h-1.7V6.75h-1.5v.75h-1.5v1.5h1.5v6h-1.5v1.5h1.5v.75h1.5v-.75h1.7c1.13 0 2.05-1.01 2.05-2.25z" fill="white"/>
  </svg>
);

const MoneroIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-.485 4.455h.97l5.703 5.703v8.497h-3.88v-5.67l-2.308 2.308-2.308-2.308v5.67H5.812v-8.497l5.703-5.703z" fill="#FF6600"/>
  </svg>
);

const WALLET_ADDRESSES = {
  BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // Placeholder
  ETH: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", // Placeholder
  USDC: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", // Placeholder
  XMR: "44AFFq5kSiGBoZ4NMDwYtN187aarBFHRK1q31C31p79s5Bq6F644A3mZ67653434343" // Placeholder
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const {isOpen, onOpen, onClose} = useDisclosure();
  const [selectedCoin, setSelectedCoin] = useState<{name: string, symbol: string, address: string, icon: React.ReactNode} | null>(null);

  const handleCryptoClick = (name: string, symbol: string, address: string, icon: React.ReactNode) => {
    setSelectedCoin({name, symbol, address, icon});
    onOpen();
  };

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
              <Link href="/pages/discover" className="footer-link">
                <Tv size={16} />
                <span>Browse All</span>
              </Link>
            </li>
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

        {/* Support Section */}
        <div className="footer-section">
          <h4 className="section-title">Support</h4>
          <ul className="section-links">
            <li>
              <a 
                href="https://www.buymeacoffee.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-link"
              >
                <Coffee size={16} />
                <span>Buy Me a Coffee</span>
              </a>
            </li>
            <li className="mt-2">
              <span className="text-sm text-default-500 block mb-2">Donate Crypto:</span>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => handleCryptoClick('Bitcoin', 'BTC', WALLET_ADDRESSES.BTC, <Bitcoin size={20} className="text-[#F7931A]" />)}
                  className="p-2 rounded-full bg-default-100 hover:bg-default-200 transition-colors"
                  title="Donate Bitcoin"
                >
                  <Bitcoin size={20} className="text-[#F7931A]" />
                </button>
                <button 
                  onClick={() => handleCryptoClick('Ethereum', 'ETH', WALLET_ADDRESSES.ETH, <EthIcon size={20} />)}
                  className="p-2 rounded-full bg-default-100 hover:bg-default-200 transition-colors"
                  title="Donate Ethereum"
                >
                  <EthIcon size={20} />
                </button>
                <button 
                  onClick={() => handleCryptoClick('USDC', 'USDC', WALLET_ADDRESSES.USDC, <UsdcIcon size={20} />)}
                  className="p-2 rounded-full bg-default-100 hover:bg-default-200 transition-colors"
                  title="Donate USDC"
                >
                  <UsdcIcon size={20} />
                </button>
                <button 
                  onClick={() => handleCryptoClick('Monero', 'XMR', WALLET_ADDRESSES.XMR, <MoneroIcon size={20} />)}
                  className="p-2 rounded-full bg-default-100 hover:bg-default-200 transition-colors"
                  title="Donate Monero"
                >
                  <MoneroIcon size={20} />
                </button>
              </div>
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
            <li>
              <Link href="/pages/filemanagement" className="footer-link">
                <HardDrive size={16} />
                <span>File Management</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Account Section */}
        <div className="footer-section">
          <h4 className="section-title">Account</h4>
          <ul className="section-links">
            <li>
              <Link href="/pages/medialibrary" className="footer-link">
                <Server size={16} />
                <span>Media Library</span>
              </Link>
            </li>
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
              <Link href="/pages/users" className="footer-link">
                <Users size={16} />
                <span>Users</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/requests" className="footer-link">
                <Inbox size={16} />
                <span>Requests</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/favorites" className="footer-link">
                <Heart size={16} />
                <span>Favorites</span>
              </Link>
            </li>
            <li>
              <Link href="/pages/hiddenmedia" className="footer-link">
                <EyeOff size={16} />
                <span>Hidden Media</span>
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

      {/* Crypto Donation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {selectedCoin?.icon}
                  <span>Donate {selectedCoin?.name} ({selectedCoin?.symbol})</span>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-500 mb-2">
                  Scan the QR code or copy the address below to donate. Thank you for your support!
                </p>
                <Snippet symbol="" className="w-full">
                  {selectedCoin?.address || "Address not set"}
                </Snippet>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </footer>
  );
};

export default Footer;
