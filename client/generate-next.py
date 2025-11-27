#!/usr/bin/env python3

import os.path
from os import path
import os

# ----------------------------------------- Set according to directory - var ----------------------------
current_path = os.getcwd()

# ------------------------------------------- Helper functions ---------------------------------------------
def write_to_file(file_path, content):
    file = open(file_path, "w", encoding="utf-8")
    file.write(content)
    file.close()

def create_file_if_not_exists(file_path, content):
    if not path.exists(file_path):
        try:
            write_to_file(file_path, content)
            print(f"✅ {os.path.basename(file_path)} successfully created...")
        except:
            print(f"❌ Something went wrong when creating {os.path.basename(file_path)}...")
    else:
        print(f"ℹ️ {os.path.basename(file_path)} already exists, skipping...")

def create_directory_if_not_exists(dir_path):
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"✅ {os.path.basename(dir_path)} directory successfully created...")
    else:
        print(f"ℹ️ {os.path.basename(dir_path)} directory already exists, skipping...")

# ------------------------------------------- File contents ---------------------------------------------

# Root configuration files
package_json_content = '''{
  "name": "next-app-template",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --no-lint",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx -c .eslintrc.json --fix",
    "cap:configure": "node scripts/update-ios-config.js",
    "cap:sync:ios": "pnpm cap sync ios && pnpm cap:configure",
    "cap:run:ios": "pnpm cap:sync:ios && pnpm cap run ios",
    "dev:ios": "node scripts/dev-ios.js",
    "ios:fix": "node scripts/update-ios-config.js"
  },
  "dependencies": {
    "@capacitor/android": "^7.4.3",
    "@capacitor/core": "^7.4.3",
    "@capacitor/ios": "^7.4.3",
    "@google-cloud/storage": "^7.14.0",
    "@nextui-org/button": "^2.2.3",
    "@nextui-org/card": "^2.2.7",
    "@nextui-org/code": "2.2.3",
    "@nextui-org/form": "^2.1.6",
    "@nextui-org/input": "^2.4.6",
    "@nextui-org/kbd": "2.2.3",
    "@nextui-org/link": "2.2.3",
    "@nextui-org/listbox": "2.3.3",
    "@nextui-org/navbar": "2.2.3",
    "@nextui-org/snippet": "2.2.4",
    "@nextui-org/switch": "2.2.3",
    "@nextui-org/system": "2.4.3",
    "@nextui-org/theme": "2.4.1",
    "@radix-ui/react-avatar": "^1.1.1",
    "@react-aria/ssr": "3.9.7",
    "@react-aria/visually-hidden": "3.8.18",
    "axios": "^1.7.9",
    "bootstrap": "^5.3.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "firebase": "^11.0.2",
    "framer-motion": "11.13.1",
    "intl-messageformat": "^10.5.0",
    "lucide-react": "^0.468.0",
    "next": "^15.5.2",
    "next-themes": "^0.4.4",
    "nextjs-sitemap-generator": "^1.3.1",
    "react": "18.3.1",
    "react-bootstrap": "^2.10.6",
    "react-dom": "18.3.1",
    "react-firebase-hooks": "^5.1.1",
    "react-social-icons": "^6.18.0",
    "react-social-login-buttons": "^4.1.0",
    "sass": "^1.82.0",
    "tailwind-merge": "^2.5.5",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@capacitor/cli": "^7.4.3",
    "@capacitor/configure": "^2.0.10",
    "@next/eslint-plugin-next": "15.0.4",
    "@react-types/shared": "3.25.0",
    "@types/node": "20.5.7",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "@typescript-eslint/eslint-plugin": "8.11.0",
    "@typescript-eslint/parser": "8.11.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "15.0.4",
    "eslint-config-prettier": "9.1.0",
    "eslint-plugin-import": "^2.26.0",
    "eslint-plugin-jsx-a11y": "^6.4.1",
    "eslint-plugin-node": "^11.1.0",
    "eslint-plugin-prettier": "5.2.1",
    "eslint-plugin-react": "^7.23.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-unused-imports": "4.1.4",
    "postcss": "^8.4.49",
    "prettier": "3.3.3",
    "tailwind-variants": "^0.1.20",
    "tailwindcss": "^3.4.16",
    "typescript": "5.6.3"
  }
}'''

next_config_content = '''/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
};

module.exports = nextConfig;'''

