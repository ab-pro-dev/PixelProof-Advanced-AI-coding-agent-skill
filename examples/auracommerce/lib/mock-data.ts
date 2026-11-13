export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  sales: number;
  rating: number;
  image: string;
  description: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  productCount: number;
  totalSales: number;
  image: string;
  status: "Active" | "Archived";
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerAvatar: string;
  date: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  paymentMethod: "Credit Card" | "Apple Pay" | "PayPal" | "Klarna";
  shippingAddress: string;
  timeline: {
    title: string;
    description: string;
    date: string;
    completed: boolean;
  }[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone: string;
  city: string;
  country: string;
  tier: "VIP" | "Platinum" | "Gold" | "New";
  totalSpent: number;
  ordersCount: number;
  lastOrderDate: string;
  status: "Active" | "Inactive";
  joinedDate: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  image: string;
  stock: number;
  minThreshold: number;
  location: string;
  unitCost: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  lastRestocked: string;
}

export interface DiscountCoupon {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  usageCount: number;
  usageLimit: number;
  minSpend: number;
  startDate: string;
  endDate: string;
  status: "Active" | "Scheduled" | "Expired";
  category: string;
}

export interface Review {
  id: string;
  productName: string;
  productImage: string;
  customerName: string;
  customerAvatar: string;
  verified: boolean;
  rating: number;
  title: string;
  comment: string;
  date: string;
  status: "Published" | "Pending" | "Flagged";
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "order" | "stock" | "customer" | "security" | "system";
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

/* ---------------------------------------------------------
   MOCK DATASETS
--------------------------------------------------------- */

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Chronos Heritage Automatic Watch",
    sku: "TIM-CR-001",
    category: "Luxury Timepieces",
    price: 1250,
    cost: 540,
    stock: 18,
    status: "In Stock",
    sales: 142,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    description: "Swiss automatic movement with sapphire crystal and hand-stitched Italian leather strap.",
    createdAt: "2026-08-14",
  },
  {
    id: "prod-2",
    name: "Aura Noise-Cancelling Headphones Pro",
    sku: "AUD-HP-002",
    category: "Audio & Tech",
    price: 349,
    cost: 135,
    stock: 42,
    status: "In Stock",
    sales: 389,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    description: "Custom titanium drivers with adaptive hybrid ANC and 40-hour ultra-low latency playback.",
    createdAt: "2026-09-02",
  },
  {
    id: "prod-3",
    name: "Artisan Full-Grain Leather Weekender",
    sku: "LTH-BG-003",
    category: "Leather Goods",
    price: 495,
    cost: 210,
    stock: 6,
    status: "Low Stock",
    sales: 84,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    description: "Vegetable-tanned full-grain leather luggage with solid brass hardware and water-resistant lining.",
    createdAt: "2026-09-18",
  },
  {
    id: "prod-4",
    name: "Komorebi Minimalist Ceramic Vase",
    sku: "HOM-VS-004",
    category: "Home & Living",
    price: 85,
    cost: 24,
    stock: 75,
    status: "In Stock",
    sales: 210,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&auto=format&fit=crop&q=80",
    description: "Hand-thrown stoneware with matte textured ivory glaze, inspired by Scandinavian minimalism.",
    createdAt: "2026-10-01",
  },
  {
    id: "prod-5",
    name: "Velocity Knit Minimalist Sneaker",
    sku: "SH-VK-005",
    category: "Minimalist Footwear",
    price: 195,
    cost: 65,
    stock: 0,
    status: "Out of Stock",
    sales: 520,
    rating: 4.6,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    description: "Breathable recycled yarn upper with featherlight ergonomic memory foam midsole.",
    createdAt: "2026-07-22",
  },
  {
    id: "prod-6",
    name: "Merino Wool Cashmere Oversized Coat",
    sku: "APP-CT-006",
    category: "Designer Apparel",
    price: 680,
    cost: 270,
    stock: 12,
    status: "In Stock",
    sales: 96,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80",
    description: "Luxurious double-faced Italian cashmere blend tailored with horn buttons and structured lapel.",
    createdAt: "2026-10-12",
  },
  {
    id: "prod-7",
    name: "Horizon Polarized Titanium Sunglasses",
    sku: "ACC-SG-007",
    category: "Leather Goods",
    price: 245,
    cost: 78,
    stock: 31,
    status: "In Stock",
    sales: 178,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80",
    description: "Ultralight Japanese grade-5 titanium frame with Zeiss polarized anti-reflective lenses.",
    createdAt: "2026-09-29",
  },
  {
    id: "prod-8",
    name: "Aero Mechanical Wireless Keyboard",
    sku: "TEC-KB-008",
    category: "Audio & Tech",
    price: 220,
    cost: 85,
    stock: 5,
    status: "Low Stock",
    sales: 312,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
    description: "CNC aluminum case with hot-swappable switches, gasket mount, and PBT double-shot keycaps.",
    createdAt: "2026-08-30",
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: "cat-1",
    name: "Luxury Timepieces",
    slug: "luxury-timepieces",
    description: "Swiss movements, sapphire crystals, and chronographs designed for discerning collectors.",
    productCount: 18,
    totalSales: 168400,
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80",
    status: "Active",
  },
  {
    id: "cat-2",
    name: "Audio & Tech",
    slug: "audio-tech",
    description: "Audiophile-grade sound, acoustic engineering, and high-performance design peripherals.",
    productCount: 24,
    totalSales: 142100,
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80",
    status: "Active",
  },
  {
    id: "cat-3",
    name: "Leather Goods",
    slug: "leather-goods",
    description: "Handcrafted full-grain leather wallets, portfolios, belts, and luxury weekenders.",
    productCount: 15,
    totalSales: 89500,
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
    status: "Active",
  },
  {
    id: "cat-4",
    name: "Designer Apparel",
    slug: "designer-apparel",
    description: "Tailored outerwear, cashmere knits, and architectural wardrobe essentials.",
    productCount: 32,
    totalSales: 215300,
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
    status: "Active",
  },
  {
    id: "cat-5",
    name: "Home & Living",
    slug: "home-living",
    description: "Sculptural lighting, handmade ceramics, and timeless objects for serene interiors.",
    productCount: 28,
    totalSales: 64200,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&auto=format&fit=crop&q=80",
    status: "Active",
  },
  {
    id: "cat-6",
    name: "Minimalist Footwear",
    slug: "minimalist-footwear",
    description: "Sleek low-profile trainers and artisanal boots engineered with high-rebound cushioning.",
    productCount: 12,
    totalSales: 94800,
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
    status: "Active",
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: "ORD-9401",
    customerName: "Eleanor Sterling",
    customerEmail: "eleanor.sterling@luxury.io",
    customerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    date: "2026-11-09T14:22:00Z",
    items: [
      {
        productId: "prod-1",
        name: "Chronos Heritage Automatic Watch",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
        price: 1250,
        quantity: 1,
      },
    ],
    subtotal: 1250,
    shipping: 0,
    tax: 100,
    discount: 50,
    total: 1300,
    status: "Processing",
    paymentMethod: "Apple Pay",
    shippingAddress: "742 Evergreen Terrace, Palo Alto, CA 94301",
    timeline: [
      { title: "Order Placed", description: "Customer paid via Apple Pay", date: "Nov 9, 2:22 PM", completed: true },
      { title: "Payment Verified", description: "Payment verified by Stripe", date: "Nov 9, 2:23 PM", completed: true },
      { title: "Fulfillment Started", description: "Order sent to Zurich hub", date: "Nov 9, 3:00 PM", completed: true },
      { title: "Shipped", description: "Tracking #DHL-89214710", date: "Pending", completed: false },
      { title: "Delivered", description: "Expected delivery in 2 business days", date: "Pending", completed: false },
    ],
  },
  {
    id: "ORD-9400",
    customerName: "Julian Vance",
    customerEmail: "julian.vance@techcorp.com",
    customerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    date: "2026-11-09T11:45:00Z",
    items: [
      {
        productId: "prod-2",
        name: "Aura Noise-Cancelling Headphones Pro",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80",
        price: 349,
        quantity: 1,
      },
      {
        productId: "prod-8",
        name: "Aero Mechanical Wireless Keyboard",
        image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200&auto=format&fit=crop&q=80",
        price: 220,
        quantity: 1,
      },
    ],
    subtotal: 569,
    shipping: 15,
    tax: 45.52,
    discount: 25,
    total: 604.52,
    status: "Shipped",
    paymentMethod: "Credit Card",
    shippingAddress: "450 Lexington Ave, Suite 1900, New York, NY 10017",
    timeline: [
      { title: "Order Placed", description: "Credit card authorized", date: "Nov 9, 11:45 AM", completed: true },
      { title: "Payment Verified", description: "Cleared fraud analysis", date: "Nov 9, 11:46 AM", completed: true },
      { title: "Packed & Labelled", description: "Packed in eco-luxury box", date: "Nov 9, 1:15 PM", completed: true },
      { title: "Shipped", description: "Carrier: FedEx Priority #4928192", date: "Nov 9, 4:30 PM", completed: true },
      { title: "Delivered", description: "Estimated delivery tomorrow", date: "Pending", completed: false },
    ],
  },
  {
    id: "ORD-9399",
    customerName: "Sophia Chen",
    customerEmail: "sophia.chen@designstudio.co",
    customerAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
    date: "2026-11-08T18:10:00Z",
    items: [
      {
        productId: "prod-3",
        name: "Artisan Full-Grain Leather Weekender",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&auto=format&fit=crop&q=80",
        price: 495,
        quantity: 1,
      },
    ],
    subtotal: 495,
    shipping: 0,
    tax: 39.6,
    discount: 0,
    total: 534.6,
    status: "Delivered",
    paymentMethod: "Klarna",
    shippingAddress: "128 Rue de Rivoli, 75001 Paris, France",
    timeline: [
      { title: "Order Placed", description: "Customer paid with Klarna", date: "Nov 8, 6:10 PM", completed: true },
      { title: "Payment Verified", description: "Payment installment approved", date: "Nov 8, 6:11 PM", completed: true },
      { title: "Shipped", description: "DHL Express worldwide #7781920", date: "Nov 9, 9:00 AM", completed: true },
      { title: "Delivered", description: "Signed for by S. Chen", date: "Nov 10, 8:45 AM", completed: true },
    ],
  },
  {
    id: "ORD-9398",
    customerName: "Marcus Brody",
    customerEmail: "marcus.brody@venture.capital",
    customerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    date: "2026-11-08T09:30:00Z",
    items: [
      {
        productId: "prod-6",
        name: "Merino Wool Cashmere Oversized Coat",
        image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
        price: 680,
        quantity: 2,
      },
    ],
    subtotal: 1360,
    shipping: 0,
    tax: 108.8,
    discount: 100,
    total: 1368.8,
    status: "Delivered",
    paymentMethod: "Credit Card",
    shippingAddress: "88 Berkeley Square, Mayfair, London W1J 6EN",
    timeline: [
      { title: "Order Placed", description: "Payment cleared", date: "Nov 8, 9:30 AM", completed: true },
      { title: "Shipped", description: "UPS Air Worldwide #8819203", date: "Nov 8, 2:00 PM", completed: true },
      { title: "Delivered", description: "Delivered to concierge", date: "Nov 9, 3:30 PM", completed: true },
    ],
  },
  {
    id: "ORD-9397",
    customerName: "Clara Oswald",
    customerEmail: "clara.oswald@arch.uk",
    customerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    date: "2026-11-07T16:04:00Z",
    items: [
      {
        productId: "prod-4",
        name: "Komorebi Minimalist Ceramic Vase",
        image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=200&auto=format&fit=crop&q=80",
        price: 85,
        quantity: 2,
      },
    ],
    subtotal: 170,
    shipping: 12,
    tax: 13.6,
    discount: 0,
    total: 195.6,
    status: "Pending",
    paymentMethod: "PayPal",
    shippingAddress: "22 King's Parade, Cambridge CB2 1SJ, UK",
    timeline: [
      { title: "Order Placed", description: "Awaiting payment settlement", date: "Nov 7, 4:04 PM", completed: true },
      { title: "Payment Pending", description: "Reviewing e-check clearance", date: "Nov 7, 4:05 PM", completed: false },
    ],
  },
  {
    id: "ORD-9396",
    customerName: "Devon Thorne",
    customerEmail: "devon.thorne@apex.tech",
    customerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
    date: "2026-11-06T12:15:00Z",
    items: [
      {
        productId: "prod-7",
        name: "Horizon Polarized Titanium Sunglasses",
        image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=200&auto=format&fit=crop&q=80",
        price: 245,
        quantity: 1,
      },
    ],
    subtotal: 245,
    shipping: 0,
    tax: 19.6,
    discount: 0,
    total: 264.6,
    status: "Cancelled",
    paymentMethod: "Credit Card",
    shippingAddress: "300 Austin Ave, Austin, TX 78701",
    timeline: [
      { title: "Order Placed", description: "Created by customer", date: "Nov 6, 12:15 PM", completed: true },
      { title: "Cancelled by Customer", description: "Requested order cancellation prior to dispatch", date: "Nov 6, 12:45 PM", completed: true },
      { title: "Refund Processed", description: "$264.60 returned to Visa ending in 4022", date: "Nov 6, 1:00 PM", completed: true },
    ],
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "cust-1",
    name: "Eleanor Sterling",
    email: "eleanor.sterling@luxury.io",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    phone: "+1 (415) 890-2134",
    city: "Palo Alto",
    country: "United States",
    tier: "VIP",
    totalSpent: 14850,
    ordersCount: 12,
    lastOrderDate: "2026-11-09",
    status: "Active",
    joinedDate: "2025-02-14",
  },
  {
    id: "cust-2",
    name: "Julian Vance",
    email: "julian.vance@techcorp.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    phone: "+1 (212) 441-9920",
    city: "New York",
    country: "United States",
    tier: "Platinum",
    totalSpent: 8940,
    ordersCount: 8,
    lastOrderDate: "2026-11-09",
    status: "Active",
    joinedDate: "2025-06-20",
  },
  {
    id: "cust-3",
    name: "Sophia Chen",
    email: "sophia.chen@designstudio.co",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
    phone: "+33 1 42 68 55 00",
    city: "Paris",
    country: "France",
    tier: "Gold",
    totalSpent: 4210,
    ordersCount: 5,
    lastOrderDate: "2026-11-08",
    status: "Active",
    joinedDate: "2025-09-10",
  },
  {
    id: "cust-4",
    name: "Marcus Brody",
    email: "marcus.brody@venture.capital",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    phone: "+44 20 7946 0912",
    city: "London",
    country: "United Kingdom",
    tier: "VIP",
    totalSpent: 19420,
    ordersCount: 16,
    lastOrderDate: "2026-11-08",
    status: "Active",
    joinedDate: "2024-11-03",
  },
  {
    id: "cust-5",
    name: "Clara Oswald",
    email: "clara.oswald@arch.uk",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    phone: "+44 1223 337733",
    city: "Cambridge",
    country: "United Kingdom",
    tier: "Gold",
    totalSpent: 2650,
    ordersCount: 4,
    lastOrderDate: "2026-11-07",
    status: "Active",
    joinedDate: "2026-01-15",
  },
  {
    id: "cust-6",
    name: "Devon Thorne",
    email: "devon.thorne@apex.tech",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
    phone: "+1 (512) 304-9982",
    city: "Austin",
    country: "United States",
    tier: "New",
    totalSpent: 264.6,
    ordersCount: 1,
    lastOrderDate: "2026-11-06",
    status: "Inactive",
    joinedDate: "2026-11-06",
  },
  {
    id: "cust-7",
    name: "Amara Okonkwo",
    email: "amara.o@globalcreative.ng",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&auto=format&fit=crop&q=80",
    phone: "+234 802 345 6789",
    city: "Lagos",
    country: "Nigeria",
    tier: "Platinum",
    totalSpent: 7320,
    ordersCount: 7,
    lastOrderDate: "2026-10-28",
    status: "Active",
    joinedDate: "2025-04-18",
  },
  {
    id: "cust-8",
    name: "Kenji Takahashi",
    email: "kenji.takahashi@tokyodesign.jp",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
    phone: "+81 3 5555 0143",
    city: "Tokyo",
    country: "Japan",
    tier: "VIP",
    totalSpent: 16900,
    ordersCount: 14,
    lastOrderDate: "2026-10-31",
    status: "Active",
    joinedDate: "2024-12-01",
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: "inv-1",
    sku: "TIM-CR-001",
    productName: "Chronos Heritage Automatic Watch",
    category: "Luxury Timepieces",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
    stock: 18,
    minThreshold: 10,
    location: "Zurich Hub - Vault 4A",
    unitCost: 540,
    status: "In Stock",
    lastRestocked: "2026-10-15",
  },
  {
    id: "inv-2",
    sku: "AUD-HP-002",
    productName: "Aura Noise-Cancelling Headphones Pro",
    category: "Audio & Tech",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80",
    stock: 42,
    minThreshold: 20,
    location: "Nevada Whse - Section B2",
    unitCost: 135,
    status: "In Stock",
    lastRestocked: "2026-10-28",
  },
  {
    id: "inv-3",
    sku: "LTH-BG-003",
    productName: "Artisan Full-Grain Leather Weekender",
    category: "Leather Goods",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&auto=format&fit=crop&q=80",
    stock: 6,
    minThreshold: 10,
    location: "Milan Hub - Rack 11",
    unitCost: 210,
    status: "Low Stock",
    lastRestocked: "2026-09-04",
  },
  {
    id: "inv-4",
    sku: "HOM-VS-004",
    productName: "Komorebi Minimalist Ceramic Vase",
    category: "Home & Living",
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=200&auto=format&fit=crop&q=80",
    stock: 75,
    minThreshold: 15,
    location: "Nevada Whse - Aisle 3",
    unitCost: 24,
    status: "In Stock",
    lastRestocked: "2026-11-01",
  },
  {
    id: "inv-5",
    sku: "SH-VK-005",
    productName: "Velocity Knit Minimalist Sneaker",
    category: "Minimalist Footwear",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80",
    stock: 0,
    minThreshold: 25,
    location: "Port of Long Beach - Transit",
    unitCost: 65,
    status: "Out of Stock",
    lastRestocked: "2026-08-19",
  },
  {
    id: "inv-6",
    sku: "APP-CT-006",
    productName: "Merino Wool Cashmere Oversized Coat",
    category: "Designer Apparel",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
    stock: 12,
    minThreshold: 8,
    location: "Milan Hub - Rack 04",
    unitCost: 270,
    status: "In Stock",
    lastRestocked: "2026-10-20",
  },
  {
    id: "inv-7",
    sku: "ACC-SG-007",
    productName: "Horizon Polarized Titanium Sunglasses",
    category: "Leather Goods",
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=200&auto=format&fit=crop&q=80",
    stock: 31,
    minThreshold: 15,
    location: "Tokyo Hub - Shelf T2",
    unitCost: 78,
    status: "In Stock",
    lastRestocked: "2026-10-12",
  },
  {
    id: "inv-8",
    sku: "TEC-KB-008",
    productName: "Aero Mechanical Wireless Keyboard",
    category: "Audio & Tech",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200&auto=format&fit=crop&q=80",
    stock: 5,
    minThreshold: 12,
    location: "Nevada Whse - Section C1",
    unitCost: 85,
    status: "Low Stock",
    lastRestocked: "2026-09-15",
  },
];

