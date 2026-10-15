/* ACE Ventures office canteen menu.
   Portions are typical corporate-canteen servings. Macros are AMFIT estimates from
   standard recipes, not lab values; kcal is derived from the macros so the two agree.
   Micros scale a per-100 g profile of the dish's main base by the solid weight.
   Micro order: vitA vitC vitD vitE vitK b1 b2 b3 b6 folate b12
                calcium iron magnesium potassium sodium zinc selenium phosphorus omega3 cholesterol */
(function () {
  const MI = ["vitA", "vitC", "vitD", "vitE", "vitK", "b1", "b2", "b3", "b6", "folate", "b12",
    "calcium", "iron", "magnesium", "potassium", "sodium", "zinc", "selenium", "phosphorus", "omega3", "cholesterol"];

  const BASE = {
    batter:        [12, 4, 0, 0.6, 4, 0.1, 0.05, 1.0, 0.1, 30, 0, 30, 1.2, 32, 220, 360, 0.7, 3, 95, 0.03, 0],
    batter_cheese: [40, 3, 0.1, 0.5, 3, 0.09, 0.09, 0.9, 0.09, 26, 0.2, 110, 1.0, 30, 200, 420, 1.0, 4, 140, 0.03, 14],
    noodles:       [20, 2, 0, 0.8, 3, 0.25, 0.1, 2.2, 0.05, 25, 0, 20, 1.4, 18, 120, 480, 0.4, 8, 70, 0.02, 0],
    egg:           [150, 0, 2, 1.1, 0.3, 0.05, 0.45, 0.1, 0.15, 45, 1.0, 55, 1.7, 12, 140, 320, 1.2, 30, 190, 0.08, 330],
    egg_bread:     [80, 10, 1, 0.8, 5, 0.15, 0.25, 1.5, 0.12, 40, 0.5, 50, 1.5, 20, 200, 420, 0.9, 18, 140, 0.05, 150],
    bread_veg:     [60, 6, 0, 0.8, 10, 0.2, 0.12, 2.2, 0.12, 45, 0, 90, 1.6, 28, 200, 460, 0.8, 12, 110, 0.04, 6],
    bread_cheese:  [90, 4, 0.2, 0.6, 6, 0.18, 0.18, 1.8, 0.1, 40, 0.4, 200, 1.4, 26, 170, 520, 1.4, 12, 190, 0.04, 22],
    chicken_bread: [40, 3, 0.1, 0.7, 6, 0.18, 0.14, 6.0, 0.3, 38, 0.2, 60, 1.5, 28, 240, 500, 1.2, 18, 170, 0.05, 40],
    pizza:         [80, 4, 0.1, 0.8, 5, 0.25, 0.2, 3.0, 0.1, 45, 0.4, 180, 1.8, 24, 190, 560, 1.4, 16, 190, 0.04, 18],
    fruit:         [20, 30, 0, 0.3, 3, 0.05, 0.04, 0.3, 0.06, 20, 0, 10, 0.2, 10, 180, 2, 0.1, 0.5, 15, 0.01, 0],
    salad:         [180, 18, 0, 0.8, 40, 0.06, 0.06, 0.6, 0.1, 50, 0, 30, 0.8, 18, 240, 180, 0.3, 1, 40, 0.03, 0],
    salad_chicken: [120, 12, 0.1, 0.8, 30, 0.08, 0.1, 4.5, 0.3, 40, 0.2, 25, 0.8, 22, 280, 260, 0.8, 12, 130, 0.05, 35]
  };

  const items = {};
  const sections = [];

  // grams = solid food weighed for micros; serving text names anything served alongside.
  function add(section, key, name, serving, grams, base, p, c, fat, fiber, sugar) {
    const k = grams / 100;
    const micros = {};
    MI.forEach(function (m, i) { micros[m] = Math.round(BASE[base][i] * k * 100) / 100; });
    items[key] = {
      name: name,
      serving: serving + " · " + grams + " g",
      grams: grams,
      menu: "ACE canteen",
      section: section,
      macros: { kcal: Math.round(4 * p + 4 * c + 9 * fat), protein: p, carbs: c, fat: fat, fiber: fiber, sugar: sugar },
      micros: micros
    };
    let s = sections.find(function (x) { return x.name === section; });
    if (!s) { s = { name: section, keys: [] }; sections.push(s); }
    s.keys.push(key);
  }

  add("Wraps", "ace_paneer_tikka_wrap", "Paneer tikka wrap", "1 wrap", 220, "bread_cheese", 18, 48, 20, 5, 5);
  add("Wraps", "ace_cheese_potato_wrap", "Cheese potato wrap", "1 wrap", 220, "bread_cheese", 11, 56, 18, 5, 4);
  add("Wraps", "ace_egg_kathi_roll_juice", "Egg kathi roll with juice", "1 roll + 200 ml juice", 200, "egg_bread", 15, 62, 16, 3, 20);
  add("Wraps", "ace_chicken_tikka_wrap", "Chicken tikka wrap", "1 wrap", 230, "chicken_bread", 26, 44, 16, 4, 4);
  add("Wraps", "ace_chicken_kathi_roll", "Chicken kathi roll", "1 roll", 220, "chicken_bread", 24, 46, 18, 3, 3);

  add("South Indian", "ace_plain_dosa", "Plain dosa", "1 dosa + chutney + sambar", 300, "batter", 9, 52, 10, 5, 4);
  add("South Indian", "ace_butter_dosa", "Butter dosa", "1 dosa + chutney + sambar", 300, "batter", 9, 52, 16, 5, 4);
  add("South Indian", "ace_cheese_dosa", "Cheese dosa", "1 dosa + chutney + sambar", 320, "batter_cheese", 14, 53, 18, 5, 4);
  add("South Indian", "ace_masala_dosa", "Masala dosa", "1 dosa + chutney + sambar", 380, "batter", 11, 72, 16, 7, 5);
  add("South Indian", "ace_cut_dosa", "Cut dosa", "1 dosa, cut + chutney + sambar", 300, "batter", 9, 54, 11, 5, 4);
  add("South Indian", "ace_mysore_masala_dosa", "Mysore masala dosa", "1 dosa + chutney + sambar", 400, "batter", 12, 76, 20, 7, 5);
  add("South Indian", "ace_cheese_masala_dosa", "Cheese masala dosa", "1 dosa + chutney + sambar", 420, "batter_cheese", 17, 76, 24, 7, 5);
  add("South Indian", "ace_schezwan_plain_dosa", "Schezwan plain dosa", "1 dosa + chutney + sambar", 310, "batter", 9, 56, 13, 5, 6);
  add("South Indian", "ace_schezwan_masala_dosa", "Schezwan masala dosa", "1 dosa + chutney + sambar", 410, "batter", 12, 78, 19, 7, 6);
  add("South Indian", "ace_plain_uttapam", "Plain uttapam", "1 uttapam + chutney + sambar", 320, "batter", 10, 58, 10, 5, 4);
  add("South Indian", "ace_onion_uttapam", "Onion uttapam", "1 uttapam + chutney + sambar", 340, "batter", 10, 61, 10, 6, 6);
  add("South Indian", "ace_tomato_uttapam", "Tomato uttapam", "1 uttapam + chutney + sambar", 340, "batter", 10, 61, 10, 6, 7);
  add("South Indian", "ace_masala_uttapam", "Masala uttapam", "1 uttapam + chutney + sambar", 380, "batter", 11, 70, 13, 7, 6);
  add("South Indian", "ace_cheese_uttapam", "Cheese uttapam", "1 uttapam + chutney + sambar", 350, "batter_cheese", 16, 60, 17, 5, 5);

  add("Maggi", "ace_plain_maggi", "Plain Maggi", "1 plate", 250, "noodles", 7, 52, 14, 2, 2);
  add("Maggi", "ace_veg_maggi", "Veg Maggi", "1 plate", 300, "noodles", 8, 56, 14, 4, 3);
  add("Maggi", "ace_veg_cheese_maggi", "Veg & cheese Maggi", "1 plate", 320, "noodles", 12, 57, 19, 4, 3);

  add("Eggs to order", "ace_boiled_egg", "Boiled eggs", "2 eggs", 100, "egg", 12.6, 1.1, 10.6, 0, 1);
  add("Eggs to order", "ace_fried_egg_easy", "Fried eggs, over easy", "2 eggs", 110, "egg", 13, 1, 15, 0, 1);
  add("Eggs to order", "ace_fried_egg_well", "Fried eggs, well done", "2 eggs", 110, "egg", 13, 1, 16, 0, 1);
  add("Eggs to order", "ace_plain_omelette", "Plain omelette", "2-egg omelette", 130, "egg", 13, 2, 15, 0, 1);
  add("Eggs to order", "ace_cheese_omelette", "Cheese omelette", "2-egg omelette", 150, "egg", 18, 2, 21, 0, 1);
  add("Eggs to order", "ace_masala_omelette", "Masala omelette", "2-egg omelette", 150, "egg", 13, 4, 15, 1, 2);
  add("Eggs to order", "ace_egg_bhurji", "Egg bhurji", "2 eggs", 150, "egg", 14, 5, 17, 1, 2);
  add("Eggs to order", "ace_boiled_egg_bhurji", "Boiled egg bhurji", "2 eggs", 160, "egg", 14, 6, 15, 1, 2);

  add("Fruits & juices", "ace_fresh_juice", "Seasonal fresh fruit juice", "1 glass (250 ml)", 250, "fruit", 1.5, 30, 0.5, 0.5, 26);
  add("Fruits & juices", "ace_fruit_salad_combo", "Fruit salad + juice + wafer", "200 g fruit + 200 ml juice + wafer", 400, "fruit", 3, 70, 8, 5, 50);

  add("Salads", "ace_veg_salad_juice", "Veg salad with juice", "1 bowl + 200 ml juice", 250, "salad", 5, 40, 8, 6, 26);
  add("Salads", "ace_nonveg_salad_juice", "Chicken / egg salad with juice", "1 bowl + 200 ml juice", 300, "salad_chicken", 24, 38, 12, 5, 24);

  add("Sandwiches & toast", "ace_cheese_chilly_toast", "Cheese chilly toast", "2 slices", 140, "bread_cheese", 13, 42, 15, 2, 4);
  add("Sandwiches & toast", "ace_bread_butter_jam", "Bread butter jam toast", "2 slices", 100, "bread_veg", 6, 50, 9, 2, 16);
  add("Sandwiches & toast", "ace_paneer_tikka_sandwich", "Paneer tikka sandwich", "1 sandwich", 200, "bread_cheese", 18, 44, 18, 4, 5);
  add("Sandwiches & toast", "ace_bombay_veg_sandwich", "Bombay veg sandwich", "1 sandwich", 200, "bread_veg", 9, 50, 12, 6, 5);
  add("Sandwiches & toast", "ace_veg_cheese_sandwich", "Veg & cheese sandwich", "1 sandwich", 200, "bread_cheese", 14, 46, 16, 4, 5);
  add("Sandwiches & toast", "ace_corn_cheese_sandwich", "Corn cheese sandwich", "1 sandwich", 200, "bread_cheese", 14, 50, 16, 4, 6);
  add("Sandwiches & toast", "ace_veg_club_sandwich", "Veg club sandwich", "3-slice club", 260, "bread_veg", 14, 62, 18, 6, 7);
  add("Sandwiches & toast", "ace_roast_chicken_sandwich", "Roast chicken sandwich", "1 sandwich", 210, "chicken_bread", 24, 42, 12, 3, 4);
  add("Sandwiches & toast", "ace_chicken_tikka_sandwich", "Chicken tikka sandwich", "1 sandwich", 210, "chicken_bread", 25, 42, 14, 3, 4);
  add("Sandwiches & toast", "ace_chicken_club_sandwich", "Chicken club sandwich", "3-slice club", 280, "chicken_bread", 30, 56, 20, 4, 6);

  add("Subs", "ace_grilled_veg_sub", "Grilled veg sub", "6-inch sub", 230, "bread_veg", 10, 54, 9, 6, 6);
  add("Subs", "ace_paneer_tikka_sub", "Paneer tikka sub", "6-inch sub", 250, "bread_cheese", 19, 54, 16, 5, 6);
  add("Subs", "ace_chicken_tikka_sub", "Chicken tikka sub", "6-inch sub", 250, "chicken_bread", 26, 52, 10, 4, 6);
  add("Subs", "ace_grilled_chicken_sub", "Grilled chicken sub", "6-inch sub", 250, "chicken_bread", 27, 50, 9, 4, 6);

  add("Burgers", "ace_veg_burger", "Veg burger", "1 burger", 170, "bread_veg", 9, 50, 14, 4, 6);
  add("Burgers", "ace_veg_cheese_burger", "Veg cheese burger", "1 burger", 190, "bread_cheese", 13, 51, 19, 4, 6);
  add("Burgers", "ace_chicken_burger", "Chicken burger", "1 burger", 180, "chicken_bread", 20, 44, 16, 3, 5);
  add("Burgers", "ace_chicken_cheese_burger", "Chicken cheese burger", "1 burger", 200, "chicken_bread", 24, 45, 21, 3, 5);

  add("Pizza", "ace_bombay_veg_pizza", "Bombay veg pizza", "1 personal pizza (8 in)", 250, "pizza", 18, 78, 20, 5, 7);
  add("Pizza", "ace_margherita_pizza", "Margherita pizza", "1 personal pizza (8 in)", 230, "pizza", 18, 72, 18, 4, 6);
  add("Pizza", "ace_double_cheese_pizza", "Double cheese pizza", "1 personal pizza (8 in)", 260, "pizza", 26, 72, 28, 4, 6);
  add("Pizza", "ace_english_veg_pizza", "English vegetable pizza", "1 personal pizza (8 in)", 260, "pizza", 18, 78, 19, 6, 7);
  add("Pizza", "ace_chicken_cheese_pizza", "Chicken cheese pizza", "1 personal pizza (8 in)", 270, "pizza", 32, 72, 26, 4, 6);
  add("Pizza", "ace_veg_chicken_pizza", "English vegetable & chicken pizza", "1 personal pizza (8 in)", 280, "pizza", 28, 76, 22, 5, 7);

  Object.assign(window.AMFIT_FOODS, items);
  window.AMFIT_CANTEEN_MENU = { name: "ACE canteen", sections: sections };
})();
