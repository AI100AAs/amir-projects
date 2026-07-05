#!/usr/bin/env python3
"""
Monopoly - A text-based board game for 2-6 players.
"""

import random
import sys
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ─── Board Definitions ───────────────────────────────────────────────────────

class PropertyGroup(Enum):
    BROWN = "brown"
    LIGHT_BLUE = "light_blue"
    PINK = "pink"
    ORANGE = "orange"
    RED = "red"
    YELLOW = "yellow"
    GREEN = "green"
    DARK_BLUE = "dark_blue"
    RAILROAD = "railroad"
    UTILITY = "utility"


@dataclass
class Space:
    name: str
    space_type: str  # 'property', 'railroad', 'utility', 'tax', 'chance',
                     # 'community_chest', 'jail', 'parking', 'go', 'go_to_jail'
    group: Optional[PropertyGroup] = None
    price: int = 0
    rent: list = field(default_factory=list)  # rent tiers for properties
    house_cost: int = 0
    mortgage_value: int = 0
    color: str = ""

    # Railroad/Utility specific
    railroad_base_rent: int = 0
    utility_dice_multiplier: bool = False

    def __post_init__(self):
        if not self.rent:
            self.rent = []


SPACES = [
    Space("GO", "go"),
    Space("Mediterranean Avenue", "property", PropertyGroup.BROWN, 60, [2, 10, 30, 90, 160, 250], 50, 30, "brown"),
    Space("Community Chest", "community_chest"),
    Space("Baltic Avenue", "property", PropertyGroup.BROWN, 60, [4, 20, 60, 180, 320, 450], 50, 30, "brown"),
    Space("Income Tax", "tax", price=200),
    Space("Reading Railroad", "railroad", PropertyGroup.RAILROAD, 200, [25, 50, 100, 200], railroad_base_rent=25),
    Space("Oriental Avenue", "property", PropertyGroup.LIGHT_BLUE, 100, [6, 30, 90, 270, 400, 550], 50, 50, "light_blue"),
    Space("Chance", "chance"),
    Space("Vermont Avenue", "property", PropertyGroup.LIGHT_BLUE, 100, [6, 30, 90, 270, 400, 550], 50, 50, "light_blue"),
    Space("Connecticut Avenue", "property", PropertyGroup.LIGHT_BLUE, 120, [8, 40, 100, 300, 450, 600], 50, 50, "light_blue"),
    Space("Jail", "jail"),
    Space("St. Charles Place", "property", PropertyGroup.PINK, 140, [10, 50, 150, 450, 625, 750], 100, 70, "pink"),
    Space("Electric Company", "utility", PropertyGroup.UTILITY, 150, utility_dice_multiplier=True),
    Space("States Avenue", "property", PropertyGroup.PINK, 140, [10, 50, 150, 450, 625, 750], 100, 70, "pink"),
    Space("Virginia Avenue", "property", PropertyGroup.PINK, 160, [12, 60, 180, 500, 700, 900], 100, 70, "pink"),
    Space("Pennsylvania Railroad", "railroad", PropertyGroup.RAILROAD, 200, [25, 50, 100, 200], railroad_base_rent=25),
    Space("St. James Place", "property", PropertyGroup.ORANGE, 180, [14, 70, 200, 550, 750, 950], 100, 90, "orange"),
    Space("Community Chest", "community_chest"),
    Space("Tennessee Avenue", "property", PropertyGroup.ORANGE, 180, [14, 70, 200, 550, 750, 950], 100, 90, "orange"),
    Space("New York Avenue", "property", PropertyGroup.ORANGE, 200, [16, 80, 220, 600, 800, 1000], 100, 90, "orange"),
    Space("Free Parking", "parking"),
    Space("Kentucky Avenue", "property", PropertyGroup.RED, 220, [18, 90, 250, 700, 875, 1050], 100, 110, "red"),
    Space("Chance", "chance"),
    Space("Indiana Avenue", "property", PropertyGroup.RED, 220, [18, 90, 250, 700, 875, 1050], 100, 110, "red"),
    Space("Illinois Avenue", "property", PropertyGroup.RED, 240, [20, 100, 300, 750, 925, 1100], 100, 110, "red"),
    Space("B&O Railroad", "railroad", PropertyGroup.RAILROAD, 200, [25, 50, 100, 200], railroad_base_rent=25),
    Space("Atlantic Avenue", "property", PropertyGroup.YELLOW, 260, [22, 110, 330, 800, 975, 1150], 100, 130, "yellow"),
    Space("Ventnor Avenue", "property", PropertyGroup.YELLOW, 260, [22, 110, 330, 800, 975, 1150], 100, 130, "yellow"),
    Space("Water Works", "utility", PropertyGroup.UTILITY, 150, utility_dice_multiplier=True),
    Space("Marvin Gardens", "property", PropertyGroup.YELLOW, 280, [24, 120, 360, 850, 1025, 1200], 100, 130, "yellow"),
    Space("Go To Jail", "go_to_jail"),
    Space("Pacific Avenue", "property", PropertyGroup.GREEN, 300, [26, 130, 390, 900, 1100, 1275], 100, 150, "green"),
    Space("North Carolina Avenue", "property", PropertyGroup.GREEN, 300, [26, 130, 390, 900, 1100, 1275], 100, 150, "green"),
    Space("Community Chest", "community_chest"),
    Space("Pennsylvania Avenue", "property", PropertyGroup.GREEN, 320, [28, 150, 450, 1000, 1200, 1400], 100, 150, "green"),
    Space("Short Line Railroad", "railroad", PropertyGroup.RAILROAD, 200, [25, 50, 100, 200], railroad_base_rent=25),
    Space("Chance", "chance"),
    Space("Park Place", "property", PropertyGroup.DARK_BLUE, 350, [35, 175, 500, 1100, 1300, 1500], 100, 175, "dark_blue"),
    Space("Luxury Tax", "tax", price=100),
    Space("Boardwalk", "property", PropertyGroup.DARK_BLUE, 400, [50, 200, 600, 1400, 1700, 2000], 100, 200, "dark_blue"),
]


