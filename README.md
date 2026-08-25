# NexoraCore | Enterprise Resource Planning (ERP) System

NexoraCore is a Full-Stack, event-driven ERP system designed for manufacturing and supply chain management. It features a decoupled microservice architecture, real-time cross-module automation, and strict Role-Based Access Control (RBAC).

## 🏗️ Architecture Overview

The system utilizes a dual-backend infrastructure to separate standard API routing from heavy financial computations, ensuring high availability and scalability.

*   **Frontend Client:** Pure HTML5, CSS3 (Custom Enterprise Design System), Vanilla JS.
*   **Primary API Gateway:** Node.js & Express.js (Handles routing, RBAC validation, and NoSQL queries).
*   **Computational Microservice:** Python & Flask (Isolated engine for dynamic tax, GST, and net profit calculations).
*   **Database:** Google Workspace Cloud API (Google Sheets utilized as a live, bi-directional NoSQL document store).

## 🚀 Core Technical Features

### 1. Event-Driven Supply Chain Automation
When procurement or sales events are logged in the Supply module, the Node.js backend automatically triggers asynchronous updates to the Financial Core ledgers, eliminating double data entry.

### 2. Strict Data Validation & Auditing
*   **Backend Gatekeeping:** The Express APIs enforce strict payload validation (e.g., rejecting negative inventory quantities or malformed strings) before data execution.
*   **Immutable Logs:** All sensitive database interactions (Task QA, Procurement, HR Provisioning) are silently stamped with the active user's identity to ensure enterprise accountability.

### 3. Dynamic Authentication & RBAC
Custom session tokenization via `LocalStorage`. The system dynamically reads the database to verify credentials, route users based on their clearance (Manager vs. Staff), and dynamically render UI elements based on authorization levels.

## ⚙️ Local Development Setup

### Prerequisites
*   Node.js (v16+)
*   Python (3.8+)
*   Google Cloud Console Service Account (`credentials.json`)

### Installation

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/Omsaraiya/NexoraCore.git
   cd NexoraCore
   \`\`\`

2. **Initialize the Node.js API Gateway:**
   \`\`\`bash
   npm install express cors googleapis
   node server.js
   \`\`\`
   *Server will run on http://localhost:3000*

3. **Initialize the Python Financial Microservice:**
   \`\`\`bash
   cd python_engine
   pip install flask flask-cors
   python app.py
   \`\`\`
   *Microservice will run on http://127.0.0.1:5000*

4. **Launch the Client:**
   Open `public/index.html` in any modern web browser or run via Live Server.

## 👨‍💻 Developer
Developed by **Om Saraiya** - BCA Graduate specializing in Full-Stack Architecture and Microservice Integration.