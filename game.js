/* =========================================================
   MAHJONG FORTUNE
   GAME.JS - SISTEM CLUSTER + CASCADE + AUTO SPIN
   ========================================================= */

const COLS = 6;
const ROWS = 4;

const MIN_BET = 400;
const BET_STEP = 400;
const MAX_BET = 1000000;

const START_BALANCE = 100000;
const FREE_SPINS_TOTAL = 20;
const BASE_BET = 400;

const STORAGE = {
    saldo: "mahjong_saldo",
    bet: "mahjong_bet",
    sound: "mahjong_sound",
    normalSpins: "mahjong_normal_spins"
};

/* =========================
   NILAI SIMBOL BET Rp400
   ========================= */

const SYMBOLS = [
    {
        id: "red",
        text: "紅",
        className: "red",
        value: 6000
    },
    {
        id: "green",
        text: "發",
        className: "green",
        value: 2500
    },
    {
        id: "blue",
        text: "藍",
        className: "blue",
        value: 1000
    },
    {
        id: "gold",
        text: "金",
        className: "gold",
        value: 800
    },
    {
        id: "mah1",
        text: "一",
        className: "mah1",
        value: 600
    },
    {
        id: "mah2",
        text: "九",
        className: "mah2",
        value: 600
    }
];

const SCATTER = {
    id: "scatter",
    text: "🐉",
    className: "scatter",
    value: 0
};

/* =========================
   STATE
   ========================= */

let saldo = loadNumber(STORAGE.saldo, START_BALANCE);
let bet = clampBet(loadNumber(STORAGE.bet, MIN_BET));

let soundOn = loadBool(STORAGE.sound, true);
let normalSpins = loadNumber(STORAGE.normalSpins, 0);

let spinning = false;
let freeSpins = 0;

let autoRemaining = 0;
let autoTimer = null;

let currentGrid = [];
let currentMultiplier = 1;
let lastWin = 0;

let audioCtx = null;

/* =========================
   ELEMENT
   ========================= */

const $ = id => document.getElementById(id);

const reelsEl = $("reels");
const saldoEl = $("saldo");
const betEl = $("bet");
const multiplierEl = $("multiplier");

const freeSpinBoxEl = $("freeSpinBox");
const freeSpinCountEl = $("freeSpinCount");

const winMessageEl = $("winMessage");
const winAmountEl = $("winAmount");

const spinButton = $("spinButton");
const autoButton = $("autoButton");
const addMoneyButton = $("addMoney");
const resetButton = $("resetButton");
const soundButton = $("soundButton");

const betMinusButton = $("betMinus");
const betPlusButton = $("betPlus");
const betMaxButton = $("betMax");

/* =========================
   INIT
   ========================= */

init();

function init() {

    injectExtraStyles();

    buildReels();

    bindButtons();

    updateUI();

    showIdleGrid();
}

/* =========================
   STORAGE
   ========================= */

function loadNumber(key, fallback) {

    const value = Number(localStorage.getItem(key));

    return Number.isFinite(value)
        ? value
        : fallback;
}

function loadBool(key, fallback) {

    const value = localStorage.getItem(key);

    if (value === null) {
        return fallback;
    }

    return value === "true";
}

function saveState() {

    localStorage.setItem(
        STORAGE.saldo,
        String(Math.max(0, Math.floor(saldo)))
    );

    localStorage.setItem(
        STORAGE.bet,
        String(bet)
    );

    localStorage.setItem(
        STORAGE.sound,
        String(soundOn)
    );

    localStorage.setItem(
        STORAGE.normalSpins,
        String(normalSpins)
    );
}

function clampBet(value) {

    value = Math.floor(value / BET_STEP) * BET_STEP;

    return Math.max(
        MIN_BET,
        Math.min(MAX_BET, value)
    );
}

/* =========================
   UI
   ========================= */

function updateUI() {

    if (saldoEl) {
        saldoEl.textContent = formatMoney(saldo);
    }

    if (betEl) {
        betEl.textContent = formatMoney(bet);
    }

    if (multiplierEl) {
        multiplierEl.textContent =
            `x${currentMultiplier}`;
    }

    if (freeSpinCountEl) {
        freeSpinCountEl.textContent =
            freeSpins;
    }

    if (freeSpinBoxEl) {

        freeSpinBoxEl.style.display =
            freeSpins > 0
                ? "block"
                : "";
    }

    if (soundButton) {

        soundButton.textContent =
            soundOn
                ? "🔊 SOUND"
                : "🔇 SOUND";
    }

    if (autoButton) {

        if (autoRemaining > 0) {

            autoButton.textContent =
                `STOP (${autoRemaining})`;

            autoButton.classList.add(
                "auto-running"
            );

        } else {

            autoButton.textContent =
                "AUTO SPIN";

            autoButton.classList.remove(
                "auto-running"
            );
        }
    }

    if (spinButton) {

        spinButton.disabled =
            spinning ||
            autoRemaining > 0;
    }
}

function formatMoney(value) {

    return "Rp" +
        Math.floor(value)
            .toLocaleString("id-ID");
}

function showWin(text, amount) {

    if (winMessageEl) {
        winMessageEl.textContent =
            text || "";
    }

    if (winAmountEl) {

        winAmountEl.textContent =
            amount > 0
                ? formatMoney(amount)
                : "";
    }
}

