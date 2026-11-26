export interface Project {
  title: string;
  description: string;
  tags: string[];
  image: string;
  url: string;
}

export const projects: Project[] = [
  {
    title: 'Masala Lane Kitchen',
    description: 'A warm Indian restaurant site with a filterable menu and reservations.',
    tags: ['Restaurant', 'Filterable Menu', 'Reservations'],
    image: '/projects/masala-lane-kitchen.png',
    url: 'https://masala-lane-dummy.vercel.app/',
  },
  {
    title: 'Ember & Bean Coffee',
    description: 'A fresh neighborhood coffee shop site with order-ahead links and rewards.',
    tags: ['Coffee Shop', 'Order Ahead', 'Rewards'],
    image: '/projects/ember-and-bean-coffee.png',
    url: 'https://ember-and-bean-coffee-eight.vercel.app/',
  },
  {
    title: 'Slice Society Pizza',
    description: 'A fun retro pizzeria site with a pizza builder and quick mobile ordering.',
    tags: ['Pizzeria', 'Pizza Builder', 'Mobile Ordering'],
    image: '/projects/slice-society-pizza.png',
    url: 'https://slice-society-pizza.vercel.app/',
  },
];
