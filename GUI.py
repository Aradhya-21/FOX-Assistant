import tkinter as tk
from tkinter.scrolledtext import ScrolledText
import threading
import core

# ==================================================
# GUI HELPERS
# ==================================================
def log(message):
    log_box.insert(tk.END, message + "\n")
    log_box.see(tk.END)

def set_status(text):
    status_label.config(text=f"Status: {text}")

# ==================================================
# BUTTON ACTIONS
# ==================================================
def start_assistant():
    set_status("Starting")
    threading.Thread(
        target=core.run_assistant,
        args=(log, set_status),
        daemon=True
    ).start()

def stop_assistant():
    core.stop_assistant()
    set_status("Stopped")
    log("Assistant stopped.")

# ==================================================
# GUI SETUP
# ==================================================
root = tk.Tk()
root.title("FOX Voice Assistant")
root.geometry("540x420")

status_label = tk.Label(root, text="Status: Idle", font=("Arial", 12))
status_label.pack(pady=5)

log_box = ScrolledText(root, height=15, font=("Consolas", 10))
log_box.pack(padx=10, pady=5, fill=tk.BOTH, expand=True)

btn_frame = tk.Frame(root)
btn_frame.pack(pady=10)

tk.Button(btn_frame, text="Start Assistant", width=15, command=start_assistant).pack(side=tk.LEFT, padx=10)
tk.Button(btn_frame, text="Stop Assistant", width=15, command=stop_assistant).pack(side=tk.RIGHT, padx=10)

root.mainloop()
