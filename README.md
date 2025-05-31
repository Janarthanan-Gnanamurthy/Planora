# 🚀 Planora - AI-Powered Project Management

[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![AWS RDS](https://img.shields.io/badge/AWS%20RDS-527FFF?style=for-the-badge&logo=amazon-rds&logoColor=white)](https://aws.amazon.com/rds/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> 🤖 Supercharge your project management with AI-powered insights and automation!

Planora is a cutting-edge full-stack application that revolutionizes project management through artificial intelligence. Experience seamless planning, tracking, and collaboration like never before.

## 📁 Project Structure

```
Planora
├── frontend/    # Next.js application
└── Backend/     # FastAPI (Python) application
```

## 🛠️ Tech Stack

### 🔧 Backend

- **Framework:** FastAPI
- **Database:** PostgreSQL on Amazon RDS (with SQLAlchemy ORM)
- **Authentication:** Clerk integration
- **AI:** Google Gemini (gemini-2.0-flash or gemini-pro)
- **Libraries:** Pydantic for data validation

### 🎨 Frontend

- **Framework:** Next.js
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Authentication:** Clerk (@clerk/nextjs)
- **Icons:** Lucide React
- **Linting:** ESLint

## ✨ Core Features

### 👥 User Management
-  Secure user registration and login
-  User profile management

### 📋 Project Management
-  Create, view, update, and delete projects
-  Assign project owners
-  Add and manage project collaborators

### ✅ Task Management
-  Create and manage tasks within projects
-  Assign tasks to team members
-  Set task status and priority
-  Define deadlines
-  Advanced task filtering

### 🤝 Collaboration
- Rich commenting system
-  Real-time updates and notifications

### 🤖 AI-Powered Enhancements

- **Smart Assistant:** Get AI-driven help and suggestions
-  **Project Insights:** AI-generated analysis
-  **Task Optimizer:** Efficiency suggestions
-  **Smart Task Creation:** AI-powered task generation
-  **Workflow Automation:**
  -  Daily stand-up summaries
  -  Weekly review generations
  -  Smart deadline alerts
-  **Team Insights:** Performance and workload analysis

## 🚀 Getting Started

### 📋 Prerequisites
-  Node.js and npm/yarn for the frontend
-  Python and pip for the backend
-  Amazon RDS PostgreSQL instance
-  Google API Key for AI features
-  Clerk account and API keys for authentication
-  AWS credentials with RDS access

### ⚙️ Backend Setup

1. **📥 Clone the repository:**
   ```bash
   git clone <repository_url>
   cd Planora/Backend
   ```

2. **🔧 Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **📦 Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **🔐 Set up environment variables:**
   Create a `.env` file in the `Backend` directory:
   ```env
   GOOGLE_API_KEY="your_google_api_key"
   
   # AWS RDS Database Configuration
   DB_HOST="your-rds-endpoint.region.rds.amazonaws.com"
   DB_PORT="5432"
   DB_NAME="your_database_name"
   DB_USER="your_database_user"
   DB_PASSWORD="your_database_password"
   
   # Combined Database URL
   DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
   
   # Optional AWS Configuration (if not using AWS CLI defaults)
   AWS_ACCESS_KEY_ID="your_aws_access_key"
   AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
   AWS_REGION="your_aws_region"
   ```

5. **🏃‍♂️ Start the backend server:**
   ```bash
   uvicorn app:app --reload
   # The backend will run on http://127.0.0.1:8000
   ```

### 🎨 Frontend Setup

1. **📂 Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **📦 Install dependencies:**
   ```bash
   npm install
   # or: yarn install
   ```

3. **🔐 Set up environment variables:**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key

   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   ```

4. **🚀 Start the development server:**
   ```bash
   npm run dev
   # The frontend will run on http://localhost:3000
   ```

## 🔌 API Endpoints

The backend exposes a RESTful API with these key endpoint groups:

```
 /users    - User management
 /projects - Project operations
 /tasks    - Task management
 /comments - Discussion system
 /ai/*     - AI functionalities
```

*Refer to `Backend/app.py` for detailed endpoint definitions and schemas.*

## 🚀 Future Enhancements

-  Real-time notifications for task updates and comments
-  Advanced reporting and analytics dashboards
-  File attachments for tasks and projects
-  Integration with third-party tools
-  Enhanced AI-driven scheduling and resource allocation

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

---

<div align="center">

[![Made with ❤️](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-red.svg)](https://github.com/yourusername/planora)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

*This README is a starting point. Feel free to expand it with more details, diagrams, and specific instructions as the project evolves.* 