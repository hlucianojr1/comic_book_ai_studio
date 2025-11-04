
import { LayoutType, LayoutTemplate } from './types';

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: LayoutType.SPLASH,
    name: 'Full-Page Splash',
    description: 'A single, impactful image.',
    panelCount: 1,
    colCount: 1,
    rowCount: 1,
    containerClassName: 'grid grid-cols-1 grid-rows-1',
    panelClassNames: [],
    panelAspectRatios: ['3:4'],
  },
  {
    id: LayoutType.TWO_PANEL_VERTICAL,
    name: '2-Panel Vertical Stack',
    description: 'Two panels stacked on top of each other.',
    panelCount: 2,
    colCount: 1,
    rowCount: 2,
    containerClassName: 'grid grid-cols-1 grid-rows-2 gap-4',
    panelClassNames: [],
    panelAspectRatios: ['4:3', '4:3'],
  },
  {
    id: LayoutType.THREE_PANEL_HORIZONTAL,
    name: '3-Panel Horizontal Stack',
    description: 'Three panels arranged side-by-side.',
    panelCount: 3,
    colCount: 3,
    rowCount: 1,
    containerClassName: 'grid grid-cols-3 grid-rows-1 gap-4',
    panelClassNames: [],
    panelAspectRatios: ['9:16', '9:16', '9:16'],
  },
  {
    id: LayoutType.FOUR_PANEL_GRID,
    name: '4-Panel Grid',
    description: 'A classic 2x2 comic grid.',
    panelCount: 4,
    colCount: 2,
    rowCount: 2,
    containerClassName: 'grid grid-cols-2 grid-rows-2 gap-4',
    panelClassNames: [],
    panelAspectRatios: ['3:4', '3:4', '3:4', '3:4'],
  },
  {
    id: LayoutType.THREE_PANEL_TOP_HEAVY,
    name: '3-Panel Storyteller (Manga-style)',
    description: 'A wide establishing panel above two smaller panels.',
    panelCount: 3,
    colCount: 2,
    rowCount: 2,
    containerClassName: 'grid grid-cols-2 grid-rows-2 gap-4',
    panelClassNames: [
        'col-span-2', // Top wide panel
        '',           // Bottom left
        '',           // Bottom right
    ],
    panelAspectRatios: ['16:9', '3:4', '3:4'],
  },
  {
    id: LayoutType.FOUR_PANEL_MANGA_SPLASH,
    name: '4-Panel Splash & Dash (Manga-style)',
    description: 'A tall splash panel on the left with three stacked panels on the right.',
    panelCount: 4,
    colCount: 3,
    rowCount: 3,
    containerClassName: 'grid grid-cols-3 grid-rows-3 gap-4',
    panelClassNames: [
        'row-span-3',           // Left tall panel
        'col-span-2',           // Top right
        'col-span-2',           // Middle right
        'col-span-2',           // Bottom right
    ],
    panelAspectRatios: ['9:16', '4:3', '4:3', '4:3'],
  },
];

export const ART_STYLES: string[] = [
  'Vintage American Comic',
  'Modern American Comic',
  'Japanese Manga',
  'Japanese Anime',
  'French/Belgian (Bande Dessinée)',
  'Indie/Alternative Comic',
  'Noir Comic',
  'Cartoon/Animated',
  'Fantasy Art',
  'Sci-Fi Art',
  'Watercolor',
  'Pixel Art',
  'Chibi',
  'Photorealistic',
  'Art Deco',
  'Art Nouveau',
  'Pop Art',
  'Surrealism',
  'Impressionism',
  'Minimalist Line Art',
  'Cyberpunk',
  'Steampunk',
  'Horror/Gothic',
  'Children\'s Book Illustration',
];


export const LOCAL_STORAGE_KEY = 'ai-comic-book-project';