tailwind_config_content = '''import { nextui } from "@nextui-org/theme";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        "background-dark": {
          light: "#f0f0f0", // Slightly darker than white background
          dark: "#1a1a1a", // Slightly lighter than black background
        },
      },
    },
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            default: {
              50: "#fafafa",
              100: "#f2f2f3",
              200: "#ebebec",
              300: "#e3e3e6",
              400: "#dcdcdf",
              500: "#d4d4d8",
              600: "#afafb2",
              700: "#8a8a8c",
              800: "#656567",
              900: "#404041",
              foreground: "#0C0C0D",
              DEFAULT: "#d4d4d8",
            },
            primary: {
              50: "#dfedfd",
              100: "#b3d4fa",
              200: "#86bbf7",
              300: "#59a1f4",
              400: "#2d88f1",
              500: "#006fee",
              600: "#005cc4",
              700: "#00489b",
              800: "#003571",
              900: "#002147",
              foreground: "#F2F2F2",
              DEFAULT: "#006fee",
            },
            secondary: {
              50: "#eee4f8",
              100: "#d7bfef",
              200: "#bf99e5",
              300: "#a773db",
              400: "#904ed2",
              500: "#7828c8",
              600: "#6321a5",
              700: "#4e1a82",
              800: "#39135f",
              900: "#240c3c",
              foreground: "#F2F2F2",
              DEFAULT: "#7828c8",
            },
            success: {
              50: "#e2f8ec",
              100: "#b9efd1",
              200: "#91e5b5",
              300: "#68dc9a",
              400: "#40d27f",
              500: "#17c964",
              600: "#13a653",
              700: "#0f8341",
              800: "#0b5f30",
              900: "#073c1e",
              foreground: "#0C0C0D",
              DEFAULT: "#17c964",
            },
            warning: {
              50: "#fef4e4",
              100: "#fce4bd",
              200: "#fad497",
              300: "#f9c571",
              400: "#f7b54a",
              500: "#f5a524",
              600: "#ca881e",
              700: "#9f6b17",
              800: "#744e11",
              900: "#4a320b",
              foreground: "#0C0C0D",
              DEFAULT: "#f5a524",
            },
            danger: {
              50: "#fee1eb",
              100: "#fbb8cf",
              200: "#f98eb3",
              300: "#f76598",
              400: "#f53b7c",
              500: "#f31260",
              600: "#c80f4f",
              700: "#9e0c3e",
              800: "#73092e",
              900: "#49051d",
              foreground: "#0C0C0D",
              DEFAULT: "#f31260",
            },
            background: "#F2F2F2",
            foreground: "#0C0C0D",
            "background-dark": "#f0f0f0",
            content1: {
              DEFAULT: "#F2F2F2",
              foreground: "#0C0C0D",
            },
            content2: {
              DEFAULT: "#E8E8E8",
              foreground: "#141414",
              border: "#D4D4D4",
            },
            content3: {
              DEFAULT: "#e4e4e7",
              foreground: "#0C0C0D",
            },
            content4: {
              DEFAULT: "#d4d4d8",
              foreground: "#0C0C0D",
            },
            focus: "#006FEE",
            overlay: "#0C0C0D",
          },
        },
        dark: {
          colors: {
            default: {
              50: "#0d0d0e",
              100: "#19191c",
              200: "#26262a",
              300: "#323238",
              400: "#3f3f46",
              500: "#65656b",
              600: "#8c8c90",
              700: "#b2b2b5",
              800: "#d9d9da",
              900: "#F2F2F2",
              foreground: "#F2F2F2",
              DEFAULT: "#3f3f46",
            },
            primary: {
              50: "#002147",
              100: "#003571",
              200: "#00489b",
              300: "#005cc4",
              400: "#006fee",
              500: "#2d88f1",
              600: "#59a1f4",
              700: "#86bbf7",
              800: "#b3d4fa",
              900: "#dfedfd",
              foreground: "#F2F2F2",
              DEFAULT: "#006fee",
            },
            secondary: {
              50: "#240c3c",
              100: "#39135f",
              200: "#4e1a82",
              300: "#6321a5",
              400: "#7828c8",
              500: "#904ed2",
              600: "#a773db",
              700: "#bf99e5",
              800: "#d7bfef",
              900: "#eee4f8",
              foreground: "#F2F2F2",
              DEFAULT: "#7828c8",
            },
            success: {
              50: "#073c1e",
              100: "#0b5f30",
              200: "#0f8341",
              300: "#13a653",
              400: "#17c964",
              500: "#40d27f",
              600: "#68dc9a",
              700: "#91e5b5",
              800: "#b9efd1",
              900: "#e2f8ec",
              foreground: "#0C0C0D",
              DEFAULT: "#17c964",
            },
            warning: {
              50: "#4a320b",
              100: "#744e11",
              200: "#9f6b17",
              300: "#ca881e",
              400: "#f5a524",
              500: "#f7b54a",
              600: "#f9c571",
              700: "#fad497",
              800: "#fce4bd",
              900: "#fef4e4",
              foreground: "#0C0C0D",
              DEFAULT: "#f5a524",
            },
            danger: {
              50: "#49051d",
              100: "#73092e",
              200: "#9e0c3e",
              300: "#c80f4f",
              400: "#f31260",
              500: "#f53b7c",
              600: "#f76598",
              700: "#f98eb3",
              800: "#fbb8cf",
              900: "#fee1eb",
              foreground: "#0C0C0D",
              DEFAULT: "#f31260",
            },
            background: "#0C0C0D",
            foreground: "#F2F2F2",
            "background-dark": "#1a1a1a",
            content1: {
              DEFAULT: "#18181b",
              foreground: "#F2F2F2",
            },
            content2: {
              DEFAULT: "#141414",
              foreground: "#E8E8E8",
              border: "#404040",
            },
            content3: {
              DEFAULT: "#3f3f46",
              foreground: "#F2F2F2",
            },
            content4: {
              DEFAULT: "#52525b",
              foreground: "#F2F2F2",
            },
            focus: "#006FEE",
            overlay: "#F2F2F2",
          },
        },
      },
      layout: {
        disabledOpacity: "0.5",
      },
    }),
  ],
};
'''

tsconfig_content = '''{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}'''

capacitor_config_content = '''import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'next-app-template',
  webDir: 'out',
  server: {
    url: 'http://localhost:3000',
    cleartext: true
  }
};

export default config;
'''

components_json_content = '''{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "styles/globals.scss",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}'''

postcss_config_content = '''module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}'''

site_map_generator_content = '''const sitemap = require("nextjs-sitemap-generator");
sitemap({
  baseUrl: "https://next-app.com/",
  ignoredPaths: ["admin", "login"],
  ignoredExtensions: [
    "js",
    "map",
    "json",
    "png",
    "jpeg",
    "jpg",
    "svg",
    "icon",
    "mp4",
  ],
  extraPaths: ["/extraPath"],
  pagesDirectory: __dirname + "/.next/server/pages",
  targetDirectory: "public/",
  sitemapFilename: "sitemap.xml",
  nextConfigPath: __dirname + "/next.config.js",
});'''

firebase_content = '''// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBXIwZtbJwfTVWrXB3VAGNMakcb4ayfWRk",
    authDomain: "general-2ed6c.firebaseapp.com",
    projectId: "general-2ed6c",
    storageBucket: "general-2ed6c.appspot.com",
    messagingSenderId: "435839427932",
    appId: "1:435839427932:web:a0129a5f945d87cdc98d99",
    measurementId: "G-0HK7RN392Z"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;

export const initFirebase = () => {
  return app;
};'''

next_env_content = '''/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.'''

# Docker files
dockerfile_content = '''# Base image
FROM node:18-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app (static export)
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

# Runner stage (use a lightweight static file server)
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy static export output
COPY --from=builder /app/out ./

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
'''

docker_compose_content = '''version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - NODE_ENV=production
    restart: always
    # Add healthcheck
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3'''

# Git and ESLint files
gitignore_content = '''# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts'''

eslintrc_content = '''{
  "$schema": "https://json.schemastore.org/eslintrc.json",
  "env": {
    "browser": false,
    "es2021": true,
    "node": true
  },
  "extends": [
    "plugin:react/recommended",
    "plugin:prettier/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:@next/next/recommended"
  ],
  "plugins": [
    "react",
    "unused-imports",
    "import",
    "@typescript-eslint",
    "jsx-a11y",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "rules": {
    "no-console": "warn",
    "react/prop-types": "off",
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",
    "react-hooks/exhaustive-deps": "off",
    "jsx-a11y/click-events-have-key-events": "warn",
    "jsx-a11y/interactive-supports-focus": "warn",
    "prettier/prettier": [
      "warn",
      {
        "endOfLine": "auto"
      }
    ],
    "no-unused-vars": "off",
    "unused-imports/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "args": "after-used",
        "ignoreRestSiblings": false,
        "argsIgnorePattern": "^_.*?$"
      }
    ],
    "import/order": "warn",
    "react/self-closing-comp": "warn",
    "react/jsx-sort-props": "warn",
    "padding-line-between-statements": "warn"
  }
}'''

