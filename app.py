from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import hashlib
import json
import math
import mimetypes
import time
import uuid

ROOT = Path(__file__).parent
STATIC = ROOT / "static"


CURRENT_USER = {
    "id": "u-current",
    "name": "Om Pawar",
    "email": "om@somaiya.edu",
    "college": "K. J. Somaiya School of Engineering",
    "city": "Mumbai",
    "locality": "Vidyavihar",
    "bio": "Computer engineering student building DOSTI, an AI social app for college friends, events, coding, football, and useful campus communities.",
    "interests": ["AI", "coding", "football", "college events", "music", "startups"],
    "hobbies": ["building apps", "playing football", "music nights"],
    "avatar": "OP",
    "theme": "arcade green",
}


def make_user(index, name, locality, interests, hobbies, bio_extra):
    return {
        "id": f"u-{index:02d}",
        "name": name,
        "email": f"{name.lower().replace(' ', '.')}@somaiya.edu",
        "college": "K. J. Somaiya School of Engineering",
        "city": "Mumbai" if locality not in {"Vashi", "Nerul", "Kharghar"} else "Navi Mumbai",
        "locality": locality,
        "bio": f"{bio_extra} Interested in {', '.join(interests[:4])}.",
        "interests": interests,
        "hobbies": hobbies,
        "avatar": "".join(part[0] for part in name.split())[:2].upper(),
    }


USERS = [
    make_user(1, "Aarya Mehta", "Ghatkopar", ["AI", "hackathons", "photography", "food walks", "campus clubs"], ["street photography", "cafe hopping"], "Machine learning learner who loves building projects with friends."),
    make_user(2, "Vivaan Shah", "Chembur", ["football", "music", "UI design", "volunteering", "college events"], ["guitar", "5-a-side football"], "Design-minded student who organizes small campus meetups."),
    make_user(3, "Sana Khan", "Andheri", ["data science", "books", "theatre", "social impact", "AI"], ["reading", "stage plays"], "Data science learner who likes explainable AI and social good."),
    make_user(4, "Kabir Rao", "Vashi", ["mobile apps", "cricket", "gaming", "tech meetups", "coding"], ["gaming", "cricket"], "Mobile app builder who follows tech communities."),
    make_user(5, "Nisha Iyer", "Vidyavihar", ["startups", "public speaking", "AI", "pitching", "design"], ["debate", "podcasts"], "Startup enthusiast practicing pitches and product thinking."),
    make_user(6, "Rehan Ali", "Kurla", ["robotics", "coding", "electronics", "football", "events"], ["robot kits", "football"], "Robotics student who likes hardware and team games."),
    make_user(7, "Diya Nair", "Powai", ["music", "dance", "college events", "photography", "travel"], ["dance", "concerts"], "Cultural committee member who enjoys creative campus events."),
    make_user(8, "Yash Patil", "Dadar", ["cricket", "fitness", "finance", "startups", "food"], ["gym", "cricket"], "Finance and fitness fan looking for active communities."),
    make_user(9, "Meera Joshi", "Matunga", ["books", "writing", "theatre", "music", "social impact"], ["poetry", "open mics"], "Writer who attends literature and theatre circles."),
    make_user(10, "Arjun Desai", "Thane", ["AI", "gaming", "cybersecurity", "coding", "anime"], ["capture the flag", "retro games"], "Security-curious coder who likes AI tools."),
    make_user(11, "Riya Kapoor", "Bandra", ["fashion", "photography", "content creation", "music", "events"], ["reels", "photo walks"], "Creative student who documents campus life."),
    make_user(12, "Dev Malhotra", "Mulund", ["coding", "open source", "cloud", "hackathons", "AI"], ["open source", "late-night builds"], "Backend developer who enjoys hackathon teamwork."),
    make_user(13, "Ananya Kulkarni", "Vile Parle", ["psychology", "books", "social impact", "volunteering", "music"], ["journaling", "NGO work"], "Community-minded student interested in wellbeing."),
    make_user(14, "Ishaan Bedi", "Nerul", ["gaming", "esports", "UI design", "anime", "music"], ["esports", "pixel art"], "Esports fan who sketches pixel characters."),
    make_user(15, "Tara Singh", "Sion", ["dance", "fitness", "events", "food walks", "travel"], ["dance battles", "cycling"], "Energetic student who brings people into events."),
    make_user(16, "Neil Dsouza", "Byculla", ["music", "guitar", "football", "college events", "photography"], ["guitar", "band practice"], "Musician who also joins sports events."),
    make_user(17, "Pooja Menon", "Kharghar", ["data science", "AI", "research", "books", "coding"], ["paper reading", "blogging"], "Research-focused student exploring ML papers."),
    make_user(18, "Rohan Gupta", "Ghatkopar", ["football", "cricket", "fitness", "events", "food"], ["turf games", "street food"], "Sports organizer who knows nearby turfs."),
    make_user(19, "Kiara Fernandes", "Vidyavihar", ["theatre", "music", "public speaking", "events", "writing"], ["drama club", "hosting"], "Anchor and theatre volunteer on campus."),
    make_user(20, "Manav Jain", "Chembur", ["startups", "finance", "coding", "AI", "public speaking"], ["pitch decks", "podcasts"], "Builder interested in product and business."),
    make_user(21, "Zoya Sheikh", "Andheri", ["photography", "travel", "food walks", "music", "content creation"], ["photo walks", "editing"], "Visual storyteller who likes exploring Mumbai."),
    make_user(22, "Aditya More", "Kurla", ["robotics", "AI", "hackathons", "gaming", "coding"], ["robot soccer", "LAN games"], "Hackathon regular who likes AI plus hardware."),
    make_user(23, "Simran Kaur", "Dadar", ["volunteering", "social impact", "books", "events", "public speaking"], ["NGO drives", "reading"], "Volunteer who organizes student drives."),
    make_user(24, "Harsh Vora", "Powai", ["cloud", "coding", "startups", "finance", "tech meetups"], ["SaaS demos", "meetups"], "Cloud learner who attends founder events."),
]


