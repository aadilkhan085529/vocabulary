// Remove problematic type reference as import.meta.env is not used directly in this file
// and process.env is handled by Vite's define plugin.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx'; // Import the xlsx library
import { WordPair, DisplayWord, GameStatus, PredefinedFile } from './types';
import { PAIRS_PER_SET, RefreshIcon, UploadIcon } from './constants'; // FileTextIcon is used in PredefinedFileList, SpeakerIcon for WordCard
import { shuffleArray } from './utils/shuffleArray';
import WordCard from './components/WordCard';
import Button from './components/Button';
import PredefinedFileList from './components/PredefinedFileList';

const App: React.FC = () => {
  const [allUploadedPairs, setAllUploadedPairs] = useState<WordPair[]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState<number>(0);
  
  const [leftColumnWords, setLeftColumnWords] = useState<DisplayWord[]>([]);
  const [rightColumnWords, setRightColumnWords] = useState<DisplayWord[]>([]);
  
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  
  const [score, setScore] = useState(0); // Score per set
  const [attempts, setAttempts] = useState(0); // Attempts per set
  
  const [feedbackMessage, setFeedbackMessage] = useState<string>('Loading available files...');
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.LoadingFile); // Initial state

  const [predefinedFiles, setPredefinedFiles] = useState<PredefinedFile[]>([]);
  const [predefinedFilesError, setPredefinedFilesError] = useState<string | null>(null);
  const [isLoadingManifest, setIsLoadingManifest] = useState<boolean>(true);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSet = useCallback((setIdx: number, sourcePairs: WordPair[]) => {
    if (sourcePairs.length === 0 && gameStatus !== GameStatus.FileError) { 
      setFeedbackMessage('XLSX file is empty or invalid. Please upload a valid file or select another.');
      setGameStatus(GameStatus.FileError);
      setLeftColumnWords([]);
      setRightColumnWords([]);
      return;
    }

    const startIndex = setIdx * PAIRS_PER_SET;
    const endIndex = startIndex + PAIRS_PER_SET;
    const currentSetGamePairs = sourcePairs.slice(startIndex, endIndex);

    if (currentSetGamePairs.length === 0 && setIdx > 0) {
      setFeedbackMessage(`Congratulations! You matched all ${sourcePairs.length} unique pairs from the file!`);
      setGameStatus(GameStatus.AllSetsCompleted);
      setLeftColumnWords([]);
      setRightColumnWords([]);
      return;
    }
     if (currentSetGamePairs.length === 0 && setIdx === 0 && sourcePairs.length > 0) {
        // This handles files smaller than PAIRS_PER_SET. The game will proceed with available pairs.
     } else if (sourcePairs.length === 0 && setIdx === 0 && gameStatus !== GameStatus.FileError) {
        setFeedbackMessage('No words found in this set. File might be empty or an issue with loading.');
        setGameStatus(GameStatus.FileError);
        setLeftColumnWords([]);
        setRightColumnWords([]);
        return;
     }

    // Assuming user's XLSX has German in Column A (pair.english) and English in Column B (pair.german)
    // based on the screenshot for pronunciation feature placement.
    const wordsForLeftColumn: DisplayWord[] = currentSetGamePairs.map((pair, index) => ({
      id: `left-${setIdx}-${index}-${pair.id}`, // Use 'left' prefix or similar if distinction matters
      pairId: pair.id,
      text: pair.english, // Text from Column A (assumed German by user for feature)
      displayNumber: index + 1,
      isMatched: false,
      isSelected: false,
      isRevealedIncorrect: false,
      language: 'german', // Assign 'german' for feature if source is Column A
    }));

    const wordsForRightColumn: DisplayWord[] = currentSetGamePairs.map((pair, index) => ({
      id: `right-${setIdx}-${index}-${pair.id}`, // Use 'right' prefix
      pairId: pair.id,
      text: pair.german, // Text from Column B (assumed English by user for feature)
      displayNumber: [PAIRS_PER_SET + 1, PAIRS_PER_SET + 2, PAIRS_PER_SET + 3, PAIRS_PER_SET + 4, PAIRS_PER_SET + 5].slice(0, PAIRS_PER_SET)[index % PAIRS_PER_SET] || index + PAIRS_PER_SET +1,
      isMatched: false,
      isSelected: false,
      isRevealedIncorrect: false,
      language: 'english', // Assign 'english' if source is Column B
    }));

    setLeftColumnWords(shuffleArray(wordsForLeftColumn));
    setRightColumnWords(shuffleArray(wordsForRightColumn));
    
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setScore(0);
    setAttempts(0);
    if (gameStatus !== GameStatus.FileError) { 
        setGameStatus(GameStatus.Playing);
        if(setIdx === 0 && (feedbackMessage.includes('Successfully loaded') || feedbackMessage.includes('Restarting with'))) {
            // keep the success/restart message
        } else {
            setFeedbackMessage('Select a word from each column.');
        }
    }
  }, [gameStatus, feedbackMessage]); 

  const processXLSXData = useCallback((arrayBuffer: ArrayBuffer, fileName?: string, isLocalFile = false) => {
    try {
      if (!arrayBuffer) {
          throw new Error("Could not read file data.");
      }
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      const parsedPairs: WordPair[] = [];
      const seenCombinations = new Set<string>(); 

      // Standard parsing: Col A is English, Col B is German internally.
      // The `loadSet` function will then decide the `language` property for display/feature.
      jsonData.forEach((row, index) => {
          if (row && row.length >= 2) { 
              const englishColA = String(row[0]).trim(); 
              const germanColB = String(row[1]).trim();  

              if (englishColA && germanColB) { 
                  const combinationKey = `${englishColA.toLowerCase()}|${germanColB.toLowerCase()}`;
                  if (!seenCombinations.has(combinationKey)) {
                      seenCombinations.add(combinationKey);
                      // Store based on standard column expectation
                      parsedPairs.push({ id: `xlsx-pair-${parsedPairs.length}-${englishColA.slice(0,5)}`, english: englishColA, german: germanColB });
                  } else {
                      console.warn(`Skipping duplicate pair at row ${index + 1} in ${fileName || 'uploaded file'}: ColA='${englishColA}', ColB='${germanColB}'`);
                  }
              } else if (englishColA || germanColB) { 
                  console.warn(`Skipping row ${index + 1} in ${fileName || 'uploaded file'} due to missing value(s): ColA='${englishColA}', ColB='${germanColB}'`);
              }
          } else if (row && row.some(cell => String(cell).trim() !== "")) { 
               console.warn(`Skipping malformed row ${index + 1} in ${fileName || 'uploaded file'}: Expected 2 columns, found ${row?.length || 0}. Content: ${row.join(', ')}`);
          }
      });

      if (parsedPairs.length === 0) {
        throw new Error(`XLSX file (${fileName || 'uploaded file'}) is empty or contains no valid, unique word pairs in the first two columns (A: English, B: German).`);
      }
      
      const shuffledPairs = shuffleArray(parsedPairs); 
      setAllUploadedPairs(shuffledPairs);
      setCurrentSetIndex(0);
      setFeedbackMessage(`Successfully loaded ${parsedPairs.length} words from ${fileName || 'your file'}. Select a word from each column.`);
      loadSet(0, shuffledPairs);

      if (isLocalFile && fileName) {
        const newPredefinedFile: PredefinedFile = {
          name: `${fileName} (Uploaded)`,
          path: `local-${Date.now()}-${fileName}`, 
          description: "Uploaded during this session.",
          isLocal: true,
          arrayBuffer: arrayBuffer,
        };
        setPredefinedFiles(prevFiles => {
          if (prevFiles.some(f => f.name === newPredefinedFile.name)) return prevFiles;
          return [newPredefinedFile, ...prevFiles];
        });
      }

    } catch (error) {
      console.error("XLSX Parsing Error:", error);
      setFeedbackMessage(`Error parsing XLSX (${fileName || 'uploaded file'}): ${error instanceof Error ? error.message : 'Unknown error'}. Please check file format (Column A: English, Column B: German).`);
      setGameStatus(GameStatus.FileError);
      setAllUploadedPairs([]);
      setLeftColumnWords([]);
      setRightColumnWords([]);
    }
  }, [loadSet]);

  useEffect(() => {
    setIsLoadingManifest(true);
    const manifestPath = `${import.meta.env.BASE_URL}database/file-manifest.json`;

    fetch(manifestPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for ${manifestPath}`);
        }
        return response.json();
      })
      .then((data: PredefinedFile[]) => {
        setPredefinedFiles(data);
        setGameStatus(GameStatus.FileNotLoaded);
        setFeedbackMessage('Choose a sample deck or upload your own XLSX file.');
      })
      .catch(error => {
        console.error(`Failed to load predefined files manifest from ${manifestPath}:`, error);
        setPredefinedFilesError("Could not load sample decks. You can still upload your own file.");
        setGameStatus(GameStatus.FileNotLoaded); 
        setFeedbackMessage("Could not load sample decks. Please upload an XLSX file to start.");
      })
      .finally(() => {
        setIsLoadingManifest(false);
      });
  }, []);


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
        if (event.target) {
           event.target.value = ''; 
        }
        return;
    }

    setGameStatus(GameStatus.LoadingFile);
    setFeedbackMessage(`Processing ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        processXLSXData(arrayBuffer, file.name, true); 
      } else {
        setFeedbackMessage('Error: Could not read file data.');
        setGameStatus(GameStatus.FileError);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; 
      }
    };
    reader.onerror = () => {
        setFeedbackMessage('Error reading the XLSX file.');
        setGameStatus(GameStatus.FileError);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; 
        }
    };
    reader.readAsArrayBuffer(file); 
  };

  const handlePredefinedFileSelect = async (file: PredefinedFile) => {
    setGameStatus(GameStatus.LoadingFile);
    setFeedbackMessage(`Loading ${file.name}...`);

    if (file.isLocal && file.arrayBuffer) {
      processXLSXData(file.arrayBuffer, file.name.replace(' (Uploaded)', ''));
    } else {
      const filePath = `${import.meta.env.BASE_URL}${file.path}`; 
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${file.name}: ${response.statusText} from ${filePath}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        processXLSXData(arrayBuffer, file.name);
      } catch (error) {
        console.error(`Error loading predefined file from ${filePath}:`, error);
        setFeedbackMessage(`Error loading ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setGameStatus(GameStatus.FileError);
        setAllUploadedPairs([]);
        setLeftColumnWords([]);
        setRightColumnWords([]);
      }
    }
  };
  
  useEffect(() => {
    if (selectedLeftId && selectedRightId && gameStatus === GameStatus.Playing) {
      const leftWord = leftColumnWords.find(w => w.id === selectedLeftId);
      const rightWord = rightColumnWords.find(w => w.id === selectedRightId);

      if (leftWord && rightWord) {
        setAttempts(prev => prev + 1);
        if (leftWord.pairId === rightWord.pairId) { 
          const newScore = score + 1;
          setScore(newScore);
          
          setLeftColumnWords(prev => prev.map(w => w.pairId === leftWord.pairId ? { ...w, isMatched: true, isSelected: false } : w));
          setRightColumnWords(prev => prev.map(w => w.pairId === rightWord.pairId ? { ...w, isMatched: true, isSelected: false } : w));
          
          if (newScore === (leftColumnWords.length || PAIRS_PER_SET) ) { 
            setFeedbackMessage(`Set ${currentSetIndex + 1} complete! Well done!`);
            setGameStatus(GameStatus.AllMatchedInSet);
            setTimeout(() => {
              const nextSetIndex = currentSetIndex + 1;
              if (nextSetIndex * PAIRS_PER_SET < allUploadedPairs.length) {
                setCurrentSetIndex(nextSetIndex);
                loadSet(nextSetIndex, allUploadedPairs);
              } else {
                setFeedbackMessage(`Congratulations! You matched all ${allUploadedPairs.length} unique words from the file!`);
                setGameStatus(GameStatus.AllSetsCompleted);
              }
            }, 750); 
          } else {
             setFeedbackMessage('Correct!');
          }
        } else { 
          setFeedbackMessage('Incorrect. Try again!');
          setLeftColumnWords(prev => prev.map(w => w.id === leftWord.id ? { ...w, isRevealedIncorrect: true, isSelected: true } : w));
          setRightColumnWords(prev => prev.map(w => w.id === rightWord.id ? { ...w, isRevealedIncorrect: true, isSelected: true } : w));
          
          setTimeout(() => {
            setLeftColumnWords(prev => prev.map(w => w.id === leftWord.id ? { ...w, isRevealedIncorrect: false, isSelected: false } : w));
            setRightColumnWords(prev => prev.map(w => w.id === rightWord.id ? { ...w, isRevealedIncorrect: false, isSelected: false } : w));
            if (gameStatus === GameStatus.Playing) { 
                setFeedbackMessage('Select a word from each column.');
            }
          }, 1000);
        }
        setSelectedLeftId(null);
        setSelectedRightId(null);
      }
    }
  }, [selectedLeftId, selectedRightId, gameStatus, score, currentSetIndex, allUploadedPairs, loadSet, leftColumnWords, rightColumnWords]);

  const handlePlayPronunciation = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang; // e.g., 'de-DE' for German

      // Attempt to find and set a specific German voice
      // Note: getVoices() might be initially empty and populates asynchronously.
      // For robustness, this could be tied to the 'voiceschanged' event.
      // However, for many modern browsers, calling it directly often works,
      // or the lang attribute provides a good fallback.
      const voices = window.speechSynthesis.getVoices();
      let germanVoice = voices.find(voice => voice.lang === lang); // Try exact match first like 'de-DE'
      
      if (!germanVoice) { // If no exact match, try broader match like 'de'
        germanVoice = voices.find(voice => voice.lang.startsWith('de'));
      }

      if (germanVoice) {
        utterance.voice = germanVoice;
      } else {
        // If no specific German voice, log a warning but still try with the lang attribute.
        // The browser will attempt its best match.
        console.warn(`No specific German (de) voice found. Using browser default for ${lang}. Voice list length: ${voices.length}`);
        // voices.forEach(v => console.log(v.name, v.lang)); // For debugging, uncomment to see available voices
      }

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech Synthesis not supported in this browser.');
    }
  };

  const handleSelectWord = (word: DisplayWord, column: 'left' | 'right') => {
    if (word.isMatched || gameStatus !== GameStatus.Playing) return;

    // Pronunciation logic: Play if the word's designated language is German.
    if (word.language === 'german') {
      handlePlayPronunciation(word.text, 'de-DE');
    }

    // Selection logic:
    if (column === 'left') {
      if (selectedLeftId === word.id) { // Clicked same selected word to deselect
        setSelectedLeftId(null);
        setLeftColumnWords(prev => prev.map(w => (w.id === word.id ? { ...w, isSelected: false } : w)));
      } else { // Clicked a new word in the left column
        setSelectedLeftId(word.id);
        setLeftColumnWords(prev => prev.map(w => ({ ...w, isSelected: w.id === word.id })));
      }
    } else { // column === 'right'
      if (selectedRightId === word.id) { // Clicked same selected word to deselect
        setSelectedRightId(null);
        setRightColumnWords(prev => prev.map(w => (w.id === word.id ? { ...w, isSelected: false } : w)));
      } else { // Clicked a new word in the right column
        setSelectedRightId(word.id);
        setRightColumnWords(prev => prev.map(w => ({ ...w, isSelected: w.id === word.id })));
      }
    }
  };

  const isSelectionDisabled = (word: DisplayWord): boolean => {
    if (gameStatus !== GameStatus.Playing || word.isMatched) {
      return true;
    }
    return false;
  };

  const handleRestartGame = () => {
    if (allUploadedPairs.length > 0) {
      const currentFileName = allUploadedPairs[0]?.id.startsWith('xlsx-pair-') ? 'your previously loaded file' : 'the current file';
      const reShuffledPairs = shuffleArray([...allUploadedPairs]); 
      setAllUploadedPairs(reShuffledPairs); 
      setCurrentSetIndex(0);
      setFeedbackMessage(`Restarting with ${currentFileName}. Select a word from each column.`);
      loadSet(0, reShuffledPairs); 
    } else {
      setFeedbackMessage('Please load a file first to restart the game.');
      setGameStatus(GameStatus.FileNotLoaded); 
    }
  };

  const handleUploadNewFileClick = () => {
    fileInputRef.current?.click();
  };

  const totalSets = allUploadedPairs.length > 0 ? Math.ceil(allUploadedPairs.length / PAIRS_PER_SET) : 0;
  const currentWordsInSet = leftColumnWords.length > 0 ? leftColumnWords.length : (allUploadedPairs.length > 0 && allUploadedPairs.length < PAIRS_PER_SET && currentSetIndex === 0 ? allUploadedPairs.length : PAIRS_PER_SET) ;


  const renderInitialScreen = () => (
    <div className="text-center py-10">
      {isLoadingManifest && (
        <div className="flex justify-center items-center mb-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-300"></div>
          <span className="ml-3 text-sky-300">Loading available decks...</span>
        </div>
      )}

      {!isLoadingManifest && (predefinedFiles.length > 0 || predefinedFilesError) && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Start with a Sample Deck (or your uploaded files):</h2>
          {predefinedFilesError && <p className="text-red-400 mb-4">{predefinedFilesError}</p>}
          <PredefinedFileList files={predefinedFiles} onSelectFile={handlePredefinedFileSelect} />
          <p className="text-slate-400 my-6 text-lg">Or</p>
        </div>
      )}

      <p className={`text-slate-300 mb-6 text-lg ${gameStatus === GameStatus.FileError && !feedbackMessage.includes('Successfully loaded') ? 'text-red-400' : ''}`}>
        {isLoadingManifest ? "Loading available decks..." : 
          (predefinedFiles.length === 0 && !predefinedFilesError && !isLoadingManifest ? "Upload an XLSX file to start." : feedbackMessage)
        }
      </p>
      
      {gameStatus !== GameStatus.LoadingFile && (
          <>
              <Button 
                  onClick={handleUploadNewFileClick}
                  leftIcon={<UploadIcon className="w-5 h-5" />}
                  size="lg"
                  variant="primary"
              >
                  Upload Your Own XLSX File
              </Button>
              <p className="text-xs text-slate-500 mt-4">Format: Column A for English, Column B for German.</p>
              <p className="text-xs text-slate-500 mt-1">Ensure your XLSX file's first sheet contains the word pairs.</p>
              <p className="text-xs text-slate-600 mt-1">(Uploaded files are available for the current session only)</p>
          </>
      )}
      {gameStatus === GameStatus.LoadingFile && !isLoadingManifest && ( 
           <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-300"></div>
              <span className="ml-3 text-sky-300">{feedbackMessage.startsWith("Loading") || feedbackMessage.startsWith("Processing") ? feedbackMessage : "Loading..."}</span>
           </div>
      )}
    </div>
  );


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 selection:bg-sky-500 selection:text-white">
      <input
          type="file"
          accept=".xlsx" 
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="hidden"
          id="xlsxFileInput"
          aria-label="Upload XLSX file"
      />
      <div className="w-full max-w-3xl bg-slate-800/50 shadow-2xl rounded-xl p-6 sm:p-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2 text-center">
          Vocabulary Matching Game
        </h1>
        
        {gameStatus === GameStatus.FileNotLoaded || gameStatus === GameStatus.FileError || (gameStatus === GameStatus.LoadingFile && isLoadingManifest) ? (
          renderInitialScreen()
        ) : gameStatus === GameStatus.LoadingFile && !isLoadingManifest ? (
            <div className="text-center py-10">
                 <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-300"></div>
                    <span className="ml-3 text-sky-300">{feedbackMessage}</span>
                 </div>
            </div>
        ) : (
          <>
            <p className="text-slate-400 text-center mb-1 text-sm sm:text-base">
              Match English words with their German translations.
            </p>
            {allUploadedPairs.length > 0 && gameStatus !== GameStatus.AllSetsCompleted && (
              <p className="text-slate-500 text-center mb-4 text-xs sm:text-sm">
                Set: {currentSetIndex + 1} of {totalSets}
                <span className="mx-1 text-slate-600">|</span>
                Total Unique Words in File: {allUploadedPairs.length}
              </p>
            )}

            <div className="mb-6 h-10 flex items-center justify-center">
              <p className={`text-lg font-medium transition-opacity duration-300 ${
                feedbackMessage.includes('Correct!') || (feedbackMessage.includes('Set') && feedbackMessage.includes('complete')) ? 'text-green-400' 
                : feedbackMessage.includes('Incorrect') ? 'text-red-400' 
                : feedbackMessage.includes('Congratulations') ? 'text-yellow-400'
                : feedbackMessage.includes('Error') || feedbackMessage.includes('Could not') ? 'text-red-400'
                : 'text-sky-300'}`}>
                {feedbackMessage}
              </p>
            </div>
            
            {(gameStatus === GameStatus.Playing || gameStatus === GameStatus.AllMatchedInSet) && leftColumnWords.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
                <div className="space-y-3 sm:space-y-4">
                  {leftColumnWords.map((word) => (
                    <WordCard 
                      key={word.id} 
                      word={word} 
                      onClick={() => handleSelectWord(word, 'left')}
                      isDisabled={isSelectionDisabled(word)}
                    />
                  ))}
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {rightColumnWords.map((word) => (
                    <WordCard 
                      key={word.id} 
                      word={word} 
                      onClick={() => handleSelectWord(word, 'right')}
                      isDisabled={isSelectionDisabled(word)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            { (gameStatus === GameStatus.AllSetsCompleted && allUploadedPairs.length > 0) && (
                <div className="text-center my-8">
                    <p className="text-2xl text-yellow-400 font-semibold">
                        🎉 All words matched! 🎉
                    </p>
                     <p className="text-slate-300 mt-2">
                        You've successfully completed all sets for this file.
                    </p>
                </div>
            )}


            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="text-slate-300 text-sm sm:text-base">
                Score (Current Set): <span className="font-semibold text-green-400">{score}</span> / {currentWordsInSet}
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRestartGame}
                  leftIcon={<RefreshIcon className="w-5 h-5" />}
                  size="md"
                  variant="secondary"
                  disabled={allUploadedPairs.length === 0 || gameStatus === GameStatus.LoadingFile}
                  aria-label="Restart game with current file"
                >
                  Restart Game
                </Button>
                 <Button 
                  onClick={handleUploadNewFileClick}
                  leftIcon={<UploadIcon className="w-5 h-5" />}
                  size="md"
                  variant="primary"
                  aria-label="Upload a new XLSX file"
                >
                  New File
                </Button>
              </div>
            </div>
             <div className="text-slate-300 text-sm sm:text-base mt-2 sm:mt-0 text-center sm:text-left">
                Attempts (Set): <span className="font-semibold text-sky-400">{attempts}</span>
            </div>
          </>
        )}
      </div>
      <footer className="text-center py-8 text-slate-500 text-sm">
        Vocabulary Matching Game - Select a deck or upload an XLSX and Learn!
      </footer>
    </div>
  );
};

export default App;
