import os
import json
import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# LangChain imports
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict


class AgentState(MessagesState):
    """Custom state that extends MessagesState with additional fields"""
    user_id: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    context: Dict = {}
    action_taken: bool = False
    result: Dict = {}

# Import models
import models


class DatabaseTools:
    """Database interaction tools for the AI agent"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_projects_func(self, user_id: str) -> List[Dict]:
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
                "status": project.status,
                "created_at": project.created_at.isoformat(),
                "task_count": len(project.tasks),
                "completed_tasks": len([t for t in project.tasks if t.status == "done"])
            })
        
        return projects
    
    def get_project_tasks_func(self, project_id: str, status: Optional[str] = None) -> List[Dict]:
        """Get tasks for a project, optionally filtered by status"""
        project = self.db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            return []
        
        tasks = []
        for task in project.tasks:
            if status and task.status != status:
                continue
            
            tasks.append({
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "deadline": task.deadline.isoformat() if task.deadline else None,
                "created_at": task.created_at.isoformat(),
                "assigned_to": task.assignee.username if task.assignee else None
            })
        
        return tasks
    
    def create_task_func(self, project_id: str, title: str, description: str = "", 
                        priority: str = "medium", assigned_to_id: Optional[str] = None,
                        deadline_days: int = 7) -> Dict:
        """Create a new task"""
        project = self.db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}
        
        # Calculate deadline
        deadline = datetime.now() + timedelta(days=deadline_days)
        
        # Create task
        task = models.Task(
            id=str(uuid.uuid4()),
            title=title,
            description=description,
            priority=priority,
            deadline=deadline,
            created_at=datetime.now(),
            project_id=project_id,
            assigned_to_id=assigned_to_id,
            status="todo"
        )
        
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        
        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "deadline": task.deadline.isoformat(),
            "project_id": task.project_id
        }
    
    def update_task_status_func(self, task_id: str, status: str) -> Dict:
        """Update task status"""
        task = self.db.query(models.Task).filter(models.Task.id == task_id).first()
        if not task:
            return {"error": "Task not found"}
        
        task.status = status
        self.db.commit()
        
        return {
            "id": task.id,
            "title": task.title,
            "status": task.status,
            "project_id": task.project_id
        }
    
    def get_overdue_tasks_func(self, user_id: str) -> List[Dict]:
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

    # Create tool wrappers
    @property
    def get_user_projects(self):
        @tool
        def get_user_projects(user_id: str) -> List[Dict]:
            """Get all projects for a user"""
            return self.get_user_projects_func(user_id)
        return get_user_projects
    
    @property
    def get_project_tasks(self):
        @tool
        def get_project_tasks(project_id: str, status: Optional[str] = None) -> List[Dict]:
            """Get tasks for a project, optionally filtered by status"""
            return self.get_project_tasks_func(project_id, status)
        return get_project_tasks
    
    @property
    def create_task(self):
        @tool
        def create_task(project_id: str, title: str, description: str = "", 
                       priority: str = "medium", assigned_to_id: Optional[str] = None,
                       deadline_days: int = 7) -> Dict:
            """Create a new task"""
            return self.create_task_func(project_id, title, description, priority, assigned_to_id, deadline_days)
        return create_task
    
    @property
    def update_task_status(self):
        @tool
        def update_task_status(task_id: str, status: str) -> Dict:
            """Update task status"""
            return self.update_task_status_func(task_id, status)
        return update_task_status
    
    @property
    def get_overdue_tasks(self):
        @tool
        def get_overdue_tasks(user_id: str) -> List[Dict]:
            """Get all overdue tasks for a user's projects"""
            return self.get_overdue_tasks_func(user_id)
        return get_overdue_tasks