EVENTS = [
    {
        "id": "e-01",
        "title": "AI Project Jam",
        "host": "Aarya Mehta",
        "locality": "Vidyavihar",
        "time": "Today, 4:30 PM",
        "tags": ["AI", "coding", "hackathons"],
        "summary": "Bring your final-year project idea and prototype it with other builders.",
        "attendees": ["Om Pawar", "Dev Malhotra", "Pooja Menon"],
        "messages": [],
    },
    {
        "id": "e-02",
        "title": "Football Evening",
        "host": "Rohan Gupta",
        "locality": "Ghatkopar Turf",
        "time": "Tomorrow, 6:00 PM",
        "tags": ["football", "fitness"],
        "summary": "Open 5-a-side game for college students nearby.",
        "attendees": ["Vivaan Shah", "Neil Dsouza"],
        "messages": [],
    },
    {
        "id": "e-03",
        "title": "Pixel Art Hangout",
        "host": "Ishaan Bedi",
        "locality": "Campus Lab 3",
        "time": "Friday, 3:00 PM",
        "tags": ["pixel art", "gaming", "design"],
        "summary": "Sketch tiny 8-bit avatars and trade design tips.",
        "attendees": ["Om Pawar"],
        "messages": [],
    },
    {
        "id": "e-04",
        "title": "Somaiya Music Circle",
        "host": "Diya Nair",
        "locality": "Campus Amphitheatre",
        "time": "Friday, 5:00 PM",
        "tags": ["music", "events"],
        "summary": "Unplugged songs, guitar, and casual jam sessions.",
        "attendees": ["Neil Dsouza", "Kiara Fernandes"],
        "messages": [],
    },
    {
        "id": "e-05",
        "title": "Startup Pitch Practice",
        "host": "Nisha Iyer",
        "locality": "Vidyavihar",
        "time": "Saturday, 11:00 AM",
        "tags": ["startups", "public speaking", "finance"],
        "summary": "Practice a two-minute pitch and get friendly feedback.",
        "attendees": ["Manav Jain", "Harsh Vora"],
        "messages": [],
    },
    {
        "id": "e-06",
        "title": "Book Cafe Meetup",
        "host": "Meera Joshi",
        "locality": "Matunga",
        "time": "Sunday, 2:00 PM",
        "tags": ["books", "writing", "food"],
        "summary": "Discuss short stories and pick the next campus read.",
        "attendees": ["Sana Khan", "Ananya Kulkarni"],
        "messages": [],
    },
    {
        "id": "e-07",
        "title": "Cybersecurity Mini CTF",
        "host": "Arjun Desai",
        "locality": "Online + Campus Lab",
        "time": "Monday, 7:00 PM",
        "tags": ["cybersecurity", "coding", "gaming"],
        "summary": "Beginner-friendly security puzzles with teams of two.",
        "attendees": ["Dev Malhotra"],
        "messages": [],
    },
    {
        "id": "e-08",
        "title": "Community Volunteering Drive",
        "host": "Simran Kaur",
        "locality": "Sion",
        "time": "Wednesday, 9:00 AM",
        "tags": ["volunteering", "social impact"],
        "summary": "Plan and join a weekend student volunteering drive.",
        "attendees": ["Ananya Kulkarni", "Tara Singh"],
        "messages": [],
    },
]