export const INITIAL_DISCOUNTS: DiscountCoupon[] = [
  {
    id: "disc-1",
    code: "AURA20",
    type: "percentage",
    value: 20,
    usageCount: 342,
    usageLimit: 500,
    minSpend: 150,
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    status: "Active",
    category: "All Categories",
  },
  {
    id: "disc-2",
    code: "VIPLUXURY",
    type: "fixed",
    value: 100,
    usageCount: 89,
    usageLimit: 200,
    minSpend: 500,
    startDate: "2026-10-15",
    endDate: "2026-12-15",
    status: "Active",
    category: "Luxury Timepieces",
  },
  {
    id: "disc-3",
    code: "FREESHIPNOW",
    type: "free_shipping",
    value: 0,
    usageCount: 614,
    usageLimit: 1000,
    minSpend: 75,
    startDate: "2026-11-01",
    endDate: "2026-12-31",
    status: "Active",
    category: "All Categories",
  },
  {
    id: "disc-4",
    code: "BLACKFRIDAY30",
    type: "percentage",
    value: 30,
    usageCount: 0,
    usageLimit: 1500,
    minSpend: 250,
    startDate: "2026-11-25",
    endDate: "2026-11-29",
    status: "Scheduled",
    category: "All Categories",
  },
  {
    id: "disc-5",
    code: "FALL15",
    type: "percentage",
    value: 15,
    usageCount: 450,
    usageLimit: 450,
    minSpend: 100,
    startDate: "2026-09-01",
    endDate: "2026-10-31",
    status: "Expired",
    category: "Designer Apparel",
  },
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev-1",
    productName: "Chronos Heritage Automatic Watch",
    productImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80",
    customerName: "Eleanor Sterling",
    customerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    verified: true,
    rating: 5,
    title: "Masterpiece craftsmanship and impeccable accuracy",
    comment: "The finishing on the case bevels is indistinguishable from haute horlogerie pieces costing five times as much. Keeps +1.8s/day. Sublime packaging as well.",
    date: "2026-11-08",
    status: "Published",
  },
  {
    id: "rev-2",
    productName: "Aura Noise-Cancelling Headphones Pro",
    productImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80",
    customerName: "Julian Vance",
    customerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    verified: true,
    rating: 5,
    title: "The acoustic transparency is unmatched",
    comment: "ANC silences long-haul flights completely. Soundstage is wide, punchy sub-bass without mud. Seamless Bluetooth multipoint connection.",
    date: "2026-11-07",
    status: "Published",
  },
  {
    id: "rev-3",
    productName: "Artisan Full-Grain Leather Weekender",
    productImage: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&auto=format&fit=crop&q=80",
    customerName: "Marcus Brody",
    customerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    verified: true,
    rating: 5,
    title: "Aging into a stunning rich patina",
    comment: "Traveled across 4 continents with this bag. Sturdy brass zippers and thick full-grain leather that absorbs scuffs into gorgeous character.",
    date: "2026-11-05",
    status: "Published",
  },
  {
    id: "rev-4",
    productName: "Velocity Knit Minimalist Sneaker",
    productImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80",
    customerName: "Liam Harper",
    customerAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80",
    verified: true,
    rating: 3,
    title: "Great comfort but runs slightly narrow",
    comment: "Extremely lightweight and soft foam, but if you have wider feet recommend sizing half a step up. Hoping for more restocks in size 11.",
    date: "2026-11-04",
    status: "Pending",
  },
  {
    id: "rev-5",
    productName: "Komorebi Minimalist Ceramic Vase",
    productImage: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=200&auto=format&fit=crop&q=80",
    customerName: "Clara Oswald",
    customerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    verified: true,
    rating: 5,
    title: "Serene focal point on my dining table",
    comment: "The organic matte finish catches ambient morning light beautifully. Sturdy weight and clean silhouette.",
    date: "2026-11-02",
    status: "Published",
  },
  {
    id: "rev-6",
    productName: "Aero Mechanical Wireless Keyboard",
    productImage: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200&auto=format&fit=crop&q=80",
    customerName: "Anonymous Bot",
    customerAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
    verified: false,
    rating: 1,
    title: "Spam advertisement link",
    comment: "Check out crypto bonuses at fake-link-now.example for discounts!",
    date: "2026-11-01",
    status: "Flagged",
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "High-Value Order Received",
    message: "Eleanor Sterling placed order #ORD-9401 for $1,300.00 via Apple Pay.",
    type: "order",
    timestamp: "12 minutes ago",
    read: false,
    actionUrl: "/orders",
    actionText: "View Order",
  },
  {
    id: "notif-2",
    title: "Critical Low Stock Alert",
    message: "Artisan Full-Grain Leather Weekender has only 6 units remaining (Threshold: 10).",
    type: "stock",
    timestamp: "1 hour ago",
    read: false,
    actionUrl: "/inventory",
    actionText: "Restock SKU",
  },
  {
    id: "notif-3",
    title: "Out of Stock Notification",
    message: "Velocity Knit Minimalist Sneaker reached 0 inventory units.",
    type: "stock",
    timestamp: "3 hours ago",
    read: false,
    actionUrl: "/inventory",
    actionText: "Manage Inventory",
  },
  {
    id: "notif-4",
    title: "Customer Review Flagged",
    message: "A suspicious 1-star review on Aero Mechanical Keyboard was auto-flagged by moderation rules.",
    type: "system",
    timestamp: "5 hours ago",
    read: true,
    actionUrl: "/reviews",
    actionText: "Moderate Review",
  },
  {
    id: "notif-5",
    title: "New VIP Customer Tier Reached",
    message: "Marcus Brody has crossed $19,000 in lifetime spend and earned Tier 1 VIP benefits.",
    type: "customer",
    timestamp: "Yesterday at 4:15 PM",
    read: true,
    actionUrl: "/customers",
    actionText: "View Profile",
  },
  {
    id: "notif-6",
    title: "Daily Cloud Backup Completed",
    message: "Automated snapshot of all catalogs, transactions, and customer records stored successfully.",
    type: "system",
    timestamp: "Yesterday at 11:59 PM",
    read: true,
  },
  {
    id: "notif-7",
    title: "Security: New Device Login",
    message: "Admin session authenticated from Firefox on Linux (Palo Alto, CA).",
    type: "security",
    timestamp: "2 days ago",
    read: true,
    actionUrl: "/profile",
    actionText: "Review Sessions",
  },
];

