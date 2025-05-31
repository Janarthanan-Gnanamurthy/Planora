# Planora - AI-Powered Project Management

Planora is a full-stack application designed to streamline project management with the power of AI. It offers a comprehensive suite of tools for individuals and teams to plan, track, and collaborate on projects efficiently.

## Project Structure

-   **/frontend**: Contains the frontend Next.js application.
-   **/Backend**: Contains the backend FastAPI (Python) application.

## Tech Stack

### Backend

-   **Framework:** FastAPI
-   **Database:** PostgreSQL (using SQLAlchemy, configured for AWS RDS)
-   **Authentication:** Implemented with Clerk (via frontend integration and user IDs)
-   **AI:** Google Gemini (gemini-2.0-flash or gemini-pro)
-   **Libraries:** Pydantic for data validation.

### Frontend

-   **Framework:** Next.js
-   **UI Library:** React
-   **Styling:** Tailwind CSS
-   **State Management:** Zustand
-   **Authentication:** Clerk (@clerk/nextjs)
-   **Icons:** Lucide React
-   **Linting:** ESLint
-   **Potentially for email functionalities:** Nodemailer (further investigation might be needed on its exact use case here)

## Core Features

### User Management
- Secure user registration and login (powered by Clerk).
- User profile management.

### Project Management
- Create, view, update, and delete projects.
- Assign project owners.
- Add and manage project collaborators.

### Task Management
- Create, view, update, and delete tasks within projects.
- Assign tasks to team members.
- Set task status (e.g., To Do, In Progress, Done).
- Define task priority and deadlines.
- Filter tasks by project, assignee, or status.

### Collaboration
- Commenting system on tasks for discussions.
- (Potentially) Real-time updates and notifications (needs verification).

### AI-Powered Enhancements
-   **Smart Assistant:** Get AI-driven help and suggestions.
-   **Project Insights:** AI-generated analysis of project progress and health.
-   **Task Optimizer:** Suggestions for improving task efficiency and breakdown.
-   **Smart Task Creation:** Describe project goals and let AI suggest or auto-create relevant tasks.
-   **Workflow Automation:** Automate routine processes like:
    -   Daily stand-up summaries.
    -   Weekly review generations.
    -   Deadline alerts.
-   **Team Insights:** AI-driven analysis of team performance and workload.

## Getting Started

*Instructions for setting up and running the project will go here.*

### Prerequisites
*   Node.js and npm/yarn for the frontend.
*   Python and pip for the backend.
*   Access to a relational database compatible with SQLAlchemy.
*   Google API Key for AI features.
*   Clerk an account and API keys for authentication.

### Backend Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd Planora/Backend
    ```
2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Set up environment variables:**
    Create a `.env` file in the `Backend` directory and add the following (replace placeholders with your actual credentials):
    ```env
    GOOGLE_API_KEY="your_google_api_key"
    DATABASE_URL="your_database_connection_string" 
    # Example for PostgreSQL: postgresql://user:password@host:port/database
    ```
5.  **Run database migrations (if applicable):**
    The application attempts to create tables on startup. For production, consider using Alembic.
6.  **Start the backend server:**
    ```bash
    uvicorn app:app --reload 
    # Or: python app.py if not using uvicorn directly
    ```
    The backend will typically run on `http://127.0.0.1:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend 
    # (Assuming you are in the Backend directory)
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install
    ```
3.  **Set up environment variables:**
    Create a `.env.local` file in the `frontend` directory and add your Clerk API keys:
    ```env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
    CLERK_SECRET_KEY=your_clerk_secret_key

    NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
    ```
4.  **Start the frontend development server:**
    ```bash
    npm run dev
    # or yarn dev
    ```
    The frontend will typically run on `http://localhost:3000`.

## API Endpoints

The backend exposes a RESTful API. Key endpoint groups include:
- `/users`
- `/projects`
- `/tasks`
- `/comments`
- `/ai/*` (for various AI functionalities)

*Refer to `Backend/app.py` for detailed endpoint definitions and request/response schemas.*

## Future Enhancements (Ideas)

-   Real-time notifications for task updates and comments.
-   Advanced reporting and analytics dashboards.
-   File attachments to tasks and projects.
-   Integration with other third-party tools (e.g., calendars, code repositories).
-   More sophisticated AI-driven scheduling and resource allocation.

## Contributing

*Information on how to contribute to the project.*

---

*This README is a starting point. Feel free to expand it with more details, diagrams, and specific instructions as the project evolves.* 