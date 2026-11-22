import type { Product, ProductCategory, ProductCondition, Seller } from '@/types/marketplace';

const sellers: Seller[] = [
  { id: 's1', name: 'Selam Tesfaye', neighborhood: 'Bole' },
  { id: 's2', name: 'Hana Bekele', neighborhood: 'Yeka' },
  { id: 's3', name: 'Dawit Alemu', neighborhood: 'Akaki Kaliti' },
  { id: 's4', name: 'Mekdes Worku', neighborhood: 'Lideta' },
  { id: 's5', name: 'Bethel Assefa', neighborhood: 'Nifas Silk Lafto' },
  { id: 's6', name: 'Yonas Girma', neighborhood: 'Arada' },
];

type Sample = [title: string, description: string, price: number, category: ProductCategory,
  condition: ProductCondition, seller: Seller, size?: string];

const [selam, hana, dawit, mekdes, bethel, yonas] = sellers;
const traditional = 'Traditional wear';
const accessories = 'Accessories';
const fashion = 'Everyday fashion';
const goods = 'Home & tech';

const samples: Sample[] = [
  ['Crimson Tibeb Habesha Kemis', 'Ivory cotton dress with crimson woven trim. Worn once for Timket.', 6800, traditional, 'Like new', selam, 'M'],
  ['Handwoven gold-trim Netela', 'Airy cotton shawl with a narrow gold border and hand-knotted fringe.', 1450, traditional, 'Very good', hana, 'One size'],
  ['Men’s white holiday set', 'Two-piece cotton tunic and trousers with navy tibeb at the collar and cuffs.', 4200, traditional, 'Very good', dawit, 'L'],
  ['Ivory wedding Habesha Kemis', 'Floor-length wedding dress with layered cream embroidery. Hem has been altered.', 12500, traditional, 'Very good', mekdes, 'S'],
  ['Silver-tone cross pendant', 'Ethiopian cross motif on a simple chain with a working clasp.', 950, accessories, 'Very good', bethel],
  ['Brown leather shoulder bag', 'Compact zip-top bag with an adjustable strap and light corner wear.', 1800, fashion, 'Good', yonas],
  ['Cream cotton Gabi', 'Thick woven wrap for cooler evenings, with cream fringe and a clean edge.', 2400, traditional, 'Like new', mekdes, 'One size'],
  ['Blue Tibeb graduation dress', 'White cotton with indigo woven bands. Worn for one graduation ceremony.', 5600, traditional, 'Like new', hana, 'S'],
  ['Men’s green-trim Habesha shirt', 'Long-sleeved cotton shirt with green geometric trim along the placket.', 1750, traditional, 'Very good', yonas, 'M'],
  ['Traditional wedding shawl', 'Wide ivory shawl with copper-toned thread at both ends.', 2700, traditional, 'Very good', selam, 'One size'],
  ['Burgundy embroidered Kemis', 'Mid-calf cotton dress with burgundy stitching at the neckline and hem.', 4800, traditional, 'Good', bethel, 'L'],
  ['Striped woven Netela', 'Lightweight wrap with green and amber stripes along the short edges.', 1100, traditional, 'Good', mekdes, 'One size'],
  ['Children’s holiday tunic', 'Ivory cotton tunic with a red woven collar. Freshly washed.', 850, traditional, 'Very good', dawit, 'Age 7–8'],
  ['Tibeb hairband', 'Fabric-covered headband with red and black geometric trim.', 380, accessories, 'Like new', hana],
  ['Woven straw clutch', 'Small handwoven clutch with a cloth lining and loop closure.', 1150, accessories, 'Very good', mekdes],
  ['Dark-wash straight jeans', 'High-rise straight jeans with intact hems and no tears.', 1300, fashion, 'Very good', selam, 'W28'],
  ['Black leather loafers', 'Slip-ons with some creasing across the toes and firm soles.', 2200, fashion, 'Good', yonas, 'EU 42'],
  ['Cotton canvas backpack', 'Olive daypack with a padded sleeve and two side pockets.', 1650, fashion, 'Very good', bethel],
  ['Clay jebena coffee pot', 'Black clay coffee pot with a round base and intact spout.', 680, goods, 'Very good', hana],
  ['Adjustable desk lamp', 'Cream metal lamp with a working switch and a small scuff at the base.', 1150, goods, 'Good', dawit],
  ['Wired over-ear headphones', 'Foldable headphones with a detachable 3.5 mm cable.', 1550, goods, 'Very good', yonas],
  ['Woven serving tray', 'Round woven tray with a raised rim for serving bread or coffee.', 740, goods, 'Like new', mekdes],
];

export const products: Product[] = samples.map(
  ([title, description, price, category, condition, seller, size], index) => ({
    id: `listing-${index + 1}`,
    title, description, price, category, condition, seller, size,
    images: [],
    location: `${seller.neighborhood}, Addis Ababa`,
    createdAt: new Date(Date.UTC(2026, 10, 22 - index)).toISOString(),
    status: index === 19 ? 'Reserved' : index === 20 ? 'Sold' : 'Active',
    sponsored: index === 0,
  }),
);