POSTS = [
    {
        "id": "p-01",
        "author": "Aarya Mehta",
        "handle": "@aarya",
        "text": "Looking for teammates for the AI Project Jam. Anyone interested in BERT recommendations?",
        "createdAt": int(time.time()) - 1400,
        "likes": 18,
    },
    {
        "id": "p-02",
        "author": "Rohan Gupta",
        "handle": "@rohan",
        "text": "Football evening near Ghatkopar tomorrow. Join if you want a chill college game.",
        "createdAt": int(time.time()) - 5100,
        "likes": 11,
    },
    {
        "id": "p-03",
        "author": "Ishaan Bedi",
        "handle": "@ishaan",
        "text": "Making pixel avatars for DOSTI profiles this Friday. Bring references or just vibes.",
        "createdAt": int(time.time()) - 7800,
        "likes": 23,
    },
]

MATCHED_IDS = {"u-01", "u-02", "u-05", "u-19"}

_bert_components = None
_bert_checked = False
_embedding_cache = {}


def profile_text(user):
    return " ".join(
        [
            user.get("bio", ""),
            user.get("city", ""),
            user.get("locality", ""),
            " ".join(user.get("interests", [])),
            " ".join(user.get("hobbies", [])),
        ]
    )


def get_bert_components():
    global _bert_checked, _bert_components
    if _bert_checked:
        return _bert_components
    _bert_checked = True
    try:
        import torch
        from transformers import AutoModel, AutoTokenizer

        model_name = "distilbert-base-uncased"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name)
        model.eval()
        _bert_components = {"torch": torch, "tokenizer": tokenizer, "model": model, "name": model_name}
    except Exception:
        _bert_components = None
    return _bert_components


def normalize(vector):
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def fallback_embedding(text, dimensions=128):
    vector = [0.0] * dimensions
    words = [word.strip(".,!?;:()[]{}\"'").lower() for word in text.split()]
    for word in words:
        if not word:
            continue
        digest = hashlib.sha256(word.encode("utf-8")).digest()
        index = int.from_bytes(digest[:2], "big") % dimensions
        sign = 1 if digest[2] % 2 == 0 else -1
        vector[index] += sign * (1.0 + min(len(word), 12) / 12)
    return normalize(vector)


def bert_embedding(text):
    cached = _embedding_cache.get(text)
    if cached:
        return cached
    components = get_bert_components()
    if not components:
        result = {"vector": fallback_embedding(text), "source": "local fallback vectorizer", "model": "hashing fallback"}
        _embedding_cache[text] = result
        return result

    torch = components["torch"]
    tokenizer = components["tokenizer"]
    model = components["model"]
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=160)
    with torch.no_grad():
        output = model(**inputs)
    mask = inputs["attention_mask"].unsqueeze(-1)
    summed = (output.last_hidden_state * mask).sum(dim=1)
    counts = mask.sum(dim=1).clamp(min=1)
    vector = (summed / counts).squeeze().tolist()
    result = {"vector": normalize(vector), "source": "BERT embeddings", "model": components["name"]}
    _embedding_cache[text] = result
    return result


def cosine_similarity(a, b):
    return sum(left * right for left, right in zip(a, b))


def location_score(user, candidate):
    if user["locality"].lower() == candidate["locality"].lower():
        return 1.0
    if user["city"].lower() == candidate["city"].lower():
        return 0.78
    return 0.42


def shared_interests(user, candidate):
    user_terms = {item.lower() for item in user.get("interests", []) + user.get("hobbies", [])}
    candidate_terms = {item.lower() for item in candidate.get("interests", []) + candidate.get("hobbies", [])}
    exact = user_terms.intersection(candidate_terms)
    fuzzy = {
        candidate_item
        for candidate_item in candidate_terms
        for user_item in user_terms
        if user_item in candidate_item or candidate_item in user_item
    }
    return sorted(exact.union(fuzzy))


def explain_match(user, candidate, semantic, geo, common):
    common_text = ", ".join(common[:4]) if common else "similar words in your bio and interests"
    locality = (
        f"both of you are around {user['locality']}"
        if user["locality"] == candidate["locality"]
        else f"{candidate['locality']} is close enough for campus meetups"
    )
    return f"BERT matched profile meaning around {common_text}. The locality score helps because {locality}."