function setMultiplier(value) {

    currentMultiplier = value;

    if (multiplierEl) {

        multiplierEl.textContent =
            `x${value}`;
    }
}

/* =========================
   REEL
   ========================= */

function buildReels() {

    if (!reelsEl) return;

    reelsEl.innerHTML = "";

    for (
        let c = 0;
        c < COLS;
        c++
    ) {

        const reel =
            document.createElement("div");

        reel.className = "reel";

        reel.dataset.col = c;

        const track =
            document.createElement("div");

        track.className = "track";

        track.dataset.col = c;

        reel.appendChild(track);

        reelsEl.appendChild(reel);
    }
}

function showIdleGrid() {

    currentGrid =
        makeRandomGrid(false);

    renderGrid(currentGrid);
}

function renderGrid(grid) {

    const reels =
        [...reelsEl.querySelectorAll(".reel")];

    for (
        let c = 0;
        c < COLS;
        c++
    ) {

        const track =
            reels[c]?.querySelector(".track");

        if (!track) continue;

        track.innerHTML = "";

        for (
            let r = 0;
            r < ROWS;
            r++
        ) {

            track.appendChild(
                createTile(grid[r][c])
            );
        }

        track.style.transform =
            "translateY(0)";
    }
}

function createTile(symbol) {

    const tile =
        document.createElement("div");

    tile.className = "tile";

  
    if (symbol.id === "scatter") {

        tile.classList.add(
            "scatter"
        );
    }

    const inner =
        document.createElement("div");

    inner.className =
        "tile-inner";

    if (symbol.id === "scatter") {

        const dragon =
            document.createElement("div");

        dragon.className =
            "dragon-head";

        dragon.textContent = "🐉";

        inner.appendChild(dragon);

    } const symbolEl =
    document.createElement("img");

symbolEl.className =
    "symbol";

const imageMap = {
    red: "images/red.png",
    green: "images/green.png",
    blue: "images/blue.png",
    mah1: "images/east.png",
    mah2: "images/south.png",
    gold: "images/west.png"
};

symbolEl.src =
    imageMap[symbol.id];

symbolEl.alt =
    symbol.id;

symbolEl.draggable =
    false;

inner.appendChild(
    symbolEl
);
    tile.appendChild(inner);

    tile.dataset.symbolId =
        symbol.id;

    return tile;
}

/* =========================
   RANDOM SYMBOL
   ========================= */

function randomSymbol() {

    return SYMBOLS[
        Math.floor(
            Math.random() *
            SYMBOLS.length
        )
    ];
}

function makeRandomGrid(
    allowScatter = true
) {

    const grid = [];

    for (
        let r = 0;
        r < ROWS;
        r++
    ) {

        grid[r] = [];

        for (
            let c = 0;
            c < COLS;
            c++
        ) {

            let symbol;

            if (
                allowScatter &&
                Math.random() < 0.035
            ) {

                symbol = SCATTER;

            } else {

                symbol =
                    randomSymbol();
            }

            grid[r][c] =
                symbol;
        }
    }

    return grid;
}

/* =========================
   MAIN SPIN
   ========================= */

async function spin(
    isFreeSpin = false
) {

    if (spinning) return;

    if (
        !isFreeSpin &&
        freeSpins <= 0 &&
        saldo < bet
    ) {

        stopAutoSpin();

        showWin(
            "SALDO TIDAK CUKUP",
            0
        );

        playTone(
            140,
            0.15,
            "sawtooth"
        );

        return;
    }

    spinning = true;

    updateUI();

    showWin(
        isFreeSpin
            ? "FREE SPIN"
            : "SPIN",
        0
    );

    setMultiplier(1);

    if (!isFreeSpin) {

        saldo -= bet;

        normalSpins++;

        saveState();

        updateUI();
    }

    playSpinStart();

    const result =
        createSpinResult();

    await animateReels(
        result
    );

    currentGrid =
        result;

    playReelStopSequence();

    await sleep(180);

    const scatterCount =
        countScatters(result);

    if (scatterCount >= 3) {

        await triggerFreeSpinBonus();
    }

    let groups =
        findWinningClusters(result);

    if (groups.length > 0) {

        await processCascades(
            result,
            groups,
            isFreeSpin
        );

    } else {

        showWin(
            scatterCount > 0
                ? `${scatterCount} SCATTER`
                : "BELUM MENANG",
            0
        );
    }

    if (isFreeSpin) {

        freeSpins =
            Math.max(
                0,
                freeSpins - 1
            );

        updateUI();
    }

    saveState();

    spinning = false;

    updateUI();

    if (
        freeSpins > 0 &&
        !autoRemaining
    ) {

        await sleep(450);

        if (!spinning) {

            await spin(true);
        }

        return;
    }

    if (autoRemaining > 0) {

        autoRemaining--;

        updateUI();

        if (autoRemaining > 0) {

            autoTimer =
                setTimeout(
                    () => spin(false),
                    650
                );

        } else {

            updateUI();

            showWin(
                "AUTO SELESAI",
                lastWin
            );
        }
    }
}

/* =========================
   SPIN RESULT
   ========================= */

