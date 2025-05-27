from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
import requests
import google.generativeai as genai
import os

# --- CONFIG ---
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"  # Replace with your Gemini API key

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

app = FastAPI(title="AI Project Management Backend")

# --- DATA MODELS ---
class User(BaseModel):
    id: str
    username: str

class Project(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: str

class Task(BaseModel):
    id: str
    project_id: str
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: str = "todo"  # todo, in_progress, done

class Comment(BaseModel):
    id: str
    task_id: str
    user_id: str
    content: str

# --- IN-MEMORY STORAGE ---
users: Dict[str, User] = {}
projects: Dict[str, Project] = {}
tasks: Dict[str, Task] = {}
comments: Dict[str, Comment] = {}

# --- CRUD ENDPOINTS ---
# Users
@app.post("/users", response_model=User)
def create_user(username: str = Body(...)):
    user_id = str(uuid.uuid4())
    user = User(id=user_id, username=username)
    users[user_id] = user
    return user

@app.get("/users", response_model=List[User])
def list_users():
    return list(users.values())

# Projects
@app.post("/projects", response_model=Project)
def create_project(name: str = Body(...), description: Optional[str] = Body(None), owner_id: str = Body(...)):
    if owner_id not in users:
        raise HTTPException(status_code=404, detail="Owner not found")
    project_id = str(uuid.uuid4())
    project = Project(id=project_id, name=name, description=description, owner_id=owner_id)
    projects[project_id] = project
    return project

@app.get("/projects", response_model=List[Project])
def list_projects():
    return list(projects.values())

# Tasks
@app.post("/tasks", response_model=Task)
def create_task(project_id: str = Body(...), title: str = Body(...), description: Optional[str] = Body(None), assigned_to: Optional[str] = Body(None)):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    task_id = str(uuid.uuid4())
    task = Task(id=task_id, project_id=project_id, title=title, description=description, assigned_to=assigned_to)
    tasks[task_id] = task
    return task

@app.get("/tasks", response_model=List[Task])
def list_tasks():
    return list(tasks.values())

# Comments
@app.post("/comments", response_model=Comment)
def create_comment(task_id: str = Body(...), user_id: str = Body(...), content: str = Body(...)):
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    comment_id = str(uuid.uuid4())
    comment = Comment(id=comment_id, task_id=task_id, user_id=user_id, content=content)
    comments[comment_id] = comment
    return comment

@app.get("/comments", response_model=List[Comment])
def list_comments():
    return list(comments.values())

# --- AI ENDPOINTS ---
def call_gemini(prompt: str) -> str:
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Gemini SDK error: {str(e)}"

@app.post("/ai/summarize_task")
def ai_summarize_task(description: str = Body(...)):
    prompt = f"Summarize this task description: {description}"
    summary = call_gemini(prompt)
    return {"summary": summary}

@app.post("/ai/suggest_tasks")
def ai_suggest_tasks(project_description: str = Body(...)):
    prompt = f"Suggest 3 tasks for this project: {project_description}"
    suggestions = call_gemini(prompt)
    return {"suggested_tasks": suggestions}

@app.post("/ai/analyze_comment")
def ai_analyze_comment(comment: str = Body(...)):
    prompt = f"Analyze the sentiment and actionability of this comment: {comment}"
    analysis = call_gemini(prompt)
    return {"analysis": analysis}

@app.post("/ai/complex_task_assistant")
def ai_complex_task_assistant(query: str = Body(...)):
    prompt = (
        "You are an expert project management assistant. "
        "Answer the following user question with actionable, clear advice. "
        "If relevant, include best practices, permissions, time tracking, and automation tips. "
        f"User question: {query}"
    )
    answer = call_gemini(prompt)
    return {"answer": answer}

# --- ROOT ENDPOINT ---
@app.get("/")
def root():
    return {"message": "AI Project Management Backend running!"}
