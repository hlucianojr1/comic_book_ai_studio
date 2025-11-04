import JSZip from 'jszip';
import { ComicBook, Panel } from '../types';

const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const createProjectBlob = async (comicBook: ComicBook): Promise<Blob> => {
    const zip = new JSZip();

    // Create a clean version of the project data for JSON
    const projectData = { ...comicBook };
    const imagePaths: Record<string, string> = {};

    projectData.pages = projectData.pages.map((page, pageIndex) => {
        const newPanels = page.panels.map((panel, panelIndex) => {
            if (panel.imageUrl && panel.imageUrl.startsWith('data:image/')) {
                const pageNum = (pageIndex + 1).toString().padStart(2, '0');
                const panelLetter = String.fromCharCode(65 + panelIndex);
                const fileName = `P${pageNum}_${panelLetter}.png`;
                imagePaths[panel.id] = fileName;
                return { ...panel, imageUrl: `images/${fileName}` };
            }
            return { ...panel, isLoading: false };
        });
        
        if (page.sharedBackgroundUrl && page.sharedBackgroundUrl.startsWith('data:image/')) {
            const pageNum = (pageIndex + 1).toString().padStart(2, '0');
            const fileName = `P${pageNum}_BG.png`;
            imagePaths[page.id] = fileName;
            return { ...page, panels: newPanels, isGeneratingBackground: false, sharedBackgroundUrl: `images/${fileName}` };
        }

        return { ...page, panels: newPanels, isGeneratingBackground: false };
    });

    zip.file("comic_data.json", JSON.stringify(projectData, null, 2));

    // Add images to the zip
    const imgFolder = zip.folder("images");
    if (imgFolder) {
        for (const page of comicBook.pages) {
            for (const panel of page.panels) {
                if (panel.imageUrl && panel.imageUrl.startsWith('data:image/') && imagePaths[panel.id]) {
                    const blob = base64ToBlob(panel.imageUrl, 'image/png');
                    imgFolder.file(imagePaths[panel.id], blob);
                }
            }
            if (page.sharedBackgroundUrl && page.sharedBackgroundUrl.startsWith('data:image/') && imagePaths[page.id]) {
                const blob = base64ToBlob(page.sharedBackgroundUrl, 'image/png');
                imgFolder.file(imagePaths[page.id], blob);
            }
        }
    }

    return await zip.generateAsync({ type: "blob" });
};

export const loadProjectFromBlob = async (blob: Blob): Promise<ComicBook> => {
    const zip = await JSZip.loadAsync(blob);
    
    const dataFile = zip.file("comic_data.json");
    if (!dataFile) {
        throw new Error("Invalid project file: comic_data.json not found.");
    }
    const projectData: ComicBook = JSON.parse(await dataFile.async("string"));

    // Load images from zip and replace paths with base64 data
    const imagePromises = projectData.pages.flatMap(page => {
        const panelPromises = page.panels.map(async (panel: Panel) => {
            if (panel.imageUrl && panel.imageUrl.startsWith('images/')) {
                const imageFile = zip.file(panel.imageUrl);
                if (imageFile) {
                    const imageBlob = await imageFile.async('blob');
                    panel.imageUrl = await blobToBase64(imageBlob);
                }
            }
            return panel;
        });
        
        const bgPromise = async () => {
             if (page.sharedBackgroundUrl && page.sharedBackgroundUrl.startsWith('images/')) {
                const imageFile = zip.file(page.sharedBackgroundUrl);
                if (imageFile) {
                    const imageBlob = await imageFile.async('blob');
                    page.sharedBackgroundUrl = await blobToBase64(imageBlob);
                }
            }
            return page;
        };

        return [...panelPromises, bgPromise()];
    });
    
    await Promise.all(imagePromises);

    return projectData;
};
