import React, { useState } from 'react';
import { AnalysisResult, SafetyLevel, GroundingSource, AnalysisInputType } from '../types';
import { findSafeAlternative } from '../services/geminiService';
import { LeafIcon } from './icons/LeafIcon';
import { WarningIcon } from './icons/WarningIcon';
import { DangerIcon } from './icons/DangerIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { LinkIcon } from './icons/LinkIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import Spinner from './Spinner';

const safetyConfig = {
    [SafetyLevel.Safe]: {
        Icon: LeafIcon,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        titleColor: 'text-green-700',
        title: 'Safe'
    },
    [SafetyLevel.Caution]: {
        Icon: WarningIcon,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        textColor: 'text-yellow-800',
        titleColor: 'text-yellow-700',
        title: 'Caution'
    },
    [SafetyLevel.Unsafe]: {
        Icon: DangerIcon,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        textColor: 'text-red-800',
        titleColor: 'text-red-700',
        title: 'Unsafe'
    }
};

const ResultItem: React.FC<{ 
    item: AnalysisResult,
    menuContext: { text: string; url: string } | null,
    currentAllergies: string,
    currentPreferences: string,
    safeItems: string[],
}> = ({ item, menuContext, currentAllergies, currentPreferences, safeItems }) => {
    const config = safetyConfig[item.safetyLevel] || safetyConfig[SafetyLevel.Caution];
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);

    const handleSuggestAlternative = async () => {
        if (!menuContext) return;
        setIsSuggesting(true);
        setSuggestion(null);
        setSuggestionError(null);

        try {
            const result = await findSafeAlternative(
                currentAllergies, 
                currentPreferences, 
                item.itemName,
                menuContext,
                safeItems
            );
            setSuggestion(result);
        } catch (err) {
            setSuggestionError(err instanceof Error ? err.message : "Could not fetch a suggestion.");
        } finally {
            setIsSuggesting(false);
        }
    };


    return (
        <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
            <div className="flex items-start">
                <config.Icon className={`w-6 h-6 mr-3 flex-shrink-0 ${config.titleColor}`} />
                <div className="flex-grow">
                    <h4 className={`font-bold text-lg ${config.titleColor}`}>{item.itemName}</h4>
                    <p className={`mt-1 text-sm font-semibold ${config.textColor}`}>{config.title}</p>
                    <p className={`mt-2 text-sm ${config.textColor}`}>{item.reasoning}</p>
                    {item.identifiedAllergens && item.identifiedAllergens.length > 0 && (
                        <div className="mt-2">
                            <p className={`text-xs font-bold ${config.textColor}`}>Potential Allergens Identified:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {item.identifiedAllergens.map((allergen, index) => (
                                    <span key={index} className="px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded-full text-gray-700">
                                        {allergen}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                     {(item.safetyLevel === SafetyLevel.Unsafe || item.safetyLevel === SafetyLevel.Caution) && menuContext && (menuContext.text || menuContext.url) && (
                        <div className="mt-4 pt-3 border-t border-dashed" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                           <button 
                                onClick={handleSuggestAlternative}
                                disabled={isSuggesting}
                                className={`flex items-center justify-center w-full sm:w-auto px-3 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                                    isSuggesting 
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                                }`}
                            >
                                {isSuggesting ? (
                                    <>
                                        <Spinner className="-ml-1 mr-2 h-4 w-4 text-blue-600" />
                                        Finding a Swap...
                                    </>
                                ) : (
                                     <>
                                        <LightbulbIcon className="w-5 h-5 mr-2" />
                                        Suggest a "Safe Swap"
                                    </>
                                )}
                            </button>
                             {suggestion && (
                                <div className="mt-3 p-3 bg-blue-50/70 rounded-md border border-blue-200 text-sm text-blue-800">
                                    <p><span className='font-bold'>Suggestion:</span> {suggestion}</p>
                                </div>
                            )}
                            {suggestionError && (
                                <div className="mt-3 p-3 bg-red-50/70 rounded-md border border-red-200 text-sm text-red-800">
                                    <p><span className='font-bold'>Sorry:</span> {suggestionError}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const CollapsibleSection: React.FC<{
    title: string;
    items: AnalysisResult[];
    config: typeof safetyConfig[SafetyLevel];
    defaultOpen?: boolean;
    menuContext: { text: string; url: string } | null;
    currentAllergies: string;
    currentPreferences: string;
    safeItems: string[];
}> = ({ title, items, config, defaultOpen = false, menuContext, currentAllergies, currentPreferences, safeItems }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (items.length === 0) return null;

    return (
        <div className={`rounded-xl border ${config.borderColor} overflow-hidden`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center p-4 text-left font-bold ${config.bgColor} ${config.titleColor}`}
                aria-expanded={isOpen}
            >
                <span>{title} ({items.length})</span>
                <ChevronDownIcon className={`w-6 h-6 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 bg-white space-y-4">
                    {items.map((item, index) => (
                        <ResultItem 
                            key={index} 
                            item={item} 
                            menuContext={menuContext}
                            currentAllergies={currentAllergies}
                            currentPreferences={currentPreferences}
                            safeItems={safeItems}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

const AnalysisSummary: React.FC<{ summary: string }> = ({ summary }) => (
    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex items-start">
            <SparkleIcon className="w-6 h-6 mr-3 mt-1 flex-shrink-0 text-blue-500" />
            <div className="flex-grow">
                <h4 className="font-bold text-lg text-blue-700">Quick Summary</h4>
                <p className="mt-2 text-md text-blue-800">{summary}</p>
            </div>
        </div>
    </div>
);

const GroundingSourcesDisplay: React.FC<{ sources: GroundingSource[] }> = ({ sources }) => (
    <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-600">Information Sourced From:</h4>
        <ul className="mt-2 space-y-1 text-sm">
            {sources.map((source, index) => (
                <li key={index} className="flex items-center">
                    <LinkIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate" title={source.uri}>
                        {source.title || source.uri}
                    </a>
                </li>
            ))}
        </ul>
    </div>
);


interface ResultsDisplayProps {
    results: AnalysisResult[];
    analysisSummary?: string | null;
    searchGroundingSources?: GroundingSource[] | null;
    menuContext: { text: string; url: string } | null;
    currentAllergies: string;
    currentPreferences: string;
    analysisInputType: AnalysisInputType;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, analysisSummary, searchGroundingSources, menuContext, currentAllergies, currentPreferences, analysisInputType }) => {
    if (!results || results.length === 0) {
        let suggestion = "The AI could not identify any menu items from the provided source. Please try pasting the menu text directly, using a different URL, or uploading a clearer image.";
        if (analysisInputType === 'url') {
            suggestion = "The URL provided may be inaccessible, not lead to a menu, or contain a format the AI cannot read (like a complex PDF). Please try pasting the menu text directly or using a different URL.";
        } else if (analysisInputType === 'image') {
            suggestion = "The AI could not read the menu from the image. Please try uploading a clearer, more focused image with good lighting, or pasting the menu text directly.";
        } else if (analysisInputType === 'text') {
            suggestion = "The AI could not identify menu items from the text provided. Please ensure the text is formatted clearly, like a restaurant menu, and contains both item names and descriptions.";
        }

        return (
            <div className="text-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                <h3 className="text-lg font-medium text-gray-900">No Menu Items Found</h3>
                <p className="mt-1 text-sm text-gray-500">{suggestion}</p>
            </div>
        );
    }
    
    const groupedResults = {
        [SafetyLevel.Unsafe]: results.filter(r => r.safetyLevel === SafetyLevel.Unsafe),
        [SafetyLevel.Caution]: results.filter(r => r.safetyLevel === SafetyLevel.Caution),
        [SafetyLevel.Safe]: results.filter(r => r.safetyLevel === SafetyLevel.Safe),
    };

    const safeItems = results
        .filter(r => r.safetyLevel === SafetyLevel.Safe)
        .map(r => r.itemName);

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-gray-800 border-b pb-2">Menu Analysis Results</h3>

            {analysisSummary && <AnalysisSummary summary={analysisSummary} />}
            
            <div className="space-y-4">
                <CollapsibleSection title="Unsafe Items" items={groupedResults.unsafe} config={safetyConfig.unsafe} defaultOpen={true} menuContext={menuContext} currentAllergies={currentAllergies} currentPreferences={currentPreferences} safeItems={safeItems} />
                <CollapsibleSection title="Caution Advised" items={groupedResults.caution} config={safetyConfig.caution} defaultOpen={true} menuContext={menuContext} currentAllergies={currentAllergies} currentPreferences={currentPreferences} safeItems={safeItems} />
                <CollapsibleSection title="Safe Items" items={groupedResults.safe} config={safetyConfig.safe} defaultOpen={false} menuContext={menuContext} currentAllergies={currentAllergies} currentPreferences={currentPreferences} safeItems={safeItems} />
            </div>

            {searchGroundingSources && searchGroundingSources.length > 0 && (
                <GroundingSourcesDisplay sources={searchGroundingSources} />
            )}
        </div>
    );
};

export default ResultsDisplay;