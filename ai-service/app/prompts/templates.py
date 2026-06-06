TRANSLATION_PROMPT = """You are an academic translation assistant. Translate the following academic English text to {target_lang}.

Rules:
1. Preserve academic terminology in English (e.g., "transformer", "attention mechanism", "BERT")
2. Keep proper nouns, author names, and citations unchanged
3. Provide ONLY the translation, no explanations
4. Maintain the original paragraph structure

Text to translate:
{text}"""

ANALYSIS_PROMPT = """Analyze the following academic text. Output ONLY the analysis, no greetings or meta-commentary.

Respond in {language}. Use Markdown headings:

## Sentence Breakdown
Number each sentence or logical sub-clause.

## Function Analysis
Explain each sentence's writing function in the paper.

## Research Meaning
Explain the meaning and significance in plain language.

## Writing Technique
Identify academic writing patterns students can learn.

{paper_context}
Text: {text}"""

FLASHCARD_PROMPT = """You are an academic study assistant. Generate study flashcards from the analysis below.

Create 5-10 question-answer pairs that cover the key concepts from the analysis. Follow this format exactly for each card:

**Q:** [question]
**A:** [concise answer]

Rules:
- Questions should test understanding, not just memorization
- Answers should be brief (1-3 sentences)
- Cover the most important concepts first
- Output in the same language as the analysis
- No greetings or meta-commentary

Analysis:
{analysis}"""

IDEA_STRUCTURING_PROMPT = """You are an expert research advisor. Help structure a vague research idea into a systematic research direction.

User's research idea:
{idea}

Please analyze and structure this idea comprehensively. Output in Markdown format using the following sections exactly:

## Research Area
Identify the core research area(s) this idea belongs to.

## Key Methods
List the main methods, models, or approaches relevant to this idea.

## Possible Research Tasks
Break down the idea into 3-5 concrete, actionable research tasks.

## Research Questions
Propose 3-5 specific, well-formed research questions that could be investigated.

## Trending Topics
Identify related trending topics and recent developments in this area.

## Keyword Suggestions
List 8-12 search keywords (both broad and specific) for literature search.

## Novelty Assessment
Briefly assess:
- Research Saturation: (Low / Medium / High)
- Competition Level: (Low / Medium / High)
- Potential Research Gap: describe 1-2 gaps

## Suggested Reading
Suggest 3-5 types of papers to look for (e.g., "survey papers on X", "recent methods for Y").

Respond in {language}. Be specific and scholarly. Do not include greetings or meta-commentary."""

PAPER_SUGGESTION_PROMPT = """You are an academic literature expert. Based on the research idea, suggest real, well-known academic papers.

Research Idea:
{idea}

Suggest 10 real, verifiable academic papers that are highly relevant. For each paper, provide:

**Title**: [paper title]
**Authors**: [author names]
**Year**: [year]
**Abstract**: [brief 1-2 sentence description of the paper's contribution]

Rules:
- Only suggest real papers you are confident exist
- Prioritize highly-cited and foundational papers
- Include a mix of classic and recent papers
- Output in {language}
- No greetings or meta-commentary"""

REVIEW_OUTLINE_PROMPT = """You are an expert academic survey writer. Generate a structured literature review outline based on the research idea and collected papers.

Research Idea:
{idea}

Collected Papers (title, year, abstract):
{papers}

Generate a comprehensive review outline. Output in Markdown:

## Proposed Review Title
Suggest a title for the review paper.

## Review Outline
Create a hierarchical outline with at least 4-6 major sections. Each section should have 2-3 subsections.

## Paper Organization
Group the collected papers into the outline sections where they belong. Show which paper fits where.

## Research Gaps
Identify 3-5 gaps in the current literature based on these papers.

## Future Research Directions
Suggest 3-5 promising future research directions.

Respond in {language}. Be specific and scholarly. Do not include greetings."""

QA_PROMPT = """You are an academic research assistant. Answer questions about the following paper.

Paper title and abstract:
{title_abstract}

Full content of the paper (first pages):
{content}

Question: {question}

Rules:
- Answer based on the paper content provided above
- Respond in the same language as the question
- If the question is in Chinese, answer in Chinese
- Be precise and cite specific parts of the paper
- If the answer cannot be found in the provided content, say so honestly"""

# ===== Phase 2: AI Academic Writing System =====

