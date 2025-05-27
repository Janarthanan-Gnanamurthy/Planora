import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      projects: [],
      selectedProjectId: null,
      
      addProject: (project) => 
        set((state) => ({ 
          projects: [...state.projects, { 
            ...project, 
            collaborators: [{
              id: project.createdBy.id,
              name: project.createdBy.name,
              email: project.createdBy.email
            }] 
          }] 
        })),
      
      updateProject: (updatedProject) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === updatedProject.id ? updatedProject : p
          ),
        })),
      
      deleteProject: (projectId) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          selectedProjectId: state.selectedProjectId === projectId ? null : state.selectedProjectId,
        })),
      
      setSelectedProject: (projectId) =>
        set({ selectedProjectId: projectId }),
      
      getSelectedProject: () => {
        const state = get();
        return state.projects.find((p) => p.id === state.selectedProjectId);
      },
      
      addTask: (projectId, task) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, tasks: [...(p.tasks || []), { ...task, id: Date.now().toString() }] }
              : p
          ),
        })),
      
      updateTask: (projectId, updatedTask) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tasks: p.tasks.map((t) =>
                    t.id === updatedTask.id ? updatedTask : t
                  ),
                }
              : p
          ),
        })),
      
      deleteTask: (projectId, taskId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }
              : p
          ),
        })),

      addCollaborator: (projectId, collaborator) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  collaborators: [...(p.collaborators || []), {
                    id: collaborator.id,
                    name: collaborator.name,
                    email: collaborator.email
                  }],
                }
              : p
          ),
        })),
    }),
    {
      name: 'project-storage',
    }
  )
);

export default useStore; 