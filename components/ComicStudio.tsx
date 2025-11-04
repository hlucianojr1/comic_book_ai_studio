import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StudioState, Agent, StepStatus, StudioStepInfo } from '../types';
import { 
    CheckCircleIcon, LoadingCircleIcon, PendingCircleIcon, ErrorCircleIcon, InputRequiredIcon,
    PlayIcon, StopIcon, RobotIcon, SendIcon, SunIcon, MoonIcon, ChevronLeftIcon, RefreshCwIcon,
    UserCheckIcon, ThumbsUpIcon, ThumbsDownIcon,
} from './Icons';
import Spinner from './Spinner';
import StudioCanvas from './StudioCanvas';
import { generateImage, editImage, generateText, generateStructuredText } from '../services/geminiService';


interface ComicStudioProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const ALL_STEPS: Omit<StudioStepInfo, 'status' | 'imageUrl'>[] = [
    { step: 1, title: 'Series Bible', agent: Agent.A1 },
    { step: 2, title: 'Plot Outline', agent: Agent.A1 },
    { step: 3, title: 'Reflection Check', agent: Agent.A1 },
    { step: 4, title: 'Full Script', agent: Agent.A1 },
    { step: 5, title: 'Visual Asset Lock', agent: Agent.A2 },
    { step: 6, title: 'Page Layout (Pencils)', agent: Agent.A3 },
    { step: 7, title: 'Inking', agent: Agent.A4 },
    { step: 8, title: 'Coloring', agent: Agent.A5 },
    { step: 9, title: 'Lettering', agent: Agent.A6 },
    { step: 10, title: 'Final Validation', agent: Agent.A7 },
];

const getInitialHistory = (): StudioStepInfo[] => 
    ALL_STEPS.map(step => ({ ...step, status: StepStatus.PENDING, imageUrl: null }));

const getInitialState = (): StudioState => ({
    current_step: 0,
    active_agent: Agent.A1,
    last_action_summary: 'Ready to start.',
    next_instruction: null,
    status: StepStatus.PENDING,
    history: getInitialHistory(),
});

