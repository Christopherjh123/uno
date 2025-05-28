// phase10.js

let phase10Deck = [];
let phase10PlayerHand = [];

function createPhase10Deck() {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const values = [...Array(12).keys()].map(i => i + 1); // 1–12
    let deck = [];

    colors.forEach(color => {
        values.forEach(value => {
            deck.push({ color, value });
            if (value !== 1) deck.push({ color, value }); // Two copies of each except 1
        });
    });

    // Wild cards worth 50 points
    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'black', value: 50 });
    }

    return shuffle(deck);
}

function dealPhase10Cards() {
    phase10PlayerHand = phase10Deck.slice(0, 10);
    phase10Deck = phase10Deck.slice(10);
    renderPhase10Hand();
}

function renderPhase10Hand() {
    const handElement = document.getElementById('phase10-player-hand');
    handElement.innerHTML = '';
    phase10PlayerHand.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = `card bg-${card.color} text-white p-2 rounded-lg text-center`;
        cardEl.textContent = card.value;
        handElement.appendChild(cardEl);
    });
}

function drawPhase10Card() {
    if (phase10Deck.length === 0) {
        showMessage("No more cards in deck.");
        return;
    }
    const card = phase10Deck.pop();
    phase10PlayerHand.push(card);
    renderPhase10Hand();
    showMessage(`You drew a ${card.value} ${card.color.toUpperCase()} card.`);
}

function resetPhase10Game() {
    phase10Deck = [];
    phase10PlayerHand = [];
    document.getElementById('phase10-player-hand').innerHTML = '';
    showMessage("Phase 10 game reset!");
}

function startPhase10() {
    phase10Deck = createPhase10Deck();
    dealPhase10Cards();
    showMessage("Your turn! Draw or play cards.");
}

function showMessage(message) {
    document.getElementById('phase10-message').textContent = message;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

document.getElementById('phase10-draw-button')?.addEventListener('click', drawPhase10Card);
document.getElementById('phase10-reset-button')?.addEventListener('click', resetPhase10Game);
