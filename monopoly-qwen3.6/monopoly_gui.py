#!/usr/bin/env python3
"""
Monopoly - A graphical board game for 2-6 players using tkinter.
"""

import tkinter as tk
from tkinter import ttk, messagebox
import random
import threading

# ─── Board Definitions ───────────────────────────────────────────────────────

class PropertyGroup:
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

COLOR_MAP = {
    PropertyGroup.BROWN: "#8B4513",
    PropertyGroup.LIGHT_BLUE: "#87CEEB",
    PropertyGroup.PINK: "#FF69B4",
    PropertyGroup.ORANGE: "#FFA500",
    PropertyGroup.RED: "#FF0000",
    PropertyGroup.YELLOW: "#FFD700",
    PropertyGroup.GREEN: "#008000",
    PropertyGroup.DARK_BLUE: "#00008B",
    PropertyGroup.RAILROAD: "#2F2F2F",
    PropertyGroup.UTILITY: "#808080",
}

SPACES = [
    ("GO", "go", None, 0, [], 0, 0, ""),
    ("Mediterranean Avenue", "property", PropertyGroup.BROWN, 60, [2, 10, 30, 90, 160, 250], 50, 30, "brown"),
    ("Community Chest", "community_chest", None, 0, [], 0, 0, ""),
    ("Baltic Avenue", "property", PropertyGroup.BROWN, 60, [4, 20, 60, 180, 320, 450], 50, 30, "brown"),
    ("Income Tax", "tax", None, 200, [], 0, 0, ""),
    ("Reading Railroad", "railroad", PropertyGroup.RAILROAD, 200, [25, 50, 100, 200], 0, 25, ""),
    ("Oriental Avenue", "property", PropertyGroup.LIGHT_BLUE, 100, [6, 30, 90, 270, 400, 550], 50, 50, "light_blue"),
    ("Chance", "chance", None, 0, [], 0, 0, ""),
    ("Vermont Avenue", "property", PropertyGroup.LIGHT_BLUE, 100, [6, 30, 90, 270, 400, 550], 50, 50, "light_blue"),
    ("Connecticut Avenue", "property", PropertyGroup.LIGHT_BLUE, 120, [8, 40, 100, 300, 450, 600], 50, 50, "light_blue"),
    ("Jail", "jail", None, 0, [], 0, 0, ""),
    ("St. Charles Place", "property", PropertyGroup.PINK, 140, [10, 50, 150, 450, 625, 750], 100, 70, "pink"),
    ("Electric Company", "utility", PropertyGroup.UTILITY, 150, [], 0, 0, ""),
    ("States Avenue", "property", PropertyGroup.PINK, 140, [10, 50, 150, 450, 625, 750], 100, 70, "pink"),
    ("Virginia Avenue", "property", PropertyGroup.PINK, 160, [12, 60, 180, 500, 700, 900], 100, 70, "pink"),
    ("Pennsylvania Railroad", "railroad", PropertyGroup.RAILROAD, 200, [25, 50, 100, 200], 0, 25, ""),
    ("St. James Place", "property", PropertyGroup.ORANGE, 180, [14, 70, 200, 550, 750, 950], 100, 90, "orange"),
    ("Community Chest", "community_chest", None, 0, [], 0, 0, ""),
    ("Tennessee Avenue", "property", PropertyGroup.ORANGE, 180, [14, 70, 200, 550, 750, 950], 100, 90, "orange"),
    ("New York Avenue", "property", PropertyGroup.ORANGE, 200, [16, 80, 220, 600, 800, 1000], 100, 90, "orange"),
    ("Free Parking", "parking", None, 0, [], 0, 0, ""),
    ("Kentucky Avenue", "property", PropertyGroup.RED, 220, [18, 90, 250, 700, 875, 1050], 100, 110, "red"),
    ("Chance", "chance", None, 0, [], 0, 0, ""),
    ("Indiana Avenue", "property", PropertyGroup.RED, 220, [18, 90, 250, 700, 875, 1050], 100, 110, "red"),
    ("Illinois Avenue", "property", PropertyGroup.RED, 240, [20, 100, 300, 750, 925, 1100], 100, 110, "red"),
    ("B&O Railroad", "railroad", PropertyGroup.RAILROAD, 200, [25, 50, 100, 200], 0, 25, ""),
    ("Atlantic Avenue", "property", PropertyGroup.YELLOW, 260, [22, 110, 330, 800, 975, 1150], 100, 130, "yellow"),
    ("Ventnor Avenue", "property", PropertyGroup.YELLOW, 260, [22, 110, 330, 800, 975, 1150], 100, 130, "yellow"),
    ("Water Works", "utility", PropertyGroup.UTILITY, 150, [], 0, 0, ""),
    ("Marvin Gardens", "property", PropertyGroup.YELLOW, 280, [24, 120, 360, 850, 1025, 1200], 100, 130, "yellow"),
    ("Go To Jail", "go_to_jail", None, 0, [], 0, 0, ""),
    ("Pacific Avenue", "property", PropertyGroup.GREEN, 300, [26, 130, 390, 900, 1100, 1275], 100, 150, "green"),
    ("North Carolina Avenue", "property", PropertyGroup.GREEN, 300, [26, 130, 390, 900, 1100, 1275], 100, 150, "green"),
    ("Community Chest", "community_chest", None, 0, [], 0, 0, ""),
    ("Pennsylvania Avenue", "property", PropertyGroup.GREEN, 320, [28, 150, 450, 1000, 1200, 1400], 100, 150, "green"),
    ("Short Line Railroad", "railroad", PropertyGroup.RAILROAD, 200, [25, 50, 100, 200], 0, 25, ""),
    ("Chance", "chance", None, 0, [], 0, 0, ""),
    ("Park Place", "property", PropertyGroup.DARK_BLUE, 350, [35, 175, 500, 1100, 1300, 1500], 100, 175, "dark_blue"),
    ("Luxury Tax", "tax", None, 100, [], 0, 0, ""),
    ("Boardwalk", "property", PropertyGroup.DARK_BLUE, 400, [50, 200, 600, 1400, 1700, 2000], 100, 200, "dark_blue"),
]

