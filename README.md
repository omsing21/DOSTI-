# DOSTI

A simple college-project social media app based on the DOSTI report.

DOSTI focuses on:

- Login/signup demo flow
- Profile onboarding with bio, interests, hobbies, locality, and pixel PFP initials
- AI friend recommendations
- Matched friends list with similarity percentages
- Interest-based profile matching
- Local community event discovery
- Event hosting, attending, and host-message flow
- Profile and settings screens
- Explainable recommendation reasons
- A campus feed with AI post analysis

## How BERT is implemented

The backend tries to use this BERT-family Hugging Face model:

`distilbert-base-uncased`

For each user, the app combines bio, interests, hobbies, city, and locality into one profile text. BERT converts that text into contextual token vectors. The app mean-pools those token vectors into one profile embedding and compares users with cosine similarity.

The final DOSTI recommendation score is:

```text
final_score = 0.68 * bert_similarity + 0.22 * location_score + shared_interest_boost
```

If `transformers` or the model is not available, the app still runs with a local fallback vectorizer. This lets you demonstrate the full app without internet or model setup.

## Screens

- Login / Signup
- Profile Setup
- Friends You Can Make
- Matched Friends
- Events
- Campus Feed
- Profile
- Settings
- BERT Viva Explanation

## Run

### Option A: Run the React Native app in VS Code

Open this folder in VS Code:

```powershell
cd "C:\Users\ompaw\Documents\Codex\2026-05-15\make-a-social-media-app-using"
code .
```

Install the React Native / Expo dependencies:

```powershell
npm install
```

Start the BERT backend in one VS Code terminal:

```powershell
& "C:\Users\ompaw\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" app.py
```

Start the React Native app in a second VS Code terminal:

```powershell
npm start
```

Then choose one:

- Press `a` for Android emulator
- Press `w` for web preview
- Scan the QR code using Expo Go on your phone

Important for phone testing: if Expo Go on your phone cannot connect to `127.0.0.1`, change `API_BASE` in `App.js` to your laptop IP address, for example:

```js
const API_BASE = "http://192.168.1.5:8000";
```

For Android emulator, use:

```js
const API_BASE = "http://10.0.2.2:8000";
```

### Option B: Run the browser prototype

```powershell
python app.py
```

If `python` is not on PATH in this Codex workspace, use:

```powershell
& "C:\Users\ompaw\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" app.py
```

Open:

```text
http://127.0.0.1:8000
```

## Enable real BERT embeddings

```powershell
pip install -r requirements.txt
python app.py
```

The first BERT run may download the model from Hugging Face.