eslintignore_content = '''.now/*
*.css
.changeset
dist
esm/*
public/*
tests/*
scripts/*
*.config.js
.DS_Store
node_modules
coverage
.next
build
!.commitlintrc.cjs
!.lintstagedrc.cjs
!jest.config.js
!plopfile.js
!react-shim.js
!tsup.config.ts'''

dockerignore_content = '''node_modules
.next
.git
.env*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
README.md
.dockerignore
Dockerfile
docker-compose.yml'''

# Types and lib files
types_index_content = '''import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};'''

utils_content = '''import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}'''

# Config files
fonts_content = '''import { Fira_Code as FontMono, Inter as FontSans } from "next/font/google";

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});'''

site_content = '''export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Website Name",
  description: "Make beautiful websites.",
  links: {
   
  },
};'''

# Context files
user_auth_context_content = '''"use client"; // Add this line to indicate this is a Client Component

import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/firebase";

const userAuthContext = createContext();

export function UserAuthContextProvider({ children }) {
  const [user, setUser] = useState({});

  function logIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function signUp(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function logOut() {
    return signOut(auth);
  }

  function googleSignIn() {
    const googleAuthProvider = new GoogleAuthProvider();
    return signInWithPopup(auth, googleAuthProvider);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <userAuthContext.Provider
      value={{ user, logIn, signUp, logOut, googleSignIn }}
    >
      {children}
    </userAuthContext.Provider>
  );
}

export function useUserAuth() {
  return useContext(userAuthContext);
}'''

# Credentials file
credentials_content = '''{
    "type": "service_account",
    "project_id": "realitygenai",
    "private_key_id": "PRIVATE_KEY_ID",
    "private_key": "-----BEGIN PRIVATE KEY-----\\nPRIVATE_KEY_CONTENTS\\n-----END PRIVATE KEY-----\\n",
    "client_email": "realitygen-ai-official@realitygenai.iam.gserviceaccount.com",
    "client_id": "CLIENT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/realitygen-ai-official%40realitygenai.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
}'''

# Styles content
styles_variables_content = '''$primary-color: #167c93;
$shadow-color: rgba(16, 28, 42, 0.1);

$secondary-color: #bfd4b7;
$background-color: #1B1B20;
$foreground-color: grey;
$border-color: rgb(106, 111, 129);
$border-shadow-color: rgba(252, 70, 100, 0.2);
$text-color: #ababae;
$card-color: #202028;

$box-shadow-color: rgba(0, 0, 0, 0.1);
$btn-border-color: rgb(222, 226, 230);

$red: rgb(252, 70, 100);
$green: #2b8c44;

$pastel-teal:#78BFB8;
$pastel-teal-dark:#5BA69E;


$pastel-blue:#A6D8DB;
$pastel-blue-dark:#639FA6;

$pastel-pink: #f3a3a3;
$pastel-pink-dark: #ed8b8b;

$pastel-orange: #f6c17a;
$pastel-orange-dark: #fba454;

$pastel-red: #f25430;
$pastel-red-dark: #d94b2c;

$pastel-green: #97BF6F;
$pastel-green-dark: #578C3E; 


$blackish: #1B1B20;
$greyish: #202028;
$grey:#4B4B54;
$h-font:#9c9ca4;

// ------------------- pastel colors

// #A7DCC7
// #3FA693
// #CFF2B8
// #9FBFA1

// #78BFB8
// #5BA69E

// #027373
// #025959

// #66B8CC
// #62A2B3

// #A6D8DB
// #639FA6

// #C6ADFF
// #BD9CF9

// #FEF2CD
// #FFE7AD

// #F2AA52
// #F29C50

// #F6C17A
// #FBA454

// #FEB1A9
// #FFB7AD

// #FFADCB

// #F25430
// #F24738

// #F25A64
// #FF545A
// #D94C43
// #A62D35

// #B91E3C
// #8C192D
'''

styles_globals_content = '''@use "./Variables.scss" as *;
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url("https://fonts.googleapis.com/css2?family=Sofia+Sans:ital,wght@0,100..1000;1,100..1000&display=swap");

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;

  

}

body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  font-family: "Sofia Sans", sans-serif;
  font-weight: 600 !important;
  h1 {
    font-weight: bold;
    font-size: 2.5rem;
  }

  h2 {
    font-weight: bold;
    font-size: 2rem;
  }

  h3 {
    font-weight: bold;
    font-size: 1.75rem;
  }

  h4 {
    font-weight: bold;
    font-size: 1.5rem;
  }
}

.page {
  margin-bottom: 50px;
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
}

.content-header {
  font-weight: bold;
  margin: 25px 0;
}

.u-link{
  text-decoration: underline;
}

// ----------------------------------------------- buttons -----------------------------------------
.primary-btn,
.red-button,
.green-button
 {
  width: 100%;
  cursor: pointer;
  position: relative;
  text-decoration: none;
  overflow: hidden;
  z-index: 1;
}

.social-sign-in-btn{
  width: 100% !important;
  position: relative;
  right: 6px;
}

.red-button {
  background-color: $pastel-red;
  border: 3px solid $pastel-red;
}

.red-button:hover {
  background-color: $pastel-red-dark;
  border: 3px solid $pastel-red-dark;
}

.red-outline-button {
  background-color: transparent;
  border: 3px solid $pastel-red;
  color: $pastel-red;
}

.red-outline-button:hover {
  background-color: transparent;
  border: 3px solid $pastel-red-dark;
  color: $pastel-red-dark;
}

.green-button {
  background-color: $pastel-green;
  border: 3px solid $pastel-green;
}

.green-button:hover {
  background-color: $pastel-green-dark;
  border: 3px solid $pastel-green-dark;
}

.content-container {
  min-width: 350px;
  max-width: 550px;
  padding: 30px;
}

.button-link {
  text-decoration: none;
  color: black !important;
}

'''

styles_account_content = '''
'''