// This is a MOCK orchestrator that simulates the backend agent workflow.
const mockOrchestrator = async (
    prompt: string,
    theme: 'light' | 'dark',
    updateState: React.Dispatch<React.SetStateAction<StudioState>>,
    requestUserInput: (clarification: string) => Promise<string>,
    requestUserApproval: () => Promise<boolean>
): Promise<void> => {
    let currentImageUrl: string | null = null;
    let fullStoryContext = `User's initial comic concept: "${prompt}"`;
    
    for (let i = 0; i < ALL_STEPS.length; i++) {
        const currentStepInfo = ALL_STEPS[i];
        let stepOutputForDisplay: string | undefined;

        // 1. Set current step to IN_PROGRESS
        updateState(prev => ({
            ...prev,
            current_step: currentStepInfo.step,
            active_agent: currentStepInfo.agent,
            status: StepStatus.IN_PROGRESS,
            last_action_summary: `Starting: ${currentStepInfo.title}...`,
            history: prev.history.map((h, idx) => idx === i ? { ...h, status: StepStatus.IN_PROGRESS } : h),
        }));

        // 2. Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        let stepSummary = `Completed: ${currentStepInfo.title}`;

        const useFallbackImage = () => {
            const seed = prompt.slice(0, 10).replace(/\s/g, ''); // create a consistent seed
            const bgColor = theme === 'dark' ? '2d3748' : 'e2e8f0';
            const fgColor = theme === 'dark' ? 'e2e8f0' : '2d3748';
            currentImageUrl = `https://placehold.co/800x1200/${bgColor}/${fgColor}?text=Step+${currentStepInfo.step}%0A(Fallback)&font=roboto&seed=${seed}`;
        };

        try {
            if (currentStepInfo.step === 1) { // Series Bible
                const biblePrompt = `Generate a complete Series Bible (including Genre, Tone, Protagonist, World Rules, and core Conflict) based on the following user's concept: "${prompt}"`;
                const seriesBible = await generateText(biblePrompt);
                fullStoryContext += `\n\n--- SERIES BIBLE ---\n${seriesBible}`;
                stepSummary = `Generated Series Bible defining the story's core elements.`;
                stepOutputForDisplay = seriesBible;
            } else if (currentStepInfo.step === 2) { // Plot Outline
                const outlinePrompt = `Based on the Series Bible, generate a Plot Outline for a single comic page using a Three-Act Structure. Describe the Key Story Beats and Narrative Goal for the beginning, middle, and end of the page.\n\nContext:\n${fullStoryContext}`;
                const plotOutline = await generateText(outlinePrompt);
                fullStoryContext += `\n\n--- PAGE 1 PLOT OUTLINE ---\n${plotOutline}`;
                stepSummary = `Created a single-page plot outline with a three-act structure.`;
                stepOutputForDisplay = plotOutline;
            } else if (currentStepInfo.step === 3) { // Reflection Check
                const reflectionPrompt = `Act as a Structural Editor. Review the following Series Bible and Plot Outline. Is there any critical missing information or a direct contradiction? If yes, formulate a single, clear question for the user to clarify it. If no, respond with only the text "OK".\n\nContext:\n${fullStoryContext}`;
                const reflectionResponse = await generateText(reflectionPrompt);

                if (reflectionResponse.trim().toUpperCase() !== 'OK') {
                    const clarification = reflectionResponse;
                    stepOutputForDisplay = `Agent requested clarification:\n\n"${clarification}"`;
                    updateState(prev => ({
                        ...prev,
                        status: StepStatus.PENDING_USER_INPUT,
                        last_action_summary: 'Awaiting user clarification.',
                        next_instruction: clarification,
                        history: prev.history.map((h, idx) => idx === i ? { ...h, status: StepStatus.PENDING_USER_INPUT, summary: stepOutputForDisplay } : h),
                    }));

                    const userResponse = await requestUserInput(clarification);
                    if (userResponse === "Process aborted by user." || userResponse === "Process aborted.") {
                        throw new Error("User aborted the process.");
                    }
                    
                    fullStoryContext += `\n\n--- USER CLARIFICATION ---\n${userResponse}`;
                    stepSummary = `User provided clarification. Resuming script generation.`;
                    stepOutputForDisplay += `\n\nUser response:\n\n"${userResponse}"`; // Append user response
                    updateState(prev => ({ ...prev, status: StepStatus.IN_PROGRESS, next_instruction: null }));
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                     stepSummary = `Automated reflection check passed. Story is coherent.`;
                     stepOutputForDisplay = "Automated reflection check passed. Story is coherent.";
                }
            } else if (currentStepInfo.step === 4) { // Full Script
                const scriptPrompt = `Generate a full, single-page comic script with panel-by-panel instructions based on all the provided context. For each panel, specify: Camera Angle, Character Pose/Action, Setting, Lighting, and Dialogue/Narration.\n\nContext:\n${fullStoryContext}`;
                const script = await generateText(scriptPrompt);
                fullStoryContext += `\n\n--- FINAL SCRIPT (PAGE 1) ---\n${script}`;
                stepSummary = `Generated detailed script.`;
                stepOutputForDisplay = script;
            } else if (currentStepInfo.step === 5) { // Visual Asset Lock
                const characterPrompt = `Create a high-resolution character reference sheet based on this story: "${fullStoryContext}". Show the main character from multiple angles (front, side, back) in a clean, simple, black and white line art style. This will be used as a visual guide for the penciller.`;
                currentImageUrl = await generateImage(characterPrompt, '1:1');
                stepSummary = "Generated character reference sheet for visual consistency.";
            } else if (currentStepInfo.step === 6) { // Pencils
                if (!currentImageUrl) {
                    stepSummary = "Skipping pencils: No character reference sheet. Using placeholder.";
                    console.warn(stepSummary);
                    useFallbackImage();
                } else {
                    const pencilPrompt = `Using the character designs from the provided reference sheet, create a high-contrast digital pencil sketch for a comic book page based on the following script. Ensure dynamic composition and clear placeholders for text.\n\nScript Context:\n"${fullStoryContext}"`;
                    currentImageUrl = await editImage(currentImageUrl, pencilPrompt);
                    stepSummary = "Generated a draft pencil layout for the comic page.";
                }
            } else if (currentStepInfo.step === 7) { // Inking
                if (!currentImageUrl) {
                    stepSummary = "Skipping inking: No pencil sketch available. Using placeholder.";
                    console.warn(stepSummary);
                    useFallbackImage();
                } else {
                    const inkPrompt = `Convert this pencil sketch into clean, finished black-and-white line art. Use variable line weight, heavy black spotting, and cross-hatching to define shadows and texture, creating a professional inking style.`;
                    currentImageUrl = await editImage(currentImageUrl, inkPrompt);
                    stepSummary = "Inked the pencil sketch into clean line art.";
                }
            } else if (currentStepInfo.step === 8) { // Coloring
                if (!currentImageUrl) {
                    stepSummary = "Skipping coloring: No inked line art available. Using placeholder.";
                    console.warn(stepSummary);
                    useFallbackImage();
                } else {
                    const colorPrompt = `Apply a professional color palette to this inked line art. Add dramatic digital shading and highlighting to set the mood dictated by the script.\n\nStory Context: ${fullStoryContext}`;
                    currentImageUrl = await editImage(currentImageUrl, colorPrompt);
                    stepSummary = "Applied color and lighting to the comic page.";
                }
            } else if (currentStepInfo.step === 9) { // Lettering
                if (!currentImageUrl) {
                    stepSummary = "Skipping lettering: No colored page available. Using placeholder.";
                    console.warn(stepSummary);
                    useFallbackImage();
                } else {
                    const letteringPrompt = `Overlay professional comic book lettering on this colored art. Add all dialogue in speech bubbles with correct tails, and narration in caption boxes, ensuring maximum readability without obscuring key art. Use the script for all text content.\n\nScript:\n"${fullStoryContext}"`;
                    currentImageUrl = await editImage(currentImageUrl, letteringPrompt);
                    stepSummary = "Added lettering, speech bubbles, and captions.";
                }
            } else if (currentStepInfo.step === 10) { // Final Validation
                const validationPrompt = `Act as a final editor. Perform a 3-point QC check on the comic page: 1. Continuity (Does the art match the story context?), 2. Lettering (Is text from the script placed correctly?), 3. Accuracy (Does it fulfill the user's original concept?). Provide a final validation report and a boolean pass/fail status. Mention that a technical check (DPI, margins) would happen in a real workflow.\n\nFull Context:\n${fullStoryContext}`;
                
                const validationSchema = {
                    type: 'OBJECT',
                    properties: {
                        validation_passed: { type: 'BOOLEAN', description: 'Whether the page passes the final quality check.' },
                        final_report: { type: 'STRING', description: 'A detailed report of the validation findings.' },
                    },
                    required: ['validation_passed', 'final_report'],
                };

                const validationResult = await generateStructuredText(validationPrompt, validationSchema);
                stepSummary = `Validation report generated.`;
                stepOutputForDisplay = `QC CHECK\nValidation Passed: ${validationResult.validation_passed}\n\nFINAL REPORT:\n${validationResult.final_report}`;
                
                if (!validationResult.validation_passed) {
                    throw new Error(validationResult.final_report);
                }
            }
        } catch (error) {
            // This catch block handles failures for any step
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            updateState(prev => ({
                ...prev,
                status: StepStatus.FAIL,
                last_action_summary: `Error at step ${currentStepInfo.step} (${currentStepInfo.title}): ${errorMessage}`,
                history: prev.history.map((h, idx) => idx === i ? { ...h, status: StepStatus.FAIL, summary: errorMessage, imageUrl: currentImageUrl } : h),
            }));
            return; // Stop the orchestrator
        }
        
        const finalStepSummaryForHistory = stepOutputForDisplay ?? (stepSummary.split(':')[1]?.trim() ?? stepSummary);

        // 4. Update state to SUCCESS for the current step
        updateState(prev => ({
            ...prev,
            status: StepStatus.SUCCESS, // Temporarily set overall status to SUCCESS
            last_action_summary: stepSummary,
            history: prev.history.map((h, idx) => idx === i ? { ...h, status: StepStatus.SUCCESS, summary: finalStepSummaryForHistory, imageUrl: currentImageUrl } : h),
        }));
        
        // 5. If not the last step, wait for user approval
        if (currentStepInfo.step < ALL_STEPS.length) {
            updateState(prev => ({
                ...prev,
                status: StepStatus.PENDING_USER_APPROVAL,
                last_action_summary: `Step ${currentStepInfo.step} complete. Waiting for your approval to continue.`,
            }));

            const approved = await requestUserApproval();
            if (!approved) {
                throw new Error(`User rejected the output of step ${currentStepInfo.step}.`);
            }
        } else {
             // This is the last step, we are done.
             updateState(prev => ({ ...prev, status: StepStatus.SUCCESS, last_action_summary: "Workflow complete!" }));
        }
    }
};


