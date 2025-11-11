# Code-Review-Monitor

> ⚠️ **Disclaimer:** This is a personal project inspired by process patterns I’ve encountered in collaborative engineering environments.  
> It does **not** use any proprietary company code, data, or internal systems.  
> All logic, terminology, and data structures have been fully generalized for educational and portfolio purposes only.

---

### 🚀 Overview  
**Code Review Monitor** automates and streamlines the review lifecycle using **SQL** and **Google Apps Script**.  
It connects to a central database, fetches pending code reviews, calculates ideal vs. actual delays based on code size and project priority, and automatically sends reminder or escalation emails — all while logging every action in a tracker sheet.

This project demonstrates how lightweight automation can **reduce manual follow-ups, improve accountability, and accelerate engineering feedback loops** , without any complex setup or paid tools.  

---

### 📌 What It Does  
- 🧠 Fetches pending code reviews from a structured database  
- 🗂️ Categorizes each change by size and priority  
- ⏱️ Calculates ideal vs. actual review delays  
- 📊 Exports consolidated results to a Google Sheet  
- ✉️ Sends automated reminder and escalation emails via Apps Script  
- 📜 Logs all review actions in a “Mail Tracker” sheet for traceability  

---

### 🧩 Tech Stack  
- **SQL** – for data extraction and delay calculation  
- **Google Apps Script** – for automation, scheduling, and emailing  
- **Google Sheets** – for live tracking and reporting  

---

### 🌱 Why I Built This  
To explore how structured automation and data-driven tracking can simplify everyday engineering operations.  
It’s a small but impactful example of bridging **data analysis** with **workflow design** — a theme I love exploring in my projects.
