# Road to Life

The party-game version of the Road to Life Bible board game. One screen hosts (a TV, laptop or phone everyone can see) and everyone else joins on their phone with a 4-letter room code, like jackbox.tv.

## How to play

1. On the screen everyone can see, open the site and tap **Host a game on this screen**. Choose whether that screen is a player or just the TV.
2. Everyone else opens the site on their phone, types the room code (or scans the QR code) and picks Team 1 or Team 2.
3. The host picks a version:
   - **Board on the table**: you play on the printed board. The screens handle whose turn it is, the cards and the timer.
   - **Digital board**: no printed board needed. Roll 1 to 5 on screen; the number picks the pile. A right answer moves your piece one space toward the crown; first team to the crown wins.
4. Turns go back and forth between the teams, one person at a time.

Card rules built in:
- Only the person whose turn it is can show the answer.
- **Remain Dumb** cards are only shown on the screen of the person acting them out.
- **Who am I?** cards reveal one hint at a time. Guessing on the first hint moves 3 spaces, the second 2, the last 1.
- The timer starts with one tap (30s, 40s, 1:00 or 1:30) and shows on every screen.

## Files

- `index.html`, `game.js`: the whole app
- `cards.json`: every card, by deck (`lot`, `so`, `last`, `written`, `dumb`)
- `board.jpg`, `art/`: board and card-back artwork
- `vendor/`: PeerJS (phone-to-host connection) and a QR code generator

Phones connect straight to the host screen with WebRTC through PeerJS's free public signaling server, so there is no server to run. Most home Wi-Fi and phone networks work; a few strict networks block direct connections.
