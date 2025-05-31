# Fixed agents.py - Key sections that need to be updated

import os
import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, TypedDict, Annotated
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
import json
import uuid
from database import get_db
import models
import schemas


class AgentState(TypedDict):
    """State shared across all agents"""
    messages: Annotated[List, "Messages in the conversation"]
    user_id: str
    project_id: Optional[str]
    task_id: Optional[str]
    context: Dict
    action_taken: bool
    result: Dict


class DatabaseTools:
    """Tools for database operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    @tool
    def get_user_projects(self, user_id: str) -> List[Dict]:
        """Get all projects for a user"""
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return []
        
        projects = []
        for project in user.projects:
            projects.append({
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "task_count": len(project.tasks),
                "completed_tasks": len([t for t in project.tasks if t.status == "done"])
            })
        return projects
    
    @tool
    def get_project_tasks(self, project_id: str, status: Optional[str] = None) -> List[Dict]:
        """Get tasks for a project, optionally filtered by status"""
        project = self.db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            return []
        
        tasks = project.tasks
        if status:
            tasks = [t for t in tasks if t.status == status]
        
        task_list = []
        for task in tasks:
            assignee_name = task.assignee.username if task.assignee else "Unassigned"
            task_list.append({
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "assigned_to": assignee_name,
                "deadline": task.deadline.isoformat() if task.deadline else None,
                "overdue": task.deadline < datetime.now() if task.deadline else False
            })
        return task_list
    
    @tool
    def create_task(self, project_id: str, title: str, description: str = "", 
                   priority: str = "medium", assigned_to_id: Optional[str] = None,
                   deadline_days: int = 7) -> Dict:
        """Create a new task"""
        print("inside create task")
        try:
            task_id = str(uuid.uuid4())
            deadline = datetime.now() + timedelta(days=deadline_days)
            
            new_task = models.Task(
                id=task_id,
                project_id=project_id,
                title=title,
                description=description,
                priority=priority,
                assigned_to_id=assigned_to_id,
                created_at=datetime.now(),
                deadline=deadline,
                status="todo"
            )
            
            self.db.add(new_task)
            self.db.commit()
            self.db.refresh(new_task)
            print(f"Created task: {new_task.id} in project {project_id}")
            return {
                "id": new_task.id,
                "title": new_task.title,
                "description": new_task.description,
                "priority": new_task.priority,
                "status": "created_successfully",
                "deadline": deadline.isoformat()
            }
        except Exception as e:
            self.db.rollback()
            return {
                "error": f"Failed to create task: {str(e)}",
                "status": "failed"
            }
    
    @tool
    def update_task_status(self, task_id: str, status: str) -> Dict:
        """Update task status"""
        task = self.db.query(models.Task).filter(models.Task.id == task_id).first()
        if not task:
            return {"error": "Task not found"}
        
        task.status = status
        self.db.commit()
        
        return {
            "task_id": task_id,
            "title": task.title,
            "new_status": status,
            "updated": True
        }
    
    @tool
    def get_overdue_tasks(self, user_id: str) -> List[Dict]:
        """Get all overdue tasks for a user's projects"""
        user = self.db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return []
        
        overdue_tasks = []
        for project in user.projects:
            for task in project.tasks:
                if task.deadline and task.deadline < datetime.now() and task.status != "done":
                    overdue_tasks.append({
                        "id": task.id,
                        "title": task.title,
                        "project": project.name,
                        "deadline": task.deadline.isoformat(),
                        "days_overdue": (datetime.now() - task.deadline).days,
                        "assigned_to": task.assignee.username if task.assignee else "Unassigned"
                    })
        
        return sorted(overdue_tasks, key=lambda x: x["days_overdue"], reverse=True)


