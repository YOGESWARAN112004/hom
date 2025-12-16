import { db } from "./db";
import { products } from "@shared/schema";

const luxuryProducts = [
  // Men's Clothing
  {
    name: "Ralph Lauren Purple Label Suit",
    description: "Hand-tailored wool suit with peak lapels. Classic elegance meets modern sophistication.",
    basePrice: "2499.00",
    category: "Men",
    subCategory: "Clothing",
    brand: "Ralph Lauren",
    imageUrl: "https://images.unsplash.com/photo-1594938291221-94f18cbb5660?w=800",
    stock: 15
  },
  {
    name: "Gucci Men's Leather Jacket",
    description: "Premium Italian leather jacket with signature GG hardware. Timeless luxury.",
    basePrice: "3200.00",
    category: "Men",
    subCategory: "Clothing",
    brand: "Gucci",
    imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",
    stock: 8
  },
  {
    name: "McLaren Racing Jacket",
    description: "Limited edition racing jacket with carbon fiber detailing. For the motorsport enthusiast.",
    basePrice: "899.00",
    category: "Men",
    subCategory: "Clothing",
    brand: "McLaren",
    imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800",
    stock: 12
  },

  // Men's Accessories
  {
    name: "Gucci Leather Belt",
    description: "Double G buckle leather belt. An icon of Italian craftsmanship.",
    basePrice: "450.00",
    category: "Men",
    subCategory: "Accessories",
    brand: "Gucci",
    imageUrl: "https://images.unsplash.com/photo-1624222247344-5c0c32d0ca5e?w=800",
    stock: 25
  },
  {
    name: "Ralph Lauren Polo Watch",
    description: "Swiss-made automatic watch with alligator strap. Refined and sophisticated.",
    basePrice: "1899.00",
    category: "Men",
    subCategory: "Accessories",
    brand: "Ralph Lauren",
    imageUrl: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800",
    stock: 10
  },
  {
    name: "Coach Men's Leather Wallet",
    description: "Signature canvas and leather bifold wallet. Classic American luxury.",
    basePrice: "178.00",
    category: "Men",
    subCategory: "Accessories",
    brand: "Coach",
    imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800",
    stock: 30
  },

  // Men's Shoes
  {
    name: "Gucci Horsebit Loafers",
    description: "Iconic leather loafers with signature horsebit detail. A heritage classic.",
    basePrice: "790.00",
    category: "Men",
    subCategory: "Shoes",
    brand: "Gucci",
    imageUrl: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800",
    stock: 20
  },

  // Women's Clothing
  {
    name: "Gucci Silk Blouse",
    description: "Luxurious silk blouse with bow detail. Effortlessly elegant.",
    basePrice: "1200.00",
    category: "Women",
    subCategory: "Clothing",
    brand: "Gucci",
    imageUrl: "https://images.unsplash.com/photo-1564257577802-95fef9dbee72?w=800",
    stock: 18
  },
  {
    name: "Ralph Lauren Evening Gown",
    description: "Floor-length silk gown with crystal embellishments. Red carpet ready.",
    basePrice: "4500.00",
    category: "Women",
    subCategory: "Clothing",
    brand: "Ralph Lauren",
    imageUrl: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800",
    stock: 5
  },

  // Women's Bags
  {
    name: "Gucci Jackie 1961 Bag",
    description: "Iconic shoulder bag in leather with piston closure. A timeless investment.",
    basePrice: "2890.00",
    category: "Women",
    subCategory: "Bags",
    brand: "Gucci",
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800",
    stock: 12
  },
  {
    name: "Coach Tabby Shoulder Bag",
    description: "Refined leather bag with signature hardware. Modern American luxury.",
    basePrice: "395.00",
    category: "Women",
    subCategory: "Bags",
    brand: "Coach",
    imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800",
    stock: 22
  },

  // Women's Shoes
  {
    name: "Gucci Princetown Mules",
    description: "Velvet slippers with horsebit detail. Luxuriously comfortable.",
    basePrice: "730.00",
    category: "Women",
    subCategory: "Shoes",
    brand: "Gucci",
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800",
    stock: 16
  },
  {
    name: "Ralph Lauren Riding Boots",
    description: "Premium leather riding boots. Equestrian elegance.",
    basePrice: "895.00",
    category: "Women",
    subCategory: "Shoes",
    brand: "Ralph Lauren",
    imageUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800",
    stock: 14
  },

  // Women's Accessories
  {
    name: "Gucci Silk Scarf",
    description: "Hand-rolled silk twill scarf with heritage print. A collector's piece.",
    basePrice: "390.00",
    category: "Women",
    subCategory: "Accessories",
    brand: "Gucci",
    imageUrl: "https://images.unsplash.com/photo-1601924638867-4a2eb14e4b72?w=800",
    stock: 28
  },
  {
    name: "Coach Leather Gloves",
    description: "Soft nappa leather gloves with cashmere lining. Refined warmth.",
    basePrice: "158.00",
    category: "Women",
    subCategory: "Accessories",
    brand: "Coach",
    imageUrl: "https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=800",
    stock: 24
  },

  // Kids
  {
    name: "Ralph Lauren Kids Polo Shirt",
    description: "Classic pique polo in signature colors. Preppy style for the next generation.",
    basePrice: "65.00",
    category: "Kids",
    subCategory: "Clothing",
    brand: "Ralph Lauren",
    imageUrl: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800",
    stock: 40
  },
  {
    name: "Gucci Kids Sneakers",
    description: "Leather sneakers with signature Web stripe. Luxury comfort for little ones.",
    basePrice: "295.00",
    category: "Kids",
    subCategory: "Shoes",
    brand: "Gucci",
    imageUrl: "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=800",
    stock: 18
  },
  {
    name: "Coach Kids Backpack",
    description: "Durable canvas backpack with leather trim. Adventure-ready style.",
    basePrice: "198.00",
    category: "Kids",
    subCategory: "Bags",
    brand: "Coach",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
    stock: 32
  }
];

async function seed() {
  try {
    console.log("Seeding database...");

    // Clear existing products
    await db.delete(products);

    // Insert luxury products
    await db.insert(products).values(luxuryProducts);

    console.log(`✅ Successfully seeded ${luxuryProducts.length} luxury products`);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
