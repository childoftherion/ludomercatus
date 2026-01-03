# Ludomercatus — Full Game Specification

## 1. Overview

**Ludomercatus** is a turn-based economic board game for 2–8 players.  
The objective is to bankrupt all other players by acquiring, developing, and trading properties, collecting rent, and managing cash flow.

---

## 2. Components

### 2.1 Board

- 40 spaces arranged clockwise.
- Space types:
  - Properties (22)
  - Railroads (4)
  - Utilities (2)
  - Tax spaces (2)
  - Chance (3)
  - Community Chest (3)
  - Corner spaces (4)

### 2.2 Money

- Total bank supply is unlimited.
- Denominations:
  - £1, £5, £10, £20, £50, £100, £500 (or equivalent currency)

### 2.3 Cards

- 16 Chance cards
- 16 Community Chest cards

### 2.4 Property Assets

- 32 Houses
- 12 Hotels
- Title Deed cards for each purchasable space

### 2.5 Dice

- Two standard six-sided dice (2d6)

### 2.6 Tokens

- One player token per player

---

## 3. Players

- Minimum: 2
- Maximum: 8
- Each player starts with:
  - £1500 cash
  - One token
  - No properties

### 3.1 Starting Cash Breakdown

- £500 × 2
- £100 × 4
- £50 × 1
- £20 × 2
- £10 × 1
- £5 × 1
- £1 × 5

---

## 4. Setup

1. Place the board centrally.
2. Shuffle Chance and Community Chest decks separately.
3. Place money, houses, and hotels in the bank.
4. Each player selects a token and receives starting cash.
5. All tokens start on **GO**.
6. Select a banker (may also be a player).

---

## 5. Turn Structure

Each turn proceeds in the following order:

1. Roll two dice.
2. Move clockwise the total number of spaces.
3. Resolve the landed space.
4. Perform optional actions (trading, building, mortgaging).
5. End turn (unless doubles were rolled).

---

## 6. Dice Rules

- If doubles are rolled:
  - Player takes another turn.
- If doubles are rolled **three times consecutively**:
  - Player goes directly to Jail.
  - Turn ends immediately.

---

## 7. Board Spaces

### 7.1 GO

- Collect £200 when:
  - Landing on GO
  - Passing GO

### 7.2 Properties

#### 7.2.1 Unowned Property

- Player may buy at listed price.
- If declined:
  - Property is auctioned by the bank.
  - Any player may bid.

#### 7.2.2 Owned Property

- Rent must be paid to owner.
- Rent varies by:
  - Property color set
  - Number of houses/hotel
  - Special rules (railroads, utilities)

### 7.3 Railroads

- Rent depends on number owned:
  - 1 railroad: £25
  - 2 railroads: £50
  - 3 railroads: £100
  - 4 railroads: £200

### 7.4 Utilities

- If owner has:
  - 1 utility: rent = 4× dice roll
  - 2 utilities: rent = 10× dice roll

### 7.5 Chance

- Draw top Chance card.
- Resolve immediately.
- Return card to bottom unless retained.

### 7.6 Community Chest

- Same rules as Chance, different card set.

### 7.7 Income Tax

- Pay £200 (standard rules).

### 7.8 Luxury Tax

- Pay £100.

### 7.9 Jail

#### 7.9.1 Just Visiting

- No effect.

#### 7.9.2 Sent to Jail

- Occurs when:
  - Landing on “Go To Jail”
  - Drawing certain cards
  - Rolling three doubles
- Move directly to Jail.
- Do **not** collect £200.

#### 7.9.3 Getting Out of Jail

Player may:

- Roll doubles (up to 3 turns)
- Pay £50 before rolling
- Use a “Get Out of Jail Free” card

If doubles not rolled after 3 turns:

- Must pay £50
- Then move according to dice roll

---

## 8. Property Sets & Development

### 8.1 Monopoly (Color Set)

- Owning all properties of a color:
  - Doubles base rent (no houses)
  - Allows building houses

### 8.2 Building Rules

- Must build evenly across the set.
- Maximum:
  - 4 houses per property
  - Then 1 hotel
- Houses must be available in the bank.
- Hotels require returning 4 houses to bank.

### 8.3 Rent with Development

- Rent values defined on Title Deed cards.
- Hotel replaces all houses on a property.

---

## 9. Mortgaging

- Property may be mortgaged at listed value.
- No rent may be collected while mortgaged.
- To unmortgage:
  - Pay mortgage value + 10% interest.

---

## 10. Trading

Players may trade:

- Cash
- Properties
- “Get Out of Jail Free” cards
- Any combination

Rules:

- Trades may occur anytime except during dice roll resolution.
- The bank does not trade.

---

## 11. Auctions

- Triggered when a player declines to buy unowned property.
- Banker conducts auction.
- Any bid allowed, including £1.
- Highest bidder pays bank.

---

## 12. Bankruptcy

A player is bankrupt if unable to pay a debt.

### 12.1 To Another Player

- All assets transfer to creditor.
- Mortgaged properties remain mortgaged.

### 12.2 To the Bank

- All properties return to bank.
- Properties are auctioned.

Bankrupt player is eliminated.

---

## 13. Winning the Game

- Last remaining non-bankrupt player wins.

---

## 14. Optional / Common House Rules (Not Official)

- Free Parking jackpot
- Double GO payout
- Property bought only via auction
- No auctions (not recommended)

These rules are **not** part of the official specification.

---

## 15. Data Model Reference (Optional)

### Player

- id
- cash
- position
- properties[]
- inJail
- jailTurns
- jailFreeCards

### Property

- id
- owner
- mortgaged
- houses
- hasHotel

### Game State

- currentPlayer
- board[40]
- bank
- chanceDeck
- communityChestDeck

---

## 16. Determinism Notes (for Digital Versions)

- Shuffle decks with seeded RNG.
- Dice rolls must be logged.
- Auctions should be synchronous and blocking.

---

## 17. End of Specification
