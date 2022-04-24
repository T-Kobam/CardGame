import { Table } from "./src/Table.js"
import { sleepSec, config } from "./src/Utils.js"

let table;
document.getElementById("start-btn").addEventListener("click", async () => {
    const gameType = document.getElementById("game-type").value;
    if (gameType !== "blackjack") {
        alert("選択されたゲームは現在ご利用できません");
        return;
    }

    const name = document.getElementById("name").value;
    if (name.length === 0) {
        alert("名前を入力してください");
        return;
    }

    // nameを取得して、Tableインスタンスを作成
    const userType = (name.toLowerCase() === "ai") ? "ai" : "user";
    const userName = (name.toLowerCase() === "ai") ? "AI-2" : name;
    table = new Table(gameType, userName, userType);

    // 画面にプレイヤーを表示
    // TODO: Tableインスタンスからプレイヤーの名前の配列を取得したい
    table.players.forEach(player => createUserHandDiv(player));

    // 画面を切り替える
    displayNone(config.menu);
    displayBlock(config.game);

    await renderTable(table);
});

const renderTable = async (table) => {
    const onPlayer = table.getTurnPlayer();

    if (table.gamePhase === "betting") {
        document.getElementById(`${onPlayer.name}-name`).classList.add("border", "border-warning");
        await table.haveTurn(onPlayer);
        changeStatus(onPlayer);
        document.getElementById(`${onPlayer.name}-name`).classList.remove("border", "border-warning");

        if (table.getTurnPlayer().type === "ai") {
            await renderTable(table);
        } else {
            document.getElementById(`${table.getTurnPlayer().name}-name`).classList.add("border", "border-warning");
            displayBlock(config.betting);
        }
    }
    else if (table.gamePhase === "dealCards") {
        document.getElementById("house-status").innerHTML = "Waiting for actions";

        // forEachはPromiseを持たないためfor loopを使用
        for(const player of table.players) {
            await sleepSec(0.5);
            for (const card of player.hand) {
                await sleepSec(0.2);
                createCardDiv(player.name, card);
            }
        }

        await sleepSec(0.5);
        createCardDiv(table.house.name, table.house.hand[0]);
        await sleepSec(0.2);
        createCardDiv(table.house.name, table.house.hand[1], false);

        await table.haveTurn();
        await renderTable(table);
    } 
    else if (table.gamePhase === "acting") {
        if (!table.allPlayerActionsResolved()) {
            document.getElementById(`${onPlayer.name}-name`).classList.add("border", "border-warning");
        }
        await table.haveTurn(onPlayer);

        if (onPlayer.gameStatus !== "roundOver" && onPlayer.type === "ai") {
            await sleepSec(0.5);
            createCardDiv(onPlayer.name, onPlayer.hand[onPlayer.hand.length - 1]);
        }

        if (onPlayer.type === "user") {
            await sleepSec(0.5);
            resetCardDiv(onPlayer.name);
            onPlayer.hand.forEach((it) => createCardDiv(onPlayer.name, it));    

        }

        if (table.allPlayerActionsResolved()) {
            await sleepSec(0.8);
            resetCardDiv(table.house.name);
            table.house.hand.forEach((it) => createCardDiv(table.house.name, it));    
        }
        changeStatus(onPlayer);
        document.getElementById(`${onPlayer.name}-name`).classList.remove("border", "border-warning");

        if (table.getTurnPlayer().type === "ai") {
            displayNone(config.action);
            await renderTable(table);
        } else {
            document.getElementById(`${table.getTurnPlayer().name}-name`).classList.add("border", "border-warning");
            displayBlock(config.action);
        }
    }
    else if (table.gamePhase === "evaluating") {
        await table.haveTurn();
        table.players.forEach(player => changeStatus(player));
        await renderTable(table);
    }
    else if (table.gamePhase === "roundOver") {
        displayBlock(config.nextGame);
        betValue.forEach(bet => bet.value = 0);
        return;
    }

    // await renderTable(table);
};