/* ---------------------------------------------------------
   ANALYTICS & KPI SERIES
--------------------------------------------------------- */

export const REVENUE_CHART_DATA = {
  "7d": [
    { date: "Nov 4", revenue: 14200, previous: 12100, orders: 142 },
    { date: "Nov 5", revenue: 16800, previous: 13900, orders: 168 },
    { date: "Nov 6", revenue: 15400, previous: 14500, orders: 152 },
    { date: "Nov 7", revenue: 21900, previous: 18200, orders: 210 },
    { date: "Nov 8", revenue: 28400, previous: 23100, orders: 278 },
    { date: "Nov 9", revenue: 24600, previous: 20400, orders: 245 },
    { date: "Nov 10", revenue: 27130, previous: 21800, orders: 264 },
  ],
  "30d": [
    { date: "Week 1", revenue: 84200, previous: 71000, orders: 840 },
    { date: "Week 2", revenue: 96500, previous: 82400, orders: 960 },
    { date: "Week 3", revenue: 112400, previous: 94100, orders: 1110 },
    { date: "Week 4", revenue: 128430, previous: 104200, orders: 1280 },
  ],
  "90d": [
    { date: "Aug", revenue: 298000, previous: 245000, orders: 3100 },
    { date: "Sep", revenue: 342000, previous: 289000, orders: 3580 },
    { date: "Oct", revenue: 389400, previous: 318000, orders: 4020 },
  ],
  "12m": [
    { date: "Jan", revenue: 180000, previous: 140000 },
    { date: "Feb", revenue: 210000, previous: 165000 },
    { date: "Mar", revenue: 245000, previous: 195000 },
    { date: "Apr", revenue: 230000, previous: 190000 },
    { date: "May", revenue: 275000, previous: 220000 },
    { date: "Jun", revenue: 310000, previous: 250000 },
    { date: "Jul", revenue: 295000, previous: 240000 },
    { date: "Aug", revenue: 340000, previous: 280000 },
    { date: "Sep", revenue: 385000, previous: 310000 },
    { date: "Oct", revenue: 420000, previous: 340000 },
    { date: "Nov", revenue: 468000, previous: 375000 },
    { date: "Dec", revenue: 540000, previous: 430000 },
  ],
};

export const CHANNEL_PERFORMANCE = [
  { channel: "Direct Web", visitors: 48200, sales: 89400, percentage: 42, color: "#1c1917" },
  { channel: "Organic Search", visitors: 34100, sales: 54200, percentage: 26, color: "#d97706" },
  { channel: "Instagram & Social", visitors: 28900, sales: 38900, percentage: 18, color: "#6366f1" },
  { channel: "Email Newsletter", visitors: 14200, sales: 24100, percentage: 11, color: "#10b981" },
  { channel: "Referral / Press", visitors: 4100, sales: 7400, percentage: 3, color: "#ec4899" },
];

export const FUNNEL_METRICS = [
  { stage: "Store Visits", count: 142800, rate: 100 },
  { stage: "Product Views", count: 86400, rate: 60.5 },
  { stage: "Add to Bag", count: 21900, rate: 15.3 },
  { stage: "Initiated Checkout", count: 9400, rate: 6.6 },
  { stage: "Purchased", count: 4890, rate: 3.42 },
];