function createSpinResult() {

    const grid =
        makeRandomGrid(false);

    /*
       Scatter hanya berlaku
       pada spin ini.
       Tidak pernah menumpuk.
    */

    const scatterChance =
        getScatterChance();

    if (
        normalSpins >= 5 &&
        Math.random() <
        scatterChance
    ) {

        const target =
            Math.random() < 0.7
                ? 1
                : 2;

        placeScatters(
            grid,
            target
        );
    }

    /*
       Kemenangan tidak muncul
       setiap spin.
    */

    if (
        normalSpins >= 10 ||
        freeSpins > 0
    ) {

        maybeCreateWinningCluster(
            grid
        );
    }

    return grid;
}

function getScatterChance() {

    if (bet >= 100000) {

        const cycle = 500;

        const pos =
            normalSpins %
            cycle;

        return pos >= 440
            ? 0.22
            : 0.018;
    }

    const cycle = 100;

    const pos =
        normalSpins %
        cycle;

    return pos >= 80
        ? 0.20
        : 0.018;
}

function placeScatters(
    grid,
    count
) {

    const positions = [];

    while (
        positions.length <
        count
    ) {

        const r =
            Math.floor(
                Math.random() *
                ROWS
            );

        const c =
            Math.floor(
                Math.random() *
                COLS
            );

        const key =
            `${r}-${c}`;

        if (
            !positions.includes(key)
        ) {

            positions.push(key);
        }
    }

    for (
        const key of positions
    ) {

        const [r, c] =
            key.split("-")
                .map(Number);

        grid[r][c] =
            SCATTER;
    }
}

/* =========================
   WINNING CLUSTER CREATOR
   ========================= */

function maybeCreateWinningCluster(
    grid
) {

    /*
       Tidak setiap spin menang.
       Ini hanya membuat contoh
       kemenangan yang benar-benar
       dimulai dari kiri.
    */

    if (
        Math.random() > 0.28
    ) {
        return;
    }

    const symbol =
        randomSymbol();

    const startCount =
        3 +
        Math.floor(
            Math.random() * 2
        );

    const starts = [];

    while (
        starts.length <
        startCount
    ) {

        const r =
            Math.floor(
                Math.random() *
                ROWS
            );

        if (
            !starts.includes(r)
        ) {

            starts.push(r);
        }
    }

    for (
        const r of starts
    ) {

        grid[r][0] =
            symbol;
    }

    /*
       Perluasan cluster.
       Hanya bergerak secara
       vertikal/horizontal.
    */

    const visited =
        new Set(
            starts.map(
                r => `${r},0`
            )
        );

    const queue =
        starts.map(
            r => [r, 0]
        );

    while (
        queue.length &&
        Math.random() < 0.82
    ) {

        const [r, c] =
            queue.shift();

        const candidates = [

            [r - 1, c],
            [r + 1, c],
            [r, c + 1]

        ].filter(
            ([rr, cc]) =>
                rr >= 0 &&
                rr < ROWS &&
                cc >= 0 &&
                cc < COLS
        );

        if (
            candidates.length === 0
        ) {
            continue;
        }

        const [
            rr,
            cc
        ] =
            candidates[
                Math.floor(
                    Math.random() *
                    candidates.length
                )
            ];

        const key =
            `${rr},${cc}`;

        if (
            !visited.has(key) &&
            Math.random() < 0.52
        ) {

            visited.add(key);

            grid[rr][cc] =
                symbol;

            queue.push([
                rr,
                cc
            ]);
        }

        if (
            Math.random() < 0.35
        ) {
            break;
        }
    }
}

/* =========================
   REEL ANIMATION
   ========================= */

async function animateReels(
    grid
) {

    const reels =
        [...reelsEl.querySelectorAll(
            ".reel"
        )];

    const promises =
        reels.map(
            (reel, c) => {

                return new Promise(
                    resolve => {

                        const track =
                            reel.querySelector(
                                ".track"
                            );

                        if (!track) {

                            resolve();
                            return;
                        }

                        const fillerCount =
                            10 +
                            c * 2;

                        track.innerHTML =
                            "";

                        for (
                            let i = 0;
                            i < fillerCount;
                            i++
                        ) {

                            track.appendChild(
                                createTile(
                                    randomSymbol()
                                )
                            );
                        }

                        for (
                            let r = 0;
                            r < ROWS;
                            r++
                        ) {

                            track.appendChild(
                                createTile(
                                    grid[r][c]
                                )
                            );
                        }

                        track.style.transition =
                            "none";

                        track.style.transform =
                            "translateY(0)";

                        void track.offsetHeight;

                        const tileHeight =
                            getTileHeight(
                                reel
                            );

                        const target =
                            -(
                                fillerCount *
                                tileHeight
                            );

                        const duration =
                            760 +
                            c * 130;

                        track.style.transition =
                            `transform ${duration}ms cubic-bezier(.12,.72,.18,1)`;

                        setTimeout(
                            () => {

                                track.style.transform =
                                    `translateY(${target}px)`;

                            },
                            40
                        );

                        setTimeout(
                            () => {

                                track.innerHTML =
                                    "";

                                for (
                                    let r = 0;
                                    r < ROWS;
                                    r++
                                ) {

                                    track.appendChild(
                                        createTile(
                                            grid[r][c]
                                        )
                                    );
                                }

                                track.style.transition =
                                    "none";

                                track.style.transform =
                                    "translateY(0)";

                                resolve();

                            },
                            duration + 80
                        );
                    }
                );
            }
        );

    await Promise.all(
        promises
    );
}