const ComicStudio: React.FC<ComicStudioProps> = ({ theme, onToggleTheme }) => {
    const [prompt, setPrompt] = useState('A noir detective story set in a city of robots, where the main character, a rusty private eye, investigates a missing data file for a mysterious femme fatale computer program.');
    const [isRunning, setIsRunning] = useState(false);
    const [studioState, setStudioState] = useState<StudioState>(getInitialState());
    const [userInput, setUserInput] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    const orchestratorController = useRef<AbortController | null>(null);
    const userResolverRef = useRef<((value: string) => void) | null>(null);
    const approvalResolverRef = useRef<((approved: boolean) => void) | null>(null);
    const stepRefs = useRef<Record<number, HTMLLIElement | null>>({});

    useEffect(() => {
      if (isRunning && studioState.current_step > 0 && isSidebarOpen) {
        setTimeout(() => {
            stepRefs.current[studioState.current_step]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
        }, 300); // Delay slightly to allow UI to render
      }
    }, [studioState.current_step, isRunning, isSidebarOpen]);

    const handleStart = useCallback(async () => {
        if (!prompt.trim()) {
            alert("Please enter a comic concept to begin.");
            return;
        }

        setIsRunning(true);
        setStudioState(() => {
            const initialHistory = getInitialHistory();
            initialHistory[0].status = StepStatus.IN_PROGRESS;
            return {
                ...getInitialState(),
                history: initialHistory,
                status: StepStatus.IN_PROGRESS,
                current_step: 1,
                active_agent: ALL_STEPS[0].agent,
                last_action_summary: `Initializing workflow...`
            };
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));

        const controller = new AbortController();
        orchestratorController.current = controller;

        const requestUserInput = (clarification: string): Promise<string> => {
            return new Promise((resolve) => {
                if (controller.signal.aborted) {
                    return resolve("Process aborted.");
                }
                userResolverRef.current = resolve;
            });
        };
        
        const requestUserApproval = (): Promise<boolean> => {
            return new Promise((resolve) => {
                if (controller.signal.aborted) {
                    return resolve(false);
                }
                approvalResolverRef.current = resolve;
            });
        };

        try {
            await mockOrchestrator(prompt, theme, setStudioState, requestUserInput, requestUserApproval);
        } catch (error) {
            if (controller.signal.aborted || (error instanceof Error && error.message.includes("aborted"))) {
                console.log("Orchestrator process was aborted.");
            } else {
                console.error("Orchestrator failed:", error);
                setStudioState(prev => ({
                    ...prev,
                    status: StepStatus.FAIL,
                    last_action_summary: `${error instanceof Error ? error.message : 'An unexpected error occurred.'}`,
                }));
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsRunning(false);
                orchestratorController.current = null;
            }
        }
    }, [prompt, theme]);

    const handleStop = () => {
        if (orchestratorController.current) {
            orchestratorController.current.abort();
            orchestratorController.current = null;
        }
        if (userResolverRef.current) {
            userResolverRef.current("Process aborted by user.");
            userResolverRef.current = null;
        }
        if (approvalResolverRef.current) {
            approvalResolverRef.current(false);
            approvalResolverRef.current = null;
        }
        setIsRunning(false);
        setStudioState(prev => ({
            ...prev,
            status: StepStatus.FAIL,
            last_action_summary: "Process stopped by user.",
            history: prev.history.map(h => 
                h.status === StepStatus.IN_PROGRESS || h.status === StepStatus.PENDING_USER_INPUT
                ? { ...h, status: StepStatus.FAIL }
                : h
            ),
        }));
    };

    const handleReset = () => {
        if (isRunning) handleStop();
        setStudioState(getInitialState());
    };

    const handleUserInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userResolverRef.current && userInput.trim()) {
            userResolverRef.current(userInput);
            userResolverRef.current = null;
            setUserInput('');
        }
    };

    const handleApprove = () => {
        if (approvalResolverRef.current) {
            setStudioState(prev => ({ 
                ...prev, 
                status: StepStatus.IN_PROGRESS,
                last_action_summary: 'Approval received. Starting next step...',
            }));
            approvalResolverRef.current(true);
            approvalResolverRef.current = null;
        }
    };

    const handleReject = () => {
        handleStop();
    };
    
    useEffect(() => {
        return () => {
            if (orchestratorController.current) {
                orchestratorController.current.abort();
            }
        };
    }, []);
    
    const isAwaitingUserInput = studioState.status === StepStatus.PENDING_USER_INPUT;
    const isAwaitingApproval = studioState.status === StepStatus.PENDING_USER_APPROVAL;

    return (
        <div className="flex h-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
            {/* Left Panel: Workflow Steps */}
            <aside className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-1/3 max-w-sm min-w-[320px]' : 'w-0'}`}>
                <div className={`p-6 flex flex-col h-full overflow-hidden ${!isSidebarOpen && 'invisible'}`}>
                    <div className="flex items-center justify-between mb-6 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow</h2>
                        <div className="flex items-center gap-2">
                             <button onClick={onToggleTheme} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" title="Toggle Theme">
                                {theme === 'dark' ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                            </button>
                            <button onClick={() => setIsSidebarOpen(false)} title="Collapse Sidebar" className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                    <ul className="space-y-3 overflow-y-auto pr-2 -mr-2">
                        {studioState.history.map((step) => {
                            const Icon = {
                                [StepStatus.SUCCESS]: CheckCircleIcon,
                                [StepStatus.IN_PROGRESS]: LoadingCircleIcon,
                                [StepStatus.PENDING]: PendingCircleIcon,
                                [StepStatus.FAIL]: ErrorCircleIcon,
                                [StepStatus.PENDING_USER_INPUT]: InputRequiredIcon,
                                [StepStatus.PENDING_USER_APPROVAL]: UserCheckIcon,
                            }[step.status];

                            const color = {
                                [StepStatus.SUCCESS]: 'text-green-500',
                                [StepStatus.IN_PROGRESS]: 'text-indigo-500',
                                [StepStatus.PENDING]: 'text-gray-400',
                                [StepStatus.FAIL]: 'text-red-500',
                                [StepStatus.PENDING_USER_INPUT]: 'text-yellow-500',
                                [StepStatus.PENDING_USER_APPROVAL]: 'text-blue-500',
                            }[step.status];

                            const isCurrent = step.step === studioState.current_step && isRunning && !isAwaitingApproval;

                            return (
                                <li ref={el => (stepRefs.current[step.step] = el)} key={step.step} className={`flex items-start p-3 rounded-lg transition-colors ${isCurrent ? 'bg-indigo-50 dark:bg-indigo-900/50' : ''}`}>
                                    <Icon className={`w-6 h-6 mr-4 flex-shrink-0 mt-1 ${color}`} />
                                    <div className="flex-grow">
                                        <p className={`font-semibold ${isCurrent ? 'text-indigo-800 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-200'}`}>{step.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{step.agent.split(':')[1].trim()}</p>
                                        {step.summary && (
                                            <p className="text-xs italic text-gray-400 dark:text-gray-500 mt-1">
                                                {([1, 2, 3, 4, 10].includes(step.step) && step.status === StepStatus.SUCCESS)
                                                    ? 'Output available on canvas.'
                                                    : step.summary
                                                }
                                            </p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </aside>

            {/* Right Panel: Main Content */}
            <main className="flex-1 flex flex-col p-6 overflow-hidden relative">
                 {!isSidebarOpen && (
                    <button onClick={() => setIsSidebarOpen(true)} title="Expand Sidebar" className="absolute top-6 -left-3 z-10 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <ChevronLeftIcon className="w-6 h-6 rotate-180" />
                    </button>
                )}
                <div className="flex-shrink-0">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AI Comic Studio</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Enter a concept and let a multi-agent AI system create a full comic page from start to finish.</p>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A noir detective story in a city of robots..."
                            className="w-full h-24 p-3 bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-gray-800 dark:text-gray-200"
                            disabled={isRunning}
                        />
                        <div className="mt-4 flex items-center justify-end gap-3">
                             <button onClick={handleReset} className="px-5 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md flex items-center gap-2" title="Reset Workflow" disabled={isRunning && !isAwaitingApproval}>
                                <RefreshCwIcon className="w-4 h-4" />
                                Reset
                            </button>
                            {isAwaitingApproval ? (
                                <>
                                    <button onClick={handleReject} className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors flex items-center gap-2">
                                        <ThumbsDownIcon className="w-5 h-5"/>
                                        Reject & Stop
                                    </button>
                                    <button onClick={handleApprove} className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2">
                                        <ThumbsUpIcon className="w-5 h-5"/>
                                        Approve & Continue
                                    </button>
                                </>
                            ) : !isRunning ? (
                                <button onClick={handleStart} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2">
                                    <PlayIcon className="w-5 h-5"/>
                                    Start Generation
                                </button>
                            ) : (
                                <button onClick={handleStop} className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 transition-colors flex items-center gap-2">
                                    <StopIcon className="w-5 h-5"/>
                                    Stop Process
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 mt-6 relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                    <StudioCanvas history={studioState.history} />
                    
                    {/* Agent Status as an overlay */}
                    <div className="absolute bottom-4 right-4 w-full max-w-md z-10">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col p-4 max-h-[40vh] overflow-hidden">
                           <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex-shrink-0">Agent Status</h3>
                           <div className="flex-1 bg-gray-100 dark:bg-gray-900/80 rounded-lg p-4 flex flex-col justify-between overflow-y-auto">
                               <div className="prose prose-sm dark:prose-invert max-w-none">
                                   <p className="font-mono text-xs uppercase text-indigo-500 dark:text-indigo-400">{studioState.active_agent}</p>
                                   <p>{studioState.last_action_summary}</p>
                               </div>
                               {isAwaitingUserInput && (
                                   <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                                       <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">{studioState.next_instruction}</p>
                                       <form onSubmit={handleUserInputSubmit} className="flex gap-2">
                                           <input
                                               type="text"
                                               value={userInput}
                                               onChange={(e) => setUserInput(e.target.value)}
                                               className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                               placeholder="Provide clarification..."
                                               autoFocus
                                           />
                                           <button type="submit" className="p-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-400">
                                                <SendIcon className="w-5 h-5"/>
                                           </button>
                                       </form>
                                   </div>
                               )}
                           </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ComicStudio;