CHANCE_CARDS = [
    ("Advance to Go (Collect $200)", "advance_to_go"),
    ("Advance to Boardwalk", "advance_to", 39),
    ("Advance to nearest Utility. Pay owner 10x dice roll.", "advance_to_nearest_utility"),
    ("Advance to nearest Railroad. Pay owner double rent.", "advance_to_nearest_railroad_double"),
    ("Bank pays you dividend of $50", "get_money", 50),
    ("Get Out of Jail Free card", "get_out_of_jail_free"),
    ("Go back 3 spaces", "go_back_3"),
    ("Go to Jail. Do not pass Go.", "go_to_jail"),
    ("Make general repairs: $25/house, $100/hotel", "repair_houses"),
    ("Pay poor tax of $15", "pay_money", 15),
    ("Take a trip to Reading Railroad. Collect $200.", "advance_to", 5),
    ("Building loan matures. Collect $150", "get_money", 150),
    ("Pay each player $50", "pay_each_player", 50),
    ("Crossword competition. Collect $100", "get_money", 100),
]

COMMUNITY_CHEST_CARDS = [
    ("Advance to Go (Collect $200)", "advance_to_go"),
    ("Bank error in your favor. Collect $200", "get_money", 200),
    ("Doctor's fees. Pay $50", "pay_money", 50),
    ("From sale of stock you get $50", "get_money", 50),
    ("Get Out of Jail Free card", "get_out_of_jail_free"),
    ("Go to Jail. Do not pass Go.", "go_to_jail"),
    ("Holiday fund matures. Receive $100", "get_money", 100),
    ("Income tax refund. Collect $20", "get_money", 20),
    ("Insurance policy matures. Collect $100", "get_money", 100),
    ("Inheritance. Collect $100", "get_money", 100),
    ("Pay hospital fees of $100", "pay_money", 100),
    ("Pay school fees of $50", "pay_money", 50),
    ("Receive $25 consultancy fee", "get_money", 25),
    ("Street repairs: $40/house, $115/hotel", "repair_houses_heavy"),
]