function getTileHeight(
    reel
) {

    const tile =
        reel.querySelector(
            ".tile"
        );

    if (!tile) {
        return 70;
    }

    const rect =
        tile.getBoundingClientRect();

    return rect.height || 70;
}

function playReelStopSequence() {

    if (!soundOn) return;

    for (
        let i = 0;
        i < COLS;
        i++
    ) {

        setTimeout(
            () => {

                playTone(
                    170 +
                    i * 25,
                    0.055,
                    "square"
                );

            },
            i * 85
        );
    }
}
/* =========================
   WINNING CLUSTER DETECTION
   ========================= */

/*
   ATURAN UTAMA:

   - Cluster harus dimulai dari
     kolom paling kiri.
   - Minimal 3 simbol sama.
   - Koneksi boleh:
       atas
       bawah
       kiri
       kanan
   - Jika cluster sudah terhubung
     dari kiri, semua simbol yang
     terhubung ikut pecah.
   - Simbol sama yang terpisah
     tidak ikut menang.
*/

function findWinningClusters(grid) {

    const visited =
        new Set();

    const groups = [];

    /*
       Hanya mulai pencarian
       dari kolom 0.
    */

    for (
        let r = 0;
        r < ROWS;
        r++
    ) {

        const symbol =
            grid[r][0];

        if (
            !symbol ||
            symbol.id === "scatter"
        ) {
            continue;
        }

        const key =
            `${r},0`;

        if (
            visited.has(key)
        ) {
            continue;
        }

        const cells =
            floodFill(
                grid,
                r,
                0,
                symbol.id,
                visited
            );

        if (
            cells.length >= 3
        ) {

            groups.push({

                symbolId:
                    symbol.id,

                symbol:
                    getSymbolById(
                        symbol.id
                    ),

                cells:
                    cells

            });
        }
    }

    return groups;
}

/*
   Mencari semua simbol yang
   terhubung secara horizontal
   atau vertikal.
*/

function floodFill(
    grid,
    startR,
    startC,
    symbolId,
    globalVisited
) {

    const cells = [];

    const queue = [
        [startR, startC]
    ];

    const local =
        new Set();

    while (
        queue.length
    ) {

        const [
            r,
            c
        ] =
            queue.shift();

        const key =
            `${r},${c}`;

        if (
            local.has(key)
        ) {
            continue;
        }

        local.add(key);

        if (
            r < 0 ||
            r >= ROWS ||
            c < 0 ||
            c >= COLS
        ) {
            continue;
        }

        const symbol =
            grid[r][c];

        if (
            !symbol ||
            symbol.id !== symbolId
        ) {
            continue;
        }

        cells.push([
            r,
            c
        ]);

        globalVisited.add(
            key
        );

        /*
           Atas
        */
        queue.push([
            r - 1,
            c
        ]);

        /*
           Bawah
        */
        queue.push([
            r + 1,
            c
        ]);

        /*
           Kiri
        */
        queue.push([
            r,
            c - 1
        ]);

        /*
           Kanan
        */
        queue.push([
            r,
            c + 1
        ]);
    }

    return cells;
}

function getSymbolById(id) {

    return SYMBOLS.find(
        symbol =>
            symbol.id === id
    ) || null;
}

/* =========================
   CASCADE
   ========================= */

async function processCascades(
    grid,
    groups,
    isFreeSpin
) {

    let cascadeLevel = 0;

    let totalWin = 0;

    /*
       Maksimal 10 tingkat cascade
       sesuai multiplier:
       x1
       x2
       x3
       x5
       x10
    */

    while (
        groups.length > 0 &&
        cascadeLevel < 10
    ) {

        cascadeLevel++;

        /*
           Gabungkan semua sel
           yang akan pecah.
        */

        const allCells =
            groups.flatMap(
                group =>
                    group.cells
            );

        const uniqueCells = [];

        const seen =
            new Set();

        for (
            const [
                r,
                c
            ]
            of allCells
        ) {

            const key =
                `${r},${c}`;

            if (
                !seen.has(key)
            ) {

                seen.add(key);

                uniqueCells.push([
                    r,
                    c
                ]);
            }
        }

        const multiplier =
            getCascadeMultiplier(
                cascadeLevel
            );

        setMultiplier(
            multiplier
        );

        /*
           Hitung pembayaran.
        */

        const payout =
            calculatePayout(
                groups,
                multiplier
            );

        totalWin += payout;

        /*
           Pecahkan simbol.
        */

        await animateBreaking(
            uniqueCells
        );

        await sleep(120);

        /*
           Masukkan uang ke saldo.
        */

        addBalance(
            payout
        );

        showWin(
            cascadeLevel > 1
                ? `CASCADE x${multiplier}`
                : "WIN",
            totalWin
        );

        /*
           Simbol di atas turun.
           Simbol baru masuk dari atas.
        */

        await collapseGrid(
            grid,
            uniqueCells
        );

        if (soundOn) {
            playBreakSound();
        }

        /*
           Cek lagi setelah cascade.
        */

        groups =
            findWinningClusters(
                grid
            );

        if (
            groups.length > 0
        ) {

            await sleep(180);
        }
    }

    lastWin =
        totalWin;

    /*
       Jackpot hanya jika
       cascade berhasil mencapai x10.
    */

    if (
        cascadeLevel >= 5 &&
        totalWin > 0
    ) {

        const jackpotChance =
            isFreeSpin
                ? (
                    bet >= 100000
                        ? 1
                        : 0.5
                  )
                : 0.5;

        if (
            Math.random() <
            jackpotChance
        ) {

            const jackpot =
                Math.floor(
                    bet * 1000
                );

            saldo +=
                jackpot;

            totalWin +=
                jackpot;

            lastWin =
                totalWin;

            await showJackpot(
                jackpot
            );

            saveState();

            updateUI();
        }
    }

    saveState();

    updateUI();
}

