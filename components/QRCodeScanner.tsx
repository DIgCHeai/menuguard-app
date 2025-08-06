
import React, { useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { XCircleIcon } from './icons/XCircleIcon';

interface QRCodeScannerProps {
  onScanSuccess: (data: string | null) => void;
  onClose: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanSuccess, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const canvasContext = canvas.getContext('2d');

        if (canvasContext) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code) {
                onScanSuccess(code.data);
                return; // Stop scanning
            }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    const startCamera = async () => {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
          videoRef.current.play();
          animationFrameId = requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please ensure permissions are granted.");
        onClose();
      }
    };

    startCamera();

    // Accessibility: Focus the close button when modal opens
    modalRef.current?.querySelector('button')?.focus();

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onMouseDown={onClose}>
      <div 
        ref={modalRef} 
        className="relative bg-white rounded-lg w-full max-w-md m-4 p-4" 
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="qr-scanner-title"
      >
        <h2 id="qr-scanner-title" className="sr-only">QR Code Scanner</h2>
        <video ref={videoRef} className="w-full h-auto rounded-md" />
        <canvas ref={canvasRef} className="hidden" />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white bg-gray-800 bg-opacity-50 rounded-full p-1"
          aria-label="Close scanner"
        >
          <XCircleIcon className="w-8 h-8" />
        </button>
         <div className="absolute bottom-4 left-4 right-4 text-center text-white text-sm font-semibold bg-gray-800 bg-opacity-50 p-2 rounded-md" aria-hidden="true">
            Point your camera at a QR code.
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;