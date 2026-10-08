/* AMFIT nutrient catalog — macros + micros per typical serving. Values are USDA-style estimates. */
window.AMFIT_FOODS = {
  scrambled_eggs: {
    name: "Scrambled eggs", serving: "2 large eggs (100g)",
    macros: { kcal: 148, protein: 10.0, carbs: 1.6, fat: 11.0, fiber: 0, sugar: 1.1 },
    micros: { vitA: 160, vitC: 0, vitD: 2.0, vitE: 1.1, vitK: 0.3, b1: 0.04, b2: 0.46, b3: 0.1, b6: 0.14, folate: 36, b12: 0.89, calcium: 56, iron: 1.2, magnesium: 10, potassium: 138, sodium: 142, zinc: 1.1, selenium: 23, phosphorus: 172, omega3: 0.08, cholesterol: 372 }
  },
  oatmeal: {
    name: "Oatmeal with berries", serving: "1 bowl (250g)",
    macros: { kcal: 220, protein: 6.5, carbs: 40, fat: 4.2, fiber: 6.5, sugar: 9 },
    micros: { vitA: 8, vitC: 18, vitD: 0, vitE: 0.6, vitK: 8, b1: 0.22, b2: 0.08, b3: 0.5, b6: 0.08, folate: 22, b12: 0, calcium: 42, iron: 1.8, magnesium: 58, potassium: 220, sodium: 8, zinc: 1.4, selenium: 10, phosphorus: 162, omega3: 0.05, cholesterol: 0 }
  },
  avocado_toast: {
    name: "Avocado toast", serving: "1 slice + 1/2 avocado",
    macros: { kcal: 290, protein: 6.2, carbs: 24, fat: 20, fiber: 8.5, sugar: 2.1 },
    micros: { vitA: 12, vitC: 8, vitD: 0, vitE: 2.4, vitK: 18, b1: 0.12, b2: 0.1, b3: 2.2, b6: 0.2, folate: 68, b12: 0, calcium: 32, iron: 1.3, magnesium: 42, potassium: 520, sodium: 280, zinc: 0.8, selenium: 8, phosphorus: 90, omega3: 0.11, cholesterol: 0 }
  },
  greek_yogurt: {
    name: "Greek yogurt bowl", serving: "170g + fruit + honey",
    macros: { kcal: 210, protein: 17, carbs: 28, fat: 3.5, fiber: 2.2, sugar: 22 },
    micros: { vitA: 18, vitC: 22, vitD: 0.4, vitE: 0.2, vitK: 2, b1: 0.06, b2: 0.28, b3: 0.3, b6: 0.08, folate: 18, b12: 0.75, calcium: 180, iron: 0.3, magnesium: 22, potassium: 280, sodium: 65, zinc: 1.0, selenium: 12, phosphorus: 200, omega3: 0.02, cholesterol: 12 }
  },
  banana: {
    name: "Banana", serving: "1 medium (118g)",
    macros: { kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14 },
    micros: { vitA: 4, vitC: 10, vitD: 0, vitE: 0.1, vitK: 0.5, b1: 0.04, b2: 0.09, b3: 0.8, b6: 0.43, folate: 24, b12: 0, calcium: 6, iron: 0.3, magnesium: 32, potassium: 422, sodium: 1, zinc: 0.2, selenium: 1, phosphorus: 26, omega3: 0.03, cholesterol: 0 }
  },
  pancake: {
    name: "Pancakes", serving: "3 medium pancakes",
    macros: { kcal: 350, protein: 8, carbs: 52, fat: 12, fiber: 2, sugar: 12 },
    micros: { vitA: 45, vitC: 0.4, vitD: 0.4, vitE: 1.2, vitK: 4, b1: 0.28, b2: 0.26, b3: 2.1, b6: 0.08, folate: 48, b12: 0.22, calcium: 140, iron: 2.4, magnesium: 22, potassium: 160, sodium: 620, zinc: 0.7, selenium: 16, phosphorus: 160, omega3: 0.04, cholesterol: 68 }
  },
  bagel: {
    name: "Bagel with cream cheese", serving: "1 bagel (105g)",
    macros: { kcal: 360, protein: 11, carbs: 56, fat: 10, fiber: 2.4, sugar: 7 },
    micros: { vitA: 90, vitC: 0, vitD: 0.1, vitE: 0.3, vitK: 1.2, b1: 0.38, b2: 0.22, b3: 3.4, b6: 0.08, folate: 90, b12: 0.12, calcium: 80, iron: 3.2, magnesium: 28, potassium: 120, sodium: 540, zinc: 0.9, selenium: 28, phosphorus: 110, omega3: 0.03, cholesterol: 22 }
  },
  smoothie: {
    name: "Green smoothie", serving: "16 oz (480ml)",
    macros: { kcal: 240, protein: 8, carbs: 42, fat: 5, fiber: 7, sugar: 26 },
    micros: { vitA: 280, vitC: 72, vitD: 0, vitE: 2.1, vitK: 180, b1: 0.12, b2: 0.22, b3: 1.1, b6: 0.32, folate: 90, b12: 0.4, calcium: 160, iron: 2.1, magnesium: 68, potassium: 720, sodium: 70, zinc: 0.9, selenium: 4, phosphorus: 140, omega3: 0.35, cholesterol: 5 }
  },
  coffee_breakfast: {
    name: "Latte with croissant", serving: "12oz latte + 1 croissant",
    macros: { kcal: 380, protein: 10, carbs: 38, fat: 20, fiber: 1.5, sugar: 14 },
    micros: { vitA: 140, vitC: 0.2, vitD: 1.2, vitE: 0.8, vitK: 4, b1: 0.18, b2: 0.32, b3: 1.4, b6: 0.08, folate: 42, b12: 0.6, calcium: 220, iron: 1.6, magnesium: 32, potassium: 280, sodium: 380, zinc: 1.0, selenium: 14, phosphorus: 180, omega3: 0.06, cholesterol: 55 }
  },
  grilled_chicken: {
    name: "Grilled chicken bowl", serving: "150g chicken + rice + veg",
    macros: { kcal: 520, protein: 42, carbs: 48, fat: 14, fiber: 5, sugar: 6 },
    micros: { vitA: 420, vitC: 38, vitD: 0.2, vitE: 1.4, vitK: 45, b1: 0.18, b2: 0.22, b3: 14, b6: 0.95, folate: 48, b12: 0.35, calcium: 62, iron: 2.4, magnesium: 68, potassium: 780, sodium: 480, zinc: 2.1, selenium: 32, phosphorus: 380, omega3: 0.08, cholesterol: 110 }
  },
  salmon: {
    name: "Baked salmon", serving: "150g fillet + greens",
    macros: { kcal: 410, protein: 36, carbs: 8, fat: 26, fiber: 3, sugar: 2 },
    micros: { vitA: 90, vitC: 22, vitD: 12.4, vitE: 2.8, vitK: 70, b1: 0.22, b2: 0.38, b3: 8.4, b6: 0.82, folate: 32, b12: 4.8, calcium: 48, iron: 1.1, magnesium: 48, potassium: 640, sodium: 220, zinc: 0.8, selenium: 38, phosphorus: 360, omega3: 2.2, cholesterol: 85 }
  },
  pizza: {
    name: "Pizza", serving: "2 slices (214g)",
    macros: { kcal: 570, protein: 24, carbs: 68, fat: 22, fiber: 4, sugar: 8 },
    micros: { vitA: 180, vitC: 6, vitD: 0.2, vitE: 1.8, vitK: 12, b1: 0.32, b2: 0.28, b3: 4.2, b6: 0.16, folate: 80, b12: 0.6, calcium: 320, iron: 3.6, magnesium: 42, potassium: 320, sodium: 1180, zinc: 2.4, selenium: 28, phosphorus: 280, omega3: 0.12, cholesterol: 48 }
  },
  burger: {
    name: "Cheeseburger", serving: "1 burger (220g)",
    macros: { kcal: 540, protein: 28, carbs: 40, fat: 30, fiber: 2.2, sugar: 8 },
    micros: { vitA: 90, vitC: 2, vitD: 0.3, vitE: 0.8, vitK: 8, b1: 0.28, b2: 0.32, b3: 6.8, b6: 0.32, folate: 48, b12: 1.8, calcium: 180, iron: 3.8, magnesium: 38, potassium: 420, sodium: 980, zinc: 4.8, selenium: 24, phosphorus: 280, omega3: 0.08, cholesterol: 95 }
  },
  burrito: {
    name: "Burrito", serving: "1 burrito (350g)",
    macros: { kcal: 620, protein: 28, carbs: 72, fat: 24, fiber: 10, sugar: 6 },
    micros: { vitA: 160, vitC: 12, vitD: 0.1, vitE: 1.6, vitK: 18, b1: 0.32, b2: 0.24, b3: 4.8, b6: 0.38, folate: 92, b12: 0.4, calcium: 220, iron: 4.2, magnesium: 78, potassium: 680, sodium: 1120, zinc: 2.8, selenium: 18, phosphorus: 340, omega3: 0.15, cholesterol: 55 }
  },
  sushi: {
    name: "Sushi platter", serving: "8 pieces (240g)",
    macros: { kcal: 350, protein: 18, carbs: 52, fat: 6, fiber: 1.5, sugar: 8 },
    micros: { vitA: 40, vitC: 2, vitD: 1.8, vitE: 0.6, vitK: 4, b1: 0.12, b2: 0.08, b3: 4.2, b6: 0.22, folate: 28, b12: 1.4, calcium: 28, iron: 1.2, magnesium: 32, potassium: 280, sodium: 720, zinc: 0.8, selenium: 22, phosphorus: 180, omega3: 0.4, cholesterol: 28 }
  },
  pasta: {
    name: "Pasta marinara", serving: "1 plate (300g)",
    macros: { kcal: 430, protein: 14, carbs: 72, fat: 9, fiber: 5, sugar: 10 },
    micros: { vitA: 220, vitC: 18, vitD: 0, vitE: 2.4, vitK: 22, b1: 0.28, b2: 0.16, b3: 4.8, b6: 0.18, folate: 48, b12: 0, calcium: 48, iron: 2.8, magnesium: 52, potassium: 420, sodium: 640, zinc: 1.4, selenium: 32, phosphorus: 160, omega3: 0.06, cholesterol: 0 }
  },
  salad: {
    name: "Garden salad with chicken", serving: "1 large bowl (320g)",
    macros: { kcal: 320, protein: 28, carbs: 16, fat: 16, fiber: 6, sugar: 7 },
    micros: { vitA: 620, vitC: 48, vitD: 0.1, vitE: 2.8, vitK: 140, b1: 0.14, b2: 0.18, b3: 9.2, b6: 0.62, folate: 110, b12: 0.22, calcium: 90, iron: 2.2, magnesium: 48, potassium: 680, sodium: 380, zinc: 1.4, selenium: 18, phosphorus: 240, omega3: 0.22, cholesterol: 72 }
  },
  steak: {
    name: "Steak and vegetables", serving: "170g steak + veg",
    macros: { kcal: 480, protein: 42, carbs: 12, fat: 28, fiber: 4, sugar: 5 },
    micros: { vitA: 380, vitC: 32, vitD: 0.2, vitE: 1.2, vitK: 55, b1: 0.12, b2: 0.28, b3: 8.6, b6: 0.72, folate: 32, b12: 2.4, calcium: 42, iron: 4.6, magnesium: 42, potassium: 720, sodium: 320, zinc: 7.2, selenium: 28, phosphorus: 340, omega3: 0.06, cholesterol: 125 }
  },
  rice_bowl: {
    name: "Rice and vegetables", serving: "1 bowl (350g)",
    macros: { kcal: 390, protein: 9, carbs: 72, fat: 6, fiber: 5, sugar: 6 },
    micros: { vitA: 340, vitC: 28, vitD: 0, vitE: 1.1, vitK: 40, b1: 0.18, b2: 0.08, b3: 3.2, b6: 0.28, folate: 42, b12: 0, calcium: 48, iron: 1.8, magnesium: 58, potassium: 420, sodium: 280, zinc: 1.4, selenium: 12, phosphorus: 140, omega3: 0.08, cholesterol: 0 }
  },
  soup: {
    name: "Vegetable soup", serving: "1 bowl (350ml)",
    macros: { kcal: 160, protein: 6, carbs: 22, fat: 5, fiber: 5, sugar: 8 },
    micros: { vitA: 480, vitC: 22, vitD: 0, vitE: 1.4, vitK: 38, b1: 0.08, b2: 0.08, b3: 1.4, b6: 0.18, folate: 38, b12: 0, calcium: 52, iron: 1.4, magnesium: 28, potassium: 480, sodium: 640, zinc: 0.6, selenium: 2, phosphorus: 70, omega3: 0.04, cholesterol: 0 }
  },
  sandwich: {
    name: "Turkey sandwich", serving: "1 sandwich (220g)",
    macros: { kcal: 410, protein: 26, carbs: 42, fat: 14, fiber: 4, sugar: 6 },
    micros: { vitA: 80, vitC: 8, vitD: 0.1, vitE: 1.2, vitK: 12, b1: 0.32, b2: 0.22, b3: 7.2, b6: 0.38, folate: 62, b12: 0.4, calcium: 90, iron: 2.8, magnesium: 42, potassium: 380, sodium: 920, zinc: 1.8, selenium: 26, phosphorus: 220, omega3: 0.08, cholesterol: 48 }
  },
  taco: {
    name: "Tacos", serving: "2 tacos (180g)",
    macros: { kcal: 380, protein: 20, carbs: 32, fat: 18, fiber: 5, sugar: 4 },
    micros: { vitA: 120, vitC: 8, vitD: 0.1, vitE: 1.0, vitK: 10, b1: 0.14, b2: 0.16, b3: 3.8, b6: 0.28, folate: 42, b12: 0.8, calcium: 140, iron: 2.6, magnesium: 48, potassium: 360, sodium: 620, zinc: 3.2, selenium: 16, phosphorus: 220, omega3: 0.08, cholesterol: 55 }
  },
  ramen: {
    name: "Ramen bowl", serving: "1 bowl (500g)",
    macros: { kcal: 490, protein: 18, carbs: 62, fat: 18, fiber: 3, sugar: 6 },
    micros: { vitA: 90, vitC: 4, vitD: 0.2, vitE: 0.8, vitK: 8, b1: 0.22, b2: 0.18, b3: 4.2, b6: 0.16, folate: 32, b12: 0.3, calcium: 42, iron: 2.4, magnesium: 32, potassium: 280, sodium: 1680, zinc: 1.2, selenium: 18, phosphorus: 160, omega3: 0.1, cholesterol: 45 }
  },
  ice_cream: {
    name: "Ice cream", serving: "1 cup (132g)",
    macros: { kcal: 270, protein: 4.6, carbs: 32, fat: 14, fiber: 0.8, sugar: 28 },
    micros: { vitA: 160, vitC: 0.8, vitD: 0.3, vitE: 0.4, vitK: 1, b1: 0.05, b2: 0.24, b3: 0.2, b6: 0.06, folate: 8, b12: 0.4, calcium: 140, iron: 0.2, magnesium: 16, potassium: 200, sodium: 90, zinc: 0.7, selenium: 4, phosphorus: 120, omega3: 0.08, cholesterol: 58 }
  },
  apple: {
    name: "Apple", serving: "1 medium (182g)",
    macros: { kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19 },
    micros: { vitA: 6, vitC: 8, vitD: 0, vitE: 0.3, vitK: 4, b1: 0.03, b2: 0.05, b3: 0.2, b6: 0.08, folate: 5, b12: 0, calcium: 11, iron: 0.2, magnesium: 9, potassium: 195, sodium: 2, zinc: 0.1, selenium: 0, phosphorus: 20, omega3: 0.02, cholesterol: 0 }
  },
  orange: {
    name: "Orange", serving: "1 medium (131g)",
    macros: { kcal: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sugar: 12 },
    micros: { vitA: 14, vitC: 70, vitD: 0, vitE: 0.2, vitK: 0, b1: 0.11, b2: 0.05, b3: 0.4, b6: 0.08, folate: 40, b12: 0, calcium: 52, iron: 0.1, magnesium: 13, potassium: 237, sodium: 0, zinc: 0.1, selenium: 1, phosphorus: 18, omega3: 0.01, cholesterol: 0 }
  },
  strawberry: {
    name: "Strawberries", serving: "1 cup (152g)",
    macros: { kcal: 49, protein: 1, carbs: 12, fat: 0.5, fiber: 3, sugar: 7 },
    micros: { vitA: 2, vitC: 89, vitD: 0, vitE: 0.4, vitK: 3, b1: 0.04, b2: 0.04, b3: 0.6, b6: 0.07, folate: 36, b12: 0, calcium: 24, iron: 0.6, magnesium: 20, potassium: 233, sodium: 2, zinc: 0.2, selenium: 1, phosphorus: 37, omega3: 0.1, cholesterol: 0 }
  },
  broccoli: {
    name: "Steamed broccoli", serving: "1 cup (156g)",
    macros: { kcal: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.1, sugar: 2.2 },
    micros: { vitA: 120, vitC: 81, vitD: 0, vitE: 1.5, vitK: 141, b1: 0.09, b2: 0.18, b3: 0.9, b6: 0.28, folate: 84, b12: 0, calcium: 62, iron: 1.0, magnesium: 33, potassium: 457, sodium: 64, zinc: 0.6, selenium: 2, phosphorus: 92, omega3: 0.06, cholesterol: 0 }
  },
  mashed_potato: {
    name: "Mashed potatoes", serving: "1 cup (210g)",
    macros: { kcal: 214, protein: 4, carbs: 35, fat: 7, fiber: 3, sugar: 3 },
    micros: { vitA: 48, vitC: 12, vitD: 0.2, vitE: 0.6, vitK: 8, b1: 0.16, b2: 0.08, b3: 2.2, b6: 0.42, folate: 18, b12: 0.1, calcium: 42, iron: 0.6, magnesium: 32, potassium: 620, sodium: 420, zinc: 0.5, selenium: 2, phosphorus: 90, omega3: 0.04, cholesterol: 12 }
  },
  french_fries: {
    name: "French fries", serving: "medium (117g)",
    macros: { kcal: 365, protein: 4, carbs: 48, fat: 17, fiber: 4, sugar: 0.4 },
    micros: { vitA: 0, vitC: 9, vitD: 0, vitE: 1.6, vitK: 11, b1: 0.16, b2: 0.04, b3: 3.0, b6: 0.34, folate: 28, b12: 0, calcium: 18, iron: 0.8, magnesium: 32, potassium: 560, sodium: 246, zinc: 0.5, selenium: 1, phosphorus: 125, omega3: 0.08, cholesterol: 0 }
  },
  hotdog: {
    name: "Hot dog", serving: "1 frank + bun",
    macros: { kcal: 290, protein: 11, carbs: 24, fat: 17, fiber: 1, sugar: 4 },
    micros: { vitA: 12, vitC: 0.2, vitD: 0.4, vitE: 0.3, vitK: 2, b1: 0.18, b2: 0.12, b3: 2.4, b6: 0.08, folate: 32, b12: 0.6, calcium: 42, iron: 1.8, magnesium: 16, potassium: 180, sodium: 810, zinc: 1.4, selenium: 12, phosphorus: 110, omega3: 0.04, cholesterol: 35 }
  },
  pretzel: {
    name: "Pretzel", serving: "1 large (115g)",
    macros: { kcal: 380, protein: 10, carbs: 80, fat: 2.5, fiber: 2.8, sugar: 2 },
    micros: { vitA: 0, vitC: 0, vitD: 0, vitE: 0.2, vitK: 1, b1: 0.38, b2: 0.28, b3: 4.2, b6: 0.06, folate: 90, b12: 0, calcium: 22, iron: 4.2, magnesium: 22, potassium: 90, sodium: 1360, zinc: 0.9, selenium: 22, phosphorus: 90, omega3: 0.02, cholesterol: 0 }
  },
  chocolate: {
    name: "Dark chocolate", serving: "40g",
    macros: { kcal: 230, protein: 2.4, carbs: 18, fat: 16, fiber: 4, sugar: 12 },
    micros: { vitA: 2, vitC: 0, vitD: 0, vitE: 0.4, vitK: 3, b1: 0.02, b2: 0.04, b3: 0.4, b6: 0.02, folate: 4, b12: 0.08, calcium: 22, iron: 3.4, magnesium: 80, potassium: 200, sodium: 8, zinc: 1.2, selenium: 2, phosphorus: 90, omega3: 0.02, cholesterol: 2 }
  },
  nuts: {
    name: "Mixed nuts", serving: "1 oz (28g)",
    macros: { kcal: 170, protein: 5, carbs: 6, fat: 15, fiber: 2.5, sugar: 1.2 },
    micros: { vitA: 1, vitC: 0.2, vitD: 0, vitE: 3.4, vitK: 2, b1: 0.12, b2: 0.05, b3: 1.2, b6: 0.08, folate: 16, b12: 0, calcium: 28, iron: 0.8, magnesium: 64, potassium: 180, sodium: 90, zinc: 1.0, selenium: 4, phosphorus: 140, omega3: 0.4, cholesterol: 0 }
  },
  guacamole: {
    name: "Guacamole and chips", serving: "chips + 1/2 cup guac",
    macros: { kcal: 340, protein: 4, carbs: 32, fat: 22, fiber: 8, sugar: 2 },
    micros: { vitA: 18, vitC: 12, vitD: 0, vitE: 2.2, vitK: 18, b1: 0.08, b2: 0.08, b3: 1.4, b6: 0.22, folate: 62, b12: 0, calcium: 28, iron: 1.0, magnesium: 42, potassium: 480, sodium: 280, zinc: 0.7, selenium: 2, phosphorus: 80, omega3: 0.12, cholesterol: 0 }
  },
  carbonara: {
    name: "Pasta carbonara", serving: "1 plate (320g)",
    macros: { kcal: 580, protein: 22, carbs: 58, fat: 28, fiber: 2.5, sugar: 3 },
    micros: { vitA: 120, vitC: 0, vitD: 0.8, vitE: 1.2, vitK: 4, b1: 0.32, b2: 0.28, b3: 4.2, b6: 0.16, folate: 42, b12: 0.8, calcium: 90, iron: 2.4, magnesium: 42, potassium: 260, sodium: 720, zinc: 1.8, selenium: 34, phosphorus: 240, omega3: 0.08, cholesterol: 145 }
  },
  hummus: {
    name: "Hummus with pita", serving: "pita + 1/2 cup hummus",
    macros: { kcal: 310, protein: 10, carbs: 42, fat: 11, fiber: 8, sugar: 3 },
    micros: { vitA: 8, vitC: 6, vitD: 0, vitE: 1.1, vitK: 6, b1: 0.18, b2: 0.08, b3: 1.6, b6: 0.22, folate: 68, b12: 0, calcium: 52, iron: 2.8, magnesium: 48, potassium: 280, sodium: 420, zinc: 1.2, selenium: 8, phosphorus: 160, omega3: 0.08, cholesterol: 0 }
  },
  default_breakfast: {
    name: "Unconfirmed breakfast", serving: "rough estimate — tap Fix food",
    macros: { kcal: 350, protein: 11, carbs: 48, fat: 12, fiber: 4, sugar: 8 },
    micros: { vitA: 60, vitC: 12, vitD: 0.3, vitE: 1.0, vitK: 8, b1: 0.18, b2: 0.14, b3: 1.8, b6: 0.18, folate: 46, b12: 0.2, calcium: 90, iron: 2.2, magnesium: 48, potassium: 380, sodium: 480, zinc: 1.2, selenium: 8, phosphorus: 180, omega3: 0.06, cholesterol: 12 }
  },
  default_brunch: {
    name: "Unconfirmed brunch", serving: "rough estimate — tap Fix food",
    macros: { kcal: 400, protein: 13, carbs: 52, fat: 14, fiber: 5, sugar: 8 },
    micros: { vitA: 80, vitC: 14, vitD: 0.3, vitE: 1.2, vitK: 10, b1: 0.2, b2: 0.15, b3: 2.0, b6: 0.2, folate: 52, b12: 0.2, calcium: 100, iron: 2.4, magnesium: 52, potassium: 420, sodium: 520, zinc: 1.3, selenium: 9, phosphorus: 200, omega3: 0.06, cholesterol: 14 }
  },
  default_lunch: {
    name: "Unconfirmed lunch", serving: "rough estimate — tap Fix food",
    macros: { kcal: 450, protein: 14, carbs: 66, fat: 13, fiber: 7, sugar: 6 },
    micros: { vitA: 90, vitC: 12, vitD: 0.2, vitE: 1.3, vitK: 10, b1: 0.24, b2: 0.12, b3: 2.4, b6: 0.24, folate: 110, b12: 0.1, calcium: 70, iron: 3.0, magnesium: 74, potassium: 520, sodium: 640, zinc: 1.8, selenium: 9, phosphorus: 240, omega3: 0.06, cholesterol: 4 }
  },
  default_snack: {
    name: "Unconfirmed snack", serving: "rough estimate — tap Fix food",
    macros: { kcal: 200, protein: 5, carbs: 28, fat: 8, fiber: 2.5, sugar: 10 },
    micros: { vitA: 20, vitC: 6, vitD: 0.1, vitE: 0.8, vitK: 4, b1: 0.08, b2: 0.08, b3: 1.0, b6: 0.12, folate: 20, b12: 0.1, calcium: 60, iron: 1.0, magnesium: 28, potassium: 220, sodium: 260, zinc: 0.6, selenium: 4, phosphorus: 90, omega3: 0.04, cholesterol: 6 }
  },
  default_dinner: {
    name: "Unconfirmed dinner", serving: "rough estimate — tap Fix food",
    macros: { kcal: 450, protein: 14, carbs: 64, fat: 14, fiber: 7, sugar: 6 },
    micros: { vitA: 100, vitC: 12, vitD: 0.2, vitE: 1.4, vitK: 12, b1: 0.24, b2: 0.12, b3: 2.4, b6: 0.24, folate: 110, b12: 0.1, calcium: 72, iron: 3.0, magnesium: 74, potassium: 540, sodium: 660, zinc: 1.8, selenium: 9, phosphorus: 240, omega3: 0.06, cholesterol: 4 }
  },
  default_late: {
    name: "Unconfirmed late bite", serving: "rough estimate — tap Fix food",
    macros: { kcal: 250, protein: 7, carbs: 34, fat: 9, fiber: 2.5, sugar: 7 },
    micros: { vitA: 30, vitC: 4, vitD: 0.1, vitE: 0.6, vitK: 4, b1: 0.1, b2: 0.1, b3: 1.4, b6: 0.1, folate: 24, b12: 0.1, calcium: 70, iron: 1.2, magnesium: 24, potassium: 200, sodium: 340, zinc: 0.7, selenium: 6, phosphorus: 110, omega3: 0.04, cholesterol: 8 }
  }
};

