// phase10.js - Phase 10 game logic and UI (Basic Gameplay)

(function() { // Use an IIFE to encapsulate the Phase 10 game logic

    // --- Phase 10 Game UI HTML ---
    // Note: The main game-container div is expected to be provided by index.html
    const phase10GameHTML = `
        <h1 class="text-4xl font-bold mb-6 text-yellow-400 text-center">Phase 10!</h1>
        <div id="phase10-game-specific-container" class="game-container">
            <div class="player-info flex justify-between items-center mb-4" id="bot-info">
                <span class="text-xl font-semibold">Bot's Hand: <span id="bot-card-count">0</span> cards</span>
            </div>

            <div class="game-area-content flex justify-center items-center gap-8">
                <div class="deck-area flex flex-col items-center">
                    <div id="deck" class="card phase10-card-back cursor-pointer"></div>
                    <span class="text-sm mt-2">Draw Pile</span>
                </div>
                <div class="discard-area flex flex-col items-center">
                    <div id="discard-pile" class="card bg-gray-800 flex items-center justify-center text-white text-3xl">
                        <span class="text-lg">Discard</span>
                    </div>
                    <span class="text-sm mt-2">Discard Pile</span>
                </div>
            </div>

            <div id="phase10-message-box" class="message-box mt-4 mb-4">
                Welcome to Phase 10! Click 'Start Game' to begin.
            </div>

            <div class="player-info flex justify-between items-center mt-4" id="player-info">
                <span class="text-xl font-semibold">Your Hand: <span id="player-card-count">0</span> cards</span>
                <span id="player-current-phase" class="text-lg">Phase: 1</span>
            </div>
            <div id="player-hand" class="hand mb-4">
                </div>

            <div class="flex justify-center mt-4 gap-4">
                <button id="start-game-button" class="btn btn-primary">Start Game</button>
                <button id="reset-game-button" class="btn btn-secondary hidden">Reset Game</button>
            </div>
        </div>
    `;

    // --- Game State Variables ---
    let deck = [];
    let discardPile = [];
    let playerHand = [];
    let botHand = [];
    let currentPlayer = 'player'; // 'player' or 'bot'
    let gameActive = false;
    let botThinkingTimeout = null;
    let hasDrawn = false; // Player has drawn for the current turn
    let hasDiscarded = false; // Player has discarded for the current turn

    // --- Player/Bot specific game state ---
    const players = {
        player: { hand: playerHand, currentPhase: 1, hasLaidDown: false, score: 0 },
        bot: { hand: botHand, currentPhase: 1, hasLaidDown: false, score: 0 }
    };

    // --- DOM Elements ---
    let deckElement, discardPileElement, playerHandElement, botCardCountElement,
        playerCardCountElement, phase10MessageBox, startGameButton, resetGameButton,
        botInfo, playerInfo, playerCurrentPhaseElement;

    // --- Card Data Structure for Phase 10 ---
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']; // 1=A, 11=J, 12=Q, 13=K
    const colors = {
        'hearts': 'red', 'diamonds': 'red',
        'clubs': 'black', 'spades': 'black'
    };
    const phase10SpecialCards = {
        'wild': 8, // 8 Wild cards
        'skip': 4  // 4 Skip cards
    };
    const CARD_DISPLAY_RANKS = { // For displaying J, Q, K, A
        '1': 'A', '11': 'J', '12': 'Q', '13': 'K'
    };

    // --- Game Functions ---

    /**
     * Creates a standard Phase 10 deck (2 standard decks + 8 Wilds + 4 Skips).
     */
    function createPhase10Deck() {
        let newDeck = [];
        // Two standard 52-card decks
        for (let i = 0; i < 2; i++) {
            suits.forEach(suit => {
                ranks.forEach(rank => {
                    newDeck.push({
                        suit: suit,
                        rank: rank,
                        value: parseInt(rank), // For numerical sorting/runs
                        type: (parseInt(rank) >= 11) ? 'face' : 'number',
                        color: colors[suit]
                    });
                });
            });
        }

        // Add Wild and Skip cards
        for (const [type, count] of Object.entries(phase10SpecialCards)) {
            for (let i = 0; i < count; i++) {
                newDeck.push({
                    suit: 'none', // Special cards have no suit
                    rank: type, // 'wild' or 'skip'
                    value: 0, // Special value for sorting wild/skip
                    type: type, // 'wild' or 'skip'
                    color: 'multicolor' // For display
                });
            }
        }
        return newDeck;
    }

    /**
     * Shuffles the given deck using the Fisher-Yates algorithm.
     * @param {Array} deck - The array of cards to shuffle.
     * @returns {Array} The shuffled deck.
     */
    function shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap elements
        }
        return deck;
    }

    /**
     * Deals initial cards to players (10 cards each).
     */
    function dealInitialCards() {
        players.player.hand = [];
        players.bot.hand = [];
        for (let i = 0; i < 10; i++) {
            drawCard('player', 1);
            drawCard('bot', 1);
        }
    }

    /**
     * Draws a specified number of cards for a player.
     * If the deck is empty, shuffles the discard pile back into the deck.
     * @param {string} playerType - 'player' or 'bot'.
     * @param {number} count - Number of cards to draw.
     */
    function drawCard(playerType, count) {
        let hand = players[playerType].hand;
        for (let i = 0; i < count; i++) {
            if (deck.length === 0) {
                if (discardPile.length <= 1) {
                    showMessage("No cards left to draw and only the current card in discard pile. Game stuck?");
                    // Potentially end game or declare draw here
                    return;
                }
                // Reshuffle discard pile into deck, keeping the top card on discard
                const topDiscardCard = discardPile.pop();
                deck = shuffleDeck(discardPile);
                discardPile = [topDiscardCard];
                showPhase10Message("Deck reshuffled from discard pile!");
            }
            const card = deck.pop();
            if (card) {
                hand.push(card);
            }
        }
        renderHands();
    }

    /**
     * Renders the player's and bot's hands on the UI.
     */
    function renderHands() {
        playerHandElement.innerHTML = '';
        // Sort player hand for easier viewing (by color, then rank)
        players.player.hand.sort((a, b) => {
            const colorOrder = ['red', 'black', 'multicolor'];
            if (colorOrder.indexOf(a.color) !== colorOrder.indexOf(b.color)) {
                return colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color);
            }
            // Sort special cards to the end
            if (a.type === 'wild' || a.type === 'skip') return 1;
            if (b.type === 'wild' || b.type === 'skip') return -1;
            return a.value - b.value;
        });

        players.player.hand.forEach((card, index) => {
            const cardElement = createCardElement(card, index);
            // In basic phase, all cards are clickable for discard after draw
            // Later, this will be for playing sets/runs
            if (currentPlayer === 'player' && hasDrawn && !hasDiscarded) {
                 cardElement.classList.add('highlighted'); // Highlight cards for discard
            } else if (currentPlayer === 'player' && !hasDrawn) {
                 cardElement.classList.add('disabled'); // Can't play before drawing
            }
            playerHandElement.appendChild(cardElement);
        });
        playerCardCountElement.textContent = players.player.hand.length;
        botCardCountElement.textContent = players.bot.hand.length;
        playerCurrentPhaseElement.textContent = `Phase: ${players.player.currentPhase}`;
    }

    /**
     * Creates an HTML element for a card.
     * @param {object} card - The card object { suit, rank, value, type, color }.
     * @param {number} index - The index of the card in the hand.
     * @returns {HTMLElement} The card div element.
     */
    function createCardElement(card, index = -1) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.classList.add(`bg-${card.color}`); // red, black, or multicolor

        if (index !== -1) {
            cardElement.dataset.index = index; // Store index for hand
        }

        let cardContent = '';
        if (card.type === 'wild' || card.type === 'skip') {
            cardContent = `<span class="card-wild-text">${card.rank.toUpperCase()}</span>`; // e.g., WILD, SKIP
        } else {
            const displayRank = CARD_DISPLAY_RANKS[card.rank] || card.rank;
            cardContent = `<span class="card-value">${displayRank}</span>`;
            const suitChar = getSuitChar(card.suit);
            cardElement.innerHTML += `<span class="card-suit absolute top-1 left-2 text-xl">${suitChar}</span>`;
            cardElement.innerHTML += `<span class="card-suit absolute bottom-1 right-2 text-xl transform rotate-180">${suitChar}</span>`;
        }
        cardElement.innerHTML += cardContent;
        return cardElement;
    }

    /** Helper to get unicode suit character */
    function getSuitChar(suit) {
        switch (suit) {
            case 'hearts': return '♥';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            case 'spades': return '♠';
            default: return '';
        }
    }


    /**
     * Renders the top card of the discard pile.
     */
    function renderDiscardPile() {
        discardPileElement.innerHTML = '';
        if (discardPile.length > 0) {
            const topCard = discardPile[discardPile.length - 1];
            const cardElement = createCardElement(topCard);
            cardElement.classList.remove('highlighted', 'disabled'); // ensure not clickable
            discardPileElement.appendChild(cardElement);
        } else {
            discardPileElement.innerHTML = '<span class="text-lg">Discard</span>';
            discardPileElement.classList.remove(...Object.values(colors).concat('multicolor').map(c => `bg-${c}`));
            discardPileElement.classList.add('bg-gray-800');
        }
    }

    /**
     * Handles a player discarding a card.
     * @param {string} playerType - 'player' or 'bot'.
     * @param {number} cardIndex - The index of the card in the hand to discard.
     */
    function discardCard(playerType, cardIndex) {
        let hand = players[playerType].hand;
        const cardToDiscard = hand[cardIndex];

        hand.splice(cardIndex, 1); // Remove from hand
        discardPile.push(cardToDiscard); // Add to discard pile

        hasDiscarded = true; // Mark as discarded for current turn

        showPhase10Message(`${playerType === 'player' ? 'You' : 'Bot'} discarded a ${getCardDisplayName(cardToDiscard)}.`);
        renderHands();
        renderDiscardPile();

        // Check if player went out (finished the round)
        if (hand.length === 0) {
            endRound(playerType);
            return;
        }

        setTimeout(() => {
            nextTurn();
        }, 700); // Small delay before next turn
    }

    /** Helper to get a readable card name */
    function getCardDisplayName(card) {
        if (card.type === 'wild' || card.type === 'skip') {
            return card.rank.toUpperCase();
        }
        return `${CARD_DISPLAY_RANKS[card.rank] || card.rank} of ${card.suit}`;
    }

    /**
     * Advances to the next player's turn.
     */
    function nextTurn() {
        if (botThinkingTimeout) {
            clearTimeout(botThinkingTimeout);
            botThinkingTimeout = null;
        }

        // Switch current player
        currentPlayer = (currentPlayer === 'player' ? 'bot' : 'player');

        // Reset turn state
        hasDrawn = false;
        hasDiscarded = false;

        // Update current player highlight
        if (currentPlayer === 'player') {
            playerInfo.classList.add('current-player');
            botInfo.classList.remove('current-player');
        } else {
            botInfo.classList.add('current-player');
            playerInfo.classList.remove('current-player');
        }

        showPhase10Message(`${currentPlayer === 'player' ? 'Your' : 'Bot\'s'} turn!`);
        renderHands(); // Re-render hands to update playable card highlighting

        if (currentPlayer === 'bot') {
            botThinkingTimeout = setTimeout(botPlay, 1500); // Bot "thinks" for a bit
        }
    }

    /**
     * Basic bot play for Phase 1: Draw and discard a random card.
     */
    function botPlay() {
        showPhase10Message("Bot draws a card.");
        drawCard('bot', 1); // Bot draws

        // Bot discards a random card (for now)
        const botHand = players.bot.hand;
        if (botHand.length > 0) {
            const discardIndex = Math.floor(Math.random() * botHand.length);
            discardCard('bot', discardIndex);
        } else {
            // This case should ideally not happen if bot drew successfully
            showPhase10Message("Bot has no cards to discard. Ending turn.");
            nextTurn();
        }
    }

    /**
     * Handles the end of a round (someone goes out).
     * @param {string} winner - The player who went out ('player' or 'bot').
     */
    function endRound(winner) {
        gameActive = false;
        showPhase10Message(`${winner === 'player' ? 'You' : 'Bot'} went out! Round ends.`);

        // *** Placeholder for scoring and phase advancement ***
        // In full game:
        // 1. Calculate points for cards left in opponents' hands
        // 2. Add points to scores
        // 3. If winner hasn't laid down phase, they get penalized
        // 4. If winner laid down phase, they advance to next phase
        // 5. Check if anyone completed all 10 phases to end game
        // 6. Reset for next round (new deck, deal, etc.)

        console.log("Round ended. Scoring and phase advancement logic goes here.");
        console.log("Player hand:", players.player.hand);
        console.log("Bot hand:", players.bot.hand);
        showPhase10Message("Round ended! Full scoring and phase advancement to be implemented.");

        // For now, just reset the game
        setTimeout(() => {
            alert(`${winner === 'player' ? 'You' : 'Bot'} went out! This round is over.`);
            resetGame();
        }, 1500);
    }

    /**
     * Resets the game to its initial state.
     */
    function resetGame() {
        deck = [];
        discardPile = [];
        players.player.hand = [];
        players.bot.hand = [];
        currentPlayer = 'player';
        gameActive = false;
        hasDrawn = false;
        hasDiscarded = false;
        clearTimeout(botThinkingTimeout);
        botThinkingTimeout = null;

        // Reset player phases and scores (for multiple rounds later)
        players.player.currentPhase = 1;
        players.player.hasLaidDown = false;
        players.player.score = 0;
        players.bot.currentPhase = 1;
        players.bot.hasLaidDown = false;
        players.bot.score = 0;

        if (playerHandElement) playerHandElement.innerHTML = '';
        if (discardPileElement) {
            discardPileElement.innerHTML = '<span class="text-lg">Discard</span>';
            discardPileElement.classList.remove(...Object.values(colors).concat('multicolor').map(c => `bg-${c}`));
            discardPileElement.classList.add('bg-gray-800');
        }
        if (botCardCountElement) botCardCountElement.textContent = '0';
        if (playerCardCountElement) playerCardCountElement.textContent = '0';
        if (playerCurrentPhaseElement) playerCurrentPhaseElement.textContent = `Phase: ${players.player.currentPhase}`;

        showPhase10Message("Welcome to Phase 10! Click 'Start Game' to begin.");
        startGameButton.classList.remove('hidden');
        resetGameButton.classList.add('hidden');
        if (playerInfo) playerInfo.classList.remove('current-player');
        if (botInfo) botInfo.classList.remove('current-player');
    }

    /**
     * Initializes and starts a new game.
     */
    function startGame() {
        resetGame();
        deck = shuffleDeck(createPhase10Deck());

        // Draw initial discard pile card (must not be a wild or skip as first card)
        do {
            discardPile.push(deck.pop());
        } while (discardPile[0].type === 'wild' || discardPile[0].type === 'skip');

        dealInitialCards();
        renderDiscardPile();
        renderHands();

        gameActive = true;
        startGameButton.classList.add('hidden');
        resetGameButton.classList.remove('hidden');

        // First player is always player in Phase 10 initially
        currentPlayer = 'player';
        playerInfo.classList.add('current-player');
        showPhase10Message("Your turn! Draw a card from the deck or discard pile.");
    }

    // --- Event Listener Management ---
    let phase10EventListeners = []; // To store references to event listeners for proper cleanup

    function addPhase10EventListener(element, eventType, handler) {
        element.addEventListener(eventType, handler);
        phase10EventListeners.push({ element, eventType, handler });
    }

    function removePhase10EventListeners() {
        phase10EventListeners.forEach(({ element, eventType, handler }) => {
            element.removeEventListener(eventType, handler);
        });
        phase10EventListeners = [];
    }

    // --- Public Initialization Function ---
    window.initPhase10Game = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Phase 10 game container not found:', containerId);
            return;
        }

        // Render Phase 10 HTML into the container
        container.innerHTML = phase10GameHTML;

        // Assign DOM elements after they are rendered
        deckElement = document.getElementById('deck');
        discardPileElement = document.getElementById('discard-pile');
        playerHandElement = document.getElementById('player-hand');
        botCardCountElement = document.getElementById('bot-card-count');
        playerCardCountElement = document.getElementById('player-card-count');
        phase10MessageBox = document.getElementById('phase10-message-box');
        startGameButton = document.getElementById('start-game-button');
        resetGameButton = document.getElementById('reset-game-button');
        botInfo = document.getElementById('bot-info');
        playerInfo = document.getElementById('player-info');
        playerCurrentPhaseElement = document.getElementById('player-current-phase');

        // --- Event Listeners for Phase 10 ---
        // Player draws from deck
        addPhase10EventListener(deckElement, 'click', () => {
            if (!gameActive || currentPlayer !== 'player') {
                showPhase10Message("It's not your turn!");
                return;
            }
            if (hasDrawn) {
                showPhase10Message("You've already drawn this turn. Now discard a card.");
                return;
            }
            showPhase10Message("You drew a card from the deck.");
            drawCard('player', 1);
            hasDrawn = true;
            renderHands(); // Update highlighting for discard
        });

        // Player draws from discard pile
        addPhase10EventListener(discardPileElement, 'click', () => {
            if (!gameActive || currentPlayer !== 'player') {
                showPhase10Message("It's not your turn!");
                return;
            }
            if (hasDrawn) {
                showPhase10Message("You've already drawn this turn. Now discard a card.");
                return;
            }
            if (discardPile.length === 0) {
                showPhase10Message("Discard pile is empty!");
                return;
            }
            // Logic to draw from discard (remove from discardPile, add to playerHand)
            const cardToDraw = discardPile.pop();
            players.player.hand.push(cardToDraw);
            showPhase10Message(`You drew a ${getCardDisplayName(cardToDraw)} from the discard pile.`);
            hasDrawn = true;
            renderHands(); // Update highlighting for discard
            renderDiscardPile();
        });


        // Player discards a card (from hand)
        addPhase10EventListener(playerHandElement, 'click', (event) => {
            if (!gameActive || currentPlayer !== 'player') {
                showPhase10Message("It's not your turn!");
                return;
            }
            if (!hasDrawn) {
                showPhase10Message("You must draw a card first!");
                return;
            }
            if (hasDiscarded) {
                showPhase10Message("You've already discarded this turn.");
                return;
            }

            const cardElement = event.target.closest('.card');
            if (!cardElement) {
                return; // Not a card click
            }

            const cardIndex = parseInt(cardElement.dataset.index);
            discardCard('player', cardIndex);
        });


        addPhase10EventListener(startGameButton, 'click', startGame);
        addPhase10EventListener(resetGameButton, 'click', resetGame);

        // Initial setup for Phase 10 when loaded
        resetGame();
        // Store a reference to this game instance for cleanup
        window.phase10GameInstance = { destroy: removePhase10EventListeners };
    };

})(); // End of IIFE

// Add styles specific to Phase 10 cards to the main HTML <style> block
// (These are suggested additions, ensure they are in your index.html style)
/*
.phase10-card-back {
    background-color: #2b6cb0; // Blue 700 for Phase 10 card back
    color: white;
    font-size: 1.5rem;
    position: relative;
    transform-style: preserve-3d;
    transform: rotateY(180deg); // Show back of card
    transition: transform 0.3s ease-out;
}

.phase10-card-back::before {
    content: '10'; // Placeholder for Phase 10 logo
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotateY(180deg); // Flip text back
    font-size: 2.2rem;
    font-weight: bold;
    color: white;
}

// Phase 10 card specific colors and layout
.card.bg-red { background-color: #ef4444; color: white; }
.card.bg-black { background-color: #1a202c; color: white; } // Darker black for regular cards
.card.bg-multicolor {
    background: conic-gradient(from 0deg at 50% 50%, #ef4444, #3b82f6, #22c55e, #eab308, #ef4444);
    color: white;
    font-size: 1.8rem;
    font-weight: bold;
}
.card-suit {
    position: absolute;
    font-size: 1.2rem;
}
*/