// ベットの枚数調整ボタン
const betValue = document.querySelectorAll(".bet");
const plusBtn = document.querySelectorAll(".plus");
const minusBtn = document.querySelectorAll(".minus");
for (let i = 0; i < betValue.length; i++) {
    plusBtn[i].addEventListener("click", () => {
        const value = parseInt(betValue[i].value) + 1;
        betValue[i].value = value;
    });
    minusBtn[i].addEventListener("click", () => {
        const value = parseInt(betValue[i].value) - 1;
        betValue[i].value = (value < 0) ? 0 : value;
    });
}

// Betボタンが押下されたことによるリスナー作成
document.getElementById("bet-btn").addEventListener("click", async () => {
    let totalBet = 0;
    [5, 10, 20, 50].forEach((num, index) => {
        totalBet += betValue[index].value * num;
    });

    if (totalBet <= 0) {
        alert("ベットしてください");
        return;
    }

    displayNone(config.betting);
    table.players[1].bet = totalBet;

    await renderTable(table);
});

/**
 * 画面を非表示にする
 * @param element
 */
 const displayNone = (element) => {
    element.classList.add("d-none");
    element.classList.remove("d-block");
};

/**
 * 画面を表示する
 * @param element 
 */
const displayBlock = (element) => {
    element.classList.remove("d-none");
    element.classList.add("d-block");
};

/**
 * プレイヤーの手札、ステータスをusers-handの要素に追加する
 * @param player.name 
 */
// TODO: nameではなくPlayerインスタンスを使用する
const createUserHandDiv = (player) => {
    const usersHandDiv = document.getElementById("users-hand");
    usersHandDiv.innerHTML +=
    `
    <div class="col-md-auto mx-2">
        <div class="row justify-content-center">
            <div class="col-md-8" id="${player.name}-name">
                <h2 class="text-white text-center">${player.name}</h2>
            </div>
            <div class="w-100"></div>
            <div>
                <p class="text-white">Status: <span id="${player.name}-status">${player.gameStatus}</span> Bet: <span id="${player.name}-bet">${player.bet}</span> Chip: <span id="${player.name}-chips">${player.chips}</span></p>
            </div>
        </div>
    
        <div class="row justify-content-center" id="${player.name}-hand"></div>
    `;
};

const createCardDiv = (name, card, isShow = true) => {
    const userHandDiv = document.getElementById(`${name}-hand`);
    if (isShow) {
        userHandDiv.innerHTML +=
        `
        <div class="card mx-1" style="width: 5rem; height: 7rem;">
            <img class="card-img-top img-fluid w-50 mx-auto" src="images/suits/${config.suitsName[card.suit]}.png" alt="Card image cap">
            <div class="card-body">
                <h2 class="card-title text-center">${card.rank}</h2>
            </div>
        </div>
        `;
    } else {
        userHandDiv.innerHTML +=
        `
        <div class="card mx-1" style="width: 5rem; height: 7rem;">
            <div class="card-body">
                <h2 class="card-title text-center">?</h2>
            </div>
        </div>
        `;
        
    }
};

const resetCardDiv = (name) => {
    document.getElementById(`${name}-hand`).innerHTML = "";
}

const changeStatus = (player) => {
    document.getElementById(`${player.name}-status`).innerHTML = `${player.gameStatus}`;
    document.getElementById(`${player.name}-bet`).innerHTML = `${player.bet}`;
    document.getElementById(`${player.name}-chips`).innerHTML = `${player.chips}`;
}

config.nextGame.addEventListener("click", () => {
    displayNone(config.nextGame);
    table.players.forEach(player => resetCardDiv(player.name));
    resetCardDiv(table.house.name);
    table.gamePhase = "betting";
    renderTable(table);
});

document.getElementById("surrender").addEventListener("click", async () => {
    table.players[1].gameStatus = "surrender";
    await renderTable(table);
})

document.getElementById("stand").addEventListener("click", async () => {
    table.players[1].gameStatus = "stand";
    await renderTable(table);
})

document.getElementById("hit").addEventListener("click", async () => {
    table.players[1].gameStatus = "hit";
    await renderTable(table);
})

document.getElementById("double").addEventListener("click", async () => {
    table.players[1].gameStatus = "double";
    await renderTable(table);
})