import { Player } from "./Player.js"
import { Deck } from "./Deck.js"

export class Table {
    /**
     * 
     * @param {*} gameType ゲームタイプ({"blackjack"}から選択)
     * @param {*} betDenominations プレイヤーが選択できるベットの単位(デフォルトは[5,20,50,100])
     */
     constructor(gameType, name, type, betDenominations = [5, 20, 50, 100]) {
         this.gameType = gameType;
         this.betDenominations = betDenominations;
         
         // テーブルのカードのデッキ
         this.deck = new Deck(this.gameType);
         
         // プレイしているゲームに応じて、プレイヤー、gamePhases、ハウスの表現が異なるかもしれません。
         // 今回はとりあえず3人のAIプレイヤーとハウス、「betting」フェースの始まりにコミットしましょう。
         this.players = []
         
         // プレイヤーをここで初期化してください
         this.house = new Player('house', 'house', this.gameType);
         this.players.push(new Player("AI-1", "ai", this.gameType));
         this.players.push(new Player(name, type, this.gameType));
         this.players.push(new Player("AI-3", "ai", this.gameType));
         this.playerNumber = 0;
         this.gamePhase = "betting";
         this.gameRound = 1;
 
         // これは各ラウンドの結果をログに記録するための文字列の配列です。
         this.resultsLog = []
     }
 
     /*
         Player player : テーブルは、Player.promptPlayer()を使用してGameDecisionを取得し、GameDecisionとgameTypeに応じてPlayerの状態を更新します。
         return Null : このメソッドは、プレーヤの状態を更新するだけです。
 
         EX:
         プレイヤーが「ヒット」し、手札が21以上の場合、gameStatusを「バスト」に設定し、チップからベットを引きます。
     */
     async evaluateMove(player) {
         // Playerの処理判断
         const decision = await player.promptPlayer(this.house);
         
         // Playerがbettingの状態の場合
         if (player.gameStatus === "betting") {
             player.bet = decision.amount;
             player.gameStatus = "acting";
         }
         // Playerがactingの状態の場合(hit, double, stand, surrender)
         else if (player.gameStatus === "acting" || player.type === "user") {
             if (decision.action === "stand") {
                 player.gameStatus = "roundOver";
             }
             else if (decision.action === "surrender") {
                 // TODO: 処理
             }
             else {
                 player.hand.push(this.deck.drawOne());
                 player.bet += decision.amount;
                 // bustした場合
                 if (player.getHandScore() > 21) {
                     player.gameStatus = "roundOver";
                 }
             }
         }
 
         return;
     }
 
     /*
        return String : 新しいターンが始まる直前の全プレイヤーの状態を表す文字列。
         NOTE: このメソッドの出力は、各ラウンドの終了時にテーブルのresultsLogメンバを更新するために使用されます。
     */
     blackjackEvaluateAndGetRoundResults() {
         this.resultsLog.push(
             `${this.gameRound} Round End: `, 
             JSON.stringify({ name: this.house.name, hand: this.house.hand, total: this.house.getHandScore() }), 
             this.players.map((it) => { return JSON.stringify({ name: it.name, winAmount: it.winAmount, chips: it.chips, hand: it.hand, total: it.getHandScore() }); })
         );
     }
 
    /**
     * デッキから2枚のカードを手札に加える
     * 全プレイヤーの状態を更新する
     */
     blackjackAssignPlayerHands() {
         this.deck.shuffle();
         for (let i = 0; i < 2; i++) {
             this.players.forEach((player) => player.hand.push(this.deck.drawOne()));
             this.house.hand.push(this.deck.drawOne());
         }
     }
 
     /*
        return null : テーブル内のすべてのプレイヤーの状態を更新し、手札を空の配列に、ベットを0に設定します。
     */
    /**
     * 全プレイヤーの手札をからの配列に、ベットを0に設定する
     * 全プレイヤーの状態を更新
     */
     blackjackClearPlayerHandsAndBets() {
         this.players.forEach((player) => {
             player.hand = [];
             player.bet = 0;
             player.gameStatus = "betting";
         });
         this.house.hand = [];
         this.house.gameStatus = "betting";
         this.deck.resetDeck();
     }
     
     /*
        return Player : 現在のプレイヤー
     */
     getTurnPlayer() {
         return this.players[this.playerNumber];
     }
 
     /*
        Number userData : テーブルモデルの外部から渡されるデータです。 
        return Null : このメソッドはテーブルの状態を更新するだけで、値を返しません。
     */
     async haveTurn(userData) {
         if (this.gamePhase === "betting") {
             await this.evaluateMove(userData);
 
             if (this.onLastPlayer()) {
                 this.playerNumber = 0;
                 this.blackjackAssignPlayerHands();
                 this.gamePhase = "dealCards";
                 return;
             }
 
             this.playerNumber++;
         }
         else if (this.gamePhase === "dealCards") {
             this.gamePhase = "acting";
         }
         else if (this.gamePhase === "acting") {
             // console.log("start acting : ", this.getTurnPlayer());
             if (!this.allPlayerActionsResolved()) {
                 await this.evaluateMove(userData);
                 this.playerNumber += (userData.gameStatus === "roundOver") ? 1 : 0;
                 if (this.playerNumber >= this.players.length) {
                     this.playerNumber = 0;
                 }
                 return;
             }
 
             // playerのactionが全て終了した場合、ディーラーがactionを行う 
             if (this.house.gameStatus === "roundOver") {
                 this.gamePhase = "evaluating";
                 return;
             }
 
             await this.evaluateMove(this.house);
         }
         else if (this.gamePhase === "evaluating") {
             this.evaluateResults();
             this.blackjackEvaluateAndGetRoundResults();
             this.blackjackClearPlayerHandsAndBets();
             this.gameRound++;
             this.gamePhase = "roundOver"
         }
 
         return;
     }
 
     /*
         return Boolean : テーブルがプレイヤー配列の最初のプレイヤーにフォーカスされている場合はtrue、そうでない場合はfalseを返します。
     */
     onFirstPlayer() {
         return this.playerNumber === 0;
     }
 
     /*
         return Boolean : テーブルがプレイヤー配列の最後のプレイヤーにフォーカスされている場合はtrue、そうでない場合はfalseを返します。
     */
     onLastPlayer() {
         return this.playerNumber === this.players.length - 1;
     }
     
     /*
         全てのプレイヤーがセット{'broken', 'bust', 'stand', 'surrender'}のgameStatusを持っていればtrueを返し、持っていなければfalseを返します。
     */
     allPlayerActionsResolved() {
         return this.players.every(player => player.gameStatus === "roundOver");
     }
 
     // 自作: 結果の評価
     evaluateResults() {
         for (const player of this.players) {
             if (player.getHandScore() > 21) {
                 player.winAmount -= player.bet;
                 player.chips -= player.bet;  
             }
             else if (this.house.getHandScore() > 21 || (player.getHandScore() > this.house.getHandScore())) {
                 player.winAmount = player.bet;
                 player.chips += player.bet;
             }
             else if (this.house.getHandScore() <= 21 && (player.getHandScore() <= this.house.getHandScore())) {
                 player.winAmount -= player.bet;
                 player.chips -= player.bet;
             }
         }
     }
 
     // 自作: chipが0になっていないかを確認
     isAnyOneChipsZero() {
         for (const player of this.players) {
             if (player.chips <= 0) {
                 this.gamePhase = "roundOver";
             }
         }
         this.gamePhase = "betting";
     }
 }
 