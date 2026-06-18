# ⏱️ ChronoTrack Enterprise

**Live Demo:** [https://chrono-track-tau.vercel.app](https://chrono-track-tau.vercel.app)

ChronoTrack is a high-performance time-tracking and analytics portal designed for scaling organizations of **1,600+ employees**. 

This repository houses the **Strategic Product Roadmap** and an **Interactive Prototype Sandbox**, allowing stakeholders to explore the progression from Phase 1 (Minimum Viable Product) to Phase 2 (Fully Viable Product) features.

---

## 🚀 Key Features

### 📊 Company Analytics Dashboard
* **Project Allocations:** Interactive charting showing actual hours spent vs. budgeted/allocated hours per project.
* **Role Distribution:** Percentage breakdowns of logged time by organizational departments (Engineering, Design, QA, Management).
* **Project Cost Ledger:** Real-time billing estimations multiplying actual hours by role rates.
* **Utilization Heatmaps:** Interactive capacity analysis to identify over-utilized (burnout risk) and under-utilized resources.

### 👤 Employee Time-Logging Portal
* **Visual daily timeline:** Stacked interval representation showing the composition of daily logged blocks.
* **Manual Data Entry:** Simple form for logging Date, Project, Task Description, and Duration.
* **Live Stopwatch Widget (FVP Feature):** Start/stop/pause stopwatch to capture precise time and automatically populate timesheet logs.
* **Smart Integration Mocks (FVP Feature):** Click-to-import suggestions detected from Google/Outlook Calendar, GitHub commits, and Slack channels.

### ⚙️ Manager & Admin Workflows
* **Timesheet Approval Flow:** Manager weekly digest to approve, reject, or request revisions for employee logs.
* **Automated Slack Nudge Bot:** Dispatch polite Slack reminders to employees below the 40-hour weekly threshold.
* **Lock Dates Control:** Administrative override to prevent modifications of timesheets in locked billing periods.
* **System Audit Logs:** Immutable logs tracking all administrative and user time block adjustments.
* **5:00 PM Concurrency Rush Simulator:** Interactive database stress-test simulating 1,600 simultaneous logins, graphing response times and connection pool health.

---

## 🏗️ Tech Stack Evolution

### Phase 1: MVP Architecture (Speed & Stability)
* **Frontend:** React.js / Vite (SPA)
* **Backend Monolith:** Node.js API (Express/NestJS)
* **Database:** PostgreSQL (AWS RDS)

### Phase 2: FVP Architecture (Scale & Big Data)
* **Caching Layer:** Redis (absorbing 90% of read loads)
* **Analytics Warehouse:** Snowflake / BigQuery event-streams
* **Notification & Analytics Engines:** Decoupled Microservices

---

## 🛠️ Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ChronoTrack.git
   cd ChronoTrack
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