/* =========================
   MULTIPLIER
   ========================= */

function getCascadeMultiplier(
    level
) {

    if (
        level <= 1
    ) {
        return 1;
    }

    if (
        level === 2
    ) {
        return 2;
    }

    if (
        level === 3
    ) {
        return 3;
    }

    if (
        level === 4
    ) {
        return 5;
    }

    return 10;
}

/* =========================
   PAYOUT
   ========================= */

/*
   Nilai dasar:

   Bet Rp400:

   Merah  = Rp6000
   Hijau  = Rp2500
   Biru   = Rp1000
   Emas   = Rp800
   Mahjong1 = Rp600
   Mahjong2 = Rp600

   Rumus:

   harga simbol
   × jumlah simbol pecah
   × (bet / 400)
   × multiplier cascade
*/

function calculatePayout(
    groups,
    multiplier
) {

    let payout = 0;

    for (
        const group of groups
    ) {

        if (
            !group.symbol
        ) {
            continue;
        }

        const scaledValue =
            group.symbol.value *
            (bet / BASE_BET);

        const groupWin =
            scaledValue *
            group.cells.length *
            multiplier;

        payout +=
            Math.floor(
                groupWin
            );
    }

    return Math.max(
        0,
        Math.floor(payout)
    );
}

/* =========================
   BREAK ANIMATION
   ========================= */

async function animateBreaking(
    cells
) {

    const reels =
        [
            ...reelsEl.querySelectorAll(
                ".reel"
            )
        ];

    for (
        const [
            r,
            c
        ]
        of cells
    ) {

        const track =
            reels[c]
                ?.querySelector(
                    ".track"
                );

        const tile =
            track
                ?.children[r];

        if (tile) {

            tile.classList.add(
                "win"
            );

            setTimeout(
                () => {

                    tile.classList.add(
                        "breaking"
                    );

                },
                60
            );
        }
    }

    if (soundOn) {
        playBreakSound();
    }

    await sleep(420);
}

/* =========================
   COLLAPSE / CASCADE
   ========================= */

async function collapseGrid(
    grid,
    cells
) {

    const dead =
        new Set(
            cells.map(
                ([r, c]) =>
                    `${r},${c}`
            )
        );

    /*
       Setiap kolom diproses
       dari bawah ke atas.
    */

    for (
        let c = 0;
        c < COLS;
        c++
    ) {

        const survivors = [];

        /*
           Ambil simbol yang
           tidak pecah.
        */

        for (
            let r = ROWS - 1;
            r >= 0;
            r--
        ) {

            if (
                !dead.has(
                    `${r},${c}`
                )
            ) {

                survivors.push(
                    grid[r][c]
                );
            }
        }

        /*
           Jumlah simbol baru
           yang diperlukan.
        */

        const missing =
            ROWS -
            survivors.length;

        const newSymbols = [];

        for (
            let i = 0;
            i < missing;
            i++
        ) {

            newSymbols.push(
                randomSymbol()
            );
        }

        /*
           Simbol baru berada
           di bagian atas.
        */

        const newColumn = [
            ...newSymbols,
            ...survivors
        ];

        for (
            let r = 0;
            r < ROWS;
            r++
        ) {

            grid[r][c] =
                newColumn[r];
        }
    }

    /*
       Tampilkan grid baru.
    */

    renderGrid(
        grid
    );

    /*
       Animasi jatuh.
    */

    const tiles =
        [
            ...reelsEl.querySelectorAll(
                ".tile"
            )
        ];

    tiles.forEach(
        tile => {

            tile.style.transform =
                "translateY(-35px)";

            tile.style.opacity =
                "0";
        }
    );

    requestAnimationFrame(
        () => {

            tiles.forEach(
                (
                    tile,
                    index
                ) => {

                    setTimeout(
                        () => {

                            tile.style.transition =
                                "transform 280ms cubic-bezier(.2,.8,.25,1), opacity 180ms ease";

                            tile.style.transform =
                                "translateY(0)";

                            tile.style.opacity =
                                "1";

                        },
                        (
                            index %
                            ROWS
                        ) * 25
                    );
                }
            );
        }
    );

    await sleep(
        360
    );
}

/* =========================
   ADD BALANCE
   ========================= */