styles_footer_content = '''@use "./Variables.scss" as *;

.Footer {
  width: 100%;
  padding: 30px 20px 15px;
  margin-top: 40px;
  

  .footer-main {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .footer-brand {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 8px;

      .brand-text {
        font-size: 1.5rem;
        font-weight: bold;
        color: var(--foreground);
        opacity: 1;
      }
    }

    .company-slogan {
      font-size: 0.9rem;
      color: var(--foreground);
      margin: 0;
      opacity: 0.9;
    }
  }

  .footer-navigation {
    display: flex;
    gap: 30px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;

    .nav-link {
      font-size: 0.85rem;
      color: var(--foreground);
      text-decoration: none;
      transition: color 0.2s ease;
      opacity: 0.9;
      white-space: nowrap;

      &:hover {
        color: var(--primary);
        opacity: 1;
      }
    }
  }

  .footer-divider {
    width: 100%;
    border: 0;
    height: 1px;
    margin: 25px 0;
    border-radius: 0;
  }

  .footer-bottom {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;

    .socials {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;

      .social-icon {
        width: 40px !important;
        height: 40px !important;
        border-radius: 50%;
        border: 1px solid var(--foreground);
        opacity: 1;
        transition: opacity 0.2s ease;

        &:hover {
          opacity: 0.8;
        }
      }
    }

    .copyright {
      font-size: 0.8rem;
      color: var(--foreground);
      margin: 0;
      opacity: 0.9;
    }
  }

  // Tablet and smaller desktop
  @media only screen and (max-width: 1024px) {
    padding: 25px 20px 15px;
    margin-top: 30px;

    .footer-main {
      gap: 40px;
      margin-bottom: 15px;
    }

    .footer-navigation {
      gap: 40px;
    }
  }

  // Mobile landscape and tablet portrait
  @media only screen and (max-width: 768px) {
    padding: 20px 15px 12px;
    margin-top: 25px;

    .footer-main {
      flex-direction: column;
      gap: 25px;
      margin-bottom: 15px;
      align-items: center;
    }

    .footer-brand {
      align-items: center;
      text-align: center;

      .brand-logo {
        justify-content: center;
      }
    }

    .footer-navigation {
      gap: 25px;
      justify-content: center;
      width: 100%;

      .nav-link {
        font-size: 0.8rem;
      }
    }

    .footer-bottom {
      gap: 15px;

      .socials {
        gap: 15px;

        .social-icon {
          width: 35px !important;
          height: 35px !important;
        }
      }

      .copyright {
        font-size: 0.75rem;
      }
    }
  }

  // Mobile portrait
  @media only screen and (max-width: 480px) {
    padding: 18px 10px 12px;
    margin-top: 20px;

    .footer-main {
      gap: 20px;
      margin-bottom: 12px;
      align-items: center;
    }

    .footer-brand {
      align-items: center;
      text-align: center;

      .brand-logo {
        justify-content: center;

        .brand-text {
          font-size: 1.3rem;
        }
      }

      .company-slogan {
        font-size: 0.8rem;
      }
    }

    .footer-navigation {
      flex-direction: row;
      gap: 15px;
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;

      .nav-link {
        font-size: 0.75rem;
      }
    }

    .footer-bottom {
      gap: 12px;

      .socials {
        gap: 12px;

        .social-icon {
          width: 32px !important;
          height: 32px !important;
        }
      }

      .copyright {
        font-size: 0.7rem;
        text-align: center;
      }
    }
  }

  // Very small screens
  @media only screen and (max-width: 320px) {
    padding: 15px 8px 10px;
    margin-top: 15px;

    .footer-brand {
      .brand-logo {
        .brand-text {
          font-size: 1.2rem;
        }
      }

      .company-slogan {
        font-size: 0.75rem;
      }
    }

    .footer-navigation {
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;

      .nav-link {
        font-size: 0.7rem;
      }
    }

    .footer-bottom {
      .socials {
        gap: 10px;

        .social-icon {
          width: 28px !important;
          height: 28px !important;
        }
      }

      .copyright {
        font-size: 0.65rem;
      }
    }
  }
}

'''

styles_login_content = '''@use "./Variables.scss" as *;

.Login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
'''

styles_product_content = '''@use "./Variables.scss" as *;

.Product {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem;

  .container {
    padding: 25px 0;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 25px;
    flex-wrap: wrap;
  }

  .sub-card {
    width: 300px;
    min-height: 400px;
    padding: 15px;
    border: 1px solid $border-color !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .features {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;

    ul {
      padding-left: 0;
      list-style: none;
    }
  }

  .title{
    font-size: 32px;
    font-weight: bold;
  }

  button{
    margin-top: 25px !important;
  }
}
'''

styles_register_content = '''@use "./Variables.scss" as *;

.Register {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
'''

# Public files
next_svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 394 80"><path fill="#000" d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"/><path fill="#000" d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"/></svg>'''

vercel_svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 283 64"><path fill="black" d="M141 16c-11 0-19 7-19 18s9 18 20 18c7 0 13-3 16-7l-7-5c-2 3-6 4-9 4-5 0-9-3-10-7h28v-3c0-11-8-18-19-18zm-9 15c1-4 4-7 9-7s8 3 9 7h-18zm117-15c-11 0-19 7-19 18s9 18 20 18c6 0 12-3 16-7l-8-5c-2 3-5 4-8 4-5 0-9-3-11-7h28l1-3c0-11-8-18-19-18zm-10 15c2-4 5-7 10-7s8 3 9 7h-19zm-39 3c0 6 4 10 10 10 4 0 7-2 9-5l8 5c-3 5-9 8-17 8-11 0-19-7-19-18s8-18 19-18c8 0 14 3 17 8l-8 5c-2-3-5-5-9-5-6 0-10 4-10 10zm83-29v46h-9V5h9zM37 0l37 64H0L37 0zm92 5-27 48L74 5h10l18 30 17-30h10zm59 12v10l-3-1c-6 0-10 4-10 10v15h-9V17h9v9c0-5 6-9 13-9z"/></svg>'''

# App files content
layout_content = '''import "@/styles/globals.scss";
import { Metadata, Viewport } from "next";
import clsx from "clsx";
import Footer from "@/components/footer";
import { Providers } from "./providers";
import AuthRouter from "./authRouter";
import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <Providers>
          <AuthRouter>
            <div className="relative flex flex-col h-screen">
              <Navbar />
              <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">
                {children}
              </main>
              <Footer />
            </div>
          </AuthRouter>
        </Providers>
      </body>
    </html>
  );
}'''

page_content = '''import { title } from "@/components/primitives";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-xl text-center justify-center">
        <span className={title()}>Make&nbsp;</span>
        <span className={title({ color: "violet" })}>beautiful&nbsp;</span>
        <br />
        <span className={title()}>websites.</span>
      </div>
    </section>
  );
}'''

auth_router_content = '''
"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { initFirebase } from "@/firebase";
import { User, getAuth } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

const LOGIN_ROUTE = "/pages/login";

// --------- routes that only authed users can see
const ACCOUNT_ROUTE = "/pages/account";

const AuthRouter = (props: any) => {
  const app = initFirebase();
  const auth = getAuth(app);
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const pathName = usePathname();

  // Pages that require the user to be authenticated
  const protectedRoutes = ["/pages/account", "/pages/hidden"];

  const redirect = (
    isLoading: boolean,
    firebaseUser: User | null | undefined,
  ) => {
    if (!isLoading) {
      if (firebaseUser) {
        // User is logged in
        if (pathName === LOGIN_ROUTE) {
          router.push(ACCOUNT_ROUTE); // Redirect from login to account if logged in
        }
      } else {
        // User is not logged in
        if (protectedRoutes.includes(pathName)) {
          router.push(LOGIN_ROUTE); // Redirect to login if trying to access a protected route
        }
      }
    }
  };

  useEffect(() => {
    redirect(loading, user);
  }, [loading, user, pathName]);

  if (loading) {
    return null; // Show a loader or return null while checking auth state
  } else {
    return <>{props.children}</>; // Render children when not loading
  }
};

export default AuthRouter;
'''