class TaskAnalysisAgent:
    """Specialized agent for deep task analysis and optimization"""
    
    def __init__(self, db: Session):
        self.db = db
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-preview-05-20",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.2
        )
    
    def analyze_task_complexity(self, task_id: str) -> Dict:
        """Analyze task complexity and suggest breakdown"""
        task = self.db.query(models.Task).filter(models.Task.id == task_id).first()
        if not task:
            return {"error": "Task not found"}
        
        prompt = f"""
        Analyze this task for complexity and provide actionable insights:
        
        Title: {task.title}
        Description: {task.description or 'No description'}
        Priority: {task.priority}
        Status: {task.status}
        Deadline: {task.deadline}
        
        Provide:
        1. Complexity assessment (1-10)
        2. Suggested subtasks if complex (>6)
        3. Time estimation
        4. Risk factors
        5. Dependencies to consider
        6. Optimization suggestions
        
        Format as JSON.
        """
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        try:
            analysis = json.loads(response.content)
            return analysis
        except:
            return {"analysis": response.content}
    
    def suggest_task_breakdown(self, project_description: str, context: Dict) -> List[Dict]:
        """Intelligently suggest task breakdown for a project"""
        prompt = f"""
        Based on this project description, create a comprehensive task breakdown.
        
        Project Description: {project_description}
        Context: {json.dumps(context, indent=2)}
        
        IMPORTANT: Return ONLY a valid JSON array of tasks. No additional text or formatting.
        
        Create 3-6 specific, actionable tasks that:
        1. Follow logical dependencies
        2. Have realistic time estimates
        3. Include appropriate priorities
        4. Consider team size and skills
        5. Include testing/review phases
        
        For each task, provide exactly these fields:
        {{
            "title": "Clear and specific title",
            "description": "Detailed but concise description",
            "priority": "high" | "medium" | "low",
            "estimated_days": 1-14 (integer),
            "dependencies": ["task titles this depends on"],
            "skills_required": ["required skills"]
        }}
        
        Return as JSON array only:
        """
        
        try:
            response = self.llm.invoke([HumanMessage(content=prompt)])
            response_text = response.content.strip()
            
            # Try to extract JSON from the response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group(0)
                tasks = json.loads(json_text)
                
                # Validate and clean tasks
                validated_tasks = []
                for task in tasks:
                    if isinstance(task, dict) and "title" in task:
                        validated_task = {
                            "title": task.get("title", "Untitled Task"),
                            "description": task.get("description", ""),
                            "priority": task.get("priority", "medium").lower(),
                            "estimated_days": min(max(int(task.get("estimated_days", 7)), 1), 14),
                            "dependencies": task.get("dependencies", []),
                            "skills_required": task.get("skills_required", [])
                        }
                        validated_tasks.append(validated_task)
                
                return validated_tasks if validated_tasks else []
            else:
                # Fallback: create a simple task from the description
                return [{
                    "title": f"Task: {project_description[:50]}...",
                    "description": project_description,
                    "priority": "medium",
                    "estimated_days": 7,
                    "dependencies": [],
                    "skills_required": []
                }]
                
        except Exception as e:
            print(f"Error in suggest_task_breakdown: {str(e)}")
            return [{
                "title": f"Task: {project_description[:50]}...",
                "description": f"Auto-generated from: {project_description}",
                "priority": "medium",
                "estimated_days": 7,
                "dependencies": [],
                "skills_required": []
            }]


