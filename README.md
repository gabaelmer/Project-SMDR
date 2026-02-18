# SMDR Insight

[![Build and Release](https://github.com/gabaelmer/Project-SMDR/actions/workflows/build.yml/badge.svg)](https://github.com/gabaelmer/Project-SMDR/actions/workflows/build.yml)

Modern cross-platform desktop application for MiVoice Business SMDR collection and analytics.

## Stack

- Backend: Node.js + TypeScript
- Desktop shell: Electron
- Frontend: React + TailwindCSS
- State: Zustand
- Storage: SQLite (`better-sqlite3`)
- Charts: Recharts
- Grid: TanStack Table
- TCP client: Node `net` module
- Packaging: Electron Builder

## Project Structure

```text
/main      Electron main process + IPC
/renderer  React app (dashboard, call log, analytics, settings)
/backend   TCP client, parser, DB, alerts, analytics
/shared    Shared TypeScript types
/tests     Unit + integration tests
/scripts   Load/memory/failover simulations
```

## Features Implemented

- TCP client to MiVB SMDR stream on port `1752`
- Auto reconnect (`5s` default)
- Multi-controller failover and primary failback probe
- Parser for SMDR line records with dynamic option detection:
  - External/Internal records
  - Call IDs, associated IDs, sequence IDs
  - Network OLI
  - Extended digits
  - Account codes
  - Completion flags and transfer/conference flags
- SQLite storage with indices and optional field encryption
- Daily rollover archive (`CSV`) + retention purge
- Export to CSV / Excel (`.xlsx`)
- Dashboard metrics, call log table, analytics charts/heatmap/correlation
- Alert engine:
  - Long call threshold
  - Watch numbers
  - Repeated busy calls
  - Tag call detection
  - Toll denied detection
- Local login/auth bootstrap (`admin` / `admin123!` on first run)
- Desktop notifications for alert events
- Test suite and simulators

## Installation

### Ubuntu/Debian One-Liner

Install the latest version directly from GitHub:

```bash
curl -fsSL https://raw.githubusercontent.com/gabaelmer/Project-SMDR/main/install.sh | sudo bash
```

### Local Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/gabaelmer/Project-SMDR.git
cd Project-SMDR

# 2. Install dependencies
npm install
```

Or use the integrated launcher:

```bash
./run-smdr-insight.sh setup
```

## Run Dev

```bash
npm run dev
```

Integrated launcher (recommended):

```bash
./run-smdr-insight.sh dev
```

If you see `better-sqlite3 ... NODE_MODULE_VERSION ...` mismatch errors, run:

```bash
npm run rebuild:native
```

After login, configure MiVoice Business in `Settings`:
- `MiVoice Business Controller IPs (comma separated)`
- `Port` (default `1752`)
- Click `Save Configuration`, then `Start Stream`

## Build Linux Packages

```bash
npm run dist
```

Integrated launcher:

```bash
./run-smdr-insight.sh dist
```

Targets:

- AppImage
- deb
- tar.gz

Publisher/maintainer metadata: `elmertech.work`

## Test Commands

```bash
npm test
npm run simulate:stream
npm run simulate:failover
npm run test:load
npm run test:memory
npm run test:all
```

Integrated test/debug sequence:

```bash
./run-smdr-insight.sh test
```

## Notes

- MiVB limits SMDR sessions to max 10 concurrent connections. Configuration enforces `1-10`.
- This implementation uses field-level encryption for sensitive values when `storage.encryptionKey` is set.
- Parser is resilient for variable-length lines and ignores malformed records with separate parse-error logging.
- Designed to run on Ubuntu Server/Desktop, Debian, and other Linux distributions that support Electron runtime dependencies.
- Linux VM note: `npm run dev` uses `--no-sandbox --disable-setuid-sandbox` for Electron dev startup to avoid the `chrome-sandbox` SUID error in restricted environments.