providers_content = '''"use client";

import type { ThemeProviderProps } from "next-themes";
import * as React from "react";
import { NextUIProvider } from "@nextui-org/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <NextUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
    </NextUIProvider>
  );
}'''

error_content = '''"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}'''

not_found_content = '''import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center ">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-lg mb-8">Sorry, the page you are looking for does not exist.</p>
      <Link href="/">
        <button className='primary-btn'>Go Back Home</button>
      </Link>
    </div>
  );
}'''

# Additional content constants (simplified for brevity)
upload_route_content = '''import { Storage } from '@google-cloud/storage';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import path from 'path';

export async function POST(request: Request) {
  const headersList = await headers();
  const origin = headersList.get('origin') || '';
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Referrer-Policy': 'origin'
  };

  try {
    // Initialize storage with ADC
    const storage = new Storage({
      projectId: 'realitygenai',
      // Let ADC handle authentication
      keyFilename: path.join(process.cwd(), 'credentials', 'realitygenai-91609dea9a4a.json')
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const gid = formData.get('gid') as string;

    if (!file || !gid) {
      return NextResponse.json(
        { error: 'File and GID are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get bucket reference
    const bucket = storage.bucket('realitygenai-avatar');
    const fileName = `${gid}-${Date.now()}-${file.name}`;
    const blob = bucket.file(fileName);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create write stream
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.type
    });

    // Handle upload using promises
    await new Promise((resolve, reject) => {
      blobStream.on('error', (error) => reject(error));
      blobStream.on('finish', () => resolve(true));
      blobStream.end(buffer);
    });

    // Make the file public
    await blob.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/realitygenai-avatar/${fileName}`;
    
    return NextResponse.json({ url: publicUrl }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};'''

# Placeholder content for remaining files (simplified)
login_page_content = '''"use client";
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

export default Login;'''

# Additional placeholder content (simplified for brevity)
products_page_content = '''"use client";

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
'''

# Additional placeholder content
register_page_content = '''"use client";
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

export default Register;'''

# Additional placeholder content for remaining files
account_page_content = '''"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { initFirebase } from "@/firebase";
import { getAuth, updateProfile } from "firebase/auth";
import { getCheckoutUrl, getPortalUrl } from "./stripePayment";
import { getSubscriptionStatus } from "./getPremiumStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Mail, Calendar, Crown, LogOut } from "lucide-react";

export default function AccountPage() {
  const app = initFirebase();
  const auth = getAuth(app);
  const router = useRouter();

  const [userName, setUserName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [accountAge, setAccountAge] = useState<string>("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserName(user.displayName);
        setEmail(user.email);
        setAvatarUrl(user.photoURL || "");
        calculateAccountAge(
          user.metadata.creationTime || new Date().toISOString()
        );
      } else {
        router.push("/pages/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, router]);

  const calculateAccountAge = (creationTime: string) => {
    const createdAt = new Date(creationTime);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const days = diffDays % 30;

    let ageString = "";
    if (years > 0) ageString += `${years} year${years > 1 ? "s" : ""} `;
    if (remainingMonths > 0)
      ageString += `${remainingMonths} month${remainingMonths !== 1 ? "s" : ""} `;
    ageString += `${days} day${days !== 1 ? "s" : ""}`;

    setAccountAge(ageString.trim());
  };

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (auth.currentUser) {
        const activeSubscriptions = await getSubscriptionStatus(app);
        setSubscriptions(activeSubscriptions);
      }
    };

    loadSubscriptions();
  }, [app, auth.currentUser]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || !event.target.files[0]) return;
    setIsUploadingImage(true);

    try {
      const file = event.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("gid", auth.currentUser?.uid || "");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const { url } = await response.json();

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: url,
        });
        setAvatarUrl(url);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push("/pages/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleUpgradeToSubscription = async (priceId: string) => {
    const checkoutUrl = await getCheckoutUrl(app, priceId);
    router.push(checkoutUrl);
  };

  const handleManageSubscription = async () => {
    const portalUrl = await getPortalUrl(app);
    router.push(portalUrl);
  };

  if (loading) {
    return (
      <div className="p-2">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-10 h-10 border-3 border-content3 border-t-primary rounded-full animate-spin"></div>
          <p className="text-foreground opacity-70">Loading your account...</p>
        </div>
      </div>
    );
  }

  const currentPlan =
    subscriptions.length > 0 ? subscriptions[0].planName : "Free Account";

  return (
    <div className="p-1 md:p-2">
      <div className="max-w-3xl mx-auto flex flex-col gap-2 md:gap-3">
        {/* Header Section */}
        <div className="relative mb-2 md:mb-3">
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative rounded-full overflow-hidden transition-all duration-200 hover:scale-105 cursor-pointer group"
              onClick={() => document.getElementById("avatar-upload")?.click()}
            >
              <Avatar className="w-24 h-24 md:w-32 md:h-32">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl">
                  {userName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full">
                <span className="text-white text-sm font-semibold">
                  Click to change
                </span>
              </div>
            </div>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id="avatar-upload"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
            />
          </div>
        </div>

        {/* Profile Information */}
        <div className="text-center">
          <div className="bg-content1 border border-content3 rounded-2xl p-4 md:p-6 shadow-lg mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {userName}
            </h1>
            <div className="flex flex-col gap-1 mb-0">
              <div className="flex items-center justify-center gap-2 text-foreground opacity-80 text-xs md:text-sm py-1">
                <Mail className="w-4 h-4" />
                <span>{email}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-foreground opacity-80 text-xs md:text-sm py-1">
                <Calendar className="w-4 h-4" />
                <span>Member for {accountAge}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-foreground opacity-80 text-xs md:text-sm py-1">
                <Crown className="w-4 h-4" />
                <span>{currentPlan}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <Card className="bg-content1 border border-content3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5">
          <CardHeader>
            <h3 className="text-xl font-semibold text-foreground m-0">
              Subscription
            </h3>
          </CardHeader>
          <CardBody>
            <div>
              <div className="mb-3">
                <p className="text-xl md:text-2xl font-bold text-foreground m-0 mb-1">
                  {currentPlan}
                </p>
                <p className="text-foreground opacity-70 m-0">
                  {currentPlan === "Free Account"
                    ? "Upgrade to unlock premium features"
                    : "You have access to all premium features"}
                </p>
              </div>

              <div>
                {currentPlan === "Free Account" ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      color="primary"
                      onClick={() =>
                        handleUpgradeToSubscription(
                          "price_1QTsC4EWTDUOm33EAqvzOC4t"
                        )
                      }
                      className="w-full font-semibold py-2 px-4"
                    >
                      Upgrade to Premium - $12/month
                    </Button>
                    <Button
                      color="secondary"
                      onClick={() =>
                        handleUpgradeToSubscription(
                          "price_1QTsl4EWTDUOm33EWYiqr6xM"
                        )
                      }
                      className="w-full font-semibold py-2 px-4"
                    >
                      Upgrade to Extra - $18/month
                    </Button>
                  </div>
                ) : (
                  <Button
                    color="primary"
                    variant="ghost"
                    onClick={handleManageSubscription}
                    className="w-full font-semibold"
                  >
                    Manage Subscription
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Account Actions */}
        <Card className="bg-content1 border border-content3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-2xl hover:-translate-y-0.5">
          <CardBody>
            <div className="flex justify-center">
              <Button
                color="danger"
                variant="ghost"
                onClick={handleSignOut}
                className="font-semibold py-2 px-6"
                startContent={<LogOut className="w-4 h-4" />}
              >
                Sign Out
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
'''

