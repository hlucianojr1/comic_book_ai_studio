
import { Page, ComicBook, LayoutType } from '../types';
import { LAYOUT_TEMPLATES } from '../constants';

const CANVAS_WIDTH = 1700; // 8.5" at 200 DPI
const CANVAS_HEIGHT = 2200; // 11" at 200 DPI
const GUTTER = 20; // Gutter size between panels

interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (url.startsWith('https://via.placeholder.com')) {
        return reject(new Error(`Panel uses a placeholder image.`));
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
};

const getLayoutGeometry = (layoutType: LayoutType, panelCount: number): PanelRect[] => {
    const W = CANVAS_WIDTH;
    const H = CANVAS_HEIGHT;
    const G = GUTTER;
    
    switch (layoutType) {
        case LayoutType.SPLASH:
            return [{ x: 0, y: 0, width: W, height: H }];
        case LayoutType.TWO_PANEL_VERTICAL:
            const h2 = (H - G) / 2;
            return [{ x: 0, y: 0, width: W, height: h2 }, { x: 0, y: h2 + G, width: W, height: h2 }];
        case LayoutType.THREE_PANEL_HORIZONTAL:
            const w3 = (W - G * 2) / 3;
            return [{ x: 0, y: 0, width: w3, height: H }, { x: w3 + G, y: 0, width: w3, height: H }, { x: (w3 + G) * 2, y: 0, width: w3, height: H }];
        case LayoutType.FOUR_PANEL_GRID:
            const w4 = (W - G) / 2;
            const h4 = (H - G) / 2;
            return [
                { x: 0, y: 0, width: w4, height: h4 }, { x: w4 + G, y: 0, width: w4, height: h4 },
                { x: 0, y: h4 + G, width: w4, height: h4 }, { x: w4 + G, y: h4 + G, width: w4, height: h4 }
            ];
        case LayoutType.THREE_PANEL_TOP_HEAVY:
            const hTop = (H - G) / 2;
            const wBottom = (W - G) / 2;
            const hBottom = (H - G) / 2;
            return [
                { x: 0, y: 0, width: W, height: hTop },
                { x: 0, y: hTop + G, width: wBottom, height: hBottom },
                { x: wBottom + G, y: hTop + G, width: wBottom, height: hBottom }
            ];
        case LayoutType.FOUR_PANEL_MANGA_SPLASH:
            const wLeft = (W - G) / 2;
            const wRight = (W - G) / 2;
            const hRight = (H - G * 2) / 3;
            return [
                { x: 0, y: 0, width: wLeft, height: H },
                { x: wLeft + G, y: 0, width: wRight, height: hRight },
                { x: wLeft + G, y: hRight + G, width: wRight, height: hRight },
                { x: wLeft + G, y: (hRight + G) * 2, width: wRight, height: hRight }
            ];
        default:
            // Fallback for unknown layouts - just stack them
            const h = (H - (G * (panelCount -1))) / panelCount;
            return Array.from({length: panelCount}, (_, i) => ({ x: 0, y: i * (h + G), width: W, height: h}));
    }
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, rect: PanelRect) {
    const imgRatio = img.width / img.height;
    const rectRatio = rect.width / rect.height;
    let sx, sy, sWidth, sHeight;

    if (imgRatio > rectRatio) { // Image is wider than rect
        sHeight = img.height;
        sWidth = sHeight * rectRatio;
        sx = (img.width - sWidth) / 2;
        sy = 0;
    } else { // Image is taller or same aspect ratio
        sWidth = img.width;
        sHeight = sWidth / rectRatio;
        sx = 0;
        sy = (img.height - sHeight) / 2;
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, rect.x, rect.y, rect.width, rect.height);
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    
    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      }
      else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
}


function drawTextOverlay(ctx: CanvasRenderingContext2D, text: string, rect: PanelRect) {
    if (!text) return;
    
    const fontSize = Math.max(24, Math.round(rect.width / 25));
    const padding = fontSize * 0.75;
    const lineHeight = fontSize * 1.2;
    
    ctx.font = `bold ${fontSize}px "Arial", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Simple measurement for background height
    const words = text.split(' ');
    let line = '';
    let lineCount = 1;
    const maxWidth = rect.width - padding * 2;
    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            line = words[n] + ' ';
            lineCount++;
        } else {
            line = testLine;
        }
    }
    
    const textBlockHeight = lineCount * lineHeight;
    const bgHeight = textBlockHeight + padding;
    const bgY = rect.y + rect.height - bgHeight;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(rect.x, bgY, rect.width, bgHeight);

    ctx.fillStyle = 'white';
    const textY = bgY + bgHeight / 2;
    drawWrappedText(ctx, text, rect.x + rect.width / 2, textY, maxWidth, lineHeight);
}


export const renderPageAsImage = async (page: Page, comicBook: ComicBook): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error("Could not get canvas context");
    }

    const layout = LAYOUT_TEMPLATES.find(lt => lt.id === page.layout);
    if (!layout) {
        throw new Error("Layout template not found");
    }
    
    const panelImageUrls = page.panels.map(p => p.imageUrl);
    if (panelImageUrls.some(url => !url)) {
        throw new Error("One or more panels are missing an image.");
    }

    const loadedImages = await Promise.all(panelImageUrls.map(url => loadImage(url!)));
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const geometry = getLayoutGeometry(page.layout, page.panels.length);

    page.panels.forEach((panel, index) => {
        const rect = geometry[index];
        const img = loadedImages[index];
        
        // Draw image with 'cover' effect
        drawCoverImage(ctx, img, rect);

        // Draw panel border
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });

    // Draw text overlays after all images are drawn
    page.panels.forEach((panel, index) => {
        const rect = geometry[index];
        drawTextOverlay(ctx, panel.textOverlay, rect);
    });

    return canvas.toDataURL('image/jpeg', 0.9);
};
