import random
import sys

class Space:
    def __init__(self, name):
        self.name = name

    def effect(self, player, game):
        pass

    def __str__(self):
        return self.name

class Property(Space):
    def __init__(self, name, group, price, rent):
        super().__init__(name)
        self.group = group
        self.price = price
        self.rent = rent
        self.owner = None

    def __str__(self):
        owner_str = f" (Owned by {self.owner.name})" if self.owner else ""
        return f"{self.name} [{self.group}] - Price: ${self.price}, Rent: ${self.rent}{owner_str}"

class ChanceSpace(Space):
    def effect(self, player, game):
        event = random.choice(["Advance to Go", "Pay $50 tax", "Collect $100 from bank"])
        print(f"  [CHANCE] {event}")
        if event == "Advance to Go":
            player.position = 0
        elif event == "Pay $50 tax":
            player.money -= 50
        elif event == "Collect $100 from bank":
            player.money += 100

class CommunityChestSpace(Space):
    def effect(self, player, game):
        event = random.choice(["Get $50", "Pay $20 fee"])
        print(f"  [COMMUNITY CHEST] {event}")
        if event == "Get $50":
            player.money += 50
        elif event == "Pay $20 fee":
            player.money -= 20

class Player:
    def __init__(self, name, starting_money=1500):
        self.name = name
        self.money = starting_money
        self.position = 0
        self.properties = []
        self.is_bankrupt = False

    def __str__(self):
        return f"{self.name}: ${self.money}, Position: {self.position}"

class Board:
    def __init__(self):
        self.spaces = []
        self._setup_board()

    def _setup_board(self):
        self.spaces = [
            Space("Go"),
            Property("Mediterranean Avenue", "Brown", 60, 2),
            CommunityChestSpace("Community Chest"),
            Property("Oriental Avenue", "Light Blue", 100, 6),
            Property("Vermont Avenue", "Light Blue", 100, 6),
            Property("Connecticut Avenue", "Light Blue", 120, 6),
            Space("Just Visiting"),
            Property("St. Charles Place", "Pink", 140, 10),
            Property("States Avenue", "Pink", 140, 10),
            Property("Virginia Avenue", "Pink", 160, 10),
            Space("Free Parking"),
            Property("St. James Place", "Orange", 180, 14),
            Property("Tennessee Avenue", "Orange", 180, 14),
            Property("New York Avenue", "Orange", 200, 14),
            Space("Go to Jail"),
            Property("Kentucky Avenue", "Red", 220, 16),
            Property("Indiana Avenue", "Red", 220, 16),
            Property("Illinois Avenue", "Red", 240, 16),
            ChanceSpace("Chance"),
            Property("Atlantic Avenue", "Yellow", 260, 18),
            Property("Ventnor Avenue", "Yellow", 260, 18),
            Property("Marvin Gardens", "Yellow", 280, 18),
            Space("Just Visiting (In Jail)"),
            Property("Pacific Avenue", "Green", 300, 20),
            Property("North Carolina Avenue", "Green", 300, 20),
            Property("Pennsylvania Avenue", "Green", 320, 22),
            Property("Short Line Railroad", "Railroad", 200, 25),
            ChanceSpace("Chance"),
            Property("Park Place", "Blue", 350, 35),
            Property("Boardwalk", "Blue", 400, 50),
        ]

    def get_space(self, position):
        return self.spaces[position % len(self.spaces)]

class Game:
    def __init__(self, players, demo_mode=False):
        self.players = players
        self.board = Board()
        self.turn = 0
        self.demo_mode = demo_mode

    def roll_dice(self):
        return random.randint(1, 6) + random.randint(1, 6)

    def play_turn(self):
        player = self.players[self.turn]
        if player.is_bankrupt:
            self.next_turn()
            return

        print(f"\n--- {player.name}'s Turn ---")
        print(player)
        
        dice = self.roll_dice()
        print(f"{player.name} rolled a {dice}")
        
        player.position = (player.position + dice) % len(self.board.spaces)
        space = self.board.get_space(player.position)
        
        print(f"Landed on {space}")
        
        space.effect(player, self)

        if isinstance(space, Property):
            if space.owner is None:
                self.handle_property_purchase(player, space)
            elif space.owner != player:
                self.handle_rent(player, space)
            else:
                print(f"{player.name} already owns this property.")
        
        self.next_turn()

    def handle_property_purchase(self, player, space):
        if self.demo_mode:
            # In demo mode, auto-buy if affordable
            if player.money >= space.price:
                choice = 'y'
            else:
                choice = 'n'
        else:
            choice = input(f"Would you like to buy {space.name} for ${space.price}? (y/n): ").lower()

        if choice == 'y' and player.money >= space.price:
            player.money -= space.price
            space.owner = player
            player.properties.append(space)
            print(f"{player.name} bought {space.name}")
        else:
            print(f"{player.name} chose not to buy {space.name} or cannot afford it.")

    def handle_rent(self, player, space):
        rent = space.rent
        print(f"{player.name} pays ${rent} rent to {space.owner.name}")
        player.money -= rent
        space.owner.money += rent
        if player.money < 0:
            player.is_bankrupt = True
            print(f"{player.name} is bankrupt!")

    def next_turn(self):
        self.turn = (self.turn + 1) % len(self.players)

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Play Monopoly')
    parser.add_argument('--demo', action='store_true', help='Run in demo mode (automatic)')
    args = parser.parse_args()

    print("Welcome to Monopoly!")
    player_names = ["Player 1", "Player 2"]
    players = [Player(name) for name in player_names]
    game = Game(players, demo_mode=args.demo)

    while len([p for p in players if not p.is_bankrupt]) > 1:
        game.play_turn()
    
    winner = [p for p in players if not p.is_bankrupt][0]
    print(f"\nGame Over! The winner is {winner.name}!")

if __name__ == "__main__":
    main()