class TaskAnalysisAgent:
    """Specialized agent for deep task analysis and optimization"""
    
    def __init__(self, db: Session):
        self.db = db
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            print("ERROR: GOOGLE_API_KEY not found. TaskAnalysisAgent will not work.")
            self.llm = None
        else:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    google_api_key=google_api_key,
                    temperature=0.2
                )
            except Exception as e:
                print(f"ERROR: Failed to initialize TaskAnalysisAgent LLM: {e}")
                self.llm = None
    
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
        
        try:
            response = self.llm.invoke([HumanMessage(content=prompt)])
            analysis = json.loads(response.content)
            return analysis
        except json.JSONDecodeError:
            return {"analysis": response.content}
        except Exception as e:
            return {"error": f"Analysis failed: {str(e)}"}
    
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
            
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = re.sub(r'^```[^\n]*\n', '', response_text)
                response_text = re.sub(r'\n```$', '', response_text)
            
            # Try to extract JSON from the response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_text = json_match.group(0)
                tasks = json.loads(json_text)
                
                # Validate and clean tasks
                validated_tasks = []
                for task in tasks:
                    if isinstance(task, dict) and "title" in task:
                        # Ensure priority is valid
                        priority = task.get("priority", "medium").lower()
                        if priority not in ["high", "medium", "low"]:
                            priority = "medium"
                        
                        # Ensure estimated_days is within valid range
                        estimated_days = task.get("estimated_days", 7)
                        try:
                            estimated_days = int(estimated_days)
                            estimated_days = min(max(estimated_days, 1), 14)
                        except (ValueError, TypeError):
                            estimated_days = 7
                        
                        validated_task = {
                            "title": task.get("title", "Untitled Task"),
                            "description": task.get("description", ""),
                            "priority": priority,
                            "estimated_days": estimated_days,
                            "dependencies": task.get("dependencies", []) if isinstance(task.get("dependencies", []), list) else [],
                            "skills_required": task.get("skills_required", []) if isinstance(task.get("skills_required", []), list) else []
                        }
                        validated_tasks.append(validated_task)
                
                return validated_tasks if validated_tasks else self._create_fallback_task(project_description)
            else:
                return self._create_fallback_task(project_description)
                
        except Exception as e:
            print(f"Error in suggest_task_breakdown: {str(e)}")
            return self._create_fallback_task(project_description)
    
    def _create_fallback_task(self, description: str) -> List[Dict]:
        """Create a fallback task when AI generation fails"""
        return [{
            "title": f"Task: {description[:50]}..." if len(description) > 50 else description,
            "description": f"Auto-generated from: {description}",
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
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            print("ERROR: GOOGLE_API_KEY not found. ProjectManagerAgent will not work.")
            self.llm = None
            self.llm_with_tools = None
        else:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash",
                    google_api_key=google_api_key,
                    temperature=0.1
                )
                
                # Get tools as properties
                self.tools = [
                    self.db_tools.get_user_projects,
                    self.db_tools.get_project_tasks,
                    self.db_tools.create_task,
                    self.db_tools.update_task_status,
                    self.db_tools.get_overdue_tasks
                ]
                self.llm_with_tools = self.llm.bind_tools(self.tools)
            except Exception as e:
                print(f"ERROR: Failed to initialize ProjectManagerAgent LLM: {e}")
                self.llm = None
                self.llm_with_tools = None
        
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
            try:
                response = self.llm_with_tools.invoke(full_messages)
                state["messages"].append(response)
                state["action_taken"] = bool(hasattr(response, 'tool_calls') and response.tool_calls)
            except Exception as e:
                # Fallback response if tool binding fails
                error_response = AIMessage(content=f"I encountered an error: {str(e)}. Let me help you with basic information instead.")
                state["messages"].append(error_response)
                state["action_taken"] = False
            
            return state
        
        def process_tools(state: AgentState) -> AgentState:
            """Process any tool calls"""
            last_message = state["messages"][-1]
            
            if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                try:
                    tool_node = ToolNode(self.tools)
                    tool_results = tool_node.invoke({"messages": [last_message]})
                    state["messages"].extend(tool_results["messages"])
                except Exception as e:
                    error_message = AIMessage(content=f"Tool execution failed: {str(e)}")
                    state["messages"].append(error_message)
            
            return state
        
        def generate_final_response(state: AgentState) -> AgentState:
            """Generate final response with insights and recommendations"""
            if state["action_taken"]:
                # Generate follow-up response considering tool results
                try:
                    response = self.llm.invoke(state["messages"] + [
                        SystemMessage(content="Provide a clear summary of what was accomplished and any recommendations.")
                    ])
                    state["messages"].append(response)
                except Exception as e:
                    fallback_response = AIMessage(content="I've completed the requested actions. Please let me know if you need any clarification.")
                    state["messages"].append(fallback_response)
            
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
        try:
            memory = MemorySaver()
            return workflow.compile(checkpointer=memory)
        except Exception as e:
            print(f"Warning: Could not compile workflow with memory: {e}")
            return workflow.compile()
    
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
        # Create new agent for each request to avoid database session issues
        if agent_type == "project_manager":
            return ProjectManagerAgent(db)
        elif agent_type == "task_analyzer":
            return TaskAnalysisAgent(db)
        else:
            raise ValueError(f"Unknown agent type: {agent_type}")
    
    async def process_request(self, 
                            user_id: str,
                            query: str,
                            project_id: Optional[str] = None,
                            task_id: Optional[str] = None,
                            db: Session = None) -> Dict:
        """Process any AI request intelligently"""
        
        try:
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
            
        except Exception as e:
            print(f"Error in process_request: {str(e)}")
            return {
                "error": "Failed to process request",
                "details": str(e),
                "response": "I encountered an error while processing your request. Please try again or rephrase your question."
            }


# Global instance
smart_pm = SmartProjectManager()


# FastAPI endpoint functions (to replace your existing ones)
async def ai_smart_assistant(user_id: str, query: str, project_id: str = None, 
                           task_id: str = None, db: Session = None):
    """AI smart assistant endpoint"""
    return await smart_pm.process_request(user_id, query, project_id, task_id, db)


async def ai_project_insights(project_id: str, db: Session = None):
    """Get AI-powered project insights"""
    try:
        agent = smart_pm.get_agent("project_manager", db)
        
        # Get project context
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}
        
        # Generate insights
        query = f"Provide comprehensive insights for project '{project.name}' including status, risks, and recommendations"
        result = await smart_pm.process_request(
            user_id=project.owner_id,
            query=query,
            project_id=project_id,
            db=db
        )
        
        return result
    except Exception as e:
        return {"error": f"Failed to generate insights: {str(e)}"}


