import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

const projects = await fetchJSON('lib/projects.json');
console.log(projects);
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');

renderProjects(latestProjects, projectsContainer, 'h2');

const profileStats = document.querySelector('#profile-stats');

async function showGitHubData() {
  try {
    const githubData = await fetchGitHubData('dkanodia');

    if (profileStats) {
      profileStats.innerHTML = `
        <dl style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center;">
          <dt>Public Repos</dt><dd>${githubData.public_repos}</dd>
          <dt>Public Gists</dt><dd>${githubData.public_gists}</dd>
          <dt>Followers</dt><dd>${githubData.followers}</dd>
          <dt>Following</dt><dd>${githubData.following}</dd>
        </dl>
      `;
    }
  } catch (err) {
    console.error('Failed to fetch GitHub data:', err);
    profileStats.textContent = 'Error loading GitHub stats.';
  }
}

showGitHubData();