# 🥥 FoodScan: Instant Palm Oil Detector & Health Scanner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg)](https://vitejs.dev/)
[![SQLite WASM](https://img.shields.io/badge/SQLite%20WASM-High%20Perf-orange)](https://sqlite.org/wasm)

**FoodScan** is a high-performance, **offline-first** Progressive Web App (PWA) designed to instantly detect palm oil and hidden additives in food products. 

Built as a technical showcase for **Advanced Local-First Architecture**, it demonstrates how to handle millions of records directly in the browser using `wa-sqlite` and the Origin Private File System (OPFS), delivering sub-millisecond query performance without needing a backend server for every scan.

🚀 **Live Demo**: [https://fxxii.github.io/ingredients-finder/](https://fxxii.github.io/ingredients-finder/)

---

## 🚀 Key Features

*   **⚡ Instant Offline Scanning**: Powered by a local SQLite database that runs entirely in your browser. Scans work perfectly even in airplane mode.
*   **🥥 Advanced Palm Oil Detection**: 
    *   **Direct Detection**: Identifies explicit palm oil ingredients.
    *   **Ambiguous Ingredients**: Flags ingredients like "Vegetable Oil" or "E471" that *might* be derived from palm oil (Orange Warning).
*   **🏥 Health Intelligence**:
    *   **Nutri-Score & NOVA**: Visualizing nutritional quality and processing levels.
    *   **Nutrient Alerts**: Dynamic warnings for high Sugar, Fat, or Salt.
    *   **Additives Analysis**: Collapsible breakdown of E-numbers and chemical additives.
*   **📸 Visual Product Feedback**: Displays product thumbnails directly from the Open Food Facts API (when online).
*   **📱 Installable PWA**: Works like a native app on iOS and Android with full offline support.

---

## 🛠️ The Tech Stack (Under the Hood)

This project isn't just a barcode scanner; it's a demonstration of modern web capabilities pushing the boundaries of what's possible in a browser.

*   **Database**: `wa-sqlite` (WebAssembly) backed by **OPFS** (Origin Private File System).
    *   *Why?* Standard LocalStorage/IndexedDB crush under the weight of large datasets. SQLite with OPFS allows us to query gigabytes of data with native-like performance.
*   **Data Pipeline**: **DuckDB** + **GitHub Actions**.
    *   *The "Distiller"*: A custom SQL pipeline (`utils/distill.sql`) that processes the massive Open Food Facts CSV dump (several GBs), filters it down to a mobile-optimized schema, and generates a compact SQLite binary for the app to download.
*   **Performance**: 
    *   **COEP/COOP Security**: Configured with `Cross-Origin-Embedder-Policy: credentialless` to enable `SharedArrayBuffer` for multi-threaded database operations while still allowing external images.
    *   **Virtualization**: Efficient rendering of scan history and lists.
*   **State Management**: `Zustand` for a lightweight, hook-based global state.
*   **UI/UX**: `TailwindCSS` for styling and `Framer Motion` for 60fps micro-interactions and transitions.

---

## 🏗️ Local Development

### Prerequisites
*   Node.js 18+
*   npm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/StartInOneDay/FoodScan
    cd FoodScan
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```
    *Note: The app requires HTTPS for the barcode scanner and SQLite WASM to function correctly. The dev server uses a self-signed certificate.*

4.  **Build for production**
    ```bash
    npm run build
    npm run preview
    ```

---

## 🧬 Data Architecture

The application uses a **"Smart Fallback"** strategy for data retrieval:

1.  **Local Cache (Memory/DB)**: Checks if the product exists in the high-speed local SQlite database.
2.  **API Fallback**: If not found locally (or if the user is online), it fetches the latest data from the [Open Food Facts API](https://world.openfoodfacts.org/data).
3.  **Sync**: Successful API scans can be cached locally to improve future offline performance.

---

## 🤝 Acknowledgements

*   **[Open Food Facts](https://world.openfoodfacts.org/)**: For the incredible open database of food products.
*   **rhashimoto**: For the `wa-sqlite` library that makes high-performance local SQL possible.

