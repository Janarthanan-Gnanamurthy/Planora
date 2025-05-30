# main.py
from fastapi import FastAPI, HTTPException, Body, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Dict, Any
import uuid
import os
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from agents import ai_smart_assistant, ai_project_insights, ai_task_optimizer, ai_smart_task_creation


import google.generativeai as genai

# Import database setup, models, and schemas
import database, models, schemas # Use relative imports if files are in the same package/directory

# --- CONFIG ---
# Ensure GOOGLE_API_KEY is set in your environment variables
try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY","AIzaSyDHKg9AFSfhOgBT_gyUQKQwB4-0N8MvlSQ"))
    model = genai.GenerativeModel('gemini-2.0-flash') # or 'gemini-pro'
except Exception as e:
    print(f"Error configuring Gemini SDK: {e}. AI features might not work.")
    model = None


# --- FASTAPI APP INITIALIZATION ---
app = FastAPI(title="AI Project Management Backend with RDS")

# origins = [
#     "http://localhost:3000",
#     "http://127.0.0.1:3000"
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["*"] to allow all (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
# In a production environment, you would typically use Alembic for migrations.
try:
    models.Base.metadata.create_all(bind=database.engine)
    print("Database tables created or already exist.")
except Exception as e:
    print(f"Error creating database tables: {e}")


# --- CRUD ENDPOINTS ---

# Users
@app.post("/users", response_model=schemas.User, status_code=201, tags=["Users"])
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """
    Create a new user. Username must be unique.
    """
    db_user_check = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user_check:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user_id = str(uuid.uuid4())
    db_user = models.User(id=user_id, username=user.username, clerkId=user.clerkId)
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    except IntegrityError: # Catch potential race conditions for unique username
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already registered (race condition)")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create user: {str(e)}")
    return db_user

@app.get("/users", response_model=List[schemas.User], tags=["Users"])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """
    Retrieve a list of users with pagination.
    """
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@app.get("/users/{user_id}", response_model=schemas.User, tags=["Users"])
def get_user(user_id: str, db: Session = Depends(database.get_db)):
    """
    Retrieve a specific user by ID.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
    

# Projects
@app.post("/projects", response_model=schemas.Project, status_code=201, tags=["Projects"])
def create_project(project: schemas.ProjectCreate, db: Session = Depends(database.get_db)):
    """
    Create a new project. Owner must exist.
    """
    db_owner = db.query(models.User).filter(models.User.id == project.owner_id).first()
    if not db_owner:
        raise HTTPException(status_code=404, detail=f"Owner with id {project.owner_id} not found")
    
    project_id = str(uuid.uuid4())
    db_project = models.Project(
        id=project_id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        collaborators=project.collaborators
    )
    try:
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create project: {str(e)}")
    return db_project

@app.get("/projects", response_model=List[schemas.Project], tags=["Projects"])
def list_projects(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """
    Retrieve a list of projects with pagination.
    """
    projects = db.query(models.Project).offset(skip).limit(limit).all()
    return projects

@app.get("/projects/{project_id}", response_model=schemas.Project, tags=["Projects"])
def get_project(project_id: str, db: Session = Depends(database.get_db)):
    """
    Retrieve a specific project by ID.
    """
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.post("/projects/add-collaborators", response_model=schemas.Project, tags=["Projects"])
def add_collaborators_to_project(
    data: schemas.ProjectAddCollaborators, db: Session = Depends(database.get_db)
):
    """
    Add collaborators to a project. Replaces the current list of collaborators with the provided list.
    """
    db_project = db.query(models.Project).filter(models.Project.id == data.project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail=f"Project with id {data.project_id} not found")

    # Validate all user IDs exist
    # for user_id in data.collaborator_ids:
    #     db_user = db.query(models.User).filter(models.User.id == user_id).first()
    #     if not db_user:
    #         raise HTTPException(status_code=404, detail=f"Collaborator user with id {user_id} not found")

    # Get existing collaborators or initialize empty list
    existing_collaborators = db_project.collaborators or []
    
    # Add new collaborators, avoiding duplicates
    new_collaborators = list(set(existing_collaborators + data.collaborator_ids))
    
    # Update the project's collaborators
    db_project.collaborators = new_collaborators
    try:
        db.commit()
        db.refresh(db_project)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not update collaborators: {str(e)}")

    return db_project

# Tasks
@app.post("/tasks", response_model=schemas.Task, status_code=201, tags=["Tasks"])
def create_task(task: schemas.TaskCreate, db: Session = Depends(database.get_db)):
    """
    Create a new task. Project must exist. If assigned_to is provided, user must exist.
    """
    db_project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail=f"Project with id {task.project_id} not found")

    if task.assigned_to:
        db_assignee = db.query(models.User).filter(models.User.id == task.assigned_to).first()
        if not db_assignee:
            raise HTTPException(status_code=404, detail=f"Assignee user with id {task.assigned_to} not found")
    
    task_id = str(uuid.uuid4())
    created_at = task.created_at if task.created_at else datetime.utcnow().isoformat()
    db_task = models.Task(
        id=task_id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        assigned_to_id=task.assigned_to, # Maps Pydantic's 'assigned_to' to SQLAlchemy's 'assigned_to_id'
        status=task.status,
        created_at=created_at,
        deadline=task.deadline,
        priority=task.priority
    )
    try:
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create task: {str(e)}")
    return db_task

@app.get("/tasks", response_model=List[schemas.Task], tags=["Tasks"])
def list_tasks(
    project_id: Optional[str] = None, 
    assigned_to_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db)
):
    """
    Retrieve a list of tasks with pagination and optional filtering.
    """
    query = db.query(models.Task)
    if project_id:
        query = query.filter(models.Task.project_id == project_id)
    if assigned_to_id:
        query = query.filter(models.Task.assigned_to_id == assigned_to_id)
    if status:
        query = query.filter(models.Task.status == status)
    
    tasks = query.offset(skip).limit(limit).all()
    return tasks


@app.get("/tasks/{task_id}", response_model=schemas.Task, tags=["Tasks"])
def get_task(task_id: str, db: Session = Depends(database.get_db)):
    """
    Retrieve a specific task by ID.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@app.put("/tasks/{task_id}", response_model=schemas.Task, tags=["Tasks"])