class Player:
    def __init__(self, name, color):
        self.name = name
        self.money = 1500
        self.position = 0
        self.in_jail = False
        self.jail_turns = 0
        self.properties = []
        self.houses = {}
        self.mortgaged = set()
        self.jail_free_cards = 0
        self.bankrupt = False
        self.color = color


class MonopolyGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Monopoly")
        self.players = []
        self.current_player = 0
        self.properties_owned = {}
        self.dice_values = (0, 0)
        self.game_active = False
        self.chance_deck = self._shuffle(CHANCE_CARDS)
        self.chest_deck = self._shuffle(COMMUNITY_CHEST_CARDS)
        self.setup_screen()

    def _shuffle(self, deck):
        d = deck.copy()
        random.shuffle(d)
        return d

    def _draw_card(self, deck):
        if not deck:
            if deck is self.chance_deck:
                self.chance_deck = self._shuffle(CHANCE_CARDS)
                return self.chance_deck.pop(0)
            else:
                self.chest_deck = self._shuffle(COMMUNITY_CHEST_CARDS)
                return self.chest_deck.pop(0)
        return deck.pop(0)

    def setup_screen(self):
        for w in self.root.wframe if hasattr(self.root, 'wframe') else self.root.winfo_children():
            w.destroy()

        frame = ttk.Frame(self.root, padding="20")
        frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(frame, text="MONOPOLY", font=("Helvetica", 28, "bold")).pack(pady=(0, 20))
        ttk.Label(frame, text="Setup", font=("Helvetica", 14)).pack(pady=(0, 30))

        ttk.Label(frame, text="Number of players:").pack(pady=5)
        self.num_var = tk.StringVar(value="2")
        ttk.Combobox(frame, textvariable=self.num_var, values=["2", "3", "4", "5", "6"],
                     state="readonly", width=10).pack(pady=5)

        self.name_entries = []
        name_frame = ttk.Frame(frame)
        name_frame.pack(pady=20)
        ttk.Label(name_frame, text="Player names:", font=("Helvetica", 11, "bold")).grid(row=0, column=0, columnspan=2, pady=(0, 10))

        colors = ["#FF4444", "#4444FF", "#44AA44", "#FF44FF", "#FFAA00", "#00AAAA"]
        for i in range(6):
            lbl = ttk.Label(name_frame, text=f"Player {i+1}:")
            lbl.grid(row=i+1, column=0, padx=5, pady=3, sticky=tk.E)
            entry = ttk.Entry(name_frame, width=20)
            entry.grid(row=i+1, column=1, padx=5, pady=3)
            self.name_entries.append((entry, colors[i]))

        ttk.Button(frame, text="Start Game", command=self.start_game,
                   style="Accent.TButton").pack(pady=20)

    def start_game(self):
        try:
            num = int(self.num_var.get())
        except:
            messagebox.showerror("Error", "Invalid number of players")
            return

        names = []
        colors = []
        for i in range(num):
            name = self.name_entries[i][0].get().strip()
            if not name:
                name = f"Player {i+1}"
            names.append(name)
            colors.append(self.name_entries[i][1])

        for w in self.root.winfo_children():
            w.destroy()

        self.players = [Player(n, c) for n, c in zip(names, colors)]
        self.game_active = True
        self.current_player = 0
        self.properties_owned = {}
        self.build_game_screen()

    def build_game_screen(self):
        main_frame = ttk.Frame(self.root, padding="5")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Board frame
        board_frame = ttk.Frame(main_frame)
        board_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(board_frame, width=600, height=600, bg="white")
        self.canvas.pack(fill=tk.BOTH, expand=True)

        # Side panel
        side_frame = ttk.Frame(main_frame, width=250)
        side_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=(10, 0))
        side_frame.pack_propagate(False)

        self.info_frame = ttk.Frame(side_frame)
        self.info_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        self.dice_frame = ttk.Frame(side_frame)
        self.dice_frame.pack(pady=10)

        self.dice1_var = tk.StringVar(value="🎲")
        self.dice2_var = tk.StringVar(value="🎲")
        ttk.Label(self.dice_frame, textvariable=self.dice1_var, font=("Helvetica", 32)).pack(side=tk.LEFT, padx=10)
        ttk.Label(self.dice_frame, textvariable=self.dice2_var, font=("Helvetica", 32)).pack(side=tk.LEFT, padx=10)

        self.roll_btn = ttk.Button(side_frame, text="Roll Dice", command=self.roll_dice,
                                    style="Accent.TButton")
        self.roll_btn.pack(pady=10)

        self.log_text = tk.Text(side_frame, height=8, width=30, state=tk.DISABLED, bg="#f0f0f0")
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        self.status_text = tk.Text(side_frame, height=6, width=30, state=tk.DISABLED, bg="#e8f4e8")
        self.status_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        self.draw_board()
        self.update_status()

    def draw_board(self):
        self.canvas.delete("all")
        self.canvas.config(bg="#2E8B57")

        cell_size = 14
        board_size = 40

        # Draw cells
        for i in range(40):
            x, y = self.get_cell_coords(i)
            space = SPACES[i]
            name, stype, group, price, rent, house_cost, _, color = space

            # Cell background
            if stype == "property" and color:
                fill = COLOR_MAP.get(color, "#ddd")
            elif stype == "railroad":
                fill = "#2F2F2F"
            elif stype == "utility":
                fill = "#808080"
            elif stype in ("chance", "community_chest"):
                fill = "#FFE4B5"
            elif stype == "tax":
                fill = "#FFB6C1"
            else:
                fill = "#90EE90"

            self.canvas.create_rectangle(x, y, x+cell_size, y+cell_size, fill=fill, outline="black", width=1)

            # Color bar for properties
            if stype == "property" and color:
                bar_size = 3
                if i in range(0, 40):
                    # Determine bar position based on cell location
                    if i == 0:  # GO - bottom
                        self.canvas.create_rectangle(x+1, y+cell_size-bar_size, x+cell_size-1, y+cell_size, fill=COLOR_MAP[color])
                    elif i in range(1, 10):  # right side
                        self.canvas.create_rectangle(x+cell_size-bar_size, y+1, x+cell_size, y+cell_size-1, fill=COLOR_MAP[color])
                    elif i == 10:  # Jail - right
                        self.canvas.create_rectangle(x+cell_size-bar_size, y+1, x+cell_size, y+cell_size-1, fill=COLOR_MAP[color])
                    elif i in range(11, 20):  # top
                        self.canvas.create_rectangle(x+1, y, x+cell_size-1, y+bar_size, fill=COLOR_MAP[color])
                    elif i == 20:  # Free Parking - top
                        self.canvas.create_rectangle(x+1, y, x+cell_size-1, y+bar_size, fill=COLOR_MAP[color])
                    elif i in range(21, 30):  # left side
                        self.canvas.create_rectangle(x, y+1, x+bar_size, y+cell_size-1, fill=COLOR_MAP[color])
                    elif i == 30:  # Go To Jail - left
                        self.canvas.create_rectangle(x, y+1, x+bar_size, y+cell_size-1, fill=COLOR_MAP[color])
                    else:  # bottom
                        self.canvas.create_rectangle(x+1, y+cell_size-bar_size, x+cell_size-1, y+cell_size, fill=COLOR_MAP[color])

            # Cell text
            text_size = 4
            tx, ty = x + cell_size/2, y + cell_size/2
            self.canvas.create_text(tx, ty, text=name[:8], font=("Arial", text_size, "bold"),
                                     fill="black", anchor="center")

            # Price
            if price > 0:
                self.canvas.create_text(tx, ty+4, text=f"${price}", font=("Arial", 3),
                                         fill="black", anchor="n")

            # Owner indicators
            for player in self.players:
                if player.name in self.properties_owned.values():
                    owner_idx = list(self.properties_owned.values()).index(player.name)
                    if SPACES[i][0] in player.properties:
                        ox = x + 2
                        oy = y + 2
                        self.canvas.create_oval(ox, oy, ox+4, oy+4, fill=player.color, outline="black")

            # Houses
            for player in self.players:
                if SPACES[i][0] in player.houses and player.houses[SPACES[i][0]] > 0:
                    houses = player.houses[SPACES[i][0]]
                    hx, hy = x + cell_size/2, y + cell_size/2
                    if houses == 5:
                        self.canvas.create_rectangle(hx-3, hy-3, hx+3, hy+3, fill="red", outline="black")
                    else:
                        for h in range(houses):
                            self.canvas.create_oval(hx-2, hy-2+h*2, hx+2, hy+2+h*2, fill="green", outline="black")

        # Player tokens
        for idx, player in enumerate(self.players):
            if not player.bankrupt:
                px, py = self.get_cell_coords(player.position)
                offset_x = (idx % 2) * 4 - 2
                offset_y = (idx // 2) * 4 - 2
                self.canvas.create_oval(px+cell_size/2-5+offset_x, py+cell_size/2-5+offset_y,
                                         px+cell_size/2+5+offset_x, py+cell_size/2+5+offset_y,
                                         fill=player.color, outline="black", width=2)
                self.canvas.create_text(px+cell_size/2+offset_x, py+cell_size/2+offset_y-8,
                                         text=player.name[0], font=("Arial", 6, "bold"),
                                         fill="white")

        # Center text
        self.canvas.create_text(300, 300, text="MONOPOLY", font=("Helvetica", 20, "bold"), fill="white")
        self.canvas.create_text(300, 325, text=f"Turn: {self.players[self.current_player].name}",
                                 font=("Helvetica", 10), fill="yellow")

    def get_cell_coords(self, index):
        """Get (x, y) for cell index on the board perimeter."""
        cell_size = 14
        if index == 0:
            return (546, 546)
        elif index < 10:
            return (546 - index * cell_size, 546)
        elif index == 10:
            return (0, 546)
        elif index < 20:
            return (0, 546 - (index - 10) * cell_size)
        elif index == 20:
            return (0, 0)
        elif index < 30:
            return (0 + (index - 20) * cell_size, 0)
        elif index == 30:
            return (546, 0)
        else:
            return (546, 0 + (index - 30) * cell_size)

    def log(self, msg):
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, msg + "\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

    def update_status(self):
        self.status_text.config(state=tk.NORMAL)
        self.status_text.delete(1.0, tk.END)
        for idx, player in enumerate(self.players):
            marker = "▶ " if idx == self.current_player else "  "
            jail = " [JAIL]" if player.in_jail else ""
            bankrupt = " [BANKRUPT]" if player.bankrupt else ""
            props = ", ".join(player.properties[:3])
            if len(player.properties) > 3:
                props += "..."
            line = f"{marker}{player.name}: ${player.money}{jail}{bankrupt}\n"
            line += f"    {props}\n"
            self.status_text.insert(tk.END, line)
        self.status_text.config(state=tk.DISABLED)

    def roll_dice(self):
        if not self.game_active:
            return

        self.roll_btn.config(state=tk.DISABLED)
        player = self.players[self.current_player]

        if player.bankrupt:
            self.next_player()
            self.roll_btn.config(state=tk.NORMAL)
            return

        # Animate dice
        for _ in range(10):
            d1, d2 = random.randint(1, 6), random.randint(1, 6)
            self.dice_values = (d1, d2)
            self.dice1_var.set(str(d1))
            self.dice2_var.set(str(d2))
            self.root.update()
            self.root.after(50)

        d1, d2 = random.randint(1, 6), random.randint(1, 6)
        self.dice_values = (d1, d2)
        self.dice1_var.set(str(d1))
        self.dice2_var.set(str(d2))
        total = d1 + d2
        is_double = d1 == d2

        self.log(f"{player.name} rolled {d1} + {d2} = {total}" + (" (DOUBLES!)" if is_double else ""))

        # Jail logic
        if player.in_jail:
            if is_double:
                player.in_jail = False
                player.jail_turns = 0
                self.log(f"{player.name} rolled doubles and is free!")
            else:
                player.jail_turns += 1
                if player.jail_turns >= 3:
                    player.money -= 50
                    player.in_jail = False
                    player.jail_turns = 0
                    self.log(f"{player.name} paid $50 after 3 turns in jail.")
                else:
                    self.log(f"{player.name} stays in jail.")
                    self.next_player()
                    self.draw_board()
                    self.update_status()
                    self.roll_btn.config(state=tk.NORMAL)
                    return

        # Move
        old_pos = player.position
        player.position = (player.position + total) % 40

        if player.position < old_pos and total > 0:
            player.money += 200
            self.log(f"{player.name} passes GO! +$200")

        self.log(f"{player.name} lands on {SPACES[player.position][0]}")

        # Handle space
        self.handle_space(player)

        # Check doubles
        if is_double and not player.in_jail:
            self.log("Doubles! Roll again.")
            self.draw_board()
            self.update_status()
            self.roll_btn.config(state=tk.NORMAL)
            return
        else:
            self.next_player()

        self.draw_board()
        self.update_status()
        self.roll_btn.config(state=tk.NORMAL)

    def handle_space(self, player):
        space = SPACES[player.position]
        name, stype, group, price, rent, house_cost, _, color = space

        if stype == "tax":
            player.money -= price
            self.log(f"  Paid ${price} in taxes")

        elif stype == "go_to_jail":
            self.log("  Go to Jail!")
            player.position = 10
            player.in_jail = True
            player.jail_turns = 0

        elif stype == "chance":
            self.draw_and_apply_card(player, self.chance_deck, CHANCE_CARDS, "Chance")

        elif stype == "community_chest":
            self.draw_and_apply_card(player, self.chest_deck, COMMUNITY_CHEST_CARDS, "Community Chest")

        elif stype in ("property", "railroad", "utility"):
            owner_name = self.properties_owned.get(name)

            if owner_name is None:
                # Auto-buy if can afford
                if player.money >= price:
                    buy = messagebox.askyesno("Buy?", f"Buy {name} for ${price}?")
                    if buy:
                        player.money -= price
                        player.properties.append(name)
                        player.houses[name] = 0
                        self.properties_owned[name] = player.name
                        self.log(f"  Bought {name} for ${price}")
                else:
                    self.log(f"  Can't afford ${price}")
            elif owner_name != player.name:
                owner = next(p for p in self.players if p.name == owner_name)
                if name not in owner.mortgaged:
                    rent = self.calculate_rent(space, owner)
                    if rent > 0:
                        player.money -= rent
                        owner.money += rent
                        self.log(f"  Paid ${rent} rent to {owner_name}")
                        self.check_bankruptcy(player, owner)
                else:
                    self.log("  Property is mortgaged")

    def draw_and_apply_card(self, player, deck, default_deck, label):
        card = self._draw_card(deck)
        action = card[1]
        self.log(f"  *** {label}: {card[0]} ***")

        if action == "advance_to_go":
            old = player.position
            player.position = 0
            if player.position < old:
                player.money += 200
                self.log("  Collected $200 from GO")

        elif action == "advance_to" and len(card) > 2:
            player.position = card[2]
            old = 0
            if player.position < old:
                player.money += 200
                self.log("  Collected $200 from GO")

        elif action == "get_money" and len(card) > 2:
            player.money += card[2]
            self.log(f"  Collected ${card[2]}")

        elif action == "pay_money" and len(card) > 2:
            player.money -= card[2]
            self.log(f"  Paid ${card[2]}")
            self.check_bankruptcy(player)

        elif action == "go_to_jail":
            player.position = 10
            player.in_jail = True
            player.jail_turns = 0
            self.log("  Sent to Jail!")

        elif action == "get_out_of_jail_free":
            player.jail_free_cards += 1
            self.log("  Got Get Out of Jail Free card!")

        elif action == "go_back_3":
            player.position = (player.position - 3) % 40
            self.handle_space(player)

        elif action == "advance_to_nearest_utility":
            for u in [12, 28]:
                if u > player.position:
                    player.position = u
                    break
            else:
                player.position = 12
            self.handle_space(player)

        elif action == "advance_to_nearest_railroad_double":
            for r in [5, 15, 25, 35]:
                if r > player.position:
                    player.position = r
                    break
            else:
                player.position = 5
            self.handle_space(player)

        elif action == "repair_houses":
            total = 0
            for pn in player.properties:
                s = SPACES[self._find_index(pn)]
                if s[1] == "property":
                    h = player.houses.get(pn, 0)
                    if h == 5:
                        total += 100
                    elif h > 0:
                        total += 25 * h
            if total > 0:
                player.money -= total
                self.log(f"  Paid ${total} for repairs")
                self.check_bankruptcy(player)

        elif action == "repair_houses_heavy":
            total = 0
            for pn in player.properties:
                s = SPACES[self._find_index(pn)]
                if s[1] == "property":
                    h = player.houses.get(pn, 0)
                    if h == 5:
                        total += 115
                    elif h > 0:
                        total += 40 * h
            if total > 0:
                player.money -= total
                self.log(f"  Paid ${total} for repairs")
                self.check_bankruptcy(player)

        elif action == "pay_each_player" and len(card) > 2:
            amt = card[2]
            total = amt * (len(self.players) - 1)
            if player.money >= total:
                player.money -= total
                for p in self.players:
                    if p.name != player.name and not p.bankrupt:
                        p.money += amt
                self.log(f"  Paid ${amt} to each player")
                self.check_bankruptcy(player)

    def calculate_rent(self, space, owner):
        name, stype, group, price, rent, house_cost, _, color = space

        if stype == "railroad":
            count = sum(1 for s in SPACES if s[1] == "railroad" and s[0] in owner.properties)
            return [25, 50, 100, 200][min(count-1, 3)]

        if stype == "utility":
            d1, d2 = random.randint(1, 6), random.randint(1, 6)
            return (d1 + d2) * 10

        if stype == "property":
            houses = owner.houses.get(name, 0)
            if houses == 0 and rent:
                return rent[0]
            elif houses == 5 and rent:
                return rent[5]
            elif rent and houses < len(rent):
                return rent[houses]
        return 0

    def _find_index(self, name):
        for i, s in enumerate(SPACES):
            if s[0] == name:
                return i
        return 0

    def check_bankruptcy(self, player, creditor=None):
        if player.money < 0:
            self.log(f"  *** {player.name} is BANKRUPT! ***")
            player.bankrupt = True
            player.in_jail = False

            for pn in player.properties:
                if pn in self.properties_owned:
                    del self.properties_owned[pn]

            active = [p for p in self.players if not p.bankrupt]
            if len(active) == 1:
                self.game_active = False
                messagebox.showinfo("Game Over", f"🏆 {active[0].name} wins!")
                self.roll_btn.config(state=tk.DISABLED)

    def next_player(self):
        while True:
            self.current_player = (self.current_player + 1) % len(self.players)
            if not self.players[self.current_player].bankrupt:
                break


def main():
    root = tk.Tk()
    app = MonopolyGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
