import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import CircularProgress from '@mui/material/CircularProgress';
import { ChevronDown, ChevronUp, BookText, Newspaper, Contact, House, Clock9, Menu, University, BanknoteArrowUp, BanknoteArrowDown, Image as ImageIcon, Music, Book } from 'lucide-react';
import QuickQuestions from '../components/QuickQuestions';

export default function Home() {
    const [userInput, setUserInput] = useState("");
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [showQuickQuestions, setShowQuickQuestions] = useState(true);

    const [resourcesOpen, setResourcesOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    const resourcesRef = useRef(null);

    const messageListRef = useRef(null);
    const textAreaRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordTime, setRecordTime] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark';
        }
        return true;
    });

  const resources = [
    { id: 1, name: 'Schedule', icon: Clock9, url: 'https://edu.info.uaic.ro/orar/' },
    { id: 2, name: 'Courses', icon: BookText, url: 'https://edu.info.uaic.ro/' },
    { id: 3, name: 'News', icon: Newspaper, url: 'https://www.info.uaic.ro/noutati/' },
    { id: 4, name: 'Contact', icon: Contact, url: 'https://www.info.uaic.ro/contact/' },
    { id: 5, name: 'Admission', icon: University, url: 'https://www.info.uaic.ro/admitere/' },
    { id: 6, name: 'Scolarship', icon: BanknoteArrowUp, url: 'https://www.uaic.ro/studenti/burse/' },
    { id: 7, name: 'Taxes', icon: BanknoteArrowDown, url: 'https://plati-taxe.uaic.ro/' },
    { id: 8, name: 'Housing', icon: House, url: 'https://www.uaic.ro/studenti/cazare/' }
  ];

  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordInterval = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
        if (resourcesRef.current && !resourcesRef.current.contains(event.target)) {
            setResourcesOpen(false);
        }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [resourcesRef]);

  useEffect(() => {
    const messageList = messageListRef.current;
    messageList.scrollTop = messageList.scrollHeight;
  }, [messages]);

    useEffect(() => {
        textAreaRef.current.focus();
    }, [messages]);

    useEffect(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, [messages]);

    const handleInput = () => {
        const el = textAreaRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
            el.scrollTop = el.scrollHeight;
        }
    };

    useEffect(() => {
        handleInput();

        window.addEventListener("resize", handleInput);
        return () => {
            window.removeEventListener("resize", handleInput);
        };
    }, []);

    const handleError = () => {
        setMessages((prevMessages) => [...prevMessages, {
            "message": "Oops! There seems to be an error. Please try again.",
            "type": "apiMessage"
        }]);
        setLoading(false);
        setUserInput("");
        const el = textAreaRef.current;
        if (el) {
            el.style.height = "auto";
            el.rows = 1;
        }
    }

    const handleSubmit = async (e) => {
        if(e) e.preventDefault();

        if (userInput.trim() === "") {
            return;
        }

        setLoading(true);
        setMessages((prevMessages) => [...prevMessages, { "message": userInput, "type": "userMessage" }]);

        setShowQuickQuestions(false);

        const response = await fetch("http://localhost:3000/api/post_question", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ question: userInput}),
        });

    if (!response.ok) {
      handleError();
      return;
    }

        // setUserInput("");
        // const el = textAreaRef.current;
        // if (el) {
        //     el.style.height = "auto";
        //     el.rows = 1;
        // }

        const data = await response.json();

        if (data.error) {
            handleError();
            return;
        }

    setMessages((prevMessages) => [...prevMessages, { "message": data.answer, "type": "apiMessage" }]);
    setUserInput("")
    setLoading(false);
  };

  const handleQuickQuestionClick = async (question) => {
    setShowQuickQuestions(false);
    
    // Add the question to messages immediately as a user message
    setMessages((prevMessages) => [...prevMessages, { "message": question, "type": "userMessage" }]);
    
    // Show loading state
    setLoading(true);
    
    // Send the question to the backend
    try {
      const response = await fetch("http://localhost:3000/api/post_question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: question }),
      });
      
      if (!response.ok) {
        handleError();
        return;
      }
      
      const data = await response.json();
      
      if (data.error) {
        handleError();
        return;
      }
      
      // Add the response to messages
      setMessages((prevMessages) => [...prevMessages, { "message": data.answer, "type": "apiMessage" }]);
      setLoading(false);
    } catch (error) {
      console.error("Error sending quick question:", error);
      handleError();
    }
  };
   
    const handleEnter = (e) => {
        if (e.key === "Enter" && userInput) {
            if (!e.shiftKey && userInput) {
                handleSubmit(e);
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
        }
    };

  const handleResourceSelect = (resource) => {
    // setSelectedResource(resource);
    setResourcesOpen(false);

    if(resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    if (messages.length >= 3) {
      setHistory([[messages[messages.length - 2].message, messages[messages.length - 1].message]]);
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
      clearInterval(recordInterval.current);
    };
  }, []);

  const handleRecord = async () => {
    if (isRecording) {
        mediaRecorderRef.current?.stop();
        clearInterval(recordInterval.current);
        setIsRecording(false);
        setRecordTime(0);
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        const audioChunks = [];
        
        // Store references to event listeners for cleanup
        const dataAvailableHandler = (event) => audioChunks.push(event.data);
        const stopHandler = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setAudioUrl(audioUrl);
            
            setMessages(prev => [...prev, {
                "message": audioUrl,
                "type": "userMessage",
                "isAudio": true
            }]);

            setShowQuickQuestions(false);
            
            // Clean up
            stream.getTracks().forEach(track => track.stop());
            mediaRecorder.removeEventListener("dataavailable", dataAvailableHandler);
            mediaRecorder.removeEventListener("stop", stopHandler);
        };

        mediaRecorder.addEventListener("dataavailable", dataAvailableHandler);
        mediaRecorder.addEventListener("stop", stopHandler);

        mediaRecorder.start();

        // Start timer
        setIsRecording(true);
        setRecordTime(0);
        recordInterval.current = setInterval(() => {
            setRecordTime(prev => prev + 1);
        }, 1000);

    } catch (error) {
        console.error("Recording error:", error);
        setIsRecording(false);
        setMessages(prev => [...prev, {
            "message": error.message.includes('permission') ? 
                "Microphone access denied. Please allow microphone permissions." :
                "Recording failed. Please try again.",
            "type": "apiMessage"
        }]);
    }
};
    return (
    <>
      <Head>
        <title>FiiHelp</title>
      </Head>
      <div className={isDarkMode ? styles.dark : styles.light}>
        <div className={styles.topnav}>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem 0 0' }}>
                <Image src="/logo.png" alt="UAIC Logo" width={48} height={48} />
            </a>
          <div className={styles.resourcesContainer} ref={resourcesRef}>
              <button 
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className={styles.resourcesButton}
              >
                <Menu />
              </button>
              
              {resourcesOpen && (
                <div className={styles.resourcesDropdown}>
                  <ul>
                    {resources.map((resource) => {
                      const IconComponent = resource.icon;
                      return (
                        <li key={resource.id}>
                          <button 
                            onClick={() => handleResourceSelect(resource)}
                            className={styles.resourceItem}
                          >
                            {IconComponent && <IconComponent size={16} className={styles.resourceIcon} />}
                            <span>{resource.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          <div className = {styles.navlinks}>
            <label className={styles["theme-toggle"]}>
                              <input
                                  type="checkbox"
                                  checked={!isDarkMode}
                                  onChange={() => {
                                      setIsDarkMode((prev) => {
                                          const newTheme = !prev;
                                          localStorage.setItem("theme", newTheme ? "dark" : "light");
                                          return newTheme;
                                      });
                                  }}
                              />
                              <span className={styles.slider}>
        <span className={`${styles.icon} ${styles.sun}`}>🌙</span>
        <span className={`${styles.icon} ${styles.moon}`}>☀️</span>
      </span>
                          </label>
          </div>
        </div>
        <main className={styles.main}>
          <div className = {styles.cloud}>
            <div ref={messageListRef} className = {styles.messagelist}>
              {messages.length === 0 && showQuickQuestions && (
                <div className={styles.quickQuestionsContainer}>
                  <QuickQuestions onQuestionClick={handleQuickQuestionClick} />
                </div>
              )}
              {messages.map((message, index) => (
            // The latest message sent by the user will be animated while waiting for a response
            <div
            key={index}
            className={message.type === "apiMessage" ? styles.botText : styles.userBubble}>
              <div className = {styles.markdownanswer}>
                {message.isAudio ? (
                        <audio controls src={message.message} className='styles.audioPlayer' />
                      ) : (
                  <ReactMarkdown linkTarget = {"_blank"}>{message.message}</ReactMarkdown>
                )}
                </div>
              </div>
          ))}
        </div>
            </div>
           <div className={styles.center}>

               <div className={styles.cloudform}>
                   <form onSubmit={handleSubmit} className={styles.inputArea}>
                       <div className={styles.inputWrap}>
    <textarea
        disabled={loading}
        onKeyDown={handleEnter}
        ref={textAreaRef}
        rows={1}
        onInput={handleInput}
        type="text"
        id="userInput"
        name="userInput"
        placeholder={loading ? "Waiting for response..." : "Type your question..."}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        className={styles.textarea}
    />

                           <button
                               type="button"
                               disabled={loading}
                               onClick={handleRecord}
                               className={styles.recordButton}
                           >
                               {isRecording ? "⏹ Stop" : "🎤 Record"}
                           </button>


                           <button
                               type="submit"
                               disabled={loading}
                               className={styles.generatebutton}
                           >
                               {loading ? (
                                   <div className={styles.loadingwheel}>
                                       <CircularProgress color="inherit" size={20}/>
                                   </div>
                               ) : (
                                   <svg viewBox="0 0 20 20" className={styles.svgicon}
                                        xmlns="http://www.w3.org/2000/svg">
                                       <path
                                           d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                                   </svg>
                               )}
                           </button>
                       </div>
                   </form>
                   {isRecording && (
                      <div className={styles.recordingIndicator}>
                    <div className={styles.recordingDot}></div>
                           ⏱️ Recording: {recordTime}s
                       </div>
                   )}
               </div>
           </div>
      </main>
      </div>
    </>
    );
}