class ProjectManagerAgent:
    """Intelligent project management agent"""
    
    def __init__(self, db: Session):
        self.db = db
        self.db_tools = DatabaseTools(db)
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-preview-05-20",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.1
        )
        
        # Bind tools to LLM
        self.tools = [
            self.db_tools.get_user_projects,
            self.db_tools.get_project_tasks,
            self.db_tools.create_task,
            self.db_tools.update_task_status,
            self.db_tools.get_overdue_tasks
        ]
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        
        # Create the graph
        self.graph = self._create_graph()
    
    def _create_graph(self):
        """Create the LangGraph workflow"""
        
        def analyze_request(state: AgentState) -> AgentState:
            """Analyze the user request and determine context"""
            messages = state["messages"]
            last_message = messages[-1].content if messages else ""
            
            # Get user and project context
            user = self.db.query(models.User).filter(models.User.id == state["user_id"]).first()
            project = None
            if state.get("project_id"):
                project = self.db.query(models.Project).filter(models.Project.id == state["project_id"]).first()
            
            context = {
                "user_name": user.username if user else "Unknown",
                "project_name": project.name if project else "No specific project",
                "request_type": self._classify_request(last_message),
                "timestamp": datetime.now().isoformat()
            }
            
            state["context"] = context
            return state
        
        def execute_action(state: AgentState) -> AgentState:
            """Execute the appropriate action based on request analysis"""
            context = state["context"]
            messages = state["messages"]
            
            system_prompt = f"""
            You are an expert project management assistant for {context['user_name']}.
            Current project: {context['project_name']}
            Request type: {context['request_type']}
            
            You have access to tools to:
            - View and analyze projects and tasks
            - Create new tasks with intelligent defaults
            - Update task statuses
            - Identify overdue items and bottlenecks
            - Provide strategic project insights
            
            Always be proactive and actionable. If you see issues, suggest concrete solutions.
            If creating tasks, set realistic deadlines and appropriate priorities.
            """
            
            # Add system message
            full_messages = [SystemMessage(content=system_prompt)] + messages
            
            # Get AI response with tool calls
            response = self.llm_with_tools.invoke(full_messages)
            
            state["messages"].append(response)
            state["action_taken"] = bool(response.tool_calls)
            
            return state
        
        def process_tools(state: AgentState) -> AgentState:
            """Process any tool calls"""
            last_message = state["messages"][-1]
            
            if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                tool_node = ToolNode(self.tools)
                tool_results = tool_node.invoke({"messages": [last_message]})
                state["messages"].extend(tool_results["messages"])
            
            return state
        
        def generate_final_response(state: AgentState) -> AgentState:
            """Generate final response with insights and recommendations"""
            if state["action_taken"]:
                # Generate follow-up response considering tool results
                response = self.llm.invoke(state["messages"] + [
                    SystemMessage(content="Provide a clear summary of what was accomplished and any recommendations.")
                ])
                state["messages"].append(response)
            
            # Extract final result
            final_response = state["messages"][-1].content
            state["result"] = {
                "response": final_response,
                "action_taken": state["action_taken"],
                "context": state["context"]
            }
            
            return state
        
        # Build the graph
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("analyze", analyze_request)
        workflow.add_node("execute", execute_action)
        workflow.add_node("tools", process_tools)
        workflow.add_node("finalize", generate_final_response)
        
        # Add edges
        workflow.add_edge(START, "analyze")
        workflow.add_edge("analyze", "execute")
        workflow.add_edge("execute", "tools")
        workflow.add_edge("tools", "finalize")
        workflow.add_edge("finalize", END)
        
        # Compile with memory
        memory = MemorySaver()
        return workflow.compile(checkpointer=memory)
    
    def _classify_request(self, message: str) -> str:
        """Classify the type of request"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["create", "add", "new task", "make"]):
            return "task_creation"
        elif any(word in message_lower for word in ["status", "update", "complete", "done", "progress"]):
            return "status_update"
        elif any(word in message_lower for word in ["overdue", "deadline", "late", "behind"]):
            return "deadline_management"
        elif any(word in message_lower for word in ["overview", "summary", "status", "report"]):
            return "project_overview"
        else:
            return "general_assistance"


class SmartProjectManager:
    """Main orchestrator for all AI agents"""
    
    def __init__(self):
        self.agents = {}
    
    def get_agent(self, agent_type: str, db: Session):
        """Get or create agent instance"""
        if agent_type not in self.agents:
            if agent_type == "project_manager":
                self.agents[agent_type] = ProjectManagerAgent(db)
            elif agent_type == "task_analyzer":
                self.agents[agent_type] = TaskAnalysisAgent(db)
        
        return self.agents[agent_type]
    
    async def process_request(self, 
                            user_id: str,
                            query: str,
                            project_id: Optional[str] = None,
                            task_id: Optional[str] = None,
                            db: Session = None) -> Dict:
        """Process any AI request intelligently"""
        
        # Determine which agent to use
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["analyze", "complexity", "breakdown", "estimate"]):
            if task_id:
                agent = self.get_agent("task_analyzer", db)
                return agent.analyze_task_complexity(task_id)
            else:
                agent = self.get_agent("task_analyzer", db)
                return {"suggested_tasks": agent.suggest_task_breakdown(query, {"user_id": user_id})}
        
        # Use project manager agent for most requests
        agent = self.get_agent("project_manager", db)
        
        initial_state = AgentState(
            messages=[HumanMessage(content=query)],
            user_id=user_id,
            project_id=project_id,
            task_id=task_id,
            context={},
            action_taken=False,
            result={}
        )
        
        # Run the agent workflow
        config = {"configurable": {"thread_id": f"{user_id}_{project_id or 'general'}"}}
        final_state = agent.graph.invoke(initial_state, config)
        
        return final_state["result"]


# Global instance
smart_pm = SmartProjectManager()


# FastAPI endpoint functions (to replace your existing ones)
async def ai_smart_assistant(user_id: str, query: str, project_id: str = None, 
                           task_id: str = None, db: Session = None):
    """Main AI assistant endpoint"""
    return await smart_pm.process_request(user_id, query, project_id, task_id, db)


async def ai_project_insights(user_id: str, project_id: str, db: Session):
    """Get comprehensive project insights"""
    query = f"Provide a comprehensive analysis of project status, identify bottlenecks, overdue tasks, and strategic recommendations for project {project_id}"
    return await smart_pm.process_request(user_id, query, project_id, None, db)


async def ai_task_optimizer(task_id: str, db: Session):
    """Optimize and analyze specific task"""
    agent = smart_pm.get_agent("task_analyzer", db)
    return agent.analyze_task_complexity(task_id)


async def ai_smart_task_creation(user_id: str, project_id: str, description: str, 
                               db: Session, auto_create: bool = False):
    """Intelligently create tasks with AI suggestions"""
    try:
        # Get task suggestions from AI
        agent = smart_pm.get_agent("task_analyzer", db)
        suggested_tasks = agent.suggest_task_breakdown(description, {
            "user_id": user_id,
            "project_id": project_id
        })
        
        if not suggested_tasks:
            return {
                "error": "Could not generate task suggestions",
                "message": "Please try with a more detailed description"
            }
        
        created_tasks = []
        creation_errors = []
        
        # Auto-create tasks if requested
        if True:
            db_tools = DatabaseTools(db)
            
            for task_data in suggested_tasks:
                print(task_data)  # Debugging output
                try:
                    # Ensure we have required fields
                    title = task_data.get("title", "Untitled Task")
                    description_text = task_data.get("description", "")
                    priority = task_data.get("priority", "medium")
                    deadline_days = task_data.get("estimated_days", 7)
                    
                    print("before")  # Debugging output

                   # Create task directly using database operations (not using @tool decorator)
                    task_id = str(uuid.uuid4())
                    deadline = datetime.now() + timedelta(days=deadline_days)
                    
                    new_task = models.Task(
                        id=task_id,
                        project_id=project_id,
                        title=title,
                        description=description_text,
                        priority=priority,
                        assigned_to_id=None,
                        created_at=datetime.now(),
                        deadline=deadline,
                        status="todo"
                    )
                    
                    db.add(new_task)
                    db.commit()
                    db.refresh(new_task)
                    
                    created_task = {
                        "id": new_task.id,
                        "title": new_task.title,
                        "description": new_task.description,
                        "priority": new_task.priority,
                        "status": "created_successfully",
                        "deadline": deadline.isoformat()
                    }
                    
                    created_tasks.append(created_task)
                        
                except Exception as e:
                    creation_errors.append({
                        "task": task_data.get("title", "Unknown"),
                        "error": str(e)
                    })
            
            return {
                "message": f"Successfully created {len(created_tasks)} tasks" + 
                          (f" with {len(creation_errors)} errors" if creation_errors else ""),
                "created_tasks": created_tasks,
                "suggested_tasks": suggested_tasks,
                "errors": creation_errors if creation_errors else None,
                "auto_created": True
            }
        
        else:
            # Just return suggestions without creating
            return {
                "message": "Task suggestions generated successfully",
                "suggested_tasks": suggested_tasks,
                "auto_created": False,
                "instructions": "Set auto_create=True to automatically create these tasks"
            }
            
    except Exception as e:
        print(f"Error in ai_smart_task_creation: {str(e)}")
        return {
            "error": "Failed to process task creation request",
            "details": str(e),
            "fallback_suggestion": {
                "title": f"Task: {description[:50]}...",
                "description": description,
                "priority": "medium",
                "estimated_days": 7
            }
        }