import speech_recognition as sr
import pyttsx3
import datetime
import wikipedia
import webbrowser
import time

# ==================================================
# CONFIG

WAKE_WORD = "fox"
running = False

# ==================================================
# TEXT TO SPEECH
# ==================================================
engine = pyttsx3.init(driverName="sapi5")
voices = engine.getProperty("voices")
engine.setProperty("voice", voices[0].id)
engine.setProperty("rate", 165)
engine.setProperty("volume", 1.0)

def speak(text, logger=None):
    if logger:
        logger(f"Assistant: {text}")
    engine.stop()
    engine.say(text)
    engine.runAndWait()

# ==================================================
# SPEECH RECOGNITION
# ==================================================
def take_command():
    r = sr.Recognizer()
    r.pause_threshold = 0.8
    r.energy_threshold = 3000
    r.dynamic_energy_threshold = True

    try:
        with sr.Microphone() as source:
            r.adjust_for_ambient_noise(source, duration=1)
            audio = r.listen(source, timeout=5, phrase_time_limit=5)

        return r.recognize_google(audio, language="en-IN").lower()
    except:
        return ""

# ==================================================
# WAKE WORD (ONCE)
# ==================================================
def wait_for_wake_word(logger=None):
    r = sr.Recognizer()
    speak("Say FOX to start.", logger)

    while running:
        try:
            with sr.Microphone() as source:
                audio = r.listen(source, timeout=5, phrase_time_limit=3)

            text = r.recognize_google(audio, language="en-IN").lower()
            if logger:
                logger(f"Heard: {text}")

            if any(w in text for w in ["fox", "box", "foks"]):
                speak("Activated. I am listening.", logger)
                return
        except:
            continue

# ==================================================
# INTENT DETECTION
# ==================================================
INTENTS = {
    "time": ["time", "clock"],
    "date": ["date", "day"],
    "wiki": ["wikipedia", "search", "tell me about"],
    "open": ["open", "launch"],
    "map": ["map", "maps", "google map", "navigate", "location"],
    "exit": ["exit", "stop", "quit"]
}

def detect_intent(query):
    for intent, keywords in INTENTS.items():
        for word in keywords:
            if word in query:
                return intent
    return "unknown"

# ==================================================
# ACTIONS
# ==================================================
def open_website(query, logger=None):
    try:
        target = query.split("open")[1].strip().split()[0]
        url = f"https://www.{target}.com"
        webbrowser.open(url)
        speak(f"Opening {target}", logger)
    except:
        fallback_search(query, logger)

def wikipedia_open(query, logger=None):
    speak("Searching Wikipedia", logger)
    try:
        topic = query.replace("wikipedia", "").strip()
        result = wikipedia.search(topic, results=1)
        if result:
            page = wikipedia.page(result[0], auto_suggest=False)
            webbrowser.open(page.url)
            speak(f"Opening Wikipedia page for {result[0]}", logger)
    except:
        speak("Wikipedia search failed", logger)

def open_google_maps(query, logger=None):
    speak("Opening Google Maps", logger)

    location = query
    for word in ["open", "show", "navigate", "to", "map", "maps", "google", "location"]:
        location = location.replace(word, "")

    location = location.strip()

    if location:
        url = f"https://www.google.com/maps/search/{location.replace(' ', '+')}"
        speak(f"Showing {location} on Google Maps", logger)
    else:
        url = "https://www.google.com/maps"

    webbrowser.open(url)

def fallback_search(query, logger=None):
    webbrowser.open(f"https://www.google.com/search?q={query.replace(' ', '+')}")
    speak("I searched that on Google", logger)

# ==================================================
# MAIN ASSISTANT LOOP
# ==================================================
def run_assistant(logger=None, status_callback=None):
    global running
    running = True

    if status_callback:
        status_callback("Waiting for wake word")

    wait_for_wake_word(logger)

    if status_callback:
        status_callback("Listening")

    while running:
        query = take_command()
        if not query:
            continue

        if logger:
            logger(f"You: {query}")

        intent = detect_intent(query)

        if intent == "time":
            speak(datetime.datetime.now().strftime("The time is %H:%M:%S"), logger)

        elif intent == "date":
            speak(datetime.datetime.now().strftime("Today's date is %d %B %Y"), logger)

        elif intent == "wiki":
            wikipedia_open(query, logger)

        elif intent == "open":
            open_website(query, logger)

        elif intent == "map":
            open_google_maps(query, logger)

        elif intent == "exit":
            speak("Shutting down. Goodbye.", logger)
            time.sleep(1.5)
            running = False
            if status_callback:
                status_callback("Stopped")
            break

        else:
            fallback_search(query, logger)

        time.sleep(0.3)

def stop_assistant():
    global running
    running = False
