// --- Hex Word Game with Seeded Board Generation ---

// Letter points for scoring
const letterPoints = {
  A: 1, B: 3, C: 3, D: 2, E: 1,
  F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1,
  P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
};

// Seed words to ensure playable boards
const seedWords = [
  "construction", "demonstration", "contributions", "administering",
  "information", "presentations", "interpretation", "manipulation",
  "registration", "interception", "desirability", "admirability",
  "embarrassment", "understatement", "acknowledgement", "personification",
  "encouragement", "establishments", "explanation", "organization",
  "straightening", "choreographers", "thankfulness", "faithfulness",
  "heartbreaker", "skateboarder", "shapeshifter", "sharpshooter",           
  "unemployment", "transforming", "psychologists", "physiologist",
  "departments", "confidence", "conferences", "preferences",
  "grandfathers", "grandmothers", "grandparents", "grandchild" 
];

// Letter frequency array for random letter selection
const letterFrequencies = [
  'E','E','E','E','E','E','E','E','E','E','E','E',
  'A','A','A','A','A','A','A','A','A',
  'R','R','R','R','R','R',
  'I','I','I','I','I','I','I',
  'O','O','O','O','O','O',
  'T','T','T','T','T','T',
  'N','N','N','N','N','N',
  'S','S','S','S','S','S',
  'L','L','L','L','C','C','C','U','U','U','D','D','D',
  'P','P','P','M','M','M','H','H','H','G','G','G',
  'B','B','F','F','Y','Y','W','W','K','K','V','V',
  'X','X','Z','Z','J','J','Q','Q'
];

// Game state variables
import wordList from './wordList.js';
let currentPath = [];
let currentWord = '';
const tileElements = [];
let topWords = [];
let submittedWords = [];
let potentialWords = [];

// DOM elements
const svg = document.getElementById('hex-grid');
const wordDisplay = document.getElementById('current-word');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submit-word');

// Scoreboard UI
const scoreList = document.createElement('div');
scoreList.style.marginTop = '20px';
scoreList.innerHTML = '<ol id="top-scores"></ol>';
document.body.appendChild(scoreList);

// Final summary UI
const summaryBox = document.createElement('div');
summaryBox.style.marginTop = '30px';
summaryBox.style.borderTop = '1px solid #ccc';
summaryBox.style.paddingTop = '10px';
summaryBox.innerHTML = '<h3>Final Summary:</h3><div id="summary-content"></div>';
document.body.appendChild(summaryBox);

// Hex geometry constants
const HEX_RADIUS = 35;
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;
const VERT_SPACING = HEX_HEIGHT * 0.75;

// Function to create hex points for SVG
function createHexPoints(cx, cy, r) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

// Function to check if two tiles are neighbors
function areAxialNeighbors(a, b) {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(a.s - b.s);
  return dq + dr + ds === 2;
}

// Function to handle tile clicks
function handleTileClick(tile) {
  if (tile.used) return;
  if (currentPath.length > 0) {
    const last = currentPath[currentPath.length - 1];
    if (!areAxialNeighbors(last, tile)) {
      message.textContent = '❌ Tiles must be adjacent.';
      return;
    }
  }

  tile.used = true;
  tile.element.setAttribute('fill', '#999');
  currentPath.push(tile);
  currentWord += tile.letter.toUpperCase();
  wordDisplay.textContent = currentWord;
  message.textContent = '';
}

// Function to reset the current word
function resetWord() {
  currentWord = '';
  wordDisplay.textContent = '';
  currentPath.forEach(tile => {
    tile.used = false;
    tile.element.setAttribute('fill', '#4a90e2');
  });
  currentPath = [];
}

// Function to validate the current path
function isValidPath(path) {
  for (let i = 1; i < path.length; i++) {
    if (!areAxialNeighbors(path[i - 1], path[i])) return false;
  }
  return true;
}