window.AMFIT_LABEL_MAP = {
  pizza: "pizza", bagel: "bagel", pretzel: "pretzel", hotdog: "hotdog",
  cheeseburger: "burger", guacamole: "guacamole", carbonara: "carbonara",
  ice_cream: "ice_cream", ice_lolly: "ice_cream", french_loaf: "sandwich",
  burrito: "burrito", mashed_potato: "mashed_potato", broccoli: "broccoli",
  cauliflower: "broccoli", strawberry: "strawberry", orange: "orange",
  lemon: "orange", banana: "banana", pineapple: "smoothie", pomegranate: "smoothie",
  head_cabbage: "salad", cucumber: "salad", zucchini: "salad", bell_pepper: "salad",
  mushroom: "salad", artichoke: "salad", corn: "rice_bowl", acorn: "nuts",
  chocolate_sauce: "chocolate", espresso: "filter_coffee", cup: "filter_coffee",
  consomme: "soup", hot_pot: "ramen",
  trifle: "ice_cream", dough: "bagel", bakery: "bagel",
  meat_loaf: "steak", pork_chop: "steak",
  french_fries: "french_fries",
  granny_smith: "apple", fig: "apple",
  rapeseed: "salad", cardoon: "salad"
};

window.AMFIT_MEAL_DEFAULTS = {
  Breakfast: "default_breakfast",
  Brunch: "default_brunch",
  Lunch: "default_lunch",
  Snack: "default_snack",
  Dinner: "default_dinner",
  "Late night": "default_late"
};

