/* =========================================================
   MAHJONG FORTUNE
   REBUILD FROM ZERO
   6 COLUMNS x 4 ROWS
   VIRTUAL MONEY ONLY
========================================================= */

const COLS = 6;
const ROWS = 4;

const MIN_BET = 400;
const BET_STEP = 400;
const MAX_BET = 1000000;

const START_BALANCE = 100000;

const FREE_SPINS_TOTAL = 20;

const SYMBOLS = [
    { id: "wan1", text: "一", className: "red" },
    { id: "wan2", text: "二", className: "red" },
    { id: "wan3", text: "三", className: "red" },
    { id: "wan4", text: "四", className: "red" },

    { id: "bamboo1", text: "🀐", className: "green" },
    { id: "bamboo2", text: "🀑", className: "green" },
    { id: "bamboo3", text: "🀒", className: "green" },

    { id: "dot1", text: "●", className: "blue" },
    { id: "dot2", text: "●●", className: "blue" },
    { id: "dot3", text: "●●●", className: "blue" },

    { id: "dragon-red", text: "中", className: "red" },
    { id: "dragon-green", text: "發", className: "green" },
    { id: "dragon-white", text: "白", className: "blue" }
];

/* =========================================================
   STATE
========================================================= */

let saldo = START_BALANCE;
let bet = MIN_BET;

let spinning = false;
let autoSpin = false;
let autoTimer = null;

let soundOn = true;

let freeSpins = 0;
let normalSpins = 0;

let scatterTarget = null;

let currentMultiplier = 1;

let currentResult = [];


/* =========================================================
   ELEMENTS
========================================================= */

const reelsContainer = document.getElementById("reels");

const saldoEl = document.getElementById("saldo");
const betEl = document.getElementById("bet");
const multiplierEl = document.getElementById("multiplier");

const spinButton = document.getElementById("spinButton");

const betMinus = document.getElementById("betMinus");
const betPlus = document.getElementById("betPlus");
const betMax = document.getElementById("betMax");

const autoButton = document.getElementById("autoButton");

const addMoney = document.getElementById("addMoney");
const resetButton = document.getElementById("resetButton");
const soundButton = document.getElementById("soundButton");

const messageEl = document.getElementById("winMessage");
const winAmountEl = document.getElementById("winAmount");

const freeSpinBox = document.getElementById("freeSpinBox");
const freeSpinCountEl = document.getElementById("freeSpinCount");


/* =========================================================
   FORMAT RUPIAH
========================================================= */

function rupiah(value) {

    return "Rp" + Math.max(0, Math.round(value))
        .toLocaleString("id-ID");
}


/* =========================================================
   UPDATE UI
========================================================= */

function updateUI() {

    saldoEl.textContent = rupiah(saldo);
    betEl.textContent = rupiah(bet);

    multiplierEl.textContent = "x" + currentMultiplier;

    if (freeSpins > 0) {

        freeSpinBox.classList.add("active");

        freeSpinCountEl.textContent = freeSpins;

    } else {

        freeSpinBox.classList.remove("active");
    }

    spinButton.disabled = spinning;

    betMinus.disabled = spinning || freeSpins > 0;
    betPlus.disabled = spinning || freeSpins > 0;
    betMax.disabled = spinning || freeSpins > 0;
}


/* =========================================================
   RANDOM SYMBOL
========================================================= */

function randomSymbol() {

    return SYMBOLS[
        Math.floor(Math.random() * SYMBOLS.length)
    ];
}


/* =========================================================
   CREATE TILE
========================================================= */

function createTile(symbol) {

    const tile = document.createElement("div");

    tile.className = "tile";

    const inner = document.createElement("div");

    inner.className = "tile-inner";

    if (symbol.id === "scatter") {

        tile.classList.add("scatter");

        const dragon = document.createElement("div");

        dragon.className = "dragon-head";

        dragon.textContent = "龍";

        inner.appendChild(dragon);

    } else {

        const symbolEl = document.createElement("div");

        symbolEl.className =
            "symbol " + symbol.className;

        symbolEl.textContent = symbol.text;

        inner.appendChild(symbolEl);
    }

    tile.appendChild(inner);

    tile.dataset.symbol = symbol.id;

    return tile;
}


