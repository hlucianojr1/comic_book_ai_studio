import { ComicBook } from '../types';
import { createProjectBlob, loadProjectFromBlob } from './projectArchiver';

// These would come from your environment variables
const API_KEY = process.env.API_KEY!;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const APP_ID = CLIENT_ID.split('-')[0];

let gapiInited = false;
let pickerInited = false;

const initGapiClient = async (): Promise<void> => {
  if (gapiInited) return;
  await window.gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  });
  gapiInited = true;
};

const initPicker = async (): Promise<void> => {
    if (pickerInited) return;
    await initGapiClient(); // Picker depends on gapi client
    pickerInited = true;
};

const getToken = (): string | null => {
    const storedToken = localStorage.getItem('g-token');
    if (storedToken) {
        return JSON.parse(storedToken).access_token;
    }
    return null;
};

export const uploadProject = async (comicBook: ComicBook, fileId: string | null): Promise<string> => {
    const blob = await createProjectBlob(comicBook);
    const token = getToken();
    if (!token) throw new Error("User not authenticated");

    const metadata = {
        name: `${comicBook.title.replace(/[^a-zA-Z0-9]/g, '_')}.comic`,
        mimeType: 'application/zip',
        appProperties: {
            isComicBookCreatorProject: 'true',
        },
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const method = fileId ? 'PATCH' : 'POST';
    const path = fileId
      ? `/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : '/upload/drive/v3/files?uploadType=multipart';
    
    const response = await fetch(`https://www.googleapis.com${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Google Drive API Error: ${errorBody.error.message}`);
    }

    const responseData = await response.json();
    return responseData.id;
};

interface LoadResult {
    comicBook: ComicBook;
    fileId: string;
}

export const loadProjectFromPicker = async (): Promise<LoadResult | null> => {
    return new Promise(async (resolve, reject) => {
        try {
            await initPicker();
            const token = getToken();
            if (!token) {
                return reject(new Error("User not authenticated"));
            }

            const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
            view.setQuery("appProperties has { key='isComicBookCreatorProject' and value='true' }");

            const picker = new window.google.picker.PickerBuilder()
                .setAppId(APP_ID)
                .setOAuthToken(token)
                .addView(view)
                .setDeveloperKey(API_KEY)
                .setCallback((data: any) => {
                    if (data.action === window.google.picker.Action.PICKED) {
                        const fileId = data.docs[0].id;
                        downloadAndProcessFile(fileId, token)
                            .then(comicBook => resolve({ comicBook, fileId }))
                            .catch(reject);
                    } else if (data.action === window.google.picker.Action.CANCEL) {
                        resolve(null);
                    }
                })
                .build();
            picker.setVisible(true);
        } catch (error) {
            reject(error);
        }
    });
};

const downloadAndProcessFile = async (fileId: string, token: string): Promise<ComicBook> => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error("Failed to download file from Google Drive");
    }
    const blob = await response.blob();
    return await loadProjectFromBlob(blob);
};
