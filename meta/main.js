import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale; // Declare globally to access in brushed and isCommitSelected
let commitProgress = 100;

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}


function processCommits(data) {
  const commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: false,
        writable: false,
        enumerable: false,
      });

      return ret;
    });

  // ✅ Sort by datetime ascending
  return commits.sort((a, b) => a.datetime - b.datetime);
}


function renderCommitInfo(data, commits) {
  const stats = [
    ['COMMITS', commits.length],
    ['FILES', new Set(data.map(item => item["file"])).size],
    ['<abbr title="Lines of code">LOC</abbr>', data.length],
    ['MAX DEPTH', data.map(getMaxDepth).reduce((a, b) => Math.max(a, b), 0)],
    ['LONGEST LINE', Math.max(...data.map(item => item.length))],
    ['MAX LINES', Math.max(...data.map(item => item.line))]
  ];

  function getMaxDepth(obj) {
    if (Array.isArray(obj)) {
      return 1 + Math.max(...obj.map(getMaxDepth));
    } else if (obj && typeof obj === 'object') {
      return 1 + Math.max(...Object.values(obj).map(getMaxDepth));
    }
    return 0;
  }

  const table = d3.select('#stats')
    .append('table')
    .attr('class', 'stats-table');

  // Header row
  const header = table.append('tr');
  stats.forEach(([label]) => {
    header.append('th').html(label);
  });

  // Value row
  const values = table.append('tr');
  stats.forEach(([, value]) => {
    values.append('td').text(value);
  });
}
function UpdateCommitInfo(data, commits) {
  const stats = [
    ['COMMITS', commits.length],
    ['FILES', new Set(data.map(item => item["file"])).size],
    ['<abbr title="Lines of code">LOC</abbr>', data.length],
    ['MAX DEPTH', data.map(getMaxDepth).reduce((a, b) => Math.max(a, b), 0)],
    ['LONGEST LINE', Math.max(...data.map(item => item.length))],
    ['MAX LINES', Math.max(...data.map(item => item.line))]
  ];

  function getMaxDepth(obj) {
    if (Array.isArray(obj)) {
      return 1 + Math.max(...obj.map(getMaxDepth));
    } else if (obj && typeof obj === 'object') {
      return 1 + Math.max(...Object.values(obj).map(getMaxDepth));
    }
    return 0;
  }

  const container = d3.select('#stats')
    .attr('class', 'stats-table');

  container.selectAll('table').remove(); 

  const table = container.append('table')
  .attr('class', 'stats-table');
  // Header row
  const header = table.append('tr');
  stats.forEach(([label]) => {
    header.append('th').html(label);
  });

  // Value row
  const values = table.append('tr');
  stats.forEach(([, value]) => {
    values.append('td').text(value);
  });
}

function renderScatterPlot(data, commits) {
  // Define dimensions
  const width = 1000;
  const height = 600;

  // Define margins
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  // Define usable area
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Create the SVG element
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Create scales
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Call the brush selector with scales
  createBrushSelector(svg, xScale, yScale);

  // Calculate the range of edited lines
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

  // Create a radius scale
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  gridlines
    .selectAll('line')
    .attr('stroke', (d) => (d < 6 || d >= 18 ? 'steelblue' : 'orange'));

  // Sort commits by total lines in descending order
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines)) // Use the radius scale
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event); // Update position as the mouse moves
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore transparency
      updateTooltipVisibility(false);
    });

  // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis') // new line to mark the g tag
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis') // just for consistency
    .call(yAxis);
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  if (isVisible) {
    tooltip.classList.add('visible');
  } else {
    tooltip.classList.remove('visible');
  }
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
  time.textContent = commit.datetime?.toLocaleString('en', { timeStyle: 'short' });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  // Find the offset of the chart container
  const chartRect = document.getElementById('chart').getBoundingClientRect();
  // Use page scroll position to correct for sticky/scrolling containers
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Position tooltip relative to the chart container
  tooltip.style.left = `${event.clientX + scrollLeft + 10}px`;
  tooltip.style.top = `${event.clientY+ scrollTop + 10}px`;
}