/* =========================================================
   CREATE REELS
========================================================= */

function createReels() {

    reelsContainer.innerHTML = "";

    for (let col = 0; col < COLS; col++) {

        const reel = document.createElement("div");

        reel.className = "reel";

        const track = document.createElement("div");

        track.className = "track";

        for (let row = 0; row < ROWS; row++) {

            track.appendChild(
                createTile(randomSymbol())
            );
        }

        reel.appendChild(track);

        reelsContainer.appendChild(reel);
    }
}


/* =========================================================
   BUILD RESULT
========================================================= */

function createNormalResult() {

    const result = [];

    for (let i = 0; i < COLS * ROWS; i++) {

        result.push(randomSymbol());
    }

    return result;
}


/* =========================================================
   SCATTER TARGET
========================================================= */

function getTargetRange() {

    if (bet >= 100000) {

        return {
            min: 450,
            max: 550
        };
    }

    return {
        min: 50,
        max: 150
    };
}


function createScatterTarget() {

    const range = getTargetRange();

    return normalSpins +
        Math.floor(
            Math.random() *
            (range.max - range.min + 1)
        ) +
        range.min;
}


/* =========================================================
   SCATTER COUNT
========================================================= */

function decideScatterCount() {

    /*
       Scatter hanya aktif mulai spin ke-5.
    */

    if (normalSpins < 5) {
        return 0;
    }

    if (scatterTarget === null) {
        scatterTarget = createScatterTarget();
    }

    const remaining = scatterTarget - normalSpins;

    /*
       Jauh dari target:
       scatter sangat jarang.
    */

    if (remaining > 50) {

        const chance = Math.random();

        if (chance < 0.025) return 1;
        if (chance < 0.040) return 2;

        return 0;
    }

    /*
       Mulai mendekati target.
    */

    if (remaining > 10) {

        const chance = Math.random();

        if (chance < 0.10) return 1;
        if (chance < 0.18) return 2;

        return 0;
    }

    /*
       Sudah sangat dekat target.
    */

    if (remaining > 0) {

        const chance = Math.random();

        if (chance < 0.35) return 1;
        if (chance < 0.55) return 2;
        if (chance < 0.72) return 3;

        return 0;
    }

    /*
       Target sudah lewat.
       Memastikan fitur tetap bisa keluar,
       tetapi tidak selalu langsung.
    */

    const chance = Math.random();

    if (chance < 0.72) return 3;
    if (chance < 0.88) return 2;

    return 1;
}


/* =========================================================
   INSERT SCATTER
========================================================= */

function applyScatter(result, scatterCount) {

    if (scatterCount <= 0) {
        return result;
    }

    const positions = [];

    while (positions.length < scatterCount) {

        const pos =
            Math.floor(
                Math.random() * result.length
            );

        if (!positions.includes(pos)) {
            positions.push(pos);
        }
    }

    positions.forEach(pos => {

        result[pos] = {
            id: "scatter",
            text: "龍",
            className: "gold"
        };
    });

    return result;
}


/* =========================================================
   PREPARE REEL TRACK
========================================================= */

function prepareReels(result) {

    const reels = [...document.querySelectorAll(".reel")];

    reels.forEach((reel, col) => {

        const track = reel.querySelector(".track");

        track.style.transition = "none";
        track.style.transform = "translateY(0)";

        track.innerHTML = "";

        /*
           Extra symbols untuk menciptakan
           gerakan reel panjang.
        */

        const extraRows = 14 + col * 2;

        for (let i = 0; i < extraRows; i++) {

            track.appendChild(
                createTile(randomSymbol())
            );
        }

        /*
           Hasil akhir 4 simbol.
        */

        for (let row = 0; row < ROWS; row++) {

            const symbol =
                result[col * ROWS + row];

            track.appendChild(
                createTile(symbol)
            );
        }
    });
}