# Additional placeholder content
get_premium_status_content = '''import { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

export const getSubscriptionStatus = async (app: FirebaseApp) => {
  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("User not logged in");

  const db = getFirestore(app);
  const subscriptionsRef = collection(db, "customers", userId, "subscriptions");
  const q = query(
    subscriptionsRef,
    where("status", "in", ["trialing", "active"])
  );

  return new Promise<any[]>((resolve, reject) => {
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.docs.length === 0) {
          resolve([]);
        } else {
          const subscriptions = snapshot.docs.map((doc) => {
            const subscriptionData = doc.data();
            const planName =
              subscriptionData.items?.[0]?.price?.product?.name ||
              "Unknown Plan";

            return {
              ...subscriptionData,
              planName,
            };
          });

          resolve(subscriptions);
        }
        unsubscribe();
      },
      reject
    );
  });
};'''

stripe_payment_content = '''"use client";
import { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  collection,
  getFirestore,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

export const getCheckoutUrl = async (
  app: FirebaseApp,
  priceId: string,
): Promise<string> => {
  const auth = getAuth(app);
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("User is not authenticated");

  const db = getFirestore(app);
  const checkoutSessionRef = collection(
    db,
    "customers",
    userId,
    "checkout_sessions",
  );

  const docRef = await addDoc(checkoutSessionRef, {
    price: priceId,
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });

  return new Promise<string>((resolve, reject) => {
    const unsubscribe = onSnapshot(docRef, (snap) => {
      const { error, url } = snap.data() as {
        error?: { message: string };
        url?: string;
      };
      if (error) {
        unsubscribe();
        reject(new Error(`An error occurred: ${error.message}`));
      }
      if (url) {
        console.log("Stripe Checkout URL:", url);
        unsubscribe();
        resolve(url);
      }
    });
  });
};

export const getPortalUrl = async (app: FirebaseApp): Promise<string> => {
  const auth = getAuth(app);
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");

  const functions = getFunctions(app, "us-central1");
  const functionRef = httpsCallable(
    functions,
    "ext-firestore-stripe-payments-createPortalLink",
  );

  try {
    const { data } = await functionRef({
      customerId: user.uid,
      returnUrl: window.location.origin,
    });

    const portalData = data as { url: string };
    if (!portalData.url) throw new Error("No URL returned from Stripe");
    console.log("Reroute to Stripe portal: ", portalData.url);
    return portalData.url;
  } catch (error) {
    console.error("Failed to obtain Stripe portal URL:", error);
    throw error;
  }
};'''

# Component content (simplified)
footer_content = '''import React from "react";
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
          <Link className="nav-link" href="/pages/products">Pricing</Link>
          <Link className="nav-link" href="/pages/account">Account</Link>
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

export default Footer;'''

# Additional component content (simplified)
icons_content = '''import * as React from "react";
import { IconSvgProps } from "@/types";

export const Logo: React.FC<IconSvgProps> = ({
  size = 36,
  width,
  height,
  ...props
}) => (
  <svg
    fill="none"
    height={size || height}
    viewBox="0 0 32 32"
    width={size || width}
    {...props}
  >
    <path
      clipRule="evenodd"
      d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export const SunFilledIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    aria-hidden="true"
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <g fill="currentColor">
      <path d="M19 12a7 7 0 11-7-7 7 7 0 017 7z" />
      <path d="M12 22.96a.969.969 0 01-1-.96v-.08a1 1 0 012 0 1.038 1.038 0 01-1 1.04zm7.14-2.82a1.024 1.024 0 01-.71-.29l-.13-.13a1 1 0 011.41-1.41l.13.13a1 1 0 010 1.41.984.984 0 01-.7.29zm-14.28 0a1.024 1.024 0 01-.71-.29 1 1 0 010-1.41l.13-.13a1 1 0 011.41 1.41l-.13.13a1 1 0 01-.7.29zM22 13h-.08a1 1 0 010-2 1.038 1.038 0 011.04 1 .969.969 0 01-.96 1zM2.08 13H2a1 1 0 010-2 1.038 1.038 0 011.04 1 .969.969 0 01-.96 1zm16.93-7.01a1.024 1.024 0 01-.71-.29 1 1 0 010-1.41l.13-.13a1 1 0 011.41 1.41l-.13.13a.984.984 0 01-.7.29zm-14.02 0a1.024 1.024 0 01-.71-.29l-.13-.14a1 1 0 011.41-1.41l.13.13a1 1 0 010 1.41.97.97 0 01-.7.3zM12 3.04a.969.969 0 01-1-.96V2a1 1 0 012 0 1.038 1.038 0 01-1 1.04z" />
    </g>
  </svg>
);

export const MoonFilledIcon = ({
  size = 24,
  width,
  height,
  ...props
}: IconSvgProps) => (
  <svg
    aria-hidden="true"
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    {...props}
  >
    <path
      d="M21.53 15.93c-.16-.27-.61-.69-1.73-.49a8.46 8.46 0 01-1.88.13 8.409 8.409 0 01-5.91-2.82 8.068 8.068 0 01-1.44-8.66c.44-1.01.13-1.54-.09-1.76s-.77-.55-1.83-.11a10.318 10.318 0 00-6.32 10.21 10.475 10.475 0 007.04 8.99 10 10 0 002.89.55c.16.01.32.02.48.02a10.5 10.5 0 008.47-4.27c.67-.93.49-1.519.32-1.79z"
      fill="currentColor"
    />
  </svg>
);'''