async def ai_optimize_task(task_id: str, db: Session = None):
    """Optimize a specific task using AI"""
    try:
        agent = smart_pm.get_agent("task_analyzer", db)
        return agent.analyze_task_complexity(task_id)
    except Exception as e:
        return {"error": f"Failed to optimize task: {str(e)}"}


async def ai_smart_task_creation(project_id: str, description: str, db: Session = None, auto_create: bool = False):
    """Create tasks intelligently based on description"""
    try:
        agent = smart_pm.get_agent("task_analyzer", db)
        
        # Get project context
        project = db.query(models.Project).filter(models.Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}
        
        # Generate task suggestions
        suggested_tasks = agent.suggest_task_breakdown(
            description, 
            {"user_id": project.owner_id, "project_id": project_id}
        )
        
        # Create the tasks only if auto_create is True
        created_tasks = []
        if auto_create:
            tools = DatabaseTools(db)
            
            for task_data in suggested_tasks:
                try:
                    created_task = tools.create_task_func(
                        project_id=project_id,
                        title=task_data["title"],
                        description=task_data["description"],
                        priority=task_data["priority"],
                        deadline_days=task_data.get("estimated_days", 7)
                    )
                    created_tasks.append(created_task)
                except Exception as e:
                    print(f"Failed to create task '{task_data['title']}': {e}")
        
        return {
            "suggested_tasks": suggested_tasks,
            "created_tasks": created_tasks,
            "success": len(created_tasks) > 0 if auto_create else False,
            "auto_created": auto_create
        }
    except Exception as e:
        return {"error": f"Failed to create smart tasks: {str(e)}"}