/* =========================================================
   SPIN ANIMATION
========================================================= */

function animateReels() {

    const reels = [...document.querySelectorAll(".reel")];

    const promises = reels.map((reel, index) => {

        return new Promise(resolve => {

            const track = reel.querySelector(".track");

            const tile =
                track.querySelector(".tile");

            const tileHeight =
                tile.getBoundingClientRect().height;

            const totalTiles =
                track.children.length;

            const finalPosition =
                (totalTiles - ROWS) * tileHeight;

            const duration =
                850 + index * 130;

            requestAnimationFrame(() => {

                track.style.transition =
                    `transform ${duration}ms cubic-bezier(.12,.72,.18,1)`;

                track.style.transform =
                    `translateY(-${finalPosition}px)`;
            });

            setTimeout(resolve, duration + 30);
        });
    });

    return Promise.all(promises);
}


/* =========================================================
   FINALIZE REELS
========================================================= */

function finalizeReels(result) {

    const reels = [...document.querySelectorAll(".reel")];

    reels.forEach((reel, col) => {

        const track = reel.querySelector(".track");

        track.style.transition = "none";
        track.style.transform = "translateY(0)";

        track.innerHTML = "";

        for (let row = 0; row < ROWS; row++) {

            track.appendChild(
                createTile(
                    result[col * ROWS + row]
                )
            );
        }
    });
}


/* =========================================================
   GET VISIBLE TILES
========================================================= */

function getVisibleTiles() {

    return [...document.querySelectorAll(
        ".reel .track .tile"
    )];
}


/* =========================================================
   FIND WIN
========================================================= */

function findWinningPositions(result) {

    const counts = {};

    result.forEach((symbol, index) => {

        if (symbol.id === "scatter") {
            return;
        }

        if (!counts[symbol.id]) {
            counts[symbol.id] = [];
        }

        counts[symbol.id].push(index);
    });

    /*
       Minimal 3 simbol sama
       untuk memulai cascade.
    */

    const candidates =
        Object.values(counts)
            .filter(list => list.length >= 3);

    if (candidates.length === 0) {
        return [];
    }

    /*
       Ambil kombinasi terbesar.
    */

    candidates.sort(
        (a, b) => b.length - a.length
    );

    return candidates[0];
}


/* =========================================================
   HIGHLIGHT WIN
========================================================= */

function highlightWin(positions) {

    const tiles = getVisibleTiles();

    positions.forEach(index => {

        if (tiles[index]) {

            tiles[index].classList.add("win");
        }
    });
}


/* =========================================================
   BREAK WINNING SYMBOLS
========================================================= */

async function breakWinningSymbols(positions) {

    const tiles = getVisibleTiles();

    positions.forEach(index => {

        if (tiles[index]) {

            tiles[index].classList.remove("win");

            tiles[index].classList.add("breaking");
        }
    });

    await wait(550);
}


/* =========================================================
   GENERATE CASCADE RESULT
========================================================= */

function generateCascadeResult(
    result,
    winningPositions,
    winningSymbolId
) {

    const newResult = [...result];

    winningPositions.forEach(position => {

        let symbol = randomSymbol();

        /*
           Semakin tinggi cascade,
           peluang simbol pemenang muncul lagi
           semakin besar.

           Ini membuat cascade bisa berlanjut
           sampai multiplier tinggi.
        */

        const repeatChance =
            Math.min(
                0.22 + currentMultiplier * 0.045,
                0.65
            );

        if (
            Math.random() < repeatChance &&
            winningSymbolId !== "scatter"
        ) {

            const found =
                SYMBOLS.find(
                    s => s.id === winningSymbolId
                );

            if (found) {
                symbol = found;
            }
        }

        newResult[position] = symbol;
    });

    return newResult;
}


/* =========================================================
   UPDATE CASCADE VISUAL
========================================================= */

function updateVisibleResult(result) {

    finalizeReels(result);
}


