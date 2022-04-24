import { GameDecision } from "./GameDecision.js"
import { sleepSec } from "./Utils.js";
export class Player {
    /**
     * 
     * @param {*} name プレイヤーの名前
     * @param {*} type プレイヤーのタイプ("ai", "user", "house")
     * @param {*} gameType プレイヤーの初期化方法を決定するために使用({"blackjack"})
     * @param {*} chips ゲーム開始に必要なチップ(デフォルトは400)
     */
     constructor(name, type, gameType, chips = 400) {
         this.name = name;           // プレイヤーの名前
         this.type = type;           // プレイヤーのタイプ
         this.gameType = gameType;   // 現在のゲームタイプ
         this.hand = [];             // プレイヤーの手札(Cardクラスの配列)
         this.chips = chips;         // プレイヤーが所持しているチップ
         this.bet = 0;               // 現在のラウンドでベットしているチップ
         this.winAmount = 0;         // 勝利金額(整数)
 
         // プレイヤーのゲームの状態やアクションを表します。
         // ブラックジャックの場合、最初の状態は「betting」です。
         this.gameStatus = (this.type === "house") ? "acting" : "betting";
     }
 
     /*
        ?Number userData : モデル外から渡されるパラメータ。nullになることもあります。
        return GameDecision : 状態を考慮した上で、プレイヤーが行った決定。
 
         このメソッドは、どのようなベットやアクションを取るべきかというプレイヤーの決定を取得します。
         プレイヤーのタイプ、ハンド、チップの状態を読み取り、GameDecisionを返します。
         パラメータにuserData使うことによって、プレイヤーが「user」の場合、このメソッドにユーザーの情報を渡すことができますし、プレイヤーが 「ai」の場合、 userDataがデフォルトとしてnullを使います。
     */
     async promptPlayer(userData) {
         // typeがAIの場合、houseの情報を受け取る
         // ベーシックストラテジーに基づいた戦略を取る
         if (this.type === "ai") {
             await sleepSec(1);
             if (this.gameStatus === "betting") {
                 return new GameDecision("bet", 50);
             }
             
             // houseのオープンカード
             const openCard = userData.hand[0];
 
             // 2枚とも同じsuitか(スプリットケース)
             if (this.hand[0].rank === this.hand[1].rank) {
                 // A, 2, 3, 4, 6, 7, 8, 9の場合
                 if (["A", "2", "3", "4", "6", "7", "8", "9"].includes(this.hand[0].rank)) {
                     return new GameDecision("hit", 0);
                 }
                 // ５の場合 
                 else if (this.hand[0].rank === "5") {
                     if (["A", "10", "J", "Q", "K"].includes(openCard)) {
                         return new GameDecision("hit", 0)
                     } else {
                         return new GameDecision("double", this.bet)
                     }
                 } 
                 // 9の場合
                 else if (this.hand[0].rank === "9") {
                     if (["A", "7", "10", "J", "Q", "K"].includes(openCard)) {
                         return new GameDecision("stand", 0);
                     } else {
                         return new GameDecision("hit", 0);
                     }
                 } 
                 // 10の場合
                 else {
                     return new GameDecision("stand", 0);
                 }
             }
             // Aceを含んでいるか(ソフトハンドケース)
             if (this.hand.some(card => card.rank === "A")) {
                 // 2, 3の場合
                 if (this.hand.some(card => ["2", "3"].includes(card.rank))) {
                     if (["5", "6"].includes(openCard)) {
                         return new GameDecision("double", this.bet);
                     }
                     else {
                         return new GameDecision("hit", 0);
                     }
                 }
                 // 4, 5の場合
                 else if (this.hand.some(card => ["4", "5"].includes(card.rank))) {
                     if (["3", "4", "5", "6"].includes(openCard)) {
                         return new GameDecision("double", this.bet);
                     }
                     else {
                         return new GameDecision("hit", 0);
                     }
                 }
                 // 6の場合
                 else if (this.hand.some(card => card.rank === "6")) {
                     if (["3", "4", "5", "6"].includes(openCard)) {
                         return new GameDecision("double", this.bet);
                     }
                     else {
                         return new GameDecision("hit", 0);
                     }
                 }
                 // 7の場合
                 else if (this.hand.some(card => card.rank === "7")) {
                     if (["3", "4", "5", "6"].includes(openCard)) {
                         return new GameDecision("hit", 0);
                     }
                     else if (["2", "7", "8"].includes(openCard)) {
                         return new GameDecision("stand", 0);
                     }
                     else {
                         return new GameDecision("hit", 0);
                     }
                 }
                 else {
                     return new GameDecision("stand", 0);
                 }
 
             }
             // ハードハンドケース
             if (this.getHandScore() >= 17) return new GameDecision("stand", 0);
             else if (this.getHandScore() <= 8) return new GameDecision("hit", 0);
             else if (this.getHandScore() >= 13) {
                 if (["2", "3", "4", "5", "6"].includes(openCard)) return new GameDecision("stand", 0);
                 return new GameDecision("hit", 0);
             }
             else if (this.getHandScore() === 12) {
                 if (["4", "5", "6"].includes(openCard)) return new GameDecision("stand", 0);
                 else return new GameDecision("hit", 0);
             }
             else if (this.getHandScore() === 11) {
                 if (openCard === "A") return new GameDecision("hit", 0);
                 else return new GameDecision("double", this.bet);
             }
             else if (this.getHandScore() === 10) {
                 if (["A", "10", "J", "Q", "K"].includes(openCard)) return new GameDecision("hit", 0);
                 else return new GameDecision("double", this.bet);
             }
             else if (this.getHandScore() === 9) {
                 if (["3", "4", "5", "6"].includes(openCard)) return new GameDecision("double", this.bet);
                 else return new GameDecision("hit", 0);
             }
             else return new GameDecision("hit", 0);
         }
 
         if (this.type === "user") {
             let bet = this.bet;
             if (this.gameStatus === "hit") {
                 bet = 0;
             }
             return new GameDecision(this.gameStatus, bet);
         }
 
         if (this.type === "house") {
             await sleepSec(2);
             return (this.getHandScore() >= 17) ? new GameDecision("stand", 0) : new GameDecision("hit", 0);
         }
     }
 
    /**
     * 手札の合計を返す
     * 合計が21を超える場合、手札のAceについて合計が21以下になるまで10を引く
     * @returns 手札の合計
     */
     getHandScore() {
         let score = 0;
         let hasAce = false;
         this.hand.forEach(card => {
             if (card.rank === "A") {
                 hasAce = true;
             }
             score += card.getRankNumber();
         });
 
         return (score > 21 && hasAce) ? score - 10 : score;
     }
 }
 