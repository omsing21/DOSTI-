import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE = "http://127.0.0.1:8000";

const fallbackBootstrap = {
  profile: {
    id: "u-current",
    name: "Om Pawar",
    email: "om@somaiya.edu",
    college: "K. J. Somaiya School of Engineering",
    city: "Mumbai",
    locality: "Vidyavihar",
    bio: "Computer engineering student building DOSTI with BERT-powered friend matching.",
    interests: ["AI", "coding", "football", "music", "startups"],
    hobbies: ["building apps", "football", "music nights"],
    avatar: "OP",
  },
  recommendations: [
    {
      user: {
        id: "u-01",
        name: "Aarya Mehta",
        locality: "Ghatkopar",
        city: "Mumbai",
        avatar: "AM",
        bio: "Machine learning learner who loves hackathons and campus clubs.",
        interests: ["AI", "hackathons", "photography", "campus clubs"],
      },
      score: 0.91,
      semanticScore: 0.86,
      locationScore: 0.78,
      sharedInterests: ["AI", "coding"],
      explanation: "BERT found strong semantic overlap around AI projects and campus building.",
    },
    {
      user: {
        id: "u-02",
        name: "Vivaan Shah",
        locality: "Chembur",
        city: "Mumbai",
        avatar: "VS",
        bio: "Design-minded student who organizes football and music meetups.",
        interests: ["football", "music", "events", "design"],
      },
      score: 0.88,
      semanticScore: 0.8,
      locationScore: 0.78,
      sharedInterests: ["football", "music"],
      explanation: "DOSTI matched football, music, and local event interests.",
    },
    {
      user: {
        id: "u-05",
        name: "Nisha Iyer",
        locality: "Vidyavihar",
        city: "Mumbai",
        avatar: "NI",
        bio: "Startup enthusiast practicing pitches and product thinking.",
        interests: ["startups", "AI", "public speaking", "design"],
      },
      score: 0.86,
      semanticScore: 0.76,
      locationScore: 1,
      sharedInterests: ["AI", "startups"],
      explanation: "Same locality plus startup and AI interests make this a strong match.",
    },
  ],
  matched: [],
  events: [
    {
      id: "e-01",
      title: "AI Project Jam",
      host: "Aarya Mehta",
      locality: "Vidyavihar",
      time: "Today, 4:30 PM",
      tags: ["AI", "coding"],
      summary: "Prototype final-year project ideas with other builders.",
      attendees: ["Om Pawar", "Aarya Mehta"],
    },
    {
      id: "e-02",
      title: "Football Evening",
      host: "Vivaan Shah",
      locality: "Ghatkopar Turf",
      time: "Tomorrow, 6:00 PM",
      tags: ["football", "fitness"],
      summary: "Open 5-a-side game for nearby college students.",
      attendees: ["Vivaan Shah"],
    },
  ],
  posts: [
    {
      id: "p-01",
      author: "Aarya Mehta",
      text: "Anyone joining the AI Project Jam today?",
      analysis: { label: "Friendly", score: 0.88, source: "BERT embeddings", tags: ["project", "today"] },
    },
  ],
  bert: {
    source: "BERT embeddings",
    model: "distilbert-base-uncased",
    formula: "final_score = 0.68 * BERT_profile_similarity + 0.22 * locality_score + shared_interest_boost",
    steps: [
      "Signup collects bio, interests, hobbies, locality, and profile avatar.",
      "DOSTI joins the bio, interests, hobbies, and locality into one profile text.",
      "DistilBERT converts profile text into contextual token vectors.",
      "The backend mean-pools token vectors into one embedding per student.",
      "Cosine similarity compares your embedding with every student.",
      "The score is blended with locality and shared interests.",
    ],
  },
  databaseStats: { users: 25, events: 8, posts: 3 },
};

