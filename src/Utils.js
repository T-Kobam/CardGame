export const config = {
    "suits": ["H", "D", "C", "S"], // カードの絵柄
    "ranks": ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"], // カードの数字

    // html関連
    "menu": document.getElementById("menu"),
    "game": document.getElementById("game"),
    "action": document.getElementById("action"),
    "betting": document.getElementById("betting"),
    "nextGame": document.getElementById("next-game"),
    "suitsName": { "H": "heart", "D": "diamond", "C": "club", "S": "spade" },
}

export const sleepSec = async (second) => {
    await new Promise(resolve => setTimeout(resolve, second * 1000));
}
