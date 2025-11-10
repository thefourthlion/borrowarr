"use client";
import {
  Navbar as NextUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@nextui-org/navbar";
import { Button } from "@nextui-org/button";
import { Link } from "@nextui-org/link";
import { Input } from "@nextui-org/input";
import { link as linkStyles } from "@nextui-org/theme";
import NextLink from "next/link";
import clsx from "clsx";
import { ThemeSwitch } from "@/components/theme-switch";
import { Logo } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Search, User, Film, ChevronDown, Tv, Sparkles, Settings, BarChart3, Database, Server } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Select, SelectItem } from "@nextui-org/select";
import axios from "axios";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const [discoverDropdownOpen, setDiscoverDropdownOpen] = useState(false);
  const discoverDropdownRef = useRef<HTMLDivElement>(null);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const [indexers, setIndexers] = useState<any[]>([]);
  const [selectedIndexer, setSelectedIndexer] = useState<string>("all");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

  const handleAuthAction = () => {
    if (user) {
      logout();
      router.push('/');
    } else {
      router.push('/pages/login');
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Build URL with search query and optional indexer
      let url = `/pages/discover/movies?q=${encodeURIComponent(searchQuery.trim())}&type=all`;
      if (selectedIndexer !== "all") {
        url += `&indexerId=${selectedIndexer}`;
      }
      router.push(url);
      setSearchQuery("");
    }
  };

  // Fetch indexers
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/Indexers/read`)
      .then((response) => {
        if (response.data.data) {
          setIndexers(response.data.data.filter((idx: any) => idx.enabled) || []);
        }
      })
      .catch((error) => {
        console.error("Error fetching indexers:", error);
      });
  }, []);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setAccountDropdownOpen(false);
      }
      if (
        discoverDropdownRef.current &&
        !discoverDropdownRef.current.contains(event.target as Node)
      ) {
        setDiscoverDropdownOpen(false);
      }
      if (
        settingsDropdownRef.current &&
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setSettingsDropdownOpen(false);
      }
    };

    if (accountDropdownOpen || discoverDropdownOpen || settingsDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountDropdownOpen, discoverDropdownOpen, settingsDropdownOpen]);

  return (
    <NextUINavbar maxWidth="xl" position="sticky" className="bg-content1/80 backdrop-blur-xl border-b border-secondary/20">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-2 group" href="/">
            <div className="text-secondary group-hover:scale-110 transition-transform">
            <Logo />
            </div>
            <p className="font-bold text-xl bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">BorrowArr</p>
          </NextLink>
        </NavbarBrand>
        <ul className="hidden lg:flex gap-4 justify-start ml-2">
          <NavbarItem>
            <div className="relative" ref={discoverDropdownRef}>
              <Button
                variant="light"
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-secondary data-[active=true]:font-medium hover:text-secondary transition-colors"
                )}
                onPress={() => setDiscoverDropdownOpen(!discoverDropdownOpen)}
                startContent={<Sparkles size={16} className="text-secondary" />}
                endContent={<ChevronDown size={16} />}
              >
                Discover
              </Button>
              {discoverDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-content1 border border-secondary/30 rounded-lg shadow-xl shadow-secondary/10 backdrop-blur-xl z-50">
                  <div className="py-1">
                    <NextLink
                      href="/pages/discover/movies"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      onClick={() => setDiscoverDropdownOpen(false)}
                    >
                      <Film size={18} />
                      Movies
                    </NextLink>
                    <NextLink
                      href="/pages/discover/series"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      onClick={() => setDiscoverDropdownOpen(false)}
                    >
                      <Tv size={18} />
                      Series
                    </NextLink>
                  </div>
                </div>
              )}
            </div>
          </NavbarItem>
          <NavbarItem>
            <div className="relative" ref={settingsDropdownRef}>
              <Button
                variant="light"
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-secondary data-[active=true]:font-medium hover:text-secondary transition-colors"
                )}
                onPress={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                startContent={<Settings size={16} className="text-secondary" />}
                endContent={<ChevronDown size={16} />}
              >
                Settings
              </Button>
              {settingsDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-content1 border border-secondary/30 rounded-lg shadow-xl shadow-secondary/10 backdrop-blur-xl z-50">
                  <div className="py-1">
                    <NextLink
                      href={user ? "/pages/indexers" : "/pages/login"}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      onClick={() => {
                        setSettingsDropdownOpen(false);
                        if (!user) {
                          router.push('/pages/login');
                        }
                      }}
                    >
                      <Database size={18} />
                      Indexers
                    </NextLink>
                    <NextLink
                      href={user ? "/pages/settings/downloadclients" : "/pages/login"}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      onClick={() => {
                        setSettingsDropdownOpen(false);
                        if (!user) {
                          router.push('/pages/login');
                        }
                      }}
                    >
                      <Settings size={18} />
                      Download Clients
                    </NextLink>
                    <NextLink
                      href={user ? "/pages/system" : "/pages/login"}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      onClick={() => {
                        setSettingsDropdownOpen(false);
                        if (!user) {
                          router.push('/pages/login');
                        }
                      }}
                    >
                      <Server size={18} />
                      System
                    </NextLink>
                  </div>
                </div>
              )}
            </div>
            </NavbarItem>
          <NavbarItem>
            <div className="relative" ref={accountDropdownRef}>
              <Button
                variant="light"
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-secondary data-[active=true]:font-medium hover:text-secondary transition-colors"
                )}
                onPress={() => setAccountDropdownOpen(!accountDropdownOpen)}
                startContent={<User size={16} className="text-secondary" />}
                endContent={<ChevronDown size={16} />}
              >
                Account
              </Button>
              {accountDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-content1 border border-secondary/30 rounded-lg shadow-xl shadow-secondary/10 backdrop-blur-xl z-50">
                  <div className="py-1">
                    <NextLink
                      href={user ? "/pages/monitored" : "/pages/login"}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push('/pages/login');
                        }
                      }}
                    >
                      <Film size={18} />
                      Monitored
                    </NextLink>
                    <NextLink
                      href={user ? "/pages/stats" : "/pages/login"}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push('/pages/login');
                        }
                      }}
                    >
                      <BarChart3 size={18} />
                      Stats
                    </NextLink>
                    <NextLink
                      href={user ? "/pages/account" : "/pages/login"}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push('/pages/login');
                        }
                      }}
                    >
                      <User size={18} />
                      Account
                    </NextLink>
                  </div>
                </div>
              )}
            </div>
          </NavbarItem>
        </ul>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="hidden md:flex flex-grow max-w-md gap-2">
          {indexers.length > 0 && (
            <Select
              selectedKeys={new Set([selectedIndexer])}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setSelectedIndexer(selected || "all");
              }}
              placeholder="All"
              size="sm"
              classNames={{
                base: "w-32 flex-shrink-0",
                trigger: "bg-content2 border-2 border-secondary/20 hover:border-secondary/40 focus:border-secondary transition-colors",
              }}
            >
              <SelectItem key="all" value="all">All Indexers</SelectItem>
              {indexers.map((indexer) => (
                <SelectItem key={indexer.id.toString()} value={indexer.id.toString()}>
                  {indexer.name}
                </SelectItem>
              ))}
            </Select>
          )}
          <Input
            classNames={{
              base: "w-full",
              mainWrapper: "h-full",
              input: "text-small",
              inputWrapper: "h-full font-normal bg-content2 border border-secondary/20 hover:border-secondary/40 transition-colors",
            }}
            placeholder="Search all media..."
            size="sm"
            startContent={<Search size={16} className="text-secondary" />}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
          />
        </NavbarItem>
        <NavbarItem>
          <Button 
            color="secondary" 
            variant="solid" 
            className="btn-glow font-semibold"
            onClick={handleAuthAction}
          >
            {user ? "Logout" : "Login"}
          </Button>
        </NavbarItem>
        <NavbarItem className="hidden sm:flex gap-2">
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {[
            { label: "Discover Movies", href: "/pages/discover/movies" },
            { label: "Discover Series", href: "/pages/discover/series" },
            { label: "Indexers", href: user ? "/pages/indexers" : "/pages/login", requiresAuth: true },
            { label: "Download Clients", href: user ? "/pages/settings/downloadclients" : "/pages/login", requiresAuth: true },
            { label: "System", href: user ? "/pages/system" : "/pages/login", requiresAuth: true },
            { label: "Monitored", href: user ? "/pages/monitored" : "/pages/login", requiresAuth: true },
            { label: "Stats", href: user ? "/pages/stats" : "/pages/login", requiresAuth: true },
            { label: "Account", href: user ? "/pages/account" : "/pages/login", requiresAuth: true },
            { 
              label: user ? "Logout" : "Login", 
              href: "#",
              onClick: handleAuthAction 
            },
          ].map((item, index) => (
            <NavbarMenuItem key={`${item.label}-${index}`}>
              {item.onClick ? (
                <Link 
                  color={"foreground"} 
                  href={item.href} 
                  size="lg"
                  onClick={item.onClick}
                >
                  {item.label}
                </Link>
              ) : (
                <Link color={"foreground"} href={item.href} size="lg">
                  {item.label}
                </Link>
              )}
            </NavbarMenuItem>
          ))}
        </div>
      </NavbarMenu>
    </NextUINavbar>
  );
};