// Function to update top scores
function updateTopScores(word, score) {
  topWords.push({ word, score });
  topWords.sort((a, b) => b.score - a.score);
  if (topWords.length > 10) topWords.pop();

  const list = document.getElementById('top-scores');
  list.innerHTML = '';
  topWords.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.word.toUpperCase()} – ${item.score} pts`;
    list.appendChild(li);
  });
}

// Function to show final summary
function showFinalSummary() {
  const totalScore = submittedWords.reduce((sum, w) => sum + w.score, 0);
  const sortedByLength = [...submittedWords].sort((a, b) => b.word.length - a.word.length);
  const sortedPotential = [...potentialWords].sort((a, b) => b.score - a.score).slice(0, 10);

  const summary = document.getElementById('summary-content');
  let html = `<p>Total Score: <strong>${totalScore} points</strong></p>`;
  html += '<p><strong>Your Words by Length:</strong></p><ol>';
  sortedByLength.forEach(entry => {
    html += `<li>${entry.word.toUpperCase()} (${entry.word.length} letters, ${entry.score} pts)</li>`;
  });
  html += '</ol>';

  html += '<p><strong>Top 10 Possible Words on This Board:</strong></p><ol>';
  sortedPotential.forEach(entry => {
    html += `<li>${entry.word.toUpperCase()} (${entry.word.length} letters, ${entry.score} pts)</li>`;
  });
  html += '</ol>';

  summary.innerHTML = html;
}

// Function to find all possible words on the board
function findAllWordsOnBoard() {
  potentialWords = [];

  function dfs(path, word, tile) {
    if (word.length >= 4 && wordList.includes(word)) {
      const score = path.reduce((sum, t) => sum + t.point, 0);
      potentialWords.push({ word, score });
    }
    if (word.length >= 10) return;

    tile.used = true;
    const neighbors = tileElements.filter(t => !t.used && areAxialNeighbors(tile, t));
    for (const next of neighbors) {
      dfs([...path, next], word + next.letter.toLowerCase(), next);
    }
    tile.used = false;
  }

  for (const tile of tileElements) {
    dfs([tile], tile.letter.toLowerCase(), tile);
  }
}

// Event listener for submit button
submitBtn.addEventListener('click', () => {
  if (currentWord.length < 4) {
    message.textContent = '❌ Word must be at least 4 letters.';
  } else if (!isValidPath(currentPath)) {
    message.textContent = '❌ Tiles are not all connected.';
  } else if (wordList.includes(currentWord.toLowerCase())) {
    const score = currentPath.reduce((sum, tile) => sum + tile.point, 0);
    updateTopScores(currentWord, score);
    submittedWords.push({ word: currentWord, score });
    message.textContent = `✅ "${currentWord}" is valid! Score: ${score}`;
    if (submittedWords.length === 10) {
      findAllWordsOnBoard();
      showFinalSummary();
    }
  } else {
    message.textContent = `❌ "${currentWord}" is not in the word list.`;
  }

  resetWord();
});

// Function to generate a seeded board
function generateSeededBoard() {
  const grid = {};
  const usedCoords = new Set();
  const seedWord = seedWords[Math.floor(Math.random() * seedWords.length)].toUpperCase();
  const directions = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  let q = 0, r = 0;
  grid[`${q},${r}`] = seedWord[0];
  usedCoords.add(`${q},${r}`);

  for (let i = 1; i < seedWord.length; i++) {
    let placed = false;
    for (let [dq, dr] of directions) {
      const nq = q + dq;
      const nr = r + dr;
      const key = `${nq},${nr}`;
      if (!usedCoords.has(key)) {
        grid[key] = seedWord[i];
        usedCoords.add(key);
        q = nq;
        r = nr;
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }

  const radius = 4;
for (let q = -radius; q <= radius; q++) {
  for (let r = -radius; r <= radius; r++) {
    const s = -q - r;
    if (Math.abs(s) > radius) continue;
    const key = `${q},${r}`;
    if (!grid[key]) {
      const letter = letterFrequencies[Math.floor(Math.random() * letterFrequencies.length)];
      grid[key] = letter;
    }
  }
}
return grid;
}
function injectGridIntoGame(grid) {
  for (let q = -4; q <= 4; q++) {
    for (let r = -4; r <= 4; r++) {
      const s = -q - r;
      if (Math.abs(s) > 4) continue;

      const key = `${q},${r}`;
      const letter = grid[key];
      if (!letter) continue;

      const x = HEX_WIDTH * (q + r / 2) + 300;
      const y = VERT_SPACING * r + 250;

      const points = createHexPoints(x, y, HEX_RADIUS);
      const hex = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      hex.setAttribute('points', points);
      hex.setAttribute('fill', '#4a90e2');
      hex.setAttribute('stroke', '#222');
      hex.setAttribute('stroke-width', '1');
      hex.style.cursor = 'pointer';

      const point = letterPoints[letter] || 1;

      const textLetter = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textLetter.setAttribute('x', x);
      textLetter.setAttribute('y', y);
      textLetter.setAttribute('text-anchor', 'middle');
      textLetter.setAttribute('fill', 'white');
      textLetter.setAttribute('font-size', '20');
      textLetter.setAttribute('font-family', 'sans-serif');
      textLetter.setAttribute('pointer-events', 'none');
      textLetter.textContent = letter;

      const textPoint = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textPoint.setAttribute('x', x);
      textPoint.setAttribute('y', y + 18);
      textPoint.setAttribute('text-anchor', 'middle');
      textPoint.setAttribute('fill', 'white');
      textPoint.setAttribute('font-size', '12');
      textPoint.setAttribute('font-family', 'sans-serif');
      textPoint.setAttribute('pointer-events', 'none');
      textPoint.textContent = point;

      const tile = {
        letter,
        point,
        q,
        r,
        s,
        used: false,
        element: hex,
        textLetter,
        textPoint
      };

      hex.addEventListener('click', () => handleTileClick(tile));

      tileElements.push(tile);
      svg.appendChild(hex);
      svg.appendChild(textLetter);
      svg.appendChild(textPoint);
    }
  }
}

const grid = generateSeededBoard();
injectGridIntoGame(grid);