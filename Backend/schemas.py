# schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
import os
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    clerkId: str = Field(..., min_length=3, max_length=50)
    

class UserCreate(UserBase):
    pass




# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    owner_id: str # Required for creating a project
    collaborators: List[str]

class Project(ProjectBase): # Response model
    id: str
    owner_id: str
    collaborators: Optional[List[str]] = None
    # To include the full owner object in responses, you could add:
    # owner: User

    class Config:
        from_attributes = True

class User(UserBase): # Response model
    id: str
    projects: List[Project] = []

    class Config:
        from_attributes = True # For Pydantic V2, replaces orm_mode = True


# --- Task Schemas ---
class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: str = Field("todo", pattern="^(todo|in_progress|done)$")
    priority: Optional[str] = None

class TaskCreate(TaskBase):
    project_id: str
    assigned_to: Optional[str] = None # This will be the user_id
    created_at: Optional[datetime] = None  # Use datetime type
    deadline: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None # Use Optional[str] for nullable FK
    status: Optional[str] = None
    priority: Optional[str] = None
    created_at: Optional[datetime] = None

class Task(TaskBase): # Response model
    id: str
    project_id: str
    assigned_to: Optional[str] = None # Corresponds to assigned_to_id in the DB model via @property
    created_at: datetime
    priority: Optional[str] = None
    deadline: Optional[datetime] = None  # Changed this line
    # To include assignee or project objects, you could add:
    # assignee: Optional[User] = None
    # project: Project

    class Config:
        from_attributes = True


# --- Comment Schemas ---
class CommentBase(BaseModel):
    content: str = Field(..., min_length=1)

class CommentCreate(CommentBase):
    task_id: str
    user_id: str

class Comment(CommentBase): # Response model
    id: str
    task_id: str
    user_id: str
    # To include user or task objects:
    # user: User
    # task: Task

    class Config:
        from_attributes = True

# AI Endpoints Schemas (if needed, though AI functions often use simple types directly)
# For example, if you had complex AI request/response objects

# New schema for adding collaborators
class ProjectAddCollaborators(BaseModel):
    project_id: str
    collaborator_ids: List[str]

# New schema for just a list of collaborator IDs
class CollaboratorIds(BaseModel):
    collaborator_ids: List[str]