CHANCE_CARDS = [
    ("Advance to Go (Collect $200)", "advance_to_go"),
    ("Advance to Boardwalk", "advance_to", 39),
    ("Advance to nearest Utility. If unowned, you may buy it. If owned, roll dice and pay owner 10x the roll.", "advance_to_nearest_utility"),
    ("Advance to nearest Railroad. Pay owner twice the normal rent.", "advance_to_nearest_railroad_double"),
    ("Bank pays you dividend of $50", "get_money", 50),
    ("Get Out of Jail Free card", "get_out_of_jail_free"),
    ("Go back 3 spaces", "go_back_3"),
    ("Go to Jail. Do not pass Go, do not collect $200.", "go_to_jail"),
    ("Make general repairs: $25 per house, $100 per hotel", "repair_houses"),
    ("Pay poor tax of $15", "pay_money", 15),
    ("Take a trip to Reading Railroad. Collect $200 if you pass Go.", "advance_to", 5),
    ("Your building loan matures. Collect $150", "get_money", 150),
    ("You have been elected Chairman of the Board. Pay each player $50", "pay_each_player", 50),
    ("You won a crossword competition. Collect $100", "get_money", 100),
]

COMMUNITY_CHEST_CARDS = [
    ("Advance to Go (Collect $200)", "advance_to_go"),
    ("Bank error in your favor. Collect $200", "get_money", 200),
    ("Doctor's fees. Pay $50", "pay_money", 50),
    ("From sale of stock you get $50", "get_money", 50),
    ("Get Out of Jail Free card", "get_out_of_jail_free"),
    ("Go to Jail. Do not pass Go, do not collect $200.", "go_to_jail"),
    ("Holiday fund matures. Receive $100", "get_money", 100),
    ("Income tax refund. Collect $20", "get_money", 20),
    ("Insurance policy matures. Collect $100", "get_money", 100),
    ("Inheritance. Collect $100", "get_money", 100),
    ("Pay hospital fees of $100", "pay_money", 100),
    ("Pay school fees of $50", "pay_money", 50),
    ("Receive $25 consultancy fee", "get_money", 25),
    ("You are assessed for street repairs: $40 per house, $115 per hotel", "repair_houses_heavy"),
]


