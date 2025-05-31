
import React from 'react';
import { DisplayWord } from '../types';
import { SpeakerIcon } from '../constants'; // Import SpeakerIcon

interface WordCardProps {
  word: DisplayWord;
  onClick: () => void;
  isDisabled: boolean;
}

const WordCard: React.FC<WordCardProps> = ({ word, onClick, isDisabled }) => {
  let cardClasses = "flex items-center p-4 rounded-lg border-2 transition-all duration-200 ease-in-out transform hover:scale-105";
  let numberClasses = "flex-shrink-0 flex items-center justify-center w-7 h-7 text-xs font-semibold rounded-md mr-4";
  let textClasses = "text-sm sm:text-base";

  if (word.isMatched) {
    cardClasses += " bg-green-500/20 border-green-500 cursor-not-allowed opacity-80";
    numberClasses += " bg-green-600 text-green-100";
    textClasses += " text-green-200";
  } else if (word.isRevealedIncorrect) {
    cardClasses += " bg-red-500/20 border-red-500 animate-shake"; // Simple shake animation
    numberClasses += " bg-red-600 text-red-100";
    textClasses += " text-red-200";
  } else if (word.isSelected) {
    cardClasses += " bg-sky-500/20 border-sky-500 ring-2 ring-sky-400 shadow-lg";
    numberClasses += " bg-sky-600 text-sky-100";
    textClasses += " text-sky-200";
  } else {
    cardClasses += " bg-slate-800 border-slate-700 hover:border-slate-500 cursor-pointer";
    numberClasses += " bg-slate-700 text-slate-300";
    textClasses += " text-slate-200";
  }
  
  if(isDisabled && !word.isMatched) {
    cardClasses += " cursor-not-allowed opacity-60";
  }

  const getSpeakerIconColor = () => {
    if (word.isMatched) return 'text-green-400';
    if (word.isRevealedIncorrect) return 'text-red-400';
    if (word.isSelected) return 'text-sky-400';
    return 'text-slate-500';
  };

  return (
    <button
      onClick={onClick}
      disabled={isDisabled || word.isMatched}
      className={`${cardClasses} w-full text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500`}
      aria-pressed={word.isSelected}
      aria-label={word.language === 'german' ? `${word.text}, German word. Click to select and hear pronunciation.` : `${word.text}, English word. Click to select.`}
    >
      <span className={numberClasses}>{word.displayNumber}</span>
      <span className={`${textClasses} flex-grow`}>{word.text}</span>
      {word.language === 'german' && (
        <SpeakerIcon
          className={`w-5 h-5 ml-2 flex-shrink-0 transition-colors ${getSpeakerIconColor()}`}
          aria-hidden="true"
        />
      )}
    </button>
  );
};

// Add a simple shake animation for incorrect attempts (if not already present elsewhere or handled by Tailwind)
const styleSheetId = "wordcard-animations";
if (!document.getElementById(styleSheetId)) {
  const styleSheet = document.createElement("style");
  styleSheet.id = styleSheetId;
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    .animate-shake {
      animation: shake 0.3s ease-in-out;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default WordCard;