def update_task(task_id: str, task_update: schemas.TaskUpdate, db: Session = Depends(database.get_db)):
    """
    Update an existing task.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.dict(exclude_unset=True)

    if "assigned_to" in update_data and update_data["assigned_to"] is not None:
        db_assignee = db.query(models.User).filter(models.User.id == update_data["assigned_to"]).first()
        if not db_assignee:
            raise HTTPException(status_code=404, detail=f"Assignee user with id {update_data['assigned_to']} not found")
        db_task.assigned_to_id = update_data["assigned_to"] # Map to DB model field
        del update_data["assigned_to"] # Remove from dict to avoid direct assignment

    # Handle created_at and priority
    if "created_at" in update_data and update_data["created_at"] is not None:
        db_task.created_at = update_data["created_at"]
        del update_data["created_at"]
    if "priority" in update_data:
        db_task.priority = update_data["priority"]
        del update_data["priority"]

    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    try:
        db.commit()
        db.refresh(db_task)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not update task: {str(e)}")
    return db_task


@app.delete("/tasks/{task_id}", status_code=204, tags=["Tasks"])
def delete_task(task_id: str, db: Session = Depends(database.get_db)):
    """
    Delete a task by ID.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    try:
        db.delete(db_task)
        db.commit()
    except Exception as e: # Catch potential errors, e.g. foreign key constraints if not handled by cascade
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not delete task: {str(e)}")
    return None # No content for 204


# Comments
@app.post("/comments", response_model=schemas.Comment, status_code=201, tags=["Comments"])
def create_comment(comment: schemas.CommentCreate, db: Session = Depends(database.get_db)):
    """
    Create a new comment. Task and User must exist.
    """
    db_task = db.query(models.Task).filter(models.Task.id == comment.task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail=f"Task with id {comment.task_id} not found")
    
    db_user = db.query(models.User).filter(models.User.id == comment.user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail=f"User with id {comment.user_id} not found")

    comment_id = str(uuid.uuid4())
    db_comment = models.Comment(
        id=comment_id,
        task_id=comment.task_id,
        user_id=comment.user_id,
        content=comment.content
    )
    try:
        db.add(db_comment)
        db.commit()
        db.refresh(db_comment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create comment: {str(e)}")
    return db_comment

@app.get("/comments", response_model=List[schemas.Comment], tags=["Comments"])
def list_comments(
    task_id: Optional[str] = None, 
    user_id: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db)
):
    """
    Retrieve a list of comments with pagination and optional filtering by task or user.
    """
    query = db.query(models.Comment)
    if task_id:
        query = query.filter(models.Comment.task_id == task_id)
    if user_id:
        query = query.filter(models.Comment.user_id == user_id)
    
    comments = query.offset(skip).limit(limit).all()
    return comments


# --- AI ENDPOINTS ---

@app.post("/ai/smart_assistant", tags=["AI"])
async def smart_ai_assistant(
    user_id: str = Body(...),
    query: str = Body(...),
    project_id: str = Body(None),
    task_id: str = Body(None),
    db: Session = Depends(database.get_db)
):
    """
    Intelligent AI assistant that can:
    - Analyze projects and suggest improvements
    - Create tasks with smart defaults
    - Update task statuses and priorities
    - Identify bottlenecks and overdue items
    - Provide strategic project guidance
    """
    result = await ai_smart_assistant(user_id, query, project_id, task_id, db)
    return  result


@app.post("/ai/project_insights", tags=["AI"])
async def get_project_insights(
    user_id: str = Body(...),
    project_id: str = Body(...),
    db: Session = Depends(database.get_db)
):
    """
    Get comprehensive AI-powered project insights:
    - Overall project health
    - Task completion trends
    - Bottleneck identification
    - Resource allocation suggestions
    - Risk assessment
    """
    insights = await ai_project_insights(user_id, project_id, db)
    return insights


@app.post("/ai/optimize_task", tags=["AI"])
async def optimize_task(
    task_id: str = Body(...),
    db: Session = Depends(database.get_db)
):
    """
    Deep analysis of task complexity:
    - Complexity scoring
    - Subtask breakdown suggestions
    - Time estimation
    - Risk factors
    - Dependencies analysis
    """
    optimization = await ai_task_optimizer(task_id, db)
    return  optimization


@app.post("/ai/smart_task_creation", tags=["AI"])
async def smart_create_tasks(
    user_id: str = Body(...),
    project_id: str = Body(...),
    description: str = Body(...),
    auto_create: bool = Body(False),
    db: Session = Depends(database.get_db)
):
    """
    Intelligent task creation that:
    - Analyzes project description
    - Suggests optimal task breakdown
    - Sets appropriate priorities and deadlines
    - Considers dependencies
    - Optionally auto-creates tasks
    """    
    print("hello")
    result = await ai_smart_task_creation(user_id, project_id, description, db, auto_create)
    return result


@app.post("/ai/workflow_automation", tags=["AI"])
async def ai_workflow_automation(
    user_id: str = Body(...),
    project_id: str = Body(...),
    automation_type: str = Body(...),  # "daily_standup", "weekly_review", "deadline_alert"
    db: Session = Depends(database.get_db)
):
    """
    Automated workflow insights:
    - Daily standup summaries
    - Weekly progress reports
    - Deadline and risk alerts
    - Team productivity insights
    """
    automation_query = {
        "daily_standup": "Provide a daily standup summary: what was completed yesterday, what's planned for today, and any blockers",
        "weekly_review": "Generate a weekly project review with accomplishments, challenges, and next week's priorities",
        "deadline_alert": "Analyze upcoming deadlines and identify any risks or items that need attention"
    }
    
    query = automation_query.get(automation_type, "Provide general project automation insights")
    result = await ai_smart_assistant(user_id, query, project_id, None, db)
    
    return {"automation": result, "type": automation_type}


@app.post("/ai/team_insights", tags=["AI"])
async def ai_team_insights(
    user_id: str = Body(...),
    project_id: str = Body(None),
    db: Session = Depends(database.get_db)
):
    """
    Team performance and workload insights:
    - Individual workload analysis
    - Team collaboration patterns
    - Skill gap identification
    - Workload balancing suggestions
    """
    query = "Analyze team performance, workload distribution, and provide recommendations for better collaboration and task assignment"
    result = await ai_smart_assistant(user_id, query, project_id, None, db)
    
    return  result



# --- ROOT ENDPOINT ---
@app.get("/", tags=["Root"])
def root():
    return {"message": "AI Project Management Backend with RDS running!"}

# To run this application (assuming you save it as main.py in an 'app' directory,
# with database.py, models.py, schemas.py alongside):
# 1. Create a virtual environment: python -m venv venv
# 2. Activate it: source venv/bin/activate (Linux/macOS) or venv\Scripts\activate (Windows)
# 3. Install dependencies: pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv google-generativeai
# 4. Set up your .env file with DATABASE_URL and GOOGLE_API_KEY
# 5. Run Uvicorn: uvicorn app.main:app --reload (if main.py is in 'app' directory)
#    or uvicorn main:app --reload (if main.py is in the root)