WRITE_OUTLINE_PROMPT = """You are an expert academic writing advisor. Generate a structured paper outline for a research manuscript.

Research topic / idea:
{idea}

Relevant literature from the project library:
{literature}

Target venue: {venue}

Generate a complete paper outline with sections and subsections. Output in Markdown:

## Paper Title
Suggest a strong academic title.

## Abstract (2-3 sentences)
A brief summary of what this paper would contribute.

## Section Outline
For each section, provide:
- Section title (numbered)
- 2-4 subsection titles
- 1-2 sentences describing what each subsection should cover
- Which papers from the literature should be cited in this section

Include these standard sections:
1. Introduction
2. Related Work
3. Methodology
4. Experiments (if applicable)
5. Results / Discussion
6. Conclusion

## Contribution Statement
List 2-4 clear research contributions this paper would make.

## Suggested Keywords
5-8 keywords for the paper.

Respond in {language}. Be specific and scholarly. No meta-commentary."""

WRITE_SECTION_PROMPT = """You are an expert academic writing assistant. {action_description} for the following section of a research paper.

Manuscript context:
Title: {title}
Abstract: {abstract}
Other sections (titles): {context}

Relevant literature:
{literature}

Current section: {section_title}
Section type: {section_type}
{existing_content}

Guidelines for writing a {section_type} section:
{specific_guidelines}

Rules:
- Use formal academic English (or Chinese, based on context)
- Place citation markers [1], [2] at appropriate positions
- Maintain consistency with the manuscript's style and scope
- Output ONLY the section content, no meta-commentary or explanations
- Use LaTeX for equations ($$...$$ for display, $...$ for inline)"""

SECTION_GUIDELINES = {
    "abstract": "Write a concise 150-250 word abstract. Include: 1-2 sentences background/problem, 1-2 sentences method/approach, 1-2 sentences key results/findings, 1 sentence conclusion/implication.",
    "introduction": "Structure: (1) Hook - broad context 1-2 sentences, (2) Background - 3-5 sentences establishing what's known, (3) Research gap - 2-3 sentences identifying what's missing, (4) Contributions - summarize 2-4 main contributions, (5) Paper structure - briefly outline the remaining sections.",
    "related_work": "Group related work into 2-4 thematic categories. For each category: describe the common approach, cite key papers [1][2], discuss strengths and limitations, and relate back to your work. End with a summary of gaps your work addresses.",
    "methodology": "Describe the proposed method with enough detail for reproducibility. Include: problem formulation, overall approach/pipeline description, detailed description of each component/module, design rationale (why these choices), and any important implementation details.",
    "experiments": "Describe: datasets used (with statistics), evaluation metrics, baseline methods for comparison, main experimental results (refer to tables/figures), and analysis of results. Do not include specific numbers unless provided in the context.",
    "conclusion": "Summarize: (1) what was done and why, (2) key findings/contributions, (3) limitations of the current work, (4) promising future research directions.",
    "body": "Write a well-structured academic section with clear topic sentences, supporting evidence, logical transitions between paragraphs, and appropriate citations."
}

CITATION_SUGGEST_PROMPT = """You are a citation recommendation system. Given a passage of academic text, suggest which papers from the literature should be cited.

Text passage:
{text}

Available literature (title, authors, year, abstract):
{literature}

For each recommended citation, output:

**Cite**: [paper title]
**Reason**: [1-2 sentences explaining why this paper supports or relates to the text]
**Position**: [where to place the citation, e.g., "after '...recent advances in...'"]

Suggest up to {limit} citations. Only suggest highly relevant papers. If none are relevant, say "No relevant citations found."
No meta-commentary."""

CITATION_MISSING_PROMPT = """Analyze the following academic text for claims that likely require citations but are currently unsupported.

Text:
{text}

Existing citations in this text: {existing_citations}

Identify sentences or clauses that:
1. Reference prior work or existing methods
2. Make statistical or quantitative claims
3. Compare approaches or methods
4. State something as "well-known" or "established"
5. Mention specific datasets, benchmarks, or tools

For each missing citation, output:

**Claim**: [the claim text]
**Why**: [brief reason this needs a citation]
**Search keywords**: [suggested keywords to find supporting papers]

Output ONLY the flagged items. If no missing citations found, say "No missing citations detected."
No meta-commentary."""
