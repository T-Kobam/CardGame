/**
 * デッキClass
 * カードの集合体
 */
 export class Deck {
    /**
     * ゲームタイプの指定
     * @param {*} gameType {"blackjack"}から選択(ポーカー追加予定)
     */
     constructor(gameType) {
         this.gameType = gameType;   // このデッキが扱うゲームタイプ
         this.cards = [];            // カードの配列
 
         // ゲームタイプによって、カードを初期化
         if (this.gameType === "blackjack") {
             this.resetDeck();
         }
     }
     
    /**
     * Fisher–Yates shuffleアルゴリズムを使用して、カードをシャッフルする
     */
     shuffle() {
         for (let i = this.cards.length - 1; i > 0; i--) {
             const targetIndex = Math.floor(Math.random() * (i + 1));
             [this.cards[i], this.cards[targetIndex]] = [this.cards[targetIndex], this.cards[i]];
         }
     }
 
    /**
     * デッキの状態を初期化する
     */
     resetDeck() {
         // デッキの中身を初期化
         this.cards = [];
 
         // 新しく52枚のカードを挿入
         for (const suit of config.suits) {
             for (const rank of config.ranks) {
                 this.cards.push(new Card(suit, rank));
             }
         }
     }
     
    /**
     * ポップされたカードを返す
     * @returns 先頭のカード
     */
     drawOne() {
         return this.cards.pop();
     }
 }
 