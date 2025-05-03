import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let colors = d3.scaleOrdinal(d3.schemeTableau10);

let selectedIndex = -1;
const svg = d3.select('svg');
const legend = d3.select('.legend');
const searchInput = document.querySelector('.searchBar');
const projectsContainer = document.querySelector('.projects');
const projects = await fetchJSON('../lib/projects.json');

function setQuery(query) {
  query = query.toLowerCase();
  return projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query);
  });
}

function renderPieChart(projectsGiven) {
  // Clear old chart and legend
  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  // Roll up project counts by year
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );
  let data = rolledData.map(([year, count]) => ({ value: count, label: year }));

  // Generate pie slices
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));

  // Render pie wedges
  arcs.forEach((arc, idx) => {
    svg.append('path')
      .attr('d', arc)
      .attr('fill', colors(idx))
      .attr('data-index', idx)
      .on('click', function () {
        selectedIndex = selectedIndex === idx ? -1 : idx;

        svg.selectAll('path')
          .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''));

        legend.selectAll('li')
          .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''));

        if (selectedIndex === -1) {
          renderProjects(projectsGiven, projectsContainer, 'h2');
        } else {
          const selectedYear = data[selectedIndex].label;
          const filtered = projectsGiven.filter(p => p.year === selectedYear);
          renderProjects(filtered, projectsContainer, 'h2');
        }
      });
  });

  // Render legend
  data.forEach((d, idx) => {
    legend.append('li')
      .attr('class', 'legend-item')
      .attr('style', `--color:${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;

        svg.selectAll('path')
          .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''));

        legend.selectAll('li')
          .attr('class', (_, i) => (i === selectedIndex ? 'selected' : ''));

        if (selectedIndex === -1) {
          renderProjects(projectsGiven, projectsContainer, 'h2');
        } else {
          const selectedYear = data[selectedIndex].label;
          const filtered = projectsGiven.filter(p => p.year === selectedYear);
          renderProjects(filtered, projectsContainer, 'h2');
        }
      });
  });
}

// Search filtering
searchInput.addEventListener('input', (event) => {
  let filteredProjects = setQuery(event.target.value);
  selectedIndex = -1; // reset selection
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});

// Initial render
renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);
