<div align="center">

# VynGrid

### Unified Vyn Product Operations Console

**Self-hosted · Multi-product observability · Enterprise ready**

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Live Console](https://img.shields.io/badge/Live_Console-grid.vynops.online-0f766e)](https://grid.vynops.online)
[![Part of VynOps](https://img.shields.io/badge/Part_of-VynOps_Suite-2563eb)](https://vynops.com)

*Monitor. Diagnose. Coordinate. Your Vyn product estate from one control plane.*

[**Live Console**](https://grid.vynops.online) · [**VynOps Suite**](https://vynops.com)

</div>

---

## Overview

VynGrid monitors product availability, response time, activity, and 30-day uptime from a single authenticated console. It is designed for operators who need one reliable view across the Vyn product portfolio.

Built with Next.js 16 and a local JSON data store, VynGrid monitors configured services from the server itself, normalizes their operational activity, and keeps product credentials encrypted at rest. It requires no separate database or monitoring agent.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Local Development](#local-development)
  - [First Sign-in](#first-sign-in)
- [Using the Console](#using-the-console)
- [Configuration](#configuration)
  - [Product Integration Contract](#product-integration-contract)
- [Security](#security)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Operations](#operations)
  - [Production with PM2](#production-with-pm2)
  - [nginx Reverse Proxy](#nginx-reverse-proxy)
  - [Persistent Data](#persistent-data)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Troubleshooting](#troubleshooting)
- [Related Projects](#related-projects)
- [License](#license)

## Features

VynGrid gives an operations team one place to:

- Check current health, response time, version, and aggregate availability for enabled products.
- Open each product directly from the grid.
- Review a 30-day uptime matrix generated from VynGrid health observations.
- Collect recent incidents, alerts, deployments, and operational activity across products.
- Change product URLs, health/activity endpoints, refresh cadence, and enabled state without rebuilding.
- Save and test per-product integration credentials encrypted at rest.

The default grid includes VynOps, VynDC, VynCICD, VynCost, VynDB, VynAI, VynHana, and VynSAP. Adapt it to another product estate through **Settings** or `config.grid.json`.

## Architecture

VynGrid is a server-rendered Next.js application. The browser talks only to VynGrid; the server owns authentication, encrypted credentials, product health checks, and activity collection.

```text
Browser --> VynGrid console --> authenticated product APIs
              |       |
              |       +--> encrypted credentials and health history on disk
              +--> NextAuth session and administrator authentication
```

Each enabled product is defined in `config.grid.json`. VynGrid requests its health and activity endpoints from the VynGrid host, optionally establishes an authenticated session, records health observations, and returns normalized data to the console.

## Requirements

| Requirement | Version | Purpose |
| --- | --- | --- |
| Node.js | 20.9 or later | Runs Next.js 16 |
| npm | Bundled with Node.js | Installs and runs the application |
| Network access | To each configured product | Performs health checks and collects activity |

VynGrid uses local JSON files for configuration and history; it does not require a database.

## Installation

### Local Development

```powershell
cd D:\grid\VynGrid
npm install
```

Create `.env.local`. Generate a credential-encryption secret, a bcrypt password hash, and Base64 encoding for that hash:

```powershell
$credentialKey = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$passwordHash = node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" 'choose-a-strong-password'
$passwordHashB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($passwordHash))
```

Add the generated values to `.env.local`:

```env
AUTH_SECRET=replace-with-a-long-random-secret
VYNGRID_CREDENTIALS_ENCRYPTION_KEY=replace-with-the-generated-credential-key
GRID_ADMIN_USER=admin
GRID_ADMIN_PASSWORD_HASH_B64=replace-with-the-generated-base64-bcrypt-hash
```

Start the application:

```powershell
npm run dev
```

Open [http://localhost:3015](http://localhost:3015). The process health endpoint is publicly available at [http://localhost:3015/api/health](http://localhost:3015/api/health).

> `config.grid.json` initially points to localhost product URLs. Change them to URLs reachable from the VynGrid server before expecting product checks to succeed.

## First Sign-in

VynGrid has no default password. Sign-in remains disabled until `GRID_ADMIN_PASSWORD_HASH_B64` is configured.

1. Set `GRID_ADMIN_USER` and `GRID_ADMIN_PASSWORD_HASH_B64` in `.env.local`.
2. Start or restart VynGrid.
3. Go to `/login` and enter the configured username and the password used to create the bcrypt hash.
4. Open **Settings** and save integration credentials for products that require login before their health or activity endpoints can be queried. The same page lets the administrator change their password with an eight-character minimum.
5. Use **Test Connection** after each credential change.

All application routes except `/login`, NextAuth endpoints, Next.js assets, and `/api/health` require an authenticated session. Sessions expire after eight hours. Failed sign-ins are rate-limited to 10 attempts per username per 15-minute window.

### Change the administrator login ID

VynGrid supports one administrator login ID. To change it from `admin` to an email-style identifier such as `admin@vyngrid.local`, update the environment variable and restart the application:

```env
GRID_ADMIN_USER=admin@vyngrid.local
```

The password does not need to change. Existing sessions can remain valid until they expire, for up to eight hours.

## Using the Console

### Dashboard

The dashboard loads enabled products from the runtime configuration and refreshes their status at the configured interval. It shows aggregate availability, product cards, cross-product activity, and a compact uptime view.

### Health Matrix

The **Health Matrix** displays current results plus a 30-day observation history. A day is available only when VynGrid recorded one or more checks that day and every recorded check was `online`. Days with no observations are unknown and do not affect the uptime percentage.

### Activity

The **Activity** page collects up to 100 newest normalized events. It recognizes common API response shapes and filters known authentication events, keeping the feed focused on operational changes.

### Settings

Settings are persisted to `config.grid.json`, so no rebuild is required. You can rename the grid, set the refresh interval from 5 to 300 seconds, enable or disable products, alter endpoints, and save/test integration credentials.

## Configuration

`config.grid.json` is the source of truth for the monitored estate. Each product follows this shape:

```json
{
  "id": "example-service",
  "name": "Example Service",
  "tagline": "Operational service overview",
  "url": "https://example.internal",
  "subdomain": "example",
  "healthPath": "/api/health",
  "activityPath": "/api/activity",
  "loginPath": "/api/auth/login",
  "loginType": "json",
  "category": "infrastructure",
  "color": "cyan",
  "enabled": true,
  "order": 1
}
```

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Stable unique identifier. It also keys encrypted credentials and health history. |
| `name` / `tagline` | Yes | Display labels in the console. |
| `url` | Yes | Base URL reachable from the VynGrid server. Avoid a trailing slash. |
| `healthPath` | Yes | JSON endpoint used for availability checks. |
| `activityPath` | No | JSON endpoint for operational events. Defaults to `/api/activity` when omitted. |
| `loginPath` | No | Login endpoint used to establish a session before product requests. |
| `loginType` | No | `json` for a JSON login endpoint or `nextauth` for a NextAuth Credentials flow. |
| `subdomain` | Yes | Used for generated launch links when `NEXT_PUBLIC_VYNGRID_DOMAIN` is set. |
| `category` | Yes | `infrastructure`, `devops`, `finops`, `data`, `ai`, or `sap`. |
| `color` | Yes | `cyan`, `green`, `violet`, `orange`, `emerald`, `blue`, `yellow`, or `rose`. |
| `enabled` | Yes | Determines whether VynGrid monitors and shows the product. |
| `order` | Yes | Ascending display order. |

Do not change a product `id` casually: it creates a new credential and health-history key. Add a new entry or migrate the matching records under `data/` when an identifier must change.

## Product Integration Contract

### Health checks

For each enabled product VynGrid requests:

```text
GET {url}{healthPath}
Accept: application/json
```

Requests bypass caches and have a 4-second timeout.

| Result | VynGrid status |
| --- | --- |
| HTTP 2xx | `online` |
| Non-2xx response | `degraded` |
| Timeout | `degraded` |
| Connection, DNS, or TLS failure | `offline` |
| Login configured but no credential saved | `unknown` |

A successful JSON body can expose a product version as `version` or `v`. The endpoint should return JSON even when authentication is needed, otherwise the connection test reports an HTML login page.

### Authenticated products

When `loginPath` is configured, save a username and password in **Settings**. With `loginType: "json"`, VynGrid submits:

```json
{ "email": "<username>", "password": "<password>" }
```

With `loginType: "nextauth"`, it completes the product's NextAuth CSRF and Credentials callback flow. VynGrid forwards the returned session cookie to health and activity requests.

### Activity endpoints

Activity endpoints must return JSON. VynGrid accepts either an array or an object containing `events`, `data`, `entries`, `alerts`, `incidents`, `active`, `deployments`, or `runs`.

Each item needs a valid timestamp in one of `timestamp`, `ts`, `createdAt`, `created_at`, `updatedAt`, `updated_at`, `deployedAt`, `finishedAt`, or `ALERT_TIMESTAMP`. VynGrid derives message, event type, and severity from common fields, so existing product APIs normally need no special adapter.

## Security

- VynGrid uses NextAuth Credentials authentication with bcrypt password verification.
- Store only a Base64-encoded bcrypt hash in `GRID_ADMIN_PASSWORD_HASH_B64`; never store a plaintext admin password.
- `VYNGRID_CREDENTIALS_ENCRYPTION_KEY` is required to save or read product credentials. Credentials are encrypted with AES-256-GCM in `data/product-credentials.enc.json`.
- Keep the encryption key stable. Rotating it makes existing credentials unreadable; re-enter each credential in Settings after a rotation.
- A password change writes a bcrypt hash to `data/admin-password.json` and signs out the current session. This local override takes precedence over the bootstrap hash in `GRID_ADMIN_PASSWORD_HASH_B64`.
- The password override persists across application restarts and server reboots because it is stored on disk. Ensure `data/` is backed by persistent storage when using containers or ephemeral hosts.
- Retain `GRID_ADMIN_PASSWORD_HASH_B64` as a break-glass recovery credential. Removing `data/admin-password.json` restores the environment-defined password on the next sign-in.
- Credential and history files are written with owner-only (`0600`) permissions where the host supports them.
- Back up `config.grid.json`, `data/health-history.json`, and `data/product-credentials.enc.json` together. Protect the encryption key separately.
- Use HTTPS in production and set VynGrid's canonical public URL correctly.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `AUTH_SECRET` | Yes | Secret used by NextAuth to protect sessions. |
| `NEXTAUTH_SECRET` | Recommended | Production compatibility alias for `AUTH_SECRET`. |
| `NEXTAUTH_URL` | Production | Canonical public VynGrid URL, including protocol. |
| `AUTH_URL` | Recommended | Public VynGrid URL for Auth.js deployments. |
| `AUTH_TRUST_HOST` | Behind a proxy | Set to `true` behind nginx or another TLS-terminating proxy. |
| `GRID_ADMIN_USER` | Yes | Single administrative login ID; defaults to `admin` only if omitted. It can be an email-style identifier. |
| `GRID_ADMIN_PASSWORD_HASH_B64` | Yes | Base64-encoded bcrypt hash. Login is disabled without it. |
| `VYNGRID_CREDENTIALS_ENCRYPTION_KEY` | Yes | Secret used to derive the AES-256-GCM credential key. |
| `NEXT_PUBLIC_VYNGRID_DOMAIN` | Optional | Domain for subdomain launch links, such as `vynops.online`. |
| `NODE_ENV` | Production | Set to `production` for production runs. |

Use `.env.production.example` as a production template. It contains placeholders only; never commit populated environment files.

## API Reference

All endpoints except `GET /api/health` and NextAuth endpoints require a VynGrid session.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` | `GET` | Unauthenticated VynGrid process health response. |
| `/api/products/status` | `GET` | Checks every enabled product, persists history, and returns status results. |
| `/api/activity` | `GET` | Fetches, normalizes, de-duplicates, and returns recent product activity. |
| `/api/config` | `GET` | Returns the active grid configuration. |
| `/api/config` | `PUT` | Replaces the grid configuration; body must contain a `products` array. |
| `/api/config/credentials` | `GET` | Lists product IDs with saved credentials; passwords are never returned. |
| `/api/config/credentials` | `PUT` | Saves encrypted product credentials. |
| `/api/config/credentials/test` | `POST` | Tests a configured product login and health endpoint. |

`GET /api/health` returns:

```json
{ "status": "ok", "service": "vyngrid", "version": "1.0.0" }
```

## Operations

### Build

```powershell
npm run build
```

The project also defines `npm run lint`; it currently invokes `next lint`, which is not supported by current Next.js releases. Use the production build as the authoritative validation until the lint script is updated to call ESLint directly.

### Production with PM2

```powershell
npm run build
npm run start
```

Development and production both use port `3015`. Start the production process with PM2:

```bash
cd /home/vyngrid/vyngrid
npm install
npm run build
pm2 start npm --name vyngrid -- start
pm2 save
```

### nginx Reverse Proxy

For HTTPS, proxy `https://grid.vynops.online` to `http://127.0.0.1:3015`, configure `NEXTAUTH_URL` and `AUTH_URL` with the public HTTPS URL, and set `AUTH_TRUST_HOST=true`. The production nginx configuration is at `deploy/nginx/grid.vynops.online.conf`; the complete DNS, TLS, and PM2 procedure is in [deploy/README-vyngrid-https.md](deploy/README-vyngrid-https.md).

### Apply environment changes

After changing `.env.local` in production, reload its values into the PM2 process. A normal `pm2 restart` can retain the old environment values, including `GRID_ADMIN_USER`.

```bash
cd /home/vyngrid/vyngrid
set -a
. ./.env.local
set +a
pm2 restart vyngrid --update-env
pm2 save
```

Run these commands as the `vyngrid` application user. Verify the service afterwards with `pm2 status vyngrid` and `curl --fail https://grid.vynops.online/api/health`.

For the established VynGrid HTTPS deployment, see [deploy/README-vyngrid-https.md](deploy/README-vyngrid-https.md).

### Persistent Data

| Path | Purpose |
| --- | --- |
| `config.grid.json` | Product definitions and refresh settings. |
| `data/health-history.json` | Rolling 30-day health observations. |
| `data/product-credentials.enc.json` | Encrypted product integration credentials. |
| `data/admin-password.json` | Local bcrypt hash created by an in-app admin password change. |

Back up the `data/` directory on persistent storage. All product URLs are evaluated from the VynGrid server, so `localhost` means the VynGrid host, not the browser running the dashboard.

## Project Structure

```text
src/
  app/          App Router pages and HTTP API routes
  components/   Console, dashboard, grid, and layout components
  hooks/        Client-side status and command-palette hooks
  lib/          Server-side configuration, credential, and product utilities
  types/        Shared TypeScript definitions
data/            Persistent local health, credential, and password records
deploy/          nginx configuration and HTTPS deployment guidance
config.grid.json Product definitions and console settings
```

## Technology Stack

| Technology | Use |
| --- | --- |
| Next.js 16 / React 19 | App Router application and server endpoints |
| TypeScript | Type-safe product, status, and API contracts |
| Tailwind CSS | Console styling and responsive layout |
| NextAuth v5 | Credentials authentication and sessions |
| bcryptjs | Administrator password hashing and verification |
| Node.js crypto | AES-256-GCM encryption for product credentials |
| PM2 and nginx | Production process management and HTTPS reverse proxy |

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| Cannot sign in | Set `GRID_ADMIN_PASSWORD_HASH_B64` to a Base64-encoded bcrypt hash, restart VynGrid, and verify the username matches `GRID_ADMIN_USER`. |
| Product shows `unknown` | Its `loginPath` is set but credentials have not been saved. Add them in Settings. |
| Product shows `offline` | VynGrid cannot connect to its base URL. Verify DNS, TLS, firewall rules, and server-side reachability. |
| Product shows `degraded` | The health endpoint timed out or returned a non-2xx response. Inspect that product's health endpoint. |
| Test reports an HTML/login page | Point `healthPath` to a JSON endpoint and verify the login flow returns a session cookie. |
| Credentials fail after a rotation | Restore the previous encryption key or save every product credential again with the new key. |
| Product links use the wrong address | Update the product base URL or set `NEXT_PUBLIC_VYNGRID_DOMAIN` and matching `subdomain` values. |
| Health history does not persist | Ensure the VynGrid process can write to `data/`. |

## Related Projects

VynGrid is the shared operations console for the VynOps product suite. Its default configuration includes VynOps, VynDC, VynCICD, VynCost, VynDB, VynAI, VynHana, and VynSAP. Product availability depends on each product exposing a configured JSON health endpoint; activity integration is optional.

## License

This repository does not currently declare a license. Treat distribution and reuse as restricted until a license is added.
