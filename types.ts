// FIX: Add global type definitions for 'window.gapi' and 'window.google' to fix TypeScript errors.
declare global {
  interface Window {
    gapi: any;
    google: any;
    gapiLoaded?: boolean;
    gsiLoaded?: boolean;
    onGoogleScriptsLoad?: () => void;
  }
}

export enum LayoutType {
  SPLASH = 'SPLASH',
  FOUR_PANEL_GRID = 'FOUR_PANEL_GRID',
  THREE_PANEL_HORIZONTAL = 'THREE_PANEL_HORIZONTAL',
  TWO_PANEL_VERTICAL = 'TWO_PANEL_VERTICAL',
  THREE_PANEL_TOP_HEAVY = 'THREE_PANEL_TOP_HEAVY',
  FOUR_PANEL_MANGA_SPLASH = 'FOUR_PANEL_MANGA_SPLASH',
}

export interface Panel {
  id: string;
  prompt: string;
  imageUrl: string | null; // base64 data URL or external URL
  isLoading: boolean;
  loadingText?: string;
  textOverlay: string;
}

export interface Page {
  id: string;
  layout: LayoutType;
  panels: Panel[];
  backgroundPrompt: string; // Page-specific background
  sharedBackgroundUrl: string | null; // Generated background for the page
  isGeneratingBackground: boolean;
}

export interface LayoutTemplate {
  id: LayoutType;
  name: string;
  description: string;
  panelCount: number;
  containerClassName: string;
  panelClassNames?: string[];
  panelAspectRatios?: string[];
}

export interface ComicBook {
  title: string;
  globalArtStyle: string;
  globalBackgroundPrompt: string;
  pages: Page[];
}

export type StorageOption = 'local' | 'drive';

// Types for Comic Studio
export enum Agent {
    A1 = "A1: Story Agent (Orchestrator)",
    A2 = "A2: Character & World Agent",
    A3 = "A3: Visual Design Agent (Penciller)",
    A4 = "A4: Line Art Agent (Inker)",
    A5 = "A5: Color Agent (Colorist)",
    A6 = "A6: Text & Layout Agent (Letterer)",
    A7 = "A7: Editor Agent (Quality Control)",
}

export enum StepStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    SUCCESS = 'SUCCESS',
    FAIL = 'FAIL',
    PENDING_USER_INPUT = 'PENDING_USER_INPUT',
}

export interface StudioState {
    current_step: number;
    active_agent: Agent;
    last_action_summary: string;
    next_instruction: string | null;
    status: StepStatus;
    history: StudioStepInfo[];
}

export interface StudioStepInfo {
    step: number;
    title: string;
    agent: Agent;
    status: StepStatus;
    summary?: string;
    imageUrl?: string | null;
}