const screens = [
  "Setup",
  "Discover",
  "Matched",
  "Events",
  "Feed",
  "Profile",
  "Settings",
  "BERT",
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState("Setup");
  const [data, setData] = useState(fallbackBootstrap);
  const [loginName, setLoginName] = useState("Om Pawar");
  const [loginEmail, setLoginEmail] = useState("om@somaiya.edu");
  const [profileDraft, setProfileDraft] = useState(fallbackBootstrap.profile);
  const [eventDraft, setEventDraft] = useState({ title: "", time: "", locality: "", tags: "", summary: "" });
  const [postText, setPostText] = useState("");

  useEffect(() => {
    loadBootstrap();
  }, []);

  const profile = data.profile;

  async function request(path, options) {
    const response = await fetch(`${API_BASE}${path}`, options);
    if (!response.ok) {
      throw new Error(`Request failed: ${path}`);
    }
    return response.json();
  }

  async function loadBootstrap() {
    try {
      const next = await request("/api/bootstrap");
      setData(next);
      setProfileDraft(next.profile);
    } catch {
      setData(fallbackBootstrap);
      setProfileDraft(fallbackBootstrap.profile);
    }
  }

  async function login() {
    try {
      await request("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: loginName, email: loginEmail }),
      });
      await loadBootstrap();
    } catch {
      setData((current) => ({
        ...current,
        profile: { ...current.profile, name: loginName, email: loginEmail, avatar: initials(loginName) },
      }));
    }
    setLoggedIn(true);
  }

  async function saveProfile() {
    const payload = {
      ...profileDraft,
      interests: toList(profileDraft.interests),
      hobbies: toList(profileDraft.hobbies),
    };
    try {
      const result = await request("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setData((current) => ({ ...current, profile: result.profile, recommendations: result.recommendations }));
    } catch {
      setData((current) => ({ ...current, profile: payload }));
    }
    setScreen("Discover");
  }

  async function makeFriend(userId) {
    try {
      const result = await request("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const recs = await request("/api/recommendations");
      setData((current) => ({ ...current, matched: result.matched, recommendations: recs.items }));
    } catch {
      const picked = data.recommendations.find((item) => item.user.id === userId);
      setData((current) => ({
        ...current,
        recommendations: current.recommendations.filter((item) => item.user.id !== userId),
        matched: picked ? [picked, ...current.matched] : current.matched,
      }));
    }
    setScreen("Matched");
  }

  async function createEvent() {
    const payload = { ...eventDraft, tags: toList(eventDraft.tags) };
    if (!payload.title || !payload.time || !payload.locality) {
      Alert.alert("Add event details", "Title, time, and locality are required.");
      return;
    }
    try {
      const result = await request("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setData((current) => ({ ...current, events: [result.event, ...current.events] }));
    } catch {
      const event = {
        ...payload,
        id: `local-${Date.now()}`,
        host: profile.name,
        attendees: [profile.name],
      };
      setData((current) => ({ ...current, events: [event, ...current.events] }));
    }
    setEventDraft({ title: "", time: "", locality: "", tags: "", summary: "" });
  }

  async function addPost() {
    if (!postText.trim()) return;
    try {
      const result = await request("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: postText }),
      });
      setData((current) => ({ ...current, posts: [result.post, ...current.posts] }));
    } catch {
      const post = {
        id: `local-${Date.now()}`,
        author: profile.name,
        text: postText,
        analysis: { label: "Friendly", score: 0.82, source: "BERT-style local demo", tags: [] },
      };
      setData((current) => ({ ...current, posts: [post, ...current.posts] }));
    }
    setPostText("");
  }

  const visibleContent = useMemo(() => {
    if (screen === "Setup") {
      return <SetupScreen profileDraft={profileDraft} setProfileDraft={setProfileDraft} saveProfile={saveProfile} stats={data.databaseStats} />;
    }
    if (screen === "Discover") {
      return <DiscoverScreen items={data.recommendations} makeFriend={makeFriend} />;
    }
    if (screen === "Matched") {
      return <MatchedScreen items={data.matched} />;
    }
    if (screen === "Events") {
      return <EventsScreen events={data.events} eventDraft={eventDraft} setEventDraft={setEventDraft} createEvent={createEvent} />;
    }
    if (screen === "Feed") {
      return <FeedScreen posts={data.posts} postText={postText} setPostText={setPostText} addPost={addPost} />;
    }
    if (screen === "Profile") {
      return <ProfileScreen profile={profile} />;
    }
    if (screen === "Settings") {
      return <SettingsScreen />;
    }
    return <BertScreen bert={data.bert} />;
  }, [screen, data, profileDraft, eventDraft, postText]);

  if (!loggedIn) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.authWrap}>
          <View style={styles.heroArt}>
            <View style={styles.sun} />
            <View style={styles.cloudOne} />
            <View style={styles.cloudTwo} />
            <View style={styles.campusOne} />
            <View style={styles.campusTwo} />
            <View style={styles.campusThree} />
          </View>
          <View style={styles.pixelCard}>
            <View style={styles.brandRow}>
              <PixelAvatar label="D" />
              <View style={styles.flex}>
                <Text style={styles.title}>DOSTI</Text>
                <Text style={styles.muted}>BERT-powered college social network</Text>
              </View>
            </View>
            <TextInput style={styles.input} value={loginName} onChangeText={setLoginName} placeholder="Name" />
            <TextInput style={styles.input} value={loginEmail} onChangeText={setLoginEmail} placeholder="College email" />
            <PixelButton label="Login / Signup" onPress={login} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.app}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <PixelAvatar label={profile.avatar} />
            <View style={styles.flex}>
              <Text style={styles.titleSmall}>DOSTI</Text>
              <Text style={styles.muted}>{data.bert.source}</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {screens.map((item) => (
            <TouchableOpacity key={item} style={[styles.tab, screen === item && styles.tabActive]} onPress={() => setScreen(item)}>
              <Text style={[styles.tabText, screen === item && styles.tabTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.content}>{visibleContent}</ScrollView>
      </View>
    </SafeAreaView>
  );
}

function SetupScreen({ profileDraft, setProfileDraft, saveProfile, stats }) {
  return (
    <View style={styles.pixelCard}>
      <ScreenTitle title="Build Your DOSTI Card" subtitle={`${stats.users} users in seeded database`} />
      <Field label="Name" value={profileDraft.name} onChangeText={(name) => setProfileDraft((p) => ({ ...p, name }))} />
      <Field label="Pixel PFP initials" value={profileDraft.avatar} onChangeText={(avatar) => setProfileDraft((p) => ({ ...p, avatar }))} />
      <Field label="Locality" value={profileDraft.locality} onChangeText={(locality) => setProfileDraft((p) => ({ ...p, locality }))} />
      <Field label="Interests" value={listValue(profileDraft.interests)} onChangeText={(interests) => setProfileDraft((p) => ({ ...p, interests }))} />
      <Field label="Hobbies" value={listValue(profileDraft.hobbies)} onChangeText={(hobbies) => setProfileDraft((p) => ({ ...p, hobbies }))} />
      <Field label="Bio" value={profileDraft.bio} onChangeText={(bio) => setProfileDraft((p) => ({ ...p, bio }))} multiline />
      <PixelButton label="Save and Match" onPress={saveProfile} />
    </View>
  );
}

function DiscoverScreen({ items, makeFriend }) {
  return (
    <View>
      <ScreenTitle title="Friends You Can Make" subtitle="Ranked by BERT similarity, locality, and shared interests." />
      {items.map((item) => <FriendCard key={item.user.id} item={item} action="Make Friend" onPress={() => makeFriend(item.user.id)} />)}
    </View>
  );
}

function MatchedScreen({ items }) {
  return (
    <View>
      <ScreenTitle title="Matched Friends" subtitle="See how similar your interests are." />
      {items.length === 0 ? <Text style={styles.notice}>No matches yet. Make a friend from Discover.</Text> : null}
      {items.map((item) => <FriendCard key={item.user.id} item={item} action={`Text ${item.user.name.split(" ")[0]}`} />)}
    </View>
  );
}

function EventsScreen({ events, eventDraft, setEventDraft, createEvent }) {
  return (
    <View>
      <ScreenTitle title="Events" subtitle="Host, attend, and message people for meetups." />
      <View style={styles.pixelCard}>
        <Field label="Event title" value={eventDraft.title} onChangeText={(title) => setEventDraft((e) => ({ ...e, title }))} />
        <Field label="When" value={eventDraft.time} onChangeText={(time) => setEventDraft((e) => ({ ...e, time }))} />
        <Field label="Where" value={eventDraft.locality} onChangeText={(locality) => setEventDraft((e) => ({ ...e, locality }))} />
        <Field label="Tags" value={eventDraft.tags} onChangeText={(tags) => setEventDraft((e) => ({ ...e, tags }))} />
        <Field label="Summary" value={eventDraft.summary} onChangeText={(summary) => setEventDraft((e) => ({ ...e, summary }))} multiline />
        <PixelButton label="Post Event" onPress={createEvent} />
      </View>
      {events.map((event) => (
        <View key={event.id} style={styles.pixelCard}>
          <Text style={styles.badge}>{event.time}</Text>
          <Text style={styles.cardTitle}>{event.title}</Text>
          <Text style={styles.muted}>Hosted by {event.host} at {event.locality}</Text>
          <Text style={styles.bodyText}>{event.summary}</Text>
          <ChipRow items={event.tags} />
          <Text style={styles.notice}>{event.attendees.length} attending</Text>
          <PixelButton label="Text Host / Join" onPress={() => Alert.alert("Meetup message sent", `You asked ${event.host} to join ${event.title}.`)} />
        </View>
      ))}
    </View>
  );
}

function FeedScreen({ posts, postText, setPostText, addPost }) {
  return (
    <View>
      <ScreenTitle title="Campus Feed" subtitle="Share ideas, event updates, and meetup plans." />
      <View style={styles.pixelCard}>
        <TextInput style={[styles.input, styles.textArea]} value={postText} onChangeText={setPostText} placeholder="Share something fun..." multiline />
        <PixelButton label="Post" onPress={addPost} />
      </View>
      {posts.map((post) => (
        <View key={post.id} style={styles.pixelCard}>
          <Text style={styles.cardTitle}>{post.author}</Text>
          <Text style={styles.bodyText}>{post.text}</Text>
          <ChipRow items={[`${post.analysis.label} ${Math.round(post.analysis.score * 100)}%`, post.analysis.source, ...(post.analysis.tags || [])]} />
        </View>
      ))}
    </View>
  );
}

function ProfileScreen({ profile }) {
  return (
    <View style={styles.pixelCard}>
      <PixelAvatar label={profile.avatar} large />
      <Text style={styles.cardTitle}>{profile.name}</Text>
      <Text style={styles.muted}>{profile.email}</Text>
      <Text style={styles.muted}>{profile.college}</Text>
      <Text style={styles.muted}>{profile.locality}, {profile.city}</Text>
      <Text style={styles.bodyText}>{profile.bio}</Text>
      <ChipRow items={profile.interests} />
      <ChipRow items={profile.hobbies} />
    </View>
  );
}

function SettingsScreen() {
  return (
    <View>
      <ScreenTitle title="Settings" subtitle="Demo controls for your project presentation." />
      {["Use BERT semantic matching", "Show locality in suggestions", "Show explainable AI reason", "Private profile mode"].map((item, index) => (
        <View key={item} style={styles.settingRow}>
          <View style={[styles.checkbox, index < 3 && styles.checkboxOn]} />
          <Text style={styles.bodyText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function BertScreen({ bert }) {
  return (
    <View>
      <ScreenTitle title="BERT Viva" subtitle={`${bert.model} | ${bert.source}`} />
      <Text style={styles.formula}>{bert.formula}</Text>
      {bert.steps.map((step, index) => (
        <View key={step} style={styles.stepRow}>
          <Text style={styles.stepNumber}>{index + 1}</Text>
          <Text style={styles.bodyText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

function FriendCard({ item, action, onPress }) {
  return (
    <View style={styles.pixelCard}>
      <View style={styles.friendHead}>
        <PixelAvatar label={item.user.avatar} />
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{item.user.name}</Text>
          <Text style={styles.muted}>{item.user.locality}, {item.user.city}</Text>
        </View>
        <Text style={styles.score}>{Math.round(item.score * 100)}%</Text>
      </View>
      <Text style={styles.bodyText}>{item.user.bio}</Text>
      <View style={styles.meter}><View style={[styles.meterFill, { width: `${Math.round(item.score * 100)}%` }]} /></View>
      <View style={styles.scoreRow}>
        <Text style={styles.notice}>BERT {Math.round(item.semanticScore * 100)}%</Text>
        <Text style={styles.notice}>Locality {Math.round(item.locationScore * 100)}%</Text>
      </View>
      <ChipRow items={item.sharedInterests.length ? item.sharedInterests : ["semantic match"]} />
      <Text style={styles.explain}>{item.explanation}</Text>
      <PixelButton label={action} onPress={onPress || (() => Alert.alert("Message", "Text screen can be added as the next module."))} />
    </View>
  );
}

function ScreenTitle({ title, subtitle }) {
  return (
    <View style={styles.screenTitle}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.muted}>{subtitle}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, multiline }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && styles.textArea]} value={value} onChangeText={onChangeText} multiline={multiline} />
    </View>
  );
}

function PixelButton({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function PixelAvatar({ label, large }) {
  return (
    <View style={[styles.avatar, large && styles.avatarLarge]}>
      <View style={styles.eyeLeft} />
      <View style={styles.eyeRight} />
      <Text style={[styles.avatarText, large && styles.avatarTextLarge]}>{label}</Text>
    </View>
  );
}

function ChipRow({ items }) {
  return (
    <View style={styles.chips}>
      {items.map((item) => <Text key={`${item}`} style={styles.chip}>{item}</Text>)}
    </View>
  );
}

function toList(value) {
  if (Array.isArray(value)) return value;
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function listValue(value) {
  return Array.isArray(value) ? value.join(", ") : value;
}

function initials(name) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "D";
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8e7a5" },
  authWrap: { flexGrow: 1, padding: 18, justifyContent: "center", gap: 18 },
  app: { flex: 1, padding: 14 },
  header: { marginBottom: 10 },
  tabs: { maxHeight: 54, marginBottom: 10 },
  content: { paddingBottom: 40 },
  pixelCard: {
    backgroundColor: "#fff8d8",
    borderWidth: 4,
    borderColor: "#211b2f",
    padding: 14,
    marginBottom: 14,
    shadowColor: "#211b2f",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 7,
  },
  heroArt: {
    height: 260,
    borderWidth: 4,
    borderColor: "#211b2f",
    backgroundColor: "#77d8ff",
    overflow: "hidden",
  },
  sun: { position: "absolute", right: 36, top: 28, width: 64, height: 64, backgroundColor: "#ffd23f", borderWidth: 4, borderColor: "#211b2f" },
  cloudOne: { position: "absolute", left: 34, top: 72, width: 92, height: 30, backgroundColor: "white", borderWidth: 3, borderColor: "#211b2f" },
  cloudTwo: { position: "absolute", right: 74, top: 126, width: 84, height: 28, backgroundColor: "white", borderWidth: 3, borderColor: "#211b2f" },
  campusOne: { position: "absolute", left: 34, bottom: 32, width: 82, height: 96, backgroundColor: "#ff5d9e", borderWidth: 4, borderColor: "#211b2f" },
  campusTwo: { position: "absolute", left: 128, bottom: 32, width: 98, height: 132, backgroundColor: "#21a67a", borderWidth: 4, borderColor: "#211b2f" },
  campusThree: { position: "absolute", right: 34, bottom: 32, width: 78, height: 78, backgroundColor: "#3d6cff", borderWidth: 4, borderColor: "#211b2f" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  title: { fontSize: 42, fontWeight: "900", color: "#211b2f" },
  titleSmall: { fontSize: 26, fontWeight: "900", color: "#211b2f" },
  heading: { fontSize: 25, fontWeight: "900", color: "#211b2f" },
  cardTitle: { fontSize: 19, fontWeight: "900", color: "#211b2f" },
  muted: { color: "#675d72", lineHeight: 20 },
  bodyText: { color: "#211b2f", lineHeight: 21 },
  label: { fontWeight: "900", color: "#211b2f", marginBottom: 6 },
  input: { borderWidth: 3, borderColor: "#211b2f", backgroundColor: "#fffdf1", padding: 11, color: "#211b2f", marginBottom: 10 },
  textArea: { minHeight: 92, textAlignVertical: "top" },
  field: { marginBottom: 4 },
  button: { backgroundColor: "#ffd23f", borderWidth: 3, borderColor: "#211b2f", padding: 12, alignItems: "center", shadowColor: "#211b2f", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5 },
  buttonText: { fontWeight: "900", color: "#211b2f", textTransform: "uppercase" },
  avatar: { width: 58, height: 58, borderWidth: 4, borderColor: "#211b2f", backgroundColor: "#21a67a", alignItems: "center", justifyContent: "center" },
  avatarLarge: { width: 112, height: 112, marginBottom: 12 },
  avatarText: { color: "white", fontWeight: "900", fontSize: 18 },
  avatarTextLarge: { fontSize: 32 },
  eyeLeft: { position: "absolute", top: 13, left: 12, width: 8, height: 8, backgroundColor: "#211b2f" },
  eyeRight: { position: "absolute", top: 13, right: 12, width: 8, height: 8, backgroundColor: "#211b2f" },
  tab: { borderWidth: 3, borderColor: "#211b2f", backgroundColor: "white", paddingHorizontal: 12, justifyContent: "center", marginRight: 8 },
  tabActive: { backgroundColor: "#3d6cff" },
  tabText: { fontWeight: "900", color: "#211b2f" },
  tabTextActive: { color: "white" },
  screenTitle: { borderBottomWidth: 4, borderColor: "#211b2f", paddingBottom: 10, marginBottom: 14 },
  friendHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  score: { backgroundColor: "#ffd23f", borderWidth: 3, borderColor: "#211b2f", padding: 8, fontWeight: "900" },
  meter: { height: 14, borderWidth: 3, borderColor: "#211b2f", backgroundColor: "white", marginVertical: 4 },
  meterFill: { height: "100%", backgroundColor: "#21a67a" },
  scoreRow: { flexDirection: "row", gap: 8 },
  notice: { borderWidth: 3, borderColor: "#211b2f", backgroundColor: "#fff2bb", color: "#211b2f", padding: 8, marginVertical: 4, flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 6 },
  chip: { borderWidth: 3, borderColor: "#211b2f", backgroundColor: "white", paddingHorizontal: 8, paddingVertical: 4, fontWeight: "900" },
  explain: { borderWidth: 3, borderColor: "#211b2f", backgroundColor: "#e7fbff", color: "#211b2f", padding: 10 },
  badge: { alignSelf: "flex-start", backgroundColor: "#ff5d9e", color: "white", borderWidth: 3, borderColor: "#211b2f", padding: 7, fontWeight: "900", marginBottom: 8 },
  settingRow: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 3, borderColor: "#211b2f", backgroundColor: "#fff8d8", padding: 12, marginBottom: 10 },
  checkbox: { width: 24, height: 24, borderWidth: 3, borderColor: "#211b2f", backgroundColor: "white" },
  checkboxOn: { backgroundColor: "#21a67a" },
  formula: { backgroundColor: "#211b2f", color: "#91ffcf", borderWidth: 3, borderColor: "#211b2f", padding: 12, marginBottom: 12, fontWeight: "900" },
  stepRow: { flexDirection: "row", gap: 10, borderWidth: 3, borderColor: "#211b2f", backgroundColor: "#fff8d8", padding: 10, marginBottom: 10 },
  stepNumber: { width: 28, height: 28, textAlign: "center", textAlignVertical: "center", backgroundColor: "#ffd23f", borderWidth: 3, borderColor: "#211b2f", fontWeight: "900" },
});