/* =========================================================
   WAIT
========================================================= */

function wait(ms) {

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}


/* =========================================================
   REWARD
========================================================= */

function calculateBigReward() {

    const baseBet = 400;

    return Math.round(
        2500 * (bet / baseBet)
    );
}


function calculateMegaReward() {

    const baseBet = 400;

    return Math.round(
        6000 * (bet / baseBet)
    );
}


function calculateSuperReward() {

    const baseBet = 400;

    return Math.round(
        14000 * (bet / baseBet)
    );
}


function calculateJackpot() {

    return bet * 1000;
}


/* =========================================================
   CASCADE REWARD
========================================================= */

function rewardForCascade(level) {

    /*
       x1 dan x2:
       hadiah kecil.
    */

    if (level < 3) {

        return Math.round(
            bet * (1 + level)
        );
    }

    /*
       x3 = BIG WIN
    */

    if (level === 3) {

        showMessage(
            "🔥 BIG WIN!",
            calculateBigReward()
        );

        return calculateBigReward();
    }

    /*
       x5 = MEGA WIN
    */

    if (level === 5) {

        showMessage(
            "💥 MEGA WIN!",
            calculateMegaReward()
        );

        return calculateMegaReward();
    }

    /*
       x10 = SUPER WIN
       Jackpot dicek setelah mencapai x10.
    */

    if (level >= 10) {

        showMessage(
            "🔥 SUPER WIN!",
            calculateSuperReward()
        );

        return calculateSuperReward();
    }

    return Math.round(
        bet * level
    );
}


/* =========================================================
   JACKPOT CHANCE
========================================================= */

function jackpotChance(isFreeSpin) {

    if (!isFreeSpin) {

        return 0.50;
    }

    /*
       Free Spin:
       bet >= 100.000 = 100%
       bet di bawahnya = 50%
    */

    if (bet >= 100000) {

        return 1.00;
    }

    return 0.50;
}


/* =========================================================
   SHOW MESSAGE
========================================================= */

function showMessage(text, amount = 0) {

    messageEl.textContent = text;

    if (amount > 0) {

        winAmountEl.textContent =
            "+" + rupiah(amount);

    } else {

        winAmountEl.textContent = "";
    }
}


/* =========================================================
   JACKPOT DISPLAY
========================================================= */

async function showJackpot() {

    const overlay =
        document.createElement("div");

    overlay.className =
        "jackpot-overlay";

    const box =
        document.createElement("div");

    box.className =
        "jackpot-box";

    const title =
        document.createElement("div");

    title.className =
        "jackpot-title";

    title.textContent =
        "JACKPOT!";

    const value =
        document.createElement("div");

    value.className =
        "jackpot-value";

    value.textContent =
        rupiah(calculateJackpot());

    box.appendChild(title);
    box.appendChild(value);

    overlay.appendChild(box);

    document.body.appendChild(overlay);

    playSound("jackpot");

    await wait(3000);

    overlay.remove();
}


/* =========================================================
   PROCESS CASCADE
========================================================= */

async function processCascade(
    result,
    isFreeSpin
) {

    let workingResult = [...result];

    let totalReward = 0;

    currentMultiplier = 1;

    updateVisibleResult(workingResult);

    /*
       Maksimal cascade x10.
    */

    for (let level = 1; level <= 10; level++) {

        currentMultiplier = level;

        if (level === 4 ||
            level === 6 ||
            level === 7 ||
            level === 8 ||
            level === 9) {

            /*
               Tampilan multiplier tetap
               pada milestone sebelumnya.
            */

        }

        updateUI();

        const winningPositions =
            findWinningPositions(
                workingResult
            );

        if (winningPositions.length === 0) {

            break;
        }

        const winningSymbolId =
            workingResult[
                winningPositions[0]
            ].id;

        highlightWin(winningPositions);

        await wait(500);

        await breakWinningSymbols(
            winningPositions
        );

        const reward =
            rewardForCascade(level);

        totalReward += reward;

        saldo += reward;

        updateUI();

        /*
           x10 = titik akhir cascade.
        */

        if (level >= 10) {

            const chance =
                jackpotChance(isFreeSpin);

            if (Math.random() < chance) {

                const jackpot =
                    calculateJackpot();

                saldo += jackpot;

                updateUI();

                showMessage(
                    "🐉 JACKPOT!",
                    jackpot
                );

                await showJackpot();

            } else {

                showMessage(
                    "🔥 SUPER WIN!",
                    calculateSuperReward()
                );

                await wait(1000);
            }

            break;
        }

        /*
           Buat simbol baru
           dan lanjutkan cascade.
        */

        workingResult =
            generateCascadeResult(
                workingResult,
                winningPositions,
                winningSymbolId
            );

        updateVisibleResult(
            workingResult
        );

        await wait(350);
    }

    currentMultiplier = 1;

    updateUI();

    return totalReward;
}


