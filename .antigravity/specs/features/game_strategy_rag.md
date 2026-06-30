# Feature Specification: Game Strategy RAG

**Status:** Under Review  
**Author:** Antigravity  
**Date Created:** 2026-06-30  
**Last Updated:** 2026-06-30  

---

## 1. Goal & Context
The goal of this feature is to build a premium, warm light-mode demo application that demonstrates how to implement an AI Retrieval-Augmented Generation (RAG) system in combination with Next.js App Router.
Users will select a game (Elden Ring, Hollow Knight, Cyberpunk 2077, or Clair Obscur: Expedition 33) and interact with a chatbot. The system will search local markdown files containing game manuals, retrieve the most relevant sections via cosine similarity, compile a prompt with the context, and stream the answer from Gemini. The app will visually inspect this process in real-time through a "Retrieval Inspector".

---

## 2. User Experience & Routing
* **Target Route(s):** `/` (Single-Page App Dashboard)
* **UX/Aesthetic Rules:**
  - **Aesthetic:** Warm light-mode using neutral tones (cream backgrounds like `#FDFBF7`, soft sands `#F4F0E6`, warm beige `#EAE4D9`, and soft amber `#E69A3B` or `#D48325` for highlights).
  - **Typography:** Elegant serif headings (e.g., Lora/Playfair Display) paired with clean, readable sans-serif body text (e.g., Outfit/Plus Jakarta Sans).
  - **Layout:** Three-column desktop layout (responsive collapse on mobile).
    - *Column 1 (Sidebar):* Game selection and source file browser.
    - *Column 2 (Main):* Clean, centered chat interface with input bar.
    - *Column 3 (Inspector):* Interactive panel showing similarity metrics and chunk contents.
  - **Transitions:** Smooth hover transitions on game cards, file links, and message additions.

---

## 3. Functional Requirements & Acceptance Criteria

### Game Selector & Knowledge Explorer (Left Column)
- [ ] **Game Selection**: User can switch between Elden Ring, Hollow Knight, Cyberpunk 2077, and Clair Obscur: Expedition 33. Selecting a game scopes all chat interactions and vector searches to that game's knowledge files.
- [ ] **Source Browser**: Displays a list of guide files available for the selected game. Clicking a file displays its raw contents in a modal or overlay.
- [ ] **Acceptance Criteria**:
  - **Given** the app is loaded  
  - **When** the user clicks "Hollow Knight"  
  - **Then** the UI updates to show Hollow Knight guides, and subsequent questions retrieve Hollow Knight context.

### RAG Chat Interface (Middle Column)
- [ ] **Chat Input & History**: A text input to ask questions. Standard chat log displaying user queries and system responses.
- [ ] **Streaming Responses**: AI responses stream in real-time.
- [ ] **Clear Button**: A button to clear chat history and start fresh.
- [ ] **Acceptance Criteria**:
  - **Given** a selected game  
  - **When** the user submits "Where is the Pure Nail?"  
  - **Then** the query is sent, the loading state triggers, and the AI response streams in.

### Retrieval Inspector (Right Column)
- [ ] **Relevance Threshold Slider**: A slider to control the cosine similarity threshold (e.g., 0.3 to 0.9).
- [ ] **Chunk Visualizer**: Displays retrieved markdown chunks, their calculated similarity score, and their rank.
- [ ] **Source Highlights**: Shows which specific files were utilized to compile the answer.
- [ ] **Acceptance Criteria**:
  - **Given** a query is processed  
  - **When** chunks are returned from the vector search  
  - **Then** the Inspector displays their similarity scores and text snippets, highlighting the files used in the sidebar.

---

## 4. Technical Implementation & Files
* **Component Page:** [page.tsx](file:///c:/Development/game-ai-rag/src/app/page.tsx)
* **Layout Structure:** [layout.tsx](file:///c:/Development/game-ai-rag/src/app/layout.tsx)
* **Page Styles:** [page.module.css](file:///c:/Development/game-ai-rag/src/app/page.module.css)
* **Embedding Utility:** [embedder.ts](file:///c:/Development/game-ai-rag/src/lib/rag/embedder.ts)
* **Vector Search Utility:** [retriever.ts](file:///c:/Development/game-ai-rag/src/lib/rag/retriever.ts)
* **API Chat Endpoint:** [route.ts](file:///c:/Development/game-ai-rag/src/app/api/chat/route.ts)

---

## 5. Verification & Testing
* **Automated Verification:**
  - Execute a local test script to run cosine-similarity calculations and check that correct chunks are fetched:
    `npx tsx src/scripts/test-retrieval.ts`
* **Manual Verification Steps:**
  1. Open the application in a browser.
  2. Select "Clair Obscur: Expedition 33".
  3. Enter "What is the theme of Expedition 33?".
  4. Verify that the answer references the correct lore and the Retrieval Inspector displays chunks with scores > 0.5.