function addBalance(
    amount
) {

    if (
        !Number.isFinite(
            amount
        )
    ) {
        return;
    }

    if (
        amount <= 0
    ) {
        return;
    }

    saldo +=
        Math.floor(
            amount
        );
}

/* =========================
   SCATTER
   ========================= */

function countScatters(
    grid
) {

    let count = 0;

    for (
        const row of grid
    ) {

        for (
            const symbol of row
        ) {

            if (
                symbol.id ===
                "scatter"
            ) {

                count++;
            }
        }
    }

    return count;
}

/* =========================
   FREE SPIN
   ========================= */

async function triggerFreeSpinBonus() {

    /*
       Scatter hanya dihitung
       dari spin sekarang.
    */

    freeSpins +=
        FREE_SPINS_TOTAL;

    updateUI();

    showFreeSpinOverlay();

    playScatterSound();

    await sleep(
        1500
    );
}

function showFreeSpinOverlay() {

    let overlay =
        document.getElementById(
            "freeSpinOverlay"
        );

    if (!overlay) {

        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "freeSpinOverlay";

        overlay.className =
            "free-spin-overlay";

        overlay.innerHTML = `
            <div class="free-spin-box">

                <div class="free-spin-dragon">
                    🐉
                </div>

                <div class="free-spin-title">
                    FREE SPIN!
                </div>

                <div class="free-spin-count-big">
                    +${FREE_SPINS_TOTAL}
                </div>

                <div class="free-spin-sub">
                    GOLD DRAGON BONUS
                </div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );
    }

    overlay.classList.add(
        "show"
    );

    setTimeout(
        () => {

            overlay.classList.remove(
                "show"
            );

        },
        1300
    );
}

/* =========================
   JACKPOT
   ========================= */

async function showJackpot(
    amount
) {

    let overlay =
        document.getElementById(
            "jackpotOverlay"
        );

    if (!overlay) {

        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "jackpotOverlay";

        overlay.className =
            "jackpot-overlay";

        overlay.innerHTML = `
            <div class="jackpot-box">

                <div class="jackpot-title">
                    JACKPOT!
                </div>

                <div class="jackpot-x">
                    x10
                </div>

                <div class="jackpot-value">
                </div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );
    }

    overlay.querySelector(
        ".jackpot-value"
    ).textContent =
        formatMoney(
            amount
        );

    overlay.classList.add(
        "show"
    );

    playJackpotSound();

    await sleep(
        2200
    );

    overlay.classList.remove(
        "show"
    );
}

/* =========================
   BUTTONS
   ========================= */

function bindButtons() {

    /* SPIN */

    spinButton?.addEventListener(
        "click",
        () => {

            spin(false);

        }
    );

    /* AUTO SPIN */

    autoButton?.addEventListener(
        "click",
        () => {

            if (
                autoRemaining > 0
            ) {

                stopAutoSpin();

                return;
            }

            showAutoMenu();

        }
    );

    /* BET MINUS */

    betMinusButton?.addEventListener(
        "click",
        () => {

            if (spinning) {
                return;
            }

            bet =
                Math.max(
                    MIN_BET,
                    bet - BET_STEP
                );

            saveState();

            updateUI();
        }
    );

    /* BET PLUS */

    betPlusButton?.addEventListener(
        "click",
        () => {

            if (spinning) {
                return;
            }

            bet =
                Math.min(
                    MAX_BET,
                    bet + BET_STEP
                );

            saveState();

            updateUI();
        }
    );

    /* BET MAX */

    betMaxButton?.addEventListener(
        "click",
        () => {

            if (spinning) {
                return;
            }

            bet =
                MAX_BET;

            saveState();

            updateUI();
        }
    );

    /* +10K */

    addMoneyButton?.addEventListener(
        "click",
        () => {

            saldo +=
                10000;

            saveState();

            updateUI();

            showWin(
                "+10K",
                10000
            );
        }
    );

    /* RESET */

    resetButton?.addEventListener(
        "click",
        () => {

            stopAutoSpin();

            saldo =
                START_BALANCE;

            bet =
                MIN_BET;

            normalSpins =
                0;

            freeSpins =
                0;

            currentMultiplier =
                1;

            lastWin =
                0;

            localStorage.removeItem(
                STORAGE.saldo
            );

            localStorage.removeItem(
                STORAGE.bet
            );

            localStorage.removeItem(
                STORAGE.normalSpins
            );

            saveState();

            updateUI();

            showIdleGrid();

            showWin(
                "RESET",
                0
            );
        }
    );

    /* SOUND */

    soundButton?.addEventListener(
        "click",
        () => {

            soundOn =
                !soundOn;

            saveState();

            updateUI();

            if (soundOn) {

                playTone(
                    600,
                    0.08,
                    "sine"
                );
            }
        }
    );
}
/* =========================
   AUTO SPIN MENU
   ========================= */