# Additional component content (simplified)
navbar_content = '''"use client";
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
import { link as linkStyles } from "@nextui-org/theme";
import NextLink from "next/link";
import clsx from "clsx";
import { ThemeSwitch } from "@/components/theme-switch";
import { Logo } from "@/components/icons";
import { initFirebase } from "@/firebase";
import { getAuth } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";

export const Navbar = () => {
  const app = initFirebase();
  const auth = getAuth(app);
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  const handleAuthAction = async () => {
    if (user) {
      await auth.signOut();
      router.push('/');
    } else {
      router.push('/pages/login');
    }
  };

  return (
    <NextUINavbar maxWidth="xl" position="sticky" className="bg-content2">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-1" href="/">
            <Logo />
            <p className="font-bold text-inherit">LOGO</p>
          </NextLink>
        </NavbarBrand>
        <ul className="hidden lg:flex gap-4 justify-start ml-2">
          {[
            { label: "Home", href: "/" },
            { label: "Pricing", href: "/pages/products" },
            { label: "Account", href: "/pages/account" },
          ].map((item) => (
            <NavbarItem key={item.href}>
              <NextLink
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:text-primary data-[active=true]:font-medium"
                )}
                color="foreground"
                href={item.href}
              >
                {item.label}
              </NextLink>
            </NavbarItem>
          ))}
        </ul>
      </NavbarContent>

      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem>
          <Button 
            color="primary" 
            variant="solid" 
            className="primary-btn"
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
            { label: "Home", href: "/" },
            { label: "Pricing", href: "/pages/products" },
            { label: "Account", href: "/pages/account" },
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
};'''

# iOS update config script content
update_ios_config_content = '''#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const infoPlistPath = path.join(__dirname, '../ios/App/App/Info.plist');

function updateInfoPlist() {
  try {
    // Read the current Info.plist
    let plistContent = fs.readFileSync(infoPlistPath, 'utf8');
    
    // Check if NSAppTransportSecurity already exists
    if (plistContent.includes('NSAppTransportSecurity')) {
      console.log('✅ NSAppTransportSecurity already configured in Info.plist');
      return;
    }
    
    // Add NSAppTransportSecurity configuration before the closing </dict> and </plist>
    const securityConfig = `	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
		<key>NSExceptionDomains</key>
		<dict>
			<key>localhost</key>
			<dict>
				<key>NSExceptionAllowsInsecureHTTPLoads</key>
				<true/>
			</dict>
		</dict>
	</dict>
</dict>
</plist>`;
    
    // Replace the closing tags with our configuration
    plistContent = plistContent.replace(/<\/dict>\\s*<\/plist>\\s*$/, securityConfig);
    
    // Write the updated content back
    fs.writeFileSync(infoPlistPath, plistContent, 'utf8');
    
    console.log('✅ Successfully updated Info.plist with NSAppTransportSecurity settings');
  } catch (error) {
    console.error('❌ Error updating Info.plist:', error.message);
    process.exit(1);
  }
}

updateInfoPlist();
'''

# Additional component content (simplified)
primitives_content = '''import { tv } from "tailwind-variants";

export const title = tv({
  base: "tracking-tight inline font-semibold",
  variants: {
    color: {
      violet: "from-[#FF1CF7] to-[#b249f8]",
      yellow: "from-[#FF705B] to-[#FFB457]",
      blue: "from-[#5EA2EF] to-[#0072F5]",
      cyan: "from-[#00b7fa] to-[#01cfea]",
      green: "from-[#6FEE8D] to-[#17c964]",
      pink: "from-[#FF72E1] to-[#F54C7A]",
      foreground: "dark:from-[#FFFFFF] dark:to-[#4B4B4B]",
    },
    size: {
      sm: "text-3xl lg:text-4xl",
      md: "text-[2.3rem] lg:text-5xl leading-9",
      lg: "text-4xl lg:text-6xl",
    },
    fullWidth: {
      true: "w-full block",
    },
  },
  defaultVariants: {
    size: "md",
  },
  compoundVariants: [
    {
      color: [
        "violet",
        "yellow",
        "blue",
        "cyan",
        "green",
        "pink",
        "foreground",
      ],
      class: "bg-clip-text text-transparent bg-gradient-to-b",
    },
  ],
});

export const subtitle = tv({
  base: "w-full md:w-1/2 my-2 text-lg lg:text-xl text-default-600 block max-w-full",
  variants: {
    fullWidth: {
      true: "!w-full",
    },
  },
  defaultVariants: {
    fullWidth: true,
  },
});'''

theme_switch_content = '''"use client";

import { FC } from "react";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import { SwitchProps, useSwitch } from "@nextui-org/switch";
import { useTheme } from "next-themes";
import { useIsSSR } from "@react-aria/ssr";
import clsx from "clsx";

import { SunFilledIcon, MoonFilledIcon } from "@/components/icons";

export interface ThemeSwitchProps {
  className?: string;
  classNames?: SwitchProps["classNames"];
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({
  className,
  classNames,
}) => {
  const { theme, setTheme } = useTheme();
  const isSSR = useIsSSR();

  const onChange = () => {
    theme === "light" ? setTheme("dark") : setTheme("light");
  };

  const {
    Component,
    slots,
    isSelected,
    getBaseProps,
    getInputProps,
    getWrapperProps,
  } = useSwitch({
    isSelected: theme === "light" || isSSR,
    "aria-label": `Switch to ${theme === "light" || isSSR ? "dark" : "light"} mode`,
    onChange,
  });

  return (
    <Component
      {...getBaseProps({
        className: clsx(
          "px-px transition-opacity hover:opacity-80 cursor-pointer",
          className,
          classNames?.base,
        ),
      })}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <div
        {...getWrapperProps()}
        className={slots.wrapper({
          class: clsx(
            [
              "w-auto h-auto",
              "bg-transparent",
              "rounded-lg",
              "flex items-center justify-center",
              "group-data-[selected=true]:bg-transparent",
              "!text-default-500",
              "pt-px",
              "px-0",
              "mx-0",
            ],
            classNames?.wrapper,
          ),
        })}
      >
        {!isSelected || isSSR ? (
          <SunFilledIcon size={22} />
        ) : (
          <MoonFilledIcon size={22} />
        )}
      </div>
    </Component>
  );
};'''

avatar_content = '''"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }'''

card_content = '''import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }'''