/* =========================================================
   SCATTER COUNT
========================================================= */

function countScatter(result) {

    return result.filter(
        symbol => symbol.id === "scatter"
    ).length;
}


/* =========================================================
   FREE SPIN
========================================================= */

async function startFreeSpins() {

    freeSpins = FREE_SPINS_TOTAL;

    scatterTarget = null;

    showMessage(
        "🐉 3 GOLD DRAGON!",
        0
    );

    updateUI();

    await wait(1800);

    while (freeSpins > 0) {

        freeSpins--;

        updateUI();

        await wait(400);

        await performSpin(true);
    }

    showMessage(
        "FREE SPIN SELESAI",
        0
    );

    scatterTarget = null;

    await wait(1200);

    updateUI();
}


/* =========================================================
   MAIN SPIN
========================================================= */

async function performSpin(isFreeSpin = false) {

    if (spinning) {
        return;
    }

    /*
       Normal spin bayar taruhan.
    */

    if (!isFreeSpin) {

        if (saldo < bet) {

            showMessage(
                "SALDO TIDAK CUKUP",
                0
            );

            return;
        }

        saldo -= bet;

        normalSpins++;
    }

    spinning = true;

    updateUI();

    /*
       Tentukan scatter hanya
       untuk spin normal.
    */

    let result =
        createNormalResult();

    if (!isFreeSpin) {

        const scatterCount =
            decideScatterCount();

        result =
            applyScatter(
                result,
                scatterCount
            );
    }

    currentResult = result;

    /*
       Pasang reel.
    */

    prepareReels(result);

    playSound("spin");

    await animateReels();

    finalizeReels(result);

    /*
       Hitung scatter.
    */

    const scatterCount =
        countScatter(result);

    if (scatterCount === 3) {

        showMessage(
            "🐉 3 GOLD DRAGON!",
            0
        );

        playSound("scatter");

        spinning = false;

        updateUI();

        /*
           Free Spin dimulai setelah
           animasi selesai.
        */

        await startFreeSpins();

        return;
    }

    if (scatterCount > 0) {

        showMessage(
            scatterCount === 2
                ? "🐉 2 GOLD DRAGON — HAMPIR!"
                : "🐉 1 GOLD DRAGON",
            0
        );
    }

    /*
       Jalankan cascade.
    */

    await processCascade(
        result,
        isFreeSpin
    );

    spinning = false;

    updateUI();

    /*
       Auto Spin.
    */

    if (
        autoSpin &&
        saldo >= bet &&
        freeSpins === 0
    ) {

        autoTimer = setTimeout(() => {

            performSpin(false);

        }, 900);

    } else if (
        autoSpin &&
        freeSpins > 0
    ) {

        /*
           Free Spin dikontrol
           oleh startFreeSpins().
        */

    } else {

        if (scatterCount === 0) {

            showMessage(
                "SIAP SPIN",
                0
            );
        }
    }
}


/* =========================================================
   SPIN BUTTON
========================================================= */

spinButton.addEventListener(
    "click",
    () => {

        if (!spinning) {

            performSpin(false);
        }
    }
);