function showAutoMenu() {

    let menu =
        document.getElementById(
            "autoSpinMenu"
        );

    if (!menu) {

        menu =
            document.createElement(
                "div"
            );

        menu.id =
            "autoSpinMenu";

        menu.className =
            "auto-spin-menu";

        menu.innerHTML = `
            <div class="auto-spin-title">
                PILIH AUTO SPIN
            </div>

            <button data-spins="10">
                10 SPIN
            </button>

            <button data-spins="30">
                30 SPIN
            </button>

            <button data-spins="50">
                50 SPIN
            </button>

            <button data-spins="100">
                100 SPIN
            </button>

            <button data-spins="1000">
                1.000 SPIN
            </button>

            <button class="auto-close">
                BATAL
            </button>
        `;

        document.body.appendChild(
            menu
        );

        menu.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "button"
                    );

                if (!button) {
                    return;
                }

                if (
                    button.classList.contains(
                        "auto-close"
                    )
                ) {

                    hideAutoMenu();

                    return;
                }

                const count =
                    Number(
                        button.dataset.spins
                    );

                if (count > 0) {

                    hideAutoMenu();

                    startAutoSpin(
                        count
                    );
                }
            }
        );
    }

    menu.classList.add(
        "show"
    );
}

function hideAutoMenu() {

    const menu =
        document.getElementById(
            "autoSpinMenu"
        );

    if (menu) {

        menu.classList.remove(
            "show"
        );
    }
}

/* =========================
   START AUTO SPIN
   ========================= */

function startAutoSpin(
    count
) {

    if (
        spinning ||
        autoRemaining > 0
    ) {
        return;
    }

    if (
        saldo < bet
    ) {

        showWin(
            "SALDO TIDAK CUKUP",
            0
        );

        return;
    }

    autoRemaining =
        count;

    updateUI();

    spin(false);
}

/* =========================
   STOP AUTO SPIN
   ========================= */

function stopAutoSpin() {

    autoRemaining =
        0;

    if (autoTimer) {

        clearTimeout(
            autoTimer
        );

        autoTimer =
            null;
    }

    updateUI();
}

/* =========================
   AUDIO
   ========================= */

function getAudioContext() {

    if (!soundOn) {
        return null;
    }

    if (!audioCtx) {

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) {
            return null;
        }

        audioCtx =
            new AudioContextClass();
    }

    if (
        audioCtx.state ===
        "suspended"
    ) {

        audioCtx.resume();
    }

    return audioCtx;
}

function playTone(
    freq,
    duration,
    type = "sine",
    volume = 0.045
) {

    const ctx =
        getAudioContext();

    if (!ctx) {
        return;
    }

    const osc =
        ctx.createOscillator();

    const gain =
        ctx.createGain();

    osc.type =
        type;

    osc.frequency.value =
        freq;

    gain.gain.setValueAtTime(
        volume,
        ctx.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime +
        duration
    );

    osc.connect(
        gain
    );

    gain.connect(
        ctx.destination
    );

    osc.start();

    osc.stop(
        ctx.currentTime +
        duration
    );
}

function playSpinStart() {

    if (!soundOn) {
        return;
    }

    playTone(
        110,
        0.12,
        "sawtooth",
        0.035
    );
}

function playBreakSound() {

    if (!soundOn) {
        return;
    }

    playTone(
        280,
        0.08,
        "square",
        0.035
    );

    setTimeout(
        () => {

            playTone(
                520,
                0.1,
                "sine",
                0.03
            );

        },
        55
    );
}

function playScatterSound() {

    if (!soundOn) {
        return;
    }

    const notes = [
        440,
        660,
        880,
        1100
    ];

    notes.forEach(
        (
            frequency,
            index
        ) => {

            setTimeout(
                () => {

                    playTone(
                        frequency,
                        0.16,
                        "sine",
                        0.055
                    );

                },
                index * 90
            );
        }
    );
}

function playJackpotSound() {

    if (!soundOn) {
        return;
    }

    const notes = [
        330,
        440,
        554,
        659,
        880,
        1100
    ];

    notes.forEach(
        (
            frequency,
            index
        ) => {

            setTimeout(
                () => {

                    playTone(
                        frequency,
                        0.18,
                        "sine",
                        0.065
                    );

                },
                index * 100
            );
        }
    );
}

/* =========================
   UTILITY
   ========================= */

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}

/* =========================
   EXTRA CSS
   ========================= */

