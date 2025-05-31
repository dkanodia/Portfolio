console.log('IT’S ALIVE!');

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

// var navLinks = $$("nav a");

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );
// if (currentLink) {
//   currentLink.classList.add('current');
// }

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/" 
  : "/Portfolio/";   // your GitHub repo name

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume.html', title: 'Resume' },
  { url: 'meta/', title: 'Meta' },
  { url: 'https://github.com/dkanodia', title: 'Github' }
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  
  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  // Highlight the current page
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname,
  );

  a.toggleAttribute(
    'target',
    a.host !== location.host
  );

  nav.append(a);
}

// Insert Dark Mode Switcher
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

// Function to set color scheme
function setColorScheme(scheme) {
  document.documentElement.style.setProperty('color-scheme', scheme);
}

// Get <select> element
const select = document.querySelector('.color-scheme select');

// Listen for changes
select.addEventListener('input', function (event) {
  const scheme = event.target.value;
  setColorScheme(scheme);
  localStorage.colorScheme = scheme;
});

// On page load, check localStorage
if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  // Validate containerElement
  if (!(containerElement instanceof HTMLElement)) {
    console.error('Invalid containerElement passed to renderProjects.');
    return;
  }

  // Validate heading level (allow only h1–h6)
  const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (!validHeadings.includes(headingLevel)) {
    console.warn(`Invalid headingLevel "${headingLevel}". Defaulting to "h2".`);
    headingLevel = 'h2';
  }

  // Select the element to display the project count and update it
  const projectsTitle = document.querySelector('.projects-title');
  if (projectsTitle) {
    // Update the title to show the number of projects
    projectsTitle.textContent = `${projects.length} Projects`;
  }

  // Clear existing content in the projects container
  containerElement.innerHTML = '';

  // Check for empty or missing project data
  if (!Array.isArray(projects) || projects.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'No projects available to display.';
    containerElement.appendChild(message);
    return;
  }

  // Render each project
  projects.forEach(project => {
    const article = document.createElement('article');

    // Fallbacks for missing fields
    const title = project.title || 'Untitled Project';
    const image = project.image || 'default.png'; // replace with actual fallback image if needed
    const description = project.description || 'No description provided.';
    const year = project.year || "Unknown";
    const url = project.url || "Unknown";

    article.innerHTML = `
      <${headingLevel}>${title}</${headingLevel}>
      <img src="${image}" alt="${title}" width=200px;>
      <div style="font-variant-numeric: oldstyle-nums; font-family:Baskerville">
      <p>${description}</p>
      <a href=${url}>Link to Project</a>
      <p>c. ${year}</p>
      </div>
    `;

    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}