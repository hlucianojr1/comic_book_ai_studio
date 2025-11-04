import saveAs from 'file-saver';
import { ComicBook } from '../types';
import { createProjectBlob } from './projectArchiver';

export const exportToZip = async (comicBook: ComicBook) => {
    try {
        const content = await createProjectBlob(comicBook);
        const safeTitle = comicBook.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        saveAs(content, `${safeTitle}_project.zip`);
    } catch (error) {
        console.error("Failed to generate ZIP file:", error);
        alert("An error occurred while creating the project file. Please check the console for details.");
    }
};