function injectExtraStyles() {

    if (
        document.getElementById(
            "gameExtraStyles"
        )
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "gameExtraStyles";

    style.textContent = `

        /* =====================
           AUTO MENU
           ===================== */

        .auto-spin-menu {

            position: fixed;

            left: 50%;
            top: 50%;

            transform:
                translate(
                    -50%,
                    -45%
                )
                scale(.92);

            opacity: 0;

            pointer-events: none;

            z-index: 99999;

            width:
                min(
                    92vw,
                    340px
                );

            padding: 18px;

            border-radius: 20px;

            background:
                linear-gradient(
                    145deg,
                    #64120e,
                    #260504
                );

            border:
                3px solid
                #e8b84c;

            box-shadow:
                0 20px 70px
                rgba(
                    0,
                    0,
                    0,
                    .7
                );

            transition:
                .18s ease;

            text-align: center;
        }

        .auto-spin-menu.show {

            opacity: 1;

            pointer-events: auto;

            transform:
                translate(
                    -50%,
                    -50%
                )
                scale(1);
        }

        .auto-spin-title {

            color:
                #ffd76a;

            font-size:
                20px;

            font-weight:
                900;

            margin-bottom:
                12px;
        }

        .auto-spin-menu button {

            width:
                100%;

            margin:
                5px 0;

            min-height:
                48px;

            border:
                2px solid
                #d99a35;

            border-radius:
                12px;

            background:
                linear-gradient(
                    #a52d1c,
                    #5a100c
                );

            color:
                #fff4c7;

            font-size:
                17px;

            font-weight:
                900;

            cursor:
                pointer;

            touch-action:
                manipulation;
        }

        .auto-spin-menu button:active {

            transform:
                scale(.97);
        }

        .auto-spin-menu
        .auto-close {

            background:
                #333;

            border-color:
                #777;
        }

        .auto-running {

            background:
                linear-gradient(
                    #9d1515,
                    #430606
                )
                !important;
        }

        /* =====================
           FREE SPIN OVERLAY
           ===================== */

        .free-spin-overlay {

            position: fixed;

            inset: 0;

            display: flex;

            align-items: center;

            justify-content: center;

            background:
                rgba(
                    20,
                    0,
                    0,
                    .78
                );

            z-index:
                100000;

            opacity:
                0;

            pointer-events:
                none;

            transition:
                opacity .25s ease;
        }

        .free-spin-overlay.show {

            opacity:
                1;
        }

        .free-spin-box {

            text-align:
                center;

            padding:
                28px 35px;

            border-radius:
                25px;

            border:
                4px solid
                #ffd34e;

            background:
                radial-gradient(
                    circle,
                    #a9300d,
                    #380604
                );

            box-shadow:
                0 0 70px
                rgba(
                    255,
                    205,
                    55,
                    .7
                );

            animation:
                bonusPop
                .65s ease;
        }

        .free-spin-dragon {

            font-size:
                72px;

            filter:
                drop-shadow(
                    0 0 18px
                    gold
                );

            animation:
                dragonGlow
                .8s
                infinite
                alternate;
        }

        .free-spin-title {

            color:
                #ffd84e;

            font-size:
                34px;

            font-weight:
                1000;
        }

        .free-spin-count-big {

            color:
                white;

            font-size:
                48px;

            font-weight:
                1000;

            margin-top:
                4px;
        }

        .free-spin-sub {

            color:
                #ffe9a0;

            font-weight:
                800;

            letter-spacing:
                2px;
        }

        /* =====================
           JACKPOT
           ===================== */

        .jackpot-overlay {

            position: fixed;

            inset: 0;

            display: flex;

            align-items: center;

            justify-content: center;

            background:
                rgba(
                    0,
                    0,
                    0,
                    .82
                );

            z-index:
                100001;

            opacity:
                0;

            pointer-events:
                none;

            transition:
                opacity .2s ease;
        }

        .jackpot-overlay.show {

            opacity:
                1;
        }

        .jackpot-box {

            min-width:
                min(
                    90vw,
                    460px
                );

            padding:
                35px;

            text-align:
                center;

            border-radius:
                28px;

            border:
                5px solid
                #ffd43b;

            background:
                radial-gradient(
                    circle,
                    #b2380c,
                    #390000
                );

            box-shadow:
                0 0 100px
                rgba(
                    255,
                    210,
                    55,
                    .85
                );

            animation:
                jackpotPop
                .8s
                cubic-bezier(
                    .2,
                    1.5,
                    .3,
                    1
                );
        }

        .jackpot-title {

            color:
                #ffe45d;

            font-size:
                44px;

            font-weight:
                1000;

            text-shadow:
                0 0 18px
                #ffb000;
        }

        .jackpot-x {

            color:
                white;

            font-size:
                30px;

            font-weight:
                1000;

            margin:
                8px;
        }

        .jackpot-value {

            color:
                white;

            font-size:
                clamp(
                    28px,
                    7vw,
                    58px
                );

            font-weight:
                1000;
        }

        /* =====================
           ANIMATION
           ===================== */

        @keyframes bonusPop {

            from {

                transform:
                    scale(.5)
                    rotate(-5deg);

                opacity:
                    0;
            }

            to {

                transform:
                    scale(1)
                    rotate(0);

                opacity:
                    1;
            }
        }

        @keyframes dragonGlow {

            from {

                transform:
                    scale(1);

                filter:
                    drop-shadow(
                        0 0 10px
                        gold
                    );
            }

            to {

                transform:
                    scale(1.12);

                filter:
                    drop-shadow(
                        0 0 35px
                        gold
                    );
            }
        }

        @keyframes jackpotPop {

            0% {

                transform:
                    scale(.3)
                    rotate(-8deg);
            }

            65% {

                transform:
                    scale(1.12)
                    rotate(2deg);
            }

            100% {

                transform:
                    scale(1)
                    rotate(0);
            }
        }

        /* =====================
           HP
           ===================== */

        @media (
            max-width: 600px
        ) {

            .auto-spin-menu {

                width:
                    86vw;
            }

            .auto-spin-menu
            button {

                min-height:
                    52px;
            }

            .free-spin-box {

                padding:
                    24px 20px;
            }

            .free-spin-title {

                font-size:
                    28px;
            }

            .jackpot-box {

                min-width:
                    80vw;

                padding:
                    26px 18px;
            }
        }
    `;

    document.head.appendChild(
        style
    );
}