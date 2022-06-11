import React, { useEffect, useState, useMemo } from "react";
import { wordsGenerator } from "../../scripts/wordsGenerator";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import IconButton from "../utils/IconButton";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import useLocalPersistState from "../../hooks/useLocalPersistState";
import CapsLockSnackbar from "./CapsLockSnackbar";

import {
  DEFAULT_COUNT_DOWN,
  COUNT_DOWN_60,
  COUNT_DOWN_30,
  COUNT_DOWN_15,
  DEFAULT_WORDS_COUNT,
  DEFAULT_DIFFICULTY,
  HARD_DIFFICULTY,
  DEFAULT_DIFFICULTY_TOOLTIP_TITLE,
  HARD_DIFFICULTY_TOOLTIP_TITLE,
  CHAR_TOOLTIP_TITLE,
} from "../../constants/Constants";

const TypeBox = ({ textInputRef, isFocusedMode }) => {
  // local persist timer
  const [countDownConstant, setCountDownConstant] = useLocalPersistState(DEFAULT_COUNT_DOWN, 'timer-constant');

  // local persist difficulty
  const [difficulty, setDifficulty] = useLocalPersistState(DEFAULT_DIFFICULTY, 'difficulty');

  // Caps Lock
  const [capsLocked, setCapsLocked] = useState(false);

  // set up words state
  const [words, setWords] = useState(()=>{
    return wordsGenerator(DEFAULT_WORDS_COUNT, difficulty)
  });

  const wordSpanRefs = useMemo(
    () =>
      Array(DEFAULT_WORDS_COUNT)
        .fill(0)
        .map((i) => React.createRef()),
    []
  );

  // set up timer state
  const [countDown, setCountDown] = useState(countDownConstant);
  const [intervalId, setIntervalId] = useState(null);

  // set up game loop status state
  const [status, setStatus] = useState("waiting");

  // enable menu
  const menuEnabled = !isFocusedMode || status === "finished";

  // set up hidden input input val state
  const [currInput, setCurrInput] = useState("");
  // set up world advancing index
  const [currWordIndex, setCurrWordIndex] = useState(0);
  // set up char advancing index
  const [currCharIndex, setCurrCharIndex] = useState(-1);
  const [prevInput, setPrevInput] = useState("");

  // set up words examine history
  const [wordsCorrect, setWordsCorrect] = useState(new Set());
  const [wordsInCorrect, setWordsInCorrect] = useState(new Set());
  const [inputWordsHistory, setInputWordsHistory] = useState({});

  // setup stats
  const [rawKeyStrokes, setRawKeyStrokes] = useState(0);
  const [wpmKeyStrokes, setWpmKeyStrokes] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [statsCharCount, setStatsCharCount] = useState([]);

  // set up char examine hisotry
  const [history, setHistory] = useState({});
  const keyString = currWordIndex + "." + currCharIndex;
  const [currChar, setCurrChar] = useState("");

  useEffect(() => {
    if (
      currWordIndex !== 0 &&
      wordSpanRefs[currWordIndex].current.offsetLeft <
        wordSpanRefs[currWordIndex - 1].current.offsetLeft
    ) {
      wordSpanRefs[currWordIndex - 1].current.scrollIntoView();
    } else {
      return;
    }
  }, [currWordIndex, wordSpanRefs]);
  
  const reset = (newCountDown, difficulty) => {
    setStatus("waiting");
    setWords(wordsGenerator(DEFAULT_WORDS_COUNT, difficulty));
    setCountDownConstant(newCountDown);
    setCountDown(newCountDown);
    setDifficulty(difficulty);
    clearInterval(intervalId);
    setWpm(0);
    setRawKeyStrokes(0);
    setWpmKeyStrokes(0);
    setCurrInput("");
    setPrevInput("");
    setIntervalId(null);
    setCurrWordIndex(0);
    setCurrCharIndex(-1);
    setCurrChar("");
    setHistory({});
    setInputWordsHistory({});
    setWordsCorrect(new Set());
    setWordsInCorrect(new Set());
    textInputRef.current.focus();
    // console.log("fully reset waiting for next inputs");
    wordSpanRefs[0].current.scrollIntoView();
  };

  const start = () => {
    if (status === "finished") {
      setWords(wordsGenerator(DEFAULT_WORDS_COUNT));
      setCurrInput("");
      setPrevInput("");
      setCurrWordIndex(0);
      setCurrCharIndex(-1);
      setCurrChar("");
      setHistory({});
      setInputWordsHistory({});
      setWordsCorrect(new Set());
      setWordsInCorrect(new Set());
      setStatus("waiting");
      textInputRef.current.focus();
    }

    if (status !== "started") {
      setStatus("started");
      let intervalId = setInterval(() => {
        setCountDown((prevCountdown) => {
          if (prevCountdown === 0) {
            clearInterval(intervalId);
            // current total extra inputs char count
            const currCharExtraCount = Object.values(history)
              .filter((e) => typeof e === "number")
              .reduce((a, b) => a + b, 0);

            // current correct inputs char count
            const currCharCorrectCount = Object.values(history).filter(
              (e) => e === true
            ).length;

            // current correct inputs char count
            const currCharIncorrectCount = Object.values(history).filter(
              (e) => e === false
            ).length;

            // current missing inputs char count
            const currCharMissingCount = Object.values(history).filter(
              (e) => e === undefined
            ).length;

            // current total advanced char counts
            const currCharAdvancedCount =
              currCharCorrectCount +
              currCharMissingCount +
              currCharIncorrectCount;

            const accuracy =
              (currCharCorrectCount / currCharAdvancedCount) * 100;
            setStatsCharCount([
              accuracy,
              currCharCorrectCount,
              currCharIncorrectCount,
              currCharMissingCount,
              currCharAdvancedCount,
              currCharExtraCount,
            ]);

            checkPrev();
            setStatus("finished");

            return countDownConstant;
          } else {
            return prevCountdown - 1;
          }
        });
      }, 1000);
      setIntervalId(intervalId);
    }
  };

  const UpdateInput = (e) => {
    if (status === "finished") {
      return;
    }
    setCurrInput(e.target.value);
    inputWordsHistory[currWordIndex] = e.target.value.trim();
    setInputWordsHistory(inputWordsHistory);
  };

  const handleKeyUp = (e) => {
    setCapsLocked(e.getModifierState("CapsLock"));
  };

  const handleKeyDown = (e) => {
    const key = e.key;
    const keyCode = e.keyCode;
    setCapsLocked(e.getModifierState("CapsLock"));

    // keydown count for KPM calculations to all types of operations
    if (status === "started") {
      setRawKeyStrokes(rawKeyStrokes + 1);
      if (keyCode >= 65 && keyCode <= 90) {
        setWpmKeyStrokes(wpmKeyStrokes + 1);
      }
    }

    // disable Caps Lock key
    if (keyCode === 20){
      e.preventDefault();
      return;
    }

    // disable tab key
    if (keyCode === 9) {
      e.preventDefault();
      return;
    }

    if (status === "finished") {
      setCurrInput("");
      setPrevInput("");
      return;
    }

    // update stats when typing
    const currWpm =
      (wpmKeyStrokes / 4 / (countDownConstant - countDown)) * 60.0;
    setWpm(currWpm);

    // start the game by typing any thing
    if (status !== "started" && status !== "finished") {
      start();
    }

    // space bar
    if (keyCode === 32) {
      const prevCorrectness = checkPrev();
      // advance to next regardless prev correct/not
      if (prevCorrectness === true || prevCorrectness === false) {
        // reset currInput
        setCurrInput("");
        // advance to next
        setCurrWordIndex(currWordIndex + 1);
        setCurrCharIndex(-1);
        return;
      } else {
        // but don't allow entire word skip
        // console.log("entire word skip not allowed");
        return;
      }

      // backspace
    } else if (keyCode === 8) {
      // delete the mapping match records
      delete history[keyString];

      // avoid over delete
      if (currCharIndex < 0) {
        // only allow delete prev word, rewind to previous
        if (wordsInCorrect.has(currWordIndex - 1)) {
          // console.log("detected prev incorrect, rewinding to previous");
          const prevInputWord = inputWordsHistory[currWordIndex - 1];
          // console.log(prevInputWord + " ")
          setCurrInput(prevInputWord + " ");
          setCurrCharIndex(prevInputWord.length - 1);
          setCurrWordIndex(currWordIndex - 1);
          setPrevInput(prevInputWord);
        }
        return;
      }
      setCurrCharIndex(currCharIndex - 1);
      setCurrChar("");
      return;
    } else {
      setCurrCharIndex(currCharIndex + 1);
      setCurrChar(key);
      return;
      // if (keyCode >= 65 && keyCode <= 90) {
      //   setCurrCharIndex(currCharIndex + 1);
      //   setCurrChar(key);
      // } else {
      //   return;
      // }
    }
  };

  const getExtraCharsDisplay = (word, i) => {
    let input = inputWordsHistory[i];
    if (!input) {
      input = currInput.trim();
    }
    if (i > currWordIndex) {
      return null;
    }
    if (input.length <= word.length) {
      return null;
    } else {
      const extra = input.slice(word.length, input.length).split("");
      history[i] = extra.length;
      return extra.map((c, idx) => (
        <span key={idx} className="error-char">
          {c}
        </span>
      ));
    }
  };

  const checkPrev = () => {
    const wordToCompare = words[currWordIndex];
    const currInputWithoutSpaces = currInput.trim();
    const isCorrect = wordToCompare === currInputWithoutSpaces;
    if (!currInputWithoutSpaces || currInputWithoutSpaces.length === 0) {
      return null;
    }
    if (isCorrect) {
      // console.log("detected match");
      wordsCorrect.add(currWordIndex);
      wordsInCorrect.delete(currWordIndex);
      let inputWordsHistoryUpdate = { ...inputWordsHistory };
      inputWordsHistoryUpdate[currWordIndex] = currInputWithoutSpaces;
      setInputWordsHistory(inputWordsHistoryUpdate);
      // reset prevInput to empty (will not go back)
      setPrevInput("");
      return true;
    } else {
      // console.log("detected unmatch");
      wordsInCorrect.add(currWordIndex);
      wordsCorrect.delete(currWordIndex);
      let inputWordsHistoryUpdate = { ...inputWordsHistory };
      inputWordsHistoryUpdate[currWordIndex] = currInputWithoutSpaces;
      setInputWordsHistory(inputWordsHistoryUpdate);
      // append currInput to prevInput
      setPrevInput(prevInput + " " + currInputWithoutSpaces);
      return false;
    }
  };

  const getWordClassName = (wordIdx) => {
    if (wordsInCorrect.has(wordIdx)) {
      if (currWordIndex === wordIdx) {
        return "word error-word active-word";
      }
      return "word error-word";
    } else {
      if (currWordIndex === wordIdx) {
        return "word active-word";
      }
      return "word";
    }
  };

  const getCharClassName = (wordIdx, charIdx, char) => {
    const keyString = wordIdx + "." + charIdx;
    if (history[keyString] === true) {
      return "correct-char";
    }
    if (history[keyString] === false) {
      return "error-char";
    }
    if (
      wordIdx === currWordIndex &&
      charIdx === currCharIndex &&
      currChar &&
      status !== "finished"
    ) {
      if (char === currChar) {
        history[keyString] = true;
        return "correct-char";
      } else {
        history[keyString] = false;
        return "error-char";
      }
    } else {
      if (wordIdx < currWordIndex) {
        // missing chars
        history[keyString] = undefined;
      }

      return "char";
    }
  };

  const getDifficultyButtonClassName = (buttonDifficulty) => {
    if (difficulty === buttonDifficulty) {
      return "active-button";
    }
    return "inactive-button";
  };

  const getTimerButtonClassName = (buttonTimerCountDown) => {
    if (countDownConstant === buttonTimerCountDown) {
      return "active-button";
    }
    return "inactive-button";
  };

  return (
    <>
      <CapsLockSnackbar open={capsLocked}></CapsLockSnackbar>
      <div className="type-box">
        <div className="words">
          {words.map((word, i) => (
            <span key={i} ref={wordSpanRefs[i]} className={getWordClassName(i)}>
              {word.split("").map((char, idx) => (
                <span
                  key={"word" + idx}
                  className={getCharClassName(i, idx, char)}
                >
                  {char}
                </span>
              ))}
              {getExtraCharsDisplay(word, i)}
            </span>
          ))}
        </div>
      </div>
      <div className="stats">
        <h3>{countDown} s </h3>
        <Box display="flex" flexDirection="row">
          <h3>WPM: {Math.round(wpm)}</h3>
          {status === "finished" && (
            <h4>Accuracy: {Math.round(statsCharCount[0])} %</h4>
          )}
          {status === "finished" && (
            <Tooltip
              title={
                <span style={{ whiteSpace: "pre-line" }}>
                  {CHAR_TOOLTIP_TITLE}
                </span>
              }
            >
              <h4>
                Char:{" "}
                <span className="correct-char-stats">{statsCharCount[1]}</span>/
                <span className="incorrect-char-stats">
                  {statsCharCount[2]}
                </span>
                /<span className="missing-char-stats">{statsCharCount[3]}</span>
                /<span className="correct-char-stats">{statsCharCount[4]}</span>
                /
                <span className="incorrect-char-stats">
                  {statsCharCount[5]}
                </span>
              </h4>
            </Tooltip>
          )}
          {status === "finished" && (
            <h4>
              Raw KPM: {Math.round((rawKeyStrokes / countDownConstant) * 60.0)}
            </h4>
          )}
        </Box>
        <div className="restart-button" key="restart-button">
          <Grid container justifyContent="center" alignItems="center">
            <Box display="flex" flexDirection="row">
              <IconButton
                aria-label="restart"
                color="secondary"
                size="medium"
                onClick={() => {
                  reset(countDownConstant, difficulty);
                }}
              >
                <RestartAltIcon />
              </IconButton>
              {menuEnabled && (<>
              <IconButton
                onClick={() => {
                  reset(COUNT_DOWN_60, difficulty);
                }}
              >
                <span className={getTimerButtonClassName(COUNT_DOWN_60)}>
                  {COUNT_DOWN_60}
                </span>
              </IconButton>
              <IconButton
                onClick={() => {
                  reset(COUNT_DOWN_30, difficulty);
                }}
              >
                <span className={getTimerButtonClassName(COUNT_DOWN_30)}>
                  {COUNT_DOWN_30}
                </span>
              </IconButton>
              <IconButton
                onClick={() => {
                  reset(COUNT_DOWN_15, difficulty);
                }}
              >
                <span className={getTimerButtonClassName(COUNT_DOWN_15)}>
                  {COUNT_DOWN_15}
                </span>
              </IconButton>
              </>)}
            </Box>
            {menuEnabled && (
            <Box display="flex" flexDirection="row">
              <IconButton
                onClick={() => {
                  reset(countDownConstant, DEFAULT_DIFFICULTY);
                }}
              >
                <Tooltip title={DEFAULT_DIFFICULTY_TOOLTIP_TITLE}>
                  <span
                    className={getDifficultyButtonClassName(DEFAULT_DIFFICULTY)}
                  >
                    {DEFAULT_DIFFICULTY}
                  </span>
                </Tooltip>
              </IconButton>
              <IconButton
                onClick={() => {
                  reset(countDownConstant, HARD_DIFFICULTY);
                }}
              >
                <Tooltip title={HARD_DIFFICULTY_TOOLTIP_TITLE}>
                  <span
                    className={getDifficultyButtonClassName(HARD_DIFFICULTY)}
                  >
                    {HARD_DIFFICULTY}
                  </span>
                </Tooltip>
              </IconButton>
            </Box>)}
          </Grid>
        </div>
      </div>
      <input
        key="hidden-input"
        ref={textInputRef}
        type="text"
        className="hidden-input"
        onKeyDown={(e) => handleKeyDown(e)}
        onKeyUp={(e) => handleKeyUp(e)}
        value={currInput}
        onChange={(e) => UpdateInput(e)}
      />
    </>
  );
};

export default TypeBox;