window.AMFIT_MICRO_META = [
  { key: "vitA", label: "Vitamin A", unit: "µg", rda: 900 },
  { key: "vitC", label: "Vitamin C", unit: "mg", rda: 90 },
  { key: "vitD", label: "Vitamin D", unit: "µg", rda: 20 },
  { key: "vitE", label: "Vitamin E", unit: "mg", rda: 15 },
  { key: "vitK", label: "Vitamin K", unit: "µg", rda: 120 },
  { key: "b1", label: "Thiamin (B1)", unit: "mg", rda: 1.2 },
  { key: "b2", label: "Riboflavin (B2)", unit: "mg", rda: 1.3 },
  { key: "b3", label: "Niacin (B3)", unit: "mg", rda: 16 },
  { key: "b6", label: "Vitamin B6", unit: "mg", rda: 1.3 },
  { key: "folate", label: "Folate (B9)", unit: "µg", rda: 400 },
  { key: "b12", label: "Vitamin B12", unit: "µg", rda: 2.4 },
  { key: "calcium", label: "Calcium", unit: "mg", rda: 1000 },
  { key: "iron", label: "Iron", unit: "mg", rda: 18 },
  { key: "magnesium", label: "Magnesium", unit: "mg", rda: 400 },
  { key: "potassium", label: "Potassium", unit: "mg", rda: 3400 },
  { key: "sodium", label: "Sodium", unit: "mg", rda: 2300 },
  { key: "zinc", label: "Zinc", unit: "mg", rda: 11 },
  { key: "selenium", label: "Selenium", unit: "µg", rda: 55 },
  { key: "phosphorus", label: "Phosphorus", unit: "mg", rda: 700 },
  { key: "omega3", label: "Omega-3", unit: "g", rda: 1.6 },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", rda: 300 }
];
