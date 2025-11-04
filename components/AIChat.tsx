import React, { useState, useEffect, useRef } from 'react';
import { StudioStepInfo } from '../types';
import { generateText } from '../services/geminiService';
import { SendIcon, RobotIcon } from './Icons';

interface AIChatProps {
  steps: Omit<StudioStepInfo, 'status' | 'imageUrl' | 'summary'>[];
}

const getIntroMessage = (step: Omit<StudioStepInfo, 'status' | 'imageUrl' | 'summary'>): string => {
  const agentName = step.agent.split(':')[1].trim();
  const stepTitle = step.title;

  const intros: { [key: number]: string } = {
    1: `I am the ${agentName}, responsible for the **${stepTitle}**. I'll establish the genre, tone, protagonist, world rules, and core conflict. How can we refine this foundation?`,
    2: `As the ${agentName}, my task is the **${stepTitle}**. I'll structure the page's narrative. Let's discuss key story beats and the overall goal.`,
    3: `I'm the ${agentName} handling the **${stepTitle}**. My job is to find contradictions or missing info before we proceed. Do you have any concerns about the story's logic?`,
    4: `As the ${agentName}, I write the **${stepTitle}**. This includes detailed panel descriptions, camera angles, actions, and dialogue. What part of the script should we focus on?`,
    5: `I'm the ${agentName} in charge of **${stepTitle}**. I create reference sheets for characters and key props to ensure visual consistency. Let's define the look and feel.`,
    6: `As the ${agentName} (Penciller), I'm creating the **${stepTitle}**. I'll sketch the page layout and compositions based on the script. We can discuss panel flow and character posing.`,
    7: `I am the ${agentName} (Inker), and my step is **${stepTitle}**. I transform the pencil sketches into clean, final line art. We can talk about line weight and adding mood with shadows.`,
    8: `I am the ${agentName} (Colorist), and my focus is **${stepTitle}**. I'll apply a color palette, shading, and lighting to the inked page. What kind of atmosphere are you looking for?`,
    9: `As the ${agentName} (Letterer), my responsibility is **${stepTitle}**. I add dialogue, captions, and sound effects. Let's ensure the text is readable and well-placed.`,
    10: `I am the ${agentName} (Editor), performing the **${stepTitle}**. I do a final quality check for consistency and accuracy. Is there anything specific you want me to look for?`,
  };
  return intros[step.step] || `You are now collaborating with the ${agentName} on ${stepTitle}.`;
};

const AIChat: React.FC<AIChatProps> = ({ steps }) => {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stepValue = e.target.value;
    if (stepValue === '') {
      setSelectedStep(null);
      setMessages([]);
      return;
    }

    const stepIndex = parseInt(stepValue, 10);
    const step = steps[stepIndex];
    if (step) {
      setSelectedStep(step.step);
      setMessages([{ sender: 'ai', text: getIntroMessage(step) }]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || selectedStep === null) return;

    const currentStep = steps.find(s => s.step === selectedStep);
    if (!currentStep) return;

    const newMessages = [...messages, { sender: 'user', text: userInput }];
    setMessages(newMessages);
    const messageToSend = userInput;
    setUserInput('');
    setIsLoading(true);

    try {
      const prompt = `You are the AI agent for a comic creation workflow. Your specific role is **${currentStep.agent}**, and you are working on step **"${currentStep.title}"**.
      A user wants to collaborate with you.
      Here is the user's message: "${messageToSend}"
      
      Respond helpfully and concisely, staying in character for your role.`;
      
      const aiResponse = await generateText(prompt);
      setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-64"> {/* Fixed height for the chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-4">
          <select
            onChange={handleStepChange}
            defaultValue=""
            className="w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            disabled={isLoading}
          >
            <option value="" disabled>-- Select a workflow step to chat about --</option>
            {steps.map((step, index) => (
              <option key={step.step} value={index}>
                Step {step.step}: {step.title} ({step.agent.split(':')[1].trim()})
              </option>
            ))}
          </select>
        </div>

        {selectedStep !== null ? (
          <>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-2.5 mb-4 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                  {msg.sender === 'ai' && <RobotIcon className="w-6 h-6 flex-shrink-0 text-indigo-500" />}
                  <div className={`flex flex-col w-full max-w-[320px] leading-1.5 p-3 border-gray-200 dark:border-gray-700 ${msg.sender === 'user' ? 'rounded-s-xl rounded-ee-xl bg-indigo-500 text-white' : 'rounded-e-xl rounded-es-xl bg-gray-200 dark:bg-gray-700'}`}>
                    <p className="text-sm font-normal" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                  </div>
                </div>
              ))}
              {isLoading && (
                  <div className="flex items-start gap-2.5 mb-4">
                      <RobotIcon className="w-6 h-6 flex-shrink-0 text-indigo-500" />
                      <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:0.2s]"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse [animation-delay:0.4s]"></div>
                      </div>
                  </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask a question or give a suggestion..."
                className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={1}
                disabled={isLoading}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                    }
                }}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:bg-gray-500"
                disabled={isLoading || !userInput.trim()}
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
            <p>Please select a step above to start collaborating with an AI agent.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChat;