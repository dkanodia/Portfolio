import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

let arc = arcGenerator({
  startAngle: 0,
  endAngle: 2 * Math.PI,
});

d3.select('svg').append('path').attr('d', arc).attr('fill', 'red');

const projects = await fetchJSON('../lib/projects.json');
let currentProjects = projects; // This will track the filtered projects

let selectedIndex = -1;
let query = '';
let searchInput = document.querySelector('.searchBar');
const projectsContainer = document.querySelector('.projects');
let newSVG = d3.select('svg');
newSVG.selectAll('path').remove();

// Function to render pie chart
function renderPieChart(projectsGiven) {
  // Re-calculate rolled data
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  // Re-calculate data
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  // Re-calculate slice generator and arc data
  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));

  // Clear previous paths and legends
  d3.select('svg').selectAll('*').remove();
  d3.select('.legend').selectAll('*').remove();

  // Create new paths for the pie chart
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  newArcs.forEach((arc, idx) => {
    d3.select('svg')
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(idx))
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;

        d3.select('svg')
          .selectAll('path')
          .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''));

        d3.select('.legend')
          .selectAll('li')
          .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''));

        // Filter projects based on selection
        if (selectedIndex === -1) {
          renderProjects(currentProjects, projectsContainer, 'h2');
        } else {
          const selectedYear = newData[selectedIndex].label;
          const filtered = currentProjects.filter(p => p.year === selectedYear);
          renderProjects(filtered, projectsContainer, 'h2');
        }
      });
  });

  // Create new legend
  let legend = d3.select('.legend');
  newData.forEach((d, idx) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

// Dynamic search event listener
searchInput.addEventListener('input', (event) => {
  // Update query value
  query = event.target.value;

  // Filter projects
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  // Update current filtered list
  currentProjects = filteredProjects;

  // Reset selection if a search occurs
  selectedIndex = -1;

  // Render filtered projects and pie chart
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects); // Update pie chart with filtered data
});

// Initial render
renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);
 