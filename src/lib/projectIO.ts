import { Project } from '../types';

export function exportProjectFile(project: Project) {
  const data = {
    version: 1,
    savedAt: new Date().toISOString(),
    project: { ...project, audioUrl: undefined },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${project.name || 'flowdance'}.flowdance`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importProjectFile(file: File): Promise<Project> {
  const text = await file.text();
  const raw  = JSON.parse(text);
  const project: Project = raw.project ?? raw;

  if (
    !project?.id ||
    !Array.isArray(project?.members) ||
    !Array.isArray(project?.frames)
  ) {
    throw new Error('유효하지 않은 파일 형식입니다');
  }

  return { ...project, audioUrl: undefined };
}