def recommendation_items(include_matched=True):
    user_embedding = bert_embedding(profile_text(CURRENT_USER))
    items = []
    for candidate in USERS:
        if not include_matched and candidate["id"] in MATCHED_IDS:
            continue
        candidate_embedding = bert_embedding(profile_text(candidate))
        semantic = max(0.0, cosine_similarity(user_embedding["vector"], candidate_embedding["vector"]))
        geo = location_score(CURRENT_USER, candidate)
        common = shared_interests(CURRENT_USER, candidate)
        interest_boost = min(len(common) * 0.035, 0.18)
        score = min((semantic * 0.68) + (geo * 0.22) + interest_boost, 1.0)
        items.append(
            {
                "user": candidate,
                "matched": candidate["id"] in MATCHED_IDS,
                "score": round(score, 3),
                "semanticScore": round(semantic, 3),
                "locationScore": round(geo, 3),
                "sharedInterests": common,
                "explanation": explain_match(CURRENT_USER, candidate, semantic, geo, common),
            }
        )
    return sorted(items, key=lambda item: item["score"], reverse=True)


def analyze_post(text):
    positive = {"great", "good", "love", "happy", "useful", "excited", "friend", "friends", "join", "meetup"}
    negative = {"bad", "sad", "angry", "hate", "spam", "unsafe", "broken", "toxic"}
    words = [word.strip(".,!?;:()[]{}\"'").lower() for word in text.split()]
    pos = sum(word in positive for word in words)
    neg = sum(word in negative for word in words)
    label = "Friendly" if pos >= neg else "Needs review"
    score = 0.58 + min(abs(pos - neg) * 0.1, 0.35)
    return {
        "label": label,
        "score": round(score, 2),
        "source": bert_embedding(text)["source"],
        "tags": [word for word in words if len(word) > 4][:3],
    }


for post in POSTS:
    post["analysis"] = analyze_post(post["text"])


class AppHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            self.send_file(STATIC / "index.html")
            return
        if path == "/api/bootstrap":
            recs = recommendation_items()
            self.send_json(
                {
                    "profile": CURRENT_USER,
                    "posts": sorted(POSTS, key=lambda post: post["createdAt"], reverse=True),
                    "recommendations": [item for item in recs if not item["matched"]][:16],
                    "matched": [item for item in recs if item["matched"]],
                    "events": sorted(EVENTS, key=lambda event: event["id"], reverse=True),
                    "bert": self.bert_payload(),
                    "databaseStats": {"users": len(USERS) + 1, "events": len(EVENTS), "posts": len(POSTS)},
                }
            )
            return
        if path == "/api/profile":
            self.send_json({"profile": CURRENT_USER})
            return
        if path == "/api/recommendations":
            emb = bert_embedding(profile_text(CURRENT_USER))
            self.send_json({"source": emb["source"], "model": emb["model"], "items": recommendation_items(False)})
            return
        if path == "/api/matches":
            self.send_json({"items": [item for item in recommendation_items(True) if item["matched"]]})
            return
        if path == "/api/events":
            self.send_json({"events": sorted(EVENTS, key=lambda event: event["id"], reverse=True)})
            return
        if path == "/api/posts":
            self.send_json({"posts": sorted(POSTS, key=lambda post: post["createdAt"], reverse=True)})
            return
        if path == "/api/bert-explanation":
            self.send_json(self.bert_payload())
            return
        requested = (STATIC / path.lstrip("/")).resolve()
        if STATIC.resolve() in requested.parents and requested.exists():
            self.send_file(requested)
            return
        self.send_error(404)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/login":
            body = self.read_json()
            name = str(body.get("name", "")).strip()
            email = str(body.get("email", "")).strip()
            if name:
                CURRENT_USER["name"] = name[:48]
                CURRENT_USER["avatar"] = initials(name)
            if email:
                CURRENT_USER["email"] = email[:80]
            self.send_json({"profile": CURRENT_USER})
            return
        if path == "/api/onboarding":
            body = self.read_json()
            CURRENT_USER["name"] = str(body.get("name", CURRENT_USER["name"])).strip()[:48] or CURRENT_USER["name"]
            CURRENT_USER["bio"] = str(body.get("bio", CURRENT_USER["bio"])).strip()[:360] or CURRENT_USER["bio"]
            CURRENT_USER["locality"] = str(body.get("locality", CURRENT_USER["locality"])).strip()[:48] or CURRENT_USER["locality"]
            CURRENT_USER["avatar"] = str(body.get("avatar", "")).strip()[:3].upper() or initials(CURRENT_USER["name"])
            CURRENT_USER["interests"] = clean_list(body.get("interests", []), 10)
            CURRENT_USER["hobbies"] = clean_list(body.get("hobbies", []), 8)
            _embedding_cache.clear()
            self.send_json({"profile": CURRENT_USER, "recommendations": recommendation_items(False)})
            return
        if path == "/api/match":
            body = self.read_json()
            user_id = str(body.get("userId", ""))
            if any(user["id"] == user_id for user in USERS):
                MATCHED_IDS.add(user_id)
            self.send_json({"matched": [item for item in recommendation_items(True) if item["matched"]]})
            return
        if path == "/api/events":
            body = self.read_json()
            event = {
                "id": f"e-{uuid.uuid4().hex[:8]}",
                "title": str(body.get("title", "Untitled meetup")).strip()[:80],
                "host": CURRENT_USER["name"],
                "locality": str(body.get("locality", CURRENT_USER["locality"])).strip()[:60],
                "time": str(body.get("time", "Soon")).strip()[:60],
                "tags": clean_list(body.get("tags", []), 6),
                "summary": str(body.get("summary", "")).strip()[:240],
                "attendees": [CURRENT_USER["name"]],
                "messages": [],
            }
            EVENTS.insert(0, event)
            self.send_json({"event": event}, status=201)
            return
        if path == "/api/event-message":
            body = self.read_json()
            event_id = str(body.get("eventId", ""))
            message = str(body.get("message", "")).strip()[:220]
            for event in EVENTS:
                if event["id"] == event_id:
                    if CURRENT_USER["name"] not in event["attendees"]:
                        event["attendees"].append(CURRENT_USER["name"])
                    if message:
                        event["messages"].append({"from": CURRENT_USER["name"], "text": message, "at": int(time.time())})
                    self.send_json({"event": event})
                    return
            self.send_json({"error": "Event not found"}, status=404)
            return
        if path == "/api/analyze":
            body = self.read_json()
            self.send_json({"analysis": analyze_post(str(body.get("text", "")))})
            return
        if path == "/api/posts":
            body = self.read_json()
            text = str(body.get("text", "")).strip()
            if not text:
                self.send_json({"error": "Post text is required."}, status=400)
                return
            post = {
                "id": str(uuid.uuid4()),
                "author": CURRENT_USER["name"],
                "handle": "@" + "".join(ch.lower() for ch in CURRENT_USER["name"] if ch.isalnum())[:20],
                "text": text[:280],
                "createdAt": int(time.time()),
                "likes": 0,
                "analysis": analyze_post(text),
            }
            POSTS.insert(0, post)
            self.send_json({"post": post}, status=201)
            return
        self.send_error(404)

    def bert_payload(self):
        emb = bert_embedding(profile_text(CURRENT_USER))
        return {
            "source": emb["source"],
            "model": emb["model"],
            "formula": "final_score = 0.68 * BERT_profile_similarity + 0.22 * locality_score + shared_interest_boost",
            "steps": [
                "Signup collects bio, interests, hobbies, locality, and profile avatar.",
                "DOSTI joins the bio, interests, hobbies, and locality into one profile text.",
                "DistilBERT tokenizes that text and converts every token into a contextual vector.",
                "The backend mean-pools token vectors into one profile embedding for each student.",
                "Cosine similarity compares your embedding with every student in the database.",
                "The score is blended with locality and shared interests to rank friend suggestions.",
                "Matched friends show the similarity percentage and plain-English explanation.",
                "Events use the same interest/locality profile to help users find meetups.",
            ],
        }

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def send_json(self, payload, status=200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_file(self, path):
        data = path.read_bytes()
        content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        return


def clean_list(value, limit):
    if isinstance(value, str):
        raw_items = value.split(",")
    else:
        raw_items = value
    items = []
    for item in raw_items:
        clean = str(item).strip()
        if clean and clean.lower() not in {existing.lower() for existing in items}:
            items.append(clean[:32])
    return items[:limit]


def initials(name):
    return "".join(part[0] for part in name.split() if part)[:2].upper() or "D"


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), AppHandler)
    print("DOSTI running at http://127.0.0.1:8000")
    print("Install transformers + torch to enable real DistilBERT embeddings.")
    server.serve_forever()
