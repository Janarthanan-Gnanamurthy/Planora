"use client";
import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TaskBoard from "@/components/TaskBoard";

function Dashboard({ Children }) {
  const [projects, setProjects] = useState([
    {
      id: "1",
      name: "Sample Project",
      tasks: [],
      users: [
        { id: "1", name: "John Doe" },
        { id: "2", name: "Jane Smith" },
      ],
    },
  ]);

  const [selectedProject, setSelectedProject] = useState(projects[0]);

  const handleProjectAdd = (name) => {
    const newProject = {
      id: Date.now().toString(),
      name,
      tasks: [],
      users: [],
    };
    setProjects([...projects, newProject]);
  };

  const handleTaskUpdate = (updatedTask) => {
    const updatedProject = {
      ...selectedProject,
      tasks: selectedProject.tasks.some((task) => task.id === updatedTask.id)
        ? selectedProject.tasks.map((task) =>
            task.id === updatedTask.id ? updatedTask : task
          )
        : [...selectedProject.tasks, updatedTask],
    };

    setSelectedProject(updatedProject);
    setProjects(
      projects.map((project) =>
        project.id === selectedProject.id ? updatedProject : project
      )
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        projects={projects}
        onProjectSelect={setSelectedProject}
        onProjectAdd={handleProjectAdd}
      />

      {Children}
      <TaskBoard project={selectedProject} onTaskUpdate={handleTaskUpdate} />
    </div>
  );
}

export default Dashboard;