# ------------------------------------------- Main execution function ---------------------------------------------
def create_all_files():
    print("🚀 Starting Next.js project generator...")
    
    # Create root configuration files
    create_file_if_not_exists(os.path.join(current_path, "package.json"), package_json_content)
    create_file_if_not_exists(os.path.join(current_path, "next.config.js"), next_config_content)
    create_file_if_not_exists(os.path.join(current_path, "tailwind.config.js"), tailwind_config_content)
    create_file_if_not_exists(os.path.join(current_path, "tsconfig.json"), tsconfig_content)
    create_file_if_not_exists(os.path.join(current_path, "capacitor.config.ts"), capacitor_config_content)
    create_file_if_not_exists(os.path.join(current_path, "components.json"), components_json_content)
    create_file_if_not_exists(os.path.join(current_path, "postcss.config.js"), postcss_config_content)
    create_file_if_not_exists(os.path.join(current_path, "site-map-generator.js"), site_map_generator_content)
    create_file_if_not_exists(os.path.join(current_path, "firebase.ts"), firebase_content)
    create_file_if_not_exists(os.path.join(current_path, "next-env.d.ts"), next_env_content)
    create_file_if_not_exists(os.path.join(current_path, "Dockerfile"), dockerfile_content)
    create_file_if_not_exists(os.path.join(current_path, "docker-compose.yml"), docker_compose_content)
    create_file_if_not_exists(os.path.join(current_path, ".gitignore"), gitignore_content)
    create_file_if_not_exists(os.path.join(current_path, ".eslintrc.json"), eslintrc_content)
    create_file_if_not_exists(os.path.join(current_path, ".eslintignore"), eslintignore_content)
    create_file_if_not_exists(os.path.join(current_path, ".dockerignore"), dockerignore_content)
    
    # Create directories
    create_directory_if_not_exists(os.path.join(current_path, "app"))
    create_directory_if_not_exists(os.path.join(current_path, "app", "api"))
    create_directory_if_not_exists(os.path.join(current_path, "app", "api", "upload"))
    create_directory_if_not_exists(os.path.join(current_path, "app", "pages"))
    create_directory_if_not_exists(os.path.join(current_path, "app", "pages", "account"))
    create_directory_if_not_exists(os.path.join(current_path, "app", "pages", "login"))
    create_directory_if_not_exists(os.path.join(current_path, "app", "pages", "products"))
    create_directory_if_not_exists(os.path.join(current_path, "app", "pages", "register"))
    create_directory_if_not_exists(os.path.join(current_path, "components"))
    create_directory_if_not_exists(os.path.join(current_path, "components", "ui"))
    create_directory_if_not_exists(os.path.join(current_path, "config"))
    create_directory_if_not_exists(os.path.join(current_path, "context"))
    create_directory_if_not_exists(os.path.join(current_path, "credentials"))
    create_directory_if_not_exists(os.path.join(current_path, "lib"))
    create_directory_if_not_exists(os.path.join(current_path, "public"))
    create_directory_if_not_exists(os.path.join(current_path, "scripts"))
    create_directory_if_not_exists(os.path.join(current_path, "styles"))
    create_directory_if_not_exists(os.path.join(current_path, "types"))
    
    # Create types files
    create_file_if_not_exists(os.path.join(current_path, "types", "index.ts"), types_index_content)
    
    # Create lib files
    create_file_if_not_exists(os.path.join(current_path, "lib", "utils.ts"), utils_content)
    
    # Create config files
    create_file_if_not_exists(os.path.join(current_path, "config", "fonts.ts"), fonts_content)
    create_file_if_not_exists(os.path.join(current_path, "config", "site.ts"), site_content)
    
    # Create context files
    create_file_if_not_exists(os.path.join(current_path, "context", "UserAuthContext.js"), user_auth_context_content)
    
    # Create credentials files
    create_file_if_not_exists(os.path.join(current_path, "credentials", "realitygenai-91609dea9a4a.json"), credentials_content)
    
    # Create styles files
    create_file_if_not_exists(os.path.join(current_path, "styles", "Variables.scss"), styles_variables_content)
    create_file_if_not_exists(os.path.join(current_path, "styles", "globals.scss"), styles_globals_content)
    create_file_if_not_exists(os.path.join(current_path, "styles", "Account.scss"), styles_account_content)
    create_file_if_not_exists(os.path.join(current_path, "styles", "Footer.scss"), styles_footer_content)
    create_file_if_not_exists(os.path.join(current_path, "styles", "Login.scss"), styles_login_content)
    create_file_if_not_exists(os.path.join(current_path, "styles", "Product.scss"), styles_product_content)
    create_file_if_not_exists(os.path.join(current_path, "styles", "Register.scss"), styles_register_content)
    
    # Create public files
    create_file_if_not_exists(os.path.join(current_path, "public", "next.svg"), next_svg_content)
    create_file_if_not_exists(os.path.join(current_path, "public", "vercel.svg"), vercel_svg_content)
    
    # Create app files
    create_file_if_not_exists(os.path.join(current_path, "app", "layout.tsx"), layout_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "page.tsx"), page_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "authRouter.tsx"), auth_router_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "providers.tsx"), providers_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "error.tsx"), error_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "not-found.tsx"), not_found_content)
    
    # Create API files
    create_file_if_not_exists(os.path.join(current_path, "app", "api", "upload", "route.ts"), upload_route_content)
    
    # Create page files
    create_file_if_not_exists(os.path.join(current_path, "app", "pages", "login", "page.js"), login_page_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "pages", "products", "page.js"), products_page_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "pages", "register", "page.js"), register_page_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "pages", "account", "page.tsx"), account_page_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "pages", "account", "getPremiumStatus.ts"), get_premium_status_content)
    create_file_if_not_exists(os.path.join(current_path, "app", "pages", "account", "stripePayment.tsx"), stripe_payment_content)
    
    # Create component files
    create_file_if_not_exists(os.path.join(current_path, "components", "footer.tsx"), footer_content)
    create_file_if_not_exists(os.path.join(current_path, "components", "icons.tsx"), icons_content)
    create_file_if_not_exists(os.path.join(current_path, "components", "navbar.tsx"), navbar_content)
    create_file_if_not_exists(os.path.join(current_path, "components", "primitives.ts"), primitives_content)
    create_file_if_not_exists(os.path.join(current_path, "components", "theme-switch.tsx"), theme_switch_content)
    
    # Create UI component files
    create_file_if_not_exists(os.path.join(current_path, "components", "ui", "avatar.tsx"), avatar_content)
    create_file_if_not_exists(os.path.join(current_path, "components", "ui", "card.tsx"), card_content)
    
    # Create scripts files
    create_file_if_not_exists(os.path.join(current_path, "scripts", "update-ios-config.js"), update_ios_config_content)
    
    print("✨ File generation complete!")

# ------------------------------------------- Main execution ---------------------------------------------
if __name__ == "__main__":
    create_all_files()
