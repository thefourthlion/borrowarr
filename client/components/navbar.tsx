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
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  Film,
  ChevronDown,
  Tv,
  Sparkles,
  Settings,
  Database,
  Server,
  Heart,
  Clock,
  Users,
  EyeOff,
  HardDrive,
  Inbox,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Select, SelectItem } from "@nextui-org/select";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/icons";
import { ThemeSwitch } from "@/components/theme-switch";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [indexers, setIndexers] = useState<any[]>([]);
  const [selectedIndexer, setSelectedIndexer] = useState<string>("all");
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3013";

  const handleAuthAction = () => {
    if (user) {
      logout();
      router.push("/");
    } else {
      router.push("/pages/login");
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

  // Fetch indexers (only when user is authenticated)
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    axios
      .get(`${API_BASE_URL}/api/Indexers/read`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        if (response.data.data) {
          setIndexers(
            response.data.data.filter((idx: any) => idx.enabled) || [],
          );
        }
      })
      .catch((error) => {
        console.error("Error fetching indexers:", error);
      });
  }, [user]);

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
    <NextUINavbar
      className="z-[9999] bg-content1/80 backdrop-blur-xl border-b border-secondary/20 px-4 sm:px-6 w-full"
      classNames={{
        wrapper: "z-[9999] overflow-visible",
        menu: [
          "fixed left-0 right-0 top-16 z-[9998]",
          "h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)]",
          "overflow-y-auto overscroll-contain",
          "px-0 pt-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]",
          "bg-content1/95 backdrop-blur-xl border-t border-secondary/20",
          "scrollbar-thin scrollbar-thumb-secondary/40 scrollbar-track-transparent",
        ].join(" "),
      }}
      isMenuOpen={isMenuOpen}
      maxWidth="full"
      onMenuOpenChange={setIsMenuOpen}
      position="sticky"
    >
      <NavbarContent
        className="basis-1/5 sm:basis-full min-w-0 flex-shrink-0"
        justify="start"
      >
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink
            className="flex justify-start items-center gap-2 group"
            href="/"
          >
            <div className="text-secondary group-hover:scale-110 transition-transform">
              <Logo />
            </div>
            <p className="font-bold text-xl bg-gradient-to-r from-secondary to-secondary-600 bg-clip-text text-transparent">
              BorrowArr
            </p>
          </NextLink>
        </NavbarBrand>
        <ul className="hidden lg:flex gap-4 justify-start ml-2">
          <NavbarItem>
            <div className="relative" ref={discoverDropdownRef}>
              <Button
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-secondary data-[active=true]:font-medium hover:text-secondary transition-colors",
                )}
                endContent={<ChevronDown size={16} />}
                onPress={() => setDiscoverDropdownOpen(!discoverDropdownOpen)}
                startContent={<Sparkles className="text-secondary" size={16} />}
                variant="light"
              >
                Discover
              </Button>
              {discoverDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-content1 border border-secondary/30 rounded-lg shadow-xl shadow-secondary/10 backdrop-blur-xl z-[99999]">
                  <div className="py-1">
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href="/pages/discover"
                      onClick={() => setDiscoverDropdownOpen(false)}
                    >
                      <Sparkles size={18} />
                      Browse All
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href="/pages/discover/movies"
                      onClick={() => setDiscoverDropdownOpen(false)}
                    >
                      <Film size={18} />
                      Movies
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href="/pages/discover/series"
                      onClick={() => setDiscoverDropdownOpen(false)}
                    >
                      <Tv size={18} />
                      Series
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href="/pages/search"
                      onClick={() => setDiscoverDropdownOpen(false)}
                    >
                      <Search size={18} />
                      Search Indexers
                    </NextLink>
                    <div className="border-t border-secondary/20 my-1 mx-1" />
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href="/pages/featuredlists"
                      onClick={() => setDiscoverDropdownOpen(false)}
                    >
                      <Sparkles size={18} />
                      Featured Lists
                    </NextLink>
                  </div>
                </div>
              )}
            </div>
          </NavbarItem>
          <NavbarItem>
            <div className="relative" ref={settingsDropdownRef}>
              <Button
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-secondary data-[active=true]:font-medium hover:text-secondary transition-colors",
                )}
                endContent={<ChevronDown size={16} />}
                onPress={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                startContent={<Settings className="text-secondary" size={16} />}
                variant="light"
              >
                Settings
              </Button>
              {settingsDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-content1 border border-secondary/30 rounded-lg shadow-xl shadow-secondary/10 backdrop-blur-xl z-[99999]">
                  <div className="py-1">
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/indexers" : "/pages/login"}
                      onClick={() => {
                        setSettingsDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Database size={18} />
                      Indexers
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={
                        user
                          ? "/pages/settings/downloadclients"
                          : "/pages/login"
                      }
                      onClick={() => {
                        setSettingsDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Settings size={18} />
                      Download Clients
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/system" : "/pages/login"}
                      onClick={() => {
                        setSettingsDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Server size={18} />
                      Monitor Settings
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/filemanagement" : "/pages/login"}
                      onClick={() => {
                        setSettingsDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <HardDrive size={18} />
                      File Management
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/users" : "/pages/login"}
                      onClick={() => {
                        setSettingsDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Users size={18} />
                      Users
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/plexconnection" : "/pages/login"}
                      onClick={() => {
                        setSettingsDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Server size={18} />
                      Plex Connection
                    </NextLink>
                  </div>
                </div>
              )}
            </div>
          </NavbarItem>
          <NavbarItem>
            <div className="relative" ref={accountDropdownRef}>
              <Button
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-secondary data-[active=true]:font-medium hover:text-secondary transition-colors",
                )}
                endContent={<ChevronDown size={16} />}
                onPress={() => setAccountDropdownOpen(!accountDropdownOpen)}
                startContent={<User className="text-secondary" size={16} />}
                variant="light"
              >
                Account
              </Button>
              {accountDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-content1 border border-secondary/30 rounded-lg shadow-xl shadow-secondary/10 backdrop-blur-xl z-[99999]">
                  <div className="py-1">
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/medialibrary" : "/pages/login"}
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Server size={18} />
                      Media Library
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/monitored" : "/pages/login"}
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Film size={18} />
                      Monitored
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/requests" : "/pages/login"}
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Inbox size={18} />
                      Requests
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/favorites" : "/pages/login"}
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Heart size={18} />
                      Favorites
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/hiddenmedia" : "/pages/login"}
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <EyeOff size={18} />
                      Hidden Media
                    </NextLink>
                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/history" : "/pages/login"}
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
                        }
                      }}
                    >
                      <Clock size={18} />
                      History
                    </NextLink>

                    <NextLink
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary/10 hover:text-secondary transition-all rounded-md mx-1"
                      href={user ? "/pages/account" : "/pages/login"}
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (!user) {
                          router.push("/pages/login");
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
        className="hidden sm:flex basis-1/5 sm:basis-full min-w-0 flex-1 gap-2 flex-shrink-0"
        justify="end"
      >
        <NavbarItem className="hidden md:flex flex-1 min-w-0 max-w-md gap-2">
          {indexers.length > 0 && (
            <Select
              aria-label="Select indexer"
              classNames={{
                base: "w-32 flex-shrink-0",
                trigger:
                  "bg-content2 border-2 border-secondary/40 hover:border-secondary/40 focus:border-secondary transition-colors",
              }}
              items={[{ id: "all", name: "All Indexers" }, ...indexers]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setSelectedIndexer(selected || "all");
              }}
              placeholder="All"
              selectedKeys={new Set([selectedIndexer])}
              size="sm"
            >
              {(indexer: any) => (
                <SelectItem
                  key={indexer.id.toString()}
                  value={indexer.id.toString()}
                >
                  {indexer.name}
                </SelectItem>
              )}
            </Select>
          )}
          <Input
            classNames={{
              base: "w-full min-w-0",
              mainWrapper: "h-full",
              input: "text-small",
              inputWrapper:
                "h-full font-normal bg-content2 border border-secondary/20 hover:border-secondary/40 transition-colors",
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            placeholder="Search all media..."
            size="sm"
            startContent={<Search className="text-secondary" size={16} />}
            type="search"
            value={searchQuery}
          />
        </NavbarItem>
        <NavbarItem className="flex-shrink-0">
          <Button
            className="btn-glow font-semibold"
            color="secondary"
            onClick={handleAuthAction}
            variant="solid"
          >
            {user ? "Logout" : "Login"}
          </Button>
        </NavbarItem>
        <NavbarItem className="hidden sm:flex gap-2 flex-shrink-0">
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className="mx-auto flex w-full max-w-md flex-col gap-1 px-4 py-3">
          {[
            { label: "Premium", href: "/pages/products", icon: Sparkles },
            { label: "Discover", href: "/pages/discover" },
            { label: "Discover Movies", href: "/pages/discover/movies" },
            { label: "Discover Series", href: "/pages/discover/series" },
            { label: "Search Indexers", href: "/pages/search" },
            { label: "Featured Lists", href: "/pages/featuredlists" },
            {
              label: "Indexers",
              href: user ? "/pages/indexers" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Download Clients",
              href: user ? "/pages/settings/downloadclients" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Monitor Settings",
              href: user ? "/pages/system" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "File Management",
              href: user ? "/pages/filemanagement" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Users",
              href: user ? "/pages/users" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Plex Connection",
              href: user ? "/pages/plexconnection" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Media Library",
              href: user ? "/pages/medialibrary" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Monitored",
              href: user ? "/pages/monitored" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Requests",
              href: user ? "/pages/requests" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Favorites",
              href: user ? "/pages/favorites" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Hidden Media",
              href: user ? "/pages/hiddenmedia" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "History",
              href: user ? "/pages/history" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: "Account",
              href: user ? "/pages/account" : "/pages/login",
              requiresAuth: true,
            },
            {
              label: user ? "Logout" : "Login",
              href: "#",
              onClick: handleAuthAction,
            },
          ].map((item, index) => (
            <NavbarMenuItem key={`${item.label}-${index}`}>
              {item.onClick ? (
                <Link
                  className="w-full rounded-lg px-3 py-2 text-base font-semibold hover:bg-secondary/10"
                  color={item.label === "Logout" ? "danger" : "foreground"}
                  href={item.href}
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (item.onClick) item.onClick();
                  }}
                  size="lg"
                >
                  {item.label}
                </Link>
              ) : (
                <NextLink
                  className={clsx(
                    "block w-full rounded-lg px-3 py-2 text-base font-semibold leading-6 transition-colors hover:bg-secondary/10 hover:text-secondary",
                    item.label === "Premium"
                      ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 font-bold"
                      : "text-foreground",
                  )}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </NextLink>
              )}
            </NavbarMenuItem>
          ))}
        </div>
      </NavbarMenu>
    </NextUINavbar>
  );
};
