import { describe, expect, it } from 'vite-plus/test';
import projects from '../data/projects.json';
import skills from '../data/skills.json';

interface ProjectData {
  id: string;
  title: string;
}

interface SkillItem {
  name: string;
  project?: string;
}

interface SkillGroup {
  group: string;
  items: SkillItem[];
}

const projectList = projects as ProjectData[];
const skillGroups = skills as SkillGroup[];

describe('skills.json 的项目引用', () => {
  it('每个技能指向的项目 id 都存在于 projects.json', () => {
    const ids = new Set(projectList.map((project) => project.id));
    const refs = skillGroups.flatMap((group) =>
      group.items.flatMap((item) => (item.project ? [item.project] : []))
    );

    expect(refs.length).toBeGreaterThan(0);
    expect(refs.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('项目 id 唯一且是稳定的 slug，不拿显示标题当键', () => {
    expect(new Set(projectList.map((project) => project.id)).size).toBe(projectList.length);
    for (const project of projectList) {
      expect(project.id).toMatch(/^[a-z0-9][a-z0-9._-]*$/);
      expect(project.title.length).toBeGreaterThan(0);
    }
  });
});