function createBrushSelector(svg, xScale, yScale) {
    // Define the extent of the brush to match the usable area
    const brush = d3.brush()
      .extent([
        [xScale.range()[0], yScale.range()[1]], // Top-left corner
      [xScale.range()[1], yScale.range()[0]], // Bottom-right corner
    ])
      .on("brush", brushed); // Attach the brush event
  
    svg.call(brush);
    
    // Raise dots and everything after the overlay
    svg.selectAll('.dots, .overlay ~ *').raise();
  }

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  const [x0, x1] = selection.map((d) => d[0]);
  const [y0, y1] = selection.map((d) => d[1]);
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <div>
            <dt>${language}</dt>
            <dd>${count} lines </br> (${formatted})</dd>
            </div>
        `;
  }
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  // CHANGE: we should clear out the existing xAxis and then create a new one.
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id) // change this line
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

const timeScale = d3
.scaleTime()
.domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
])
.range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

const slider = document.getElementById('commit-progress');
const timeDisplay = document.getElementById('commit-time-content');
let filteredCommits = commits;

function onTimeSliderChange() {
commitProgress = +slider.value;
commitMaxTime = timeScale.invert(commitProgress);
timeDisplay.textContent = commitMaxTime.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

let lines = filteredCommits.flatMap((d) => d.lines);
let files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  })
  .sort((a, b) => b.lines.length - a.lines.length);
let colors = d3.scaleOrdinal(d3.schemeTableau10);

let filesContainer = d3
  .select('#files')
  .selectAll('div')
  .data(files, (d) => d.name)
  .join(
    // This code only runs when the div is initially rendered
    (enter) =>
      enter.append('div').call((div) => {
        div.append('dt').append('code');
        div.append('dd');
      }),
  );

// This code updates the div info
filesContainer.select('dt > code').text((d) => d.name);
filesContainer.each(function(fileData) {
  d3.select(this).select('dd')
    .selectAll('div.loc')
    .data(fileData.lines)
    .join(
      enter => enter.append('div').attr('class', 'loc'),
      update => update,
      exit => exit.remove()
    )
    .attr('style', d => `--color: ${colors(d.type)}`);
});

updateScatterPlot(data, filteredCommits);
UpdateCommitInfo(data, filteredCommits);
}

slider.addEventListener('input', onTimeSliderChange);


d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );

  d3.select('#rank-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );

  function onStepEnter(response) {
    const stepCommit = response.element.__data__;
    commitMaxTime = stepCommit.datetime;
    commitProgress = timeScale(commitMaxTime);
    slider.value = commitProgress;
  
    timeDisplay.textContent = commitMaxTime.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    });
  
    filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  
    // Update visuals
    updateScatterPlot(data, filteredCommits);
    UpdateCommitInfo(data, filteredCommits);
  }
  
 function onStepEnter2(response) {
  const stepCommit = response.element.__data__;
  const commitMaxTime = stepCommit.datetime;
  const commitProgress = timeScale(commitMaxTime);
  slider.value = commitProgress;

  timeDisplay.textContent = commitMaxTime.toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  // Filter commits up to current step
  const filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  // Flatten all lines across filtered commits
  const lines = filteredCommits.flatMap((d) => d.lines);
  
  // Group lines by file and sort descending by line count
  const files = d3.groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // Bind file data
  const filesContainer = d3.select('#files')
    .selectAll('div.file')
    .data(files, d => d.name)
    .join(
      enter => enter.append('div')
        .attr('class', 'file')
        .call(div => {
          div.append('dt').append('code');
          div.append('dd');
        }),
      update => update,
      exit => exit.remove()
    );

  // Update file names
  filesContainer.select('dt > code')
    .text(d => d.name);

  // For each file block, update its line-of-code children
  filesContainer.each(function(fileData) {
    d3.select(this).select('dd')
      .selectAll('div.loc')
      .data(fileData.lines)
      .join(
        enter => enter.append('div').attr('class', 'loc'),
        update => update,
        exit => exit.remove()
      )
      .attr('style', d => `--color: ${colors(d.type)}`);
  });
}

  const scroller1 = scrollama();
  scroller1
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);
  
  // Scrollama instance for #scrolly-2
  const scroller2 = scrollama();
  scroller2
    .setup({
      container: '#scrolly-2',
      step: '#scrolly-2 .step',
    })
    .onStepEnter(onStepEnter2);