# ─── Game Classes ─────────────────────────────────────────────────────────────

class PlayerStatus(Enum):
    ACTIVE = "active"
    IN_JAIL = "in_jail"
    BANKRUPT = "bankrupt"


@dataclass
class Player:
    name: str
    money: int = 1500
    position: int = 0
    status: PlayerStatus = PlayerStatus.ACTIVE
    in_jail_turns: int = 0
    properties: list = field(default_factory=list)
    houses: dict = field(default_factory=dict)  # property_name -> num_houses
    mortgaged: set = field(default_factory=set)
    get_out_of_jail_free: int = 0
    total_value: int = 0

    @property
    def is_active(self) -> bool:
        return self.status == PlayerStatus.ACTIVE

    def add_property(self, space: Space):
        if space.name not in self.properties:
            self.properties.append(space.name)
            self.houses[space.name] = 0

    def remove_property(self, space_name: str):
        if space_name in self.properties:
            self.properties.remove(space_name)
            self.houses.pop(space_name, None)

    def calculate_value(self) -> int:
        value = self.money
        for prop_name in self.properties:
            space = SPACES[self._find_space_index(prop_name)]
            if prop_name not in self.mortgaged:
                value += space.price
                value += self.houses.get(prop_name, 0) * (space.house_cost // 2)
        return value

    def _find_space_index(self, name: str) -> int:
        for i, s in enumerate(SPACES):
            if s.name == name:
                return i
        return 0


class MonopolyGame:
    def __init__(self, player_names: list[str]):
        self.players = [Player(name) for name in player_names]
        self.current_player_index = 0
        self.chance_deck = self._build_deck(CHANCE_CARDS)
        self.community_chest_deck = self._build_deck(COMMUNITY_CHEST_CARDS)
        self.properties_owned: dict[str, str] = {}  # space_name -> player_name
        self.railroad_counts: dict[str, int] = {}  # player_name -> count
        self.utility_counts: dict[str, int] = {}   # player_name -> count
        self.doubles_count: int = 0
        self.consecutive_doubles: int = 0
        self.game_over = False
        self.winner: Optional[str] = None

    @staticmethod
    def _build_deck(cards: list) -> list:
        deck = cards.copy()
        random.shuffle(deck)
        return deck

    def _draw_card(self, deck_type: str) -> tuple:
        deck = self.chance_deck if deck_type == "chance" else self.community_chest_deck
        if not deck:
            deck = self._build_deck(CHANCE_CARDS if deck_type == "chance" else COMMUNITY_CHEST_CARDS)
            if deck_type == "chance":
                self.chance_deck = deck
            else:
                self.community_chest_deck = deck
        return deck.pop(0)

    def _roll_dice(self) -> tuple:
        d1 = random.randint(1, 6)
        d2 = random.randint(1, 6)
        return d1, d2

    def _get_current_player(self) -> Player:
        return self.players[self.current_player_index]

    def _next_player(self):
        self.current_player_index = (self.current_player_index + 1) % len(self.players)

    def _move_player(self, player: Player, spaces: int):
        old_pos = player.position
        player.position = (player.position + spaces) % 40

        # Check if passed GO
        if player.position < old_pos and spaces > 0:
            player.money += 200
            print(f"  {player.name} passes GO and collects $200!")

    def _get_rent(self, space: Space, owner: Player) -> int:
        if space.space_type == "railroad":
            count = len([p for p in self.players if p.is_active and space.name in p.properties])
            # Actually count how many railroads the owner has
            railroad_count = sum(1 for s in SPACES if s.space_type == "railroad" and s.name in owner.properties)
            if railroad_count == 1:
                return 25
            elif railroad_count == 2:
                return 50
            elif railroad_count == 3:
                return 100
            else:
                return 200

        if space.space_type == "utility":
            if owner.utility_counts.get(space.name, False) or space.utility_dice_multiplier:
                d1, d2 = self._roll_dice()
                return (d1 + d2) * 10
            else:
                d1, d2 = self._roll_dice()
                return (d1 + d2) * 4

        if space.space_type == "property":
            houses = owner.houses.get(space.name, 0)
            if houses == 0:
                if space.rent:
                    return space.rent[0]
                return 0
            elif houses == 5:  # Hotel
                if space.rent:
                    return space.rent[5]
                return 0
            else:
                if space.rent and houses < len(space.rent):
                    return space.rent[houses]
                return 0

        return 0

    def _handle_landing(self, player: Player, space: Space):
        print(f"\n  {player.name} lands on {space.name}")

        if space.space_type == "go":
            print("  You landed on GO! Collect $200.")
            player.money += 200

        elif space.space_type == "tax":
            print(f"  Pay ${space.price} in taxes.")
            player.money -= space.price

        elif space.space_type == "go_to_jail":
            print("  Go to Jail!")
            player.position = 10
            player.status = PlayerStatus.IN_JAIL
            player.in_jail_turns = 0
            print(f"  {player.name} is sent to Jail.")

        elif space.space_type == "chance":
            card = self._draw_card("chance")
            self._resolve_card(player, card)

        elif space.space_type == "community_chest":
            card = self._draw_card("community_chest")
            self._resolve_card(player, card)

        elif space.space_type == "property" or space.space_type == "railroad" or space.space_type == "utility":
            owner_name = self.properties_owned.get(space.name)

            if owner_name is None:
                # Unowned - offer to buy
                if player.money >= space.price:
                    print(f"  Price: ${space.price}. Buy? (yes/no)")
                    while True:
                        choice = input("  > ").strip().lower()
                        if choice in ("yes", "y", "no", "n"):
                            break
                        print("  Please enter 'yes' or 'no'.")

                    if choice in ("yes", "y"):
                        player.money -= space.price
                        player.add_property(space)
                        self.properties_owned[space.name] = player.name
                        print(f"  {player.name} buys {space.name} for ${space.price}.")
                        if space.space_type == "railroad":
                            self.railroad_counts[player.name] = self.railroad_counts.get(player.name, 0) + 1
                        elif space.space_type == "utility":
                            self.utility_counts[player.name] = self.utility_counts.get(player.name, 0) + 1
                    else:
                        print(f"  {player.name} passes on buying {space.name}.")
                else:
                    print(f"  Not enough money to buy {space.name} (${space.price}).")

            elif owner_name == player.name:
                print(f"  You own this property.")

            else:
                # Owned by another player
                owner = next(p for p in self.players if p.name == owner_name)
                if space.name not in owner.mortgaged:
                    rent = self._get_rent(space, owner)
                    print(f"  Owned by {owner_name}. Rent: ${rent}")
                    player.money -= rent
                    owner.money += rent
                    print(f"  {player.name} pays ${rent} to {owner_name}.")
                    self._check_bankruptcy(player, owner)
                else:
                    print(f"  Property is mortgaged. No rent due.")

        elif space.space_type == "jail":
            if player.status == PlayerStatus.IN_JAIL:
                print("  You are in Jail.")
            else:
                print("  Just visiting.")

        elif space.space_type == "parking":
            print("  Relax on Free Parking.")

    def _resolve_card(self, player: Player, card: tuple):
        action = card[1]
        print(f"  *** {card[0]} ***")

        if action == "advance_to_go":
            old_pos = player.position
            player.position = 0
            if player.position < old_pos:
                player.money += 200
                print("  You pass GO and collect $200!")

        elif action == "advance_to" and len(card) > 2:
            target = card[2]
            old_pos = player.position
            player.position = target
            if player.position < old_pos:
                player.money += 200
                print("  You pass GO and collect $200!")

        elif action == "get_money" and len(card) > 2:
            amount = card[2]
            player.money += amount
            print(f"  You collect ${amount}.")

        elif action == "pay_money" and len(card) > 2:
            amount = card[2]
            player.money -= amount
            print(f"  You pay ${amount}.")
            self._check_bankruptcy(player)

        elif action == "go_to_jail":
            player.position = 10
            player.status = PlayerStatus.IN_JAIL
            player.in_jail_turns = 0
            print("  You are sent to Jail!")

        elif action == "get_out_of_jail_free":
            player.get_out_of_jail_free += 1
            print("  You receive a Get Out of Jail Free card!")

        elif action == "go_back_3":
            player.position = (player.position - 3) % 40
            new_space = SPACES[player.position]
            self._handle_landing(player, new_space)

        elif action == "advance_to_nearest_utility":
            # Find nearest utility
            utilities = [12, 28]  # Electric Company, Water Works
            for u in utilities:
                if u > player.position:
                    player.position = u
                    break
            else:
                player.position = utilities[0]
            new_space = SPACES[player.position]
            self._handle_landing(player, new_space)

        elif action == "advance_to_nearest_railroad_double":
            railroads = [5, 15, 25, 35]
            for r in railroads:
                if r > player.position:
                    player.position = r
                    break
            else:
                player.position = railroads[0]
            new_space = SPACES[player.position]
            self._handle_landing(player, new_space)
            # Double rent handled in _get_rent

        elif action == "repair_houses":
            total = 0
            for prop_name in player.properties:
                s = SPACES[self._find_space_index(prop_name)]
                if s.space_type == "property":
                    houses = player.houses.get(prop_name, 0)
                    if houses == 5:
                        total += 100
                    elif houses > 0:
                        total += 25 * houses
            if total > 0:
                player.money -= total
                print(f"  You pay ${total} for repairs.")
                self._check_bankruptcy(player)

        elif action == "repair_houses_heavy":
            total = 0
            for prop_name in player.properties:
                s = SPACES[self._find_space_index(prop_name)]
                if s.space_type == "property":
                    houses = player.houses.get(prop_name, 0)
                    if houses == 5:
                        total += 115
                    elif houses > 0:
                        total += 40 * houses
            if total > 0:
                player.money -= total
                print(f"  You pay ${total} for street repairs.")
                self._check_bankruptcy(player)

        elif action == "pay_each_player" and len(card) > 2:
            amount = card[2]
            total = amount * (len(self.players) - 1)
            if player.money >= total:
                player.money -= total
                for p in self.players:
                    if p.name != player.name and p.is_active:
                        p.money += amount
                print(f"  You pay ${amount} to each other player.")
                self._check_bankruptcy(player)

    def _check_bankruptcy(self, player: Player, creditor: Optional[Player] = None):
        if player.money < 0:
            print(f"\n  *** {player.name} is BANKRUPT! ***")
            player.status = PlayerStatus.BANKRUPT

            # Return properties
            for prop_name in player.properties:
                if prop_name in self.properties_owned:
                    del self.properties_owned[prop_name]

            if creditor:
                active_players = [p for p in self.players if p.is_active]
                if len(active_players) == 1:
                    self.game_over = True
                    self.winner = active_players[0].name
                    print(f"\n  🏆 {self.winner} wins the game!")

    def _handle_jail(self, player: Player):
        if player.status != PlayerStatus.IN_JAIL:
            return

        print(f"\n  {player.name} is in Jail.")
        print("  1. Pay $50 bail")
        print("  2. Try to roll doubles (3 turns max)")
        print("  3. Use Get Out of Jail Free card")
        print("  > ", end="", flush=True)

        choice = input().strip()

        if choice == "3" and player.get_out_of_jail_free > 0:
            player.get_out_of_jail_free -= 1
            player.status = PlayerStatus.ACTIVE
            print("  You used a Get Out of Jail Free card!")
        elif choice == "1":
            player.money -= 50
            player.status = PlayerStatus.ACTIVE
            print("  You paid $50 bail and are free.")
        else:
            print("  Trying to roll doubles...")

    def _play_turn(self):
        player = self._get_current_player()

        if not player.is_active:
            self._next_player()
            return

        print(f"\n{'='*50}")
        print(f"  {player.name}'s turn  (Money: ${player.money})")
        print(f"  Properties: {', '.join(player.properties) if player.properties else 'None'}")
        print(f"{'='*50}")

        # Check jail
        if player.status == PlayerStatus.IN_JAIL:
            self._handle_jail(player)
            if player.status == PlayerStatus.IN_JAIL:
                player.in_jail_turns += 1
                if player.in_jail_turns >= 3:
                    player.money -= 50
                    player.status = PlayerStatus.ACTIVE
                    print("  3 turns in jail. You must pay $50 and roll.")
                else:
                    self._next_player()
                    return

        # Roll dice
        d1, d2 = self._roll_dice()
        total = d1 + d2
        is_double = d1 == d2

        print(f"\n  🎲 Rolled: {d1} + {d2} = {total} {'(DOUBLES!)' if is_double else ''}")

        if player.status == PlayerStatus.IN_JAIL and not is_double:
            player.in_jail_turns += 1
            if player.in_jail_turns >= 3:
                player.money -= 50
                player.status = PlayerStatus.ACTIVE
                print("  3 turns in jail. You must pay $50 and roll.")
            else:
                print("  Still in Jail. Next turn.")
                self._next_player()
                return

        # Move
        self._move_player(player, total)

        # Handle landing
        space = SPACES[player.position]
        self._handle_landing(player, space)

        # Check doubles - roll again
        if is_double and player.status != PlayerStatus.IN_JAIL:
            self.consecutive_doubles += 1
            if self.consecutive_doubles >= 3:
                print("  Three doubles in a row! Go to Jail!")
                player.position = 10
                player.status = PlayerStatus.IN_JAIL
                player.in_jail_turns = 0
            else:
                print("  Doubles! Roll again.")
                self._next_player()
                return
        else:
            self.consecutive_doubles = 0

        self._next_player()

    def _show_board_status(self):
        print(f"\n{'#'*60}")
        print(f"  MONOPOLY GAME STATUS")
        print(f"{'#'*60}")

        for player in self.players:
            status_icon = "✓" if player.is_active else "✗"
            jail_icon = "🔒" if player.status == PlayerStatus.IN_JAIL else ""
            print(f"  {status_icon} {player.name}: ${player.money} {jail_icon}")
            if player.properties:
                print(f"      Properties: {', '.join(player.properties)}")

        print(f"{'#'*60}\n")

    def _show_menu(self):
        print("\n  Commands:")
        print("    roll   - Roll dice and play turn")
        print("    status - View game status")
        print("    quit   - Quit the game")
        print("    > ", end="", flush=True)

    def run(self):
        print("\n" + "="*60)
        print("  Welcome to MONOPOLY!")
        print(f"  Players: {', '.join(p.name for p in self.players)}")
        print("="*60)

        while not self.game_over:
            self._show_board_status()
            self._show_menu()

            cmd = input().strip().lower()

            if cmd == "roll":
                self._play_turn()
            elif cmd == "status":
                self._show_board_status()
            elif cmd == "quit":
                print("Thanks for playing!")
                break

        if self.game_over and not cmd == "quit":
            self._show_board_status()
            print(f"\n  🏆 {self.winner} WINS THE GAME! 🏆\n")


def main():
    print("\n" + "="*60)
    print("  MONOPOLY - Setup")
    print("="*60)

    while True:
        try:
            num_players = int(input("\n  How many players? (2-6): ").strip())
            if 2 <= num_players <= 6:
                break
            print("  Please enter a number between 2 and 6.")
        except ValueError:
            print("  Please enter a valid number.")

    player_names = []
    for i in range(num_players):
        while True:
            name = input(f"  Player {i+1} name: ").strip()
            if name:
                player_names.append(name)
                break

    game = MonopolyGame(player_names)
    game.run()


if __name__ == "__main__":
    main()
