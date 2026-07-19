import { Ionicons } from '@expo/vector-icons';

export type AssistantStatus = 'active' | 'beta' | 'coming_soon';
export type AssistantCategory =
  | 'Core'
  | 'Study & Career'
  | 'Life'
  | 'Finance & Business'
  | 'Creative'
  | 'Productivity'
  | 'Communication';

export interface AssistantDef {
  id: string;
  name: string;
  tagline: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  category: AssistantCategory;
  status: AssistantStatus;
  welcome: string;             // First message shown before user types anything
  placeholder: string;         // Chat input placeholder
  suggestions: string[];       // Quick prompt suggestions (4 recommended)
  disclaimer?: string;         // Optional footer disclaimer shown under intro
}

// 42 assistants — each a specialized expert with its own identity, tone, and workflow.
// System prompts are defined on the backend so we don't send them over the wire.
export const ASSISTANTS: AssistantDef[] = [
  // ---------- Core ----------
  {
    id: 'personal', name: 'Personal AI', tagline: 'Your everyday intelligent companion',
    icon: 'sparkles', color: '#6366F1', category: 'Core', status: 'active',
    welcome: "Hey! I'm your personal AI. Tell me what's on your mind — planning your day, brainstorming, or just thinking out loud. I'll match your vibe.",
    placeholder: 'Ask me anything…',
    suggestions: ['Plan my day around 3 meetings', 'Give me 5 ideas to unwind tonight', 'Explain a complex topic simply', 'Motivate me for a workout'],
  },
  {
    id: 'voice', name: 'Voice AI', tagline: 'Natural voice conversation',
    icon: 'mic', color: '#06B6D4', category: 'Core', status: 'active',
    welcome: 'Tap the mic to talk. I reply in short spoken sentences — no lists, no markdown.',
    placeholder: 'Or type here…',
    suggestions: ["What's the weather like right now?", 'Tell me a short story', 'Give me a 30-second pep talk'],
  },
  {
    id: 'search', name: 'AI Search', tagline: 'Real-time cited answers',
    icon: 'search', color: '#22D3EE', category: 'Core', status: 'active',
    welcome: "I search the live web and cite trusted sources. Ask me anything time-sensitive.",
    placeholder: 'Search the web with citations…',
    suggestions: ['Latest AI news today', 'Best budget phones under ₹20k', 'Current gold price in India', 'What happened in tech this week?'],
  },
  {
    id: 'research', name: 'Deep Research', tagline: 'Structured research reports with sources',
    icon: 'library', color: '#8B5CF6', category: 'Core', status: 'active',
    welcome: "I produce structured, cited research reports. Give me a topic and I'll deliver an executive summary, key findings, and sources.",
    placeholder: 'Research topic…',
    suggestions: ['Impact of EV adoption in India', 'State of climate tech 2026', 'AI regulation across countries', 'Future of remote work'],
  },

  // ---------- Study & Career ----------
  {
    id: 'study', name: 'Study Assistant', tagline: 'Homework, quizzes, flashcards',
    icon: 'school', color: '#F59E0B', category: 'Study & Career', status: 'active',
    welcome: "I'm your patient tutor. Ask me to explain concepts, quiz you, generate flashcards, or solve step by step.",
    placeholder: 'What do you want to learn?',
    suggestions: ['Explain photosynthesis like I am 12', 'Quiz me on WW2', 'Solve 3x² + 5x - 8 = 0 step by step', 'Make 10 flashcards on cell biology'],
  },
  {
    id: 'coding', name: 'Coding Assistant', tagline: 'Senior engineer at your side',
    icon: 'code-slash', color: '#10B981', category: 'Study & Career', status: 'active',
    welcome: "I write, debug, and explain code across languages. Paste code or describe what you want to build.",
    placeholder: 'Describe the code or paste it…',
    suggestions: ['Write a Python FastAPI CRUD API', 'Explain JavaScript closures', 'Debug my code (paste it)', 'Optimize this SQL query'],
  },
  {
    id: 'sql', name: 'SQL Assistant', tagline: 'Query, optimize, model data',
    icon: 'server', color: '#0EA5E9', category: 'Study & Career', status: 'active',
    welcome: "I write, explain and tune SQL across Postgres, MySQL, SQLite, and BigQuery. Share your schema or query.",
    placeholder: 'Describe query or schema…',
    suggestions: ['Top 5 customers by revenue this year', 'Explain this query plan', 'Design a schema for a food-delivery app', 'Convert MySQL query to Postgres'],
  },
  {
    id: 'api', name: 'API Assistant', tagline: 'Design & consume APIs',
    icon: 'git-network', color: '#0891B2', category: 'Study & Career', status: 'active',
    welcome: 'I help design REST/GraphQL APIs, generate example requests, and troubleshoot integrations.',
    placeholder: 'Describe the API…',
    suggestions: ['Design a REST API for a todo app', 'Generate a curl for OAuth token', 'Explain webhooks vs polling', 'GraphQL vs REST — when to use'],
  },
  {
    id: 'career', name: 'Career Assistant', tagline: 'Roadmaps, resumes, growth',
    icon: 'briefcase', color: '#F97316', category: 'Study & Career', status: 'active',
    welcome: "I coach you on career growth — resumes, LinkedIn, promotions, and pivots. Tell me your current role and goal.",
    placeholder: 'What is your career goal?',
    suggestions: ['Roadmap to become an ML engineer', 'Improve my LinkedIn headline', 'How to ask for a raise', 'Switch from support to product'],
  },
  {
    id: 'interview', name: 'Interview Coach', tagline: 'Mock interviews with feedback',
    icon: 'people', color: '#EF4444', category: 'Study & Career', status: 'active',
    welcome: "I run mock interviews and give feedback. Tell me the role and I will start with a warm-up.",
    placeholder: 'Role you are interviewing for…',
    suggestions: ['Interview me for a Frontend Engineer role', 'Behavioral question about conflict', 'System design: URL shortener', 'Feedback on my STAR answer'],
  },
  {
    id: 'writing', name: 'Writing Assistant', tagline: 'Essays, blogs, captions',
    icon: 'create', color: '#EC4899', category: 'Study & Career', status: 'active',
    welcome: "I write in any tone — punchy, poetic, corporate. Tell me the topic, audience, and length.",
    placeholder: 'What should I write?',
    suggestions: ['300-word blog on productivity', 'LinkedIn post celebrating a launch', 'Instagram caption for beach photo', 'Rewrite this in a friendly tone'],
  },
  {
    id: 'grammar', name: 'Grammar', tagline: 'Polish your text',
    icon: 'checkmark-done', color: '#14B8A6', category: 'Study & Career', status: 'active',
    welcome: 'Paste text — I fix grammar, style, and clarity while keeping your voice.',
    placeholder: 'Paste text to polish…',
    suggestions: ['Fix grammar in my email', 'Make this more concise', 'Convert passive to active voice', 'Simplify this paragraph'],
  },
  {
    id: 'translation', name: 'Translator', tagline: 'Idiomatic translation',
    icon: 'language', color: '#A855F7', category: 'Study & Career', status: 'active',
    welcome: 'I translate accurately with cultural nuance. Just say "translate to X: …".',
    placeholder: 'Translate to…',
    suggestions: ['Translate "Good morning, sir" to Japanese', 'Translate this paragraph to Hindi', 'Translate my resume to French', 'Formal vs casual in Spanish'],
  },
  {
    id: 'summarize', name: 'Summarizer', tagline: 'TL;DR any text',
    icon: 'reader', color: '#84CC16', category: 'Study & Career', status: 'active',
    welcome: 'Paste text or a URL and I give you a crisp summary + key takeaways.',
    placeholder: 'Paste text or link…',
    suggestions: ['Summarize this in 3 bullets', 'Extract key takeaways', 'Give an executive summary', 'Summarize for a 5-year-old'],
  },
  {
    id: 'email', name: 'Email Writer', tagline: 'Professional emails, fast',
    icon: 'mail', color: '#3B82F6', category: 'Study & Career', status: 'active',
    welcome: "Tell me who it's to and what you want to say — I draft the email.",
    placeholder: 'Email to…',
    suggestions: ['Sick leave email to manager', 'Follow-up after interview', 'Politely decline a meeting', 'Cold outreach to a founder'],
  },

  // ---------- Life ----------
  {
    id: 'health', name: 'Health Info', tagline: 'General wellness information',
    icon: 'medkit', color: '#EF4444', category: 'Life', status: 'active',
    welcome: "I share general health information only. I don't diagnose or prescribe — always consult a qualified doctor for medical decisions.",
    placeholder: 'Ask a health question…',
    suggestions: ['Foods high in iron', 'Home remedies for cold', 'What causes migraines?', 'BMI calculator explained'],
    disclaimer: 'Informational only — not medical advice.',
  },
  {
    id: 'fitness', name: 'Fitness Coach', tagline: 'Workouts, habits, discipline',
    icon: 'barbell', color: '#F97316', category: 'Life', status: 'active',
    welcome: "I plan workouts and habits based on your goal, level, and equipment. Tell me your situation.",
    placeholder: 'Your fitness goal…',
    suggestions: ['4-week home workout plan', 'Beginner gym split', 'Fat-loss diet for 75kg male', 'Fix bad posture at desk'],
    disclaimer: 'General fitness info — not medical advice.',
  },
  {
    id: 'recipe', name: 'Recipe Chef', tagline: 'What to cook tonight',
    icon: 'restaurant', color: '#F59E0B', category: 'Life', status: 'active',
    welcome: "Tell me what's in your fridge, your dietary preference, or a cuisine — I'll cook up recipes with steps.",
    placeholder: 'Ingredients or cuisine…',
    suggestions: ['Quick paneer dish under 20 min', '3-day veg meal plan', 'What to cook with eggs + spinach', 'Diwali sweet recipes'],
  },
  {
    id: 'travel', name: 'Travel Planner', tagline: 'Trips, itineraries, budgets',
    icon: 'airplane', color: '#06B6D4', category: 'Life', status: 'active',
    welcome: 'I plan trips end-to-end: itinerary, budget, packing, food, and hidden gems. Where are you going?',
    placeholder: 'Where and when?',
    suggestions: ['4-day Goa trip for ₹30k', '7-day Japan itinerary', 'Weekend near Bangalore', 'Packing list for winter Europe'],
  },
  {
    id: 'weather', name: 'Weather', tagline: 'Forecasts and travel weather',
    icon: 'partly-sunny', color: '#0EA5E9', category: 'Life', status: 'active',
    welcome: 'Ask me weather anywhere — I search live sources for forecasts.',
    placeholder: 'City or plan…',
    suggestions: ['Weather in Manali this weekend', 'Should I carry an umbrella tomorrow?', 'Best month to visit Ladakh', 'Air quality in Delhi today'],
  },
  {
    id: 'shopping', name: 'Shopping', tagline: 'Compare, choose, save',
    icon: 'cart', color: '#EC4899', category: 'Life', status: 'active',
    welcome: 'Tell me what you want to buy and your budget — I compare options and highlight the best deal.',
    placeholder: 'What are you shopping for?',
    suggestions: ['Best noise-cancelling headphones ₹15k', 'Compare iPhone 16 vs Pixel 9', 'Diwali gifts under ₹2000', 'Grocery list for a family of 4'],
  },
  {
    id: 'parenting', name: 'Parenting', tagline: 'Tips, activities, routines',
    icon: 'happy', color: '#F472B6', category: 'Life', status: 'active',
    welcome: 'I offer general parenting guidance and activity ideas. For medical or behavioural concerns, please consult a professional.',
    placeholder: 'Ask about parenting…',
    suggestions: ['Bedtime routine for a 3-year-old', 'Fun weekend activities for kids', 'Screen time guidelines', 'Handle tantrums calmly'],
    disclaimer: 'General information — consult a pediatrician for medical concerns.',
  },
  {
    id: 'petcare', name: 'Pet Care', tagline: 'Care for your companion',
    icon: 'paw', color: '#A78BFA', category: 'Life', status: 'active',
    welcome: 'I help with feeding, training, grooming, and general pet care. For health issues, always see a vet.',
    placeholder: 'Your pet question…',
    suggestions: ['Puppy training schedule', 'Best food for adult cats', 'Bathing frequency for a Labrador', 'Signs my dog is unwell'],
    disclaimer: 'General info — see a veterinarian for medical issues.',
  },
  {
    id: 'vehicle', name: 'Vehicle', tagline: 'Maintenance, cost, rules',
    icon: 'car', color: '#64748B', category: 'Life', status: 'active',
    welcome: 'I help with car/bike maintenance, fuel cost, service intervals, insurance basics, and traffic rules.',
    placeholder: 'Vehicle question…',
    suggestions: ['When to service my car', 'Fuel cost for 500 km trip', 'Traffic rules to avoid fines', 'EV vs petrol — 5-year cost'],
  },

  // ---------- Finance & Business ----------
  {
    id: 'finance', name: 'Finance (Edu)', tagline: 'Financial literacy',
    icon: 'wallet', color: '#10B981', category: 'Finance & Business', status: 'active',
    welcome: "I teach personal finance concepts and do the math for you. I don't give personalised investment advice.",
    placeholder: 'Ask a finance question…',
    suggestions: ['Explain SIP vs lump sum', 'Budget for ₹80k salary in Mumbai', 'EMI on ₹40L home loan @ 8.5%', 'Emergency fund — how much?'],
    disclaimer: 'Educational only — not personalized financial advice.',
  },
  {
    id: 'stock', name: 'Stock Market (Edu)', tagline: 'Learn how markets work',
    icon: 'trending-up', color: '#22C55E', category: 'Finance & Business', status: 'active',
    welcome: "I explain markets, ratios, and company basics for learning only. I don't recommend buys/sells or predict prices.",
    placeholder: 'Market concept or company…',
    suggestions: ['What is P/E ratio?', 'Explain futures & options simply', 'How to read a balance sheet', 'Difference between NSE and BSE'],
    disclaimer: 'Educational only — not investment advice.',
  },
  {
    id: 'business', name: 'Business Strategist', tagline: 'Strategy, SWOT, proposals',
    icon: 'business', color: '#0891B2', category: 'Finance & Business', status: 'active',
    welcome: "I'm your strategy consultant — SWOT, GTM, marketing, sales, and business docs. What is your company doing?",
    placeholder: 'Describe your business…',
    suggestions: ['SWOT for a D2C snacks brand', 'GTM plan for a SaaS product', 'Pitch deck outline (10 slides)', 'Cold sales email template'],
  },
  {
    id: 'startup', name: 'Startup Mentor', tagline: 'Idea → MVP → funding',
    icon: 'rocket', color: '#8B5CF6', category: 'Finance & Business', status: 'active',
    welcome: "I mentor founders end-to-end: validation, MVP, fundraising, growth. Where are you in the journey?",
    placeholder: 'Your startup stage…',
    suggestions: ['Validate my idea in 7 days', 'MVP scope for a fintech app', 'Pre-seed pitch to angels', 'Growth loop for consumer app'],
  },
  {
    id: 'realestate', name: 'Real Estate', tagline: 'Buy, rent, invest',
    icon: 'home', color: '#F59E0B', category: 'Finance & Business', status: 'active',
    welcome: 'I explain buying, renting, mortgages, and property investment basics. Local laws vary — verify with a professional.',
    placeholder: 'Property question…',
    suggestions: ['Should I rent or buy?', 'How much home loan can I afford?', 'Property tax basics in India', 'Red flags when buying a flat'],
    disclaimer: 'Educational only — consult a certified real-estate professional.',
  },
  {
    id: 'legal', name: 'Legal Info', tagline: 'General legal concepts',
    icon: 'shield-checkmark', color: '#6366F1', category: 'Finance & Business', status: 'active',
    welcome: "I explain legal concepts and procedures generally. This isn't legal advice — please consult a licensed lawyer.",
    placeholder: 'Legal concept…',
    suggestions: ['Difference between FIR and complaint', 'What is a rental agreement clause?', 'Consumer rights in India', 'How to file a small-cause suit'],
    disclaimer: 'General info only — not legal advice.',
  },
  {
    id: 'data', name: 'Data Analyst', tagline: 'CSV/Excel insights',
    icon: 'analytics', color: '#0EA5E9', category: 'Finance & Business', status: 'active',
    welcome: "Describe your dataset or paste rows — I'll suggest analyses, charts, and share statistical summaries.",
    placeholder: 'Describe your data…',
    suggestions: ['Analyze sales trend Jan-Jun', 'Best chart for time-series', 'Detect outliers in salary data', 'Correlation vs causation'],
  },

  // ---------- Creative ----------
  {
    id: 'design', name: 'Design', tagline: 'UI, logos, palettes, branding',
    icon: 'color-palette', color: '#EC4899', category: 'Creative', status: 'active',
    welcome: 'I brainstorm UI/UX, logos, color palettes, and branding. Describe the vibe or brand.',
    placeholder: 'Describe the design…',
    suggestions: ['Palette for a wellness app', 'Logo ideas for a coffee brand', 'Modern SaaS landing UI ideas', 'Font pairing for a fintech app'],
  },
  {
    id: 'music', name: 'Music', tagline: 'Discovery, playlists, moods',
    icon: 'musical-notes', color: '#A855F7', category: 'Creative', status: 'active',
    welcome: 'Tell me the mood or an artist you like — I curate discoveries and playlists (I respect copyright).',
    placeholder: 'Mood or artist…',
    suggestions: ['Chill lo-fi playlist for focus', 'Songs like Arijit Singh', 'Workout hype playlist', 'Underrated indie artists 2026'],
  },
  {
    id: 'entertainment', name: 'Entertainment', tagline: 'Movies, series, books',
    icon: 'film', color: '#EF4444', category: 'Creative', status: 'active',
    welcome: "I recommend movies, series, books, and anime based on your taste. Give me a title you loved.",
    placeholder: 'What did you love last?',
    suggestions: ['Movies like Interstellar', 'Bingeable Netflix series this month', 'Anime for beginners', 'Non-fiction books that changed lives'],
  },
  {
    id: 'gaming', name: 'Gaming', tagline: 'Games, strategy, esports',
    icon: 'game-controller', color: '#F59E0B', category: 'Creative', status: 'active',
    welcome: 'I recommend games, share strategy tips, and track esports. What platform are you on?',
    placeholder: 'Platform or game…',
    suggestions: ['Best RPGs on PS5 in 2026', 'BGMI sensitivity settings', 'Valorant agent tier list', 'Chill games to play with friends'],
  },
  {
    id: 'sports', name: 'Sports', tagline: 'Matches, teams, training',
    icon: 'football', color: '#10B981', category: 'Creative', status: 'active',
    welcome: 'I follow live sports, share stats, and give training tips. Which sport?',
    placeholder: 'Sport, team or player…',
    suggestions: ['Next India cricket match', 'Basic football tactics', 'Training plan for a 10K run', 'IPL 2026 top scorers'],
  },

  // ---------- Productivity ----------
  {
    id: 'productivity', name: 'Notes & Todos', tagline: 'Ideas → action',
    icon: 'checkbox', color: '#06B6D4', category: 'Productivity', status: 'active',
    welcome: 'I turn thoughts into notes, todos, and habits. Dump your brain here.',
    placeholder: 'What is on your plate?',
    suggestions: ['Break down this project into todos', 'Weekly planner from these tasks', 'Turn meeting notes into action items', 'Design a morning routine'],
  },
  {
    id: 'document', name: 'PDF & Docs AI', tagline: 'Chat with documents',
    icon: 'document-text', color: '#3B82F6', category: 'Productivity', status: 'beta',
    welcome: "Paste text from a PDF/Word doc and I'll summarize, extract, or answer questions. Full file upload coming soon.",
    placeholder: 'Paste document text…',
    suggestions: ['Summarize this contract', 'Extract dates and names', 'Explain this policy in simple words', 'What are the key clauses?'],
  },
  {
    id: 'image', name: 'Image AI', tagline: 'Understand images (Coming soon)',
    icon: 'image', color: '#8B5CF6', category: 'Productivity', status: 'coming_soon',
    welcome: 'Image understanding will unlock in a future build with a native vision provider.',
    placeholder: 'Not available yet',
    suggestions: [],
  },

  // ---------- Communication ----------
  {
    id: 'communication', name: 'Message Drafts', tagline: 'WhatsApp / SMS / DMs — you send',
    icon: 'chatbubbles', color: '#22D3EE', category: 'Communication', status: 'active',
    welcome: "I draft messages for any platform — you review and send via share. I never send on your behalf.",
    placeholder: 'What message do you need?',
    suggestions: ['WhatsApp to boss about leave', 'LinkedIn post about promotion', 'Birthday wish for mom', 'Apology to a friend'],
  },
  {
    id: 'call', name: 'Call Prep', tagline: 'Agendas, scripts, follow-ups',
    icon: 'call', color: '#0891B2', category: 'Communication', status: 'active',
    welcome: "I prep you for calls — agenda, script, tough questions, and follow-up. Who are you calling?",
    placeholder: 'Who and why…',
    suggestions: ['Agenda for a sales pitch call', 'Script for a difficult conversation', 'Follow-up email after a call', 'Salary negotiation call prep'],
  },
  {
    id: 'meeting', name: 'Meeting', tagline: 'Notes → action → follow-up',
    icon: 'calendar', color: '#6366F1', category: 'Communication', status: 'active',
    welcome: 'I structure meetings — agenda, notes template, action items, and follow-up email. Paste your notes.',
    placeholder: 'Meeting topic or notes…',
    suggestions: ['30-min agenda for team standup', 'Summarize these meeting notes', 'Extract action items', 'Follow-up email template'],
  },
];

export const ASSISTANT_BY_ID: Record<string, AssistantDef> = Object.fromEntries(ASSISTANTS.map(a => [a.id, a]));

export const CATEGORIES: AssistantCategory[] = ['Core', 'Study & Career', 'Life', 'Finance & Business', 'Creative', 'Productivity', 'Communication'];