/* =========================================================
   BET -
========================================================= */

betMinus.addEventListener(
    "click",
    () => {

        if (spinning || freeSpins > 0) {
            return;
        }

        bet =
            Math.max(
                MIN_BET,
                bet - BET_STEP
            );

        updateUI();
    }
);


/* =========================================================
   BET +
========================================================= */

betPlus.addEventListener(
    "click",
    () => {

        if (spinning || freeSpins > 0) {
            return;
        }

        bet =
            Math.min(
                MAX_BET,
                bet + BET_STEP
            );

        updateUI();
    }
);


/* =========================================================
   MAX BET
========================================================= */

betMax.addEventListener(
    "click",
    () => {

        if (spinning || freeSpins > 0) {
            return;
        }

        const available =
            Math.floor(
                saldo / BET_STEP
            ) * BET_STEP;

        bet =
            Math.max(
                MIN_BET,
                Math.min(
                    MAX_BET,
                    available
                )
            );

        updateUI();
    }
);


/* =========================================================
   AUTO SPIN
========================================================= */

autoButton.addEventListener(
    "click",
    () => {

        autoSpin = !autoSpin;

        autoButton.classList.toggle(
            "active",
            autoSpin
        );

        autoButton.textContent =
            autoSpin
                ? "AUTO ON"
                : "AUTO";

        if (!autoSpin) {

            clearTimeout(autoTimer);

            autoTimer = null;

        } else {

            if (!spinning) {

                performSpin(false);
            }
        }
    }
);


/* =========================================================
   ADD MONEY
========================================================= */

addMoney.addEventListener(
    "click",
    () => {

        saldo += 10000;

        updateUI();

        showMessage(
            "+10K VIRTUAL",
            10000
        );
    }
);


/* =========================================================
   RESET
========================================================= */

resetButton.addEventListener(
    "click",
    () => {

        clearTimeout(autoTimer);

        autoTimer = null;

        autoSpin = false;

        saldo = START_BALANCE;

        bet = MIN_BET;

        spinning = false;

        freeSpins = 0;

        normalSpins = 0;

        scatterTarget = null;

        currentMultiplier = 1;

        autoButton.classList.remove("active");

        autoButton.textContent = "AUTO";

        createReels();

        showMessage(
            "GAME DI-RESET",
            0
        );

        updateUI();
    }
);


/* =========================================================
   SOUND
========================================================= */

let audioContext = null;


function beep(
    frequency,
    duration,
    type = "sine",
    volume = 0.04
) {

    if (!soundOn) {
        return;
    }

    try {

        if (!audioContext) {

            audioContext =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();
        }

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = type;

        oscillator.frequency.value =
            frequency;

        gain.gain.value =
            volume;

        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime +
            duration
        );

        oscillator.stop(
            audioContext.currentTime +
            duration
        );

    } catch (error) {

        console.log(
            "Audio tidak tersedia"
        );
    }
}


function playSound(type) {

    if (!soundOn) {
        return;
    }

    if (type === "spin") {

        beep(120, .08, "square");
        setTimeout(
            () => beep(180, .08, "square"),
            100
        );

    } else if (type === "scatter") {

        beep(500, .15, "sine");
        setTimeout(
            () => beep(700, .15, "sine"),
            160
        );
        setTimeout(
            () => beep(950, .3, "sine"),
            320
        );

    } else if (type === "jackpot") {

        beep(500, .2, "triangle");
        setTimeout(
            () => beep(700, .2, "triangle"),
            220
        );
        setTimeout(
            () => beep(900, .25, "triangle"),
            440
        );
        setTimeout(
            () => beep(1200, .4, "triangle"),
            700
        );
    }
}


soundButton.addEventListener(
    "click",
    () => {

        soundOn = !soundOn;

        soundButton.textContent =
            soundOn
                ? "🔊"
                : "🔇";
    }
);


/* =========================================================
   INITIALIZE
========================================================= */

createReels();

updateUI();

showMessage(
    "SIAP BERMAIN",
    0
);