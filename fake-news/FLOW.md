# Truth Lens — Flow Charts & Storyboard

## High-Level Pipeline

```mermaid
flowchart TD
    A["📄 Input: Article Text or URL"] --> B{"Has URL?"}
    B -->|Yes| C["Fetch & Parse Article\n(newspaper4k)"]
    B -->|No| D["Use Pasted Text Directly"]
    C --> E["📋 Full Article Text"]
    D --> E
    
    E --> F["🔍 Step 1: Claim Extraction\nLLM identifies 3–7\nkey factual claims"]
    
    F --> G["📊 Step 2: Claim Analysis Loop"]
    
    G --> H["For Each Claim:"]
    H --> I["🔎 RAG Retrieval\nEmbed claim → search\nChromaDB vector store\nfor similar verified claims"]
    I --> J["⚖️ LLM Judge\nEvaluates claim against\nretrieved evidence\nOutputs: verdict + confidence + reasoning"]
    
    J --> K{"More claims?"}
    K -->|Yes| H
    K -->|No| L
    
    L --> M["📈 Step 3: Aggregation\nWeighted average of\nclaim scores → overall\ncredibility score"]
    
    M --> N["⚠️ Step 4: Warning Analysis\nCheck for manipulation,\nbias, hallucination risks"]
    
    N --> O["📋 Output:\n• Overall Score (0–100%)\n• Per-Claim Breakdown\n• Evidence & Sources\n• Warnings"]
```

## RAG Retrieval Detail

```mermaid
flowchart LR
    subgraph KnowledgeBase["Knowledge Base (ChromaDB)"]
        KB1["🌐 Claim: 'Earth orbits Sun'\nVerdict: TRUE\nSource: Scientific Consensus"]
        KB2["🌐 Claim: '5G causes COVID'\nVerdict: FALSE\nSource: WHO fact-check"]
        KB3["🌐 Claim: 'Vaccines cause autism'\nVerdict: FALSE\nSource: CDC"]
        KB4["🌐 Claim: 'Climate change is real'\nVerdict: TRUE\nSource: IPCC"]
    end

    QC["📝 Query Claim:\n'5G networks spread disease'"] --> EMB["🧮 Embedding\n(sentence-transformers)"]
    EMB --> SIM["🔎 Cosine Similarity Search\n(top 5 matches)"]
    KnowledgeBase --> SIM
    SIM --> RESULT["📋 Retrieved Context:\n• '5G causes COVID' → FALSE (0.92)\n• 'Vaccines cause autism' → FALSE (0.45)\n• ..."]
    RESULT --> JUDGE["⚖️ LLM Judge"]
```

## User Journey (Storyboard)

```
┌─────────────────────────────────────────────────────┐
│                 1. HOME SCREEN                       │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │  Paste article text here...                  │   │
│   │                                              │   │
│   │                                              │   │
│   ├─────────────────────────────────────────────┤   │
│   │              OR                              │   │
│   ├─────────────────────────────────────────────┤   │
│   │  https://example.com/article                │   │
│   ├─────────────────────────────────────────────┤   │
│   │         🔍 Analyze Article                   │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                 2. LOADING STATE                     │
│                                                     │
│   🔄 Analyzing...                                   │
│   Extracting claims...                              │
│   Cross-referencing knowledge base...                │
│   Evaluating...                                     │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│              3. RESULTS SCREEN                       │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │  Overall Credibility Score:    ████████░ 78% │   │
│   │  LIKELY CREDIBLE                              │   │
│   │  3 claims true, 1 misleading                  │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   ⚠️ Warnings: Emotional language detected          │
│                                                     │
│   Claim 1: "The vaccine is 95% effective"           │
│   Verdict: ✅ TRUE (92% confidence)                 │
│   Evidence: CDC clinical trial data                 │
│                                                     │
│   Claim 2: "The government is hiding the truth"     │
│   Verdict: ⚠️ MISLEADING (60% confidence)           │
│   Explanation: No evidence supports this claim...   │
│                                                     │
│   [← New Analysis]                                  │
└─────────────────────────────────────────────────────┘
```
