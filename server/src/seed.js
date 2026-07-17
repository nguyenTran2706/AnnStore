require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
const CartItem = require('./models/CartItem');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopflow';

const products = [
  // ─── Lego Maersk Sets (5) ───
  {
    name: 'Lego 1650 Maersk Container Ship',
    description: 'The iconic Maersk container ship, recreated in stunning detail with 220 pieces. A must-have for any LEGO collector!',
    price: 1149.99,
    category: 'Lego Maersk Sets',
    imageUrl: '/images/Maersk%20Sets/1650-1.png',
    stock: 5,
  },
  {
    name: 'Lego 1651 Maersk Container Truck',
    description: 'The iconic Maersk container truck, Released in 1980. A must-have for any LEGO collector!',
    price: 999.99,
    category: 'Lego Maersk Sets',
    imageUrl: '/images/Maersk%20Sets/1651-2.png',
    stock: 3,
  },
  {
    name: 'Lego 1831 Maersk Sealand Container Truck',
    description: 'Released in 1995, with 201 Parts. A must-have for any LEGO collector!',
    price: 729.99,
    category: 'Lego Maersk Sets',
    imageUrl: '/images/Maersk%20Sets/1831-2.png',
    stock: 6,
  },
  {
    name: 'Lego 10241 Maersk Line Triple-E',
    description: 'Released in 2013, with 1500 Parts. A must-have for any LEGO collector!',
    price: 449.99,
    category: 'Lego Maersk Sets',
    imageUrl: '/images/Maersk%20Sets/10241-1.png',
    stock: 10,
  },
  {
    name: 'Lego 40955 Maersk Dual-Fuel Container Vessel',
    description: 'Exclusive Sets Released in 2026, and only 2000 copies are realesed. A must-have for any LEGO collector!',
    price: 379.99,
    category: 'Lego Maersk Sets',
    imageUrl: '/images/Maersk%20Sets/40955-1.png',
    stock: 2,
  },

  // ─── Ninjago (5) ──
  {
    name: 'Lego 71861 The Old Town',
    description: 'Celebrate the 15th anniversary of LEGO® NINJAGO® action with an impressively detailed set that includes 23 minifigures',
    price: 499.99,
    category: 'Ninjago',
    imageUrl: '/images/Ninjago/71861-1.png',
    stock: 12,
  },
  {
    name: 'Lego 71799 Ninjago City Markets',
    description: 'Released in 2023, with 6163 Parts. A must-have for any LEGO collector!',
    price: 599.99,
    category: 'Ninjago',
    imageUrl: '/images/Ninjago/71799-1.png',
    stock: 5,
  },
  {
    name: 'Lego 71860 Lloyd\'s Titan Mech 15th Anniversary',
    description: 'Celebrate 15 years of LEGO® NINJAGO® Legacy with this mech set.',
    price: 149.99,
    category: 'Ninjago',
    imageUrl: '/images/Ninjago/71860-1.png',
    stock: 3,
  },
  {
    name: 'Lego 71847 The Guardian Dragon',
    description: 'The Guardian Dragon is a set released in 2024. It has 1024 pieces and includes 6 minifigures.',
    price: 119.99,
    category: 'Ninjago',
    imageUrl: '/images/Ninjago/71847-1.png',
    stock: 10,
  },
  {
    name: 'Lego 71846 The Fire Knight Mech',
    description: 'Dramatic scene of a cape-wearing mech locked in battle with an ancient monster emerging from the sea for display and play.',
    price: 99.99,
    category: 'Ninjago',
    imageUrl: '/images/Ninjago/71846-1.png',
    stock: 25,
  },


  // ─── Modular Buildings (5) ───
  {
    name: 'Lego 10182 Cafe Corner',
    description: 'The first set in the LEGO Modular Buildings series, released in 2007. It features a detailed corner building with a cafe on the ground floor and apartments above.',
    price: 2999.99,
    category: 'Modular Buildings',
    imageUrl: '/images/Modular%20Buildings/10182-1.png',
    stock: 1,
  },
  {
    name: 'Lego 10185 Green Grocer',
    description: 'Released in 2009, with 2352 Parts. A must-have for any LEGO collector!',
    price: 1999.99,
    category: 'Modular Buildings',
    imageUrl: '/images/Modular%20Buildings/10185-1.png',
    stock: 3,
  },
  {
    name: 'Lego 10190 Market Street',
    description: 'Released in 2007, with 2352 Parts. A must-have for any LEGO collector!',
    price: 799.99,
    category: 'Modular Buildings',
    imageUrl: '/images/Modular%20Buildings/10190-1.png',
    stock: 5,
  },
  {
    name: 'Lego 10297 Boutique Hotel',
    description: 'Released in 2022, with 3066 Parts. It\'s inspired by opulent turn-of-the-century European architecture.',
    price: 249.99,
    category: 'Modular Buildings',
    imageUrl: '/images/Modular%20Buildings/10297-1.png',
    stock: 20,
  },
  {
    name: 'Lego 10278 Police Station',
    description: "Released in 2021, with 2919 Parts. It's inspired by 1940s American police stations.",
    price: 199.99,
    category: 'Modular Buildings',
    imageUrl: '/images/Modular%20Buildings/10312-1.png',
    stock: 11,
  },

  // ─── Star Wars (4) ───
  {
    name: 'Lego 10123 Cloud City',
    description: 'The most expensive LEGO set in the world, containing 698 pieces and including the iconic rare Boba Fett with printed arms.',
    price: 11999.99,
    category: 'Star Wars',
    imageUrl: '/images/Star%20Wars/10123-1.png',
    stock: 0,
  },
  {
    name: 'Lego 75192 UCS Millennium Falcon ',
    description: 'The second largest LEGO Star Wars set ever created, featuring over 7,500 pieces and 8 iconic minifigures.',
    price: 799.99,
    category: 'Star Wars',
    imageUrl: '/images/Star%20Wars/75192-1.png',
    stock: 5,
  },
  {
    name: 'Lego 75419 Death Star',
    description: 'Released in 2026, it\'s the largest LEGO Star Wars set ever created, featuring over 9090 pieces and 20 iconic minifigures.',
    price: 1499.99,
    category: 'Star Wars',
    imageUrl: '/images/Star%20Wars/75419.png',
    stock: 10,
  },
  {
    name: 'Lego 75355 X-Wing Starfighter',
    description: 'The UCS X-Wing Starfighter is a highly detailed and accurate representation of the iconic Rebel starfighter from the Star Wars saga.',
    price: 239.99,
    category: 'Star Wars',
    imageUrl: '/images/Star%20Wars/75355-1.png',
    stock: 2,
  },

  // ─── Minifigures (5) ───
  {
    name: 'Mr. Gold, Series 10',
    description: 'The rarest and most valuable LEGO minifigure ever produced, with only 5,000 units made worldwide.',
    price: 10999.99,
    category: 'Minifigures',
    imageUrl: '/images/Minifigures/mrgold.png',
    stock: 0,
  },
  {
    name: 'Boba Fett - White',
    description: 'A rare variant of the iconic Star Wars bounty hunter, featuring a white torso and helmet.',
    price: 399.99,
    category: 'Minifigures',
    imageUrl: '/images/Minifigures/boba_fett_white.png',
    stock: 8,
  },
  {
    name: 'Cedric the Bull (Full Chrome) ',
    description: 'A rare and highly sought-after LEGO minifigure from the Castle theme, featuring a full chrome finish.',
    price: 179.99,
    category: 'Minifigures',
    imageUrl: '/images/Minifigures/Cedric%20the%20bull.png',
    stock: 12,
  },
  {
    name: 'Medium Blue Jacket, White Legs, Dark Tan Female Hair',
    description: 'A rare minifigure from Modular Buildings theme.',
    price: 22.99,
    category: 'Minifigures',
    imageUrl: '/images/Minifigures/medium_blue_jacket.png',
    stock: 20,
  },
  {
    name: 'Jay NRG',
    description: 'Rare minifigure from Ninjago theme, released in 2012.',
    price: 333.99,
    category: 'Minifigures',
    imageUrl: '/images/Minifigures/jay_nrg.png',
    stock: 1
  },

  // ─── Parts (5) ───
  {
    name: '3957b Antenna 4H - Flat Top',
    description: 'Years Released: 2008 - 2026',
    price: 0.99,
    category: 'Parts',
    imageUrl: '/images/Parts/3957b.png',
    stock: 50,
  },
  {
    name: '60212 Vehicle, Mudguard 2 x 4 with Arch Studded with Hole',
    description: 'Years Released: 2005 - 2026',
    price: 0.49,
    category: 'Parts',
    imageUrl: '/images/Parts/60212.png',
    stock: 75,
  },
  {
    name: '973c002 Torso Plain / Red Arms / Yellow Hands',
    description: 'Years Released: 1978 - 2026',
    price: 1.99,
    category: 'Parts',
    imageUrl: '/images/Parts/973c002.png',
    stock: 25,
  },
  {
    name: '3023 Plate 1 x 2',
    description: 'Years Released: 1958 - 2026',
    price: 0.19,
    category: 'Parts',
    imageUrl: '/images/Parts/3023.png',
    stock: 150,
  },
  {
    name: '25975pb02 Guitar Acoustic - Silver Strings, Black Tuning Knobs',
    description: 'Years Released: 2021 - 2026',
    price: 1.29,
    category: 'Parts',
    imageUrl: '/images/Parts/25975pb02.png',
    stock: 13,
  },

];

// Admin account to seed (password is bcrypt-hashed by the User pre-save hook)
const adminUser = {
  name: 'Ann',
  email: 'admin@annzbricks.com',
  password: '12345@',
  role: 'admin',
};

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await Product.deleteMany({});
    console.log('Cleared existing products');

    const inserted = await Product.insertMany(products);
    console.log('Seeded ' + inserted.length + ' products');

    await CartItem.deleteMany({});
    console.log('Cleared existing cart items');

    // Seed admin user
    await User.deleteMany({});
    await User.create(adminUser);
    console.log('Seeded admin user: ' + adminUser.email);

    await mongoose.disconnect();
    console.log('Done - disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
