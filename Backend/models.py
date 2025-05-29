# models.py
from sqlalchemy import Column, String, ForeignKey, Text, ARRAY, TIMESTAMP
from sqlalchemy.orm import relationship
from database import Base # Assuming database.py is in the same directory (e.g., app/database.py)
from typing import Optional

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    clerkId = Column(String)

    # Relationships
    projects = relationship("Project", back_populates="owner")
    comments = relationship("Comment", back_populates="user")
    # Tasks assigned to this user
    assigned_tasks = relationship("Task", foreign_keys="Task.assigned_to_id", back_populates="assignee")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    collaborators = Column(ARRAY(String), nullable=True) # Store as comma-separated string of user IDs

    # Relationships
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False)
    priority = Column(Text, nullable=True)
    assigned_to_id = Column(String, ForeignKey("users.id"), nullable=True) # Foreign key to User table
    status = Column(String, default="todo", nullable=False)  # todo, in_progress, done

    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="assigned_tasks", foreign_keys=[assigned_to_id])
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")

    @property
    def assigned_to(self) -> Optional[str]:
        """Provides compatibility with Pydantic schema expecting 'assigned_to' field."""
        return self.assigned_to_id


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)

    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="comments")
