# AI Business Operations Assistant 🤖

An AI-powered ticket intelligence platform that automatically classifies, prioritizes, and routes employee support requests to the correct department, helping organizations streamline internal operations through intelligent workflow automation.

---

## ✨ About

AI Business Operations Assistant is a modern internal support platform designed to reduce manual ticket triaging and improve operational efficiency.

Using Google Gemini AI, the system analyzes employee requests, determines the appropriate department, assigns urgency levels, and routes tickets automatically to the teams responsible for resolving them.

The platform is built around three operational departments:

💻 IT — Technical support, system access, network issues, hardware and software requests

👥 HR — Employee onboarding, leave requests, payroll queries, and people operations

💰 Finance — Invoices, reimbursements, supplier payments, budgets, and financial approvals

The system acts as an intelligent operations coordinator, ensuring requests reach the right department while providing employees with real-time visibility into their ticket status.

---

## 🚀 Key Features

| Feature                       | Description                                                              |
| ----------------------------- | ------------------------------------------------------------------------ |
| AI Ticket Classification      | Automatically assigns tickets to the correct department using Gemini AI. |
| AI Priority Detection         | Determines urgency levels without requiring employee input.              |
| Automated Ticket Routing      | Sends tickets directly to the responsible department queue.              |
| Role-Based Access Control     | Employees, Departments, and Super Admins have dedicated permissions.     |
| Operations Command Center     | Centralized oversight dashboard for operational monitoring.              |
| Department Isolation          | HR, IT, and Finance can only view tickets assigned to them.              |
| Ticket History                | Employees can track the full lifecycle of submitted tickets.             |
| Resolution Notifications      | Employees are notified when ticket statuses change or are resolved.      |
| Real-Time Workflow Monitoring | Track operational activity across departments.                           |
| Secure Authentication         | Supabase-powered authentication and session management.                  |

---

## 🏗️ System Architecture

### Employee Workflow

Employee logs in

↓

Submits support request

↓

Gemini AI analyzes request

↓

AI determines:

* Department
* Priority
* Summary

↓

Ticket automatically routed

↓

Department resolves request

↓

Employee receives updates

---

### Operations Workflow

Super Admin monitors:

* All tickets
* Department workloads
* Critical incidents
* Escalations
* Resolution progress

without directly resolving tickets.

---

## 👥 User Roles

### Employee

Can:

* Submit tickets
* View ticket history
* Track ticket status
* Receive notifications

Cannot:

* Access department queues
* View other tickets
* Assign priorities

---

### Department Users

Departments:

* IT
* HR
* Finance

Can:

* View assigned tickets
* Update statuses
* Resolve tickets

Cannot:

* View tickets from other departments
* Manage users
* Access Operations Command Center

---

### Operations Manager

Can:

* View all tickets
* Monitor all departments
* Create users
* Manage roles
* Oversee operational workflows

Acts as an operational overseer rather than a ticket resolver.

---

## 🤖 AI Capabilities

Powered by Google Gemini AI.

The AI engine:

* Classifies tickets
* Generates department assignments
* Creates AI summaries
* Determines urgency levels
* Prioritizes queues
* Assists with operational workflow automation

### Example

Input:

"My laptop cannot connect to the VPN."

Output:

* Department: IT
* Priority: High
* Status: New

---

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Tailwind CSS
* Framer Motion

### Backend

* Supabase
* PostgreSQL
* Supabase Authentication

### Artificial Intelligence

* Google Gemini API

### Visualization

* Recharts
* Chart.js

### Development Platform

* Lovable

---

## 📁 Core Modules

### Authentication

* Login
* Session Management
* Role-Based Access

### Ticket Management

* Ticket Submission
* Ticket Classification
* Status Tracking
* Ticket History

### Department Portals

* IT Queue
* HR Queue
* Finance Queue

### Operations Command Center

* User Management
* Ticket Monitoring
* Workflow Oversight

---

## 🔐 Security Features

* Role-based access control
* Department-level ticket isolation
* Protected routes
* Secure authentication
* Supabase session management

---

## ⚙️ Running Locally

```bash
npm install

npm run dev
```

The application will run at:

```bash
http://localhost:5173
```

---

## Environment Variables

Managed through Lovable and Supabase:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
```

---

## 💡 Future Enhancements

* SLA tracking
* Email notifications
* Microsoft Teams integration
* Slack integration
* AI-powered ticket recommendations
* Predictive workload analytics
* Knowledge base integration

---

## 👨‍💻 Built With

Built using Lovable, Supabase, React, TypeScript, Tailwind CSS, and Google Gemini AI to demonstrate how intelligent automation can improve internal business operations and ticket management workflows.
