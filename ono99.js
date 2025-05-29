// ono99.js - Ono 99 game logic and UI

(function() { // Use an IIFE to encapsulate the Ono 99 game logic

    // --- Ono 99 Game UI HTML ---
    const ono99GameHTML = `
        <h1 class="text-4xl font-bold mb-6 text-indigo-400 text-center">Ono 99!</h1>
        <div id="ono99-game-specific-container" class="game-container">
            <div class="player-info flex justify-between items-center mb-4" id="bot-info">
                <span class="text-xl font-semibold">Bot's Hand: <span id="bot-card-count">0</span> cards</span>
            </div>

            <div class="game-area-content flex flex-col items-center gap-4">
                <div id="running-total-display" class="text-6xl font-extrabold text-blue-300 my-4">0</div>
                <div class="flex justify-center items-center gap-8">
                    <div class="deck-area flex flex-col items-center">
                        <div id="deck" class="card ono99-card-back cursor-pointer"></div>
                        <span class="text-sm mt-2">Draw Pile</span>
                    </div>
                    <div class="discard-area flex flex-col items-center">
                        <div id="discard-pile" class="card bg-gray-800 flex items-center justify-center text-white text-3xl">
                            <span class="text-lg">Discard</span>
                        </div>
                        <span class="text-sm mt-2">Discard Pile</span>
                    </div>
                </div>
            </div>

            <div id="ono99-message-box" class="message-box mt-4 mb-4">
                Welcome to Ono 99! Click 'Start Game' to begin.
            </div>

            <div class="player-info flex justify-between items-center mt-4" id="player-info">
                <span class="text-xl font-semibold">Your Hand: <span id="player-card-count">0</span> cards</span>
            </div>
            <div id="player-hand" class="hand mb-4">
                </div>

            <div class="flex justify-center mt-4 gap-4">
                <button id="start-game-button" class="btn btn-primary">Start Game</button>
                <button id="reset-game-button" class="btn btn-secondary hidden">Reset Game</button>
            </div>
        </div>

        <div id="ono99-play0-modal" class="modal-overlay">
            <div class="modal-content">
                <h2 class="text-2xl font-bold mb-6">Choose a value for Play 0 (0-9)</h2>
                <input type="number" id="play0-value-input" min="0" max="9" value="0" class="w-24 p-2 text-center text-gray-900 bg-gray-300 rounded mb-4">
                <button id="confirm-play0-button" class="btn btn-primary">Confirm</button>
            </div>
        </div>

        <div id="ono99-game-over-modal" class="modal-overlay">
            <div class="modal-content">
                <h2 id="ono99-game-over-message" class="text-3xl font-bold mb-4"></h2>
                <p id="ono99-final-message" class="text-xl mb-4"></p>
                <button id="ono99-play-again-button" class="btn btn-primary mt-4">Play Again</button>
            </div>
        </div>
    `;

    // --- Game State Variables ---
    let deck = [];
    let discardPile = [];
    let players = {
        player: { hand: [], score: 0, isSkipped: false },
        bot: { hand: [], score: 0, isSkipped: false }
    };
    let playerOrder = ['player', 'bot']; // Initial order
    let currentPlayerIndex = 0;
    let runningTotal = 0;
    let gameActive = false;
    let botThinkingTimeout = null;
    let cardsToPlayNext = 0; // For Play 2 cards

    // --- DOM Elements ---
    let deckElement, discardPileElement, playerHandElement, botCardCountElement,
        playerCardCountElement, ono99MessageBox, startGameButton, resetGameButton,
        botInfo, playerInfo, runningTotalDisplay,
        ono99Play0Modal, play0ValueInput, confirmPlay0Button,
        ono99GameOverModal, ono99GameOverMessage, ono99FinalMessage, ono99PlayAgainButton;

    // --- Card Data Structure for Ono 99 ---
    const CARD_TYPES = {
        NUMBER: 'number',
        REVERSE: 'reverse',
        SKIP: 'skip',
        PLUS_2: 'plus2',
        MINUS_10: 'minus10',
        PLAY_0: 'play0' // Wild card for 0-9
    };

    // Card values (for display vs. actual effect)
    const CARD_EFFECT_VALUES = {
        'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        'Reverse': 0, 'Skip': 0, 'Play 2': 0, 'Minus 10': -10, 'Play 0': 0 // Play 0's value is chosen
    };

    const ONO99_DECK_CONFIG = [
        { type: CARD_TYPES.NUMBER, ranks: ['A', '2', '3', '4', '5', '6', '7', '8', '9'], countPerRank: 4 }, // 36 cards
        { type: CARD_TYPES.REVERSE, rank: 'Reverse', count: 4 },
        { type: CARD_TYPES.SKIP, rank: 'Skip', count: 4 },
        { type: CARD_TYPES.PLUS_2, rank: 'Play 2', count: 4 },
        { type: CARD_TYPES.MINUS_10, rank: 'Minus 10', count: 4 },
        { type: CARD_TYPES.PLAY_0, rank: 'Play 0', count: 4 }
    ]; // Total 56 cards for one deck

    // --- Game Functions ---

    /**
     * Creates the Ono 99 deck based on configuration.
     */
    function createOno99Deck() {
        let newDeck = [];
        let cardIdCounter = 0; // Unique ID for each card instance

        ONO99_DECK_CONFIG.forEach(config => {
            if (config.type === CARD_TYPES.NUMBER) {
                config.ranks.forEach(rank => {
                    for (let i = 0; i < config.countPerRank; i++) {
                        newDeck.push({
                            id: `card-${cardIdCounter++}`,
                            type: config.type,
                            rank: rank,
                            value: CARD_EFFECT_VALUES[rank],
                            color: 'number' // For styling, e.g., 'ono99-number-card'
                        });
                    }
                });
            } else {
                for (let i = 0; i < config.count; i++) {
                    newDeck.push({
                        id: `card-${cardIdCounter++}`,
                        type: config.type,
                        rank: config.rank,
                        value: CARD_EFFECT_VALUES[config.rank],
                        color: 'special' // For styling, e.g., 'ono99-special-card'
                    });
                }
            }
        });
        return newDeck;
    }

    /**
     * Shuffles the given deck.
     */
    function shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    /**
     * Deals initial cards to players (5 cards each for Ono 99).
     */
    function dealInitialCards() {
        players.player.hand = [];
        players.bot.hand = [];
        for (let i = 0; i < 5; i++) { // Deal 5 cards each
            drawCard('player', 1);
            drawCard('bot', 1);
        }
    }

    /**
     * Draws a specified number of cards for a player.
     */
    function drawCard(playerType, count) {
        let hand = players[playerType].hand;
        for (let i = 0; i < count; i++) {
            if (deck.length === 0) {
                if (discardPile.length <= 1) {
                    showOno99Message("No more cards to draw. Round ends!");
                    endRound(null); // No winner, round ends
                    return;
                }
                const topDiscardCard = discardPile.pop();
                deck = shuffleDeck(discardPile);
                discardPile = [topDiscardCard];
                showOno99Message("Deck reshuffled from discard pile!");
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
        players.player.hand.sort((a, b) => a.value - b.value); // Sort player hand by value

        players.player.hand.forEach((card, index) => {
            const cardElement = createCardElement(card, index);
            if (currentPlayerIndex === playerOrder.indexOf('player')) {
                // Player's turn, cards are clickable if they can be played
                if (isValidPlay(card, runningTotal)) {
                    cardElement.classList.add('playable');
                } else {
                    cardElement.classList.add('disabled');
                }
            } else {
                cardElement.classList.add('disabled'); // Not player's turn
            }
            playerHandElement.appendChild(cardElement);
        });

        playerCardCountElement.textContent = players.player.hand.length;
        botCardCountElement.textContent = players.bot.hand.length;
    }

    /**
     * Creates an HTML element for a card.
     */
    function createCardElement(card, index = -1) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.dataset.cardId = card.id; // Unique ID
        if (index !== -1) {
            cardElement.dataset.index = index; // Store hand index
        }

        // Apply specific styling classes
        if (card.color === 'number') {
            cardElement.classList.add('ono99-number-card');
        } else if (card.color === 'special') {
            cardElement.classList.add('ono99-special-card');
        }

        // Card content
        let cardContent = '';
        if (card.type === CARD_TYPES.NUMBER) {
            cardContent = `<span class="card-value">${card.rank}</span>`;
        } else {
            // Special cards
            cardContent = `<span class="card-wild-text">${card.rank.replace(' ', '<br>')}</span>`; // Wrap text for display
            if (card.type === CARD_TYPES.MINUS_10) {
                 cardContent = `<span class="card-value">-10</span>`;
            }
        }
        cardElement.innerHTML = cardContent;
        return cardElement;
    }

    /**
     * Renders the top card of the discard pile and updates the running total.
     */
    function renderDiscardPile() {
        discardPileElement.innerHTML = '';
        if (discardPile.length > 0) {
            const topCard = discardPile[discardPile.length - 1];
            const cardElement = createCardElement(topCard);
            cardElement.classList.remove('playable', 'disabled'); // not playable directly
            cardElement.classList.add('static-card'); // To prevent hover effects
            discardPileElement.appendChild(cardElement);
        } else {
            discardPileElement.innerHTML = '<span class="text-lg">Discard</span>';
            discardPileElement.classList.remove('ono99-number-card', 'ono99-special-card');
            discardPileElement.classList.add('bg-gray-800');
        }
        runningTotalDisplay.textContent = runningTotal;
        if (runningTotal > 85) { // Warning color if close to 99
            runningTotalDisplay.classList.remove('text-blue-300');
            runningTotalDisplay.classList.add('text-red-400');
        } else {
            runningTotalDisplay.classList.remove('text-red-400');
            runningTotalDisplay.classList.add('text-blue-300');
        }
    }

    function showOno99Message(message) {
        ono99MessageBox.textContent = message;
    }

    /**
     * Checks if a card can be played given the current total.
     * @param {object} card - The card to check.
     * @param {number} currentTotal - The current running total.
     * @param {number} [chosenPlay0Value=0] - If it's a Play 0, the value it's being used for.
     * @returns {boolean} True if the card can be played.
     */
    function isValidPlay(card, currentTotal, chosenPlay0Value = 0) {
        if (card.type === CARD_TYPES.PLAY_0) {
            // A Play 0 card can always be played, as its value is chosen to avoid going over 99.
            // It just needs to be played *before* going over 99.
            return true;
        } else if (card.type === CARD_TYPES.MINUS_10) {
            return true; // Minus 10 can always be played.
        } else if (card.type === CARD_TYPES.REVERSE || card.type === CARD_TYPES.SKIP || card.type === CARD_TYPES.PLUS_2) {
            return true; // Action cards can always be played.
        } else { // Number card
            return (currentTotal + card.value) <= 99;
        }
    }

    /**
     * Plays a card and applies its effect.
     * @param {string} playerType - 'player' or 'bot'.
     * @param {object} card - The card being played.
     * @param {number} [chosenPlay0Value] - The value chosen for a Play 0 card.
     */
    function playCard(playerType, card, chosenPlay0Value) {
        // Remove card from hand
        const hand = players[playerType].hand;
        const cardIndex = hand.findIndex(c => c.id === card.id);
        if (cardIndex !== -1) {
            hand.splice(cardIndex, 1);
        }

        // Add to discard pile
        discardPile.push(card);

        let cardEffectValue = card.value; // Default value from CARD_EFFECT_VALUES

        showOno99Message(`${playerType === 'player' ? 'You' : 'Bot'} played a ${card.rank}.`);

        // Apply card effect
        switch (card.type) {
            case CARD_TYPES.NUMBER:
                runningTotal += card.value;
                break;
            case CARD_TYPES.MINUS_10:
                runningTotal = Math.max(0, runningTotal - 10); // Ensure total doesn't go below 0
                break;
            case CARD_TYPES.REVERSE:
                playerOrder.reverse();
                // If 2 players, reversing twice is same as skipping
                if (playerOrder.length === 2) {
                     currentPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length; // Skip current player
                     showOno99Message("Direction reversed! It's still the same player's turn (with 2 players).");
                } else {
                     showOno99Message("Direction reversed!");
                }
                break;
            case CARD_TYPES.SKIP:
                players[playerOrder[(currentPlayerIndex + 1) % playerOrder.length]].isSkipped = true;
                showOno99Message("Next player is skipped!");
                break;
            case CARD_TYPES.PLUS_2:
                cardsToPlayNext = 2;
                showOno99Message("Next player must play 2 cards or draw 2!");
                break;
            case CARD_TYPES.PLAY_0:
                if (chosenPlay0Value !== undefined && chosenPlay0Value !== null) {
                    runningTotal += chosenPlay0Value;
                    cardEffectValue = chosenPlay0Value; // For message display
                    showOno99Message(`${playerType === 'player' ? 'You' : 'Bot'} played a Play 0 for ${chosenPlay0Value}.`);
                } else {
                    // This should ideally not happen if modal/bot logic works correctly
                    console.error("Play 0 card played without a chosen value.");
                }
                break;
        }

        renderHands();
        renderDiscardPile();

        // Check for round end
        if (runningTotal > 99) {
            showOno99Message(`Total went over 99! (${runningTotal})`);
            endRound(playerType === 'player' ? 'bot' : 'player'); // The other player wins
        } else {
            setTimeout(() => {
                nextTurn();
            }, 700); // Small delay before next turn
        }
    }

    /**
     * Advances to the next player's turn.
     */
    function nextTurn() {
        if (botThinkingTimeout) {
            clearTimeout(botThinkingTimeout);
            botThinkingTimeout = null;
        }

        currentPlayerIndex = (currentPlayerIndex + 1) % playerOrder.length;
        const currentPlayerId = playerOrder[currentPlayerIndex];
        const currentPlayerObj = players[currentPlayerId];

        // Check if player is skipped
        if (currentPlayerObj.isSkipped) {
            showOno99Message(`${currentPlayerId === 'player' ? 'You' : 'Bot'} are skipped!`);
            currentPlayerObj.isSkipped = false; // Reset for next round
            setTimeout(nextTurn, 1000); // Skip again
            return;
        }

        // Update current player highlight
        if (currentPlayerId === 'player') {
            playerInfo.classList.add('current-player');
            botInfo.classList.remove('current-player');
        } else {
            botInfo.classList.add('current-player');
            playerInfo.classList.remove('current-player');
        }

        showOno99Message(`${currentPlayerId === 'player' ? 'Your' : 'Bot\'s'} turn! Current total: ${runningTotal}`);
        renderHands(); // Re-render hands to update playable card highlighting

        if (currentPlayerId === 'bot') {
            botThinkingTimeout = setTimeout(botPlay, 1500); // Bot "thinks" for a bit
        } else {
            // If it's player's turn and they need to play multiple cards (due to Plus 2)
            if (cardsToPlayNext > 0) {
                showOno99Message(`You must play ${cardsToPlayNext} more card(s) or draw!`);
                // Player's turn to act on Plus 2.
                // If they can't play, they draw.
                const playableCards = players.player.hand.filter(card => isValidPlay(card, runningTotal));
                if (playableCards.length === 0) {
                    showOno99Message(`You have no playable cards. Drawing ${cardsToPlayNext} cards.`);
                    drawCard('player', cardsToPlayNext);
                    cardsToPlayNext = 0; // Reset
                    setTimeout(nextTurn, 1000); // Pass turn after drawing
                }
            } else {
                showOno99Message(`Your turn. Current total: ${runningTotal}. Play a card.`);
            }
        }
    }

    /**
     * Bot's turn logic.
     */
    function botPlay() {
        const bot = players.bot;
        let cardToPlay = null;
        let chosenPlay0Value = null;

        // If bot needs to play multiple cards (due to Plus 2)
        if (cardsToPlayNext > 0) {
            showOno99Message(`Bot needs to play ${cardsToPlayNext} cards.`);
            let playedCount = 0;
            for (let i = 0; i < cardsToPlayNext; i++) {
                const playableCards = bot.hand.filter(card => isValidPlay(card, runningTotal));
                if (playableCards.length > 0) {
                    cardToPlay = botChooseBestCard(bot.hand, runningTotal);
                    if (cardToPlay.type === CARD_TYPES.PLAY_0) {
                         chosenPlay0Value = botChoosePlay0Value(runningTotal);
                    }
                    playCard('bot', cardToPlay, chosenPlay0Value);
                    playedCount++;
                } else {
                    showOno99Message("Bot has no playable cards. Drawing card.");
                    drawCard('bot', 1); // Bot draws 1 at a time for Plus 2
                }
            }
            cardsToPlayNext = 0; // Reset after bot tried to play/draw
            // After bot's action, check if it went over or if it's next player's turn
            if (runningTotal > 99) {
                 endRound('player');
            } else {
                 setTimeout(nextTurn, 1000);
            }
            return; // Bot's turn ends here after multi-play
        }

        // Normal bot turn:
        // 1. Find a playable card
        const playableCards = bot.hand.filter(card => isValidPlay(card, runningTotal));

        if (playableCards.length > 0) {
            // 2. Choose the best card to play (simple strategy)
            cardToPlay = botChooseBestCard(bot.hand, runningTotal);

            if (cardToPlay.type === CARD_TYPES.PLAY_0) {
                chosenPlay0Value = botChoosePlay0Value(runningTotal);
                playCard('bot', cardToPlay, chosenPlay0Value);
            } else {
                playCard('bot', cardToPlay);
            }
        } else {
            // 3. If no playable cards, draw a card
            showOno99Message("Bot has no playable cards. Drawing card.");
            drawCard('bot', 1);

            // After drawing, check if the drawn card can be played
            const lastDrawnCard = bot.hand[bot.hand.length - 1];
            if (isValidPlay(lastDrawnCard, runningTotal)) {
                showOno99Message(`Bot plays the drawn card: ${lastDrawnCard.rank}`);
                if (lastDrawnCard.type === CARD_TYPES.PLAY_0) {
                     chosenPlay0Value = botChoosePlay0Value(runningTotal);
                }
                playCard('bot', lastDrawnCard, chosenPlay0Value);
            } else {
                // If drawn card also can't be played, bot loses that round
                showOno99Message("Bot drew a card but still can't play without going over 99.");
                endRound('player'); // Player wins if bot can't make a valid move
            }
        }
    }

    /**
     * Bot's strategy for choosing the best card to play.
     * Simple:
     * 1. If it has a Play 0, it will try to use it to get close to 99 without going over.
     * 2. If it has a Minus 10, it will use it to lower the total.
     * 3. Play action cards (Reverse, Skip, Play 2).
     * 4. Play number cards that don't go over 99.
     * 5. If it must play a number, it tries to play the lowest value card possible to avoid going over.
     */
    function botChooseBestCard(hand, currentTotal) {
        const playable = hand.filter(card => isValidPlay(card, currentTotal));

        if (playable.length === 0) {
            return null; // Should ideally not happen if called correctly
        }

        // Prioritize Play 0 to fine-tune the total
        const play0Card = playable.find(card => card.type === CARD_TYPES.PLAY_0);
        if (play0Card) return play0Card;

        // Prioritize Minus 10 to lower the total
        const minus10Card = playable.find(card => card.type === CARD_TYPES.MINUS_10);
        if (minus10Card) return minus10Card;

        // Prioritize action cards
        const actionCard = playable.find(card =>
            card.type === CARD_TYPES.REVERSE ||
            card.type === CARD_TYPES.SKIP ||
            card.type === CARD_TYPES.PLUS_2
        );
        if (actionCard) return actionCard;

        // Play the lowest number card that doesn't exceed 99
        const numberCards = playable.filter(card => card.type === CARD_TYPES.NUMBER);
        if (numberCards.length > 0) {
            numberCards.sort((a, b) => a.value - b.value); // Sort ascending
            // Find lowest card that doesn't exceed 99
            for (const card of numberCards) {
                if ((currentTotal + card.value) <= 99) {
                    return card;
                }
            }
        }

        // Fallback: If somehow only cards that go over 99 are left (should be caught by isValidPlay)
        // Or if only action cards (already handled) are left and no number cards.
        // In a real game, this means the bot loses. For now, return any playable card.
        return playable[0];
    }

    /**
     * Bot's strategy for choosing a value for a Play 0 card.
     * Tries to get the total as close to 99 as possible without going over.
     */
    function botChoosePlay0Value(currentTotal) {
        for (let i = 9; i >= 0; i--) { // Try from 9 down to 0
            if ((currentTotal + i) <= 99) {
                return i;
            }
        }
        return 0; // Should always be able to play for 0
    }

    /**
     * Ends the current round.
     * @param {string|null} roundWinner - The ID of the player who won the round, or null if game stalled.
     */
    function endRound(roundWinner) {
        gameActive = false;
        clearTimeout(botThinkingTimeout); // Stop bot thinking

        if (roundWinner) {
            ono99GameOverMessage.textContent = `${roundWinner === 'player' ? 'You' : 'Bot'} wins the round!`;
            ono99FinalMessage.textContent = `The total went over 99. Final Total: ${runningTotal}`;
        } else {
            ono99GameOverMessage.textContent = "Round Ended!";
            ono99FinalMessage.textContent = "No more cards to draw. It's a draw!";
        }

        ono99GameOverModal.classList.add('active');
        resetGameButton.classList.remove('hidden');
        startGameButton.classList.add('hidden');
    }

    /**
     * Resets the game to its initial state for a fresh start.
     */
    function resetGame() {
        deck = [];
        discardPile = [];
        players.player = { hand: [], score: 0, isSkipped: false };
        players.bot = { hand: [], score: 0, isSkipped: false };
        playerOrder = ['player', 'bot'];
        currentPlayerIndex = 0;
        runningTotal = 0;
        gameActive = false;
        cardsToPlayNext = 0;
        clearTimeout(botThinkingTimeout);
        botThinkingTimeout = null;

        if (playerHandElement) playerHandElement.innerHTML = '';
        if (discardPileElement) {
            discardPileElement.innerHTML = '<span class="text-lg">Discard</span>';
            discardPileElement.classList.remove('ono99-number-card', 'ono99-special-card', 'static-card');
            discardPileElement.classList.add('bg-gray-800');
        }
        if (botCardCountElement) botCardCountElement.textContent = '0';
        if (playerCardCountElement) playerCardCountElement.textContent = '0';
        if (runningTotalDisplay) runningTotalDisplay.textContent = '0';
        if (runningTotalDisplay) runningTotalDisplay.classList.remove('text-red-400');
        if (runningTotalDisplay) runningTotalDisplay.classList.add('text-blue-300');


        showOno99Message("Welcome to Ono 99! Click 'Start Game' to begin.");
        ono99GameOverModal.classList.remove('active');
        ono99Play0Modal.classList.remove('active');
        startGameButton.classList.remove('hidden');
        resetGameButton.classList.add('hidden');
        if (playerInfo) playerInfo.classList.remove('current-player');
        if (botInfo) botInfo.classList.remove('current-player');
    }

    /**
     * Initializes and starts a new game.
     */
    function startGame() {
        resetGame(); // Full reset before starting new one
        deck = shuffleDeck(createOno99Deck());

        // Place initial card on discard pile (must be a number card to start)
        let initialCard = null;
        do {
            initialCard = deck.pop();
            if (initialCard.type === CARD_TYPES.NUMBER) {
                discardPile.push(initialCard);
                runningTotal += initialCard.value;
            } else {
                deck.unshift(initialCard); // Put non-number card back to front of deck
            }
        } while (discardPile.length === 0 || discardPile[0].type !== CARD_TYPES.NUMBER);


        dealInitialCards();
        renderDiscardPile();
        renderHands();

        gameActive = true;
        startGameButton.classList.add('hidden');
        resetGameButton.classList.remove('hidden');

        currentPlayerIndex = Math.floor(Math.random() * playerOrder.length); // Random first player
        showOno99Message(`${playerOrder[currentPlayerIndex] === 'player' ? 'Your' : 'Bot\'s'} turn! Current total: ${runningTotal}`);
        if (playerOrder[currentPlayerIndex] === 'player') {
            playerInfo.classList.add('current-player');
            botInfo.classList.remove('current-player');
        } else {
            botInfo.classList.add('current-player');
            playerInfo.classList.remove('current-player');
            botThinkingTimeout = setTimeout(botPlay, 1500);
        }
    }

    // --- Event Listener Management ---
    let ono99EventListeners = []; // To store references for proper cleanup

    function addOno99EventListener(element, eventType, handler) {
        element.addEventListener(eventType, handler);
        ono99EventListeners.push({ element, eventType, handler });
    }

    function removeOno99EventListeners() {
        ono99EventListeners.forEach(({ element, eventType, handler }) => {
            element.removeEventListener(eventType, handler);
        });
        ono99EventListeners = [];
    }

    // --- Public Initialization Function ---
    window.initOno99Game = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Ono 99 game container not found:', containerId);
            return;
        }

        // Render Ono 99 HTML into the container
        container.innerHTML = ono99GameHTML;

        // Assign DOM elements after they are rendered
        deckElement = document.getElementById('deck');
        discardPileElement = document.getElementById('discard-pile');
        playerHandElement = document.getElementById('player-hand');
        botCardCountElement = document.getElementById('bot-card-count');
        playerCardCountElement = document.getElementById('player-card-count');
        ono99MessageBox = document.getElementById('ono99-message-box');
        startGameButton = document.getElementById('start-game-button');
        resetGameButton = document.getElementById('reset-game-button');
        botInfo = document.getElementById('bot-info');
        playerInfo = document.getElementById('player-info');
        runningTotalDisplay = document.getElementById('running-total-display');

        ono99Play0Modal = document.getElementById('ono99-play0-modal');
        play0ValueInput = document.getElementById('play0-value-input');
        confirmPlay0Button = document.getElementById('confirm-play0-button');

        ono99GameOverModal = document.getElementById('ono99-game-over-modal');
        ono99GameOverMessage = document.getElementById('ono99-game-over-message');
        ono99FinalMessage = document.getElementById('ono99-final-message');
        ono99PlayAgainButton = document.getElementById('ono99-play-again-button');


        // --- Event Listeners for Ono 99 ---

        // Player draws from deck
        addOno99EventListener(deckElement, 'click', () => {
            if (!gameActive || playerOrder[currentPlayerIndex] !== 'player') {
                showOno99Message("It's not your turn!");
                return;
            }
            // If player has cardsToPlayNext, they *must* play one first or acknowledge they draw.
            // Simplified: if no playable cards, they draw.
            const playableCards = players.player.hand.filter(card => isValidPlay(card, runningTotal));
            if (playableCards.length > 0 && cardsToPlayNext === 0) {
                showOno99Message("You have playable cards. Try to play one!");
                return;
            } else if (cardsToPlayNext > 0 && playableCards.length === 0) {
                 showOno99Message(`You must draw ${cardsToPlayNext} cards.`);
                 drawCard('player', cardsToPlayNext);
                 cardsToPlayNext = 0;
                 setTimeout(nextTurn, 1000);
                 return;
            }

            // Normal draw when no cardsToPlayNext or no playable cards to avoid going over 99
            showOno99Message("You drew a card from the deck.");
            drawCard('player', 1);

            // After drawing, if the new card can't be played, player loses
            const lastDrawnCard = players.player.hand[players.player.hand.length - 1];
            if (!isValidPlay(lastDrawnCard, runningTotal)) {
                showOno99Message("You drew a card but still can't play without going over 99!");
                endRound('bot'); // Bot wins if player can't play
            } else {
                 showOno99Message("You drew. Now play a card.");
                 renderHands(); // Update highlighting for the new card
            }
        });

        // Player plays a card from hand
        addOno99EventListener(playerHandElement, 'click', (event) => {
            if (!gameActive || playerOrder[currentPlayerIndex] !== 'player') {
                showOno99Message("It's not your turn!");
                return;
            }

            const cardElement = event.target.closest('.card');
            if (!cardElement || cardElement.classList.contains('disabled')) {
                return; // Not a clickable card or it's disabled
            }

            const cardId = cardElement.dataset.cardId;
            const cardToPlay = players.player.hand.find(c => c.id === cardId);

            if (!cardToPlay) return;

            // Handle Play 0 card specific logic
            if (cardToPlay.type === CARD_TYPES.PLAY_0) {
                play0ValueInput.value = Math.max(0, 99 - runningTotal); // Suggest a smart default
                ono99Play0Modal.classList.add('active');
                addOno99EventListener(confirmPlay0Button, 'click', () => {
                    let chosenValue = parseInt(play0ValueInput.value);
                    if (isNaN(chosenValue) || chosenValue < 0 || chosenValue > 9) {
                        showOno99Message("Please enter a value between 0 and 9.");
                        return;
                    }
                    if ((runningTotal + chosenValue) > 99) {
                        showOno99Message(`Playing ${chosenValue} would exceed 99! Choose a smaller value.`);
                        return;
                    }
                    ono99Play0Modal.classList.remove('active');
                    playCard('player', cardToPlay, chosenValue);
                    cardsToPlayNext = Math.max(0, cardsToPlayNext - 1); // Decrement if a Plus 2 was active
                }, { once: true }); // Ensure event listener is only used once
                return; // Don't proceed with playCard immediately
            }

            // Normal card play
            if (isValidPlay(cardToPlay, runningTotal)) {
                playCard('player', cardToPlay);
                cardsToPlayNext = Math.max(0, cardsToPlayNext - 1); // Decrement if a Plus 2 was active
            } else {
                showOno99Message("That card would make the total go over 99!");
            }
        });


        addOno99EventListener(startGameButton, 'click', startGame);
        addOno99EventListener(resetGameButton, 'click', resetGame);
        addOno99EventListener(ono99PlayAgainButton, 'click', startGame);


        // Initial setup for Ono 99 when loaded
        resetGame();
        // Store a reference to this game instance for cleanup
        window.ono99GameInstance = { destroy: removeOno99EventListeners };
    };

})(); // End of IIFE
