////////////////////////////////////////////////////
//               CONFIGURATION VALUES            //
////////////////////////////////////////////////////

const DIFFICULTY_SETTINGS = {
  easy: 3,
  medium: 6,
  hard: 9
};

let allPokemon = []; // Pokémon fetched from API

////////////////////////////////////////////////////
//               UTILITY FUNCTIONS               //
////////////////////////////////////////////////////

function getImageUrl(id) {
  // Returns the official artwork URL for a Pokémon by ID
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function shuffle(array) {
  // Basic Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

////////////////////////////////////////////////////
//             GAME STATE VARIABLES              //
////////////////////////////////////////////////////

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedIds = new Set();
let clickCount = 0;
let matchedPairs = 0;
let totalPairs = 0;
let timerInterval = null;
let timeLeft = 0;
let currentPairCount = 0; // Needed for reset button
let powerUpUsed = false;

////////////////////////////////////////////////////
//             STATUS AND TIMER LOGIC            //
////////////////////////////////////////////////////

function updateStatus() {
  const pairsLeft = totalPairs - matchedPairs;
  $('#status').html(`
    Clicks: ${clickCount} | 
    Pairs Matched: ${matchedPairs} / ${totalPairs} | 
    Pairs Left: ${pairsLeft} | 
    Time Left: ${timeLeft}s
  `);
}

function startTimer(duration) {
  timeLeft = duration;
  updateStatus();
  clearInterval(timerInterval); // Prevent duplicate timers
  timerInterval = setInterval(() => {
    timeLeft--;
    updateStatus();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      lockBoard = true;
      alert("⏰ Game Over! You ran out of time.");
    }
  }, 1000);
}

function checkWinCondition() {
  if (matchedPairs === totalPairs) {
    clearInterval(timerInterval);
    lockBoard = true;
    alert("🎉 You Win! All pairs matched.");
  }
}

////////////////////////////////////////////////////
//               CORE GAME LOGIC                 //
////////////////////////////////////////////////////

function resetFlipState() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function attachCardEvents() {
  $('.card').on('click', function () {
    if (lockBoard) return;

    const $card = $(this);
    const cardId = $card.data('id');

    // Prevent flipping the same or matched card
    if ($card.hasClass('flip') || matchedIds.has(cardId)) return;

    $card.addClass('flip');
    clickCount++;
    updateStatus();

    if (!firstCard) {
      firstCard = $card;
    } else {
      secondCard = $card;
      lockBoard = true;

      const id1 = firstCard.data('id');
      const id2 = secondCard.data('id');

      if (id1 === id2) {
        matchedIds.add(id1);
        matchedPairs++;
        updateStatus();
        checkWinCondition();
        resetFlipState();
      } else {
        // Small delay before hiding cards again
        setTimeout(() => {
          firstCard.removeClass('flip');
          secondCard.removeClass('flip');
          resetFlipState();
        }, 1000);
      }
    }
  });
}

function renderCards(pairsCount) {
  const $grid = $('#game_grid');
  $grid.empty();

  const chosen = [];
  const usedIndexes = new Set();

  // Randomly pick unique Pokémon
  while (chosen.length < pairsCount) {
    const i = Math.floor(Math.random() * allPokemon.length);
    if (!usedIndexes.has(i)) {
      usedIndexes.add(i);
      chosen.push(allPokemon[i]);
    }
  }

  let cardPool = [];
  chosen.forEach(p => {
    cardPool.push(p);
    cardPool.push({ ...p }); // duplicate for pair
  });

  shuffle(cardPool);

  cardPool.forEach((poke, index) => {
    const frontImg = getImageUrl(poke.id);
    const card = $(`
      <div class="card" data-id="${poke.id}">
        <img class="front_face" src="${frontImg}" alt="${poke.name}">
        <img class="back_face" src="back.webp" alt="Card Back">
      </div>
    `);
    $grid.append(card);
  });

  // Reset state
  clickCount = 0;
  matchedPairs = 0;
  totalPairs = pairsCount;
  matchedIds.clear();
  lockBoard = false;
  powerUpUsed = false;
  currentPairCount = pairsCount;

  updateStatus();
  attachCardEvents();
}

////////////////////////////////////////////////////
//               INITIAL DATA LOAD               //
////////////////////////////////////////////////////

function loadPokemonList() {
  return fetch("https://pokeapi.co/api/v2/pokemon?limit=1500")
    .then(res => res.json())
    .then(data => {
      allPokemon = data.results
        .map(p => {
          const match = p.url.match(/\/pokemon\/(\d+)\//);
          const id = match ? parseInt(match[1]) : null;
          return { name: p.name, id };
        })
        .filter(p => p.id && p.id <= 1025); // Ignore broken IDs
    });
}

////////////////////////////////////////////////////
//               THEME TOGGLING                  //
////////////////////////////////////////////////////

function applyTheme(theme) {
  const $body = $('body');
  if (theme === 'dark') {
    $body.removeClass('light').addClass('dark');
  } else {
    $body.removeClass('dark').addClass('light');
  }
  localStorage.setItem('theme', theme);
}

////////////////////////////////////////////////////
//               BUTTON EVENT HOOKS              //
////////////////////////////////////////////////////

$('#startBtn').on('click', () => {
  const difficulty = $('#difficulty').val();
  const pairCount = DIFFICULTY_SETTINGS[difficulty];
  renderCards(pairCount);
  const timeLimit = pairCount * 10; // Time based on difficulty
  startTimer(timeLimit);
});

$('#resetBtn').on('click', () => {
  if (currentPairCount > 0) {
    renderCards(currentPairCount);
    const timeLimit = currentPairCount * 10;
    startTimer(timeLimit);
  }
});

$('#themeToggle').on('click', () => {
  const currentTheme = $('body').hasClass('dark') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
});

$('#powerUpBtn').on('click', () => {
  if (powerUpUsed || lockBoard) return; // Don't stack powerups
  powerUpUsed = true;
  const unmatchedCards = $('.card').not('.flip');
  unmatchedCards.addClass('flip');
  lockBoard = true;
  setTimeout(() => {
    unmatchedCards.removeClass('flip');
    lockBoard = false;
  }, 3000); // Duration of reveal
});

////////////////////////////////////////////////////
//                 ON PAGE LOAD                  //
////////////////////////////////////////////////////

$(document).ready(() => {
  loadPokemonList();
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
});
