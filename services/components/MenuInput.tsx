import React, { useState, useRef } from 'react';
import { CameraIcon } from './icons/CameraIcon';
import { UploadIcon } from './icons/UploadIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { LocationMarkerIcon } from './icons/LocationMarkerIcon';
import Spinner from './Spinner';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface MenuInputProps {
    menuText: string;
    setMenuText: (text: string) => void;
    setMenuImage: (file: File | null) => void;
    menuUrl: string;
    setMenuUrl: (url: string) => void;
    onScanClick: () => void;
    onFindNearbyClick: () => void;
    isGoogleMapsReady: boolean;
    isFindingNearby: boolean;
}

const MenuInput: React.FC<MenuInputProps> = ({ 
    menuText, setMenuText, setMenuImage, menuUrl, setMenuUrl, onScanClick,
    onFindNearbyClick, isGoogleMapsReady, isFindingNearby
}) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [copyButtonText, setCopyButtonText] = useState('Copy');
    const fileUploadRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setMenuImage(file);
            setFileName(file.name);
            // Clear other inputs for clarity
            setMenuText('');
            setMenuUrl('');
        }
    };
    
    const handleRemoveImage = () => {
        setMenuImage(null);
        setFileName(null);
        if(fileUploadRef.current) fileUploadRef.current.value = "";
        if(cameraInputRef.current) cameraInputRef.current.value = "";
    }

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMenuUrl(e.target.value);
        if (e.target.value) { // Clear other inputs
            setMenuText('');
            setMenuImage(null);
            setFileName(null);
        }
    }
    
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMenuText(e.target.value);
         if (e.target.value) { // Clear other inputs
            setMenuUrl('');
            setMenuImage(null);
            setFileName(null);
        }
    }

    const handleCopyText = () => {
        if (!menuText) return;
        navigator.clipboard.writeText(menuText).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy'), 2000);
        });
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                2. Provide the menu
            </label>
            <p className="text-xs text-gray-500 mb-2">You can use a URL, scan a QR code, paste text, upload an image, or find nearby restaurants.</p>
            
            <button
                type="button"
                onClick={onFindNearbyClick}
                disabled={!isGoogleMapsReady || isFindingNearby}
                className="flex items-center justify-center w-full px-4 py-3 border border-dashed border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                aria-label="Find nearby restaurants"
            >
                {isFindingNearby ? (
                    <>
                        <Spinner className="w-5 h-5 mr-2" />
                        Finding Restaurants...
                    </>
                ) : (
                    <>
                        <LocationMarkerIcon className="w-5 h-5 mr-2" />
                        Find Nearby Restaurants
                    </>
                )}
            </button>
            {!isGoogleMapsReady && (
                 <p className="text-xs text-center text-gray-400 mt-1">Map service is initializing...</p>
            )}

            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-sm text-gray-500">Or enter manually</span>
                </div>
            </div>

            {/* URL and QR Code Input */}
            <div className="flex items-center space-x-2">
                <input
                    type="url"
                    placeholder="Enter menu URL"
                    value={menuUrl}
                    onChange={handleUrlChange}
                    className="flex-grow w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 placeholder:text-gray-400"
                />
                <button
                    type="button"
                    onClick={onScanClick}
                    className="p-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    aria-label="Scan QR code for menu"
                >
                    <QrCodeIcon className="w-5 h-5" />
                </button>
            </div>
            
             <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-sm text-gray-500">Or paste text / upload image</span>
                </div>
            </div>

            {/* Text Area Input */}
             <div className="relative">
                <textarea
                    value={menuText}
                    onChange={handleTextChange}
                    rows={6}
                    placeholder="Paste menu items here...&#10;e.g.&#10;Classic Burger - Beef patty, lettuce, tomato, cheese, sesame bun&#10;Caesar Salad - Romaine, croutons, parmesan, caesar dressing"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 placeholder:text-gray-400"
                />
                <button
                    type="button"
                    onClick={handleCopyText}
                    disabled={!menuText}
                    className="absolute top-2 right-2 flex items-center px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ClipboardIcon className="w-4 h-4 mr-1.5" />
                    {copyButtonText}
                </button>
            </div>
            
            {/* Image/Photo Input */}
            <div className="mt-4 space-y-3">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => fileUploadRef.current?.click()}
                        className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-label="Upload a menu image from your device"
                    >
                        <UploadIcon className="w-5 h-5 mr-2" />
                        Upload Image
                    </button>
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-label="Take a photo of the menu"
                    >
                        <CameraIcon className="w-5 h-5 mr-2" />
                        Take Photo
                    </button>
                </div>

                <input id="file-upload" ref={fileUploadRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                <input id="camera-capture" ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

                {fileName && (
                    <div className="flex items-center justify-between bg-green-50 p-2 rounded-md border border-green-200">
                        <span className="text-sm text-green-800 truncate">{fileName}</span>
                        <button onClick={handleRemoveImage} className="text-red-600 hover:text-red-800 text-sm font-semibold flex-shrink-0 ml-2">
                            Remove
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MenuInput;